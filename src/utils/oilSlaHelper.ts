import { OilItem, OilMasterUid, OilTrackingRecord, OilItemStatus } from '../types';

/**
 * Standard Schindler SAIS UID Master Data Seed
 * Triangle (🔺) = 7 days (Safety-critical defect)
 * Square (🟥) = 28 days (Standard nonconformity)
 */
export const DEFAULT_OIL_MASTER_UIDS: OilMasterUid[] = [
  // Safety critical items (Triangle 🔺 = 7 days)
  {
    id: 'uid_master_1',
    uid: '2.14.1.b',
    item_type: 'triangle',
    sla_days: 7,
    category: 'บ่อลิฟต์ (Pit area)',
    description: 'สวิตช์หยุดฉุกเฉินในบ่อลิฟต์ (Pit Emergency Stop Switch) และวงจรนิรภัย',
  },
  {
    id: 'uid_master_2',
    uid: '6.0.6.b',
    item_type: 'triangle',
    sla_days: 7,
    category: 'ระบบโอเวอร์สปีด (Governor)',
    description: 'สวิตช์มู่เล่ตึงสลิงชุดควบคุมความเร็ว (Governor Tension Pulley Switch)',
  },
  {
    id: 'uid_master_3',
    uid: '1.2.3',
    item_type: 'triangle',
    sla_days: 7,
    category: 'แผงควบคุม (Controller)',
    description: 'อุปกรณ์บายพาสประตูลิฟต์ (Door Bypass Device) และระบบป้องกันการเปิดประตูผิดปกติ',
  },
  {
    id: 'uid_master_4',
    uid: '5.2.8',
    item_type: 'triangle',
    sla_days: 7,
    category: 'บัฟเฟอร์ (Buffer)',
    description: 'สวิตช์ตรวจจับระยะบัฟเฟอร์และระยะห่างปลอดภัยด้านล่าง',
  },
  {
    id: 'uid_master_5',
    uid: '8.3.2',
    item_type: 'triangle',
    sla_days: 7,
    category: 'เบรกเครื่องจักร (Machine Brake)',
    description: 'การสึกหรอของผ้าเบรกและสวิตช์ตรวจสอบการเปิด-ปิดเบรกนิรภัย',
  },
  {
    id: 'uid_master_6',
    uid: '10.1.5',
    item_type: 'triangle',
    sla_days: 7,
    category: 'เซฟตี้เกียร์ (Safety Gear)',
    description: 'หน้าสัมผัสสวิตช์ชุดเซฟตี้เกียร์ (Safety Gear Contact)',
  },

  // Standard nonconformities (Square 🟥 = 28 days)
  {
    id: 'uid_master_7',
    uid: '3.4.19',
    item_type: 'square',
    sla_days: 28,
    category: 'หลังคาหัวลิฟต์ (Car Top)',
    description: 'ชุดไฟส่องสว่างหลังคาลิฟต์และเต้ารับไฟฟ้าสำหรับงานบำรุงรักษา',
  },
  {
    id: 'uid_master_8',
    uid: '11.13.2.a',
    item_type: 'square',
    sla_days: 28,
    category: 'ห้องเครื่อง (Machine Room)',
    description: 'การระบายอากาศห้องเครื่อง ป้ายเตือน และฝาครอบป้องกันชิ้นส่วนหมุน',
  },
  {
    id: 'uid_master_9',
    uid: '4.5.1',
    item_type: 'square',
    sla_days: 28,
    category: 'หัวลิฟต์ (Car Apron)',
    description: 'แผ่นกันตกใต้หัวลิฟต์ (Car Apron Guard) และระยะห่างตามมาตรฐาน',
  },
  {
    id: 'uid_master_10',
    uid: '7.1.4',
    item_type: 'square',
    sla_days: 28,
    category: 'ประตูชั้น (Landing Door)',
    description: 'หน้าสัมผัสกลอนประตูนอกและระยะประกบของตะขอล็อก',
  },
  {
    id: 'uid_master_11',
    uid: '12.4.1',
    item_type: 'square',
    sla_days: 28,
    category: 'น้ำหนักถ่วง (Counterweight)',
    description: 'ตะแกรงป้องกันน้ำหนักถ่วงในบ่อลิฟต์และป้ายแสดงข้อมูลน้ำหนักถ่วง',
  },
  {
    id: 'uid_master_12',
    uid: '9.2.1',
    item_type: 'square',
    sla_days: 28,
    category: 'รางนำร่อง (Guide Rails)',
    description: 'การยึดจับกิ๊บรางและการหล่อลื่นรางนำร่องหัวลิฟต์',
  },
];

