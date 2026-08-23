// src/firebase/config.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getAnalytics, Analytics } from 'firebase/analytics';

const getEnv = (key: string): string => {
  if (typeof import.meta !== 'undefined' && (import.meta as any).env && (import.meta as any).env[key]) {
    return (import.meta as any).env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key] as string;
  }
  return '';
};

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || 'AIzaSyAG9vkc2-Eu4sCdkI7yLJSWYHewqyYuWq4',
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'smartblood-ai.firebaseapp.com',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || 'smartblood-ai',
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || 'smartblood-ai.firebasestorage.app',
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || '931805057850',
  appId: getEnv('VITE_FIREBASE_APP_ID') || '1:931805057850:web:65e5b35f1007afdc547603',
  measurementId: getEnv('VITE_FIREBASE_MEASUREMENT_ID') || 'G-1LC8NTEWL9'
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  try {
    analytics = getAnalytics(app);
  } catch (e) {}
}

// Initialize services
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);

// Authentication functions
export const loginWithEmail = (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const logoutUser = () => {
  return signOut(auth);
};

export const authObserver = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

export default app;
