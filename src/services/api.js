// src/services/api.js (and firebase-api.js)
import { db } from '../firebase/config.js';
import {
  collection, getDocs, getDoc, addDoc,
  updateDoc, deleteDoc, doc, query, where,
  onSnapshot
} from 'firebase/firestore';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

function getAuthHeaders() {
  const token = localStorage.getItem('smartblood_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options.headers || {})
    }
  };

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data.error || data.message || `Request failed with status ${res.status}`;
      throw new Error(errorMsg);
    }

    return data;
  } catch (err) {
    console.warn(`[API] ${options.method || 'GET'} ${endpoint}:`, err.message);
    throw err;
  }
}

// Direct Firebase Firestore API methods
export const firebaseAPI = {
  // Hospitals
  getHospitals: async () => {
    const snapshot = await getDocs(collection(db, 'hospitals'));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  // Donors
  getDonors: async () => {
    const snapshot = await getDocs(collection(db, 'donors'));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  // Emergency Requests
  getRequests: async () => {
    const snapshot = await getDocs(collection(db, 'emergency_requests'));
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  },

  createRequest: async (data) => {
    return await addDoc(collection(db, 'emergency_requests'), {
      ...data,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE'
    });
  },

  updateRequest: async (id, data) => {
    const docRef = doc(db, 'emergency_requests', id);
    return await updateDoc(docRef, data);
  },

  // Listen to real-time updates
  listenToRequests: (callback) => {
    return onSnapshot(collection(db, 'emergency_requests'), (snapshot) => {
      const requests = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(requests);
    });
  }
};

// Unified API Client supporting Firestore & AI / Matching endpoints
export const api = {
  ...firebaseAPI,

  // Authentication
  auth: {
    hospitalLogin: (email, password) =>
      request('/auth/hospital/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    donorLogin: (email, password) =>
      request('/auth/donor/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    donorRegister: (donorData) =>
      request('/auth/donor/register', {
        method: 'POST',
        body: JSON.stringify(donorData)
      }),
    adminLogin: (email, password) =>
      request('/auth/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
    getMe: () => request('/auth/me')
  },

  // Hospital Operations
  hospital: {
    getDashboard: async () => {
      try {
        return await request('/hospitals/dashboard');
      } catch (e) {
        // Fallback to Firestore
        const hospitals = await firebaseAPI.getHospitals();
        const reqs = await firebaseAPI.getRequests();
        return {
          hospital: hospitals[0] || { name: 'Metropolitan General Hospital' },
          active_requests: reqs.filter((r) => r.status === 'ACTIVE'),
          stats: {
            active_requests_count: reqs.filter((r) => r.status === 'ACTIVE').length,
            completed_requests_count: reqs.filter((r) => r.status === 'COMPLETED').length
          }
        };
      }
    }
  },

  // Emergency Requests & Matching
  requests: {
    create: async (requestData) => {
      try {
        return await request('/requests', {
          method: 'POST',
          body: JSON.stringify(requestData)
        });
      } catch (e) {
        const docRef = await firebaseAPI.createRequest(requestData);
        return { request: { id: docRef.id, ...requestData } };
      }
    },
    getAll: () => request('/requests').catch(() => firebaseAPI.getRequests()),
    getById: async (id) => {
      try {
        return await request(`/requests/${id}`);
      } catch (e) {
        const docSnap = await getDoc(doc(db, 'emergency_requests', id.toString()));
        if (docSnap.exists()) {
          return { request: { id: docSnap.id, ...docSnap.data() }, matches: [] };
        }
        throw e;
      }
    },
    update: (id, updateData) =>
      request(`/requests/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      }).catch(() => firebaseAPI.updateRequest(id, updateData)),
    getMatches: (id) => request(`/requests/${id}/matches`).catch(() => ({ matches: [] })),
    recalculateMatches: (id) => request(`/requests/${id}/match`, { method: 'POST' }).catch(() => ({ matches: [] })),
    getAiInsights: (id) => request(`/requests/${id}/ai-insights`),
    notifyDonors: (id, donorIds = null) =>
      request(`/requests/${id}/notify`, {
        method: 'POST',
        body: JSON.stringify({ donor_ids: donorIds })
      })
  },

  // Donor Operations
  donor: {
    getProfile: () => request('/donors/profile'),
    updateProfile: (profileData) =>
      request('/donors/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      }),
    getNotifications: () => request('/donors/notifications'),
    markNotificationRead: (notifId) =>
      request(`/donors/notifications/${notifId}/read`, {
        method: 'PUT'
      }),
    acceptMatch: (matchId) =>
      request(`/matches/${matchId}/accept`, {
        method: 'POST'
      }),
    declineMatch: (matchId) =>
      request(`/matches/${matchId}/decline`, {
        method: 'POST'
      })
  },

  // Admin Operations
  admin: {
    getStats: () => request('/admin/stats'),
    getDonors: () => request('/admin/donors').catch(() => firebaseAPI.getDonors()),
    getHospitals: () => request('/admin/hospitals').catch(() => firebaseAPI.getHospitals()),
    toggleDonorVerification: (donorId) =>
      request(`/admin/donors/${donorId}/verify`, {
        method: 'PUT'
      }),
    toggleHospitalVerification: (hospitalId) =>
      request(`/admin/hospitals/${hospitalId}/verify`, {
        method: 'PUT'
      })
  },

  health: () => request('/health')
};

export default api;