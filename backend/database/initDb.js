import bcrypt from 'bcryptjs';
import { getDb } from './db.js';

export async function initDatabase() {
  const db = await getDb();

  // Create tables if they do not exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS donors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      blood_group TEXT NOT NULL,
      location_lat REAL NOT NULL,
      location_lng REAL NOT NULL,
      availability INTEGER NOT NULL DEFAULT 1,
      verified INTEGER NOT NULL DEFAULT 1,
      phone TEXT,
      area_name TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS hospitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      location_lat REAL NOT NULL,
      location_lng REAL NOT NULL,
      verified INTEGER NOT NULL DEFAULT 1,
      phone TEXT,
      address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS emergency_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hospital_id INTEGER NOT NULL,
      blood_group TEXT NOT NULL,
      component TEXT NOT NULL,
      units_required INTEGER NOT NULL,
      urgency TEXT NOT NULL,
      location_lat REAL NOT NULL,
      location_lng REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (hospital_id) REFERENCES hospitals(id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      donor_id INTEGER NOT NULL,
      compatibility_status TEXT NOT NULL,
      distance_km REAL NOT NULL,
      availability_score REAL NOT NULL,
      distance_score REAL NOT NULL,
      priority_score REAL NOT NULL,
      total_score REAL NOT NULL,
      response_status TEXT NOT NULL DEFAULT 'PENDING',
      created_at TEXT NOT NULL,
      updated_at TEXT,
      FOREIGN KEY (request_id) REFERENCES emergency_requests(id),
      FOREIGN KEY (donor_id) REFERENCES donors(id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_id INTEGER NOT NULL,
      request_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'UNREAD',
      created_at TEXT NOT NULL,
      FOREIGN KEY (donor_id) REFERENCES donors(id),
      FOREIGN KEY (request_id) REFERENCES emergency_requests(id)
    );

    CREATE INDEX IF NOT EXISTS idx_donors_blood ON donors(blood_group, availability);
    CREATE INDEX IF NOT EXISTS idx_requests_hospital ON emergency_requests(hospital_id);
    CREATE INDEX IF NOT EXISTS idx_matches_req ON matches(request_id);
    CREATE INDEX IF NOT EXISTS idx_matches_donor ON matches(donor_id);
    CREATE INDEX IF NOT EXISTS idx_notifs_donor ON notifications(donor_id);
  `);

  // Check if donors table is empty to seed initial fictional data
  const existingDonors = db.all("SELECT id FROM donors LIMIT 1");
  if (existingDonors.length === 0) {
    console.log('[SmartBlood DB] Seeding initial fictional data into SQLite...');
    const defaultPasswordHash = bcrypt.hashSync('password123', 10);
    const now = new Date().toISOString();

    // 10 Fictional Donors (Metro NYC Coordinates around 40.71 ~ 40.76)
    const donors = [
      { name: 'John Doe (Fictional)', email: 'john.donor@example.com', blood_group: 'O-', lat: 40.7282, lng: -73.9942, avail: 1, ver: 1, phone: '+1-555-0101', area: 'Greenwich Village' },
      { name: 'Sarah Jenkins (Fictional)', email: 'sarah.donor@example.com', blood_group: 'O+', lat: 40.7418, lng: -73.9893, avail: 1, ver: 1, phone: '+1-555-0102', area: 'Flatiron District' },
      { name: 'Michael Chang (Fictional)', email: 'michael.donor@example.com', blood_group: 'A+', lat: 40.7155, lng: -73.9970, avail: 1, ver: 1, phone: '+1-555-0103', area: 'Chinatown' },
      { name: 'Emily Rodriguez (Fictional)', email: 'emily.donor@example.com', blood_group: 'A-', lat: 40.7505, lng: -73.9934, avail: 1, ver: 1, phone: '+1-555-0104', area: 'Chelsea' },
      { name: 'David Patel (Fictional)', email: 'david.donor@example.com', blood_group: 'B+', lat: 40.7614, lng: -73.9776, avail: 1, ver: 1, phone: '+1-555-0105', area: 'Midtown East' },
      { name: 'Amanda Smith (Fictional)', email: 'amanda.donor@example.com', blood_group: 'B-', lat: 40.7210, lng: -73.9850, avail: 0, ver: 1, phone: '+1-555-0106', area: 'Lower East Side' },
      { name: 'Robert Taylor (Fictional)', email: 'robert.donor@example.com', blood_group: 'AB+', lat: 40.7680, lng: -73.9640, avail: 1, ver: 1, phone: '+1-555-0107', area: 'Upper East Side' },
      { name: 'Lisa Wang (Fictional)', email: 'lisa.donor@example.com', blood_group: 'AB-', lat: 40.7812, lng: -73.9740, avail: 1, ver: 0, phone: '+1-555-0108', area: 'Upper West Side' },
      { name: 'James Wilson (Fictional)', email: 'james.donor@example.com', blood_group: 'O-', lat: 40.7350, lng: -73.9910, avail: 1, ver: 1, phone: '+1-555-0109', area: 'Gramercy' },
      { name: 'Elena Vasquez (Fictional)', email: 'elena.donor@example.com', blood_group: 'O+', lat: 40.7070, lng: -74.0090, avail: 0, ver: 1, phone: '+1-555-0110', area: 'Financial District' }
    ];

    for (const d of donors) {
      db.run(
        `INSERT INTO donors (name, email, password_hash, blood_group, location_lat, location_lng, availability, verified, phone, area_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [d.name, d.email, defaultPasswordHash, d.blood_group, d.lat, d.lng, d.avail, d.ver, d.phone, d.area, now]
      );
    }

    // 3 Fictional Hospitals
    const hospitals = [
      { name: 'Metropolitan General Hospital', email: 'metro.hospital@example.com', lat: 40.7306, lng: -73.9352, ver: 1, phone: '+1-555-9001', address: '450 1st Avenue, Manhattan, NY' },
      { name: 'St. Jude Emergency Trauma Center', email: 'stjude.hospital@example.com', lat: 40.7589, lng: -73.9851, ver: 1, phone: '+1-555-9002', address: '780 Broadway, Manhattan, NY' },
      { name: 'City Trauma & Surgical Institute', email: 'citytrauma.hospital@example.com', lat: 40.7128, lng: -74.0060, ver: 1, phone: '+1-555-9003', address: '120 Park Row, Manhattan, NY' }
    ];

    for (const h of hospitals) {
      db.run(
        `INSERT INTO hospitals (name, email, password_hash, location_lat, location_lng, verified, phone, address, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [h.name, h.email, defaultPasswordHash, h.lat, h.lng, h.ver, h.phone, h.address, now]
      );
    }

    // 5 Fictional Emergency Requests
    const requests = [
      {
        hospital_id: 1,
        blood_group: 'O-',
        component: 'Whole Blood',
        units: 3,
        urgency: 'CRITICAL',
        lat: 40.7306,
        lng: -73.9352,
        status: 'ACTIVE',
        notes: 'Mass casualty trauma emergency in ICU bay 3. Immediate whole blood transfusion needed.'
      },
      {
        hospital_id: 2,
        blood_group: 'A+',
        component: 'Packed Red Blood Cells',
        units: 2,
        urgency: 'HIGH',
        lat: 40.7589,
        lng: -73.9851,
        status: 'ACTIVE',
        notes: 'Scheduled bypass surgery requiring supplemental PRBC reserves.'
      },
      {
        hospital_id: 3,
        blood_group: 'B+',
        component: 'Platelets',
        units: 4,
        urgency: 'CRITICAL',
        lat: 40.7128,
        lng: -74.0060,
        status: 'PARTIALLY_FILLED',
        notes: 'Severe thrombocytopenia patient in oncology urgent care.'
      },
      {
        hospital_id: 1,
        blood_group: 'AB+',
        component: 'Fresh Frozen Plasma',
        units: 2,
        urgency: 'MEDIUM',
        lat: 40.7306,
        lng: -73.9352,
        status: 'COMPLETED',
        notes: 'Coagulation support for post-operative recovery. Requirement fulfilled.'
      },
      {
        hospital_id: 2,
        blood_group: 'O+',
        component: 'Whole Blood',
        units: 1,
        urgency: 'LOW',
        lat: 40.7589,
        lng: -73.9851,
        status: 'CANCELLED',
        notes: 'Elective procedure postponed by attending physician.'
      }
    ];

    for (const r of requests) {
      db.run(
        `INSERT INTO emergency_requests (hospital_id, blood_group, component, units_required, urgency, location_lat, location_lng, status, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.hospital_id, r.blood_group, r.component, r.units, r.urgency, r.lat, r.lng, r.status, r.notes, now]
      );
    }

    console.log('[SmartBlood DB] Database initialized and seeded successfully with 10 donors, 3 hospitals, 5 requests.');
  }

  return db;
}
