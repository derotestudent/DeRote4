import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyANTvGAKGqFadWROYMlElR6EDxtA1XaXtk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0276070718.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0276070718",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0276070718.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "558600646882",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:558600646882:web:d6c592c2d0ad3fbfb5aebb",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4XSMGZKH1X"
};

// Initialize Firebase (singleton pattern)
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);

// Safe Analytics initialization for browser environment
export const getAnalyticsInstance = async (): Promise<Analytics | null> => {
  if (typeof window !== "undefined" && (await isSupported())) {
    return getAnalytics(app);
  }
  return null;
};
