import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch,
  enableIndexedDbPersistence,
} from 'firebase/firestore';
import { Booking, Inspector, User, WebSettings, SystemNotification, SystemLog } from './types';
import {
  DEFAULT_INSPECTORS,
  DEFAULT_USERS,
  DEFAULT_SETTINGS,
  DEFAULT_NOTIFICATIONS,
  DEFAULT_LOGS,
  generateDefaultBookings,
} from './mockData';

// Firebase official production configuration provided by user
const env = (import.meta as any).env || {};
export const PRODUCTION_FIREBASE_CONFIG = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyBOqWqVBTLdr2se2Ktc5SwjXglb55n69go',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'sais-schedule-booking.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'sais-schedule-booking',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'sais-schedule-booking.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '908596453130',
  appId: env.VITE_FIREBASE_APP_ID || '1:908596453130:web:e34a5769730672a1d6a4f3',
};

// Initialize Firebase App instance safely with production config
export const firebaseApp = getApps().length > 0 ? getApp() : initializeApp(PRODUCTION_FIREBASE_CONFIG);

// Initialize Cloud Firestore database instance
export const firestoreDb = getFirestore(firebaseApp);

// Try offline persistence where supported
try {
  enableIndexedDbPersistence(firestoreDb).catch(() => {
    // Already open or unsupported in this tab
  });
} catch (e) {
  // Ignore
}

// Collection Names
export const COLLECTIONS = {
  BOOKINGS: 'sais_bookings',
  INSPECTORS: 'sais_inspectors',
  USERS: 'sais_users',
  SETTINGS: 'sais_settings',
  NOTIFICATIONS: 'sais_notifications',
  LOGS: 'sais_logs',
};

// Connection State Listener
type ConnectionStatus = 'connected' | 'syncing' | 'offline' | 'error';
let currentStatus: ConnectionStatus = 'connected';
const statusListeners: ((status: ConnectionStatus) => void)[] = [];

export const onFirebaseStatusChange = (callback: (status: ConnectionStatus) => void) => {
  statusListeners.push(callback);
  callback(currentStatus);
  return () => {
    const idx = statusListeners.indexOf(callback);
    if (idx !== -1) statusListeners.splice(idx, 1);
  };
};

const updateStatus = (status: ConnectionStatus) => {
  currentStatus = status;
  statusListeners.forEach((cb) => cb(status));
};

// Realtime Subscriptions
export const subscribeFirebaseBookings = (callback: (bookings: Booking[]) => void) => {
  const colRef = collection(firestoreDb, COLLECTIONS.BOOKINGS);
  updateStatus('syncing');

  return onSnapshot(
    colRef,
    (snapshot) => {
      updateStatus('connected');
      if (snapshot.empty) {
        // If empty on first connect, initialize seed data to Cloud Firestore
        seedInitialCloudData();
        return;
      }
      const list: Booking[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Omit<Booking, 'id'>) });
      });
      callback(list);
    },
    (err) => {
      console.warn('Firestore bookings snapshot error (fallback to local):', err);
      updateStatus('offline');
    }
  );
};

export const subscribeFirebaseInspectors = (callback: (inspectors: Inspector[]) => void) => {
  const colRef = collection(firestoreDb, COLLECTIONS.INSPECTORS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: Inspector[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Inspector);
        });
        // Always preserve explicit order
        list.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        callback(list);
      }
    },
    (err) => console.warn('Firestore inspectors sync error:', err)
  );
};

export const subscribeFirebaseUsers = (callback: (users: User[]) => void) => {
  const colRef = collection(firestoreDb, COLLECTIONS.USERS);
  return onSnapshot(
    colRef,
    (snapshot) => {
      if (!snapshot.empty) {
        const list: User[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as User);
        });
        callback(list);
      }
    },
    (err) => console.warn('Firestore users sync error:', err)
  );
};

