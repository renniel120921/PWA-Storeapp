"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminBootstrapPage() {
  const router = useRouter();
  const { user, profile, isAuthenticated, isAdmin, loading: authLoading } = useAuth();

  const [secret, setSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!secret.trim()) {
      setErrorMsg("Please enter the server bootstrap secret.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Obtain fresh Firebase ID Token directly from active client session
      const idToken = await user.getIdToken(true);

      // 2. Call server bootstrap endpoint
      const res = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ secret: secret.trim() }),
      });

      // 3. Safe response parsing
      let data: { ok?: boolean; error?: string; message?: string } | null = null;
      try {
        data = await res.json();
      } catch {
        // Handle non-JSON responses (e.g. Vercel 404 or 500 HTML error pages)
        data = null;
      }

      if (!res.ok || !data?.ok) {
        if (data?.error) {
          setErrorMsg(data.error);
        } else if (res.status === 404) {
          setErrorMsg(
            "HTTP 404: The bootstrap endpoint (/api/admin/bootstrap) was not found. Please ensure the latest build is deployed to Vercel."
          );
        } else if (res.status === 403) {
          setErrorMsg(
            "HTTP 403: Admin bootstrap is disabled or the secret is incorrect. Check LIKHA_ADMIN_BOOTSTRAP_SECRET in Vercel settings."
          );
        } else if (res.status === 401) {
          setErrorMsg(
            "HTTP 401: Authentication expired or invalid. Please log in again."
          );
        } else if (res.status === 500) {
          setErrorMsg(
            "HTTP 500: Server configuration error. Please verify Firebase Admin credentials on Vercel."
          );
        } else {
          setErrorMsg(`Server returned HTTP ${res.status} (${res.statusText || "Error"}).`);
        }
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(data.message || "Account successfully promoted to administrator.");

      // Automatically reload / navigate to /admin
      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 2000);
    } catch (fetchErr: unknown) {
      const msg = fetchErr instanceof Error ? fetchErr.message : "Connection failed";
      setErrorMsg(`Network/client error: ${msg}. Please check your internet connection.`);
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 1. Auth Loading State
  // ---------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div
        className="min-h-screen bg-(--paper) text-(--ink) flex flex-col justify-center items-center px-6 py-20"
        style={
          {
            "--paper": "#F6F4EC",
            "--card": "#FFFFFF",
            "--ink": "#122A2C",
            "--ink-soft": "#EEEAD9",
            "--body": "#4C5652",
            "--body-dim": "#7A8480",
            "--line": "#DBD5C3",
            "--coral": "#FF6A4D",
          } as React.CSSProperties
        }
      >
        <div className="w-full max-w-md bg-(--card) rounded-xl border border-(--line) p-8 shadow-[5px_5px_0_0_var(--line)] text-center">
          <div className="w-8 h-8 border-3 border-(--coral) border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) block mb-1">
            authenticating session
          </span>
          <p className="text-sm font-medium text-(--ink)">
            Verifying account credentials...
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. Unauthenticated Guard Screen
  // ---------------------------------------------------------------------------
  if (!isAuthenticated || !user) {
    return (
      <div
        className="min-h-screen bg-(--paper) text-(--ink) flex flex-col justify-center items-center px-6 py-20"
        style={
          {
            "--paper": "#F6F4EC",
            "--card": "#FFFFFF",
            "--ink": "#122A2C",
            "--ink-soft": "#EEEAD9",
            "--body": "#4C5652",
            "--body-dim": "#7A8480",
            "--line": "#DBD5C3",
            "--coral": "#FF6A4D",
          } as React.CSSProperties
        }
      >
        <div className="w-full max-w-md bg-(--card) rounded-xl border border-(--line) p-8 shadow-[5px_5px_0_0_var(--line)] text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-(--ink)/5 flex items-center justify-center mb-6">
            <Lock className="w-6 h-6 text-(--body)" />
          </div>

          <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) block mb-2">
            authentication required
          </span>

          <h1 className="font-display text-2xl font-medium text-(--ink) tracking-tight mb-3">
            Sign In to Bootstrap Admin
          </h1>

          <p className="text-sm text-(--body) leading-relaxed mb-8">
            You must be logged in with the account you want to promote before using the admin bootstrap tool.
          </p>

          <Link href="/login">
            <Button className="w-full h-11 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm">
              Log in with your account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. Already Administrator Screen
  // ---------------------------------------------------------------------------
  if (isAdmin) {
    return (
      <div
        className="min-h-screen bg-(--paper) text-(--ink) flex flex-col justify-center items-center px-6 py-20"
        style={
          {
            "--paper": "#F6F4EC",
            "--card": "#FFFFFF",
            "--ink": "#122A2C",
            "--ink-soft": "#EEEAD9",
            "--body": "#4C5652",
            "--body-dim": "#7A8480",
            "--line": "#DBD5C3",
            "--coral": "#FF6A4D",
          } as React.CSSProperties
        }
      >
        <div className="w-full max-w-md bg-(--card) rounded-xl border border-(--line) p-8 shadow-[5px_5px_0_0_var(--line)] text-center space-y-6">
          <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <ShieldCheck className="w-6 h-6" />
          </div>

          <div>
            <span className="font-mono text-xs uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
              admin privilege active
            </span>
            <h1 className="font-display text-2xl font-medium text-(--ink) tracking-tight mt-3 mb-2">
              Already an Administrator
            </h1>
            <p className="text-sm text-(--body) leading-relaxed">
              Your account (<strong>{user.email || user.uid}</strong>) already has full platform administrator privileges.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <Link href="/admin">
              <Button className="w-full h-11 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm">
                Open Admin Portal (/admin)
              </Button>
            </Link>
            <Link href="/">
              <Button
                variant="outline"
                className="w-full h-11 border-(--line) text-(--ink) bg-transparent hover:bg-(--ink-soft) font-medium text-sm"
              >
                Return to Homepage
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 4. Admin Bootstrap Form
  // ---------------------------------------------------------------------------
  return (
    <div
      className="min-h-screen bg-(--paper) text-(--ink) flex flex-col justify-center items-center px-6 py-20"
      style={
        {
          "--paper": "#F6F4EC",
          "--card": "#FFFFFF",
          "--ink": "#122A2C",
          "--ink-soft": "#EEEAD9",
          "--body": "#4C5652",
          "--body-dim": "#7A8480",
          "--line": "#DBD5C3",
          "--coral": "#FF6A4D",
        } as React.CSSProperties
      }
    >
      <div className="w-full max-w-lg">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-(--body) hover:text-(--ink) transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to directory</span>
        </Link>

        <div className="bg-(--card) rounded-2xl border border-(--line) p-8 sm:p-10 shadow-[6px_6px_0_0_var(--line)] space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                initial setup utility
              </span>
              <h1 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight mt-1">
                Admin Bootstrap
              </h1>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-xs text-amber-950 space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>One-Time Administrative Setup</span>
            </div>
            <p className="leading-relaxed">
              This tool validates against the server-only <code className="font-mono font-bold bg-amber-100 px-1 py-0.5 rounded text-amber-900">LIKHA_ADMIN_BOOTSTRAP_SECRET</code> environment variable and promotes your authenticated account to platform administrator.
            </p>
          </div>

          {/* Account Details Box */}
          <div className="p-4 rounded-xl bg-(--paper) border border-(--line) space-y-2 text-xs font-mono">
            <div className="text-(--body-dim) uppercase tracking-wider text-[10px]">
              Target Account (Currently Logged In)
            </div>
            <div className="flex justify-between items-center text-(--ink)">
              <span className="text-(--body)">Email:</span>
              <span className="font-semibold">{user.email || "No email"}</span>
            </div>
            <div className="flex justify-between items-center text-(--ink)">
              <span className="text-(--body)">Current Role:</span>
              <span className="capitalize px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[11px]">
                {profile?.role || "developer"}
              </span>
            </div>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{successMsg}</p>
                <p className="text-(--body) mt-1">Redirecting to administrator dashboard in 2 seconds...</p>
              </div>
            </div>
          )}

          {/* Form */}
          {!successMsg && (
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label
                  htmlFor="bootstrap-secret"
                  className="text-xs font-mono uppercase tracking-wider text-(--body)"
                >
                  Bootstrap Secret Key
                </label>
                <div className="relative">
                  <Input
                    id="bootstrap-secret"
                    type={showSecret ? "text" : "password"}
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="Enter LIKHA_ADMIN_BOOTSTRAP_SECRET"
                    disabled={isSubmitting}
                    className="h-11 pr-10 border-(--line) bg-white text-sm font-mono text-(--ink) placeholder:text-(--body-dim)"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-(--body-dim) hover:text-(--ink)"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-(--body-dim)">
                  Must match the secret set in your server environment variables.
                </p>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !secret.trim()}
                className="w-full h-11 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-xs rounded-md shadow-none flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Promoting Account...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Promote My Account to Administrator</span>
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
