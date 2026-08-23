// backend/utils/testFirebase.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { db, auth, loginWithEmail } from '../firebase/config.js';
import { doc, setDoc, getDoc, deleteDoc, terminate } from 'firebase/firestore';

async function testFirebase() {
    console.log('🚀 Testing Firebase connection...');
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'smartblood-ai';
    console.log('📋 Project:', projectId);

    try {
        // Test 1: Firestore Write
        console.log('\n📝 Testing Firestore write...');
        const testRef = doc(db, 'tests', 'test-connection');
        await setDoc(testRef, {
            message: 'Firebase is working!',
            timestamp: new Date().toISOString(),
            testId: 'connection-test-001'
        });
        console.log('✅ Firestore write successful!');

        // Test 2: Firestore Read
        console.log('\n📖 Testing Firestore read...');
        const docSnap = await getDoc(testRef);
        if (docSnap.exists()) {
            console.log('✅ Firestore read successful:', docSnap.data());
        } else {
            console.log('❌ Document not found!');
        }

        // Test 3: Firestore Delete
        console.log('\n🗑️ Testing Firestore delete...');
        await deleteDoc(testRef);
        console.log('✅ Firestore delete successful!');

        // Test 4: Authentication
        console.log('\n🔐 Testing Authentication...');
        try {
            const userCredential = await loginWithEmail('donor@test.com', 'pass123');
            console.log('✅ Authentication successful!');
            console.log('👤 User:', userCredential.user.email);
            console.log('🆔 UID:', userCredential.user.uid);
        } catch (authError) {
            console.log('⚠️ Auth test:', authError.message);
            console.log('💡 Make sure test users exist in Firebase Console');
            console.log('   Create: donor@test.com / password123');
        }

        console.log('\n🎉 All Firebase tests completed!');
        console.log('✅ Firebase is ready for SmartBlood AI!');

        await terminate(db);
    } catch (error) {
        console.error('\n❌ Firebase test failed:', error.message);
    }
}

testFirebase();