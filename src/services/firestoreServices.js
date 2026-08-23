// src/services/firestoreService.js
import { db } from '../firebase/config';
import {
    collection, getDocs, getDoc, addDoc,
    updateDoc, deleteDoc, doc, query, where
} from 'firebase/firestore';

// Donors
export const getDonors = async () => {
    const snapshot = await getDocs(collection(db, 'donors'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getDonorById = async (id) => {
    const docRef = doc(db, 'donors', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

// Hospitals
export const getHospitals = async () => {
    const snapshot = await getDocs(collection(db, 'hospitals'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Emergency Requests
export const getRequests = async () => {
    const snapshot = await getDocs(collection(db, 'emergency_requests'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createRequest = async (data) => {
    return await addDoc(collection(db, 'emergency_requests'), {
        ...data,
        createdAt: new Date().toISOString(),
        status: 'ACTIVE'
    });
};

export const updateRequest = async (id, data) => {
    const docRef = doc(db, 'emergency_requests', id);
    return await updateDoc(docRef, data);
};

// Matches
export const getMatches = async () => {
    const snapshot = await getDocs(collection(db, 'matches'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const createMatch = async (data) => {
    return await addDoc(collection(db, 'matches'), {
        ...data,
        createdAt: new Date().toISOString(),
        status: 'PENDING'
    });
};

// Notifications
export const getNotifications = async () => {
    const snapshot = await getDocs(collection(db, 'notifications'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const updateNotification = async (id, data) => {
    const docRef = doc(db, 'notifications', id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return await updateDoc(docRef, data);
    } else {
        return await setDoc(docRef, { id, ...data, createdAt: new Date().toISOString() }, { merge: true });
    }
};

export default {
    getDonors,
    getDonorById,
    getHospitals,
    getRequests,
    createRequest,
    updateRequest,
    getMatches,
    createMatch,
    getNotifications,
    updateNotification
};