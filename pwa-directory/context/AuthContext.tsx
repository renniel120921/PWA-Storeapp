"use client";

import React, { createContext, useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, signOut, type User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { AuthContextType, UserProfile, UserRole } from "@/types";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Helper to fetch the Firestore user document safely with fallback
  const fetchProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<UserProfile> => {
    try {
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        const userProfile: UserProfile = {
          uid: firebaseUser.uid,
          email: data.email || firebaseUser.email || "",
          firstName: data.firstName || "",
          middleName: data.middleName || "",
          lastName: data.lastName || "",
          extensionName: data.extensionName || "",
          fullName: data.fullName || firebaseUser.displayName || "Developer",
          role:
            (data.role as UserRole) === "admin"
              ? "admin"
              : (data.role as UserRole) === "developer"
              ? "developer"
              : "user",
          avatarUrl: data.avatarUrl || firebaseUser.photoURL || undefined,
          bio: data.bio || undefined,
          website: data.website || undefined,
          isVerified: data.isVerified ?? false,
          createdAt: data.createdAt || null,
          updatedAt: data.updatedAt || null,
        };
        return userProfile;
      }
    } catch (err) {
      console.warn("Failed to fetch Firestore user profile, falling back to Auth defaults:", err);
    }

    // Fallback profile if Firestore document does not exist yet or fails
    const fallbackProfile: UserProfile = {
      uid: firebaseUser.uid,
      email: firebaseUser.email || "",
      firstName: "",
      lastName: "",
      fullName: firebaseUser.displayName || "User",
      role: "user",
      avatarUrl: firebaseUser.photoURL || undefined,
      createdAt: null,
    };
    return fallbackProfile;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) {
      setProfile(null);
      setRole(null);
      return;
    }
    const updatedProfile = await fetchProfile(auth.currentUser);
    setProfile(updatedProfile);
    setRole(updatedProfile.role);
  }, [fetchProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        const userProfile = await fetchProfile(currentUser);
        setProfile(userProfile);
        setRole(userProfile.role);
      } else {
        setProfile(null);
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchProfile]);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setRole(null);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  }, []);

  const value: AuthContextType = {
    user,
    profile,
    role,
    isAuthenticated: !!user,
    isAdmin: role === "admin",
    isDeveloper: role === "developer" || role === "admin",
    loading,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