/**
 * Normalizes UID string for robust comparison
 * e.g. " 2.14.1.B " -> "2.14.1.b"
 */
export function normalizeUid(uid?: string): string {
  if (!uid) return '';
  return uid
    .toLowerCase()
    .trim()
    .replace(/[^\w\.]/g, '')
    .replace(/\.+$/, '');
}

/**
 * Match a UID with Master Data to determine symbol (🔺 vs 🟥) and SLA
 */
export function matchUidMaster(
  uid: string,
  masterList: OilMasterUid[]
): OilMasterUid | undefined {
  if (!uid || !masterList || masterList.length === 0) return undefined;
  const clean = normalizeUid(uid);

  // Exact match
  const exact = masterList.find((m) => normalizeUid(m.uid) === clean);
  if (exact) return exact;

  // Prefix match (e.g. "2.14.1.b.1" matches "2.14.1.b")
  const prefix = masterList.find(
    (m) => clean.startsWith(normalizeUid(m.uid)) || normalizeUid(m.uid).startsWith(clean)
  );
  return prefix;
}

/**
 * Parse various date formats safely
 */
export function parseDateString(dateStr?: string): Date {
  if (!dateStr || !dateStr.trim()) return new Date();
  const clean = dateStr.trim();

  // Match DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const d = parseInt(dmyMatch[1], 10);
    const m = parseInt(dmyMatch[2], 10);
    let y = parseInt(dmyMatch[3], 10);
    // Convert Buddhist era to Christian era if > 2500
    if (y > 2500) y -= 543;
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  // Match YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    let y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10);
    const d = parseInt(ymdMatch[3], 10);
    if (y > 2500) y -= 543;
    return new Date(y, m - 1, d, 12, 0, 0);
  }

  const parsed = new Date(clean);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Format Date to DD/MM/YYYY string
 */
export function formatDateDisplay(date: Date | string): string {
  if (!date) return '-';
  const dObj = typeof date === 'string' ? parseDateString(date) : date;
  if (isNaN(dObj.getTime())) return '-';
  const d = String(dObj.getDate()).padStart(2, '0');
  const m = String(dObj.getMonth() + 1).padStart(2, '0');
  const y = dObj.getFullYear();
  return `${d}/${m}/${y}`;
}

/**
 * Calculate SLA Due Date from a start inspection date
 */
export function calculateSlaDueDate(startDateStr: string, slaDays: number): string {
  const start = parseDateString(startDateStr);
  const due = new Date(start.getTime() + slaDays * 24 * 60 * 60 * 1000);
  return formatDateDisplay(due);
}

export type SlaStatusCategory = 'OVERDUE' | 'DUE_SOON' | 'ON_TRACK' | 'REQUEST_CLOSE' | 'CLOSED';

export interface SlaInfo {
  status: SlaStatusCategory;
  label: string;
  daysRemaining: number;
  remainingDays: number;
  remainingDaysText: string;
  isOverdue: boolean;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  badgeClass: string;
  dotColor: string;
  cardBorder: string;
  dueDateFormatted: string;
  startDateFormatted: string;
}

/**
 * Evaluate SLA status, days remaining, and responsive UI badge styling
 * Supports either:
 *   - getSlaStatus(item: OilItem, recordStartDate?: string)
 *   - getSlaStatus(dueDateStr?: string, startDateStr?: string, slaDays?: number, itemStatus?: OilItemStatus)
 */
