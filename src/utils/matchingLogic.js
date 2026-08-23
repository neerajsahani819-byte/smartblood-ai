// src/utils/matchingLogic.js
import { db } from '../firebase/config.js';
import {
  collection, getDocs, doc, setDoc, addDoc, updateDoc, query, where
} from 'firebase/firestore';

export const COMPATIBILITY_DISCLAIMER =
  "Compatibility shown by this prototype is for matching assistance only. Final compatibility must be confirmed by an authorized blood bank or healthcare professional.";

const RBC_COMPATIBILITY = {
  'O-': ['O-'],
  'O+': ['O-', 'O+'],
  'A-': ['O-', 'A-'],
  'A+': ['O-', 'O+', 'A-', 'A+'],
  'B-': ['O-', 'B-'],
  'B+': ['O-', 'O+', 'B-', 'B+'],
  'AB-': ['O-', 'A-', 'B-', 'AB-'],
  'AB+': ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+']
};

const PLASMA_COMPATIBILITY = {
  'AB+': ['AB+', 'AB-'],
  'AB-': ['AB+', 'AB-'],
  'A+': ['A+', 'A-', 'AB+', 'AB-'],
  'A-': ['A+', 'A-', 'AB+', 'AB-'],
  'B+': ['B+', 'B-', 'AB+', 'AB-'],
  'B-': ['B+', 'B-', 'AB+', 'AB-'],
  'O+': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'],
  'O-': ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
};

const PLATELETS_COMPATIBILITY = {
  'O-': ['O-', 'O+', 'A-', 'B-'],
  'O+': ['O+', 'O-', 'A+', 'B+'],
  'A-': ['A-', 'A+', 'AB-', 'O-'],
  'A+': ['A+', 'A-', 'AB+', 'O+'],
  'B-': ['B-', 'B+', 'AB-', 'O-'],
  'B+': ['B+', 'B-', 'AB+', 'O+'],
  'AB-': ['AB-', 'AB+', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'B+', 'O+']
};

export function checkBloodCompatibility(recipientBlood, donorBlood, component = 'Whole Blood') {
  const normRecipient = (recipientBlood || '').toUpperCase().trim();
  const normDonor = (donorBlood || '').toUpperCase().trim();
  const normComp = (component || '').toLowerCase().trim();

  let compatMap = RBC_COMPATIBILITY;
  if (normComp.includes('plasma') || normComp.includes('cryo')) {
    compatMap = PLASMA_COMPATIBILITY;
  } else if (normComp.includes('platelet')) {
    compatMap = PLATELETS_COMPATIBILITY;
  }

  const allowedDonors = compatMap[normRecipient] || RBC_COMPATIBILITY[normRecipient] || [];
  const isCompatible = allowedDonors.includes(normDonor);
  const isExact = normRecipient === normDonor;

  let score = 0;
  let note = 'Incompatible blood group';

  if (isExact) {
    score = 100;
    note = 'Exact ABO/Rh match';
  } else if (isCompatible) {
    score = 90;
    note = 'Compatible universal/cross-match alternative';
  }

  return {
    compatible: isCompatible,
    exactMatch: isExact,
    score,
    note,
    disclaimer: COMPATIBILITY_DISCLAIMER
  };
}

export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 === undefined || lon1 === undefined || lat2 === undefined || lon2 === undefined) {
    return 5.2; // default realistic metropolitan distance
  }

  const R = 6371; // Earth's mean radius in km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;

  return Math.round(d * 10) / 10;
}

const MATCH_WEIGHTS = {
  compatibility: 0.5,
  availability: 0.2,
  distance: 0.2,
  priority: 0.1
};

const URGENCY_SCORES = {
  CRITICAL: 100,
  HIGH: 80,
  MEDIUM: 60,
  LOW: 40
};

const MAX_DISTANCE_KM = 30;

/**
 * Executes deterministic matching against Firestore donors collection and syncs matches
 */
export async function runFirestoreMatching(requestId, requestData) {
  const reqLat = requestData.location_lat || 40.7306;
  const reqLng = requestData.location_lng || -73.9352;
  const bloodGroup = requestData.blood_group || requestData.bloodGroup || 'O-';
  const component = requestData.component || requestData.componentType || 'Whole Blood';
  const urgency = (requestData.urgency || 'CRITICAL').toUpperCase();

  // Retrieve donors from Firestore
  const donorsSnap = await getDocs(collection(db, 'donors'));
  const donors = donorsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const rankedMatches = [];

  for (const donor of donors) {
    const compatResult = checkBloodCompatibility(bloodGroup, donor.blood_group, component);

    if (compatResult.compatible) {
      const isAvailable = donor.availability === true || donor.availability === 1;
      const isVerified = donor.verified === true || donor.verified === 1;
      const availScore = isAvailable ? 100 : 0;
      
      const donorLat = donor.location_lat || 40.7128;
      const donorLng = donor.location_lng || -74.0060;
      const distanceKm = calculateDistanceKm(reqLat, reqLng, donorLat, donorLng);

      let distScore = 0;
      if (distanceKm <= MAX_DISTANCE_KM) {
        distScore = Math.max(0, Math.round(100 - (distanceKm / MAX_DISTANCE_KM) * 100));
      }

      const priorityScore = URGENCY_SCORES[urgency] || 70;

      const totalScore = Math.round(
        compatResult.score * MATCH_WEIGHTS.compatibility +
        availScore * MATCH_WEIGHTS.availability +
        distScore * MATCH_WEIGHTS.distance +
        priorityScore * MATCH_WEIGHTS.priority
      );

      const matchId = `match_${requestId}_${donor.id}`;
      const matchRecord = {
        id: matchId,
        match_id: matchId,
        request_id: requestId,
        donor_id: donor.id,
        donor_name: donor.name || 'Anonymous Donor',
        donor_blood_group: donor.blood_group || 'O-',
        donor_phone: donor.phone || 'Protected Contact',
        donor_area: donor.area_name || donor.area || 'Metropolitan Area',
        distance_km: distanceKm,
        availability: isAvailable,
        verified: isVerified,
        compatibility_status: 'COMPATIBLE',
        compatibility_score: compatResult.score,
        availability_score: availScore,
        distance_score: distScore,
        priority_score: priorityScore,
        total_score: totalScore,
        response_status: 'PENDING',
        updated_at: new Date().toISOString()
      };

      // Persist to Firestore
      try {
        await setDoc(doc(db, 'matches', matchId), matchRecord, { merge: true });
      } catch (e) {
        console.warn('Failed saving match to Firestore:', e.message);
      }

      rankedMatches.push(matchRecord);
    }
  }

  // Sort: highest total score first, then shortest distance
  rankedMatches.sort((a, b) => {
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score;
    }
    return a.distance_km - b.distance_km;
  });

  return rankedMatches;
}
