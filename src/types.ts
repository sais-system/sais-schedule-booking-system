export type UserRole = 'admin' | 'inspector' | 'user' | 'viewer';
export type UserStatus = 'approved' | 'pending' | 'blocked';

export interface User {
  username: string;
  password?: string;
  full_name: string;
  department?: string;
  position?: string;
  phone?: string;
  email?: string;
  role: UserRole;
  status: UserStatus;
  inspector_mapped_name?: string;
  created_at?: string;
}

export interface Inspector {
  name: string;
  product_lines?: string;
  order?: number;
}

export interface Booking {
  id: string;
  date: string; // YYYY-MM-DD
  inspector_name: string;
  site_name: string;
  equipment_no?: string;
  unit_no?: string;
  product_line?: string;
  job_type?: string;
  area?: string;
  tel?: string;
  technician_name?: string;
  map_link?: string;
  latitude?: number;
  longitude?: number;
  address_detail?: string;
  created_by?: string;
  status?: 'active' | 'cancelled' | string;
  sais_status?: string;
  condition?: string;
  pre_check?: string;
  buzzer?: string;
  generated_date?: string;
  generated_in_system?: string;
  remark?: string;
  layout_doc?: 'true' | 'false' | 'pending' | 'verified';
  wiring_doc?: 'true' | 'false' | 'pending' | 'verified';
  precheck_doc?: 'true' | 'false' | 'pending' | 'verified';
  layout_status?: 'pending' | 'verified';
  wiring_status?: 'pending' | 'verified';
  precheck_status?: 'pending' | 'verified';
  layout_img?: string;
  wiring_img?: string;
  precheck_img?: string;
  layout_filename?: string;
  wiring_filename?: string;
  precheck_filename?: string;
  site_cond_1?: string;
  site_cond_2?: string;
  site_cond_3?: string;
  site_cond_4?: string;
  site_cond_5?: string;
  site_cond_6?: string;
  reason?: string;
}

export interface SystemNotification {
  id: string;
  title: string;
  message: string;
  target?: string;
  timestamp: string;
  isRead?: string;
}

export interface SystemLog {
  id?: string;
  action: string;
  details: string;
  user: string;
  timestamp: string;
}

export interface WebSettings {
  appName?: string;
  customTexts?: Record<string, string>;
  headerBg?: string;
  headerText?: string;
  appBg?: string;
  gridColWidth?: number | string;
  tableBorder?: string;
  tableHeaderBg?: string;
  tableHeaderText?: string;
  cardRadius?: number | string;
  cardPadding?: number | string;
  titleFontSize?: number | string;
  subFontSize?: number | string;
  normalBg?: string;
  normalText?: string;
  modBg?: string;
  modText?: string;
  upcBg?: string;
  upcText?: string;
  reinsBg?: string;
  reinsText?: string;
  holidayBg?: string;
  holidayText?: string;
  leaveBg?: string;
  leaveText?: string;
  eventBg?: string;
  eventText?: string;
  sundayBg?: string;
  sundayText?: string;
  todayBg?: string;
  todayText?: string;

  // Granular Font & Display Configurations
  fontCardTitle?: number;
  fontCardSub?: number;
  fontLeave?: number;
  fontActivity?: number;
  fontHoliday?: number;
  fontDateHeader?: number;
  fontInspectorHeader?: number;
  cardMinHeight?: number;

  // Google Drive Cloud Storage (15GB free tier integration)
  gdriveRootFolderId?: string;
  gdriveRootFolderUrl?: string;
  gdriveAutoOrganizeByProject?: boolean;
  gdriveApiKey?: string;
  gdriveClientId?: string;

  // Firebase Cloud Configuration (Real production project)
  firebaseApiKey?: string;
  firebaseAuthDomain?: string;
  firebaseProjectId?: string;
  firebaseStorageBucket?: string;
  firebaseMessagingSenderId?: string;
  firebaseAppId?: string;

  // High Concurrency / Capacity Engine (300-500 viewers, 100 users, 10 inspectors, 1 admin)
  maxConcurrentViewers?: number;
  maxDailyBookingsPerInspector?: number;
  autoRealtimeSyncIntervalSec?: number;
  allowViewerFastPolling?: boolean;
  lockBookingsOnEdit?: boolean;
  requireDocsBeforeBooking?: boolean;
  systemMaintenanceMode?: boolean;
  systemAnnouncement?: string;
  showSystemAnnouncement?: boolean;
}

export interface DayInfo {
  full: string;
  day: number;
  weekday: string;
  isSunday: boolean;
  isGlobalHoliday: boolean;
  globalHolidays: Booking[];
  isGlobalEvent: boolean;
  globalEvents: Booking[];
  isToday: boolean;
  isEmpty: boolean;
}
