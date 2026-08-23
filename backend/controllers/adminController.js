import { getDb } from '../database/db.js';

/**
 * Get system-wide metrics and activity log for Admin
 */
export async function getAdminStats(req, res) {
  try {
    const db = await getDb();

    const donorsTotal = db.get(`SELECT COUNT(*) as count FROM donors`)?.count || 0;
    const donorsAvailable = db.get(`SELECT COUNT(*) as count FROM donors WHERE availability = 1`)?.count || 0;
    const hospitalsTotal = db.get(`SELECT COUNT(*) as count FROM hospitals`)?.count || 0;
    const hospitalsVerified = db.get(`SELECT COUNT(*) as count FROM hospitals WHERE verified = 1`)?.count || 0;
    const requestsActive = db.get(`SELECT COUNT(*) as count FROM emergency_requests WHERE status IN ('ACTIVE', 'PARTIALLY_FILLED')`)?.count || 0;
    const requestsCompleted = db.get(`SELECT COUNT(*) as count FROM emergency_requests WHERE status = 'COMPLETED'`)?.count || 0;
    const matchesTotal = db.get(`SELECT COUNT(*) as count FROM matches`)?.count || 0;
    const matchesAccepted = db.get(`SELECT COUNT(*) as count FROM matches WHERE response_status = 'ACCEPTED'`)?.count || 0;

    // Recent requests
    const recentRequests = db.all(
      `SELECT r.*, h.name as hospital_name,
              (SELECT COUNT(*) FROM matches WHERE request_id = r.id) as match_count,
              (SELECT COUNT(*) FROM matches WHERE request_id = r.id AND response_status = 'ACCEPTED') as accepted_count
       FROM emergency_requests r
       JOIN hospitals h ON r.hospital_id = h.id
       ORDER BY r.created_at DESC
       LIMIT 10`
    );

    // Recent matches activity
    const recentMatches = db.all(
      `SELECT m.*, d.name as donor_name, d.blood_group as donor_blood_group,
              h.name as hospital_name, r.blood_group as req_blood_group, r.urgency
       FROM matches m
       JOIN donors d ON m.donor_id = d.id
       JOIN emergency_requests r ON m.request_id = r.id
       JOIN hospitals h ON r.hospital_id = h.id
       ORDER BY m.updated_at DESC
       LIMIT 15`
    );

    return res.json({
      stats: {
        total_donors: donorsTotal,
        available_donors: donorsAvailable,
        total_hospitals: hospitalsTotal,
        verified_hospitals: hospitalsVerified,
        active_requests: requestsActive,
        completed_requests: requestsCompleted,
        total_matches: matchesTotal,
        successful_matches: matchesAccepted
      },
      recent_requests: recentRequests,
      recent_matches: recentMatches
    });
  } catch (err) {
    console.error('Get admin stats error:', err);
    return res.status(500).json({ error: 'Failed to retrieve administrative statistics.' });
  }
}

/**
 * Get all registered donors
 */
export async function getAllDonors(req, res) {
  try {
    const db = await getDb();
    const donors = db.all(
      `SELECT id, name, email, blood_group, location_lat, location_lng, availability, verified, phone, area_name, created_at
       FROM donors
       ORDER BY created_at DESC`
    );

    return res.json({
      donors: donors.map(d => ({
        ...d,
        availability: d.availability === 1,
        verified: d.verified === 1
      }))
    });
  } catch (err) {
    console.error('Get all donors error:', err);
    return res.status(500).json({ error: 'Failed to retrieve donors list.' });
  }
}

/**
 * Get all registered hospitals
 */
export async function getAllHospitals(req, res) {
  try {
    const db = await getDb();
    const hospitals = db.all(
      `SELECT id, name, email, location_lat, location_lng, verified, phone, address, created_at,
              (SELECT COUNT(*) FROM emergency_requests WHERE hospital_id = hospitals.id) as request_count
       FROM hospitals
       ORDER BY created_at DESC`
    );

    return res.json({
      hospitals: hospitals.map(h => ({
        ...h,
        verified: h.verified === 1
      }))
    });
  } catch (err) {
    console.error('Get all hospitals error:', err);
    return res.status(500).json({ error: 'Failed to retrieve hospitals list.' });
  }
}

/**
 * Toggle donor verification status
 */
export async function toggleDonorVerification(req, res) {
  try {
    const donorId = parseInt(req.params.id, 10);
    const db = await getDb();

    const donor = db.get(`SELECT verified FROM donors WHERE id = ?`, [donorId]);
    if (!donor) return res.status(404).json({ error: 'Donor not found.' });

    const newStatus = donor.verified === 1 ? 0 : 1;
    db.run(`UPDATE donors SET verified = ? WHERE id = ?`, [newStatus, donorId]);

    return res.json({ message: 'Donor verification updated.', verified: newStatus === 1 });
  } catch (err) {
    console.error('Toggle donor verification error:', err);
    return res.status(500).json({ error: 'Failed to toggle donor verification.' });
  }
}

/**
 * Toggle hospital verification status
 */
export async function toggleHospitalVerification(req, res) {
  try {
    const hospitalId = parseInt(req.params.id, 10);
    const db = await getDb();

    const hospital = db.get(`SELECT verified FROM hospitals WHERE id = ?`, [hospitalId]);
    if (!hospital) return res.status(404).json({ error: 'Hospital not found.' });

    const newStatus = hospital.verified === 1 ? 0 : 1;
    db.run(`UPDATE hospitals SET verified = ? WHERE id = ?`, [newStatus, hospitalId]);

    return res.json({ message: 'Hospital verification updated.', verified: newStatus === 1 });
  } catch (err) {
    console.error('Toggle hospital verification error:', err);
    return res.status(500).json({ error: 'Failed to toggle hospital verification.' });
  }
}
