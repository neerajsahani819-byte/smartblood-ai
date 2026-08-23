import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity, ShieldCheck, Heart, Hospital, ArrowRight,
  Zap, AlertCircle, CheckCircle2
} from 'lucide-react';
import { BloodGroupBadge } from '../components/StatusBadges.jsx';
import { useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const [selectedGroup, setSelectedGroup] = useState('O-');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login } = useAuth();

  const bloodGroups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];

  const compatibilityMap = {
    'O-': { canGiveTo: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'], canReceiveFrom: ['O-'] },
    'O+': { canGiveTo: ['O+', 'A+', 'B+', 'AB+'], canReceiveFrom: ['O-', 'O+'] },
    'A-': { canGiveTo: ['A-', 'A+', 'AB-', 'AB+'], canReceiveFrom: ['O-', 'A-'] },
    'A+': { canGiveTo: ['A+', 'AB+'], canReceiveFrom: ['O-', 'O+', 'A-', 'A+'] },
    'B-': { canGiveTo: ['B-', 'B+', 'AB-', 'AB+'], canReceiveFrom: ['O-', 'B-'] },
    'B+': { canGiveTo: ['B+', 'AB+'], canReceiveFrom: ['O-', 'O+', 'B-', 'B+'] },
    'AB-': { canGiveTo: ['AB-', 'AB+'], canReceiveFrom: ['O-', 'A-', 'B-', 'AB-'] },
    'AB+': { canGiveTo: ['AB+'], canReceiveFrom: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'] }
  };

  const currentCompat = compatibilityMap[selectedGroup] || compatibilityMap['O-'];

  // ✅ FIXED: Using Firebase Auth, NOT backend API!
  const handleDemoLogin = async (email, password, role) => {
    console.log('🔐 Login started for:', email);
    setLoading(true);
    setError('');

    try {
      console.log('📤 Calling Firebase login...');
      const result = await login(email, password);
      console.log('✅ Login successful! User:', result.email);

      // Redirect based on role
      const redirectMap = {
        hospital: '/hospital/dashboard',
        donor: '/donor/dashboard',
        admin: '/admin/dashboard'
      };

      navigate(redirectMap[role] || '/dashboard');

    } catch (err) {
      console.error('❌ Login failed:', err.code, err.message);
      setError(`Login failed: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Hero Section */}
      <section className="relative pt-12 pb-16 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-bold mb-6">
            <Activity className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            <span>Emergency Blood Donor Matching Platform</span>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              ❌ {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
                Rapid, Deterministic <span className="text-red-600 underline decoration-4 underline-offset-6">Emergency Blood</span> Matching.
              </h1>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                A connected full-stack platform designed for emergency hospital operations. Pairs deterministic medical compatibility and Haversine distance ranking with Gemini-assisted operational logistics.
              </p>

              {/* ✅ FIXED: Firebase Login Buttons */}
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  onClick={() => handleDemoLogin('hospital@test.com', 'pass123', 'hospital')}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest shadow-sm transition-colors flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  <Hospital className="w-4 h-4" />
                  <span>Login as Hospital</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDemoLogin('donor@test.com', 'pass123', 'donor')}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-lg bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs uppercase tracking-wider border border-slate-200 shadow-2xs transition-colors flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  <Heart className="w-4 h-4 text-red-600" />
                  <span>Login as Donor</span>
                </button>

                <button
                  onClick={() => handleDemoLogin('admin@test.com', 'pass123', 'admin')}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold text-xs transition-colors shrink-0 whitespace-nowrap cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Login as Admin</span>
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-xl font-bold font-mono text-slate-900">100%</div>
                  <div className="text-xs text-slate-500 font-medium">Deterministic Scoring</div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-xl font-bold font-mono text-emerald-700">Firestore</div>
                  <div className="text-xs text-slate-500 font-medium">Cloud Database</div>
                </div>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="text-xl font-bold font-mono text-indigo-700">Gemini AI</div>
                  <div className="text-xs text-slate-500 font-medium">Logistics Rationale</div>
                </div>
              </div>
            </div>

            {/* Workflow Card */}
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" />
                  Operational Pipeline
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Live
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-start gap-3 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center justify-center font-mono font-bold text-xs shrink-0">1</div>
                  <div>
                    <div className="font-bold text-slate-900">Hospital Submits Request</div>
                    <div className="text-slate-500 text-[11px]">Emergency blood group, component & units stored in Firestore.</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-start gap-3 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border border-blue-200 flex items-center justify-center font-mono font-bold text-xs shrink-0">2</div>
                  <div>
                    <div className="font-bold text-slate-900">Deterministic Engine & Proximity</div>
                    <div className="text-slate-500 text-[11px]">Weights: 50% Compatibility, 20% Distance, 20% Availability, 10% Urgency.</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-start gap-3 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center font-mono font-bold text-xs shrink-0">3</div>
                  <div>
                    <div className="font-bold text-slate-900">Gemini Operational Rationale</div>
                    <div className="text-slate-500 text-[11px]">Backend AI generates contact wave recommendations.</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200 flex items-start gap-3 shadow-2xs">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center font-mono font-bold text-xs shrink-0">4</div>
                  <div>
                    <div className="font-bold text-slate-900">Donor Notification & Live Accept</div>
                    <div className="text-slate-500 text-[11px]">Donor dashboard alerts, 1-click Accept/Decline.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blood Compatibility Section */}
      <section className="py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-200 bg-[#F8FAFC]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <h2 className="text-2xl font-bold text-slate-900">Deterministic Blood Compatibility Matrix</h2>
            <p className="text-sm text-slate-500 mt-1">
              Select a blood group to inspect deterministic red blood cell compatibility rules executed by the backend engine.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {bloodGroups.map(bg => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setSelectedGroup(bg)}
                  className={`px-3.5 py-1.5 rounded-lg font-mono text-sm font-bold border transition-all cursor-pointer ${selectedGroup === bg
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  {bg}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2.5">
                  <span className="text-red-600 font-bold">{selectedGroup}</span> Can Donate Red Cells To:
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentCompat.canGiveTo.map(g => (
                    <BloodGroupBadge key={g} bloodGroup={g} size="sm" />
                  ))}
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2.5">
                  <span className="text-red-600 font-bold">{selectedGroup}</span> Can Receive Red Cells From:
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentCompat.canReceiveFrom.map(g => (
                    <BloodGroupBadge key={g} bloodGroup={g} size="sm" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section className="py-10 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-950">
          <div className="flex items-start gap-3.5">
            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h3 className="font-bold text-amber-900 text-base">Healthcare Prototype & Medical Boundary</h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                SmartBlood AI is a proof-of-concept logistics and coordination platform. It utilizes deterministic algorithms for candidate ranking and Google Gemini for operational communication.
              </p>
              <p className="text-xs sm:text-sm text-amber-900 font-semibold leading-relaxed">
                Final donor eligibility, biological cross-matching, and blood transfusion decisions must always be confirmed by qualified healthcare professionals or an authorized blood bank before any clinical procedure.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto px-8 py-3 bg-slate-900 text-[10px] text-slate-400 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
        <div className="flex gap-6 uppercase tracking-widest">
          <span>System Status: <span className="text-green-400 font-bold">Operational</span></span>
          <span>Backend: <span className="text-white font-medium">Firebase / Express</span></span>
          <span>AI: <span className="text-white font-medium">Gemini 3.7 Flash</span></span>
        </div>
        <div className="text-center sm:text-right italic max-w-lg">
          SmartBlood AI is a prototype platform. Final compatibility and donation decisions must be confirmed by authorized medical professionals or blood banks.
        </div>
      </footer>
    </div>
  );
}