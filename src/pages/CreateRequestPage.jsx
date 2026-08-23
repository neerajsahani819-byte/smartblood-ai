// src/pages/CreateRequestPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../firebase/config.js';
import { collection, addDoc } from 'firebase/firestore';
import { runFirestoreMatching } from '../utils/matchingLogic.js';
import { PlusCircle, Activity, AlertTriangle, MapPin, ArrowLeft, ArrowRight, ShieldAlert } from 'lucide-react';
import DisclaimerBanner from '../components/DisclaimerBanner.jsx';

export default function CreateRequestPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    blood_group: 'O-',
    component: 'Whole Blood',
    units_required: 2,
    urgency: 'CRITICAL',
    location_lat: user?.location_lat || 40.7306,
    location_lng: user?.location_lng || -73.9352,
    location_preset: 'Metropolitan General (40.7306, -73.9352)',
    notes: 'Urgent emergency transfusion required for trauma resuscitation in emergency ward.'
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const bloodGroups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  const components = [
    'Whole Blood',
    'Packed Red Blood Cells',
    'Platelets',
    'Fresh Frozen Plasma',
    'Cryoprecipitate'
  ];
  const urgencyLevels = [
    { level: 'CRITICAL', desc: 'Life-threatening / immediate dispatch required (within 30m)' },
    { level: 'HIGH', desc: 'Urgent surgery / emergency stabilization (within 1-2h)' },
    { level: 'MEDIUM', desc: 'Scheduled urgent procedure (within 4-6h)' },
    { level: 'LOW', desc: 'Elective replenishment / standby reserve' }
  ];

  const locationPresets = [
    { label: 'Metropolitan General (Manhattan)', lat: 40.7306, lng: -73.9352 },
    { label: 'St. Jude Trauma Center (Midtown)', lat: 40.7589, lng: -73.9851 },
    { label: 'City Trauma & Surgical (Downtown)', lat: 40.7128, lng: -74.0060 }
  ];

  const handleLocationPresetChange = (preset) => {
    setFormData(prev => ({
      ...prev,
      location_preset: preset.label,
      location_lat: preset.lat,
      location_lng: preset.lng
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.blood_group || !formData.units_required) {
      setError('Please provide blood group and units required.');
      return;
    }

    setLoading(true);
    try {
      const requestPayload = {
        hospital_id: user?.hospital_id || user?.id || user?.uid || 'hosp_1',
        hospitalId: user?.hospital_id || user?.id || user?.uid || 'hosp_1',
        hospital_name: user?.displayName || user?.name || 'Metropolitan General Hospital',
        hospital_address: '100 Hospital Way, Manhattan',
        blood_group: formData.blood_group,
        bloodGroup: formData.blood_group,
        component: formData.component,
        componentType: formData.component,
        units_required: parseInt(formData.units_required, 10),
        unitsNeeded: parseInt(formData.units_required, 10),
        urgency: formData.urgency,
        location_lat: formData.location_lat,
        location_lng: formData.location_lng,
        location: `${formData.location_lat}, ${formData.location_lng}`,
        notes: formData.notes,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      // 1. Add Document directly to Firestore 'emergency_requests' collection
      const docRef = await addDoc(collection(db, 'emergency_requests'), requestPayload);

      // 2. Pre-compute and populate matches in Firestore
      try {
        await runFirestoreMatching(docRef.id, requestPayload);
      } catch (matchErr) {
        console.warn('Initial match calculation note:', matchErr.message);
      }

      // 3. Navigate to Request Details Page
      navigate(`/requests/${String(docRef.id)}`);
    } catch (err) {
      console.error('Firestore create request error:', err);
      setError(err.message || 'Failed to create emergency request in Firestore.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        <Link
          to="/hospital/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Hospital Dashboard
        </Link>

        <DisclaimerBanner compact />

        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 shadow-2xs">
                <PlusCircle className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Create Emergency Blood Request</h1>
                <p className="text-xs text-slate-500">
                  Submitting directly saves to Cloud Firestore and triggers deterministic candidate scoring.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Blood Group Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Required Blood Group *</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {bloodGroups.map(bg => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setFormData({ ...formData, blood_group: bg })}
                    className={`py-2.5 px-2 rounded-xl font-mono font-bold text-sm border transition-all cursor-pointer text-center ${
                      formData.blood_group === bg
                        ? 'bg-red-600 text-white border-red-600 shadow-sm scale-105'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            {/* Component & Units Required */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Blood Component *</label>
                <select
                  value={formData.component}
                  onChange={e => setFormData({ ...formData, component: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-medium focus:outline-none focus:border-red-600 focus:bg-white"
                >
                  {components.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Units Required *</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={formData.units_required}
                    onChange={e => setFormData({ ...formData, units_required: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono font-bold focus:outline-none focus:border-red-600 focus:bg-white"
                  />
                  <span className="text-xs text-slate-500 whitespace-nowrap">Units (450ml / unit)</span>
                </div>
              </div>
            </div>

            {/* Urgency Level */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Urgency Level *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {urgencyLevels.map(({ level, desc }) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setFormData({ ...formData, urgency: level })}
                    className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      formData.urgency === level
                        ? 'bg-red-50/70 border-red-500 ring-1 ring-red-500 text-slate-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs font-mono text-red-700">{level}</span>
                      {level === 'CRITICAL' && <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-snug">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Hospital Coordinate / Location Presets */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Dispatch / Hospital Location *</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                {locationPresets.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleLocationPresetChange(preset)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-colors cursor-pointer ${
                      formData.location_lat === preset.lat
                        ? 'bg-slate-100 border-red-500 text-slate-900 font-bold shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <div className="truncate">{preset.label}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{preset.lat}, {preset.lng}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Clinical Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Clinical & Operational Notes (Optional)</label>
              <textarea
                rows="3"
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-red-600 focus:bg-white"
                placeholder="e.g. Mass casualty emergency in ICU Bay 3. Immediate cross-match ready."
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <Link to="/hospital/dashboard" className="text-xs font-bold text-slate-500 hover:text-slate-800 uppercase tracking-wider">
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-sm shadow-red-100 transition-colors flex items-center gap-2 cursor-pointer"
              >
                {loading ? 'Creating in Firestore...' : 'Submit Request & Find Matches'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
