import "server-only";
import { getApps, getApp, initializeApp, cert, type App, type AppOptions } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage, type Storage } from "firebase-admin/storage";

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
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      options = {
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId,
        storageBucket,
      };
    } catch (err) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", err);
    }
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
      options = {
        credential: cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
        projectId,
        storageBucket,
      };
    } catch (err) {
      console.error("Failed to parse individual Firebase Admin keys:", err);
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
