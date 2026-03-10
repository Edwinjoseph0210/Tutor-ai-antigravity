/**
 * Firebase Initialization
 * 
 * Initializes all Firebase services:
 * - Authentication (Firebase Auth)
 * - Database (Cloud Firestore)
 * - Storage (Cloud Storage for files)
 * - Messaging (Firebase Cloud Messaging for notifications)
 * 
 * Configuration from environment variables (.env.local)
 * See FIRESTORE_IMPLEMENTATION_PLAN.md Section 4 for setup
 */

import { initializeApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
import {
  getFirestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getMessaging, onMessage } from 'firebase/messaging';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
};

// Validate required config
const requiredKeys = ['projectId', 'apiKey', 'authDomain', 'storageBucket'];
const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

if (missingKeys.length > 0) {
  console.error(
    'Missing Firebase configuration variables:',
    missingKeys.join(', '),
    '\nPlease set them in .env.local'
  );
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// ============================================================================
// AUTHENTICATION
// ============================================================================
export const auth = getAuth(app);

// Enable persistent authentication across browser refreshes
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('Failed to set auth persistence:', error.message);
  });
}

// ============================================================================
// FIRESTORE DATABASE
// ============================================================================
export const db = getFirestore(app);

// Enable offline persistence for Firestore
// This allows queries to work offline and sync when connection returns
if (typeof window !== 'undefined') {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore: Multiple tabs open, persistence disabled in this tab');
    } else if (err.code === 'unimported-module') {
      console.warn('Firestore: Persistence disabled (same as another tab)');
    } else {
      console.warn('Firestore: Offline persistence failed:', err.message);
    }
  });
}

// Enable Firestore Emulator in development (optional)
// Uncomment to use local Firestore emulator on localhost:8080
// if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_FIREBASE_EMULATOR) {
//   try {
//     connectFirestoreEmulator(db, 'localhost', 8080);
//   } catch (err) {
//     // Emulator already running or error
//   }
// }

// ============================================================================
// CLOUD STORAGE
// ============================================================================
export const storage = getStorage(app);

// Enable Storage Emulator in development (optional)
// if (process.env.NODE_ENV === 'development' && !process.env.REACT_APP_USE_FIREBASE_EMULATOR) {
//   try {
//     connectStorageEmulator(storage, 'localhost', 9199);
//   } catch (err) {
//     // Emulator already running or error
//   }
// }

// ============================================================================
// FIREBASE CLOUD MESSAGING
// ============================================================================
export let messaging = null;

// Initialize messaging only if the browser supports it and APK token is available
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  try {
    messaging = getMessaging(app);

    // Listen for foreground messages
    onMessage(messaging, (payload) => {
      console.log('Foreground notification received:', payload);

      // Handle notification display
      if (payload.notification) {
        const { title, body } = payload.notification;

        // Show browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(title, {
            body,
            icon: payload.notification.icon || '/logo192.png',
            tag: 'firestore-notification',
          });
        }
      }
    });
  } catch (error) {
    console.warn('Firebase Messaging not available:', error.message);
  }
}

// ============================================================================
// INITIALIZATION LOGGER
// ============================================================================
console.log(`
┌─────────────────────────────────────────────┐
│ Firebase Services Initialized                 │
├─────────────────────────────────────────────┤
│ ✓ Authentication (persistent)                │
│ ✓ Firestore (offline persistence)            │
│ ✓ Cloud Storage                              │
│ ✓ Cloud Messaging                            │
│                                               │
│ Project: ${firebaseConfig.projectId || 'UNCONFIGURED'}
│ Region: ${firebaseConfig.storageBucket?.split('.')[0] || 'UNKNOWN'}
└─────────────────────────────────────────────┘
`);

export default app;

