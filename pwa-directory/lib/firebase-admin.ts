import "server-only";
import {
  getApps,
  getApp,
  initializeApp,
  cert,
  type App,
  type AppOptions,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, FieldValue, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

function cleanPrivateKey(key: string): string {
  let cleaned = key.trim();
  // Strip enclosing single or double quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  // Convert literal escaped newlines into real newlines
  cleaned = cleaned.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  return cleaned;
}

function parseServiceAccountJson(raw: string): Record<string, unknown> | null {
  let cleaned = raw.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.private_key === "string") {
        parsed.private_key = cleanPrivateKey(parsed.private_key);
      }
      return parsed;
    }
  } catch {
    try {
      const decoded = Buffer.from(cleaned, "base64").toString("utf-8");
      const parsed = JSON.parse(decoded);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.private_key === "string") {
          parsed.private_key = cleanPrivateKey(parsed.private_key);
        }
        return parsed;
      }
    } catch {
      return null;
    }
  }
  return null;
}

export function getAdminCredentialStatus(): {
  configured: boolean;
  classification:
    | "CONFIGURED_SERVICE_ACCOUNT_KEY"
    | "CONFIGURED_INDIVIDUAL_KEYS"
    | "ADMIN_CREDENTIALS_MISSING"
    | "ADMIN_CREDENTIALS_INVALID";
  diagnostic: string;
} {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const parsed = parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (parsed && typeof parsed.client_email === "string" && typeof parsed.private_key === "string") {
      return {
        configured: true,
        classification: "CONFIGURED_SERVICE_ACCOUNT_KEY",
        diagnostic: "Service account JSON parsed successfully.",
      };
    }
    return {
      configured: false,
      classification: "ADMIN_CREDENTIALS_INVALID",
      diagnostic: "FIREBASE_SERVICE_ACCOUNT_KEY is present but could not be parsed as valid JSON/Base64 service account.",
    };
  }

  if (process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_PRIVATE_KEY) {
    const email = (process.env.FIREBASE_CLIENT_EMAIL || "").trim();
    const pk = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY || "");
    const emailValid = email.includes("@");
    const pkValid = pk.includes("BEGIN PRIVATE KEY") && pk.includes("END PRIVATE KEY");

    if (emailValid && pkValid) {
      return {
        configured: true,
        classification: "CONFIGURED_INDIVIDUAL_KEYS",
        diagnostic: "Individual client email and PEM private key verified.",
      };
    }
    return {
      configured: false,
      classification: "ADMIN_CREDENTIALS_INVALID",
      diagnostic: `Individual keys incomplete: emailValid=${emailValid}, pkPemValid=${pkValid}.`,
    };
  }

  return {
    configured: false,
    classification: "ADMIN_CREDENTIALS_MISSING",
    diagnostic: "No Firebase Admin environment variables detected on server.",
  };
}

let adminApp: App;

if (!getApps().length) {
  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    "pwa-directory-a0263";
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  let options: AppOptions = {
    projectId,
    storageBucket,
  };

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (serviceAccount) {
      options = {
        credential: cert(serviceAccount),
        projectId: (serviceAccount.project_id as string) || projectId,
        storageBucket,
      };
    } else {
      console.error("[Firebase Admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY (invalid JSON/base64).");
    }
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const privateKey = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL.trim();

      if (privateKey.includes("BEGIN PRIVATE KEY")) {
        options = {
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
          projectId,
          storageBucket,
        };
      } else {
        console.error("[Firebase Admin] FIREBASE_PRIVATE_KEY is missing standard PEM header.");
      }
    } catch (err) {
      console.error("[Firebase Admin] Failed to parse individual Firebase Admin keys:", err);
    }
  }

  adminApp = initializeApp(options);
} else {
  adminApp = getApp();
}

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
try {
  adminDb.settings({ ignoreUndefinedProperties: true });
} catch {
  // Ignore if settings already locked
}
export const adminStorage: Storage = getStorage(adminApp);
export { FieldValue, adminApp };
