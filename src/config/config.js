// src/config/config.js
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getIdToken,
  getIdTokenResult
} from 'firebase/auth';

const getEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return '';
};

// Web app's Firebase configuration
const firebaseConfig = {
  apiKey: getEnv('VITE_FIREBASE_API_KEY') || 'AIzaSyAG9vkc2-Eu4sCdkI7yLJSWYHewqyYuWq4',
  authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'smartblood-ai.firebaseapp.com',
  projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || 'smartblood-ai',
  storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || 'smartblood-ai.firebasestorage.app',
  messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || '931805057850',
  appId: getEnv('VITE_FIREBASE_APP_ID') || '1:931805057850:web:65e5b35f1007afdc547603'
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with network handling
const db = getFirestore(app);

// Enable network and gracefully handle connection issues
enableNetwork(db).catch((err) => {
  console.warn('⚠️ Firestore network enable note:', err.message);
});

// Setup network reconnection listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('🌐 Network online: re-enabling Firestore...');
    enableNetwork(db).catch((err) => {
      console.warn('Network reconnection note:', err.message);
    });
  });

  window.addEventListener('offline', () => {
    console.log('📡 Network offline: Firestore caching enabled.');
  });
}

// Initialize Firebase Auth
const auth = getAuth(app);

// Authentication Functions
export const loginWithEmail = async (email, password) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  // Pre-fetch a fresh token on successful login
  try {
    await getIdToken(userCredential.user, true);
  } catch (e) {
    console.warn('Post-login token fetch note:', e.message);
  }
  return userCredential;
};

export const logoutUser = () => {
  return signOut(auth);
};

export const authObserver = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Refreshes the active Firebase user ID token.
 * @param {boolean} forceRefresh 
 * @returns {Promise<string|null>} Fresh token string or null on failure
 */
export const refreshToken = async (forceRefresh = true) => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const token = await getIdToken(user, forceRefresh);
    return token;
  } catch (error) {
    console.error('Firebase token refresh failed:', error.message);
    return null;
  }
};

/**
 * Starts a background timer that auto-refreshes the token every 10 minutes.
 * @returns {() => void} Cleanup function to stop interval
 */
export const setupTokenRefreshInterval = () => {
  if (typeof window === 'undefined') return () => {};

  const intervalId = setInterval(async () => {
    if (auth.currentUser) {
      try {
        await refreshToken(true);
        console.debug('🔄 Background Firebase token auto-refreshed (10m interval)');
      } catch (err) {
        console.warn('Token auto-refresh interval note:', err.message);
      }
    }
  }, 10 * 60 * 1000); // 10 minutes

  return () => clearInterval(intervalId);
};

export { db, auth, app, getIdToken, getIdTokenResult };
export default app;