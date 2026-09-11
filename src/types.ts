export type UserRole = 'admin' | 'inspector' | 'user' | 'viewer' | 'supervisor' | 'fitter';
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

export const STANDARD_PRODUCT_LINES: string[] = [
  'ES1',
  '3300',
  '5500',
  'ES5/ES5.1',
  'S-villas',
  'ES2',
  'ES3',
  'MOR-R',
  'MOD-T',
  'S7R4',
  'Flex7',
  'ESC/MW',
];

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
  inspection_result?: string; // e.g. "pass with OIL", "pass", "fail"
  sais_result_file?: string;
  sais_result_filename?: string;
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
  type?: 'add' | 'edit' | 'move' | 'delete' | 'cancel' | string;
  bookingId?: string;
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
  navBg?: string;
  navActiveColor?: string;
  navInactiveColor?: string;
  fontNavText?: number;
  modalBg?: string;
  modalText?: string;
  fontModalScale?: number;
  columnZoom?: number;
  tableFontScale?: number;
  isLiveEdit?: boolean;

  // Google Drive Cloud Storage (Separated 2 Accounts: 15GB + 15GB = 30GB Total Free Tier)
  gdriveRootFolderId?: string;
  gdriveRootFolderUrl?: string;
  gdriveRootAccountEmail?: string;
  gdriveOilFolderId?: string;
  gdriveOilFolderUrl?: string;
  gdriveOilAccountEmail?: string;
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

// ----------------------------------------------------
// Tracking OIL (Open Item List) System Types
// ----------------------------------------------------
export type OilSource = 'Installer' | 'Customer' | 'Manual';
export type OilItemStatus = 'Open' | 'In Progress' | 'Request Close' | 'Fixed' | 'Verified' | 'Closed in SAP';
export type OilTrackingStatus = 'Waiting for PDF' | 'OIL Recorded' | 'In Progress' | 'Completed' | 'Cancelled';

export interface OilMasterUid {
  id: string;
  uid: string; // e.g. '2.14.1.b', '3.4.19', '11.13.2.a'
  item_type: 'triangle' | 'square'; // Triangle (△) = 7 days vs Square (□) = 28 days
  sla_days: number; // 7 or 28
  description?: string;
  category?: string;
  updated_at?: string;
  updated_by?: string;
}

export interface OilItem {
  id: string;
  uid: string; // e.g. '2.14.1.b', '3.4.19', '11.13.2.a'
  item_type?: 'triangle' | 'square'; // Triangle (△) 7 days vs Square (□) 28 days defect mark
  source: OilSource;
  title?: string; // Item question or section heading
  description: string; // Annotations Comment details
  status: OilItemStatus;
  responsible?: string; // Fitter / Installer / Customer / Schindler
  created_at?: string;
  notes?: string;

  // SLA Fields
  sla_days?: number; // 7 (triangle) or 28 (square)
  sla_due_date?: string; // Target due date calculated from first_inspection_date
  first_inspection_date?: string; // Preserves original V.0 inspection date across versions!

  // Versioning & Closure
  version_introduced?: number; // 0 for V.0, 1 for V.1
  closed_at?: string;
  closed_in_version?: number;

  // Supervisor & Fitter Actions
  fixed_by?: string; // User full name or username who uploaded fix
  fixed_role?: string; // 'supervisor' | 'fitter' | 'admin'
  fixed_at?: string;
  fix_photos?: string[]; // URLs or base64 data URLs of resolved defect photos
  fix_notes?: string;
  verified_by?: string;
  verified_at?: string;
}

export interface OilVersionHistory {
  version: number | string;
  upload_date?: string;
  uploaded_at?: string;
  inspection_date: string;
  installer_filename?: string;
  customer_filename?: string;
  total_items?: number;
  items_count?: number;
  closed_items?: number;
  closed_in_sap_count?: number;
  pending_items?: number;
  new_items_count?: number;
  retained_items_count?: number;
  notes?: string;
  uploaded_by?: string;
}

export interface OilTrackingRecord {
  id: string;
  equipment_no: string;
  site_name: string;
  inspection_date: string; // Current inspection date (DD/MM/YYYY or YYYY-MM-DD)
  first_inspection_date?: string; // Original V.0 date (SLA never resets across versions!)
  version?: number; // 0, 1, 2...
  version_history?: OilVersionHistory[];
  inspector_name?: string;
  supervisor?: string;
  status: OilTrackingStatus;
  items: OilItem[];
  booking_id?: string;
  installer_filename?: string;
  customer_filename?: string;
  installer_pdf_url?: string;
  customer_pdf_url?: string;
  pdf_url?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  source?: 'auto' | 'manual';
  notes?: string;
}
