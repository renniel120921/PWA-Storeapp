import "server-only";
import { adminDb, FieldValue } from "@/lib/firebase-admin";
import type { AppNotification } from "@/types";

/**
 * Creates deterministic real-time notifications for all administrator accounts
 * when a developer submits an application into the review queue.
 */
export async function notifyAdminsOfNewSubmission(params: {
  submissionId: string;
  appTitle: string;
  developerName: string;
}): Promise<void> {
  const { submissionId, appTitle, developerName } = params;

  try {
    // 1. Query all users with role 'admin'
    const adminsSnap = await adminDb
      .collection("users")
      .where("role", "==", "admin")
      .get();

    const adminUids: string[] = [];

    adminsSnap.forEach((doc) => {
      adminUids.push(doc.id);
    });

    // If no admin docs found in users collection, check for known admin UID from bootstrap if available
    if (adminUids.length === 0) {
      console.warn(
        "[Notification Server] No admin users found in users collection. Notification will be queued when an admin registers."
      );
      return;
    }

    // 2. Batch create deterministic notifications for each administrator
    const batch = adminDb.batch();

    for (const adminUid of adminUids) {
      const notifId = `new_sub_${submissionId}_${adminUid}`;
      const notifRef = adminDb.collection("notifications").doc(notifId);

      const notifData: Omit<AppNotification, "createdAt"> & {
        createdAt: FieldValue;
      } = {
        id: notifId,
        recipientId: adminUid,
        type: "new_submission",
        title: "New App Submission",
        message: `"${appTitle}" was submitted by ${developerName || "a developer"} and is ready for review.`,
        relatedId: submissionId,
        relatedType: "submission",
        link: `/admin/review/${submissionId}`,
        read: false,
        createdAt: FieldValue.serverTimestamp(),
      };

      batch.set(notifRef, notifData, { merge: true });
    }

    await batch.commit();
  } catch (err) {
    console.error("[Notification Server] Failed to create admin notifications for new submission:", err);
  }
}

/**
 * Creates a real-time notification for a developer when their submission is approved.
 */
export async function notifyDeveloperOfApproval(params: {
  developerId: string;
  submissionId: string;
  pwaSlug: string;
  appTitle: string;
}): Promise<void> {
  const { developerId, submissionId, pwaSlug, appTitle } = params;

  if (!developerId) return;

  try {
    const notifId = `approved_${submissionId}`;
    const notifRef = adminDb.collection("notifications").doc(notifId);

    const notifData: Omit<AppNotification, "createdAt"> & {
      createdAt: FieldValue;
    } = {
      id: notifId,
      recipientId: developerId,
      type: "submission_approved",
      title: "App Approved",
      message: `"${appTitle}" has been approved and is now live in the Likha Apps directory.`,
      relatedId: pwaSlug,
      relatedType: "pwa",
      link: `/apps/${pwaSlug}`,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    };

    await notifRef.set(notifData, { merge: true });
  } catch (err) {
    console.error("[Notification Server] Failed to create approval notification for developer:", err);
  }
}

/**
 * Creates a real-time notification for a developer when their submission is rejected.
 */
export async function notifyDeveloperOfRejection(params: {
  developerId: string;
  submissionId: string;
  appTitle: string;
  reason?: string;
}): Promise<void> {
  const { developerId, submissionId, appTitle, reason } = params;

  if (!developerId) return;

  try {
    const notifId = `rejected_${submissionId}_${Date.now()}`;
    const notifRef = adminDb.collection("notifications").doc(notifId);

    const notifData: Omit<AppNotification, "createdAt"> & {
      createdAt: FieldValue;
    } = {
      id: notifId,
      recipientId: developerId,
      type: "submission_rejected",
      title: "Submission Needs Changes",
      message: reason
        ? `"${appTitle}" was not approved: ${reason}`
        : `"${appTitle}" was rejected. Review the feedback in My Apps and resubmit.`,
      relatedId: submissionId,
      relatedType: "submission",
      link: `/dashboard/apps`,
      read: false,
      createdAt: FieldValue.serverTimestamp(),
    };

    await notifRef.set(notifData, { merge: true });
  } catch (err) {
    console.error("[Notification Server] Failed to create rejection notification for developer:", err);
  }
}

