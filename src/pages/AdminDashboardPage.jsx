// src/pages/AdminDashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase/config';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore';
import {
  Users,
  Hospital,
  Droplet,
  Activity,
  CheckCircle,
  XCircle,
  Shield,
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  UserCheck,
  UserX
} from 'lucide-react';
import { BloodGroupBadge, UrgencyBadge, StatusBadge } from '../components/StatusBadges.jsx';
import { safeId, sliceId } from '../utils/idHelpers.js';
import toast from 'react-hot-toast';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalDonors: 0,
    verifiedDonors: 0,
    totalHospitals: 0,
    verifiedHospitals: 0,
    totalRequests: 0,
    activeRequests: 0,
    totalMatches: 0,
    pendingMatches: 0
  });
  const [donors, setDonors] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [requests, setRequests] = useState([]);
  const [matches, setMatches] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Real-time listeners for all collections
    const unsubscribers = [];

    // Donors listener
    const donorsUnsub = onSnapshot(collection(db, 'donors'), (snapshot) => {
      const donorsData = [];
      let verifiedCount = 0;
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        donorsData.push(data);
        if (data.isVerified === true || data.isVerified === 'verified') {
          verifiedCount++;
        }
      });
      setDonors(donorsData);
      setStats(prev => ({
        ...prev,
        totalDonors: donorsData.length,
        verifiedDonors: verifiedCount
      }));
    });
    unsubscribers.push(donorsUnsub);

    // Hospitals listener
    const hospitalsUnsub = onSnapshot(collection(db, 'hospitals'), (snapshot) => {
      const hospitalsData = [];
      let verifiedCount = 0;
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        hospitalsData.push(data);
        if (data.isVerified === true || data.isVerified === 'verified') {
          verifiedCount++;
        }
      });
      setHospitals(hospitalsData);
      setStats(prev => ({
        ...prev,
        totalHospitals: hospitalsData.length,
        verifiedHospitals: verifiedCount
      }));
    });
    unsubscribers.push(hospitalsUnsub);

    // Requests listener
    const requestsUnsub = onSnapshot(collection(db, 'emergency_requests'), (snapshot) => {
      const requestsData = [];
      let activeCount = 0;
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        requestsData.push(data);
        if (data.status === 'ACTIVE' || data.status === 'PARTIALLY_FILLED') {
          activeCount++;
        }
      });
      setRequests(requestsData);
      setStats(prev => ({
        ...prev,
        totalRequests: requestsData.length,
        activeRequests: activeCount
      }));
    });
    unsubscribers.push(requestsUnsub);

    // Matches listener
    const matchesUnsub = onSnapshot(collection(db, 'matches'), (snapshot) => {
      const matchesData = [];
      let pendingCount = 0;
      snapshot.forEach((doc) => {
        const data = { id: doc.id, ...doc.data() };
        matchesData.push(data);
        if (data.status === 'PENDING' || data.status === 'NOTIFIED') {
          pendingCount++;
        }
      });
      setMatches(matchesData);
      setStats(prev => ({
        ...prev,
        totalMatches: matchesData.length,
        pendingMatches: pendingCount
      }));
    });
    unsubscribers.push(matchesUnsub);

    setLoading(false);

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user]);

  // ✅ FIXED: Handle Donor Verification
  const handleVerifyDonor = async (donorId, currentStatus) => {
    try {
      // Check status properly (handles boolean, string, and various formats)
      const isVerified = currentStatus === true ||
        currentStatus === 'true' ||
        currentStatus === 'verified' ||
        currentStatus === 1 ||
        currentStatus === '1';

      const newStatus = !isVerified;

      await updateDoc(doc(db, 'donors', donorId), {
        isVerified: newStatus,
        verifiedAt: newStatus ? new Date().toISOString() : null
      });

      toast.success(`Donor ${newStatus ? 'verified' : 'unverified'} successfully!`);

    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to update verification status');
    }
  };

  // ✅ FIXED: Handle Hospital Verification
  const handleVerifyHospital = async (hospitalId, currentStatus) => {
    try {
      const isVerified = currentStatus === true ||
        currentStatus === 'true' ||
        currentStatus === 'verified' ||
        currentStatus === 1 ||
        currentStatus === '1';

      const newStatus = !isVerified;

      await updateDoc(doc(db, 'hospitals', hospitalId), {
        isVerified: newStatus,
        verifiedAt: newStatus ? new Date().toISOString() : null
      });

      toast.success(`Hospital ${newStatus ? 'verified' : 'unverified'} successfully!`);

    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to update verification status');
    }
  };

  // Handle Delete Donor
  const handleDeleteDonor = async (donorId) => {
    if (window.confirm('Are you sure you want to delete this donor?')) {
      try {
        await deleteDoc(doc(db, 'donors', donorId));
        toast.success('Donor deleted successfully!');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete donor');
      }
    }
  };

  // Handle Delete Hospital
  const handleDeleteHospital = async (hospitalId) => {
    if (window.confirm('Are you sure you want to delete this hospital?')) {
      try {
        await deleteDoc(doc(db, 'hospitals', hospitalId));
        toast.success('Hospital deleted successfully!');
      } catch (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete hospital');
      }
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    // Data will auto-update via listeners
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Filter donors by search
  const filteredDonors = donors.filter(donor =>
    donor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    donor.bloodGroup?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter hospitals by search
  const filteredHospitals = hospitals.filter(hospital =>
    hospital.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    hospital.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">
              System-wide oversight and management
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'overview'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('donors')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'donors'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Donors ({donors.length})
          </button>
          <button
            onClick={() => setActiveTab('hospitals')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'hospitals'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Hospitals ({hospitals.length})
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'requests'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'matches'
              ? 'text-red-600 border-b-2 border-red-600'
              : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            Matches ({matches.length})
          </button>
        </div>

        {/* Search Bar */}
        {(activeTab === 'donors' || activeTab === 'hospitals') && (
          <div className="mb-6">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-slate-500">Total Donors</p>
                    <p className="text-2xl font-bold">{stats.totalDonors}</p>
                    <p className="text-xs text-green-600">
                      {stats.verifiedDonors} verified
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <Hospital className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-xs text-slate-500">Total Hospitals</p>
                    <p className="text-2xl font-bold">{stats.totalHospitals}</p>
                    <p className="text-xs text-green-600">
                      {stats.verifiedHospitals} verified
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-xs text-slate-500">Requests</p>
                    <p className="text-2xl font-bold">{stats.totalRequests}</p>
                    <p className="text-xs text-red-600">
                      {stats.activeRequests} active
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-xs text-slate-500">Matches</p>
                    <p className="text-2xl font-bold">{stats.totalMatches}</p>
                    <p className="text-xs text-yellow-600">
                      {stats.pendingMatches} pending
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="font-bold mb-4">Recent Donors</h3>
                {donors.slice(0, 5).map((donor) => (
                  <div key={donor.id} className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div>
                      <p className="font-medium text-sm">{donor.name}</p>
                      <p className="text-xs text-slate-500">{donor.bloodGroup}</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${donor.isVerified === true || donor.isVerified === 'verified'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                      }`}>
                      {donor.isVerified === true || donor.isVerified === 'verified' ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="bg-white p-6 rounded-xl border border-slate-200">
                <h3 className="font-bold mb-4">Recent Requests</h3>
                {requests.slice(0, 5).map((req) => (
                  <div key={req.id} className="flex items-center justify-between py-2 border-b border-slate-100">
                    <div>
                      <p className="font-medium text-sm">{req.bloodGroup} - {req.componentType}</p>
                      <p className="text-xs text-slate-500">{req.unitsNeeded} units</p>
                    </div>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${req.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      req.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                      {req.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Donors Tab */}
        {activeTab === 'donors' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Blood Group</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Available</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Verified</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDonors.map((donor) => (
                    <tr key={donor.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm">{donor.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{donor.email}</td>
                      <td className="px-4 py-3 text-sm font-bold">{donor.bloodGroup}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${donor.isAvailable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                          {donor.isAvailable ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {/* ✅ FIXED: Donor Verification Button */}
                        <button
                          onClick={() => handleVerifyDonor(donor.id, donor.isVerified)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${donor.isVerified === true || donor.isVerified === 'verified'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                        >
                          {donor.isVerified === true || donor.isVerified === 'verified' ? '✅ Verified' : '❌ Unverified'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteDonor(donor.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Hospitals Tab */}
        {activeTab === 'hospitals' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">City</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Verified</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHospitals.map((hospital) => (
                    <tr key={hospital.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium">{hospital.name}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{hospital.email}</td>
                      <td className="px-4 py-3 text-sm">{hospital.city}</td>
                      <td className="px-4 py-3">
                        {/* ✅ FIXED: Hospital Verification Button */}
                        <button
                          onClick={() => handleVerifyHospital(hospital.id, hospital.isVerified)}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${hospital.isVerified === true || hospital.isVerified === 'verified'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                        >
                          {hospital.isVerified === true || hospital.isVerified === 'verified' ? '✅ Verified' : '❌ Unverified'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleDeleteHospital(hospital.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Requests Tab */}
        {activeTab === 'requests' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Blood Group</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Component</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Units</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Urgency</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => {
                    const reqIdStr = safeId(req.id);
                    return (
                      <tr key={reqIdStr} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono">{sliceId(req.id, 0, 8)}...</td>
                        <td className="px-4 py-3 text-sm font-bold">{req.bloodGroup || req.blood_group}</td>
                        <td className="px-4 py-3 text-sm">{req.componentType || req.component}</td>
                        <td className="px-4 py-3 text-sm">{req.unitsNeeded || req.units_required || 1}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${req.urgency === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                            req.urgency === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                            {req.urgency || 'HIGH'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${req.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                            req.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                            {req.status || 'ACTIVE'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Matches Tab */}
        {activeTab === 'matches' && (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Request ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Donor</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Score</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => {
                    const matchIdStr = safeId(match.id);
                    const donor = donors.find(d => d.id === match.donorId || d.id === match.donor_id);
                    return (
                      <tr key={matchIdStr} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono">{sliceId(match.requestId || match.request_id, 0, 8)}...</td>
                        <td className="px-4 py-3 text-sm">{donor?.name || match.donor_name || match.donorId}</td>
                        <td className="px-4 py-3 text-sm font-bold">{Math.round(match.total_score || match.score || 95)}%</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded-full ${match.status === 'ACCEPTED' || match.response_status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                            match.status === 'DECLINED' || match.response_status === 'DECLINED' ? 'bg-red-100 text-red-700' :
                              match.status === 'NOTIFIED' || match.response_status === 'NOTIFIED' ? 'bg-blue-100 text-blue-700' :
                                'bg-yellow-100 text-yellow-700'
                            }`}>
                            {match.status || match.response_status || 'PENDING'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-slate-400">Recorded</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}