export function getSlaStatus(
  itemOrDueDate?: OilItem | string,
  startDateStr?: string,
  slaDaysParam: number = 28,
  itemStatusParam?: OilItemStatus
): SlaInfo {
  let dueDateStr: string | undefined;
  let effectiveStartDate = startDateStr;
  let slaDays = slaDaysParam;
  let itemStatus = itemStatusParam;

  if (typeof itemOrDueDate === 'object' && itemOrDueDate !== null) {
    const item = itemOrDueDate as OilItem;
    dueDateStr = item.sla_due_date;
    effectiveStartDate = item.first_inspection_date || startDateStr;
    slaDays = item.sla_days || (item.item_type === 'triangle' ? 7 : 28);
    itemStatus = item.status;
  } else if (typeof itemOrDueDate === 'string') {
    dueDateStr = itemOrDueDate;
  } else {
    dueDateStr = undefined;
  }

  const startFormatted = effectiveStartDate ? formatDateDisplay(effectiveStartDate) : '-';

  const makeResult = (
    cat: SlaStatusCategory,
    lbl: string,
    days: number,
    bg: string,
    border: string,
    text: string,
    dot: string,
    card: string,
    dueFmt: string
  ): SlaInfo => {
    return {
      status: cat,
      label: lbl,
      daysRemaining: days,
      remainingDays: days,
      remainingDaysText: lbl,
      isOverdue: cat === 'OVERDUE',
      badgeBg: bg,
      badgeBorder: border,
      badgeText: text,
      badgeClass: `${bg} ${border} ${text}`,
      dotColor: dot,
      cardBorder: card,
      dueDateFormatted: dueFmt,
      startDateFormatted: startFormatted,
    };
  };

  if (itemStatus === 'Closed in SAP' || itemStatus === 'Verified' || itemStatus === 'Fixed') {
    return makeResult(
      'CLOSED',
      itemStatus === 'Closed in SAP' ? 'ปิดงานใน SAP' : 'ปิดงานเรียบร้อย',
      0,
      'bg-emerald-50',
      'border-emerald-300',
      'text-emerald-800 font-bold',
      'bg-emerald-500',
      'border-emerald-200 hover:border-emerald-300',
      dueDateStr || '-'
    );
  }

  if (itemStatus === 'Request Close') {
    return makeResult(
      'REQUEST_CLOSE',
      'รอ Inspector ตรวจ (Request Close)',
      0,
      'bg-blue-50',
      'border-blue-300',
      'text-blue-800 font-bold',
      'bg-blue-500',
      'border-blue-300 hover:border-blue-400 ring-1 ring-blue-200',
      dueDateStr || '-'
    );
  }

  let finalDueDate = dueDateStr;
  if (!finalDueDate && effectiveStartDate) {
    finalDueDate = calculateSlaDueDate(effectiveStartDate, slaDays);
  }

  if (!finalDueDate) {
    return makeResult(
      'ON_TRACK',
      `SLA ${slaDays} วัน`,
      slaDays,
      'bg-slate-100',
      'border-slate-200',
      'text-slate-700 font-medium',
      'bg-slate-400',
      'border-slate-200 hover:border-slate-300',
      '-'
    );
  }

  const due = parseDateString(finalDueDate);
  const now = new Date();
  // Set both to midnight for pure day comparison
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const diffDays = Math.round((dueMidnight - nowMidnight) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) {
    return makeResult(
      'OVERDUE',
      `🔴 เกินกำหนด ${Math.abs(diffDays)} วัน`,
      diffDays,
      'bg-red-50',
      'border-red-300',
      'text-red-700 font-black',
      'bg-red-600 animate-pulse',
      'border-red-300 bg-red-50/20 shadow-xs shadow-red-100',
      formatDateDisplay(due)
    );
  } else if (diffDays <= 2 || diffDays <= Math.ceil(slaDays * 0.25)) {
    return makeResult(
      'DUE_SOON',
      `🟡 ใกล้หมดเวลา (เหลือ ${diffDays} วัน)`,
      diffDays,
      'bg-amber-50',
      'border-amber-300',
      'text-amber-900 font-black',
      'bg-amber-500',
      'border-amber-300 bg-amber-50/20 shadow-xs shadow-amber-100',
      formatDateDisplay(due)
    );
  } else {
    return makeResult(
      'ON_TRACK',
      `🟢 ตามกำหนด (เหลือ ${diffDays} วัน)`,
      diffDays,
      'bg-emerald-50',
      'border-emerald-200',
      'text-emerald-800 font-bold',
      'bg-emerald-500',
      'border-slate-200 hover:border-slate-300',
      formatDateDisplay(due)
    );
  }
}

/**
 * Requirement 2: Version Control & Merge Logic (การทยอยปิดงาน)
 *
 * When uploading a new version of PDF (e.g. V.1) for an existing Equipment No.:
 * - If a UID existed in V.0 but is MISSING in V.1 -> automatically change status in Firebase to "Closed in SAP".
 * - If a UID is STILL PRESENT in V.1 -> status remains "Pending" / "Open", and SLA countdown continues from Inspection Date of V.0 without resetting!
 * - Any newly introduced UIDs in V.1 are added with version 1.
 */
