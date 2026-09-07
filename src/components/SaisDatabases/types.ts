import { Booking } from '../../types';

export interface SaisRecord {
  id: string;
  equipmentNo: string;
  inspectionDate: string; // YYYY-MM-DD
  generatedDate?: string;
  generatedInSystem?: string;
  inspectorName: string;
  productLine: string;
  type: string;
  jobSite: string;
  unit: string;
  condition?: string;
  preCheck?: string;
  buzzer?: string;
  remark?: string;
  saisStatus: string;
  displayInspectionDate?: string;
  displayGeneratedDate?: string;
  bookingRef?: Booking;
}

export const PRODUCT_LINES = [
  '3300',
  '5500',
  '7000',
  'ES1',
  'ES2',
  'ES3',
  'ES5.0',
  'ES5',
  'ESC',
  'MW',
  'S-Villa',
  'Flex-7',
];

export const TYPES = ['NI', 'MOD-R', 'MOD-T', 'NI CNX', 'NI HKT'];

export const SAIS_STATUSES = [
  'Passed with Completed',
  'Passed with OIL',
  'Failed',
  'ยกเลิก',
];

export const CONDITIONS = ['Final', 'BUILDER LIFT', 'TEMPORARY POWER SUPPLY'];

export const MONTHS = [
  { value: 'all', label: 'ทุกเดือน' },
  { value: '01', label: 'มกราคม' },
  { value: '02', label: 'กุมภาพันธ์' },
  { value: '03', label: 'มีนาคม' },
  { value: '04', label: 'เมษายน' },
  { value: '05', label: 'พฤษภาคม' },
  { value: '06', label: 'มิถุนายน' },
  { value: '07', label: 'กรกฎาคม' },
  { value: '08', label: 'สิงหาคม' },
  { value: '09', label: 'กันยายน' },
  { value: '10', label: 'ตุลาคม' },
  { value: '11', label: 'พฤศจิกายน' },
  { value: '12', label: 'ธันวาคม' },
];

export const DEFAULT_INSPECTORS = [
  'Thongchai Chalothornnarumit',
  'Prayod Yoprakhon',
  'Choosak Choomuang',
  'Pradit Mingson',
  'Teeratat Piyasakaksorn',
  'Matee Khanti',
  'Narong Robrum',
  'Chakrin Dangwichai',
];

export const STANDARD_UNITS = ['L1', 'L2', 'PL1', 'PL2', 'SL1'];

export const DEFAULT_WIDTHS: Record<string, number> = {
  no: 50,
  inspDate: 100,
  eqNo: 110,
  genDate: 100,
  sys: 90,
  insp: 140,
  prod: 90,
  type: 90,
  site: 160,
  unit: 80,
  cond: 120,
  pre: 80,
  buz: 80,
  remark: 170,
  status: 125,
};

export const COLUMNS_DEF = [
  { id: 'no', label: 'No.' },
  { id: 'inspDate', label: 'Inspection Date' },
  { id: 'eqNo', label: 'Equipment No.' },
  { id: 'genDate', label: 'Generated Date' },
  { id: 'sys', label: 'Generated In System' },
  { id: 'insp', label: 'Inspector Name' },
  { id: 'prod', label: 'Product Line' },
  { id: 'type', label: 'Type' },
  { id: 'site', label: 'Job Site' },
  { id: 'unit', label: 'Unit' },
  { id: 'cond', label: 'Condition' },
  { id: 'pre', label: 'Pre Check' },
  { id: 'buz', label: 'Buzzer' },
  { id: 'remark', label: 'Remark' },
  { id: 'status', label: 'SAIS Status' },
];

export const getInspectorSortIndex = (name: string): number => {
  if (!name) return 99;
  const n = name.toLowerCase();
  if (n.includes('thongchai')) return 1;
  if (n.includes('prayod')) return 2;
  if (n.includes('choosak')) return 3;
  if (n.includes('pradit')) return 4;
  if (n.includes('teeratat')) return 5;
  if (n.includes('narong')) return 6;
  if (n.includes('matee')) return 7;
  if (n.includes('chakrin')) return 8;
  return 99;
};

export const formatDateToDDMMYY = (d?: string): string => {
  if (!d) return '-';
  const date = new Date(d);
  return isNaN(date.getTime())
    ? '-'
    : `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
};

export const formatDateForInput = (d?: string): string => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime())
    ? ''
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const getMonthOnly = (d?: string): string => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : String(date.getMonth() + 1).padStart(2, '0');
};

export const getYearOnly = (d?: string): string => {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : String(date.getFullYear());
};

export const parseRemarkHistory = (
  str?: string
): Array<{ text: string; date: string; author: string }> => {
  if (!str) return [];
  try {
    const p = JSON.parse(str);
    return Array.isArray(p) ? p : [{ text: str, date: '-', author: 'System' }];
  } catch (e) {
    return [{ text: str, date: '-', author: 'System' }];
  }
};
