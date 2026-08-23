// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import DisclaimerBanner from './components/DisclaimerBanner.jsx';
import { Toaster } from 'react-hot-toast';

// Pages
import LandingPage from './pages/LandingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import HospitalLoginPage from './pages/HospitalLoginPage.jsx';
import HospitalDashboardPage from './pages/HospitalDashboardPage.jsx';
import CreateRequestPage from './pages/CreateRequestPage.jsx';
import RequestDetailsPage from './pages/RequestDetailsPage.jsx';
import DonorLoginPage from './pages/DonorLoginPage.jsx';
import DonorRegisterPage from './pages/DonorRegisterPage.jsx';
import DonorDashboardPage from './pages/DonorDashboardPage.jsx';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';

// Dynamic Dashboard Resolver based on user role
function DashboardRedirect() {
  const { user, role } = useAuth();
  const currentRole = role || user?.role;

  if (currentRole === 'hospital') {
    return <Navigate to="/hospital/dashboard" replace />;
  }
  if (currentRole === 'admin') {
    return <Navigate to="/admin/dashboard" replace />;
  }
  return <Navigate to="/donor/dashboard" replace />;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-red-100 selection:text-red-900">
          <Toaster position="top-right" />
          <DisclaimerBanner />
          <Navbar />
          <main className="flex-1 flex flex-col">
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/hospital/login" element={<HospitalLoginPage />} />
              <Route path="/donor/login" element={<DonorLoginPage />} />
              <Route path="/donor/register" element={<DonorRegisterPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />

              {/* Universal /dashboard route with automatic role-based redirect */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['hospital', 'donor', 'admin']}>
                    <DashboardRedirect />
                  </ProtectedRoute>
                }
              />

              {/* Hospital Protected Routes */}
              <Route
                path="/hospital/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['hospital', 'admin']}>
                    <HospitalDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/request/new"
                element={
                  <ProtectedRoute allowedRoles={['hospital', 'admin']}>
                    <CreateRequestPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/requests/new"
                element={
                  <ProtectedRoute allowedRoles={['hospital', 'admin']}>
                    <CreateRequestPage />
                  </ProtectedRoute>
                }
              />

              {/* Shared Emergency Request View */}
              <Route
                path="/requests/:id"
                element={
                  <ProtectedRoute allowedRoles={['hospital', 'donor', 'admin']}>
                    <RequestDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospital/requests/:id"
                element={
                  <ProtectedRoute allowedRoles={['hospital', 'donor', 'admin']}>
                    <RequestDetailsPage />
                  </ProtectedRoute>
                }
              />

              {/* Donor Protected Routes */}
              <Route
                path="/donor/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['donor', 'admin']}>
                    <DonorDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Admin Protected Routes */}
              <Route
                path="/admin/dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;