export function mergeOilVersions(
  existingRecord: OilTrackingRecord,
  newItems: OilItem[],
  newInspectionDate: string,
  newInstallerFilename?: string,
  newCustomerFilename?: string,
  uploadedBy?: string
): {
  mergedItems: OilItem[];
  newVersion: number;
  firstInspectionDate: string;
  closedInSapCount: number;
  pendingCount: number;
  newlyAddedCount: number;
  newItemsCount: number;
  retainedCount: number;
} {
  const currentVersion = existingRecord.version ?? 0;
  const newVersion = currentVersion + 1;
  const firstInspectionDate =
    existingRecord.first_inspection_date ||
    existingRecord.inspection_date ||
    newInspectionDate;

  // Map incoming items by normalized UID
  const incomingMap = new Map<string, OilItem>();
  newItems.forEach((it) => {
    const key = normalizeUid(it.uid);
    if (key) incomingMap.set(key, it);
  });

  const mergedItems: OilItem[] = [];
  let closedInSapCount = 0;
  let pendingCount = 0;
  let newlyAddedCount = 0;

  // 1. Check all items that existed in previous versions (e.g. V.0)
  for (const prevItem of existingRecord.items || []) {
    const key = normalizeUid(prevItem.uid);

    // If item was already closed in SAP or verified, keep it closed
    if (prevItem.status === 'Closed in SAP') {
      mergedItems.push(prevItem);
      continue;
    }

    if (incomingMap.has(key)) {
      // UID STILL PRESENT IN V.1
      // User requirement: "ถ้า UID ไหนยังคงอยู่ใน V.1 สถานะคือ "Pending" และเวลา SLA นับถอยหลังต้องนับต่อเนื่องจาก Inspection Date ของ V.0 ไม่เริ่มนับใหม่"
      const newItem = incomingMap.get(key)!;
      const preservedFirstDate = prevItem.first_inspection_date || firstInspectionDate;
      const slaDays = prevItem.sla_days || (prevItem.item_type === 'triangle' ? 7 : 28);
      const slaDueDate =
        prevItem.sla_due_date || calculateSlaDueDate(preservedFirstDate, slaDays);

      mergedItems.push({
        ...prevItem,
        title: newItem.title || prevItem.title,
        description: newItem.description || prevItem.description,
        source: newItem.source || prevItem.source,
        item_type: prevItem.item_type || newItem.item_type,
        sla_days: slaDays,
        sla_due_date: slaDueDate,
        first_inspection_date: preservedFirstDate,
        // Status remains Open / In Progress / Request Close (Pending review)
        status:
          prevItem.status === 'Request Close'
            ? 'Request Close'
            : prevItem.status === 'In Progress'
            ? 'In Progress'
            : 'Open',
        notes:
          (prevItem.notes ? prevItem.notes + ' | ' : '') +
          `คงค้างในรายงาน V.${newVersion} (SLA นับต่อเนื่องจาก V.0)`,
      });
      pendingCount++;
      incomingMap.delete(key); // Mark as processed
    } else {
      // UID WAS IN V.0 BUT MISSING IN V.1!
      // User requirement: "ถ้า UID ไหนเคยมีใน V.0 แต่หายไปใน V.1 ระบบจะเปลี่ยนสถานะใน Firebase เป็น "Closed in SAP" อัตโนมัติ"
      mergedItems.push({
        ...prevItem,
        status: 'Closed in SAP',
        closed_at: new Date().toISOString(),
        closed_in_version: newVersion,
        notes:
          (prevItem.notes ? prevItem.notes + ' | ' : '') +
          `ปิดงานอัตโนมัติเนื่องจากไม่พบข้อนี้ในรายงาน V.${newVersion} (Closed in SAP)`,
      });
      closedInSapCount++;
    }
  }

  // 2. Any brand new UIDs introduced in V.1 that were never in V.0
  for (const [_, newItem] of incomingMap.entries()) {
    const slaDays = newItem.sla_days || (newItem.item_type === 'triangle' ? 7 : 28);
    const slaDueDate = calculateSlaDueDate(newInspectionDate || firstInspectionDate, slaDays);

    mergedItems.push({
      ...newItem,
      version_introduced: newVersion,
      first_inspection_date: newInspectionDate || firstInspectionDate,
      sla_days: slaDays,
      sla_due_date: slaDueDate,
      status: 'Open',
      notes: `เพิ่มใหม่ในรายงาน V.${newVersion}`,
    });
    pendingCount++;
    newlyAddedCount++;
  }

  return {
    mergedItems,
    newVersion,
    firstInspectionDate,
    closedInSapCount,
    pendingCount,
    newlyAddedCount,
    newItemsCount: newlyAddedCount,
    retainedCount: pendingCount,
  };
}
