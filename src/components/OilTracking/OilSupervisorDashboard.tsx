import React, { useState, useMemo } from 'react';
import { OilItem, OilTrackingRecord, User, OilItemStatus } from '../../types';
import { Icons } from '../Icons';
import { getSlaStatus } from '../../utils/oilSlaHelper';
import { OilFixUploadModal } from './OilFixUploadModal';

interface OilSupervisorDashboardProps {
  records: OilTrackingRecord[];
  currentUser: User | null;
  onSelectRecord: (record: OilTrackingRecord) => void;
  onUpdateRecord: (updatedRecord: OilTrackingRecord) => Promise<void>;
  onClose: () => void;
}

interface FlattenedOilTask {
  record: OilTrackingRecord;
  item: OilItem;
  sla: ReturnType<typeof getSlaStatus>;
}

export const OilSupervisorDashboard: React.FC<OilSupervisorDashboardProps> = ({
  records,
  currentUser,
  onSelectRecord,
  onUpdateRecord,
  onClose,
}) => {
  const [filterUrgency, setFilterUrgency] = useState<
    'ALL_ACTIVE' | 'OVERDUE' | 'DUE_SOON' | 'ON_TRACK' | 'REQUEST_CLOSE' | 'CLOSED' | 'TRIANGLE' | 'SQUARE'
  >('ALL_ACTIVE');
  const [search, setSearch] = useState('');
  const [selectedTaskForFix, setSelectedTaskForFix] = useState<FlattenedOilTask | null>(null);

  // Flatten all items across all records
  const allTasks: FlattenedOilTask[] = useMemo(() => {
    const list: FlattenedOilTask[] = [];
    records.forEach((record) => {
      (record.items || []).forEach((item) => {
        const sla = getSlaStatus(item, record.inspection_date);
        list.push({ record, item, sla });
      });
    });

    // Strict SLA Urgency Sorting:
    // 1. Overdue first (most overdue days first)
    // 2. Due soon (least remaining days first)
    // 3. On track (least remaining days first)
    // 4. Request Close
    // 5. Closed last
    const statusWeight = (t: FlattenedOilTask): number => {
      if (t.item.status === 'Closed in SAP' || t.item.status === 'Verified' || t.item.status === 'Fixed') return 5;
      if (t.item.status === 'Request Close') return 4;
      if (t.sla.status === 'OVERDUE') return 1;
      if (t.sla.status === 'DUE_SOON') return 2;
      return 3;
    };

    return list.sort((a, b) => {
      const weightA = statusWeight(a);
      const weightB = statusWeight(b);
      if (weightA !== weightB) return weightA - weightB;

      // Within same weight group, sort by remaining days ascending (least remaining first)
      return a.sla.daysRemaining - b.sla.daysRemaining;
    });
  }, [records]);

  // Counts
  const counts = useMemo(() => {
    const c = {
      total: allTasks.length,
      active: 0,
      overdue: 0,
      dueSoon: 0,
      onTrack: 0,
      requestClose: 0,
      closed: 0,
      triangle: 0,
      square: 0,
    };
    allTasks.forEach((t) => {
      const isClosed = t.item.status === 'Closed in SAP' || t.item.status === 'Verified' || t.item.status === 'Fixed';
      if (!isClosed) c.active++;
      else c.closed++;

      if (t.item.status === 'Request Close') c.requestClose++;
      if (t.sla.status === 'OVERDUE' && !isClosed) c.overdue++;
      if (t.sla.status === 'DUE_SOON' && !isClosed) c.dueSoon++;
      if (t.sla.status === 'ON_TRACK' && !isClosed) c.onTrack++;

      if (t.item.item_type === 'triangle' && !isClosed) c.triangle++;
      if (t.item.item_type === 'square' && !isClosed) c.square++;
    });
    return c;
  }, [allTasks]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter((t) => {
      const isClosed = t.item.status === 'Closed in SAP' || t.item.status === 'Verified' || t.item.status === 'Fixed';

      if (filterUrgency === 'ALL_ACTIVE' && isClosed) return false;
      if (filterUrgency === 'OVERDUE' && (t.sla.status !== 'OVERDUE' || isClosed)) return false;
      if (filterUrgency === 'DUE_SOON' && (t.sla.status !== 'DUE_SOON' || isClosed)) return false;
      if (filterUrgency === 'ON_TRACK' && (t.sla.status !== 'ON_TRACK' || isClosed)) return false;
      if (filterUrgency === 'REQUEST_CLOSE' && t.item.status !== 'Request Close') return false;
      if (filterUrgency === 'CLOSED' && !isClosed) return false;
      if (filterUrgency === 'TRIANGLE' && (t.item.item_type !== 'triangle' || isClosed)) return false;
      if (filterUrgency === 'SQUARE' && (t.item.item_type !== 'square' || isClosed)) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchEq = t.record.equipment_no.toLowerCase().includes(q);
        const matchSite = t.record.site_name.toLowerCase().includes(q);
        const matchUid = t.item.uid.toLowerCase().includes(q);
        const matchDesc = t.item.description.toLowerCase().includes(q);
        const matchSup = (t.record.supervisor || '').toLowerCase().includes(q);
        if (!matchEq && !matchSite && !matchUid && !matchDesc && !matchSup) return false;
      }

      return true;
    });
  }, [allTasks, filterUrgency, search]);

  const handleUpdateItemFix = async (updatedItem: OilItem, isRequestClose: boolean) => {
    if (!selectedTaskForFix) return;
    const targetRecord = selectedTaskForFix.record;
    const updatedItems = (targetRecord.items || []).map((it) =>
      it.id === updatedItem.id ? updatedItem : it
    );

    const updatedRecord: OilTrackingRecord = {
      ...targetRecord,
      items: updatedItems,
      updated_at: new Date().toISOString(),
    };

    await onUpdateRecord(updatedRecord);
  };

  const handleApproveCloseByInspector = async (task: FlattenedOilTask) => {
    if (
      !window.confirm(
        `ยืนยันการอนุมัติปิดงาน UID: ${task.item.uid} ของลิฟต์ ${task.record.equipment_no} หรือไม่?`
      )
    ) {
      return;
    }

    const isItemClosed = (status: OilItemStatus | undefined) =>
      status === 'Closed in SAP' || status === 'Verified' || status === 'Fixed';

    const updatedItems = (task.record.items || []).map((it) =>
      it.id === task.item.id
        ? {
            ...it,
            status: 'Verified' as const,
            verified_by: currentUser?.full_name || currentUser?.username || 'Inspector',
            verified_at: new Date().toISOString(),
            notes: (it.notes ? it.notes + ' • ' : '') + `อนุมัติปิดโดย ${currentUser?.full_name || 'Inspector'}`,
          }
        : it
    );

    const allClosed = updatedItems.every((it) => isItemClosed(it.status));

    const updatedRecord: OilTrackingRecord = {
      ...task.record,
      items: updatedItems,
      status: allClosed ? 'Completed' : task.record.status,
      updated_at: new Date().toISOString(),
    };

    await onUpdateRecord(updatedRecord);
  };

  const isInspectorOrAdmin = currentUser?.role === 'inspector' || currentUser?.role === 'admin';

  return (
    <div className="fixed inset-0 z-[650] flex flex-col bg-slate-100 overflow-hidden animate-fade-in">
      {/* Top Navbar */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shadow-md shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Icons.AlertCircle size={22} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white truncate">
                กระดานงานแก้ไข Supervisor / Fitter (SLA Urgency Dashboard)
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-black border border-amber-400/30">
                SLA เรียงตามความเร่งด่วน
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              ติดตามงานค้าง, แนบรูปหลักฐานการแก้ไขหน้างาน, และส่งขอปิดรายการ (Request Close)
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 ml-2"
        >
          <Icons.X size={15} />
          <span>กลับหน้ารายการหลัก</span>
        </button>
      </header>

      {/* SLA Metric Cards */}
      <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs">
          <button
            type="button"
            onClick={() => setFilterUrgency('ALL_ACTIVE')}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
              filterUrgency === 'ALL_ACTIVE'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold opacity-75">งานค้างทั้งหมด</div>
            <div className="text-xl font-black mt-0.5">{counts.active}</div>
            <div className="text-[10px] opacity-75 mt-0.5">จาก {counts.total} รายการ</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterUrgency('OVERDUE')}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
              filterUrgency === 'OVERDUE'
                ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-300'
                : 'bg-red-50/80 hover:bg-red-100 text-red-950 border-red-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold flex items-center gap-1 text-red-600">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
              <span>🔴 เกินระยะเวลาOIL</span>
            </div>
            <div className="text-xl font-black text-red-900 mt-0.5">{counts.overdue}</div>
            <div className="text-[10px] text-red-700 mt-0.5">ด่วนที่สุด!</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterUrgency('DUE_SOON')}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
              filterUrgency === 'DUE_SOON'
                ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-200'
                : 'bg-amber-50/80 hover:bg-amber-100 text-amber-950 border-amber-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-amber-700">🟡 ใกล้ครบ (≤ 3 วัน)</div>
            <div className="text-xl font-black text-amber-900 mt-0.5">{counts.dueSoon}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">ต้องเร่งดำเนินการ</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterUrgency('ON_TRACK')}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
              filterUrgency === 'ON_TRACK'
                ? 'bg-emerald-600 text-white border-emerald-700 shadow-md'
                : 'bg-emerald-50/80 hover:bg-emerald-100 text-emerald-950 border-emerald-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-emerald-700">🟢 แก้ไขทันตามกำหนด</div>
            <div className="text-xl font-black text-emerald-900 mt-0.5">{counts.onTrack}</div>
            <div className="text-[10px] text-emerald-700 mt-0.5">อยู่ในกรอบเวลา</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterUrgency('REQUEST_CLOSE')}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
              filterUrgency === 'REQUEST_CLOSE'
                ? 'bg-purple-600 text-white border-purple-700 shadow-md'
                : 'bg-purple-50/80 hover:bg-purple-100 text-purple-950 border-purple-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-purple-700">⏳ ส่งรูปแก้ไข (รอSAISตรวจสอบ)</div>
            <div className="text-xl font-black text-purple-900 mt-0.5">{counts.requestClose}</div>
            <div className="text-[10px] text-purple-700 mt-0.5">แนบรูปแล้ว</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterUrgency('TRIANGLE')}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
              filterUrgency === 'TRIANGLE'
                ? 'bg-amber-600 text-white border-amber-700 shadow-md'
                : 'bg-amber-50/50 hover:bg-amber-100 text-amber-900 border-amber-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold text-amber-800">🔺 สามเหลี่ยม (7 วัน)</div>
            <div className="text-xl font-black mt-0.5">{counts.triangle}</div>
            <div className="text-[10px] text-amber-700 mt-0.5">SLA สูงสุด 7 วัน</div>
          </button>

          <button
            type="button"
            onClick={() => setFilterUrgency('CLOSED')}
            className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
              filterUrgency === 'CLOSED'
                ? 'bg-slate-700 text-white border-slate-800 shadow-md'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            <div className="text-[10px] uppercase font-bold">✅ ปิดแล้ว</div>
            <div className="text-xl font-black mt-0.5">{counts.closed}</div>
            <div className="text-[10px] opacity-75 mt-0.5">สมบูรณ์</div>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 sm:px-6 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Icons.Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหา Equipment No., ไซต์งาน, เลข UID, คำอธิบาย, Supervisor..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-amber-500 outline-hidden font-medium"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          <span>แสดง {filteredTasks.length} รายการ</span>
          <span className="text-slate-300">•</span>
          <span className="text-red-600">🔴 = เลยกำหนด</span>
          <span className="text-amber-600">🟡 = ใกล้ครบ</span>
          <span className="text-emerald-600">🟢 = ปกติ</span>
        </div>
      </div>

      {/* Task Cards Stream */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-6 space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-3 max-w-lg mx-auto shadow-2xs">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <Icons.CheckCircle size={32} />
            </div>
            <h3 className="text-sm font-black text-slate-900">ไม่พบรายการงานที่ตรงกับเงื่อนไข</h3>
            <p className="text-xs text-slate-500">
              {filterUrgency === 'OVERDUE'
                ? 'ยอดเยี่ยมมาก! ไม่มีรายการที่เกินระยะเวลาOIL ในขณะนี้'
                : 'ลองปรับตัวกรองหรือคำค้นหาด้านบน'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredTasks.map((task) => {
              const { record, item, sla } = task;
              const hasPhotos = (item.fix_photos || []).length > 0;
              const isClosed = item.status === 'Closed' || item.status === 'Closed in SAP';

              return (
                <div
                  key={`${record.id}_${item.id}`}
                  className={`rounded-3xl border transition-all duration-200 shadow-2xs flex flex-col justify-between overflow-hidden bg-white ${sla.borderClass} ${
                    sla.status === 'OVERDUE' && !isClosed ? 'ring-2 ring-red-400/40' : ''
                  }`}
                >
                  {/* Card Top */}
                  <div className="p-4 space-y-3">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onSelectRecord(record)}
                          className="font-mono font-black text-sm text-slate-900 hover:text-amber-600 transition-colors flex items-center gap-1.5 truncate cursor-pointer text-left"
                          title="คลิกเพื่อดูเอกสารและรายละเอียดทั้งหมด"
                        >
                          <span>{record.equipment_no}</span>
                          <span className="text-[11px] font-normal text-slate-400 font-sans truncate">
                            ({record.site_name})
                          </span>
                        </button>
                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <span>ตรวจ: {item.first_inspection_date || record.inspection_date || '-'}</span>
                          {record.supervisor && (
                            <>
                              <span>•</span>
                              <span className="truncate">Sup: {record.supervisor}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* SLA Urgency Badge */}
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-black border shrink-0 flex items-center gap-1 ${sla.badgeClass}`}
                      >
                        {sla.status === 'OVERDUE' && !isClosed && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                        )}
                        <span>{sla.label}</span>
                      </span>
                    </div>

                    {/* UID and Symbol row */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 font-mono font-black text-slate-800 text-xs">
                        UID: {item.uid}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-black border flex items-center gap-1 ${
                          item.item_type === 'triangle'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-red-100 text-red-900 border-red-300'
                        }`}
                      >
                        <span>{item.item_type === 'triangle' ? '🔺 7 วัน' : '🟥 28 วัน'}</span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                        {item.source}
                      </span>

                      {/* Status Tag */}
                      <span
                        className={`ml-auto px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                          item.status === 'Closed'
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : item.status === 'Closed in SAP'
                            ? 'bg-blue-100 text-blue-800 border-blue-300'
                            : item.status === 'Request Close'
                            ? 'bg-purple-100 text-purple-800 border-purple-300'
                            : item.status === 'In Progress'
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {item.status === 'Request Close' ? '⏳ รอตรวจปิด' : item.status}
                      </span>
                    </div>

                    {/* Due date countdown banner */}
                    <div
                      className={`p-2 rounded-xl text-[11px] font-bold flex items-center justify-between ${
                        sla.status === 'OVERDUE' && !isClosed
                          ? 'bg-red-50 text-red-900 border border-red-200'
                          : sla.status === 'DUE_SOON' && !isClosed
                          ? 'bg-amber-50 text-amber-900 border border-amber-200'
                          : 'bg-slate-50 text-slate-700 border border-slate-200'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Icons.Clock size={13} className="shrink-0" />
                        <span>กำหนดเสร็จ: {item.sla_due_date || '-'}</span>
                      </span>
                      <span className="font-black">
                        {isClosed ? 'ปิดรายการแล้ว' : sla.remainingDaysText}
                      </span>
                    </div>

                    {/* Finding Description */}
                    <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 font-medium leading-relaxed max-h-24 overflow-y-auto">
                      {item.title && <div className="font-bold text-slate-900 mb-1">{item.title}</div>}
                      {item.description || 'ไม่มีรายละเอียด'}
                    </div>

                    {/* Action notes / photos preview if available */}
                    {(item.fix_notes || hasPhotos) && (
                      <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs space-y-1.5">
                        {item.fix_notes && (
                          <div className="text-amber-950 font-medium leading-relaxed">
                            <span className="font-bold">การแก้ไข:</span> {item.fix_notes}
                          </div>
                        )}
                        {hasPhotos && (
                          <div className="flex items-center gap-2 text-[11px] font-bold text-amber-800">
                            <Icons.Camera size={13} />
                            <span>แนบรูปแล้ว {(item.fix_photos || []).length} รูป</span>
                            {item.fix_submitted_by && (
                              <span className="text-slate-500 font-normal">
                                • โดย {item.fix_submitted_by}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="p-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => onSelectRecord(record)}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                    >
                      ดูลิฟต์นี้
                    </button>

                    <div className="flex items-center gap-1.5">
                      {/* Approve button for Inspector / Admin if requested close */}
                      {isInspectorOrAdmin && item.status === 'Request Close' && (
                        <button
                          type="button"
                          onClick={() => handleApproveCloseByInspector(task)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1"
                          title="อนุมัติปิดรายการ"
                        >
                          <Icons.CheckCircle size={13} />
                          <span>อนุมัติปิด</span>
                        </button>
                      )}

                      {/* Fix / Upload button */}
                      <button
                        type="button"
                        onClick={() => setSelectedTaskForFix(task)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 shadow-xs ${
                          hasPhotos
                            ? 'bg-amber-500 hover:bg-amber-600 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        <Icons.Camera size={13} />
                        <span>{hasPhotos ? 'แก้ไขรูป/ข้อมูล' : '+ แนบรูปแก้ไข'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upload Fix Modal */}
      {selectedTaskForFix && (
        <OilFixUploadModal
          record={selectedTaskForFix.record}
          item={selectedTaskForFix.item}
          currentUser={currentUser}
          onClose={() => setSelectedTaskForFix(null)}
          onSubmitFix={handleUpdateItemFix}
        />
      )}
    </div>
  );
};