export const subscribeFirebaseSettings = (callback: (settings: WebSettings) => void) => {
  const docRef = doc(firestoreDb, COLLECTIONS.SETTINGS, 'global_config');
  return onSnapshot(
    docRef,
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as WebSettings);
      }
    },
    (err) => console.warn('Firestore settings sync error:', err)
  );
};

// Firestore Write Operations
export const firestoreSaveBooking = async (booking: Booking): Promise<void> => {
  try {
    updateStatus('syncing');
    const docRef = doc(firestoreDb, COLLECTIONS.BOOKINGS, booking.id);
    await setDoc(docRef, booking, { merge: true });
    updateStatus('connected');
  } catch (err) {
    console.warn('Failed to save booking to Firestore:', err);
    updateStatus('offline');
  }
};

export const firestoreDeleteBooking = async (bookingId: string): Promise<void> => {
  try {
    updateStatus('syncing');
    const docRef = doc(firestoreDb, COLLECTIONS.BOOKINGS, bookingId);
    await deleteDoc(docRef);
    updateStatus('connected');
  } catch (err) {
    console.warn('Failed to delete booking from Firestore:', err);
    updateStatus('offline');
  }
};

export const firestoreSaveBookings = async (bookings: Booking[]): Promise<void> => {
  try {
    updateStatus('syncing');
    const batch = writeBatch(firestoreDb);
    bookings.forEach((b) => {
      const docRef = doc(firestoreDb, COLLECTIONS.BOOKINGS, b.id);
      batch.set(docRef, b, { merge: true });
    });
    await batch.commit();
    updateStatus('connected');
  } catch (err) {
    console.warn('Failed to batch save bookings to Firestore:', err);
    updateStatus('offline');
  }
};

export const firestoreSaveInspectors = async (inspectors: Inspector[]): Promise<void> => {
  try {
    updateStatus('syncing');
    const existingSnaps = await getDocs(collection(firestoreDb, COLLECTIONS.INSPECTORS));
    const currentDocIds = new Set(
      inspectors.map((ins) => ins.name.replace(/[^\w\u0E00-\u0E7F]/g, '_'))
    );
    const batch = writeBatch(firestoreDb);
    // Delete removed inspectors
    existingSnaps.forEach((d) => {
      if (!currentDocIds.has(d.id)) {
        batch.delete(d.ref);
      }
    });
    // Set current inspectors with order
    inspectors.forEach((ins, idx) => {
      const docRef = doc(firestoreDb, COLLECTIONS.INSPECTORS, ins.name.replace(/[^\w\u0E00-\u0E7F]/g, '_'));
      batch.set(docRef, { ...ins, order: ins.order ?? idx + 1 }, { merge: true });
    });
    await batch.commit();
    updateStatus('connected');
  } catch (err) {
    console.warn('Failed to batch save inspectors:', err);
    updateStatus('offline');
  }
};

export const firestoreSaveUsers = async (users: User[]): Promise<void> => {
  try {
    updateStatus('syncing');
    const existingSnaps = await getDocs(collection(firestoreDb, COLLECTIONS.USERS));
    const currentDocIds = new Set(users.map((u) => u.username));
    const batch = writeBatch(firestoreDb);
    existingSnaps.forEach((d) => {
      if (!currentDocIds.has(d.id)) {
        batch.delete(d.ref);
      }
    });
    users.forEach((u) => {
      const docRef = doc(firestoreDb, COLLECTIONS.USERS, u.username);
      batch.set(docRef, u, { merge: true });
    });
    await batch.commit();
    updateStatus('connected');
  } catch (err) {
    console.warn('Failed to batch save users:', err);
    updateStatus('offline');
  }
};

export const firestoreSaveSettings = async (settings: WebSettings): Promise<void> => {
  try {
    const docRef = doc(firestoreDb, COLLECTIONS.SETTINGS, 'global_config');
    await setDoc(docRef, settings, { merge: true });
  } catch (err) {
    console.warn('Failed to save settings:', err);
  }
};

