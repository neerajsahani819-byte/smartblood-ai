import { getDb } from '../database/db.js';
import { calculateDistanceKm } from '../utils/distance.js';

/**
 * Get donor profile
 */
export async function getDonorProfile(req, res) {
  try {
    const donorId = req.user.id;
    const db = await getDb();
    const donor = db.get(
      `SELECT id, name, email, blood_group, availability, verified, phone, area_name, location_lat, location_lng, created_at 
       FROM donors WHERE id = ?`,
      [donorId]
    );

    if (!donor) {
      return res.status(404).json({ error: 'Donor profile not found.' });
    }

    return res.json({
      donor: {
        ...donor,
        availability: donor.availability === 1,
        verified: donor.verified === 1
      }
    });
  } catch (err) {
    console.error('Get donor profile error:', err);
    return res.status(500).json({ error: 'Failed to retrieve donor profile.' });
  }
}

/**
 * Update donor profile (e.g. toggle availability, phone, area)
 */
export async function updateDonorProfile(req, res) {
  try {
    const donorId = req.user.id;
    const { availability, phone, area_name } = req.body;
    const db = await getDb();

    const donor = db.get(`SELECT * FROM donors WHERE id = ?`, [donorId]);
    if (!donor) {
      return res.status(404).json({ error: 'Donor not found.' });
    }

    const newAvail = availability !== undefined ? (availability ? 1 : 0) : donor.availability;
    const newPhone = phone !== undefined ? phone : donor.phone;
    const newArea = area_name !== undefined ? area_name : donor.area_name;

    db.run(
      `UPDATE donors SET availability = ?, phone = ?, area_name = ? WHERE id = ?`,
      [newAvail, newPhone, newArea, donorId]
    );

    const updated = db.get(
      `SELECT id, name, email, blood_group, availability, verified, phone, area_name, location_lat, location_lng, created_at 
       FROM donors WHERE id = ?`,
      [donorId]
    );

    return res.json({
      message: 'Profile updated successfully.',
      donor: {
        ...updated,
        availability: updated.availability === 1,
        verified: updated.verified === 1
      }
    });
  } catch (err) {
    console.error('Update donor profile error:', err);
    return res.status(500).json({ error: 'Failed to update donor profile.' });
  }
}

/**
 * Get donor notifications and emergency alerts
 */
export async function getDonorNotifications(req, res) {
  try {
    const donorId = req.user.id;
    const db = await getDb();

    const donor = db.get(`SELECT location_lat, location_lng FROM donors WHERE id = ?`, [donorId]);

    const notifications = db.all(
      `SELECT n.id as notification_id, n.message, n.status as notification_status, n.created_at as notification_time,
              r.id as request_id, r.blood_group, r.component, r.units_required, r.urgency, r.status as request_status, r.created_at as request_time,
              r.location_lat as req_lat, r.location_lng as req_lng,
              h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone,
              m.id as match_id, m.response_status as match_response_status, m.distance_km, m.total_score
       FROM notifications n
       JOIN emergency_requests r ON n.request_id = r.id
       JOIN hospitals h ON r.hospital_id = h.id
       LEFT JOIN matches m ON m.request_id = r.id AND m.donor_id = n.donor_id
       WHERE n.donor_id = ?
       ORDER BY n.created_at DESC`,
      [donorId]
    );

    const formatted = notifications.map(notif => {
      const distance = notif.distance_km || calculateDistanceKm(
        donor ? donor.location_lat : 0,
        donor ? donor.location_lng : 0,
        notif.req_lat,
        notif.req_lng
      );

      return {
        id: notif.notification_id,
        match_id: notif.match_id,
        request_id: notif.request_id,
        message: notif.message,
        status: notif.notification_status,
        match_response_status: notif.match_response_status || 'PENDING',
        created_at: notif.notification_time,
        hospital: {
          name: notif.hospital_name,
          address: notif.hospital_address,
          phone: notif.hospital_phone
        },
        request: {
          id: notif.request_id,
          blood_group: notif.blood_group,
          component: notif.component,
          units_required: notif.units_required,
          urgency: notif.urgency,
          status: notif.request_status,
          created_at: notif.request_time,
          distance_km: distance
        }
      };
    });

    return res.json({ notifications: formatted });
  } catch (err) {
    console.error('Get donor notifications error:', err);
    return res.status(500).json({ error: 'Failed to retrieve notifications.' });
  }
}

