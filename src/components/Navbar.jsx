import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Activity, Bell, User, LogOut, ChevronDown, CheckCircle, Hospital, Heart, Shield, Menu, X } from 'lucide-react';

export default function Navbar() {
  const { user, role, logout, loginHospital, loginDonor, loginAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showQuickSwitch, setShowQuickSwitch] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [switchLoading, setSwitchLoading] = useState(false);

  const handleQuickLogin = async (type, email, pass) => {
    try {
      setSwitchLoading(true);
      if (type === 'hospital') {
        await loginHospital(email, pass);
        navigate('/hospital/dashboard');
      } else if (type === 'donor') {
        await loginDonor(email, pass);
        navigate('/donor/dashboard');
      } else if (type === 'admin') {
        await loginAdmin(email, pass);
        navigate('/admin/dashboard');
      }
      setShowQuickSwitch(false);
      setShowMobileNav(false);
    } catch (err) {
      console.error('Quick login failed:', err);
    } finally {
      setSwitchLoading(false);
    }
  };

  const navItems = [
    { label: 'Overview', path: '/' },
    { label: 'Hospital Portal', path: user && role === 'hospital' ? '/hospital/dashboard' : '/hospital/login' },
    { label: 'Donor Portal', path: user && role === 'donor' ? '/donor/dashboard' : '/donor/login' },
    { label: 'Admin Hub', path: user && role === 'admin' ? '/admin/dashboard' : '/admin/login' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-900 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMobileNav(!showMobileNav)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 md:hidden cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {showMobileNav ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2.5 text-slate-900 font-bold tracking-tight text-lg shrink-0">
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center shadow-xs">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <span className="uppercase tracking-tight font-extrabold text-slate-800 text-base">
              SmartBlood <span className="text-red-600 underline decoration-2 underline-offset-4">AI</span>
            </span>
          </Link>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5">
          {navItems.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-bold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Quick Fictional Account Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowQuickSwitch(!showQuickSwitch)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 border border-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="Switch Fictional Test Account"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="hidden sm:inline">Test Personas</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showQuickSwitch && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-2 text-xs">
                <div className="px-2 py-1.5 font-bold text-slate-400 border-b border-slate-100 uppercase tracking-wider text-[10px]">
                  1-Click Test Personas (Fictional SQLite Data)
                </div>

                <div className="py-1 space-y-1">
                  <div className="px-2 pt-1 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Hospitals:</div>
                  <button
                    disabled={switchLoading}
                    onClick={() => handleQuickLogin('hospital', 'metro.hospital@example.com', 'password123')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex justify-between items-center text-slate-700 cursor-pointer"
                  >
                    <span className="truncate font-medium">Metro General Hospital</span>
                    <span className="text-[10px] text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded font-bold">HOSP</span>
                  </button>
                  <button
                    disabled={switchLoading}
                    onClick={() => handleQuickLogin('hospital', 'stjude.hospital@example.com', 'password123')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex justify-between items-center text-slate-700 cursor-pointer"
                  >
                    <span className="truncate font-medium">St. Jude Trauma Center</span>
                    <span className="text-[10px] text-red-600 bg-red-50 border border-red-100 px-1.5 py-0.5 rounded font-bold">HOSP</span>
                  </button>

                  <div className="px-2 pt-2 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Donors:</div>
                  <button
                    disabled={switchLoading}
                    onClick={() => handleQuickLogin('donor', 'john.donor@example.com', 'password123')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex justify-between items-center text-slate-700 cursor-pointer"
                  >
                    <span className="truncate font-medium">John Doe (O- Universal)</span>
                    <span className="text-[10px] font-mono font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">O-</span>
                  </button>
                  <button
                    disabled={switchLoading}
                    onClick={() => handleQuickLogin('donor', 'sarah.donor@example.com', 'password123')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex justify-between items-center text-slate-700 cursor-pointer"
                  >
                    <span className="truncate font-medium">Sarah Jenkins (O+)</span>
                    <span className="text-[10px] font-mono font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">O+</span>
                  </button>

                  <div className="px-2 pt-2 text-[11px] font-bold text-slate-400 uppercase tracking-wide">Administration:</div>
                  <button
                    disabled={switchLoading}
                    onClick={() => handleQuickLogin('admin', 'admin@smartblood.ai', 'admin123')}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex justify-between items-center text-slate-700 cursor-pointer"
                  >
                    <span className="truncate font-medium">System Administrator</span>
                    <span className="text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200 font-bold">ADMIN</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {user ? (
            <div className="flex items-center gap-2.5">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{user.name}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
                  {role} {user.blood_group ? `• ${user.blood_group}` : ''}
                </span>
              </div>

              {role === 'donor' && (
                <Link
                  to="/donor/dashboard"
                  className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors relative"
                  title="Donor Notifications"
                >
                  <Bell className="w-4 h-4" />
                </Link>
              )}

              <button
                type="button"
                onClick={logout}
                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-600 border border-slate-200 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline whitespace-nowrap">Sign Out</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs sm:text-sm shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Drawer */}
      {showMobileNav && (
        <div className="md:hidden bg-white border-t border-slate-200 px-4 py-3 space-y-2">
          {navItems.map(item => (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => setShowMobileNav(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
