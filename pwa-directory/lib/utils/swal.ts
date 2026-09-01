import Swal from "sweetalert2";

// Likha Apps Brand Tokens for SweetAlert2
const CARD = "#FFFFFF";
const INK = "#122A2C";
const CORAL = "#FF6A4D";
const ROSE = "#E11D48";
const BODY_DIM = "#7A8480";

const defaultCustomClass = {
  popup: "rounded-xl font-sans border border-[#DBD5C3]",
  title: "font-serif text-[#122A2C]",
  confirmButton: "rounded-md font-mono text-xs px-4 py-2 font-medium shadow-none",
  cancelButton: "rounded-md font-mono text-xs px-4 py-2 font-medium shadow-none",
};

/**
 * Converts raw or API errors into clear, friendly user-facing messages.
 */
export function formatUserFriendlyError(err: unknown): string {
  if (!err) return "An unexpected error occurred. Please try again.";

  const message = typeof err === "string" ? err : err instanceof Error ? err.message : String(err);

  if (
    message.includes("401") ||
    message.includes("Bearer token") ||
    message.includes("Authentication required") ||
    message.includes("Invalid or expired") ||
    message.includes("auth/user-token-expired")
  ) {
    return "Your session has expired. Please log in again.";
  }

  if (
    message.includes("403") ||
    message.includes("Forbidden") ||
    message.includes("Administrator role required") ||
    message.includes("not authorized") ||
    message.includes("Unauthorized")
  ) {
    return "You don't have permission to perform this action.";
  }

  if (
    message.includes("409") ||
    message.includes("Conflict") ||
    message.includes("already exists") ||
    message.includes("already been processed") ||
    message.includes("Only 'pending'")
  ) {
    return "This item has already been processed or status changed concurrently.";
  }

  if (
    message.includes("500") ||
    message.includes("Internal server error") ||
    message.includes("Database transaction failed") ||
    message.includes("Server configuration error")
  ) {
    return "Something went wrong on the server. Please try again in a moment.";
  }

  if (message.includes("Failed to fetch") || message.includes("Network") || message.includes("NetworkError")) {
    return "Network connection issue. Please check your internet connection and try again.";
  }

  return message;
}

/**
 * Displays a non-intrusive success notification.
 */
export async function showSuccessAlert(options: {
  title?: string;
  text?: string;
  timer?: number;
}): Promise<void> {
  await Swal.fire({
    icon: "success",
    title: options.title || "Success!",
    text: options.text,
    timer: options.timer ?? 2000,
    timerProgressBar: true,
    showConfirmButton: false,
    background: CARD,
    color: INK,
    customClass: defaultCustomClass,
  });
}

/**
 * Displays a user-friendly error dialog.
 */
export async function showErrorAlert(options: {
  title?: string;
  text?: string;
  error?: unknown;
}): Promise<void> {
  const message = options.text || (options.error ? formatUserFriendlyError(options.error) : "An unexpected error occurred.");
  await Swal.fire({
    icon: "error",
    title: options.title || "Something went wrong",
    text: message,
    confirmButtonText: "Close",
    confirmButtonColor: CORAL,
    background: CARD,
    color: INK,
    customClass: defaultCustomClass,
  });
}

/**
 * Displays an informational alert dialog.
 */
export async function showInfoAlert(options: {
  title: string;
  text: string;
}): Promise<void> {
  await Swal.fire({
    icon: "info",
    title: options.title,
    text: options.text,
    confirmButtonText: "Close",
    confirmButtonColor: INK,
    background: CARD,
    color: INK,
    customClass: defaultCustomClass,
  });
}

/**
 * Displays a confirmation dialog (standard or destructive).
 * Resolves to `true` if confirmed, `false` if cancelled.
 */
export async function showConfirmDialog(options: {
  title: string;
  text: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  icon?: "warning" | "question" | "info";
}): Promise<boolean> {
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    icon: options.icon ?? "warning",
    showCancelButton: true,
    confirmButtonText: options.confirmText || (options.isDestructive ? "Delete" : "Confirm"),
    cancelButtonText: options.cancelText || "Cancel",
    confirmButtonColor: options.isDestructive ? ROSE : CORAL,
    cancelButtonColor: BODY_DIM,
    background: CARD,
    color: INK,
    customClass: defaultCustomClass,
  });

  return result.isConfirmed;
}

/**
 * Displays a prompt dialog with textarea for required feedback (e.g. rejection reason).
 * Resolves to the entered string if confirmed, or `null` if cancelled.
 */
export async function showPromptDialog(options: {
  title: string;
  text: string;
  inputPlaceholder: string;
  confirmText?: string;
  cancelText?: string;
  minLength?: number;
  isDestructive?: boolean;
}): Promise<string | null> {
  const min = options.minLength ?? 5;
  const result = await Swal.fire({
    title: options.title,
    text: options.text,
    input: "textarea",
    inputPlaceholder: options.inputPlaceholder,
    showCancelButton: true,
    confirmButtonText: options.confirmText || "Submit Reason",
    cancelButtonText: options.cancelText || "Cancel",
    confirmButtonColor: options.isDestructive ? ROSE : CORAL,
    cancelButtonColor: BODY_DIM,
    background: CARD,
    color: INK,
    customClass: defaultCustomClass,
    inputValidator: (value) => {
      if (!value || value.trim().length < min) {
        return `Please provide a reason with at least ${min} characters.`;
      }
      return null;
    },
  });

  if (result.isConfirmed && typeof result.value === "string") {
    return result.value.trim();
  }

  return null;
}

/**
 * Shows an active processing loading modal.
 */
export function showLoadingAlert(options?: {
  title?: string;
  text?: string;
}): void {
  Swal.fire({
    title: options?.title || "Processing...",
    text: options?.text || "Please wait while we complete this action.",
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    background: CARD,
    color: INK,
    customClass: defaultCustomClass,
    didOpen: () => {
      Swal.showLoading();
    },
  });
}

/**
 * Closes any active SweetAlert dialog.
 */
export function closeAlert(): void {
  Swal.close();
}

