"use client";

import { useMemo, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import Swal from "sweetalert2";
import type { SweetAlertOptions } from "sweetalert2";
import { auth, db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Rocket,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
  Check,
  X,
  User,
} from "lucide-react";
import type { UserRole } from "@/types";

// ---------------------------------------------------------------------------
// Brand tokens
// ---------------------------------------------------------------------------
const PAPER = "#F6F4EC";
const CARD = "#FFFFFF";
const INK = "#122A2C";
const LINE = "#DBD5C3";
const CORAL = "#FF6A4D";
const BODY_TEXT = "#4C5652";

function notify(opts: SweetAlertOptions) {
  return Swal.fire({
    background: CARD,
    color: INK,
    confirmButtonColor: CORAL,
    customClass: { popup: "rounded-xl" },
    ...opts,
  });
}

/**
 * Sanitizes an internal redirect URL to prevent open redirect vulnerabilities.
 */
function sanitizeInternalRedirect(url: string | null): string | null {
  if (!url) return null;
  const decoded = decodeURIComponent(url).trim();
  if (
    decoded.startsWith("/") &&
    !decoded.startsWith("//") &&
    !decoded.includes("://") &&
    !decoded.includes("\r") &&
    !decoded.includes("\n")
  ) {
    return decoded;
  }
  return null;
}

function normalizeName(input: string): string {
  return input
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) =>
      word
        .split("-")
        .map(
          (part) =>
            part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join("-")
    )
    .join(" ");
}

const EXTENSION_OPTIONS = ["None", "Jr.", "Sr.", "II", "III", "IV", "V"];

const PASSWORD_RULES: { label: string; test: (pw: string) => boolean }[] = [
  { label: "At least 8 characters", test: (pw) => pw.length >= 8 },
  { label: "One uppercase letter", test: (pw) => /[A-Z]/.test(pw) },
  { label: "One lowercase letter", test: (pw) => /[a-z]/.test(pw) },
  { label: "One number", test: (pw) => /[0-9]/.test(pw) },
  { label: "One special character", test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

const RATE_LIMIT_KEY = "likha_signup_attempts";
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;

function getRecentAttempts(): number[] {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return (parsed as number[]).filter(
      (t) => Date.now() - t < RATE_LIMIT_WINDOW_MS
    );
  } catch {
    return [];
  }
}

function recordAttempt() {
  const attempts = getRecentAttempts();
  attempts.push(Date.now());
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(attempts));
  } catch {
    // localStorage unavailable
  }
}

function clearAttempts() {
  try {
    localStorage.removeItem(RATE_LIMIT_KEY);
  } catch {
    // ignore
  }
}

function checkRateLimitExceeded(): { isExceeded: boolean; minutesLeft: number } {
  const attempts = getRecentAttempts();
  if (attempts.length >= RATE_LIMIT_MAX) {
    const oldest = Math.min(...attempts);
    const minutesLeft = Math.ceil((RATE_LIMIT_WINDOW_MS - (Date.now() - oldest)) / 60000);
    return { isExceeded: true, minutesLeft };
  }
  return { isExceeded: false, minutesLeft: 0 };
}

function getSignupErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/email-already-in-use":
        return "An account with this email already exists. Please log in instead.";
      case "auth/weak-password":
        return "That password is too weak. Please choose a stronger password.";
      case "auth/invalid-email":
        return "That email address doesn't look valid.";
      case "auth/operation-not-allowed":
        return "Email/Password sign-in is not enabled in Firebase Console. Please contact support.";
      case "auth/network-request-failed":
        return "Network request failed. Please check your internet connection and try again.";
      case "permission-denied":
        return "Account created in Authentication, but profile initialization failed. Please try logging in.";
      default:
        return err.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Failed to create account. Please try again.";
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const typeParam = searchParams.get("type") || searchParams.get("role");

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [accountRole, setAccountRole] = useState<UserRole>(() => {
    return typeParam === "developer" ? "developer" : "user";
  });

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    extensionName: "None",
    email: "",
    password: "",
    confirmPassword: "",
    _likha_hp_check: "",
  });

  const passwordRuleResults = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        label: rule.label,
        passed: rule.test(formData.password),
      })),
    [formData.password]
  );
  const passwordIsStrong = passwordRuleResults.every((r) => r.passed);
  const confirmTouched = formData.confirmPassword.length > 0;
  const passwordsMatch =
    confirmTouched && formData.password === formData.confirmPassword;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData._likha_hp_check && formData._likha_hp_check.trim() !== "") {
      console.warn("Signup blocked: honeypot field was filled.");
      return;
    }

    const limitCheck = checkRateLimitExceeded();
    if (limitCheck.isExceeded) {
      notify({
        icon: "warning",
        title: "Too many attempts",
        text: `You've reached the sign-up limit. Please try again in about ${limitCheck.minutesLeft} minute${
          limitCheck.minutesLeft === 1 ? "" : "s"
        }.`,
      });
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      notify({
        icon: "warning",
        title: "Missing name",
        text: "First name and last name are required.",
      });
      return;
    }

    if (!passwordIsStrong) {
      notify({
        icon: "warning",
        title: "Password too weak",
        html: `<ul style="text-align:left;margin:0;padding-left:1.1rem;">${passwordRuleResults
          .filter((r) => !r.passed)
          .map((r) => `<li>${r.label}</li>`)
          .join("")}</ul>`,
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      notify({
        icon: "warning",
        title: "Passwords don't match",
        text: "Double-check both password fields.",
      });
      return;
    }

    recordAttempt();
    setLoading(true);

    try {
      const firstName = normalizeName(formData.firstName);
      const middleName = normalizeName(formData.middleName);
      const lastName = normalizeName(formData.lastName);
      const extensionName =
        formData.extensionName === "None" ? "" : formData.extensionName;
      const fullName = [firstName, middleName, lastName, extensionName]
        .filter(Boolean)
        .join(" ");
      const email = formData.email.trim().toLowerCase();

      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        formData.password
      );
      const user = userCredential.user;

      // 2. Attach a display name to the auth profile
      await updateProfile(user, { displayName: fullName });

      // 3. Save normalized profile in Firestore matching firestore.rules
      const targetRole: UserRole = accountRole === "developer" ? "developer" : "user";

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        firstName,
        middleName,
        lastName,
        extensionName,
        fullName,
        email,
        role: targetRole,
        createdAt: serverTimestamp(),
      });

      // Explicitly sign out so user performs manual first login
      await signOut(auth);

      clearAttempts();

      const safeNext = sanitizeInternalRedirect(nextParam);
      const loginUrl = safeNext
        ? `/login?next=${encodeURIComponent(safeNext)}`
        : "/login";

      await notify({
        icon: "success",
        title: "Account created successfully!",
        text:
          targetRole === "developer"
            ? "Your developer account is ready. Please log in to continue."
            : "Your account is ready. Please log in to continue.",
      });

      router.push(loginUrl);
    } catch (err: unknown) {
      console.error("Signup error:", err);
      notify({
        icon: "error",
        title: "Couldn't create your account",
        text: getSignupErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const safeNext = sanitizeInternalRedirect(nextParam);
  const loginLink = safeNext
    ? `/login?next=${encodeURIComponent(safeNext)}`
    : "/login";

  return (
    <div className="signup-card-enter w-full max-w-lg bg-(--card) rounded-xl border border-(--line) p-8 shadow-[5px_5px_0_0_var(--line)]">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-(--ink) p-2.5 rounded-full mb-4">
          <Rocket className="h-6 w-6 text-(--paper)" />
        </div>
        <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wide text-(--body)/70 mb-2">
          {accountRole === "developer" ? "Developer Account" : "Marketplace Account"}
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-medium text-(--ink) tracking-tight">
          Join Likha Apps
        </h1>
        <p className="text-(--body) text-sm mt-2 text-center leading-relaxed">
          {accountRole === "developer"
            ? "Create a developer account to submit and publish PWAs in the directory."
            : "Create an account to rate apps, save your favorites, and write reviews."}
        </p>
      </div>

      <form onSubmit={handleSignup} className="space-y-5" noValidate>
        {/* Honeypot */}
        <div
          aria-hidden="true"
          style={{ display: "none", position: "absolute", left: "-9999px" }}
        >
          <label htmlFor="_likha_hp_check">Anti-bot verification</label>
          <input
            id="_likha_hp_check"
            name="_likha_hp_check"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={formData._likha_hp_check}
            onChange={(e) =>
              setFormData({ ...formData, _likha_hp_check: e.target.value })
            }
          />
        </div>

        {/* Account Type Selection */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-(--ink)">
            Account Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAccountRole("user")}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                accountRole === "user"
                  ? "border-(--ink) bg-(--paper) text-(--ink) ring-1 ring-(--ink)"
                  : "border-(--line) bg-(--card) text-(--body) hover:border-(--body-dim)"
              }`}
            >
              <div className="font-semibold text-xs text-(--ink) flex items-center gap-1.5 mb-0.5">
                <User className="w-3.5 h-3.5 text-(--coral)" />
                <span>Personal / User</span>
              </div>
              <p className="text-[11px] text-(--body) leading-tight">
                Rate apps, save favorites & reviews
              </p>
            </button>

            <button
              type="button"
              onClick={() => setAccountRole("developer")}
              className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                accountRole === "developer"
                  ? "border-(--ink) bg-(--paper) text-(--ink) ring-1 ring-(--ink)"
                  : "border-(--line) bg-(--card) text-(--body) hover:border-(--body-dim)"
              }`}
            >
              <div className="font-semibold text-xs text-(--ink) flex items-center gap-1.5 mb-0.5">
                <Rocket className="w-3.5 h-3.5 text-(--coral)" />
                <span>Developer</span>
              </div>
              <p className="text-[11px] text-(--body) leading-tight">
                Publish & manage progressive web apps
              </p>
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-(--ink)">
              First name
            </label>
            <Input
              required
              placeholder="Juan"
              className="h-11 border-(--line) focus-visible:ring-(--ink)"
              value={formData.firstName}
              onChange={(e) =>
                setFormData({ ...formData, firstName: e.target.value })
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-(--ink)">
              Last name
            </label>
            <Input
              required
              placeholder="Dela Cruz"
              className="h-11 border-(--line) focus-visible:ring-(--ink)"
              value={formData.lastName}
              onChange={(e) =>
                setFormData({ ...formData, lastName: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-[1fr_auto] gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-(--ink)">
              Middle name{" "}
              <span className="text-(--body) font-normal">(optional)</span>
            </label>
            <Input
              placeholder="Ponce"
              className="h-11 border-(--line) focus-visible:ring-(--ink)"
              value={formData.middleName}
              onChange={(e) =>
                setFormData({ ...formData, middleName: e.target.value })
              }
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-(--ink)">
              Extension
            </label>
            <Select
              value={formData.extensionName}
              onValueChange={(value) =>
                setFormData({ ...formData, extensionName: value as string })
              }
            >
              <SelectTrigger className="h-11 w-full sm:w-28 border-(--line)">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EXTENSION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-(--ink)">
            Email address
          </label>
          <Input
            required
            type="email"
            placeholder={accountRole === "developer" ? "developer@example.com" : "user@example.com"}
            className="h-11 border-(--line) focus-visible:ring-(--ink)"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-(--ink)">
            Password
          </label>
          <div className="relative">
            <Input
              required
              type={showPassword ? "text" : "password"}
              placeholder="Create a strong password"
              className="h-11 border-(--line) pr-11 focus-visible:ring-(--ink)"
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-(--body) hover:text-(--ink) transition-colors cursor-pointer"
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          {formData.password.length > 0 && (
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 mt-2">
              {passwordRuleResults.map((rule) => (
                <li
                  key={rule.label}
                  className={`flex items-center gap-1.5 text-xs ${
                    rule.passed ? "text-emerald-700" : "text-(--body)"
                  }`}
                >
                  {rule.passed ? (
                    <Check className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 shrink-0 opacity-40" />
                  )}
                  {rule.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-(--ink)">
            Confirm password
          </label>
          <div className="relative">
            <Input
              required
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Re-enter your password"
              className="h-11 border-(--line) pr-11 focus-visible:ring-(--ink)"
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  confirmPassword: e.target.value,
                })
              }
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-(--body) hover:text-(--ink) transition-colors cursor-pointer"
              aria-label={
                showConfirmPassword ? "Hide password" : "Show password"
              }
              tabIndex={-1}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {confirmTouched && (
            <p
              className={`text-xs flex items-center gap-1.5 mt-1 ${
                passwordsMatch ? "text-emerald-700" : "text-red-600"
              }`}
            >
              {passwordsMatch ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <X className="w-3.5 h-3.5" />
              )}
              {passwordsMatch ? "Passwords match" : "Passwords do not match"}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-(--coral) hover:bg-[#e85a3e] text-white text-base font-medium mt-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-(--line) text-center">
        <p className="text-sm text-(--body)">
          Already have an account?{" "}
          <a
            href={loginLink}
            className="text-(--ink) font-medium hover:underline"
          >
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}

export default function Signup() {
  const router = useRouter();

  return (
    <div
      className="relative min-h-screen bg-(--paper) text-(--ink) flex flex-col"
      style={
        {
          "--paper": PAPER,
          "--card": CARD,
          "--ink": INK,
          "--line": LINE,
          "--coral": CORAL,
          "--body": BODY_TEXT,
        } as React.CSSProperties
      }
    >
      <style jsx global>{`
        @keyframes signupCardIn {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .signup-card-enter {
          animation: signupCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .signup-card-enter {
            animation: none !important;
          }
        }
      `}</style>

      <button
        onClick={() => router.push("/")}
        className="fixed top-6 left-6 z-10 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-(--body) transition-colors hover:bg-(--card) hover:text-(--ink) cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to directory
      </button>

      <div className="flex-1 flex flex-col justify-center items-center px-6 py-20">
        <Suspense
          fallback={
            <div className="w-full max-w-lg h-96 rounded-xl bg-(--card) border border-(--line) flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-(--body-dim)" />
            </div>
          }
        >
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
