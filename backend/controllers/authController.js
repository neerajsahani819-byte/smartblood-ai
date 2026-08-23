import bcrypt from 'bcryptjs';
import { getDb } from '../database/db.js';
import { generateToken } from '../middleware/auth.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@smartblood.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

/**
 * Hospital login
 */
export async function hospitalLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = await getDb();
    const hospital = db.get(`SELECT * FROM hospitals WHERE LOWER(email) = LOWER(?)`, [email.trim()]);

    if (!hospital) {
      return res.status(401).json({ error: 'Invalid hospital email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, hospital.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid hospital email or password.' });
    }

    const token = generateToken({
      id: hospital.id,
      email: hospital.email,
      name: hospital.name,
      role: 'hospital',
      verified: hospital.verified === 1
    });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: hospital.id,
        name: hospital.name,
        email: hospital.email,
        role: 'hospital',
        verified: hospital.verified === 1,
        address: hospital.address,
        phone: hospital.phone,
        location_lat: hospital.location_lat,
        location_lng: hospital.location_lng
      }
    });
  } catch (err) {
    console.error('Hospital login error:', err);
    return res.status(500).json({ error: 'Internal server error during hospital login.' });
  }
}

/**
 * Donor login
 */
export async function donorLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const db = await getDb();
    const donor = db.get(`SELECT * FROM donors WHERE LOWER(email) = LOWER(?)`, [email.trim()]);

    if (!donor) {
      return res.status(401).json({ error: 'Invalid donor email or password.' });
    }

    const isMatch = bcrypt.compareSync(password, donor.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid donor email or password.' });
    }

    const token = generateToken({
      id: donor.id,
      email: donor.email,
      name: donor.name,
      blood_group: donor.blood_group,
      role: 'donor',
      verified: donor.verified === 1
    });

    return res.json({
      message: 'Login successful',
      token,
      user: {
        id: donor.id,
        name: donor.name,
        email: donor.email,
        blood_group: donor.blood_group,
        availability: donor.availability === 1,
        verified: donor.verified === 1,
        phone: donor.phone,
        area_name: donor.area_name,
        role: 'donor'
      }
    });
  } catch (err) {
    console.error('Donor login error:', err);
    return res.status(500).json({ error: 'Internal server error during donor login.' });
  }
}

/**
 * Donor registration
 */
export async function donorRegister(req, res) {
  try {
    const { name, email, password, blood_group, location_lat, location_lng, area_name, phone, availability } = req.body;

    if (!name || !email || !password || !blood_group) {
      return res.status(400).json({ error: 'Name, email, password, and blood group are required.' });
    }

    const validBloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    if (!validBloodGroups.includes(blood_group.toUpperCase().trim())) {
      return res.status(400).json({ error: 'Invalid blood group. Must be one of: ' + validBloodGroups.join(', ') });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const db = await getDb();
    const existing = db.get(`SELECT id FROM donors WHERE LOWER(email) = LOWER(?)`, [email.trim()]);
    if (existing) {
      return res.status(409).json({ error: 'A donor with this email address already exists.' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const now = new Date().toISOString();
    const lat = location_lat ? parseFloat(location_lat) : 40.7300;
    const lng = location_lng ? parseFloat(location_lng) : -73.9900;
    const avail = availability === false || availability === 0 ? 0 : 1;

    const result = db.run(
      `INSERT INTO donors (name, email, password_hash, blood_group, location_lat, location_lng, availability, verified, phone, area_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name.trim(), email.trim(), password_hash, blood_group.toUpperCase().trim(), lat, lng, avail, 1, phone || '', area_name || 'Metropolitan Area', now]
    );

    let newId = result.lastInsertRowid;
    if (!newId) {
      const dRow = db.get(`SELECT id FROM donors WHERE LOWER(email) = LOWER(?)`, [email.trim()]);
      if (dRow) newId = dRow.id;
    }

    const token = generateToken({
      id: newId,
      email: email.trim(),
      name: name.trim(),
      blood_group: blood_group.toUpperCase().trim(),
      role: 'donor',
      verified: true
    });

    return res.status(201).json({
      message: 'Donor account registered successfully',
      token,
      user: {
        id: newId,
        name: name.trim(),
        email: email.trim(),
        blood_group: blood_group.toUpperCase().trim(),
        availability: avail === 1,
        verified: true,
        phone: phone || '',
        area_name: area_name || 'Metropolitan Area',
        role: 'donor'
      }
    });
  } catch (err) {
    console.error('Donor registration error:', err);
    return res.status(500).json({ error: 'Failed to register donor account.' });
  }
}

/**
 * Admin login
 */
export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Admin email and password are required.' });
    }

    if (email.trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
      const token = generateToken({
        id: 0,
        email: ADMIN_EMAIL,
        name: 'System Administrator',
        role: 'admin',
        verified: true
      });

      return res.json({
        message: 'Admin login successful',
        token,
        user: {
          id: 0,
          name: 'System Administrator',
          email: ADMIN_EMAIL,
          role: 'admin',
          verified: true
        }
      });
    }

    return res.status(401).json({ error: 'Invalid administrator credentials.' });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Internal server error during admin login.' });
  }
}

/**
 * Get profile for authenticated user
 */
export async function getMe(req, res) {
  try {
    const { id, role } = req.user;
    const db = await getDb();

    if (role === 'hospital') {
      const hospital = db.get(`SELECT id, name, email, location_lat, location_lng, verified, phone, address FROM hospitals WHERE id = ?`, [id]);
      if (!hospital) return res.status(404).json({ error: 'Hospital not found' });
      return res.json({ user: { ...hospital, role: 'hospital', verified: hospital.verified === 1 } });
    } else if (role === 'donor') {
      const donor = db.get(`SELECT id, name, email, blood_group, availability, verified, phone, area_name FROM donors WHERE id = ?`, [id]);
      if (!donor) return res.status(404).json({ error: 'Donor not found' });
      return res.json({ user: { ...donor, role: 'donor', availability: donor.availability === 1, verified: donor.verified === 1 } });
    } else if (role === 'admin') {
      return res.json({ user: { id: 0, name: 'System Administrator', email: ADMIN_EMAIL, role: 'admin', verified: true } });
    }

    return res.status(400).json({ error: 'Unknown role' });
  } catch (err) {
    console.error('Get profile error:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile data.' });
  }
}
