import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getPwaBySlug } from "@/lib/services/pwa.service";
import type { Pwa } from "@/types";

export interface FavoriteItem {
  id: string; // `${uid}_${pwaSlug}`
  userId: string;
  pwaSlug: string;
  createdAt: unknown;
}

/**
 * Checks if a specific PWA is favorited by the user.
 */
export async function isAppFavorited(
  userId: string,
  pwaSlug: string
): Promise<boolean> {
  if (!userId || !pwaSlug) return false;
  try {
    const favRef = doc(db, "favorites", `${userId}_${pwaSlug}`);
    const snap = await getDoc(favRef);
    return snap.exists();
  } catch (err) {
    console.error("[favorite.service] isAppFavorited error:", err);
    return false;
  }
}

/**
 * Toggles a user favorite for a PWA.
 */
export async function toggleFavorite(
  userId: string,
  pwaSlug: string
): Promise<{ favorited: boolean }> {
  if (!userId || !pwaSlug) throw new Error("Missing userId or pwaSlug");

  const favDocId = `${userId}_${pwaSlug}`;
  const favRef = doc(db, "favorites", favDocId);
  const snap = await getDoc(favRef);

  if (snap.exists()) {
    await deleteDoc(favRef);
    return { favorited: false };
  } else {
    await setDoc(favRef, {
      id: favDocId,
      userId,
      pwaSlug,
      createdAt: serverTimestamp(),
    });
    return { favorited: true };
  }
}

/**
 * Gets all favorite PWA slugs for a user.
 */
export async function getUserFavoriteSlugs(userId: string): Promise<string[]> {
  if (!userId) return [];
  try {
    const favQuery = query(
      collection(db, "favorites"),
      where("userId", "==", userId)
    );
    const snap = await getDocs(favQuery);
    return snap.docs.map((d) => d.data().pwaSlug as string).filter(Boolean);
  } catch (err) {
    console.error("[favorite.service] getUserFavoriteSlugs error:", err);
    return [];
  }
}

/**
 * Gets all favorited PWA objects for a user.
 */
export async function getUserFavoritePwas(userId: string): Promise<Pwa[]> {
  if (!userId) return [];
  try {
    const slugs = await getUserFavoriteSlugs(userId);
    if (slugs.length === 0) return [];

    const pwaPromises = slugs.map((slug) => getPwaBySlug(slug));
    const results = await Promise.all(pwaPromises);
    return results.filter((p): p is Pwa => p !== null);
  } catch (err) {
    console.error("[favorite.service] getUserFavoritePwas error:", err);
    return [];
  }
}
