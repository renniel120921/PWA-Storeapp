"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { FirebaseError } from "firebase/app";
import Swal from "sweetalert2";
import type { SweetAlertOptions } from "sweetalert2";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Rocket, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";

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

const RATE_LIMIT_KEY = "likha_login_attempts";
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

function getLoginErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "That email and password don't match our records.";
      case "auth/invalid-email":
        return "That email address doesn't look valid.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Please wait a moment and try again.";
      case "auth/user-disabled":
        return "This account has been disabled. Contact support if that's unexpected.";
      default:
        return err.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Failed to log in. Please try again.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const { user, role: currentRole, isAdmin, isDeveloper, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    _likha_hp_check: "",
  });

  // If already authenticated and profile hydrated, route to target
  useEffect(() => {
    if (!authLoading && user) {
      const safeNext = sanitizeInternalRedirect(nextParam);
      if (safeNext) {
        router.push(safeNext);
      } else if (isAdmin) {
        router.push("/admin");
      } else if (isDeveloper) {
        router.push("/dashboard");
      } else {
        router.push("/account");
      }
    }
  }, [authLoading, user, isAdmin, isDeveloper, currentRole, nextParam, router]);

  const canSubmit = useMemo(
    () => formData.email.trim() !== "" && formData.password !== "",
    [formData.email, formData.password]
  );

  const handleForgotPassword = async () => {
    const { value: email } = await Swal.fire({
      background: CARD,
      color: INK,
      confirmButtonColor: CORAL,
      customClass: { popup: "rounded-xl" },
      title: "Reset your password",
      text: "Enter the email on your account and we'll send you a reset link.",
      input: "email",
      inputValue: formData.email,
      inputPlaceholder: "developer@example.com",
      showCancelButton: true,
      confirmButtonText: "Send reset link",
      inputValidator: (value) => {
        if (!value) return "Enter an email address first.";
        return undefined;
      },
    });

    if (!email) return;

    try {
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());
      notify({
        icon: "success",
        title: "Check your inbox",
        text: `If an account exists for ${email}, a reset link is on its way.`,
      });
    } catch (err) {
      notify({
        icon: "error",
        title: "Couldn't send link",
        text: getLoginErrorMessage(err),
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData._likha_hp_check && formData._likha_hp_check.trim() !== "") {
      console.warn("Login blocked: honeypot field was filled.");
      return;
    }

    const limitCheck = checkRateLimitExceeded();
    if (limitCheck.isExceeded) {
      notify({
        icon: "warning",
        title: "Too many attempts",
        text: `Please wait about ${limitCheck.minutesLeft} minute${
          limitCheck.minutesLeft === 1 ? "" : "s"
        } before trying again.`,
      });
      return;
    }

    recordAttempt();
    setLoading(true);

    try {
      const email = formData.email.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        formData.password
      );
      clearAttempts();

      // Read trusted Firestore user profile directly to ensure zero race condition
      let resolvedRole = "user";
      let fullName = "";
      try {
        const userDocRef = doc(db, "users", userCredential.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          resolvedRole = data.role === "admin" ? "admin" : data.role === "developer" ? "developer" : "user";
          fullName = data.fullName || data.firstName || "";
        }
      } catch (profileErr) {
        console.warn(
          "Could not read user profile role directly on login, using fallback:",
          profileErr
        );
      }

      const safeNext = sanitizeInternalRedirect(nextParam);

      if (safeNext) {
        await Swal.fire({
          icon: "success",
          title: fullName ? `Welcome, ${fullName}!` : "Welcome back!",
          text: "Returning to application...",
          timer: 1000,
          timerProgressBar: true,
          showConfirmButton: false,
          background: CARD,
          color: INK,
          customClass: { popup: "rounded-xl" },
        });
        router.push(safeNext);
      } else if (resolvedRole === "admin") {
        await Swal.fire({
          icon: "success",
          title: "Welcome back, Administrator!",
          text: "Redirecting to your Admin Moderation Portal...",
          timer: 1400,
          timerProgressBar: true,
          showConfirmButton: false,
          background: CARD,
          color: INK,
          customClass: { popup: "rounded-xl" },
        });
        router.push("/admin");
      } else if (resolvedRole === "developer") {
        await Swal.fire({
          icon: "success",
          title: fullName ? `Welcome back, ${fullName}!` : "Welcome back!",
          text: "Redirecting to your Developer Portal...",
          timer: 1400,
          timerProgressBar: true,
          showConfirmButton: false,
          background: CARD,
          color: INK,
          customClass: { popup: "rounded-xl" },
        });
        router.push("/dashboard");
      } else {
        await Swal.fire({
          icon: "success",
          title: fullName ? `Welcome back, ${fullName}!` : "Welcome back!",
          text: "Redirecting to your Account Portal...",
          timer: 1400,
          timerProgressBar: true,
          showConfirmButton: false,
          background: CARD,
          color: INK,
          customClass: { popup: "rounded-xl" },
        });
        router.push("/account");
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      notify({
        icon: "error",
        title: "Couldn't log in",
        text: getLoginErrorMessage(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const safeNext = sanitizeInternalRedirect(nextParam);
  const signupLink = safeNext
    ? `/signup?next=${encodeURIComponent(safeNext)}`
    : "/signup";

  return (
    <div className="login-card-enter w-full max-w-md bg-(--card) rounded-xl border border-(--line) p-8 shadow-[5px_5px_0_0_var(--line)]">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-(--ink) p-2.5 rounded-full mb-4">
          <Rocket className="h-6 w-6 text-(--paper)" />
        </div>
        <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wide text-(--body)/70 mb-2">
          Identity verification
        </span>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-medium text-(--ink) tracking-tight">
          Welcome back
        </h1>
        <p className="text-(--body) text-sm mt-2 text-center leading-relaxed">
          Log in to manage your account, applications, and reviews.
        </p>
      </div>

      <form onSubmit={handleLogin} className="space-y-4" noValidate>
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

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-(--ink)">
            Email address
          </label>
          <Input
            required
            type="email"
            placeholder="developer@example.com"
            className="h-11 border-(--line) focus-visible:ring-(--ink)"
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-(--ink)">
              Password
            </label>
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-(--body) hover:text-(--ink) underline font-normal transition-colors cursor-pointer"
            >
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              required
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
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
        </div>

        <Button
          type="submit"
          disabled={!canSubmit || loading}
          className="w-full h-12 bg-(--coral) hover:bg-[#e85a3e] text-white text-base font-medium mt-2 cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-(--line) text-center">
        <p className="text-sm text-(--body)">
          Don&apos;t have an account yet?{" "}
          <a
            href={signupLink}
            className="text-(--ink) font-medium hover:underline"
          >
            Create one
          </a>
        </p>
      </div>
    </div>
  );
}

export default function Login() {
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
        @keyframes loginCardIn {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .login-card-enter {
          animation: loginCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        @media (prefers-reduced-motion: reduce) {
          .login-card-enter {
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
            <div className="w-full max-w-md h-80 rounded-xl bg-(--card) border border-(--line) flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-(--body-dim)" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
