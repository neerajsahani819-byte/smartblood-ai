// scripts/migrateToFirestore.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

import { db } from '../src/firebase/config.js';
import { doc, setDoc, writeBatch, terminate } from 'firebase/firestore';
import { initDatabase } from '../backend/database/initDb.js';

async function migrateToFirestore() {
  console.log('🚀 Starting migration from SQLite to Firestore...');
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'smartblood-ai';
  console.log('📋 Project:', projectId);

  try {
    // 1. Initialize SQLite Database
    console.log('\n📦 Initializing and reading local SQLite database...');
    const sqliteDb = await initDatabase();

    // 2. Fetch all SQLite records
    const donors = sqliteDb.all('SELECT * FROM donors');
    const hospitals = sqliteDb.all('SELECT * FROM hospitals');
    const requests = sqliteDb.all('SELECT * FROM emergency_requests');
    const matches = sqliteDb.all('SELECT * FROM matches');
    const notifications = sqliteDb.all('SELECT * FROM notifications');

    console.log(`📊 Found records in SQLite:`);
    console.log(`   - Donors: ${donors.length}`);
    console.log(`   - Hospitals: ${hospitals.length}`);
    console.log(`   - Emergency Requests: ${requests.length}`);
    console.log(`   - Matches: ${matches.length}`);
    console.log(`   - Notifications: ${notifications.length}`);

    // 3. Migrate Donors
    console.log('\n🩸 Migrating Donors to Firestore...');
    const donorBatch = writeBatch(db);
    for (const donor of donors) {
      const docRef = doc(db, 'donors', donor.id.toString());
      donorBatch.set(docRef, {
        id: donor.id,
        name: donor.name,
        email: donor.email,
        blood_group: donor.blood_group,
        location: {
          lat: donor.location_lat,
          lng: donor.location_lng
        },
        availability: donor.availability === 1,
        verified: donor.verified === 1,
        phone: donor.phone || '',
        area_name: donor.area_name || '',
        created_at: donor.created_at
      });
    }
    await donorBatch.commit();
    console.log(`✅ ${donors.length} donors successfully migrated!`);

    // 4. Migrate Hospitals
    console.log('\n🏥 Migrating Hospitals to Firestore...');
    const hospitalBatch = writeBatch(db);
    for (const hospital of hospitals) {
      const docRef = doc(db, 'hospitals', hospital.id.toString());
      hospitalBatch.set(docRef, {
        id: hospital.id,
        name: hospital.name,
        email: hospital.email,
        location: {
          lat: hospital.location_lat,
          lng: hospital.location_lng
        },
        verified: hospital.verified === 1,
        phone: hospital.phone || '',
        address: hospital.address || '',
        created_at: hospital.created_at
      });
    }
    await hospitalBatch.commit();
    console.log(`✅ ${hospitals.length} hospitals successfully migrated!`);

    // 5. Migrate Emergency Requests
    console.log('\n🚨 Migrating Emergency Requests to Firestore...');
    const requestBatch = writeBatch(db);
    for (const req of requests) {
      const docRef = doc(db, 'emergency_requests', req.id.toString());
      requestBatch.set(docRef, {
        id: req.id,
        hospital_id: req.hospital_id,
        blood_group: req.blood_group,
        component: req.component,
        units_required: req.units_required,
        urgency: req.urgency,
        location: {
          lat: req.location_lat,
          lng: req.location_lng
        },
        status: req.status,
        notes: req.notes || '',
        created_at: req.created_at
      });
    }
    await requestBatch.commit();
    console.log(`✅ ${requests.length} emergency requests successfully migrated!`);

    // 6. Migrate Matches
    if (matches.length > 0) {
      console.log('\n⚡ Migrating Matches to Firestore...');
      const matchBatch = writeBatch(db);
      for (const m of matches) {
        const docRef = doc(db, 'matches', m.id.toString());
        matchBatch.set(docRef, {
          id: m.id,
          request_id: m.request_id,
          donor_id: m.donor_id,
          compatibility_status: m.compatibility_status,
          distance_km: m.distance_km,
          availability_score: m.availability_score,
          distance_score: m.distance_score,
          priority_score: m.priority_score,
          total_score: m.total_score,
          response_status: m.response_status,
          created_at: m.created_at,
          updated_at: m.updated_at
        });
      }
      await matchBatch.commit();
      console.log(`✅ ${matches.length} matches successfully migrated!`);
    }

    // 7. Migrate Notifications
    if (notifications.length > 0) {
      console.log('\n🔔 Migrating Notifications to Firestore...');
      const notifBatch = writeBatch(db);
      for (const n of notifications) {
        const docRef = doc(db, 'notifications', n.id.toString());
        notifBatch.set(docRef, {
          id: n.id,
          donor_id: n.donor_id,
          request_id: n.request_id,
          message: n.message,
          status: n.status,
          created_at: n.created_at
        });
      }
      await notifBatch.commit();
      console.log(`✅ ${notifications.length} notifications successfully migrated!`);
    }

    // 8. Migration status metadata
    const metaRef = doc(db, 'migration', 'status');
    await setDoc(metaRef, {
      completed_at: new Date().toISOString(),
      donors_count: donors.length,
      hospitals_count: hospitals.length,
      requests_count: requests.length,
      status: 'SUCCESS'
    });

    console.log('\n🎉 Full SQLite to Firestore migration completed successfully!');
    console.log('🔥 Check your Cloud Firestore database collections in the Firebase Console:');
    console.log('   - donors');
    console.log('   - hospitals');
    console.log('   - emergency_requests');
    console.log('   - matches');
    console.log('   - notifications');

    await terminate(db);
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('📋 Error details:', error);
  }
}

migrateToFirestore();