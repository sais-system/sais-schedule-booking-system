import { Inspector, Booking, User, WebSettings, SystemNotification, SystemLog } from './types';

// Thai timezone helper
export const getThaiTime = (): Date => {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
};

export const getLocalDateString = (dateObj: Date): string => {
  if (!dateObj || isNaN(dateObj.getTime())) return new Date().toISOString().split('T')[0];
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const DEFAULT_INSPECTORS: Inspector[] = [
  { name: 'สมศักดิ์', product_lines: 'ES1, 3300, 5500, S-villas, ES2', order: 1 },
  { name: 'วิชัย', product_lines: 'ES1, 3300, ES5/ES5.1, MOR-R', order: 2 },
  { name: 'จิราพงษ์', product_lines: 'ES1, 3300, 5500, S7R4, Flex7, ESC/MW', order: 3 },
  { name: 'อนุสรณ์', product_lines: 'ES1, 3300, S-villas, MOD-T', order: 4 },
  { name: 'ธีรเดช', product_lines: 'ES1, 3300, 5500, ES3', order: 5 },
  { name: 'ประเสริฐ', product_lines: 'ES1, 3300, 5500, S-villas', order: 6 },
  { name: 'กิตติศักดิ์', product_lines: 'ES1, 3300, ES2, MOD-T', order: 7 },
  { name: 'ณัฐพงษ์', product_lines: 'ES1, 3300, 5500, Flex7', order: 8 },
  { name: 'ชาญชัย', product_lines: 'ES1, 3300, S7R4, ESC/MW', order: 9 },
  { name: 'เอกราช', product_lines: 'ES1, 3300, 5500, MOR-R', order: 10 },
];

export const DEFAULT_USERS: User[] = [
  {
    username: 'jirapong',
    password: 'password123',
    full_name: 'จิราพงษ์ ชูศักดิ์ (Admin)',
    department: 'NI/FQE',
    position: 'Quality Manager',
    phone: '0812345678',
    email: 'jirapong@schindler.com',
    role: 'admin',
    status: 'approved',
    inspector_mapped_name: 'จิราพงษ์',
    created_at: '2026-01-01T08:00:00.000Z',
  },
  {
    username: 'admin',
    password: 'admin123',
    full_name: 'ผู้ดูแลระบบกลาง (Super Admin)',
    department: 'HQ Safety & Quality',
    position: 'System Administrator',
    phone: '0899999999',
    email: 'admin@schindler.com',
    role: 'admin',
    status: 'approved',
    created_at: '2026-01-01T08:00:00.000Z',
  },
  {
    username: 'somsak',
    password: 'password123',
    full_name: 'สมศักดิ์ มั่นคง',
    department: 'Field Quality',
    position: 'Senior Inspector',
    phone: '0823456789',
    email: 'somsak@schindler.com',
    role: 'inspector',
    status: 'approved',
    inspector_mapped_name: 'สมศักดิ์',
    created_at: '2026-01-05T09:00:00.000Z',
  },
  {
    username: 'wichai',
    password: 'password123',
    full_name: 'วิชัย ชัยชนะ',
    department: 'Field Quality',
    position: 'Inspector',
    phone: '0834567890',
    email: 'wichai@schindler.com',
    role: 'inspector',
    status: 'approved',
    inspector_mapped_name: 'วิชัย',
    created_at: '2026-01-06T09:00:00.000Z',
  },
  {
    username: 'somchai',
    password: 'password123',
    full_name: 'สมชาย ประจำการ',
    department: 'New Installation (NI)',
    position: 'Project Engineer',
    phone: '0845678901',
    email: 'somchai@schindler.com',
    role: 'user',
    status: 'approved',
    created_at: '2026-01-10T10:00:00.000Z',
  },
  {
    username: 'viewer',
    password: 'viewer123',
    full_name: 'ผู้เข้าชมทั่วไป (Site Viewer)',
    department: 'Subcontractor',
    position: 'Site Technician',
    phone: '0856789012',
    email: 'viewer@example.com',
    role: 'viewer',
    status: 'approved',
    created_at: '2026-01-15T11:00:00.000Z',
  }
];

export const DEFAULT_SETTINGS: WebSettings = {
  appName: 'SAIS BOOKING',
  headerBg: '#1e293b',
  headerText: '#ffffff',
  appBg: '#f8fafc',
  gridColWidth: 120,
  tableBorder: '#cbd5e1',
  tableHeaderBg: '#1e293b',
  tableHeaderText: '#ffffff',
  cardRadius: 6,
  cardPadding: 4,
  titleFontSize: 11,
  subFontSize: 10,
  normalBg: '#e2e8f0',
  normalText: '#1e293b',
  modBg: '#64748b',
  modText: '#ffffff',
  upcBg: '#f472b6',
  upcText: '#ffffff',
  reinsBg: '#fef08a',
  reinsText: '#854d0e',
  holidayBg: '#D0021B',
  holidayText: '#ffffff',
  leaveBg: '#eab308',
  leaveText: '#ffffff',
  eventBg: '#22c55e',
  eventText: '#ffffff',

  // Google Drive Cloud Storage Config (15GB free tier integration)
  gdriveRootFolderId: '1_SAIS_DOCS_ROOT',
  gdriveRootFolderUrl: 'https://drive.google.com/drive/folders/',
  gdriveAutoOrganizeByProject: true,

  // Firebase Cloud Configuration (Real production project)
  firebaseApiKey: 'AIzaSyBOqWqVBTLdr2se2Ktc5SwjXglb55n69go',
  firebaseAuthDomain: 'sais-schedule-booking.firebaseapp.com',
  firebaseProjectId: 'sais-schedule-booking',
  firebaseStorageBucket: 'sais-schedule-booking.firebasestorage.app',
  firebaseMessagingSenderId: '908596453130',
  firebaseAppId: '1:908596453130:web:e34a5769730672a1d6a4f3',

  // High Concurrency / Capacity Engine (300-500 viewers, 100 users, 10 inspectors, 1 admin)
  maxConcurrentViewers: 500,
  maxDailyBookingsPerInspector: 6,
  autoRealtimeSyncIntervalSec: 5,
  allowViewerFastPolling: true,
  lockBookingsOnEdit: true,
  requireDocsBeforeBooking: false,
  systemMaintenanceMode: false,
  systemAnnouncement: '',
  showSystemAnnouncement: false,
};

// Generate realistic default bookings around the current date
export const generateDefaultBookings = (): Booking[] => {
  const now = getThaiTime();
  const year = now.getFullYear();
  const month = now.getMonth();

  const getDateStr = (day: number) => {
    const d = new Date(year, month, day);
    return getLocalDateString(d);
  };

  return [
    // Global Holiday
    {
      id: 'hld-1',
      date: getDateStr(1),
      inspector_name: 'SYSTEM_HOLIDAY',
      site_name: 'วันขึ้นงวด / วันหยุดทำการ',
      equipment_no: 'HLD_001',
      job_type: 'public_holiday',
      status: 'active',
      created_by: 'admin',
    },
    // Company Event
    {
      id: 'evt-1',
      date: getDateStr(5),
      inspector_name: 'SYSTEM_EVENT',
      site_name: 'Safety & Quality Monthly Review',
      equipment_no: 'EVENT_001_#22c55e',
      job_type: 'company_event',
      status: 'active',
      created_by: 'admin',
    },
    // Leave for Wichai
    {
      id: 'leave-1',
      date: getDateStr(8),
      inspector_name: 'วิชัย',
      site_name: 'ลาพักร้อนประจำปี',
      equipment_no: 'LEAVE_001',
      job_type: 'leave',
      status: 'active',
      created_by: 'wichai',
    },
    // Standard Bookings
    {
      id: 'book-1',
      date: getDateStr(2),
      inspector_name: 'สมศักดิ์',
      site_name: 'คอนโด เดอะ เบส สุขุมวิท 77',
      equipment_no: '11732041',
      unit_no: 'L1-L2',
      product_line: 'ES1',
      job_type: 'New',
      area: 'กรุงเทพและปริมณฑล',
      tel: '0812345678',
      map_link: 'https://maps.google.com/maps?q=The+Base+Sukhumvit+77&hl=th',
      created_by: 'somchai',
      status: 'active',
      layout_doc: 'true',
      wiring_doc: 'true',
      precheck_doc: 'true',
      layout_img: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?w=800&auto=format&fit=crop&q=60',
      wiring_img: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&auto=format&fit=crop&q=60',
      precheck_img: 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?w=800&auto=format&fit=crop&q=60',
    },
    {
      id: 'book-2',
      date: getDateStr(3),
      inspector_name: 'จิราพงษ์',
      site_name: 'เซ็นทรัล เวสต์เกต บางใหญ่',
      equipment_no: '11849202',
      unit_no: 'ESC-01',
      product_line: 'ESC/MW',
      job_type: 'MOD',
      area: 'กรุงเทพและปริมณฑล',
      tel: '0898765432',
      map_link: 'https://maps.google.com/maps?q=Central+Plaza+Westgate&hl=th',
      created_by: 'somchai',
      status: 'active',
      layout_doc: 'true',
      wiring_doc: 'true',
      precheck_doc: 'false',
      layout_img: 'https://images.unsplash.com/photo-1541888946425-d0fbb186156a?w=800&auto=format&fit=crop&q=60',
    },
    {
      id: 'book-3',
      date: getDateStr(4),
      inspector_name: 'อนุสรณ์',
      site_name: 'โรงแรม แมริออท รีสอร์ท ภูเก็ต',
      equipment_no: '11902488',
      unit_no: 'PL-3',
      product_line: '3300',
      job_type: 'New',
      area: 'ภูเก็ต',
      tel: '0851122334',
      map_link: 'https://maps.google.com/maps?q=Phuket+Marriott+Resort&hl=th',
      created_by: 'somchai',
      status: 'active',
      layout_doc: 'true',
      wiring_doc: 'true',
      precheck_doc: 'true',
    },
    {
      id: 'book-4',
      date: getDateStr(6),
      inspector_name: 'สมศักดิ์',
      site_name: 'อาคารสำนักงาน สาทร ทาวเวอร์',
      equipment_no: '11654321',
      unit_no: 'L5',
      product_line: '5500',
      job_type: 'Re-ins temporary power supply',
      area: 'กรุงเทพและปริมณฑล',
      tel: '0867890123',
      created_by: 'somchai',
      status: 'active',
      layout_doc: 'true',
      wiring_doc: 'false',
      precheck_doc: 'false',
    },
    {
      id: 'book-5',
      date: getDateStr(10),
      inspector_name: 'ธีรเดช',
      site_name: 'โรงพยาบาลศิริราช ปิยมหาราชการุณย์',
      equipment_no: '11776655',
      unit_no: 'Bed Lift 2',
      product_line: '5500',
      job_type: 'New',
      area: 'กรุงเทพและปริมณฑล',
      tel: '0876543210',
      created_by: 'somchai',
      status: 'active',
      layout_doc: 'true',
      wiring_doc: 'true',
      precheck_doc: 'true',
    },
    {
      id: 'book-6',
      date: getDateStr(12),
      inspector_name: 'จิราพงษ์',
      site_name: 'สนามบินสุวรรณภูมิ ส่วนต่อขยาย SAT-1',
      equipment_no: '11998877',
      unit_no: 'MW-04',
      product_line: 'Flex7',
      job_type: 'MOD',
      area: 'กรุงเทพและปริมณฑล',
      tel: '0891234567',
      created_by: 'admin',
      status: 'active',
      layout_doc: 'true',
      wiring_doc: 'true',
      precheck_doc: 'true',
    }
  ];
};

export const DEFAULT_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'ยินดีต้อนรับสู่ระบบ SAIS',
    message: 'ระบบจัดตารางและจองคิวตรวจลิฟต์/บันไดเลื่อน Schindler พร้อมใช้งานแล้ว',
    timestamp: '2026-01-01T08:00:00.000Z',
    isRead: '',
  },
  {
    id: 'notif-2',
    title: 'เอกสารผ่านการตรวจสอบ',
    message: 'คิวงาน เดอะ เบส สุขุมวิท 77 ได้รับการอนุมัติเอกสารครบถ้วนแล้ว',
    target: 'somchai',
    timestamp: '2026-01-02T10:00:00.000Z',
    isRead: '',
  }
];

export const DEFAULT_LOGS: SystemLog[] = [
  {
    id: 'log-1',
    action: 'SYSTEM INITIALIZE',
    details: 'ระบบ SAIS Schedule Booking เริ่มต้นทำงานเรียบร้อยแล้ว',
    user: 'system',
    timestamp: '2026-01-01T08:00:00.000Z',
  }
];
