import { initializeApp, getApps, cert, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let adminApp = null;
let adminDb = null;
let adminAuth = null;

export function initFirebaseAdmin() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminApp = getApp();
    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);
    return { app: adminApp, db: adminDb, auth: adminAuth };
  }

  try {
    // 1. Check local service account json
    const serviceAccountPaths = [
      path.resolve(__dirname, '../firebase-service-account.json'),
      path.resolve(__dirname, '../../firebase-service-account.json')
    ];

    let serviceAccount = null;
    for (const p of serviceAccountPaths) {
      if (fs.existsSync(p)) {
        serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
        break;
      }
    }

    if (serviceAccount) {
      adminApp = initializeApp({
        credential: cert(serviceAccount)
      });
      console.log('[Firebase Admin] Initialized successfully with service account JSON.');
    } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      adminApp = initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID || 'smartblood-ai',
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        })
      });
      console.log('[Firebase Admin] Initialized successfully with environment variables.');
    } else {
      console.warn('[Firebase Admin] No service account key found.');
      return null;
    }

    adminDb = getFirestore(adminApp);
    adminAuth = getAuth(adminApp);

    return { app: adminApp, db: adminDb, auth: adminAuth };
  } catch (err) {
    console.error('[Firebase Admin] Initialization error:', err.message);
    return null;
  }
}

export const getFirebaseAdmin = () => initFirebaseAdmin();
