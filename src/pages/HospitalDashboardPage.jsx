// src/pages/HospitalDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hospital, Plus, AlertTriangle, CheckCircle, Clock,
  Activity, Droplet, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { BloodGroupBadge, UrgencyBadge, StatusBadge } from '../components/StatusBadges.jsx';
import DisclaimerBanner from '../components/DisclaimerBanner.jsx';
import { useFirestoreListener } from '../hooks/useFirestore';
import { safeId, sliceId } from '../utils/idHelpers.js';

// ✅ Import MapView (only if you have the component)
// import MapView from '../components/MapView';

export default function HospitalDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ✅ Use the custom hook instead of direct onSnapshot
  const { data: allRequests, loading, error } = useFirestoreListener('emergency_requests');

  // State for processed data
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    critical: 0,
    filled: 0
  });

  // ✅ State for map (moved INSIDE component)
  // const [mapLocations, setMapLocations] = useState([]);

  // ✅ Process data when allRequests changes
  useEffect(() => {
    if (!allRequests || allRequests.length === 0) {
      setRequests([]);
      setStats({ total: 0, active: 0, critical: 0, filled: 0 });
      return;
    }

    const userHospitalId = user?.hospital_id || user?.hospitalId || user?.id || 1;
    const requestsData = [];
    let activeCount = 0;
    let criticalCount = 0;
    let filledCount = 0;

    allRequests.forEach((data) => {
      const reqHospitalId = data.hospital_id || data.hospitalId;

      // Filter by hospital if set, or show all if admin/hospital
      if (!reqHospitalId || reqHospitalId == userHospitalId || user?.role === 'admin' || user?.role === 'hospital') {
        // ✅ Ensure each request has a valid string ID
        const safeData = {
          ...data,
          id: safeId(data.id)
        };
        requestsData.push(safeData);

        if (data.status === 'ACTIVE' || data.status === 'PARTIALLY_FILLED' || !data.status) {
          activeCount++;
        }
        if (data.urgency === 'CRITICAL') {
          criticalCount++;
        }
        if (data.status === 'COMPLETED' || data.status === 'FILLED') {
          filledCount++;
        }
      }
    });

    // Sort by active first, then recent
    requestsData.sort((a, b) => {
      if (a.status === 'ACTIVE' && b.status !== 'ACTIVE') return -1;
      if (b.status === 'ACTIVE' && a.status !== 'ACTIVE') return 1;
      return 0;
    });

    setRequests(requestsData);
    setStats({
      total: requestsData.length,
      active: activeCount,
      critical: criticalCount,
      filled: filledCount
    });
  }, [allRequests, user]);

  // ✅ Map locations effect (moved INSIDE component)
  // Uncomment this if you have MapView component and donor/hospital data
  /*
  useEffect(() => {
    // This would fetch donors and hospitals for the map
    // For now, it's commented out until you add the data sources
    const locations = [
      // ... donors.map(d => ({ ... })),
      // ... hospitals.map(h => ({ ... }))
    ];
    setMapLocations(locations);
  }, []);
  */

  // Show error if Firestore listener fails
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center max-w-md p-6 bg-white rounded-2xl border border-red-200 shadow-sm">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900">Connection Error</h2>
          <p className="text-sm text-slate-600 mt-2">
            Unable to connect to Firestore. Please check your internet connection and try again.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600 mx-auto"></div>
          <p className="mt-3 text-xs text-slate-500 font-medium">Loading hospital dashboard from Firestore...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <DisclaimerBanner compact />

        {/* Hospital Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shadow-2xs shrink-0">
              <Hospital className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                  {user?.displayName || user?.name || 'Metropolitan General Hospital'}
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Verified Facility
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {user?.email || 'hospital@test.com'} • Emergency Blood Dispatch • Cloud Firestore Connected
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/hospital/request/new')}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-sm shadow-red-100 transition-all cursor-pointer whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>New Emergency Request</span>
          </button>
        </div>

        {/* ✅ Optional: Map Section - Uncomment when MapView is ready */}
        {/*
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <h3 className="text-lg font-bold mb-3">📍 Nearby Locations</h3>
          <MapView 
            locations={mapLocations}
            center={{ lat: 28.6139, lng: 77.2090 }}
            zoom={11}
          />
        </div>
        */}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Requests</p>
                <p className="text-2xl font-extrabold font-mono text-slate-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Active Pipeline</p>
                <p className="text-2xl font-extrabold font-mono text-amber-600">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Critical Demand</p>
                <p className="text-2xl font-extrabold font-mono text-red-600">{stats.critical}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Fulfilled</p>
                <p className="text-2xl font-extrabold font-mono text-emerald-700">{stats.filled}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Requests List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Emergency Blood Requests</h2>
              <p className="text-xs text-slate-500">Live real-time status and matching from Cloud Firestore</p>
            </div>
            <button
              onClick={() => navigate('/hospital/request/new')}
              className="text-xs font-bold text-red-600 hover:text-red-700 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
            >
              + Create Request
            </button>
          </div>

          {requests.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Droplet className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-slate-500 text-sm">No emergency requests found in Firestore.</p>
              <button
                onClick={() => navigate('/hospital/request/new')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create First Emergency Request
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((req) => {
                // ✅ Safe ID conversion for each request
                const id = safeId(req.id);
                const bloodGroup = req.blood_group || req.bloodGroup || 'O-';
                const component = req.component || req.componentType || 'Whole Blood';
                const units = req.units_required || req.unitsNeeded || req.units || 1;
                const urgency = req.urgency || 'HIGH';
                const status = req.status || 'ACTIVE';
                const dateStr = req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Recent';

                return (
                  <div
                    key={id}
                    onClick={() => navigate(`/requests/${id}`)}
                    className="p-4 border border-slate-200 hover:border-slate-300 rounded-xl hover:bg-slate-50/70 cursor-pointer transition-all shadow-2xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <BloodGroupBadge bloodGroup={bloodGroup} size="sm" />
                          <span className="font-bold text-slate-900 text-sm">
                            {component}
                          </span>
                          <UrgencyBadge urgency={urgency} size="sm" />
                          <StatusBadge status={status} type="request" />
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-2">
                          <span><strong>{units}</strong> unit(s) required</span>
                          <span>•</span>
                          <span>{req.notes || 'Emergency ICU Transfusion'}</span>
                        </p>
                      </div>

                      <div className="text-left sm:text-right flex sm:flex-col items-center sm:items-end justify-between">
                        <span className="text-[11px] text-slate-400 font-mono">{dateStr}</span>
                        <span className="text-xs font-bold text-red-600 hover:text-red-700 inline-flex items-center gap-1 mt-1">
                          View Matches & Dispatch <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}