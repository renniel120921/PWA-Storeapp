"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  ShieldCheck,
  Star,
  Bell,
  Sparkles,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Users,
  Code2,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Heart,
  HelpCircle,
  Lightbulb,
} from "lucide-react";

const FAQ_ITEMS = [
  {
    question: "What is Likha Apps?",
    answer:
      "Likha Apps is a curated marketplace and directory for web apps and Progressive Web Apps (PWAs). It provides independent developers, makers, and teams with a dedicated platform to showcase their software, while giving users a central place to discover, try, rate, and save web apps that run directly in any modern browser.",
  },
  {
    question: "Who can submit an app?",
    answer:
      "Anyone who has built a publicly accessible web application or PWA can register for a free Developer account and submit an app for review. This includes indie developers, freelancers, students, startup teams, and open-source contributors.",
  },
  {
    question: "What kinds of apps can be listed?",
    answer:
      "We accept productive tools, developer utilities, creative suites, games, educational software, lifestyle aids, and general web applications. Apps must be functional, served securely over HTTPS, responsive on mobile and desktop, and provide value to users.",
  },
  {
    question: "Do I need to be a developer to use Likha Apps?",
    answer:
      "Not at all! Likha Apps is designed for everyone. Regular users can create a Personal account to explore the marketplace, run apps instantly with zero install friction, save favorites to their private dashboard, and submit community ratings and reviews.",
  },
  {
    question: "How are apps approved?",
    answer:
      "Every submitted app goes through a manual moderation review where our team verifies that the app URL is functional, the manifest and icon load properly, and the listing meets catalog safety and quality guidelines. 'Approved by Likha Apps' indicates that the listing has passed our catalog review; it is not government/KYC identity verification.",
  },
  {
    question: "Can users rate and review apps?",
    answer:
      "Yes. Any signed-in user can submit a 1 to 5 star rating and optional written feedback for approved applications. To maintain catalog integrity, developers are prohibited from rating or reviewing their own applications.",
  },
  {
    question: "Are the rankings based on real ratings?",
    answer:
      "Yes. The Likha Apps leaderboard ranks applications using verified community ratings and reviews. The ranking algorithm considers both the average rating score and the volume of reviews to ensure that rankings highlight applications with established, trustworthy community feedback.",
  },
];

