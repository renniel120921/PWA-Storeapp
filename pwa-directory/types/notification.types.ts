import type { TimestampValue } from "./auth.types";

/**
 * Valid notification event types.
 */
export type NotificationType =
  | "new_submission"
  | "submission_approved"
  | "submission_rejected";

export type NotificationRelatedType = "submission" | "pwa";

/**
 * Real-time notification document stored in Firestore (`notifications/{notificationId}`).
 */
export interface AppNotification {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedId: string;
  relatedType: NotificationRelatedType;
  link?: string;
  read: boolean;
  createdAt: TimestampValue;
}

