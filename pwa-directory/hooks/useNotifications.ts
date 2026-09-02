"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import type { AppNotification } from "@/types";

export function useNotifications() {
  const { user, isAuthenticated } = useAuth();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.uid) {
      return;
    }

    const q = query(
      collection(db, "notifications"),
      where("recipientId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notifs: AppNotification[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          notifs.push({
            id: docSnap.id,
            recipientId: data.recipientId || "",
            type: data.type || "new_submission",
            title: data.title || "Notification",
            message: data.message || "",
            relatedId: data.relatedId || "",
            relatedType: data.relatedType || "submission",
            link: data.link || "",
            read: data.read ?? false,
            createdAt: data.createdAt || null,
          });
        });

        // Sort newest first client-side
        notifs.sort((a, b) => {
          const getTime = (val: AppNotification["createdAt"]) => {
            if (!val) return 0;
            if (typeof val === "object" && "seconds" in val) return val.seconds * 1000;
            if (val instanceof Date) return val.getTime();
            return 0;
          };
          return getTime(b.createdAt) - getTime(a.createdAt);
        });

        setNotifications(notifs);
        setLoading(false);
      },
      (error) => {
        console.error("[useNotifications] onSnapshot error:", error);
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.uid, isAuthenticated]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!notificationId) return;

    try {
      const notifRef = doc(db, "notifications", notificationId);
      await updateDoc(notifRef, {
        read: true,
      });

      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.warn("[useNotifications] Failed to mark as read:", err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;

    try {
      const batch = writeBatch(db);
      unread.forEach((n) => {
        const notifRef = doc(db, "notifications", n.id);
        batch.update(notifRef, { read: true });
      });

      await batch.commit();

      // Optimistic update
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.warn("[useNotifications] Failed to mark all as read:", err);
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
  };
}
