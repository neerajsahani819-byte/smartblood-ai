import { getDb } from '../database/db.js';
import { checkBloodCompatibility } from '../utils/bloodCompatibility.js';
import { calculateDistanceKm } from '../utils/distance.js';
import { MATCH_WEIGHTS, MAX_DISTANCE_KM, URGENCY_SCORES } from '../config/matchingConfig.js';

/**
 * Execute deterministic matching and scoring for an emergency request.
 * Saves or updates records in the matches table in SQLite.
 * @param {number} requestId 
 * @returns {Promise<Array<object>>} Ranked list of matched donors
 */
export async function runMatchingEngine(requestId) {
  const db = await getDb();

  const request = db.get(
    `SELECT r.*, h.name as hospital_name, h.location_lat as h_lat, h.location_lng as h_lng 
     FROM emergency_requests r 
     JOIN hospitals h ON r.hospital_id = h.id 
     WHERE r.id = ?`,
    [requestId]
  );

  if (!request) {
    throw new Error(`Emergency request #${requestId} not found`);
  }

  const reqLat = request.location_lat || request.h_lat;
  const reqLng = request.location_lng || request.h_lng;

  // Retrieve all registered donors
  const donors = db.all(`SELECT * FROM donors`);
  const now = new Date().toISOString();

  const rankedMatches = [];

  for (const donor of donors) {
    // 1. Compatibility check (Deterministic)
    const compatResult = checkBloodCompatibility(
      request.blood_group,
      donor.blood_group,
      request.component
    );

    // Skip totally incompatible donors from ranked recommendation table or give 0 compatibility
    const compatScore = compatResult.score;

    // 2. Availability score
    const availScore = donor.availability === 1 ? 100 : 0;

    // 3. Distance calculation & score
    const distanceKm = calculateDistanceKm(
      reqLat,
      reqLng,
      donor.location_lat,
      donor.location_lng
    );

    // Distance score: 100 at 0km, decreases linearly to 0 at MAX_DISTANCE_KM (30km)
    let distScore = 0;
    if (distanceKm <= MAX_DISTANCE_KM) {
      distScore = Math.max(0, Math.round(100 - (distanceKm / MAX_DISTANCE_KM) * 100));
    }

    // 4. Urgency/Priority score
    const urgencyKey = (request.urgency || 'HIGH').toUpperCase();
    const priorityScore = URGENCY_SCORES[urgencyKey] || 70;

    // 5. Total deterministic weighted score
    const totalScore = Math.round(
      compatScore * MATCH_WEIGHTS.compatibility +
      availScore * MATCH_WEIGHTS.availability +
      distScore * MATCH_WEIGHTS.distance +
      priorityScore * MATCH_WEIGHTS.priority
    );

    const compatibilityStatus = compatResult.compatible ? 'COMPATIBLE' : 'INCOMPATIBLE';

    // Only store/rank compatible donors
    if (compatResult.compatible) {
      // Check if match already exists in database
      const existingMatch = db.get(
        `SELECT id, response_status FROM matches WHERE request_id = ? AND donor_id = ?`,
        [requestId, donor.id]
      );

      let matchId;
      let responseStatus = 'PENDING';

      if (existingMatch) {
        matchId = existingMatch.id;
        responseStatus = existingMatch.response_status;
        db.run(
          `UPDATE matches 
           SET compatibility_status = ?, distance_km = ?, availability_score = ?, 
               distance_score = ?, priority_score = ?, total_score = ?, updated_at = ? 
           WHERE id = ?`,
          [
            compatibilityStatus,
            distanceKm,
            availScore,
            distScore,
            priorityScore,
            totalScore,
            now,
            matchId
          ]
        );
      } else {
        const res = db.run(
          `INSERT INTO matches 
           (request_id, donor_id, compatibility_status, distance_km, availability_score, distance_score, priority_score, total_score, response_status, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            requestId,
            donor.id,
            compatibilityStatus,
            distanceKm,
            availScore,
            distScore,
            priorityScore,
            totalScore,
            'PENDING',
            now,
            now
          ]
        );
        matchId = res.lastInsertRowid;
        if (!matchId) {
          const mRow = db.get(`SELECT id FROM matches WHERE request_id = ? AND donor_id = ?`, [requestId, donor.id]);
          if (mRow) matchId = mRow.id;
        }
      }

      rankedMatches.push({
        match_id: matchId,
        request_id: requestId,
        donor_id: donor.id,
        donor_name: donor.name,
        donor_blood_group: donor.blood_group,
        donor_phone: donor.phone,
        donor_area: donor.area_name || 'Nearby Zone',
        distance_km: distanceKm,
        availability: donor.availability === 1,
        verified: donor.verified === 1,
        compatibility_status: compatibilityStatus,
        compatibility_note: compatResult.note,
        compatibility_score: compatScore,
        availability_score: availScore,
        distance_score: distScore,
        priority_score: priorityScore,
        total_score: totalScore,
        response_status: responseStatus
      });
    }
  }

  // Rank by total score descending, then by distance ascending
  rankedMatches.sort((a, b) => {
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score;
    }
    return a.distance_km - b.distance_km;
  });

  return rankedMatches;
}

/**
 * Get existing ranked matches for a request
 * @param {number} requestId 
 */
export async function getMatchesForRequest(requestId) {
  const db = await getDb();

  const rows = db.all(
    `SELECT m.*, d.name as donor_name, d.blood_group as donor_blood_group, 
            d.availability as donor_availability, d.verified as donor_verified,
            d.phone as donor_phone, d.area_name as donor_area
     FROM matches m
     JOIN donors d ON m.donor_id = d.id
     WHERE m.request_id = ?
     ORDER BY m.total_score DESC, m.distance_km ASC`,
    [requestId]
  );

  if (rows.length === 0) {
    // Run matching engine if no matches exist yet
    return await runMatchingEngine(requestId);
  }

  return rows.map(r => ({
    match_id: r.id,
    request_id: r.request_id,
    donor_id: r.donor_id,
    donor_name: r.donor_name,
    donor_blood_group: r.donor_blood_group,
    donor_phone: r.donor_phone,
    donor_area: r.donor_area || 'Nearby Zone',
    distance_km: r.distance_km,
    availability: r.donor_availability === 1,
    verified: r.donor_verified === 1,
    compatibility_status: r.compatibility_status,
    compatibility_score: r.compatibility_status === 'COMPATIBLE' ? 100 : 0,
    availability_score: r.availability_score,
    distance_score: r.distance_score,
    priority_score: r.priority_score,
    total_score: r.total_score,
    response_status: r.response_status
  }));
}