export const firestoreAddLog = async (log: SystemLog): Promise<void> => {
  try {
    const id = log.id || `log-${Date.now()}`;
    const docRef = doc(firestoreDb, COLLECTIONS.LOGS, id);
    await setDoc(docRef, log);
  } catch (err) {
    console.warn('Failed to save log:', err);
  }
};

// Seed initial default dataset into Firestore
export const seedInitialCloudData = async (): Promise<void> => {
  try {
    updateStatus('syncing');
    // Check if bookings exist
    const snap = await getDocs(collection(firestoreDb, COLLECTIONS.BOOKINGS));
    if (snap.empty) {
      const defaultBookings = generateDefaultBookings();
      for (const b of defaultBookings) {
        await setDoc(doc(firestoreDb, COLLECTIONS.BOOKINGS, b.id), b);
      }
      for (const ins of DEFAULT_INSPECTORS) {
        await setDoc(
          doc(firestoreDb, COLLECTIONS.INSPECTORS, ins.name.replace(/[^\w\u0E00-\u0E7F]/g, '_')),
          ins
        );
      }
      for (const u of DEFAULT_USERS) {
        await setDoc(doc(firestoreDb, COLLECTIONS.USERS, u.username), u);
      }
      await setDoc(doc(firestoreDb, COLLECTIONS.SETTINGS, 'global_config'), DEFAULT_SETTINGS);
    }
    updateStatus('connected');
  } catch (e) {
    console.warn('Could not seed initial Cloud data:', e);
    updateStatus('offline');
  }
};

// Test live connection to Cloud Firestore
export const testFirebaseConnection = async (): Promise<{ success: boolean; message: string }> => {
  try {
    updateStatus('syncing');
    const testDocRef = doc(firestoreDb, COLLECTIONS.SETTINGS, 'connection_ping');
    await setDoc(testDocRef, {
      ping_at: new Date().toISOString(),
      client_agent: 'SAIS Enterprise Pro Max',
      projectId: PRODUCTION_FIREBASE_CONFIG.projectId,
    });
    updateStatus('connected');
    return {
      success: true,
      message: `เชื่อมต่อกับ Cloud Firestore (Project: ${PRODUCTION_FIREBASE_CONFIG.projectId}) สำเร็จ 100%! สถานะออนไลน์เรียบร้อย`,
    };
  } catch (err: any) {
    console.warn('Firebase ping connection error:', err);
    updateStatus('offline');
    return {
      success: false,
      message: `เชื่อมต่อไม่สำเร็จ: ${err?.message || 'โปรดตรวจสอบสิทธิ์การเข้าถึงหรือ Network'}`,
    };
  }
};

// Force upload full dataset to Cloud Firestore
export const forceCloudSyncAll = async (
  currentBookings: Booking[],
  currentInspectors: Inspector[],
  currentUsers: User[],
  currentSettings: WebSettings
): Promise<{ success: boolean; count: number; error?: string }> => {
  try {
    updateStatus('syncing');
    let count = 0;
    for (const b of currentBookings) {
      await setDoc(doc(firestoreDb, COLLECTIONS.BOOKINGS, b.id), b, { merge: true });
      count++;
    }
    for (const ins of currentInspectors) {
      await setDoc(
        doc(firestoreDb, COLLECTIONS.INSPECTORS, ins.name.replace(/[^\w\u0E00-\u0E7F]/g, '_')),
        ins,
        { merge: true }
      );
      count++;
    }
    for (const u of currentUsers) {
      await setDoc(doc(firestoreDb, COLLECTIONS.USERS, u.username), u, { merge: true });
      count++;
    }
    await setDoc(doc(firestoreDb, COLLECTIONS.SETTINGS, 'global_config'), currentSettings, { merge: true });
    count++;
    updateStatus('connected');
    return { success: true, count };
  } catch (e: any) {
    console.error('Error in forceCloudSyncAll:', e);
    return { success: false, count: 0, error: e?.message || 'Sync error' };
  }
};

