import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Hospital, Lock, Mail, ArrowRight, AlertCircle, ShieldCheck } from 'lucide-react';

export default function HospitalLoginPage() {
  const [email, setEmail] = useState('hospital@test.com');
  const [password, setPassword] = useState('pass123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginHospital } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginHospital(email, password);
      navigate('/hospital/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid hospital credentials.');
    } finally {
      setLoading(false);
    }
  };

  const testHospitals = [
    { name: 'Primary Test Hospital', email: 'hospital@test.com', pass: 'pass123' },
    { name: 'Metropolitan General', email: 'metro.hospital@example.com', pass: 'pass123' },
    { name: 'St. Jude Emergency Trauma', email: 'stjude.hospital@example.com', pass: 'pass123' }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="text-center space-y-1.5">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 mx-auto flex items-center justify-center shadow-2xs">
            <Hospital className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hospital Portal Login</h1>
          <p className="text-xs text-slate-500">Authorized medical emergency dispatch & donor matching</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-3 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Fictional Test Account Fast Fill */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Test Hospital Accounts (Fictional SQLite Data):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {testHospitals.map(h => (
              <button
                key={h.email}
                type="button"
                onClick={() => {
                  setEmail(h.email);
                  setPassword(h.pass || 'pass123');
                }}
                className="text-[11px] px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded font-medium transition-colors cursor-pointer"
              >
                {h.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Hospital Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white"
                placeholder="hospital@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-widest shadow-sm shadow-red-100 cursor-pointer"
          >
            {loading ? 'Authenticating...' : 'Sign In to Hospital Dashboard'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-100">
          Are you a donor?{' '}
          <Link to="/donor/login" className="text-red-600 hover:underline font-bold">
            Donor Login
          </Link>
        </div>
      </div>
    </div>
  );
}
