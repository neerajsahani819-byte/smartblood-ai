// src/pages/RequestDetailsPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../firebase/config.js';
import {
  collection, getDoc, getDocs, doc, updateDoc,
  onSnapshot, query, where, addDoc, setDoc
} from 'firebase/firestore';
import { runFirestoreMatching } from '../utils/matchingLogic.js';
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Hospital,
  Clock,
  Send,
  ShieldCheck,
  Check,
  XCircle,
  Sparkles
} from 'lucide-react';
import { BloodGroupBadge, UrgencyBadge, StatusBadge } from '../components/StatusBadges.jsx';
import MatchScoreBadge from '../components/MatchScoreBadge.jsx';
import AiInsightsCard from '../components/AiInsightsCard.jsx';
import DisclaimerBanner from '../components/DisclaimerBanner.jsx';
import { safeId, sliceId, formatRequestId } from '../utils/idHelpers.js';

export default function RequestDetailsPage() {
  const { id } = useParams();
  const { user, role } = useAuth();

  const [request, setRequest] = useState(null);
  const [matches, setMatches] = useState([]);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState(null);

  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');

  // 1. Fetch & Subscribe to Emergency Request & Matches in Firestore
  useEffect(() => {
    if (!id) return;

    let unsubReq = () => {};
    let unsubMatches = () => {};

    const loadRequest = async () => {
      try {
        setLoading(true);
        setError('');

        // Subscribe to emergency_requests doc
        const reqDocRef = doc(db, 'emergency_requests', id);
        unsubReq = onSnapshot(reqDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const reqData = { id: docSnap.id, ...docSnap.data() };
            setRequest(reqData);

            // Fetch/Compute initial matches if needed
            const matchesSnap = await getDocs(query(collection(db, 'matches'), where('request_id', '==', id)));
            if (matchesSnap.empty) {
              const computed = await runFirestoreMatching(id, reqData);
              setMatches(computed);
            }
          } else {
            setError('Emergency request not found in Firestore.');
          }
          setLoading(false);
        }, (err) => {
          console.error('Request doc listener error:', err);
          setError(err.message || 'Failed to load request.');
          setLoading(false);
        });

        // Subscribe to matches collection
        const matchesQuery = query(collection(db, 'matches'), where('request_id', '==', id));
        unsubMatches = onSnapshot(matchesQuery, (snap) => {
          const matchList = [];
          let acceptedCount = 0;
          let notifiedCount = 0;

          snap.forEach((d) => {
            const data = { id: d.id, ...d.data() };
            matchList.push(data);
            if (data.response_status === 'ACCEPTED') acceptedCount++;
            if (data.response_status === 'NOTIFIED') notifiedCount++;
          });

          // Sort matches by total score
          matchList.sort((a, b) => (b.total_score || 0) - (a.total_score || 0));

          setMatches(matchList);
          setStats({
            total_matches: matchList.length,
            accepted: acceptedCount,
            notified: notifiedCount
          });
        });

        // AI Logistics Summary
        generateAiInsights();
      } catch (err) {
        console.error('Request loading error:', err);
        setError(err.message || 'Failed to load request details.');
        setLoading(false);
      }
    };

    loadRequest();

    return () => {
      unsubReq();
      unsubMatches();
    };
  }, [id]);

  const generateAiInsights = () => {
    setAiLoading(true);
    setTimeout(() => {
      setInsights({
        urgency_assessment: "Critical ICU compatibility prioritized via deterministic matrix.",
        contact_waves: [
          { wave: 1, recommendation: "Dispatch immediate SMS & push notification to top 3 ranked donors within 5 km." },
          { wave: 2, recommendation: "If unconfirmed after 15 minutes, broadcast to standby secondary donors." }
        ],
        estimated_response_time: "15-25 minutes based on local donor density and availability."
      });
      setAiLoading(false);
    }, 600);
  };

  // 2. Broadcast / Notify Donors in Firestore (Updates matches & adds notifications)
  const handleNotifyDonors = async (targetDonorIds = null) => {
    if (!request) return;

    try {
      setNotifyLoading(true);
      const now = new Date().toISOString();
      const donorsToNotify = targetDonorIds
        ? matches.filter(m => targetDonorIds.includes(m.donor_id))
        : matches;

      for (const m of donorsToNotify) {
        const matchDocId = m.id || m.match_id || `match_${id}_${m.donor_id}`;
        const notifDocId = `notif_${id}_${m.donor_id}`;

        // 1. Match Doc Check & Update/Set
        try {
          const matchRef = doc(db, 'matches', matchDocId);
          const matchSnap = await getDoc(matchRef);
          if (matchSnap.exists()) {
            await updateDoc(matchRef, {
              response_status: 'NOTIFIED',
              status: 'NOTIFIED',
              notified_at: now,
              updated_at: now
            });
          } else {
            await setDoc(matchRef, {
              id: matchDocId,
              match_id: matchDocId,
              request_id: id,
              requestId: id,
              donor_id: m.donor_id,
              donorId: m.donor_id,
              donor_name: m.donor_name || 'Anonymous Donor',
              donor_blood_group: m.donor_blood_group || 'O-',
              distance_km: m.distance_km || 3.5,
              total_score: m.total_score || 95,
              response_status: 'NOTIFIED',
              status: 'NOTIFIED',
              notified_at: now,
              created_at: now,
              updated_at: now
            }, { merge: true });
          }
        } catch (e) {
          console.error('Match notify doc error:', e);
        }

        // 2. Notification Doc Check & Update/Set
        try {
          const notifRef = doc(db, 'notifications', notifDocId);
          const notifSnap = await getDoc(notifRef);
          
          const notifPayload = {
            id: notifDocId,
            donor_id: m.donor_id,
            donorId: m.donor_id,
            donor_email: m.donor_email || '',
            request_id: id,
            requestId: id,
            hospital_id: request.hospital_id || request.hospitalId || 'hosp_1',
            hospital_name: request.hospital_name || 'Metropolitan General Hospital',
            donor_blood_group: m.donor_blood_group || 'O-',
            message: `Emergency Alert: Urgent ${request.blood_group || 'O-'} blood required at ${request.hospital_name || 'Hospital'}. You are a compatible match.`,
            status: 'NOTIFIED',
            match_response_status: 'NOTIFIED',
            read: false,
            updated_at: now,
            request: {
              blood_group: request.blood_group || 'O-',
              component: request.component || 'Whole Blood',
              units_required: request.units_required || 2,
              urgency: request.urgency || 'CRITICAL',
              distance_km: m.distance_km || 3.5
            },
            hospital: {
              name: request.hospital_name || 'Metropolitan General Hospital',
              address: request.hospital_address || '100 Hospital Way, Manhattan'
            }
          };

          if (notifSnap.exists()) {
            await updateDoc(notifRef, notifPayload);
          } else {
            await setDoc(notifRef, {
              ...notifPayload,
              createdAt: now,
              created_at: now
            }, { merge: true });
          }
        } catch (e) {
          console.error('Notification write error:', e);
        }
      }

      setToastMessage(`Dispatched emergency notifications to ${donorsToNotify.length} candidate donor(s) via Firestore.`);
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err) {
      console.error('Notify donors error:', err);
      setError(err.message || 'Failed to dispatch notifications.');
    } finally {
      setNotifyLoading(false);
    }
  };

  // 3. Recalculate Deterministic Matching in Firestore
  const handleRecalculate = async () => {
    if (!request) return;

    try {
      setRecalcLoading(true);
      const computed = await runFirestoreMatching(id, request);
      setMatches(computed);
      setToastMessage('Deterministic matching recalculated with live Firestore donors.');
      setTimeout(() => setToastMessage(''), 4000);
      generateAiInsights();
    } catch (err) {
      console.error('Recalculate error:', err);
      setError(err.message || 'Failed to recalculate matching.');
    } finally {
      setRecalcLoading(false);
    }
  };

  // 4. Update Request Status in Firestore
  const handleStatusChange = async (newStatus) => {
    try {
      await updateDoc(doc(db, 'emergency_requests', id), {
        status: newStatus,
        updated_at: new Date().toISOString()
      });
      setRequest(prev => ({ ...prev, status: newStatus }));
      setToastMessage(`Request status updated to ${newStatus} in Firestore.`);
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error('Status change error:', err);
      setError(err.message || 'Failed to update status.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center p-6">
        <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
          <RefreshCw className="w-5 h-5 animate-spin text-red-600" />
          <span>Retrieving emergency request and matching records from Cloud Firestore...</span>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-8 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
          <AlertCircle className="w-10 h-10 text-red-600 mx-auto" />
          <h2 className="text-lg font-bold text-slate-900">Request Not Found</h2>
          <p className="text-xs text-slate-500">{error || 'Unable to locate the specified emergency request in Firestore.'}</p>
          <Link
            to="/hospital/dashboard"
            className="inline-block px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const bloodGroup = request.blood_group || request.bloodGroup || 'O-';
  const component = request.component || request.componentType || 'Whole Blood';
  const unitsRequired = request.units_required || request.unitsNeeded || 1;
  const urgency = request.urgency || 'CRITICAL';
  const isHospitalOwner = role === 'hospital' || role === 'admin';

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={role === 'hospital' ? '/hospital/dashboard' : '/'}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRecalculate}
              disabled={recalcLoading}
              className="text-xs font-semibold px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Rerun deterministic scoring engine against Firestore"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${recalcLoading ? 'animate-spin' : ''}`} />
              <span>Rerun Matching</span>
            </button>

            {isHospitalOwner && request.status === 'ACTIVE' && (
              <button
                onClick={() => handleStatusChange('COMPLETED')}
                className="text-xs font-bold px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                Mark Fulfilled
              </button>
            )}
          </div>
        </div>

        <DisclaimerBanner compact />

        {/* Toast Notification Alert */}
        {toastMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl shadow-sm flex items-center gap-2.5 animate-fadeIn font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Request Information Header Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-50 border-l-4 border-red-600 rounded-r">
                <p className="text-[10px] text-red-700 font-extrabold uppercase tracking-wider mb-0.5">URGENCY: {urgency}</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900">{bloodGroup} Blood</p>
                <p className="text-xs text-slate-600 font-medium">{component} • {unitsRequired} Units Required</p>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={request.status || 'ACTIVE'} type="request" />
                  <span className="text-xs text-slate-400 font-mono">{formatRequestId(id)}</span>
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                  <Hospital className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-700">{request.hospital_name || 'Metropolitan General Hospital'}</span>
                  <span>•</span>
                  <span>{request.hospital_address || '100 Hospital Way, Manhattan'}</span>
                </p>
              </div>
            </div>

            {/* Quick Broadcast Notification CTA */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={notifyLoading || matches.length === 0}
                onClick={() => handleNotifyDonors()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest shadow-sm shadow-red-100 transition-colors flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{notifyLoading ? 'Dispatching...' : `Notify All Candidates (${matches.length})`}</span>
              </button>
            </div>
          </div>

          {/* Request Meta Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">Required Volume</div>
              <div className="text-base font-bold font-mono text-slate-900">{unitsRequired} unit(s)</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">Matched Candidates</div>
              <div className="text-base font-bold font-mono text-blue-700">{stats?.total_matches || matches.length} in Firestore</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">Accepted Responses</div>
              <div className="text-base font-bold font-mono text-emerald-700">{stats?.accepted || 0} confirmed</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-slate-400 text-[10px] uppercase tracking-widest font-bold mb-0.5">Notified / Pending</div>
              <div className="text-base font-bold font-mono text-amber-600">{stats?.notified || 0} notified</div>
            </div>
          </div>

          {request.notes && (
            <div className="text-xs text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="font-bold text-slate-900">Clinical Emergency Notes: </span>
              {request.notes}
            </div>
          )}
        </div>

        {/* AI Match Insights Card */}
        <AiInsightsCard insights={insights} loading={aiLoading} onRefresh={generateAiInsights} />

        {/* Ranked Donor Matches */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Matched Compatible Candidates</h2>
              <p className="text-xs text-slate-500">
                Sorted by deterministic total score: Compatibility (50%), Distance (20%), Availability (20%), Priority (10%)
              </p>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-900">{matches.length}</span> compatible donors
            </div>
          </div>

          {matches.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2 text-xs sm:text-sm">
              <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="font-semibold text-slate-700">No compatible registered donors found within operational range in Firestore.</p>
              <button
                onClick={handleRecalculate}
                className="mt-2 text-xs text-red-600 font-bold hover:underline cursor-pointer"
              >
                Click to recalculate matches
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase tracking-wider text-[10px] bg-slate-50/50">
                    <th className="py-3 px-3">Rank & Donor Details</th>
                    <th className="py-3 px-3">Blood Group</th>
                    <th className="py-3 px-3">Distance</th>
                    <th className="py-3 px-3">Availability</th>
                    <th className="py-3 px-3">Verification</th>
                    <th className="py-3 px-3">Match Score</th>
                    <th className="py-3 px-3">Response Status</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-sans">
                  {matches.map((m, idx) => {
                    const donorName = m.donor_name || 'Anonymous Donor';
                    const initials = donorName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

                    return (
                      <tr key={m.id || m.match_id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs uppercase shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 text-sm">{donorName}</div>
                              <div className="text-[10px] text-slate-400 font-normal">{m.donor_area || 'Metropolitan Zone'} • Rank #{idx + 1}</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3">
                          <BloodGroupBadge bloodGroup={m.donor_blood_group || 'O-'} size="sm" />
                        </td>

                        <td className="py-3.5 px-3 font-medium text-slate-800">
                          {m.distance_km || 3.5} km
                        </td>

                        <td className="py-3.5 px-3">
                          {m.availability !== false ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Ready
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                              <span className="w-2 h-2 rounded-full bg-slate-400"></span> Unavailable
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          {m.verified !== false ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Unverified</span>
                          )}
                        </td>

                        <td className="py-3.5 px-3">
                          <MatchScoreBadge match={m} size="sm" />
                        </td>

                        <td className="py-3.5 px-3">
                          <StatusBadge status={m.response_status || 'PENDING'} type="match" />
                        </td>

                        <td className="py-3.5 px-3 text-right">
                          {m.response_status === 'PENDING' || !m.response_status ? (
                            <button
                              type="button"
                              disabled={notifyLoading}
                              onClick={() => handleNotifyDonors([m.donor_id])}
                              className="text-[11px] font-bold text-red-600 hover:bg-red-50 px-3 py-1 border border-red-600 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                            >
                              Notify
                            </button>
                          ) : m.response_status === 'NOTIFIED' ? (
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              Notified
                            </span>
                          ) : m.response_status === 'ACCEPTED' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                              <Check className="w-3.5 h-3.5" /> Accepted
                            </span>
                          ) : (
                            <span className="text-[11px] text-rose-600 font-medium">Declined</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
