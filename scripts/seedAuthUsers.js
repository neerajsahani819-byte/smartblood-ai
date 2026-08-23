// scripts/seedAuthUsers.js
import { auth, db } from '../backend/services/firebaseAdmin.js';

const testUsers = [
  {
    email: 'hospital@test.com',
    password: 'pass123',
    displayName: 'Metropolitan General Hospital',
    role: 'hospital',
    hospital_id: 1
  },
  {
    email: 'donor@test.com',
    password: 'pass123',
    displayName: 'John Doe (Demo Donor)',
    role: 'donor',
    donor_id: 1,
    blood_group: 'O-'
  },
  {
    email: 'admin@test.com',
    password: 'pass123',
    displayName: 'System Administrator',
    role: 'admin'
  }
];

async function seedUsers() {
  console.log('🚀 Seeding/Syncing Firebase Auth users and Firestore user profiles...');

  for (const u of testUsers) {
    try {
      let userRecord;
      try {
        userRecord = await auth.getUserByEmail(u.email);
        console.log(`ℹ️ User ${u.email} already exists in Firebase Auth (UID: ${userRecord.uid}). Updating password...`);
        await auth.updateUser(userRecord.uid, {
          password: u.password,
          displayName: u.displayName
        });
      } catch (err) {
        if (err.code === 'auth/user-not-found') {
          console.log(`➕ Creating user in Firebase Auth: ${u.email}...`);
          userRecord = await auth.createUser({
            email: u.email,
            password: u.password,
            displayName: u.displayName
          });
          console.log(`✅ Created ${u.email} (UID: ${userRecord.uid})`);
        } else {
          throw err;
        }
      }

      // Save user role and metadata to Firestore `users` collection
      const userDocRef = db.collection('users').doc(userRecord.uid);
      await userDocRef.set({
        uid: userRecord.uid,
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        ...(u.hospital_id ? { hospital_id: u.hospital_id } : {}),
        ...(u.donor_id ? { donor_id: u.donor_id } : {}),
        ...(u.blood_group ? { blood_group: u.blood_group } : {}),
        updated_at: new Date().toISOString()
      }, { merge: true });

      console.log(`✅ Saved Firestore profile for ${u.email} with role: "${u.role}"`);
    } catch (error) {
      console.error(`❌ Error setting up ${u.email}:`, error.message);
    }
  }

  console.log('\n🎉 Test users ready in Firebase Auth & Firestore:');
  console.log('   1. hospital@test.com / pass123 (Role: hospital)');
  console.log('   2. donor@test.com / pass123 (Role: donor)');
  console.log('   3. admin@test.com / pass123 (Role: admin)');
  process.exit(0);
}

seedUsers();
