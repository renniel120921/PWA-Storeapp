"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import Swal from "sweetalert2";
import type { SweetAlertOptions } from "sweetalert2";
import { auth } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Rocket, ArrowLeft, Loader2, Eye, EyeOff } from "lucide-react";

// ---------------------------------------------------------------------------
// Brand tokens (hardcoded, not CSS vars — SweetAlert2 renders into
// document.body, outside this component's scoped custom properties, so the
// vars below wouldn't resolve there).
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

// ---------------------------------------------------------------------------
// Client-side rate limiting
// ---------------------------------------------------------------------------
// Same caveat as the signup page: this is a UX deterrent that lives in
// localStorage and can be cleared by anyone. It slows down casual
// brute-forcing from this browser; it is not a substitute for server-side
// protection. Firebase Auth already throttles repeated failed sign-ins per
// account server-side (auth/too-many-requests) — this adds a local layer
// on top so the UI can react before that kicks in.
const RATE_LIMIT_KEY = "likha_login_attempts";
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

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
    // localStorage unavailable (private mode, etc.) — fail open, not closed.
  }
}

function clearAttempts() {
  try {
    localStorage.removeItem(RATE_LIMIT_KEY);
  } catch {
    // ignore
  }
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

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    // honeypot — real users never see or fill this; bots often do
    companyWebsite: "",
  });

  const [rateLimited] = useState(() => {
    // Guard for SSR: this component renders on the server first (even
    // with "use client"), and localStorage doesn't exist there.
    if (typeof window === "undefined") return false;
    return getRecentAttempts().length >= RATE_LIMIT_MAX;
  });

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
        text: `A password reset link was sent to ${email}, if an account exists for it.`,
      });
    } catch (err: unknown) {
      console.error("Password reset error:", err);
      notify({
        icon: "error",
        title: "Couldn't send reset link",
        text: getLoginErrorMessage(err),
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot: if this hidden field got filled in, silently bail —
    // no error message, since a real error would just teach a bot what
    // to avoid next time.
    if (formData.companyWebsite.trim() !== "") {
      console.warn("Login blocked: honeypot field was filled.");
      return;
    }

    // Rate limit check
    const attempts = getRecentAttempts();
    if (attempts.length >= RATE_LIMIT_MAX) {
      const oldest = Math.min(...attempts);
      const minutesLeft = Math.ceil(
        (RATE_LIMIT_WINDOW_MS - (Date.now() - oldest)) / 60000
      );
      notify({
        icon: "warning",
        title: "Too many attempts",
        text: `Please wait about ${minutesLeft} minute${
          minutesLeft === 1 ? "" : "s"
        } before trying again.`,
      });
      return;
    }

    recordAttempt();
    setLoading(true);

    try {
      const email = formData.email.trim().toLowerCase();
      await signInWithEmailAndPassword(auth, email, formData.password);
      clearAttempts();
      router.push("/");
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
        className="fixed top-6 left-6 z-10 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-(--body) transition-colors hover:bg-(--card) hover:text-(--ink)"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to directory
      </button>

      <div className="flex-1 flex flex-col justify-center items-center px-6 py-20">
        <div className="login-card-enter w-full max-w-md bg-(--card) rounded-xl border border-(--line) p-8 shadow-[5px_5px_0_0_var(--line)]">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-(--ink) p-2.5 rounded-full mb-4">
              <Rocket className="h-6 w-6 text-(--paper)" />
            </div>
            <span className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-wide text-(--body)/70 mb-2">
              Returning developer
            </span>
            <h1 className="font-[family-name:var(--font-display)] text-2xl font-medium text-(--ink) tracking-tight">
              Welcome back
            </h1>
            <p className="text-(--body) text-sm mt-2 text-center leading-relaxed">
              Log in to manage your listings in the directory.
            </p>
          </div>

          {rateLimited && (
            <div className="text-sm p-3 rounded-md mb-6 border border-amber-200 bg-amber-50 text-amber-800">
              Youve hit the sign-in attempt limit for now. Please wait a
              few minutes before trying again.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5" noValidate>
            {/* Honeypot — hidden from real users, left for bots */}
            <div
              aria-hidden="true"
              className="absolute -left-[9999px] w-px h-px overflow-hidden"
            >
              <label htmlFor="companyWebsite">Company website</label>
              <input
                id="companyWebsite"
                name="companyWebsite"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={formData.companyWebsite}
                onChange={(e) =>
                  setFormData({ ...formData, companyWebsite: e.target.value })
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
                autoComplete="email"
                placeholder="developer@example.com"
                className="h-11 border-(--line) focus-visible:ring-(--ink)"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-(--ink)">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs font-medium text-(--body) hover:text-(--ink) hover:underline transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  required
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-(--body) hover:text-(--ink) transition-colors"
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
              disabled={loading || rateLimited || !canSubmit}
              className="w-full h-12 bg-(--coral) hover:bg-[#e85a3e] text-white text-base font-medium mt-2"
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
              New to Likha Apps?{" "}
              <a
                href="/signup"
                className="text-(--ink) font-medium hover:underline"
              >
                Create an account
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
