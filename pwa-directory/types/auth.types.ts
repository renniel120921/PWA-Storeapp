import type { User as FirebaseUser } from "firebase/auth";
import type { Timestamp } from "firebase/firestore";

/**
 * Valid authenticated user roles.
 * Visitors are represented by an unauthenticated state (null user / null role).
 */
export type UserRole = "developer" | "admin";

/**
 * Compatible Timestamp type that supports Firestore Timestamp instances,
 * native Date objects, or serialized timestamp records.
 */
export type TimestampValue =
  | Timestamp
  | Date
  | { seconds: number; nanoseconds: number }
  | null;

/**
 * User Profile stored in Cloud Firestore (`users/{uid}`).
 */
export interface UserProfile {
  uid: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  extensionName?: string;
  fullName: string;
  role: UserRole;
  avatarUrl?: string;
  bio?: string;
  website?: string;
  isVerified?: boolean;
  createdAt: TimestampValue;
  updatedAt?: TimestampValue;
}

/**
 * Shape of the global AuthContext state (for future AuthProvider usage).
 */
export interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isDeveloper: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

