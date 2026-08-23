import { getDb } from '../database/db.js';
import { runMatchingEngine, getMatchesForRequest } from '../services/matchingService.js';
import { generateAiMatchInsights } from '../services/geminiService.js';

/**
 * Create a new emergency blood request
 */
export async function createEmergencyRequest(req, res) {
  try {
    const hospitalId = req.user.id;
    const { blood_group, component, units_required, urgency, location_lat, location_lng, notes } = req.body;

    if (!blood_group || !units_required) {
      return res.status(400).json({ error: 'Blood group and units required are mandatory fields.' });
    }

    const validUrgency = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const selectedUrgency = validUrgency.includes((urgency || '').toUpperCase())
      ? urgency.toUpperCase()
      : 'HIGH';

    const db = await getDb();
    const hospital = db.get(`SELECT * FROM hospitals WHERE id = ?`, [hospitalId]);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found.' });
    }

    const lat = location_lat ? parseFloat(location_lat) : hospital.location_lat;
    const lng = location_lng ? parseFloat(location_lng) : hospital.location_lng;
    const now = new Date().toISOString();

    const insertResult = db.run(
      `INSERT INTO emergency_requests 
       (hospital_id, blood_group, component, units_required, urgency, location_lat, location_lng, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        hospitalId,
        blood_group.toUpperCase().trim(),
        component || 'Whole Blood',
        parseInt(units_required, 10),
        selectedUrgency,
        lat,
        lng,
        'ACTIVE',
        notes || '',
        now
      ]
    );

    let requestId = insertResult.lastInsertRowid;
    if (!requestId || requestId === 0) {
      const latestReq = db.get(
        `SELECT id FROM emergency_requests WHERE hospital_id = ? ORDER BY id DESC LIMIT 1`,
        [hospitalId]
      );
      if (latestReq) {
        requestId = latestReq.id;
      }
    }

    if (!requestId) {
      throw new Error('Failed to retrieve newly created emergency request ID');
    }

    // Immediately trigger deterministic matching engine
    const matches = await runMatchingEngine(requestId);

    const createdRequest = db.get(
      `SELECT r.*, h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone 
       FROM emergency_requests r 
       JOIN hospitals h ON r.hospital_id = h.id 
       WHERE r.id = ?`,
      [requestId]
    );

    return res.status(201).json({
      message: 'Emergency request created and matched successfully.',
      request: createdRequest,
      matches_count: matches.length,
      matches: matches
    });
  } catch (err) {
    console.error('Create request error:', err);
    return res.status(500).json({ error: 'Failed to create emergency request.' });
  }
}

/**
 * Get all requests (for hospital dashboard or admin)
 */
export async function getRequests(req, res) {
  try {
    const db = await getDb();
    let requests;

    if (req.user.role === 'hospital') {
      requests = db.all(
        `SELECT r.*, h.name as hospital_name,
                (SELECT COUNT(*) FROM matches WHERE request_id = r.id) as total_matches,
                (SELECT COUNT(*) FROM matches WHERE request_id = r.id AND response_status = 'NOTIFIED') as notified_count,
                (SELECT COUNT(*) FROM matches WHERE request_id = r.id AND response_status = 'ACCEPTED') as accepted_count,
                (SELECT COUNT(*) FROM matches WHERE request_id = r.id AND response_status = 'DECLINED') as declined_count
         FROM emergency_requests r
         JOIN hospitals h ON r.hospital_id = h.id
         WHERE r.hospital_id = ?
         ORDER BY 
           CASE r.status WHEN 'ACTIVE' THEN 1 WHEN 'PARTIALLY_FILLED' THEN 2 ELSE 3 END,
           r.created_at DESC`,
        [req.user.id]
      );
    } else {
      // Admin or general view
      requests = db.all(
        `SELECT r.*, h.name as hospital_name,
                (SELECT COUNT(*) FROM matches WHERE request_id = r.id) as total_matches,
                (SELECT COUNT(*) FROM matches WHERE request_id = r.id AND response_status = 'ACCEPTED') as accepted_count
         FROM emergency_requests r
         JOIN hospitals h ON r.hospital_id = h.id
         ORDER BY r.created_at DESC`
      );
    }

    return res.json({ requests });
  } catch (err) {
    console.error('Get requests error:', err);
    return res.status(500).json({ error: 'Failed to retrieve requests.' });
  }
}

/**
 * Get request by ID
 */
export async function getRequestById(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const db = await getDb();

    const request = db.get(
      `SELECT r.*, h.name as hospital_name, h.address as hospital_address, h.phone as hospital_phone, h.email as hospital_email
       FROM emergency_requests r
       JOIN hospitals h ON r.hospital_id = h.id
       WHERE r.id = ?`,
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ error: 'Emergency request not found.' });
    }

    const matches = await getMatchesForRequest(requestId);

    const stats = {
      total_matches: matches.length,
      pending: matches.filter(m => m.response_status === 'PENDING').length,
      notified: matches.filter(m => m.response_status === 'NOTIFIED').length,
      accepted: matches.filter(m => m.response_status === 'ACCEPTED').length,
      declined: matches.filter(m => m.response_status === 'DECLINED').length
    };

    return res.json({
      request,
      matches,
      stats
    });
  } catch (err) {
    console.error('Get request by ID error:', err);
    return res.status(500).json({ error: 'Failed to retrieve request details.' });
  }
}

/**
 * Get ranked donor matches for a request
 */
export async function getRequestMatches(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const matches = await getMatchesForRequest(requestId);
    return res.json({ matches });
  } catch (err) {
    console.error('Get matches error:', err);
    return res.status(500).json({ error: 'Failed to retrieve matches.' });
  }
}

/**
 * Run / refresh matching engine for a request
 */
export async function recalculateMatches(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const matches = await runMatchingEngine(requestId);
    return res.json({ message: 'Matching engine recalculated successfully.', matches });
  } catch (err) {
    console.error('Recalculate matches error:', err);
    return res.status(500).json({ error: 'Failed to execute matching engine.' });
  }
}

/**
 * Get Gemini AI insights for an emergency request
 */
export async function getRequestAiInsights(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const db = await getDb();

    const request = db.get(
      `SELECT r.*, h.name as hospital_name 
       FROM emergency_requests r 
       JOIN hospitals h ON r.hospital_id = h.id 
       WHERE r.id = ?`,
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ error: 'Emergency request not found.' });
    }

    const matches = await getMatchesForRequest(requestId);
    const insights = await generateAiMatchInsights(request, matches);

    return res.json({ insights });
  } catch (err) {
    console.error('Get AI insights error:', err);
    return res.status(500).json({ error: 'Failed to generate AI insights.' });
  }
}

/**
 * Hospital notifies matched donors
 */
export async function notifyDonors(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { donor_ids } = req.body; // Optional array of specific donor IDs or notify top candidates
    const db = await getDb();

    const request = db.get(
      `SELECT r.*, h.name as hospital_name 
       FROM emergency_requests r 
       JOIN hospitals h ON r.hospital_id = h.id 
       WHERE r.id = ?`,
      [requestId]
    );

    if (!request) {
      return res.status(404).json({ error: 'Emergency request not found.' });
    }

    // Authorization check: only owning hospital or admin
    if (req.user.role === 'hospital' && request.hospital_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to dispatch notifications for this request.' });
    }

    const matches = await getMatchesForRequest(requestId);
    let targetMatches = matches;

    if (Array.isArray(donor_ids) && donor_ids.length > 0) {
      targetMatches = matches.filter(m => donor_ids.includes(m.donor_id));
    } else {
      // Default: Notify top available compatible donors who haven't accepted/declined yet
      targetMatches = matches.filter(m => m.response_status === 'PENDING' && m.availability);
      if (targetMatches.length === 0) {
        targetMatches = matches.filter(m => m.response_status === 'PENDING');
      }
    }

    const now = new Date().toISOString();
    let notifiedCount = 0;

    for (const match of targetMatches) {
      // 1. Update match response status to NOTIFIED
      db.run(
        `UPDATE matches SET response_status = 'NOTIFIED', updated_at = ? WHERE id = ?`,
        [now, match.match_id]
      );

      // 2. Create notification record for donor
      const message = `EMERGENCY ALERT: ${request.hospital_name} urgent need for ${request.units_required} unit(s) of ${request.blood_group} (${request.component}). Urgency: ${request.urgency}.`;

      // Check if notification already exists
      const existingNotif = db.get(
        `SELECT id FROM notifications WHERE donor_id = ? AND request_id = ?`,
        [match.donor_id, requestId]
      );

      if (!existingNotif) {
        db.run(
          `INSERT INTO notifications (donor_id, request_id, message, status, created_at)
           VALUES (?, ?, ?, 'UNREAD', ?)`,
          [match.donor_id, requestId, message, now]
        );
      }
      notifiedCount++;
    }

    const updatedMatches = await getMatchesForRequest(requestId);

    return res.json({
      message: `Successfully notified ${notifiedCount} candidate donor(s).`,
      notified_count: notifiedCount,
      matches: updatedMatches
    });
  } catch (err) {
    console.error('Notify donors error:', err);
    return res.status(500).json({ error: 'Failed to broadcast donor notifications.' });
  }
}

/**
 * Update request status (Hospital or Admin)
 */
export async function updateRequestStatus(req, res) {
  try {
    const requestId = parseInt(req.params.id, 10);
    const { status, units_required, notes } = req.body;
    const db = await getDb();

    const request = db.get(`SELECT * FROM emergency_requests WHERE id = ?`, [requestId]);
    if (!request) {
      return res.status(404).json({ error: 'Request not found.' });
    }

    if (req.user.role === 'hospital' && request.hospital_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to modify this request.' });
    }

    const newStatus = status || request.status;
    const newUnits = units_required ? parseInt(units_required, 10) : request.units_required;
    const newNotes = notes !== undefined ? notes : request.notes;

    db.run(
      `UPDATE emergency_requests 
       SET status = ?, units_required = ?, notes = ? 
       WHERE id = ?`,
      [newStatus, newUnits, newNotes, requestId]
    );

    const updated = db.get(`SELECT * FROM emergency_requests WHERE id = ?`, [requestId]);
    return res.json({ message: 'Request updated successfully.', request: updated });
  } catch (err) {
    console.error('Update request error:', err);
    return res.status(500).json({ error: 'Failed to update request.' });
  }
}
