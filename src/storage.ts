import { Booking, Inspector, User, WebSettings, SystemNotification, SystemLog } from './types';
import { DEFAULT_INSPECTORS, DEFAULT_USERS, DEFAULT_SETTINGS, generateDefaultBookings, DEFAULT_NOTIFICATIONS, DEFAULT_LOGS, getThaiTime } from './mockData';

const STORAGE_KEYS = {
  BOOKINGS: 'sais_bookings_v2',
  INSPECTORS: 'sais_inspectors_v2',
  USERS: 'sais_users_v2',
  SETTINGS: 'sais_settings_v2',
  NOTIFS: 'sais_notifs_v2',
  LOGS: 'sais_logs_v2',
  CURRENT_USER: 'sais_user',
  SESSION_TIME: 'sais_session_time',
};

export const getStoredUser = (): User | null => {
  try {
    // Purge any legacy permanent localStorage user credentials
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SESSION_TIME);

    // Only read from temporary browser sessionStorage
    const saved = sessionStorage.getItem('sais_session_user');
    if (saved) {
      return JSON.parse(saved);
    }
    // Return null to enforce authentication requirement before accessing the app
    return null;
  } catch (e) {
    return null;
  }
};

export const setStoredUser = (user: User | null) => {
  try {
    // NEVER save login session in permanent localStorage
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.SESSION_TIME);

    if (user) {
      sessionStorage.setItem('sais_session_user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('sais_session_user');
      sessionStorage.clear();
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
      inspectors = JSON.parse(savedInspectors);
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
    localStorage.setItem(STORAGE_KEYS.INSPECTORS, JSON.stringify(inspectors));
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
