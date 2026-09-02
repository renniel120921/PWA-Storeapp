"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useHydrated } from "@/hooks/useHydrated";
import { useNotifications } from "@/hooks/useNotifications";
import { getUserFavoritePwas, toggleFavorite } from "@/lib/services/favorite.service";
import { getUserReviews, type ReviewItem } from "@/lib/services/review.service";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { StarRating } from "@/components/reviews/StarRating";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  User,
  Heart,
  MessageSquare,
  Bell,
  Rocket,
  ExternalLink,
  Trash2,
  LogOut,
  Loader2,
  Edit3,
  ArrowRight,
} from "lucide-react";
import Swal from "sweetalert2";
import type { Pwa, AppNotification } from "@/types";

type AccountTab = "overview" | "favorites" | "reviews" | "notifications";

function formatTimeAgo(timestamp: AppNotification["createdAt"]): string {
  if (!timestamp) return "Recently";
  let timeMs = 0;
  if (typeof timestamp === "object" && "seconds" in timestamp) {
    timeMs = timestamp.seconds * 1000;
  } else if (timestamp instanceof Date) {
    timeMs = timestamp.getTime();
  }
  if (!timeMs) return "Recently";

  const diffSec = Math.floor((Date.now() - timeMs) / 1000);
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timeMs).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AccountPage() {
  const router = useRouter();
  const hasMounted = useHydrated();
  const { user, profile, role, isAdmin, isDeveloper, isAuthenticated, loading: authLoading, logout, refreshProfile } =
    useAuth();

  const [activeTab, setActiveTab] = useState<AccountTab>("overview");

  // Favorites state
  const [favoritePwas, setFavoritePwas] = useState<Pwa[]>([]);
  const [loadingFavorites, setLoadingFavorites] = useState(true);

  // Reviews state
  const [userReviews, setUserReviews] = useState<ReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  // Notifications
  const { notifications, unreadCount, loading: notifLoading, markAsRead, markAllAsRead } =
    useNotifications();

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    extensionName: "",
    bio: "",
    website: "",
    avatarUrl: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Auth Protection Guard
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?next=/account");
    }
  }, [authLoading, isAuthenticated, router]);

  // Load Favorites and Reviews in a single coordinated effect
  useEffect(() => {
    let isCancelled = false;

    async function loadAccountData() {
      if (!user?.uid) {
        setLoadingFavorites(false);
        setLoadingReviews(false);
        return;
      }

      setLoadingFavorites(true);
      setLoadingReviews(true);

      try {
        const [favs, revs] = await Promise.all([
          getUserFavoritePwas(user.uid),
          getUserReviews(user.uid),
        ]);

        if (!isCancelled) {
          setFavoritePwas(favs);
          setUserReviews(revs);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("Failed to load account data:", err);
        }
      } finally {
        if (!isCancelled) {
          setLoadingFavorites(false);
          setLoadingReviews(false);
        }
      }
    }

    loadAccountData();

    return () => {
      isCancelled = true;
    };
  }, [user?.uid]);

  const handleStartEditProfile = () => {
    setEditFormData({
      firstName: profile?.firstName || "",
      middleName: profile?.middleName || "",
      lastName: profile?.lastName || "",
      extensionName: profile?.extensionName || "",
      bio: profile?.bio || "",
      website: profile?.website || "",
      avatarUrl: profile?.avatarUrl || "",
    });
    setIsEditingProfile(true);
  };

  // Handle Remove Favorite
  const handleRemoveFavorite = async (pwaSlug: string) => {
    if (!user?.uid) return;
    try {
      const res = await toggleFavorite(user.uid, pwaSlug);
      if (!res.favorited) {
        setFavoritePwas((prev) => prev.filter((p) => p.slug !== pwaSlug));
        Swal.fire({
          icon: "info",
          title: "Removed from favorites",
          timer: 1500,
          showConfirmButton: false,
          toast: true,
          position: "top-end",
        });
      }
    } catch (err) {
      console.error("Failed to remove favorite:", err);
    }
  };

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsSavingProfile(true);
    try {
      const userRef = doc(db, "users", user.uid);
      const fullName = [
        editFormData.firstName.trim(),
        editFormData.middleName.trim(),
        editFormData.lastName.trim(),
        editFormData.extensionName.trim(),
      ]
        .filter(Boolean)
        .join(" ");

      await updateDoc(userRef, {
        firstName: editFormData.firstName.trim(),
        middleName: editFormData.middleName.trim(),
        lastName: editFormData.lastName.trim(),
        extensionName: editFormData.extensionName.trim(),
        fullName,
        bio: editFormData.bio.trim(),
        website: editFormData.website.trim(),
        avatarUrl: editFormData.avatarUrl.trim(),
        updatedAt: serverTimestamp(),
      });

      if (refreshProfile) {
        await refreshProfile();
      }

      setIsEditingProfile(false);
      Swal.fire({
        icon: "success",
        title: "Profile updated",
        timer: 1800,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Failed to update profile:", err);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Could not save profile changes. Please try again.",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Upgrade Role to Developer (Self-service developer upgrade)
  const handleUpgradeToDeveloper = async () => {
    if (!user?.uid) return;

    const result = await Swal.fire({
      title: "Become a Likha Developer",
      text: "Upgrading your account enables you to submit and manage progressive web apps in the Likha Apps catalog.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#FF6A4D",
      cancelButtonColor: "#7A8480",
      confirmButtonText: "Yes, enable Developer portal",
    });

    if (result.isConfirmed) {
      try {
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          role: "developer",
          updatedAt: serverTimestamp(),
        });

        if (refreshProfile) {
          await refreshProfile();
        }

        await Swal.fire({
          icon: "success",
          title: "Developer Mode Activated!",
          text: "You can now submit apps and access your developer dashboard.",
        });

        router.push("/dashboard");
      } catch (err) {
        console.error("Failed to upgrade role:", err);
        Swal.fire({
          icon: "error",
          title: "Upgrade Failed",
          text: "Could not activate developer account. Please try again.",
        });
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      router.push("/");
    } catch (err) {
      console.error("Failed to sign out:", err);
    }
  };

  if (!hasMounted || authLoading) {
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
          <Loader2 className="w-8 h-8 text-(--coral) animate-spin mx-auto mb-4" />
          <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim) block mb-1">
            hydrating profile
          </span>
          <p className="text-sm font-medium text-(--ink)">
            Loading your account details...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-(--paper) text-(--ink)"
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
      {/* Top Header Navigation */}
      <nav className="sticky top-0 z-40 bg-(--paper)/90 backdrop-blur-md border-b border-(--line)">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-(--ink) text-(--paper) font-display text-sm font-semibold transition-transform group-hover:scale-105">
              LA
            </span>
            <span className="font-display text-lg font-semibold text-(--ink) tracking-tight">
              Likha Apps
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link href="/">
              <Button
                variant="outline"
                className="h-9 px-3.5 border-(--line) text-(--ink) text-xs font-mono bg-transparent hover:bg-(--ink-soft)"
              >
                Directory
              </Button>
            </Link>
            {isDeveloper && (
              <Link href="/dashboard">
                <Button className="h-9 px-3.5 bg-(--ink) text-(--paper) text-xs font-mono hover:bg-(--ink)/90">
                  Developer Dashboard
                </Button>
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin">
                <Button className="h-9 px-3.5 bg-rose-700 text-white text-xs font-mono hover:bg-rose-800">
                  Admin Portal
                </Button>
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Account Portal */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-8">
        {/* User Identity Header Card */}
        <div className="bg-(--card) rounded-2xl border border-(--line) p-6 sm:p-8 shadow-[4px_4px_0_0_var(--line)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-(--ink) text-(--paper) flex items-center justify-center font-display text-2xl sm:text-3xl font-bold uppercase shadow-sm">
              {profile?.firstName
                ? profile.firstName[0]
                : user?.email
                ? user.email[0]
                : "U"}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
                <h1 className="font-display text-2xl sm:text-3xl font-medium text-(--ink) tracking-tight">
                  {profile?.fullName || user?.displayName || "Marketplace User"}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold uppercase tracking-wider bg-(--ink-soft) text-(--ink) border border-(--line)">
                  {isAdmin ? "Admin" : isDeveloper ? "Developer" : "Personal Account"}
                </span>
              </div>

              <p className="text-xs sm:text-sm font-mono text-(--body-dim)">
                {user?.email}
              </p>

              {profile?.bio && (
                <p className="text-xs text-(--body) mt-2 line-clamp-2 max-w-xl">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {!isDeveloper && !isAdmin && (
              <Button
                onClick={handleUpgradeToDeveloper}
                className="flex-1 sm:flex-initial h-10 px-4 bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium rounded-md shadow-none flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Become a Developer</span>
              </Button>
            )}

            <button
              onClick={handleSignOut}
              className="p-2.5 rounded-lg text-(--body) hover:text-rose-700 hover:bg-rose-50 border border-(--line) hover:border-rose-200 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-(--line) pb-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "overview"
                ? "border-(--coral) text-(--ink)"
                : "border-transparent text-(--body-dim) hover:text-(--ink)"
            }`}
          >
            <User className="w-4 h-4" />
            <span>Profile & Settings</span>
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "favorites"
                ? "border-(--coral) text-(--ink)"
                : "border-transparent text-(--body-dim) hover:text-(--ink)"
            }`}
          >
            <Heart className="w-4 h-4 text-rose-500" />
            <span>Saved Favorites ({favoritePwas.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("reviews")}
            className={`flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "reviews"
                ? "border-(--coral) text-(--ink)"
                : "border-transparent text-(--body-dim) hover:text-(--ink)"
            }`}
          >
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span>My Reviews ({userReviews.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("notifications")}
            className={`flex items-center gap-2 px-4 py-3 font-mono text-xs uppercase tracking-wider font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === "notifications"
                ? "border-(--coral) text-(--ink)"
                : "border-transparent text-(--body-dim) hover:text-(--ink)"
            }`}
          >
            <Bell className="w-4 h-4 text-indigo-500" />
            <span>Notifications</span>
            {unreadCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-(--coral) text-white text-[10px] font-mono font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Overview & Profile Editing */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-(--card) rounded-2xl border border-(--line) p-6 sm:p-8 shadow-xs">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-(--line)">
                <div>
                  <h2 className="font-display text-xl font-medium text-(--ink) tracking-tight">
                    Account Profile
                  </h2>
                  <p className="text-xs text-(--body) mt-0.5">
                    Manage your personal details and marketplace profile.
                  </p>
                </div>

                {!isEditingProfile && (
                  <Button
                    onClick={handleStartEditProfile}
                    variant="outline"
                    className="h-9 px-3.5 border-(--line) text-(--ink) text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </Button>
                )}
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-5 max-w-2xl">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider text-(--body-dim)">
                        First Name
                      </label>
                      <Input
                        required
                        value={editFormData.firstName}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, firstName: e.target.value })
                        }
                        className="h-10 border-(--line)"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider text-(--body-dim)">
                        Last Name
                      </label>
                      <Input
                        required
                        value={editFormData.lastName}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, lastName: e.target.value })
                        }
                        className="h-10 border-(--line)"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider text-(--body-dim)">
                        Middle Name (Optional)
                      </label>
                      <Input
                        value={editFormData.middleName}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, middleName: e.target.value })
                        }
                        className="h-10 border-(--line)"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-mono uppercase tracking-wider text-(--body-dim)">
                        Extension (e.g. Jr., III)
                      </label>
                      <Input
                        value={editFormData.extensionName}
                        onChange={(e) =>
                          setEditFormData({ ...editFormData, extensionName: e.target.value })
                        }
                        className="h-10 border-(--line)"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-(--body-dim)">
                      Bio / Description
                    </label>
                    <textarea
                      rows={3}
                      value={editFormData.bio}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, bio: e.target.value })
                      }
                      placeholder="Share a short bio about yourself..."
                      className="w-full rounded-md border border-(--line) bg-transparent p-3 text-sm text-(--ink) placeholder:text-(--body-dim) focus:outline-hidden focus:ring-1 focus:ring-(--ink)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono uppercase tracking-wider text-(--body-dim)">
                      Website
                    </label>
                    <Input
                      type="url"
                      placeholder="https://example.com"
                      value={editFormData.website}
                      onChange={(e) =>
                        setEditFormData({ ...editFormData, website: e.target.value })
                      }
                      className="h-10 border-(--line)"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <Button
                      type="submit"
                      disabled={isSavingProfile}
                      className="h-10 px-5 bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium cursor-pointer"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditingProfile(false)}
                      className="h-10 px-4 border-(--line) text-(--body) hover:text-(--ink) text-xs font-medium cursor-pointer"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-(--body-dim) block mb-1">
                      Full Name
                    </span>
                    <p className="text-sm font-medium text-(--ink)">
                      {profile?.fullName || "Not specified"}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-(--body-dim) block mb-1">
                      Email Address
                    </span>
                    <p className="text-sm font-medium text-(--ink)">{user?.email}</p>
                  </div>

                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-(--body-dim) block mb-1">
                      Account Role
                    </span>
                    <p className="text-sm font-medium text-(--ink) capitalize">
                      {role || "user"}
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-mono uppercase tracking-wider text-(--body-dim) block mb-1">
                      Website
                    </span>
                    {profile?.website ? (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium text-(--coral) hover:underline flex items-center gap-1"
                      >
                        <span>{profile.website}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <p className="text-sm text-(--body-dim)">None</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Quick stats grid */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div
                onClick={() => setActiveTab("favorites")}
                className="bg-(--card) rounded-xl border border-(--line) p-5 shadow-xs hover:border-(--coral) transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim)">
                    Favorites
                  </span>
                  <Heart className="w-4 h-4 text-rose-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-display text-2xl font-bold text-(--ink)">
                  {favoritePwas.length}
                </div>
                <p className="text-[11px] text-(--body-dim) mt-1">
                  Saved progressive web apps
                </p>
              </div>

              <div
                onClick={() => setActiveTab("reviews")}
                className="bg-(--card) rounded-xl border border-(--line) p-5 shadow-xs hover:border-amber-500 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim)">
                    My Reviews
                  </span>
                  <MessageSquare className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-display text-2xl font-bold text-(--ink)">
                  {userReviews.length}
                </div>
                <p className="text-[11px] text-(--body-dim) mt-1">
                  Ratings and reviews posted
                </p>
              </div>

              <div
                onClick={() => setActiveTab("notifications")}
                className="bg-(--card) rounded-xl border border-(--line) p-5 shadow-xs hover:border-indigo-500 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs uppercase tracking-wider text-(--body-dim)">
                    Unread Alerts
                  </span>
                  <Bell className="w-4 h-4 text-indigo-500 group-hover:scale-110 transition-transform" />
                </div>
                <div className="font-display text-2xl font-bold text-(--ink)">
                  {unreadCount}
                </div>
                <p className="text-[11px] text-(--body-dim) mt-1">
                  Platform notifications
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Favorites */}
        {activeTab === "favorites" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-medium text-(--ink) tracking-tight">
                  Saved Progressive Web Apps
                </h2>
                <p className="text-xs text-(--body) mt-0.5">
                  Your bookmarked applications for fast access.
                </p>
              </div>
            </div>

            {loadingFavorites ? (
              <div className="bg-(--card) rounded-xl border border-(--line) p-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-(--body-dim) mx-auto mb-2" />
                <p className="text-xs font-mono text-(--body-dim)">
                  Loading your saved favorites...
                </p>
              </div>
            ) : favoritePwas.length === 0 ? (
              <div className="bg-(--card) rounded-xl border border-(--line) p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-medium text-(--ink)">
                    No favorites saved yet
                  </h3>
                  <p className="text-xs text-(--body) max-w-sm mx-auto mt-1">
                    Explore the public directory and click the heart icon on any app to save it to your account.
                  </p>
                </div>
                <Link href="/">
                  <Button className="h-9 px-4 bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium cursor-pointer">
                    Browse Catalog
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoritePwas.map((pwa) => (
                  <div
                    key={pwa.slug}
                    className="bg-(--card) rounded-xl border border-(--line) p-5 shadow-xs flex flex-col justify-between hover:border-(--coral)/50 transition-all group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="w-12 h-12 rounded-xl bg-(--paper) border border-(--line) flex items-center justify-center overflow-hidden shrink-0">
                          {pwa.iconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={pwa.iconUrl}
                              alt={pwa.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="font-display font-bold text-lg text-(--ink)">
                              {pwa.title[0]}
                            </span>
                          )}
                        </div>

                        <button
                          onClick={() => handleRemoveFavorite(pwa.slug)}
                          className="p-1.5 rounded-md text-(--body-dim) hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove from favorites"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <Link href={`/apps/${pwa.slug}`} className="block group-hover:underline">
                        <h3 className="font-display text-base font-semibold text-(--ink) line-clamp-1">
                          {pwa.title}
                        </h3>
                      </Link>

                      <p className="text-xs text-(--body) mt-1 line-clamp-2">
                        {pwa.tagline || pwa.description}
                      </p>
                    </div>

                    <div className="pt-4 mt-4 border-t border-(--line) flex items-center justify-between">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-(--paper) text-(--body) border border-(--line) uppercase">
                        {pwa.primaryCategory || "app"}
                      </span>

                      <div className="flex items-center gap-2">
                        <Link href={`/apps/${pwa.slug}`}>
                          <Button
                            variant="outline"
                            className="h-8 px-2.5 text-xs font-mono border-(--line) text-(--ink) hover:bg-(--ink-soft)"
                          >
                            Details
                          </Button>
                        </Link>
                        {pwa.appUrl && (
                          <a
                            href={pwa.appUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-(--ink) text-(--paper) hover:bg-(--ink)/90 transition-colors"
                            title="Launch PWA"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: My Reviews */}
        {activeTab === "reviews" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl font-medium text-(--ink) tracking-tight">
                My Reviews & Ratings
              </h2>
              <p className="text-xs text-(--body) mt-0.5">
                Ratings and feedback you have shared on community applications.
              </p>
            </div>

            {loadingReviews ? (
              <div className="bg-(--card) rounded-xl border border-(--line) p-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-(--body-dim) mx-auto mb-2" />
                <p className="text-xs font-mono text-(--body-dim)">
                  Loading your reviews...
                </p>
              </div>
            ) : userReviews.length === 0 ? (
              <div className="bg-(--card) rounded-xl border border-(--line) p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-medium text-(--ink)">
                    No reviews written yet
                  </h3>
                  <p className="text-xs text-(--body) max-w-sm mx-auto mt-1">
                    Try out PWAs from the directory and share your genuine review to help other members.
                  </p>
                </div>
                <Link href="/">
                  <Button className="h-9 px-4 bg-(--coral) hover:bg-[#e85a3e] text-white text-xs font-medium cursor-pointer">
                    Discover Apps to Rate
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {userReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="bg-(--card) rounded-xl border border-(--line) p-5 shadow-xs space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/apps/${rev.pwaSlug}`}
                        className="font-display text-base font-semibold text-(--ink) hover:underline flex items-center gap-1.5"
                      >
                        <span>{rev.pwaTitle || rev.pwaSlug}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-(--coral)" />
                      </Link>

                      <StarRating value={rev.rating} readOnly size="sm" />
                    </div>

                    {rev.comment && (
                      <p className="text-xs sm:text-sm text-(--body) leading-relaxed">
                        &ldquo;{rev.comment}&rdquo;
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] font-mono text-(--body-dim) pt-2 border-t border-(--line)">
                      <span>
                        Posted on{" "}
                        {rev.createdAt
                          ? typeof rev.createdAt === "string"
                            ? new Date(rev.createdAt).toLocaleDateString()
                            : typeof rev.createdAt === "object" &&
                              rev.createdAt !== null &&
                              "seconds" in rev.createdAt
                            ? new Date(
                                (rev.createdAt as { seconds: number }).seconds * 1000
                              ).toLocaleDateString()
                            : "Recently"
                          : "Recently"}
                      </span>

                      <Link
                        href={`/apps/${rev.pwaSlug}#reviews`}
                        className="text-(--coral) hover:underline"
                      >
                        View on Listing
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Notifications */}
        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-medium text-(--ink) tracking-tight">
                  Notification Center
                </h2>
                <p className="text-xs text-(--body) mt-0.5">
                  Platform alerts, updates, and moderation feedback.
                </p>
              </div>

              {unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  variant="outline"
                  className="h-8 px-3 border-(--line) text-(--ink) text-xs font-mono hover:bg-(--ink-soft) cursor-pointer"
                >
                  Mark All Read
                </Button>
              )}
            </div>

            {notifLoading ? (
              <div className="bg-(--card) rounded-xl border border-(--line) p-12 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-(--body-dim) mx-auto mb-2" />
                <p className="text-xs font-mono text-(--body-dim)">
                  Loading notifications...
                </p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-(--card) rounded-xl border border-(--line) p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-medium text-(--ink)">
                    All caught up!
                  </h3>
                  <p className="text-xs text-(--body) max-w-sm mx-auto mt-1">
                    You have no unread notifications at this time.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => !notif.read && markAsRead(notif.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      notif.read
                        ? "bg-(--card) border-(--line) opacity-80"
                        : "bg-amber-50/40 border-amber-200 ring-1 ring-amber-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              notif.read ? "bg-transparent" : "bg-(--coral)"
                            }`}
                          />
                          <h4 className="font-display text-sm font-semibold text-(--ink)">
                            {notif.title}
                          </h4>
                        </div>
                        <p className="text-xs text-(--body) leading-relaxed">
                          {notif.message}
                        </p>
                      </div>

                      <span className="text-[10px] font-mono text-(--body-dim) whitespace-nowrap">
                        {formatTimeAgo(notif.createdAt)}
                      </span>
                    </div>

                    {notif.link && (
                      <div className="mt-2.5 pt-2 border-t border-(--line)/50">
                        <Link
                          href={notif.link}
                          className="text-xs font-mono text-(--coral) hover:underline flex items-center gap-1"
                        >
                          <span>Open link</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