export function AboutPageClient() {
  const router = useRouter();
  const {
    user,
    profile,
    isAuthenticated,
    isAdmin,
    isDeveloper,
    loading: authLoading,
    logout,
  } = useAuth();
  const hasMounted = useHydrated();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenFaqIndex((prev) => (prev === idx ? null : idx));
  };

  const handleLogout = async () => {
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <div
      className="min-h-screen bg-(--paper) text-(--ink) selection:bg-(--coral) selection:text-white"
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
          "--gold": "#A9791F",
        } as React.CSSProperties
      }
    >
      {/* --------------------------------------------------------------------- */}
      {/* Navigation Header                                                     */}
      {/* --------------------------------------------------------------------- */}
      <nav className="sticky top-0 z-50 w-full bg-(--paper)/90 backdrop-blur-md border-b border-(--line)">
        <div className="max-w-6xl mx-auto px-6 h-16 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-(--ink) text-(--paper) font-display text-sm font-semibold transition-transform group-hover:scale-105">
              LA
            </span>
            <span className="font-display text-lg font-semibold text-(--ink) tracking-tight">
              Likha Apps
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/"
              className="text-sm font-medium text-(--body) hover:text-(--ink) transition-colors"
            >
              Directory
            </Link>
            <Link
              href="/rankings"
              className="text-sm font-medium text-(--body) hover:text-(--ink) transition-colors flex items-center gap-1.5"
            >
              <Trophy className="w-3.5 h-3.5 text-amber-600" />
              <span>Rankings</span>
            </Link>
            <Link
              href="/about"
              className="text-sm font-semibold text-(--ink) border-b-2 border-(--coral) pb-0.5"
            >
              About
            </Link>
          </div>

          {/* Desktop Auth Actions */}
          <div className="hidden md:flex items-center gap-3">
            {!hasMounted || authLoading ? (
              <div className="w-24 h-9 rounded-md bg-(--ink)/5 animate-pulse" />
            ) : isAuthenticated ? (
              <>
                {isAdmin && (
                  <span className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider px-2 py-0.5 rounded bg-(--ink) text-(--paper) font-semibold">
                    <ShieldCheck className="w-3 h-3 text-amber-400" />
                    Admin
                  </span>
                )}
                <Link
                  href={isAdmin ? "/admin" : isDeveloper ? "/dashboard" : "/account"}
                  className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-(--card) border border-(--line) text-xs font-mono text-(--ink) hover:border-(--ink)/40 transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-(--ink) text-(--paper) flex items-center justify-center text-[10px] font-sans font-bold uppercase">
                    {profile?.firstName
                      ? profile.firstName[0]
                      : user?.email
                      ? user.email[0]
                      : "U"}
                  </span>
                  <span className="font-medium truncate max-w-[120px]">
                    {profile?.firstName || user?.displayName || (isDeveloper ? "Developer" : "Account")}
                  </span>
                </Link>
                {isDeveloper ? (
                  <Link href="/submit">
                    <Button className="rounded-md bg-(--coral) text-white hover:bg-[#e85a3e] px-4 h-9 shadow-none text-xs font-medium transition-colors cursor-pointer">
                      Submit App
                    </Button>
                  </Link>
                ) : (
                  <Link href="/account">
                    <Button
                      variant="outline"
                      className="rounded-md border-(--line) text-(--ink) hover:bg-(--ink-soft) px-4 h-9 shadow-none text-xs font-medium transition-colors cursor-pointer"
                    >
                      My Account
                    </Button>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs font-medium text-(--body-dim) hover:text-(--ink) transition-colors p-1.5 rounded-md hover:bg-(--ink-soft) cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log out</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-(--body) hover:text-(--ink) transition-colors cursor-pointer"
                >
                  Log in
                </Link>
                <Link href="/submit">
                  <Button className="rounded-md bg-(--coral) text-white hover:bg-[#e85a3e] px-5 shadow-none font-medium transition-colors cursor-pointer">
                    Submit App
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden text-(--ink) hover:bg-(--ink-soft) p-2 rounded-md transition-colors cursor-pointer"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-(--line) bg-(--paper) px-6 py-4 flex flex-col gap-4 shadow-lg">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-(--ink) text-left"
            >
              Directory
            </Link>
            <Link
              href="/rankings"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-medium text-(--ink) text-left flex items-center gap-2"
            >
              <Trophy className="w-4 h-4 text-amber-600" />
              <span>Top Ranked Apps</span>
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="text-base font-semibold text-(--coral) text-left"
            >
              About Likha Apps
            </Link>

            <div className="pt-3 border-t border-(--line) flex flex-col gap-3">
              {!hasMounted || authLoading ? (
                <div className="w-full h-10 rounded-md bg-(--ink)/5 animate-pulse" />
              ) : isAuthenticated ? (
                <>
                  <div className="flex items-center justify-between py-1">
                    <Link
                      href={isAdmin ? "/admin" : isDeveloper ? "/dashboard" : "/account"}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2.5"
                    >
                      <span className="w-8 h-8 rounded-full bg-(--ink) text-(--paper) flex items-center justify-center text-xs font-bold uppercase">
                        {profile?.firstName
                          ? profile.firstName[0]
                          : user?.email
                          ? user.email[0]
                          : "U"}
                      </span>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-(--ink) leading-tight">
                          {profile?.fullName || user?.displayName || (isDeveloper ? "Developer" : "Account")}
                        </span>
                        <span className="text-[11px] font-mono text-(--body-dim)">
                          {isAdmin
                            ? "Admin Portal"
                            : isDeveloper
                            ? "Developer Dashboard"
                            : "Personal Account"}
                        </span>
                      </div>
                    </Link>
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="text-xs font-medium text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log out
                    </button>
                  </div>
                  {isDeveloper ? (
                    <Link
                      href="/submit"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full"
                    >
                      <Button className="w-full rounded-md bg-(--coral) text-white hover:bg-[#e85a3e] font-medium transition-colors">
                        Submit App
                      </Button>
                    </Link>
                  ) : (
                    <Link
                      href="/account"
                      onClick={() => setMobileMenuOpen(false)}
                      className="w-full"
                    >
                      <Button
                        variant="outline"
                        className="w-full rounded-md border-(--line) text-(--ink) hover:bg-(--ink-soft) font-medium"
                      >
                        My Account
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full"
                  >
                    <Button
                      variant="outline"
                      className="w-full rounded-md border-(--line) text-(--ink)"
                    >
                      Log in
                    </Button>
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full"
                  >
                    <Button className="w-full rounded-md bg-(--coral) text-white hover:bg-[#e85a3e]">
                      Create account
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* --------------------------------------------------------------------- */}
      {/* 1. Hero Section                                                       */}
      {/* --------------------------------------------------------------------- */}
      <header className="relative pt-16 pb-20 px-6 border-b border-(--line) overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-(--card) border border-(--line) text-xs font-mono text-(--body-dim) shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Discover Independent Web Craftsmanship</span>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-medium text-(--ink) tracking-tight leading-[1.15]">
            Web apps deserve a place to be discovered.
          </h1>

          <p className="text-lg sm:text-xl text-(--body) max-w-2xl mx-auto leading-relaxed">
            Likha Apps is a marketplace for web apps and Progressive Web Apps built by independent developers, makers, and teams.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/">
              <Button className="h-12 px-8 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-base rounded-lg shadow-[3px_3px_0_0_var(--ink)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer">
                Explore Apps
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/submit">
              <Button
                variant="outline"
                className="h-12 px-8 border-(--line) bg-(--card) hover:bg-(--ink-soft) text-(--ink) font-medium text-base rounded-lg shadow-[3px_3px_0_0_var(--line)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all cursor-pointer"
              >
                Submit Your App
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------------- */}
      {/* 2. What is Likha Apps?                                                */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-20 px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
          <div className="md:col-span-5 space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-(--coral) font-semibold">
              The Mission
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-(--ink) tracking-tight leading-tight">
              Bridging the gap between makers and users.
            </h2>
          </div>

          <div className="md:col-span-7 space-y-5 text-base sm:text-lg text-(--body) leading-relaxed">
            <p>
              Every day, developers build ingenious, lightweight, and capable web applications. But because these tools live on personal domains, GitHub repositories, or brief social posts, they often remain hidden from the people who need them most.
            </p>
            <p>
              <strong>Likha Apps</strong> provides a dedicated, structured marketplace where independent web software is showcased, organized, and celebrated. Users can search categories, try apps instantly with zero install overhead, rate their experiences, and bookmark tools they love.
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 3. Who is Likha Apps For? (Dual Columns)                              */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-(--card) border-y border-(--line)">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) font-semibold">
              Two Sides of the Ecosystem
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-(--ink) tracking-tight">
              Designed for developers and everyday users alike.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* For Developers Card */}
            <div className="bg-(--paper) rounded-2xl border border-(--line) p-8 sm:p-10 flex flex-col justify-between shadow-xs">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-(--ink) text-(--paper) flex items-center justify-center shadow-xs">
                    <Code2 className="w-6 h-6 text-(--coral)" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-medium text-(--ink)">
                      For Developers
                    </h3>
                    <span className="font-mono text-xs text-(--body-dim)">
                      Indie makers, freelancers & teams
                    </span>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-(--body) leading-relaxed">
                  Give your progressive web apps a permanent, discoverable home with a rich marketplace presence.
                </p>

                <ul className="space-y-3 text-sm text-(--ink)">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Publish detailed app listings with screenshots and categories</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Track review moderation with real-time status notifications</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Receive authentic community ratings, reviews, and rankings</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Reach an audience of users looking specifically for web tools</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8 flex flex-wrap gap-3">
                <Link href="/submit">
                  <Button className="bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium h-10 px-5 rounded-md cursor-pointer">
                    Submit an App
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button
                    variant="outline"
                    className="border-(--line) bg-(--card) text-(--ink) hover:bg-(--ink-soft) text-xs font-medium h-10 px-5 rounded-md cursor-pointer"
                  >
                    Developer Dashboard
                  </Button>
                </Link>
              </div>
            </div>

            {/* For Users Card */}
            <div className="bg-(--paper) rounded-2xl border border-(--line) p-8 sm:p-10 flex flex-col justify-between shadow-xs">
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-(--ink) text-(--paper) flex items-center justify-center shadow-xs">
                    <Users className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-medium text-(--ink)">
                      For Users
                    </h3>
                    <span className="font-mono text-xs text-(--body-dim)">
                      Tool seekers & productivity enthusiasts
                    </span>
                  </div>
                </div>

                <p className="text-sm sm:text-base text-(--body) leading-relaxed">
                  Discover lightweight, secure software that runs right in your browser without app store friction.
                </p>

                <ul className="space-y-3 text-sm text-(--ink)">
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Search, filter, and discover web apps across focused categories</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Test and launch apps instantly with zero installation or downloads</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Save bookmarks to your personal Favorites account portal</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>Share your voice by submitting ratings and written feedback</span>
                  </li>
                </ul>
              </div>

              <div className="pt-8">
                <Link href="/">
                  <Button className="bg-(--ink) hover:bg-(--ink)/90 text-(--paper) text-xs font-medium h-10 px-6 rounded-md cursor-pointer">
                    Explore the Marketplace
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 4. How Likha Apps Works                                               */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-20 px-6 max-w-6xl mx-auto space-y-16">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) font-semibold">
            The Lifecycle
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-medium text-(--ink) tracking-tight">
            How it works from creation to discovery.
          </h2>
        </div>

        {/* Developer Workflow Steps */}
        <div className="space-y-6">
          <h3 className="font-mono text-xs uppercase tracking-wider text-(--coral) font-semibold text-center sm:text-left">
            Developer Submission Flow
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs relative">
              <span className="font-mono text-xs font-bold text-(--coral) bg-(--coral)/10 px-2 py-0.5 rounded">
                Step 01
              </span>
              <h4 className="font-display text-lg font-medium text-(--ink) mt-4 mb-2">
                Build
              </h4>
              <p className="text-xs text-(--body) leading-relaxed">
                Create a functional, responsive web app or PWA served securely over HTTPS.
              </p>
            </div>

            <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs relative">
              <span className="font-mono text-xs font-bold text-(--coral) bg-(--coral)/10 px-2 py-0.5 rounded">
                Step 02
              </span>
              <h4 className="font-display text-lg font-medium text-(--ink) mt-4 mb-2">
                Submit
              </h4>
              <p className="text-xs text-(--body) leading-relaxed">
                Submit your manifest URL, app metadata, and screenshot previews through our wizard.
              </p>
            </div>

            <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs relative">
              <span className="font-mono text-xs font-bold text-(--coral) bg-(--coral)/10 px-2 py-0.5 rounded">
                Step 03
              </span>
              <h4 className="font-display text-lg font-medium text-(--ink) mt-4 mb-2">
                Review
              </h4>
              <p className="text-xs text-(--body) leading-relaxed">
                Our moderation team reviews the app for safety, functionality, and catalog compliance.
              </p>
            </div>

            <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs relative">
              <span className="font-mono text-xs font-bold text-(--coral) bg-(--coral)/10 px-2 py-0.5 rounded">
                Step 04
              </span>
              <h4 className="font-display text-lg font-medium text-(--ink) mt-4 mb-2">
                Discover
              </h4>
              <p className="text-xs text-(--body) leading-relaxed">
                Approved listings go live in search, category directories, and public leaderboard rankings.
              </p>
            </div>
          </div>
        </div>

        {/* User Experience Summary Banner */}
        <div className="bg-(--ink) text-(--paper) rounded-2xl p-8 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="font-mono text-xs uppercase tracking-wider text-amber-400 font-semibold">
              The User Journey
            </span>
            <h4 className="font-display text-2xl sm:text-3xl font-medium tracking-tight">
              Discover → Try Instantly → Rate → Save
            </h4>
            <p className="text-sm text-(--paper)/80 max-w-xl">
              No heavy downloads, no app store approvals, no proprietary ecosystems. Just pure modern web tools.
            </p>
          </div>

          <Link href="/" className="shrink-0">
            <Button className="h-11 px-6 bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium rounded-md shadow-none cursor-pointer">
              Browse Directory
            </Button>
          </Link>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 5. Trust, Moderation & Badges                                         */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-(--card) border-y border-(--line)">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            </div>

            <div className="space-y-4">
              <span className="font-mono text-xs uppercase tracking-wider text-emerald-800 font-semibold">
                Trust & Transparency
              </span>
              <h2 className="font-display text-3xl font-medium text-(--ink) tracking-tight">
                What does &quot;Approved by Likha Apps&quot; mean?
              </h2>

              <p className="text-base text-(--body) leading-relaxed">
                When you see the <strong>Approved by Likha Apps</strong> badge on an application, it means our moderation team has verified that the app functions as described, loads securely over HTTPS, complies with web standards, and is appropriate for our directory.
              </p>

              <div className="p-4 rounded-xl bg-(--paper) border border-(--line) text-xs sm:text-sm text-(--body) space-y-2">
                <p className="font-medium text-(--ink)">
                  Important clarity on moderation scope:
                </p>
                <p>
                  Catalog approval confirms basic functionality and listing accuracy. It does not constitute legal identity verification (KYC), government endorsement, or ongoing auditing of third-party external code.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 6. Core Features Grid: Ratings, Rankings, Favorites & Notifications */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-20 px-6 max-w-6xl mx-auto space-y-12">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) font-semibold">
            Platform Capabilities
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-medium text-(--ink) tracking-tight">
            Built for community-driven discovery.
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Ratings */}
          <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-(--paper) border border-(--line) flex items-center justify-center text-(--coral)">
              <Star className="w-5 h-5 fill-(--coral)" />
            </div>
            <h3 className="font-display text-lg font-medium text-(--ink)">
              Real User Ratings
            </h3>
            <p className="text-xs text-(--body) leading-relaxed">
              Genuine feedback from registered users. Developers are protected from self-rating conflicts to keep reviews authentic.
            </p>
          </div>

          {/* Rankings */}
          <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-(--paper) border border-(--line) flex items-center justify-center text-amber-600">
              <Trophy className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-medium text-(--ink)">
              Fair Leaderboards
            </h3>
            <p className="text-xs text-(--body) leading-relaxed">
              Rankings balance rating quality with review volume to surface established, reputable applications.
            </p>
          </div>

          {/* Favorites */}
          <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-(--paper) border border-(--line) flex items-center justify-center text-red-500">
              <Heart className="w-5 h-5 fill-red-500" />
            </div>
            <h3 className="font-display text-lg font-medium text-(--ink)">
              Personal Favorites
            </h3>
            <p className="text-xs text-(--body) leading-relaxed">
              Bookmark apps with a single click and access them instantly from your private Account portal.
            </p>
          </div>

          {/* Notifications */}
          <div className="bg-(--card) rounded-xl border border-(--line) p-6 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-lg bg-(--paper) border border-(--line) flex items-center justify-center text-indigo-600">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="font-display text-lg font-medium text-(--ink)">
              Live Notifications
            </h3>
            <p className="text-xs text-(--body) leading-relaxed">
              Receive status updates when applications are submitted, reviewed, or approved in real time.
            </p>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 7. Product Philosophy & Where the Idea Started                        */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-(--paper) border-t border-(--line)">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="space-y-4">
            <span className="font-mono text-xs uppercase tracking-wider text-(--coral) font-semibold">
              Our Philosophy & Story
            </span>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-(--ink) tracking-tight">
              Built on the belief that the open web is the best app platform.
            </h2>
          </div>

          <div className="prose prose-neutral text-base sm:text-lg text-(--body) leading-relaxed space-y-5">
            <p>
              Likha Apps started with a simple question: <em>what happens to the remarkable web apps developers build when they don&apos;t have massive distribution channels or venture funding?</em>
            </p>
            <p>
              Modern web browsers have evolved into full-fledged, high-performance runtime environments. Progressive Web Apps can run offline, load instantly, and execute across macOS, Windows, Android, and iOS without requiring app store gatekeepers or 30% revenue cuts.
            </p>
            <p>
              We built Likha Apps to celebrate this craftsmanship. Our commitment is to remain focused on discoverability, transparent community ratings, and empowering makers to reach users directly.
            </p>
          </div>

          {/* Where the Idea Started / Personal Inspiration Card */}
          <div className="bg-(--card) rounded-2xl border border-(--line) p-8 shadow-xs space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-(--ink)/5 text-(--coral) flex items-center justify-center">
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <span className="font-mono text-xs uppercase tracking-wider text-(--coral) font-semibold block">
                  Where the Idea Started
                </span>
                <h3 className="font-display text-xl font-medium text-(--ink)">
                  Projects That Inspired Likha Apps
                </h3>
              </div>
            </div>

            <p className="text-sm sm:text-base text-(--body) leading-relaxed">
              Before building Likha Apps, I also worked on projects like <strong>SmartBasura</strong>, a capstone project focused on household waste pickup reminders and waste-sorting guidance for local barangays.
            </p>

            <p className="text-sm sm:text-base text-(--body) leading-relaxed">
              Building and deploying practical, community-oriented web tools highlighted the need for a dedicated space where independent web software can be easily shared, tested, and discovered by real users.
            </p>

            {/* SmartBasura Reference Card (Non-Marketplace Display) */}
            <div className="p-5 rounded-xl bg-(--paper) border border-(--line) flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-medium text-base text-(--ink)">
                    SmartBasura
                  </h4>
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-(--ink-soft) text-(--ink) font-medium">
                    Previous Capstone Project
                  </span>
                </div>
                <p className="text-xs text-(--body)">
                  Household waste pickup reminders and sorting guide for local barangays.
                </p>
              </div>

              <a
                href="https://smartbasura.app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-mono text-(--coral) hover:underline cursor-pointer shrink-0"
              >
                <span>Visit Project</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <div className="p-4 rounded-xl bg-(--card) border border-(--line)">
              <span className="font-display font-bold text-lg text-(--ink) block">Discoverability</span>
              <span className="text-xs text-(--body-dim)">A home for web tools</span>
            </div>
            <div className="p-4 rounded-xl bg-(--card) border border-(--line)">
              <span className="font-display font-bold text-lg text-(--ink) block">Real Feedback</span>
              <span className="text-xs text-(--body-dim)">Community reviews</span>
            </div>
            <div className="p-4 rounded-xl bg-(--card) border border-(--line)">
              <span className="font-display font-bold text-lg text-(--ink) block">Open Standards</span>
              <span className="text-xs text-(--body-dim)">W3C PWA manifests</span>
            </div>
            <div className="p-4 rounded-xl bg-(--card) border border-(--line)">
              <span className="font-display font-bold text-lg text-(--ink) block">Zero Install</span>
              <span className="text-xs text-(--body-dim)">Instant browser launch</span>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 8. Frequently Asked Questions (FAQ)                                   */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-(--card) border-t border-(--line)">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-(--body-dim)">
              <HelpCircle className="w-4 h-4 text-(--coral)" />
              <span>Got Questions?</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-medium text-(--ink) tracking-tight">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="rounded-xl border border-(--line) bg-(--paper) overflow-hidden transition-all"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-5 sm:p-6 text-left flex items-center justify-between gap-4 font-display font-medium text-base sm:text-lg text-(--ink) hover:text-(--coral) transition-colors cursor-pointer"
                    aria-expanded={isOpen}
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      className={`w-5 h-5 text-(--body-dim) shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-(--coral)" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-6 sm:px-6 sm:pb-6 text-sm text-(--body) leading-relaxed border-t border-(--line)/50 pt-4 animate-in fade-in duration-150">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 9. Bottom Dual CTA Section                                            */}
      {/* --------------------------------------------------------------------- */}
      <section className="py-20 px-6 bg-(--paper) border-t border-(--line)">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Developer CTA */}
            <div className="bg-(--card) rounded-2xl border border-(--line) p-8 sm:p-10 shadow-[4px_4px_0_0_var(--line)] flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="font-mono text-xs uppercase tracking-wider text-(--coral) font-semibold">
                  For Creators
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight">
                  Have a web app or PWA?
                </h3>
                <p className="text-sm text-(--body) leading-relaxed">
                  Join independent makers showcasing their work on Likha Apps. Create your listing and start reaching users today.
                </p>
              </div>

              <Link href="/submit">
                <Button className="w-full h-11 bg-(--coral) hover:bg-[#e85a3e] text-white font-medium text-sm rounded-md shadow-none cursor-pointer">
                  Submit Your App
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* User CTA */}
            <div className="bg-(--card) rounded-2xl border border-(--line) p-8 sm:p-10 shadow-[4px_4px_0_0_var(--line)] flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) font-semibold">
                  For Explorers
                </span>
                <h3 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight">
                  Looking for useful tools?
                </h3>
                <p className="text-sm text-(--body) leading-relaxed">
                  Browse curated progressive web apps, check leaderboard rankings, and discover tools built by makers worldwide.
                </p>
              </div>

              <Link href="/">
                <Button
                  variant="outline"
                  className="w-full h-11 border-(--line) bg-(--card) hover:bg-(--ink-soft) text-(--ink) font-medium text-sm rounded-md shadow-none cursor-pointer"
                >
                  Explore the Marketplace
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------------------- */}
      {/* 10. Public Footer                                                     */}
      {/* --------------------------------------------------------------------- */}
      <footer className="border-t border-(--line) bg-(--paper) py-12 px-6 text-center text-xs font-mono text-(--body-dim)">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-(--ink) text-(--paper) flex items-center justify-center text-[10px] font-bold">
              LA
            </span>
            <span className="font-bold text-(--ink)">Likha Apps</span>
            <span>— The Progressive Web App Marketplace</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-(--ink) transition-colors">
              Directory
            </Link>
            <Link href="/rankings" className="hover:text-(--ink) transition-colors">
              Rankings
            </Link>
            <Link href="/about" className="hover:text-(--ink) text-(--ink) font-semibold">
              About
            </Link>
            <Link href="/submit" className="hover:text-(--ink) transition-colors">
              Submit
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