/**
 * Mark a notification as READ
 */
export async function markNotificationRead(req, res) {
  try {
    const donorId = req.user.id;
    const notifId = parseInt(req.params.id, 10);
    const db = await getDb();

    db.run(
      `UPDATE notifications SET status = 'READ' WHERE id = ? AND donor_id = ? AND status = 'UNREAD'`,
      [notifId, donorId]
    );

    return res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Mark notification read error:', err);
    return res.status(500).json({ error: 'Failed to update notification.' });
  }
}

/**
 * Donor responds ACCEPT or DECLINE to a match / notification
 */
export async function respondToMatch(req, res) {
  try {
    const donorId = req.user.id;
    const matchId = parseInt(req.params.id, 10);
    const { action } = req.body; // 'ACCEPT' or 'DECLINE'

    if (!['ACCEPT', 'DECLINE'].includes((action || '').toUpperCase())) {
      return res.status(400).json({ error: 'Action must be ACCEPT or DECLINE.' });
    }

    const statusValue = action.toUpperCase() === 'ACCEPT' ? 'ACCEPTED' : 'DECLINED';
    const db = await getDb();

    // Verify the match belongs to this donor, or find by notification/request ID
    let match = db.get(`SELECT * FROM matches WHERE id = ? AND donor_id = ?`, [matchId, donorId]);
    
    if (!match) {
      // Check if matchId was a request ID
      match = db.get(`SELECT * FROM matches WHERE request_id = ? AND donor_id = ?`, [matchId, donorId]);
    }

    if (!match) {
      // Check if matchId was a notification ID
      const notif = db.get(`SELECT * FROM notifications WHERE id = ? AND donor_id = ?`, [matchId, donorId]);
      if (notif) {
        match = db.get(`SELECT * FROM matches WHERE request_id = ? AND donor_id = ?`, [notif.request_id, donorId]);
        if (!match) {
          // Create match row on the fly
          const nowTime = new Date().toISOString();
          db.run(
            `INSERT INTO matches (request_id, donor_id, compatibility_score, distance_km, availability_score, urgency_score, total_score, response_status, created_at, updated_at)
             VALUES (?, ?, 1.0, 5.0, 1.0, 1.0, 95.0, 'NOTIFIED', ?, ?)`,
            [notif.request_id, donorId, nowTime, nowTime]
          );
          match = db.get(`SELECT * FROM matches WHERE request_id = ? AND donor_id = ?`, [notif.request_id, donorId]);
        }
      }
    }

    if (!match) {
      return res.status(404).json({ error: 'Matching emergency request not found for your account.' });
    }

    const now = new Date().toISOString();

    // 1. Update match response status
    db.run(
      `UPDATE matches SET response_status = ?, updated_at = ? WHERE id = ?`,
      [statusValue, now, match.id]
    );

    // 2. Update corresponding notification status
    db.run(
      `UPDATE notifications SET status = ? WHERE donor_id = ? AND request_id = ?`,
      [statusValue, donorId, match.request_id]
    );

    // 3. If accepted, check if emergency request status should be updated
    if (statusValue === 'ACCEPTED') {
      const acceptedCountRow = db.get(
        `SELECT COUNT(*) as count FROM matches WHERE request_id = ? AND response_status = 'ACCEPTED'`,
        [match.request_id]
      );
      const acceptedCount = acceptedCountRow ? acceptedCountRow.count : 0;

      const reqRow = db.get(`SELECT units_required, status FROM emergency_requests WHERE id = ?`, [match.request_id]);
      if (reqRow && reqRow.status === 'ACTIVE') {
        if (acceptedCount >= reqRow.units_required) {
          db.run(`UPDATE emergency_requests SET status = 'COMPLETED' WHERE id = ?`, [match.request_id]);
        } else if (acceptedCount > 0) {
          db.run(`UPDATE emergency_requests SET status = 'PARTIALLY_FILLED' WHERE id = ?`, [match.request_id]);
        }
      }
    }

    return res.json({
      message: `You have successfully ${statusValue.toLowerCase()} the emergency blood request.`,
      match_id: matchId,
      request_id: match.request_id,
      response_status: statusValue
    });
  } catch (err) {
    console.error('Respond to match error:', err);
    return res.status(500).json({ error: 'Failed to process donor response.' });
  }
}
