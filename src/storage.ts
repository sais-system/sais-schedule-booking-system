import { Booking, Inspector, User, WebSettings, SystemNotification, SystemLog, OilTrackingRecord } from './types';
import { DEFAULT_INSPECTORS, DEFAULT_USERS, DEFAULT_SETTINGS, generateDefaultBookings, DEFAULT_NOTIFICATIONS, DEFAULT_LOGS, getThaiTime } from './mockData';

const STORAGE_KEYS = {
  BOOKINGS: 'sais_bookings_v2',
  INSPECTORS: 'sais_inspectors_v2',
  USERS: 'sais_users_v2',
  SETTINGS: 'sais_settings_v2',
  NOTIFS: 'sais_notifs_v2',
  LOGS: 'sais_logs_v2',
  REMEMBER_USER: 'sais_remember_user',
  REMEMBER_TIME: 'sais_remember_time',
  SESSION_USER: 'sais_session_user',
  OIL_TRACKING: 'sais_oil_tracking_v1',
};

// 24 hours in milliseconds
const REMEMBER_EXPIRY_MS = 24 * 60 * 60 * 1000;

export const getStoredUser = (): User | null => {
  try {
    // 1. Check if user selected 'Remember Me' (valid for 24 hours)
    const rememberUserStr = localStorage.getItem(STORAGE_KEYS.REMEMBER_USER);
    const rememberTimeStr = localStorage.getItem(STORAGE_KEYS.REMEMBER_TIME);

    if (rememberUserStr && rememberTimeStr) {
      const loginTime = Number(rememberTimeStr);
      const now = Date.now();

      if (!isNaN(loginTime) && now - loginTime < REMEMBER_EXPIRY_MS) {
        // Valid login within 24 hours: auto login and sync to current session
        const user = JSON.parse(rememberUserStr);
        sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(user));
        return user;
      } else {
        // Expired after 24 hours: purge credentials to require password entry
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_USER);
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_TIME);
        sessionStorage.removeItem(STORAGE_KEYS.SESSION_USER);
        return null;
      }
    }

    // 2. Otherwise, check current browser session
    const sessionSaved = sessionStorage.getItem(STORAGE_KEYS.SESSION_USER);
    if (sessionSaved) {
      return JSON.parse(sessionSaved);
    }

    return null;
  } catch (e) {
    return null;
  }
};

export const setStoredUser = (user: User | null, rememberMe: boolean = false) => {
  try {
    if (user) {
      sessionStorage.setItem(STORAGE_KEYS.SESSION_USER, JSON.stringify(user));
      if (rememberMe) {
        // Persist user and current timestamp in localStorage for 24 hours
        localStorage.setItem(STORAGE_KEYS.REMEMBER_USER, JSON.stringify(user));
        localStorage.setItem(STORAGE_KEYS.REMEMBER_TIME, Date.now().toString());
      } else {
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_USER);
        localStorage.removeItem(STORAGE_KEYS.REMEMBER_TIME);
      }
    } else {
      // Logout: purge from both sessionStorage and localStorage
      sessionStorage.removeItem(STORAGE_KEYS.SESSION_USER);
      sessionStorage.clear();
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_USER);
      localStorage.removeItem(STORAGE_KEYS.REMEMBER_TIME);
    }
  } catch (e) {
    console.error('Failed to set stored user', e);
  }
};

export const loadInitialData = () => {
  let bookings: Booking[] = [];
  let inspectors: Inspector[] = DEFAULT_INSPECTORS;
  let users: User[] = DEFAULT_USERS;
  let settings: WebSettings = DEFAULT_SETTINGS;
  let notifications: SystemNotification[] = DEFAULT_NOTIFICATIONS;
  let logs: SystemLog[] = DEFAULT_LOGS;

  try {
    const savedBookings = localStorage.getItem(STORAGE_KEYS.BOOKINGS);
    if (savedBookings) {
      bookings = JSON.parse(savedBookings);
    } else {
      bookings = generateDefaultBookings();
      localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
    }

    const savedInspectors = localStorage.getItem(STORAGE_KEYS.INSPECTORS);
    if (savedInspectors) {
      const parsed: Inspector[] = JSON.parse(savedInspectors);
      inspectors = [...parsed]
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999))
        .map((item, idx) => ({ ...item, order: item.order ?? idx + 1 }));
    } else {
      localStorage.setItem(STORAGE_KEYS.INSPECTORS, JSON.stringify(inspectors));
    }

    const savedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
    if (savedUsers) {
      users = JSON.parse(savedUsers);
    } else {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    }

    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
      settings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
    } else {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    }

    const savedNotifs = localStorage.getItem(STORAGE_KEYS.NOTIFS);
    if (savedNotifs) {
      notifications = JSON.parse(savedNotifs);
    } else {
      localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(notifications));
    }

    const savedLogs = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (savedLogs) {
      logs = JSON.parse(savedLogs);
    } else {
      localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
    }
  } catch (e) {
    console.warn('LocalStorage access warning, using in-memory fallbacks', e);
    bookings = generateDefaultBookings();
  }

  return { bookings, inspectors, users, settings, notifications, logs };
};

export const saveBookingsToStorage = (bookings: Booking[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKINGS, JSON.stringify(bookings));
  } catch (e) {}
};

export const saveInspectorsToStorage = (inspectors: Inspector[]) => {
  try {
    const normalized = inspectors.map((item, idx) => ({
      ...item,
      order: item.order ?? idx + 1,
    }));
    localStorage.setItem(STORAGE_KEYS.INSPECTORS, JSON.stringify(normalized));
  } catch (e) {}
};

export const saveUsersToStorage = (users: User[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (e) {}
};

export const saveSettingsToStorage = (settings: WebSettings) => {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (e) {}
};

export const saveLogsToStorage = (logs: SystemLog[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs.slice(0, 200)));
  } catch (e) {}
};

export const saveNotifsToStorage = (notifs: SystemNotification[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTIFS, JSON.stringify(notifs));
  } catch (e) {}
};

export const logActivityAction = (
  action: string,
  details: string,
  username: string,
  prevLogs: SystemLog[]
): SystemLog[] => {
  const newLog: SystemLog = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
    action,
    details,
    user: username,
    timestamp: getThaiTime().toISOString(),
  };
  const updated = [newLog, ...prevLogs];
  saveLogsToStorage(updated);
  return updated;
};

export const loadOilRecordsFromStorage = (): OilTrackingRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OIL_TRACKING);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn('Failed to load oil records from localStorage:', e);
    return [];
  }
};

export const saveOilRecordsToStorage = (records: OilTrackingRecord[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.OIL_TRACKING, JSON.stringify(records));
  } catch (e) {
    console.warn('Failed to save oil records to localStorage:', e);
  }
};

