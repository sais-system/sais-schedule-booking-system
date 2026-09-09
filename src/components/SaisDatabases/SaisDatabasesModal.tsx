import React, { useState, useMemo } from 'react';
import { Booking, Inspector, User, OilTrackingRecord } from '../../types';
import { SaisRecord, DEFAULT_INSPECTORS, getMonthOnly } from './types';
import { SaisPendingTable } from './SaisPendingTable';
import { SaisRecordModal } from './SaisRecordModal';
import { OilTrackingView } from '../OilTracking/OilTrackingView';
import { Icons } from '../Icons';

interface SaisDatabasesModalProps {
  bookings: Booking[];
  inspectors: Inspector[];
  users: User[];
  currentUser: User | null;
  cloudStatus: 'connected' | 'syncing' | 'offline' | 'error';
  initialTab?: 'dashboard' | 'databases' | 'oil_tracking';
  oilRecords?: OilTrackingRecord[];
  onRefreshOilRecords?: () => void;
  onClose: () => void;
  onSaveBooking: (booking: Partial<Booking>) => void;
  onDeleteBooking: (booking: Booking) => void;
}

export const SaisDatabasesModal: React.FC<SaisDatabasesModalProps> = ({
  bookings,
  inspectors,
  currentUser,
  cloudStatus,
  initialTab = 'databases',
  oilRecords = [],
  onRefreshOilRecords,
  onClose,
  onSaveBooking,
  onDeleteBooking,
}) => {
  // Current active tab: 'oil_tracking' or 'databases' (replaced legacy 'dashboard')
  const [activeTab, setActiveTab] = useState<'oil_tracking' | 'databases'>(
    initialTab === 'dashboard' || initialTab === 'oil_tracking' ? 'oil_tracking' : 'databases'
  );

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab === 'dashboard' || initialTab === 'oil_tracking' ? 'oil_tracking' : 'databases');
    }
  }, [initialTab]);

  // Year and period filters for Dashboard
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');

  // Month filter for Databases/Pending table
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Record modal state
  const [recordModal, setRecordModal] = useState<{
    open: boolean;
    mode: 'add' | 'edit' | 'view';
    record?: SaisRecord | null;
  }>({ open: false, mode: 'view', record: null });

  // Help Guide Modal
  const [showHelp, setShowHelp] = useState(false);

  // Inspector Names List
  const inspectorsList = useMemo(() => {
    const list = inspectors.map((i) => i.name).filter(Boolean);
    return list.length > 0 ? list : DEFAULT_INSPECTORS;
  }, [inspectors]);

  // Synchronized mapping from bookings to SAIS records
  const saisRecords: SaisRecord[] = useMemo(() => {
    return bookings
      .filter((b) => b.job_type !== 'leave' && b.job_type !== 'company_event' && b.job_type !== 'public_holiday')
      .map((b) => {
        // Derive SAIS status
        let defaultStatus = 'Passed with Completed';
        if (b.sais_status) {
          defaultStatus = b.sais_status;
        } else if (b.status === 'cancelled') {
          defaultStatus = 'ยกเลิก';
        } else {
          const isAllApproved =
            String(b.layout_doc) === 'true' &&
            String(b.wiring_doc) === 'true' &&
            String(b.precheck_doc) === 'true';
          defaultStatus = isAllApproved ? 'Passed with Completed' : 'Passed with OIL';
        }

        // Derive preCheck
        let preChk = b.pre_check || 'OK';
        if (!b.pre_check && b.precheck_doc) {
          preChk = b.precheck_doc === 'true' ? 'OK' : 'NO';
        }

        return {
          id: b.id,
          equipmentNo: b.equipment_no || b.id,
          inspectionDate: b.date,
          generatedDate: b.generated_date || '',
          generatedInSystem: b.generated_in_system || 'YES',
          inspectorName: b.inspector_name || 'Unassigned',
          productLine: b.product_line || 'ES1',
          type: b.job_type || 'NI',
          jobSite: b.site_name || '',
          unit: b.unit_no || 'L1',
          condition: b.condition || 'Final',
          preCheck: preChk,
          buzzer: b.buzzer || 'YES',
          remark: b.remark || (b.reason ? JSON.stringify([{ text: b.reason, date: b.date, author: 'System' }]) : ''),
          saisStatus: defaultStatus,
          bookingRef: b,
        };
      })
      .sort((a, b) => new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime());
  }, [bookings]);

  // Drilldown from Dashboard into Databases Table
  const handleDrillDown = (filters: { status?: string; inspector?: string; productLine?: string; type?: string }) => {
    if (selectedPeriod !== 'all' && !selectedPeriod.startsWith('q')) {
      setSelectedMonth(selectedPeriod);
    }
    setActiveTab('databases');
  };

  // Save / Update Handler that syncs directly with Booking database
  const handleSaveRecord = (rec: SaisRecord) => {
    const existing = bookings.find((b) => b.id === rec.id);

    const bookingPayload: Partial<Booking> = {
      ...(existing || {}),
      id: rec.id,
      date: rec.inspectionDate,
      equipment_no: rec.equipmentNo,
      inspector_name: rec.inspectorName,
      product_line: rec.productLine,
      job_type: rec.type,
      site_name: rec.jobSite,
      unit_no: rec.unit,
      condition: rec.condition,
      pre_check: rec.preCheck,
      buzzer: rec.buzzer,
      generated_date: rec.generatedDate,
      generated_in_system: rec.generatedInSystem,
      remark: rec.remark,
      status: rec.saisStatus === 'ยกเลิก' ? 'cancelled' : 'active',
      sais_status: rec.saisStatus,
      inspection_result: rec.saisStatus?.toLowerCase().includes('oil') ? 'pass with OIL' : rec.saisStatus,
    };

    onSaveBooking(bookingPayload);
    setRecordModal({ open: false, mode: 'view', record: null });
  };

  // Delete Handler
  const handleDeleteRecord = (id: string) => {
    const target = bookings.find((b) => b.id === id);
    if (target) {
      onDeleteBooking(target);
      setRecordModal({ open: false, mode: 'view', record: null });
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-slate-900/80 backdrop-blur-sm flex flex-col overflow-hidden animate-fade-in">
      {/* Top Application Header: Distinct separated lines for Title and Action Menu to prevent any overlap on mobile */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-3 sm:px-5 py-2 sm:py-2.5 shrink-0 shadow-md">
        {/* Line 1: Main Title, Icon & Total Count Badge */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 text-white flex items-center justify-center font-black shadow-md shrink-0">
              {activeTab === 'oil_tracking' ? (
                <Icons.FileText size={17} />
              ) : (
                <Icons.Database size={17} />
              )}
            </div>
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white flex items-center gap-1.5 whitespace-nowrap">
                {activeTab === 'oil_tracking' ? (
                  <>
                    <span>TRACKING</span>
                    <span className="text-red-500">OIL</span>
                  </>
                ) : (
                  <>
                    <span>SAIS</span>
                    <span className="text-red-500">DATABASE</span>
                  </>
                )}
              </h1>
              <span className="text-[10px] sm:text-xs font-bold text-slate-400 whitespace-nowrap">
                {activeTab === 'oil_tracking'
                  ? '(OPEN ITEM LIST)'
                  : '(PENDING RECORDS)'}
              </span>
            </div>
          </div>

          {/* Right badge on Line 1 */}
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-xl text-[10px] sm:text-xs font-bold bg-slate-800 border border-slate-700 text-slate-300 shadow-xs whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
              <span>
                {activeTab === 'oil_tracking'
                  ? `${oilRecords.length} งาน`
                  : `${saisRecords.length} รายการ`}
              </span>
            </span>
          </div>
        </div>

        {/* Line 2: Dedicated Menu & Action Bar (Separated on its own line below Title - No Overlap on Mobile) */}
        <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
          {/* Left: Realtime sync indicator */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-400">
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                cloudStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            ></span>
            <span className="text-slate-300 font-medium">
              {cloudStatus === 'connected' ? 'Firebase Realtime 100%' : 'กำลังซิงค์...'}
            </span>
          </div>

          {/* Right: Actions Menu (Handbook Guide + Back to Calendar) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-colors border border-slate-700 active:scale-95 cursor-pointer whitespace-nowrap"
              title="คู่มือการใช้งานระบบ SAIS"
            >
              <Icons.HelpCircle size={14} />
              <span>คู่มือ</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] sm:text-xs font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
              title="ปิดหน้าต่าง และกลับสู่ปฏิทิน"
            >
              <Icons.X size={14} />
              <span>กลับสู่ปฏิทิน</span>
            </button>
          </div>
        </div>
      </header>

      {/* Modal Main Content Workspace with Full Mobile Touch Scrolling Support */}
      <main className="flex-1 w-full min-h-0 h-full overflow-hidden flex flex-col bg-slate-100 relative">
        {activeTab === 'oil_tracking' ? (
          <div className="flex-1 w-full min-h-0 h-full flex flex-col overflow-hidden">
            <OilTrackingView
              oilRecords={oilRecords}
              bookings={bookings}
              inspectors={inspectors}
              currentUser={currentUser}
              onRefreshRecords={onRefreshOilRecords}
            />
          </div>
        ) : (
          <div
            className="flex-1 w-full min-h-0 h-full overflow-y-auto custom-scrollbar p-3 sm:p-5 pb-32"
            style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
          >
            <SaisPendingTable
              records={saisRecords}
              selectedMonth={selectedMonth}
              onChangeMonth={setSelectedMonth}
              onSelectRecord={(r) => setRecordModal({ open: true, mode: 'view', record: r })}
              onAddNew={() => setRecordModal({ open: true, mode: 'add', record: null })}
            />
          </div>
        )}
      </main>

      {/* Record Add / View / Edit Modal */}
      {recordModal.open && (
        <SaisRecordModal
          mode={recordModal.mode}
          record={recordModal.record}
          currentUser={currentUser}
          inspectorsList={inspectorsList}
          onClose={() => setRecordModal({ open: false, mode: 'view', record: null })}
          onSave={handleSaveRecord}
          onDelete={handleDeleteRecord}
          onSwitchToEdit={() => setRecordModal({ ...recordModal, mode: 'edit' })}
        />
      )}

      {/* User Guide & System Handbook Modal */}
      {showHelp && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
                  <Icons.HelpCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">คู่มือการใช้งาน SAIS DATABASES</h3>
                  <span className="text-[10px] text-slate-400">ระบบบริหารจัดการฐานข้อมูลและสถิติงานตรวจ</span>
                </div>
              </div>
              <button
                onClick={() => setShowHelp(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <Icons.X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <div className="p-3 bg-red-50 rounded-2xl border border-red-200 text-red-900">
                <strong className="block mb-1 font-bold">🔄 เชื่อมโยงฐานข้อมูลเดียวกัน 100%</strong>
                เมื่อคุณเพิ่ม แก้ไข หรือลบคิวงานในหน้าปฏิทิน SAIS SCHEDULE BOOKING ข้อมูลจะปรากฏและอัปเดตในระบบ SAIS DATABASES ทันทีแบบเรียลไทม์
              </div>

              <div className="space-y-1.5">
                <strong className="text-slate-800 block">ฟังก์ชันเด่นใน DATABASES (PENDING):</strong>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>ตัวกรองคอลัมน์ (Inline Column Filters):</strong> กรองแยกตามผู้ตรวจ, รุ่น, สถานะ, ประเภทงาน ได้ทันทีที่หัวตาราง</li>
                  <li><strong>ปรับขนาดคอลัมน์ (Column Resizing):</strong> ลากขอบหัวตารางเพื่อปรับความกว้างของแต่ละคอลัมน์ตามต้องการ</li>
                  <li><strong>การค้นหาแบบรวดเร็ว:</strong> ค้นหาด้วย Equipment No., ชื่อโครงการ, หรือชื่อผู้ตรวจ</li>
                  <li><strong>สถานะและหมายเหตุ:</strong> บันทึกประวัติความคิดเห็นพร้อมวันที่และชื่อผู้ลงบันทึก</li>
                </ul>
              </div>

              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <strong className="text-slate-800 block">ฟังก์ชันเด่นใน DASHBOARD:</strong>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>KPI Metrics:</strong> สถิติ Total Inspected, First Pass Yield (FPY), และอัตรา Failed พร้อมเทียบการเติบโต MoM</li>
                  <li><strong>กราฟวิเคราะห์:</strong> แผนภูมิวงกลมผลการตรวจ และแผนภูมิแท่งซ้อนแบ่งตามรุ่น Product Line</li>
                  <li><strong>Risk & Readiness:</strong> วิเคราะห์ความเสี่ยงตามประเภทงานและสภาพหน้างาน พร้อม Pre-Check & Buzzer</li>
                  <li><strong>Inspector Leaderboard:</strong> อันดับผลงานผู้ตรวจ 1-8</li>
                  <li><strong>ส่งออกข้อมูล:</strong> ดาวน์โหลดไฟล์ Excel หรือ พิมพ์/บันทึกเป็น PDF ได้ในคลิกเดียว</li>
                </ul>
              </div>
            </div>

            <button
              onClick={() => setShowHelp(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs"
            >
              เข้าใจแล้ว ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
