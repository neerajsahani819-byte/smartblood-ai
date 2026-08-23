// src/utils/authHelpers.js
import { auth } from '../firebase/config.js';
import { getIdToken, getIdTokenResult } from 'firebase/auth';

/**
 * Checks if the current Firebase user token is still valid.
 * @param {import('firebase/auth').User|null} user 
 * @returns {Promise<boolean>}
 */
export const isTokenValid = async (user = null) => {
  const currentUser = user || auth.currentUser;
  if (!currentUser) return false;

  try {
    const tokenResult = await getIdTokenResult(currentUser, false);
    const expirationTime = new Date(tokenResult.expirationTime).getTime();
    const now = Date.now();
    
    // Valid if expiration is more than 60 seconds in the future
    return expirationTime > now + 60000;
  } catch (error) {
    console.warn('Token validation error:', error.message);
    return false;
  }
};

/**
 * Retrieves the current authenticated user and ensures a fresh token.
 * @param {boolean} forceRefresh 
 * @returns {Promise<{user: import('firebase/auth').User|null, token: string|null, valid: boolean}>}
 */
export const getCurrentUser = async (forceRefresh = false) => {
  const user = auth.currentUser;
  if (!user) {
    return { user: null, token: null, valid: false };
  }

  try {
    const token = await getIdToken(user, forceRefresh);
    return { user, token, valid: !!token };
  } catch (error) {
    console.error('Error fetching current user token:', error);
    return { user: null, token: null, valid: false, error };
  }
};

/**
 * Normalizes and formats Firebase Authentication errors into actionable messages.
 * @param {Error|any} error 
 * @returns {{code: string, message: string, shouldLogout: boolean, isNetworkError: boolean}}
 */
export const handleAuthError = (error) => {
  if (!error) {
    return { code: 'unknown', message: 'An unknown error occurred.', shouldLogout: false, isNetworkError: false };
  }

  const code = error.code || error.message || '';
  let message = 'Authentication failed. Please check your credentials.';
  let shouldLogout = false;
  let isNetworkError = false;

  if (code.includes('auth/invalid-credential') || code.includes('invalid-credential')) {
    message = 'Invalid email or password. Please verify your credentials and try again.';
    shouldLogout = true;
  } else if (code.includes('auth/user-not-found')) {
    message = 'No account found with this email address.';
    shouldLogout = true;
  } else if (code.includes('auth/wrong-password')) {
    message = 'Incorrect password. Please try again.';
  } else if (code.includes('auth/user-disabled')) {
    message = 'This account has been disabled. Please contact system support.';
    shouldLogout = true;
  } else if (code.includes('auth/user-token-expired') || code.includes('auth/id-token-expired')) {
    message = 'Your session has expired. Please log in again.';
    shouldLogout = true;
  } else if (code.includes('auth/network-request-failed')) {
    message = 'Network connection issue. Please check your internet connection.';
    isNetworkError = true;
  } else if (code.includes('auth/too-many-requests')) {
    message = 'Access temporarily restricted due to many failed attempts. Try again in a few moments.';
  } else if (error.message) {
    message = error.message;
  }

  return {
    code,
    message,
    shouldLogout,
    isNetworkError
  };
};

/**
 * Clears local session caches.
 */
export const clearAuthSession = () => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('sb_auth_token');
      localStorage.removeItem('sb_user_role');
    }
  } catch (e) {
    console.warn('Session clear note:', e);
  }
};

export default {
  isTokenValid,
  getCurrentUser,
  handleAuthError,
  clearAuthSession
};
