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
import { getFirestore, type Firestore } from "firebase-admin/firestore";
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
    return JSON.parse(cleaned);
  } catch {
    try {
      // Support base64-encoded service account key strings
      const decoded = Buffer.from(cleaned, "base64").toString("utf-8");
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}

export function getAdminCredentialStatus(): {
  configured: boolean;
  method: "SERVICE_ACCOUNT_KEY" | "INDIVIDUAL_KEYS" | "INVALID_FORMAT" | "NONE";
} {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const parsed = parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    return {
      configured: !!parsed,
      method: parsed ? "SERVICE_ACCOUNT_KEY" : "INVALID_FORMAT",
    };
  }
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const pk = cleanPrivateKey(process.env.FIREBASE_PRIVATE_KEY);
    const valid = pk.includes("BEGIN PRIVATE KEY") && pk.includes("END PRIVATE KEY");
    return {
      configured: valid,
      method: valid ? "INDIVIDUAL_KEYS" : "INVALID_FORMAT",
    };
  }
  return { configured: false, method: "NONE" };
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
export const adminStorage: Storage = getStorage(adminApp);
export { adminApp };
