// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  auth,
  db,
  loginWithEmail,
  logoutUser,
  authObserver,
  refreshToken,
  setupTokenRefreshInterval
} from '../firebase/config.js';
import { doc, getDoc } from 'firebase/firestore';
import { isTokenValid, handleAuthError, clearAuthSession } from '../utils/authHelpers.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Helper to infer role from email if Firestore doc is not yet created
  const inferRoleFromEmail = (email = '') => {
    const lower = email.toLowerCase();
    if (lower.includes('hospital')) return 'hospital';
    if (lower.includes('admin')) return 'admin';
    return 'donor';
  };

  // Build full normalized user profile
  const buildUserProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) return null;

    let role = inferRoleFromEmail(firebaseUser.email);
    let userData = {};

    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      if (userDoc.exists()) {
        userData = userDoc.data();
        if (userData.role) role = userData.role;
      }
    } catch (e) {
      console.warn('Firestore user fetch note:', e.message);
    }

    return {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || userData.displayName || firebaseUser.email?.split('@')[0],
      name: firebaseUser.displayName || userData.name || firebaseUser.email?.split('@')[0],
      role,
      hospital_id: userData.hospital_id || (role === 'hospital' ? 1 : null),
      donor_id: userData.donor_id || (role === 'donor' ? 1 : null),
      blood_group: userData.blood_group || 'O-',
      ...userData
    };
  }, []);

  // Primary logout handler
  const logout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.warn('Logout note:', error.message);
    } finally {
      clearAuthSession();
      setUser(null);
      setAuthError(null);
    }
  }, []);

  // Check token validity and auto-refresh or logout if invalid
  const verifyTokenAndRefresh = useCallback(async () => {
    if (!auth.currentUser) return;

    try {
      const valid = await isTokenValid(auth.currentUser);
      if (!valid) {
        console.log('🔄 Token close to expiration, refreshing token...');
        const freshToken = await refreshToken(true);
        if (!freshToken) {
          console.warn('⚠️ Token refresh returned null. Logging out stale session.');
          await logout();
        }
      }
    } catch (err) {
      const formatted = handleAuthError(err);
      console.error('Session verification error:', formatted.message);
      if (formatted.shouldLogout) {
        await logout();
      }
    }
  }, [logout]);

  // Listen to Auth State Changes & initialize background token refresh
  useEffect(() => {
    // 1. Setup 10-minute auto-refresh interval
    const stopRefreshInterval = setupTokenRefreshInterval();

    // 2. Setup auth state listener
    const unsubscribeAuth = authObserver(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const fullProfile = await buildUserProfile(firebaseUser);
          setUser(fullProfile);
          setAuthError(null);
          // Verify & ensure token freshness on initial load
          await refreshToken(false);
        } catch (err) {
          const formatted = handleAuthError(err);
          setAuthError(formatted.message);
          if (formatted.shouldLogout) {
            await logout();
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // 3. Re-verify token on window focus / tab reactivation
    const handleFocus = () => {
      verifyTokenAndRefresh();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus);
      window.addEventListener('online', handleFocus);
    }

    return () => {
      stopRefreshInterval();
      unsubscribeAuth();
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('online', handleFocus);
      }
    };
  }, [buildUserProfile, logout, verifyTokenAndRefresh]);

  // Primary Login function via Firebase Auth
  const login = async (email, password) => {
    try {
      setLoading(true);
      setAuthError(null);

      const userCredential = await loginWithEmail(email, password);
      const firebaseUser = userCredential.user;

      // Force fresh token upon login
      await refreshToken(true);

      const fullUser = await buildUserProfile(firebaseUser);
      setUser(fullUser);
      return fullUser;
    } catch (error) {
      const formatted = handleAuthError(error);
      setAuthError(formatted.message);
      console.error('Login authentication error:', formatted.message);
      throw new Error(formatted.message);
    } finally {
      setLoading(false);
    }
  };

  // Portal specific login helpers
  const loginHospital = (email, password) => login(email, password);
  const loginDonor = (email, password) => login(email, password);
  const loginAdmin = (email, password) => login(email, password);

  const updateUser = (updatedFields) => {
    setUser((prev) => (prev ? { ...prev, ...updatedFields } : null));
  };

  const value = {
    user,
    role: user?.role || null,
    loading,
    authError,
    login,
    loginHospital,
    loginDonor,
    loginAdmin,
    logout,
    refreshToken,
    verifyTokenAndRefresh,
    updateUser,
    isAuthenticated: !!user,
    isHospital: user?.role === 'hospital',
    isDonor: user?.role === 'donor',
    isAdmin: user?.role === 'admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;