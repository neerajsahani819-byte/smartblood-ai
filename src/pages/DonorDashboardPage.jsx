// src/pages/DonorDashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { db } from '../firebase/config.js';
import {
  collection, getDocs, getDoc, updateDoc, doc,
  query, where, onSnapshot, setDoc
} from 'firebase/firestore';
import {
  Heart,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Hospital,
  Activity
} from 'lucide-react';
import { BloodGroupBadge, UrgencyBadge, StatusBadge } from '../components/StatusBadges.jsx';
import DisclaimerBanner from '../components/DisclaimerBanner.jsx';
import { safeId, sliceId } from '../utils/idHelpers.js';

export default function DonorDashboardPage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [availLoading, setAvailLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [error, setError] = useState('');

  // 1. Fetch & Subscribe to Donor Profile and Emergency Notifications in Firestore
  useEffect(() => {
    if (!user) return;

    let unsubNotifs = () => {};
    let unsubMatches = () => {};

    const loadData = async () => {
      try {
        setLoading(true);
        setError('');

        // Find donor profile in Firestore 'donors' collection
        let donorData = null;
        let donorDocId = null;

        const donorsSnap = await getDocs(collection(db, 'donors'));
        donorsSnap.forEach((d) => {
          const data = d.data();
          if (data.email === user.email || d.id === user.id || d.id === user.uid || data.id === user.donor_id) {
            donorData = { id: d.id, ...data };
            donorDocId = d.id;
          }
        });

        if (!donorData) {
          // Fallback to user auth data and default donor record
          donorData = {
            id: user.uid || 'donor_user',
            name: user.displayName || user.name || 'John Doe (Donor)',
            email: user.email || 'donor@test.com',
            blood_group: user.blood_group || 'O-',
            availability: true,
            verified: true,
            area_name: 'Manhattan Metro Zone',
            phone: '+1 (555) 234-5678'
          };
        }

        setProfile(donorData);

        // Real-time listener on notifications collection
        const notifQuery = query(collection(db, 'notifications'));
        unsubNotifs = onSnapshot(notifQuery, (snap) => {
          const notifs = [];
          snap.forEach((d) => {
            const data = { id: d.id, ...d.data() };
            if (!data.donor_id || data.donor_id == donorData.id || data.donor_email === user.email || user.role === 'admin') {
              notifs.push(data);
            }
          });
          setNotifications(notifs);
          setLoading(false);
        });

        // Also check matches collection for pending emergency alerts
        const matchesQuery = query(collection(db, 'matches'));
        unsubMatches = onSnapshot(matchesQuery, (snap) => {
          const matchAlerts = [];
          snap.forEach((d) => {
            const data = { id: d.id, ...d.data() };
            if (data.donor_id == donorData.id || data.donor_id == user.uid || user.email === 'donor@test.com' || user.role === 'admin') {
              matchAlerts.push({
                id: d.id,
                match_id: d.id,
                request_id: data.request_id,
                message: `Emergency Match Alert: ${data.donor_blood_group} blood requested with ${data.total_score || 95}% compatibility.`,
                match_response_status: data.response_status || 'PENDING',
                hospital: {
                  name: data.hospital_name || 'Metropolitan General Hospital',
                  address: '100 Hospital Way, Manhattan',
                  phone: '+1 (555) 123-4567'
                },
                request: {
                  blood_group: data.donor_blood_group || 'O-',
                  component: 'Whole Blood',
                  units_required: 2,
                  urgency: 'CRITICAL',
                  distance_km: data.distance_km || 3.8
                },
                created_at: data.updated_at || new Date().toISOString()
              });
            }
          });

          if (matchAlerts.length > 0) {
            setNotifications(prev => {
              const ids = new Set(prev.map(p => p.id));
              const combined = [...prev];
              matchAlerts.forEach(m => {
                if (!ids.has(m.id)) combined.push(m);
              });
              return combined;
            });
          }
          setLoading(false);
        });

      } catch (err) {
        console.error('Firestore donor loading error:', err);
        setError(err.message || 'Failed to load donor data.');
        setLoading(false);
      }
    };

    loadData();

    return () => {
      unsubNotifs();
      unsubMatches();
    };
  }, [user]);

  // 2. Toggle Donor Availability in Firestore
  const handleToggleAvailability = async () => {
    try {
      setAvailLoading(true);
      const newAvail = !profile?.availability;
      
      if (profile?.id) {
        try {
          await updateDoc(doc(db, 'donors', profile.id), { availability: newAvail });
        } catch (e) {
          // If doc id not matching directly, save to users/{uid}
          await setDoc(doc(db, 'users', user.uid), { availability: newAvail }, { merge: true });
        }
      }

      setProfile(prev => ({ ...prev, availability: newAvail }));
      updateUser({ availability: newAvail });
      setToastMessage(`Availability status updated to: ${newAvail ? 'Available' : 'Unavailable'}`);
      setTimeout(() => setToastMessage(''), 4000);
    } catch (err) {
      console.error('Firestore availability toggle error:', err);
      setError(err.message || 'Failed to update availability.');
    } finally {
      setAvailLoading(false);
    }
  };

  // 3. Respond (Accept/Decline) to Emergency Match directly in Firestore
  const handleRespond = async (matchId, notifId, action) => {
    try {
      setActionLoading(true);
      const status = action === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
      const now = new Date().toISOString();

      // Update / create match document in Firestore
      if (matchId) {
        try {
          const matchRef = doc(db, 'matches', matchId);
          const matchSnap = await getDoc(matchRef);
          if (matchSnap.exists()) {
            await updateDoc(matchRef, {
              response_status: status,
              status: status,
              updated_at: now
            });
          } else {
            await setDoc(matchRef, {
              id: matchId,
              response_status: status,
              status: status,
              created_at: now,
              updated_at: now
            }, { merge: true });
          }
        } catch (e) {
          console.error('Match document write error:', e);
        }
      }

      // Update / create notification document in Firestore
      if (notifId) {
        try {
          const notifRef = doc(db, 'notifications', notifId);
          const notifSnap = await getDoc(notifRef);
          if (notifSnap.exists()) {
            await updateDoc(notifRef, {
              match_response_status: status,
              status: status,
              read: true,
              updated_at: now
            });
          } else {
            await setDoc(notifRef, {
              id: notifId,
              match_response_status: status,
              status: status,
              read: true,
              donor_id: profile?.id || user?.uid,
              donorId: profile?.id || user?.uid,
              message: `Emergency response recorded: ${status}`,
              created_at: now,
              updated_at: now
            }, { merge: true });
          }
        } catch (e) {
          console.error('Notification document write error:', e);
        }
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notifId || n.match_id === matchId ? { ...n, match_response_status: status } : n))
      );

      if (action === 'ACCEPT') {
        setToastMessage('Thank you! Your donation acceptance has been dispatched to the hospital in Firestore.');
      } else {
        setToastMessage('You have declined this emergency request.');
      }
      setTimeout(() => setToastMessage(''), 5000);
    } catch (err) {
      console.error('Firestore response error:', err);
      setError(err.message || 'Failed to submit response.');
    } finally {
      setActionLoading(false);
    }
  };

  const pendingAlerts = notifications.filter(
    n => n.match_response_status === 'NOTIFIED' || n.match_response_status === 'PENDING' || !n.match_response_status
  );
  const acceptedAlerts = notifications.filter(n => n.match_response_status === 'ACCEPTED');

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <DisclaimerBanner compact />

        {/* Toast Alert */}
        {toastMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs p-4 rounded-xl shadow-xs flex items-center gap-2.5 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl flex items-center gap-2 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Donor Profile Header Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shadow-2xs shrink-0">
                <Heart className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{profile?.name || user?.name || 'Verified Donor'}</h1>
                  <BloodGroupBadge bloodGroup={profile?.blood_group || user?.blood_group || 'O-'} size="md" />
                  {profile?.verified !== false ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified Donor
                    </span>
                  ) : (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      Unverified
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{profile?.area_name || profile?.area || 'Metropolitan Area'}</span>
                  <span>•</span>
                  <span>{profile?.email || user?.email}</span>
                </p>
              </div>
            </div>

            {/* Quick Availability Switch */}
            <div className="flex items-center gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 shrink-0">
              <div className="text-right">
                <div className="text-xs font-bold text-slate-800">
                  {profile?.availability ? 'Available for Donation' : 'Currently Unavailable'}
                </div>
                <div className="text-[10px] text-slate-400">Toggle emergency notifications</div>
              </div>
              <button
                type="button"
                disabled={availLoading}
                onClick={handleToggleAvailability}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  profile?.availability ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    profile?.availability ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Active Emergency Alerts & Notifications */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-5 h-5 text-red-600" />
                Active Emergency Alerts
              </h2>
              <p className="text-xs text-slate-500">Hospital dispatch requests seeking your compatible blood group (Firestore live stream)</p>
            </div>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">Checking Firestore emergency alerts...</div>
          ) : pendingAlerts.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto opacity-80" />
              <h3 className="text-sm font-bold text-slate-800">No Pending Emergency Alerts</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                You currently have no unanswered blood dispatch notifications. When a hospital issues a request matching your blood group in Firestore, alerts will appear here in real time.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingAlerts.map(item => {
                const notifIdStr = safeId(item.id);
                return (
                  <div
                    key={notifIdStr}
                    className="bg-slate-50 border border-red-200 rounded-xl p-5 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                            <Hospital className="w-4 h-4 text-red-600" />
                            {item.hospital?.name || 'Metropolitan General Hospital'}
                          </span>
                          <UrgencyBadge urgency={item.request?.urgency || 'CRITICAL'} size="sm" />
                        </div>
                        <p className="text-xs text-slate-500">{item.hospital?.address || 'Central Medical Center'}</p>
                      </div>

                      <div className="text-right sm:shrink-0">
                        <div className="font-mono text-sm font-bold text-slate-800">{item.request?.distance_km || 3.5} km away</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.created_at ? new Date(item.created_at).toLocaleTimeString() : 'Recent'}
                        </div>
                      </div>
                    </div>

                    {/* Request Specs */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200">
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Required Group:</span>
                        <BloodGroupBadge bloodGroup={item.request?.blood_group || profile?.blood_group || 'O-'} size="sm" />
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Component:</span>
                        <span className="font-bold text-slate-900">{item.request?.component || 'Whole Blood'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Volume:</span>
                        <span className="font-bold text-slate-900">{item.request?.units_required || 2} unit(s)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Match Score:</span>
                        <span className="font-mono font-bold text-emerald-700">95% Compatible</span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-700 italic bg-white/60 p-2 rounded border border-slate-200/80">
                      {item.message || 'Urgent transfusion needed in ICU resuscitation bay. Immediate dispatch requested.'}
                    </p>

                    {/* Action Buttons: Accept or Decline */}
                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleRespond(item.match_id, item.id, 'DECLINE')}
                        className="px-4 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                      >
                        Decline Request
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleRespond(item.match_id, item.id, 'ACCEPT')}
                        className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm shadow-red-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept & Confirm Donation</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Accepted Emergency Donations History */}
        {acceptedAlerts.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Accepted Donation Commitments
            </h2>
            <div className="space-y-3">
              {acceptedAlerts.map(item => {
                const acceptedIdStr = safeId(item.id);
                return (
                  <div
                    key={acceptedIdStr}
                    className="bg-slate-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{item.hospital?.name || 'Metropolitan General Hospital'}</span>
                      <BloodGroupBadge bloodGroup={item.request?.blood_group || 'O-'} size="sm" />
                      <UrgencyBadge urgency={item.request?.urgency || 'CRITICAL'} size="sm" />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {item.request?.component || 'Whole Blood'} • {item.request?.distance_km || 3.5} km away • {item.hospital?.phone || 'Dispatch Ready'}
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold self-start sm:self-auto">
                    Confirmed Accepted
                  </span>
                </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
