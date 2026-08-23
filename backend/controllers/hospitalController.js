import { getDb } from '../database/db.js';

/**
 * Get Hospital Dashboard Overview
 */
export async function getHospitalDashboard(req, res) {
  try {
    const hospitalId = req.user.id;
    const db = await getDb();

    const hospital = db.get(
      `SELECT id, name, email, location_lat, location_lng, verified, phone, address FROM hospitals WHERE id = ?`,
      [hospitalId]
    );

    if (!hospital) {
      return res.status(404).json({ error: 'Hospital record not found.' });
    }

    // Active requests with response breakdown
    const activeRequests = db.all(
      `SELECT r.*,
              (SELECT COUNT(*) FROM matches WHERE request_id = r.id) as total_matches,
              (SELECT COUNT(*) FROM matches WHERE request_id = r.id AND response_status = 'NOTIFIED') as notified_count,
              (SELECT COUNT(*) FROM matches WHERE request_id = r.id AND response_status = 'ACCEPTED') as accepted_count,
              (SELECT COUNT(*) FROM matches WHERE request_id = r.id AND response_status = 'DECLINED') as declined_count
       FROM emergency_requests r
       WHERE r.hospital_id = ? AND r.status IN ('ACTIVE', 'PARTIALLY_FILLED')
       ORDER BY r.created_at DESC`,
      [hospitalId]
    );

    // Completed/Cancelled requests
    const historicalRequests = db.all(
      `SELECT r.*,
              (SELECT COUNT(*) FROM matches WHERE request_id = r.id) as total_matches,
              (SELECT COUNT(*) FROM matches WHERE request_id = r.id AND response_status = 'ACCEPTED') as accepted_count
       FROM emergency_requests r
       WHERE r.hospital_id = ? AND r.status IN ('COMPLETED', 'CANCELLED')
       ORDER BY r.created_at DESC`,
      [hospitalId]
    );

    // Recent accepted donors
    const recentAccepted = db.all(
      `SELECT m.id as match_id, m.request_id, m.response_status, m.distance_km, m.total_score, m.updated_at,
              d.name as donor_name, d.blood_group as donor_blood_group, d.phone as donor_phone, d.area_name,
              r.blood_group as req_blood_group, r.component as req_component, r.urgency as req_urgency
       FROM matches m
       JOIN emergency_requests r ON m.request_id = r.id
       JOIN donors d ON m.donor_id = d.id
       WHERE r.hospital_id = ? AND m.response_status = 'ACCEPTED'
       ORDER BY m.updated_at DESC
       LIMIT 10`,
      [hospitalId]
    );

    // Summary statistics
    const stats = {
      active_requests_count: activeRequests.length,
      completed_requests_count: historicalRequests.filter(r => r.status === 'COMPLETED').length,
      total_accepted_donors: recentAccepted.length,
      pending_responses_count: activeRequests.reduce((acc, r) => acc + (r.notified_count || 0), 0)
    };

    return res.json({
      hospital,
      stats,
      active_requests: activeRequests,
      historical_requests: historicalRequests,
      recent_accepted: recentAccepted
    });
  } catch (err) {
    console.error('Get hospital dashboard error:', err);
    return res.status(500).json({ error: 'Failed to load hospital dashboard data.' });
  }
}
