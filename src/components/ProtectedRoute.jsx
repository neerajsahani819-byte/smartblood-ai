// src/components/ProtectedRoute.jsx
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { isTokenValid } from '../utils/authHelpers.js';
import { auth } from '../firebase/config.js';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, role, logout, verifyTokenAndRefresh } = useAuth();
  const [tokenChecking, setTokenChecking] = useState(true);
  const [isSessionValid, setIsSessionValid] = useState(true);
  const location = useLocation();

  const userRole = role || user?.role;

  // Active token and session validation before route resolution
  useEffect(() => {
    let isMounted = true;

    const validateSession = async () => {
      if (!user) {
        if (isMounted) setTokenChecking(false);
        return;
      }

      try {
        const valid = await isTokenValid(auth.currentUser);
        if (!valid) {
          // Attempt a soft refresh before deciding to drop session
          await verifyTokenAndRefresh();
          const recheck = await isTokenValid(auth.currentUser);
          if (!recheck && isMounted) {
            console.warn('ProtectedRoute: Invalid session token. Logging out...');
            setIsSessionValid(false);
            await logout();
          }
        }
      } catch (err) {
        console.error('Session validation error in ProtectedRoute:', err);
        if (isMounted) setIsSessionValid(false);
      } finally {
        if (isMounted) setTokenChecking(false);
      }
    };

    validateSession();

    return () => {
      isMounted = false;
    };
  }, [user, location.pathname, logout, verifyTokenAndRefresh]);

  // Show loading spinner while checking auth or validating token
  if (loading || tokenChecking) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] bg-[#F8FAFC]">
        <div className="text-center p-8 bg-white rounded-2xl border border-slate-200 shadow-sm max-w-xs w-full">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-red-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-slate-700 font-semibold">Verifying Secure Access...</p>
          <p className="mt-1 text-xs text-slate-400">Validating credentials & permissions</p>
        </div>
      </div>
    );
  }

  // If not logged in or session invalid, redirect to role-specific login
  if (!user || !isSessionValid) {
    if (allowedRoles.includes('hospital')) return <Navigate to="/hospital/login" replace state={{ from: location }} />;
    if (allowedRoles.includes('donor')) return <Navigate to="/donor/login" replace state={{ from: location }} />;
    if (allowedRoles.includes('admin')) return <Navigate to="/admin/login" replace state={{ from: location }} />;
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Role authorization check
  if (allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
    console.warn(`Unauthorized role access: Required [${allowedRoles}], current: [${userRole}]`);
    return <Navigate to="/dashboard" replace />;
  }

  // Render children when authenticated and authorized
  return children;
};

export default ProtectedRoute;
