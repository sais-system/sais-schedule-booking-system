import React, { useState, useEffect, useMemo } from 'react';
import { OilTrackingRecord, Booking, Inspector, User } from '../../types';
import { Icons } from '../Icons';
import { OilUploadModal } from './OilUploadModal';
import { OilEditableVerifyModal } from './OilEditableVerifyModal';
import { OilDetailModal } from './OilDetailModal';
import {
  firestoreSaveOilRecord,
  firestoreDeleteOilRecord,
  autoSyncAllBookingsToOilTracking,
} from '../../firebase';

interface OilTrackingViewProps {
  oilRecords: OilTrackingRecord[];
  bookings: Booking[];
  inspectors: Inspector[];
  currentUser: User | null;
  onRefreshRecords?: () => void;
}

export const OilTrackingView: React.FC<OilTrackingViewProps> = ({
  oilRecords,
  bookings,
  inspectors,
  currentUser,
  onRefreshRecords,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'triangle' | 'square'>('ALL');
  const [selectedInspector, setSelectedInspector] = useState<string>('ALL');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('ALL');

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedRecordForUpload, setSelectedRecordForUpload] = useState<OilTrackingRecord | null>(null);

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyModalData, setVerifyModalData] = useState<any>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<OilTrackingRecord | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Auto sync on mount: check if there are any bookings with 'pass with OIL' that don't have tracking yet!
  useEffect(() => {
    const runInitialAutoSync = async () => {
      try {
        const passWithOilBookings = bookings.filter((b) => {
          const res = (b.inspection_result || b.sais_status || '').toLowerCase();
          return res.includes('pass with oil') || res.includes('passed with oil');
        });

        if (passWithOilBookings.length > 0) {
          const syncedCount = await autoSyncAllBookingsToOilTracking(bookings, oilRecords);
          if (syncedCount > 0) {
            console.log(`Auto-synced ${syncedCount} new 'pass with OIL' records`);
            if (onRefreshRecords) onRefreshRecords();
          }
        }
      } catch (e) {
        console.warn('Initial auto-sync error:', e);
      }
    };

    runInitialAutoSync();
  }, [bookings.length]);

  // Manual Trigger for Auto-Sync
  const handleManualSync = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const added = await autoSyncAllBookingsToOilTracking(bookings, oilRecords);
      if (added > 0) {
        setSyncFeedback(`ซิงค์สำเร็จ! สร้างรายการ Tracking ใหม่ ${added} งาน`);
        if (onRefreshRecords) onRefreshRecords();
      } else {
        setSyncFeedback('ข้อมูลเป็นปัจจุบันแล้ว ไม่มีรายการ pass with OIL ใหม่');
      }
    } catch (e: any) {
      setSyncFeedback('เกิดข้อผิดพลาดในการซิงค์ข้อมูล');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Open PDF upload for a specific existing record
  const handleOpenUploadForRecord = (record: OilTrackingRecord) => {
    setSelectedRecordForUpload(record);
    setUploadModalOpen(true);
  };

  // Open PDF upload for brand new manual record
  const handleOpenUploadNew = () => {
    setSelectedRecordForUpload(null);
    setUploadModalOpen(true);
  };

  // When PDF parsing finishes, open the Editable Verification Modal
  const handleParsedSuccess = (parsedData: any) => {
    setUploadModalOpen(false);
    setVerifyModalData(parsedData);
    setVerifyModalOpen(true);
  };

  // Confirm save to Firebase
  const handleSaveToFirebase = async (record: OilTrackingRecord) => {
    try {
      await firestoreSaveOilRecord(record);
      setVerifyModalOpen(false);
      setVerifyModalData(null);
      setSyncFeedback(`บันทึกข้อมูล Equipment No: ${record.equipment_no} ลง Firebase เรียบร้อยแล้ว`);
      setTimeout(() => setSyncFeedback(null), 5000);
      if (onRefreshRecords) onRefreshRecords();
    } catch (err: any) {
      console.error('Error saving oil record:', err);
      alert(`ไม่สามารถบันทึกข้อมูลลง Firebase ได้: ${err?.message || err}`);
    }
  };

  // Delete record
  const handleDeleteRecord = async (record: OilTrackingRecord) => {
    if (
      !window.confirm(
        `คุณต้องการลบรายการ Tracking OIL ของ Equipment No: ${record.equipment_no} (${record.site_name}) หรือไม่?`
      )
    ) {
      return;
    }

    try {
      await firestoreDeleteOilRecord(record.id);
      if (onRefreshRecords) onRefreshRecords();
    } catch (e) {
      console.error('Delete error:', e);
      alert('ไม่สามารถลบรายการได้');
    }
  };

  // View details
  const handleViewDetail = (record: OilTrackingRecord) => {
    setSelectedRecordForDetail(record);
    setDetailModalOpen(true);
  };

  // 1. Scoped records based on active filters (inspector, supervisor, type, search)
  // This ensures status cards dynamically update whenever filters are changed!
  const scopedRecords = useMemo(() => {
    let list = oilRecords;

    if (typeFilter !== 'ALL') {
      list = list.filter((r) =>
        r.items &&
        r.items.some((i) => (typeFilter === 'triangle' ? i.item_type === 'triangle' : i.item_type !== 'triangle'))
      );
    }

    if (selectedInspector !== 'ALL') {
      list = list.filter((r) => r.inspector_name?.trim() === selectedInspector.trim());
    }

    if (selectedSupervisor !== 'ALL') {
      list = list.filter((r) => (r.supervisor?.trim() || '') === selectedSupervisor.trim());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        const matchEq = r.equipment_no?.toLowerCase().includes(q);
        const matchSite = r.site_name?.toLowerCase().includes(q);
        const matchInsp = r.inspector_name?.toLowerCase().includes(q);
        const matchSup = r.supervisor?.toLowerCase().includes(q);
        const matchDate = r.inspection_date?.toLowerCase().includes(q);
        const matchItem = r.items?.some(
          (i) => i.uid?.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q)
        );
        return matchEq || matchSite || matchInsp || matchSup || matchDate || matchItem;
      });
    }

    return list;
  }, [oilRecords, typeFilter, selectedInspector, selectedSupervisor, searchQuery]);

  // Total Sites & All UIDs (Dynamically scoped to selected filters)
  const totalSitesCount = scopedRecords.length;
  const totalUidsCount = scopedRecords.reduce((acc, r) => {
    if (!r.items) return acc;
    if (typeFilter === 'triangle') {
      return acc + r.items.filter((i) => i.item_type === 'triangle').length;
    } else if (typeFilter === 'square') {
      return acc + r.items.filter((i) => i.item_type !== 'triangle').length;
    }
    return acc + r.items.length;
  }, 0);
  const totalTrianglesCount = scopedRecords.reduce(
    (acc, r) => acc + (r.items ? r.items.filter((i) => i.item_type === 'triangle').length : 0),
    0
  );
  const totalSquaresCount = scopedRecords.reduce(
    (acc, r) => acc + (r.items ? r.items.filter((i) => i.item_type !== 'triangle').length : 0),
    0
  );

  // 2. รายการคงค้าง (Pending Sites) - Dynamically calculated from scopedRecords
  const pendingRecords = useMemo(() => {
    return scopedRecords.filter((r) => {
      if (r.status === 'Completed') return false;
      if (r.status === 'Waiting for PDF' || r.status === 'OIL Recorded' || r.status === 'In Progress') {
        return true;
      }
      if (r.items && r.items.length > 0) {
        return r.items.some((i) => i.status === 'Open' || i.status === 'In Progress');
      }
      return true;
    });
  }, [scopedRecords]);

  const pendingSitesCount = pendingRecords.length;
  const pendingUidsCount = pendingRecords.reduce((acc, r) => {
    if (!r.items) return acc;
    let relevantItems = r.items;
    if (typeFilter === 'triangle') {
      relevantItems = relevantItems.filter((i) => i.item_type === 'triangle');
    } else if (typeFilter === 'square') {
      relevantItems = relevantItems.filter((i) => i.item_type !== 'triangle');
    }
    const openItems = relevantItems.filter((i) => i.status === 'Open' || i.status === 'In Progress').length;
    return acc + (openItems > 0 ? openItems : relevantItems.length);
  }, 0);
  const pendingTrianglesCount = pendingRecords.reduce((acc, r) => {
    if (!r.items) return acc;
    return (
      acc +
      r.items.filter(
        (i) => (i.status === 'Open' || i.status === 'In Progress') && i.item_type === 'triangle'
      ).length
    );
  }, 0);
  const pendingSquaresCount = pendingRecords.reduce((acc, r) => {
    if (!r.items) return acc;
    return (
      acc +
      r.items.filter(
        (i) => (i.status === 'Open' || i.status === 'In Progress') && i.item_type !== 'triangle'
      ).length
    );
  }, 0);
  const waitingPdfCount = scopedRecords.filter((r) => r.status === 'Waiting for PDF').length;

  // 3. ปิดรายการ OIL ครบแล้ว (Completed Sites) - Dynamically calculated from scopedRecords
  const completedRecords = useMemo(() => {
    return scopedRecords.filter((r) => {
      if (r.status === 'Completed') return true;
      if (r.items && r.items.length > 0) {
        return r.items.every((i) => i.status === 'Fixed' || i.status === 'Verified');
      }
      return false;
    });
  }, [scopedRecords]);

  const completedSitesCount = completedRecords.length;
  const completedUidsCount = completedRecords.reduce((acc, r) => {
    if (!r.items) return acc;
    if (typeFilter === 'triangle') {
      return acc + r.items.filter((i) => i.item_type === 'triangle').length;
    } else if (typeFilter === 'square') {
      return acc + r.items.filter((i) => i.item_type !== 'triangle').length;
    }
    return acc + r.items.length;
  }, 0);
  const completedTrianglesCount = completedRecords.reduce((acc, r) => {
    if (!r.items) return acc;
    return acc + r.items.filter((i) => i.item_type === 'triangle').length;
  }, 0);
  const completedSquaresCount = completedRecords.reduce((acc, r) => {
    if (!r.items) return acc;
    return acc + r.items.filter((i) => i.item_type !== 'triangle').length;
  }, 0);

  // Unique list of inspectors for filter
  const availableInspectors = useMemo(() => {
    const set = new Set<string>();
    oilRecords.forEach((r) => {
      if (r.inspector_name && r.inspector_name.trim()) set.add(r.inspector_name.trim());
    });
    inspectors.forEach((ins) => {
      if (ins.name && ins.name.trim()) set.add(ins.name.trim());
    });
    return Array.from(set).sort();
  }, [oilRecords, inspectors]);

  // Unique list of supervisors for filter
  const availableSupervisors = useMemo(() => {
    const set = new Set<string>();
    oilRecords.forEach((r) => {
      if (r.supervisor && r.supervisor.trim()) set.add(r.supervisor.trim());
    });
    return Array.from(set).sort();
  }, [oilRecords]);

  // Filter records based on selected status card
  const filteredRecords = useMemo(() => {
    if (statusFilter === 'PENDING') {
      return pendingRecords;
    } else if (statusFilter === 'COMPLETED') {
      return completedRecords;
    }
    return scopedRecords;
  }, [statusFilter, pendingRecords, completedRecords, scopedRecords]);

  return (
    <div
      className="flex-1 w-full h-full min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50 pb-36"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* Top Action Bar: Clean, uncluttered, single row without repeating modal title */}
      <div className="bg-slate-900 text-white px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            title="ตรวจสอบและดึงงาน 'pass with OIL' จากปฏิทินมาสร้าง Tracking อัตโนมัติ"
          >
            <Icons.RefreshCw size={13} className={isSyncing ? 'animate-spin text-red-400' : 'text-slate-400'} />
            <span>ซิงค์รายการ pass with OIL</span>
          </button>
          {isSyncing && <span className="text-[11px] text-amber-400 font-medium">กำลังซิงค์ข้อมูล...</span>}
        </div>

        <button
          type="button"
          onClick={handleOpenUploadNew}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black shadow-md shadow-red-950/40 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
        >
          <Icons.Plus size={15} />
          <span>+ สกัดข้อมูลจาก PDF / เพิ่มงานเก่า</span>
        </button>
      </div>

      {syncFeedback && (
        <div className="mx-3.5 sm:mx-6 mt-2.5 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <Icons.CheckCircle size={15} className="text-emerald-400 shrink-0" />
            <span>{syncFeedback}</span>
          </div>
          <button onClick={() => setSyncFeedback(null)} className="text-emerald-400 hover:text-white p-1 cursor-pointer">
            <Icons.X size={13} />
          </button>
        </div>
      )}

      {/* Redesigned 3-Card Status Bar: Pending -> Completed -> Total Sites (moved after Completed) */}
      <div className="p-3.5 sm:p-6 pb-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: รายการคงค้าง (Pending Sites) */}
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            statusFilter === 'PENDING'
              ? 'bg-amber-50/80 border-amber-500 shadow-md ring-2 ring-amber-500'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span className="text-xs font-black text-amber-900">รายการคงค้าง</span>
            </div>
            {waitingPdfCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 text-amber-900">
                รอ PDF {waitingPdfCount} ไซต์
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700">{pendingSitesCount} <span className="text-xs font-bold text-amber-900/60">ไซต์งาน</span></span>
            <span className="text-xs font-bold text-amber-800">{pendingUidsCount} ข้อ UID คงค้าง</span>
          </div>
          <div className="mt-2 pt-2 border-t border-amber-200/60 flex items-center justify-between text-[11px] font-bold">
            <span className="text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-lg border border-amber-300">
              △ {pendingTrianglesCount} สามเหลี่ยม
            </span>
            <span className="text-slate-700 bg-white/80 px-2 py-0.5 rounded-lg border border-amber-200">
              □ {pendingSquaresCount} สี่เหลี่ยม
            </span>
          </div>
        </div>

        {/* Card 2: ปิดรายการ OIL ครบแล้ว */}
        <div
          onClick={() => setStatusFilter('COMPLETED')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            statusFilter === 'COMPLETED'
              ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-500'
              : 'bg-white border-slate-200 hover:border-emerald-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <Icons.CheckCircle size={14} className="text-emerald-600" />
              <span className="text-xs font-black text-emerald-900">ปิดรายการ OIL ครบแล้ว</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
              {totalSitesCount > 0 ? Math.round((completedSitesCount / totalSitesCount) * 100) : 0}% สำเร็จ
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700">{completedSitesCount} <span className="text-xs font-bold text-emerald-900/60">ไซต์งาน</span></span>
            <span className="text-xs font-bold text-emerald-800">{completedUidsCount} ข้อ UID ปิดครบ</span>
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] font-bold">
            <span className="text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-lg border border-emerald-300">
              △ {completedTrianglesCount} สามเหลี่ยม
            </span>
            <span className="text-slate-700 bg-white/80 px-2 py-0.5 rounded-lg border border-emerald-200">
              □ {completedSquaresCount} สี่เหลี่ยม
            </span>
          </div>
        </div>

        {/* Card 3: จำนวนไซต์งานทั้งหมด (ย้ายไว้ถัดลงมาจากแถบสถานะปิดรายการ OIL ครบแล้ว) */}
        <div
          onClick={() => setStatusFilter('ALL')}
          className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            statusFilter === 'ALL'
              ? 'bg-white border-slate-900 shadow-md ring-2 ring-slate-900'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-500">จำนวนไซต์งานทั้งหมด</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              ทั้งหมด
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{totalSitesCount} <span className="text-xs font-bold text-slate-500">ไซต์งาน</span></span>
            <span className="text-xs font-bold text-slate-600">{totalUidsCount} ข้อ UID รวม</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
            <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
              △ {totalTrianglesCount} สามเหลี่ยม
            </span>
            <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
              □ {totalSquaresCount} สี่เหลี่ยม
            </span>
          </div>
        </div>
      </div>

      {/* Comprehensive Filter Toolbar: Search + Inspector + Supervisor + Triangle/Square */}
      <div className="px-3.5 sm:px-6 py-2 flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex flex-1 flex-wrap items-center gap-2 min-w-[280px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Icons.Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหา Equipment, ไซต์, UID..."
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-hidden transition-all shadow-2xs font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
              >
                <Icons.X size={13} />
              </button>
            )}
          </div>

          {/* Filter: ผู้ตรวจ (Inspector) */}
          <div className="flex items-center gap-1 min-w-[140px]">
            <select
              value={selectedInspector}
              onChange={(e) => setSelectedInspector(e.target.value)}
              className={`w-full py-1.5 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer outline-hidden shadow-2xs ${
                selectedInspector !== 'ALL'
                  ? 'bg-red-50 text-red-900 border-red-300 ring-1 ring-red-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="ALL">👤 ผู้ตรวจ: ทั้งหมด</option>
              {availableInspectors.map((name) => (
                <option key={name} value={name}>
                  👤 {name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter: ผู้รับผิดชอบ (Supervisor) */}
          <div className="flex items-center gap-1 min-w-[150px]">
            <select
              value={selectedSupervisor}
              onChange={(e) => setSelectedSupervisor(e.target.value)}
              className={`w-full py-1.5 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer outline-hidden shadow-2xs ${
                selectedSupervisor !== 'ALL'
                  ? 'bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
              }`}
            >
              <option value="ALL">👔 Supervisor: ทั้งหมด</option>
              {availableSupervisors.map((sup) => (
                <option key={sup} value={sup}>
                  👔 {sup}
                </option>
              ))}
            </select>
          </div>

          {/* Reset button if any filter is active */}
          {(selectedInspector !== 'ALL' || selectedSupervisor !== 'ALL' || typeFilter !== 'ALL' || searchQuery || statusFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSelectedInspector('ALL');
                setSelectedSupervisor('ALL');
                setTypeFilter('ALL');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="px-2 py-1.5 rounded-xl text-[11px] font-bold text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer whitespace-nowrap"
              title="ล้างตัวกรองทั้งหมด"
            >
              รีเซ็ตตัวกรอง
            </button>
          )}
        </div>

        {/* Quick Defect Type Toggle: All vs Triangle vs Square */}
        <div className="flex items-center gap-1 text-xs shrink-0 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setTypeFilter('ALL')}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
              typeFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            ทุกประเภท
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('triangle')}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              typeFilter === 'triangle'
                ? 'bg-amber-600 text-white shadow-2xs ring-1 ring-amber-600'
                : 'bg-white text-amber-800 hover:bg-amber-50 border border-amber-300'
            }`}
          >
            <span>△</span>
            <span>สามเหลี่ยม</span>
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('square')}
            className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
              typeFilter === 'square'
                ? 'bg-slate-700 text-white shadow-2xs ring-1 ring-slate-700'
                : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
            }`}
          >
            <span>□</span>
            <span>สี่เหลี่ยม</span>
          </button>
        </div>
      </div>

      {/* Main Records Table / Cards */}
      <div className="p-3 sm:p-6">
        {filteredRecords.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs max-w-xl mx-auto space-y-3">
            <div className="w-14 h-14 rounded-3xl bg-red-50 text-red-500 flex items-center justify-center mx-auto">
              <Icons.FileText size={28} />
            </div>
            <h3 className="text-sm font-black text-slate-800">
              {oilRecords.length === 0
                ? 'ยังไม่มีรายการ Tracking OIL ในระบบ'
                : 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed px-4">
              {oilRecords.length === 0
                ? 'ระบบจะสร้างรายการอัตโนมัติเมื่อพบผลตรวจ "pass with OIL" หรือท่านสามารถกดปุ่มด้านล่างเพื่ออัปโหลด PDF งานเก่าได้ทันที'
                : 'ลองเปลี่ยนคำค้นหา หรือเลือกตัวกรองสถานะเป็น "ทั้งหมด"'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={handleManualSync}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                ซิงค์งานจากระบบ
              </button>
              <button
                onClick={handleOpenUploadNew}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
              >
                + เพิ่ม Tracking งานเก่า (อัปโหลด 2 PDF)
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Mobile View: High-clarity Card List (for mobile phones) */}
            <div className="space-y-3 block sm:hidden">
              {filteredRecords.map((record, index) => {
                const itemCount = record.items ? record.items.length : 0;
                const triCount = record.items
                  ? record.items.filter((i) => i.item_type === 'triangle').length
                  : 0;
                const sqCount = record.items
                  ? record.items.filter((i) => i.item_type !== 'triangle').length
                  : 0;
                const isWaitingPdf = record.status === 'Waiting for PDF';

                return (
                  <div
                    key={record.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3"
                  >
                    {/* Top Row: Equipment No. & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-black text-slate-900 text-sm tracking-tight bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200 inline-block">
                          {record.equipment_no}
                        </span>
                        <h4 className="font-bold text-slate-800 text-xs mt-1">
                          {record.site_name}
                        </h4>
                      </div>

                      <div>
                        {isWaitingPdf ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-300 font-black text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Waiting for PDF
                          </span>
                        ) : record.status === 'Completed' ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 font-black text-[10px]">
                            <Icons.CheckCircle size={11} className="text-emerald-600" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-300 font-black text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            {record.status || 'OIL Recorded'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Details */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px]">วันที่ตรวจ</span>
                        <span className="font-bold text-slate-700">{record.inspection_date || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">ผู้ตรวจ (SAIS)</span>
                        <span className="font-bold text-slate-700">{record.inspector_name || '-'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-slate-400 block text-[10px]">ผู้รับผิดชอบ (Supervisor)</span>
                        <span className="font-bold text-slate-700">{record.supervisor || '-'}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-between pt-1 border-t border-slate-200/60">
                        <span className="text-slate-400 text-[10px]">ข้อบกพร่อง (OIL Items):</span>
                        {itemCount === 0 ? (
                          <span className="text-slate-400 italic text-[10px]">ยังไม่มีรายการ</span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-black text-slate-900">{itemCount} ข้อ</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 text-[9px] font-bold">
                              △ {triCount} สามเหลี่ยม
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[9px] font-bold">
                              □ {sqCount} สี่เหลี่ยม
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Touch-Friendly Mobile Actions */}
                    <div className="flex items-center gap-2 pt-1">
                      {isWaitingPdf ? (
                        <button
                          onClick={() => handleOpenUploadForRecord(record)}
                          className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                        >
                          <Icons.Upload size={14} />
                          <span>อัปโหลด 2 PDF</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleViewDetail(record)}
                          className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                        >
                          <Icons.FileText size={14} />
                          <span>ดูรายการOILคงค้าง ({itemCount})</span>
                        </button>
                      )}

                      <button
                        onClick={() => {
                          setVerifyModalData({
                            equipmentNo: record.equipment_no,
                            siteName: record.site_name,
                            inspectorName: record.inspector_name,
                            inspectionDate: record.inspection_date,
                            supervisor: record.supervisor,
                            items: record.items || [],
                            installerFilename: record.installer_filename,
                            customerFilename: record.customer_filename,
                            existingRecordId: record.id,
                            bookingId: record.booking_id,
                          });
                          setVerifyModalOpen(true);
                        }}
                        className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                        title="แก้ไขตาราง"
                      >
                        <Icons.Edit size={16} />
                      </button>

                      <button
                        onClick={() => handleDeleteRecord(record)}
                        className="p-2 text-slate-400 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                        title="ลบรายการนี้"
                      >
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet & Desktop View: High-density Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden hidden sm:block">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-3 px-3.5 w-12 text-center">#</th>
                      <th className="py-3 px-3.5 w-36">สถานะ (Status)</th>
                      <th className="py-3 px-3.5 w-40">Equipment No.</th>
                      <th className="py-3 px-3.5 min-w-[200px]">Site Name (สถานที่ติดตั้ง)</th>
                      <th className="py-3 px-3.5 w-32">วันที่ตรวจ</th>
                      <th className="py-3 px-3.5 w-32">ผู้ตรวจ (SAIS)</th>
                      <th className="py-3 px-3.5 w-32">ผู้รับผิดชอบ (Supervisor)</th>
                      <th className="py-3 px-3.5 w-48">จำนวนปัญหา (OIL Items)</th>
                      <th className="py-3 px-3.5 w-28 text-center">แหล่งที่มา</th>
                      <th className="py-3 px-3.5 w-52 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredRecords.map((record, index) => {
                      const itemCount = record.items ? record.items.length : 0;
                      const triCount = record.items
                        ? record.items.filter((i) => i.item_type === 'triangle').length
                        : 0;
                      const sqCount = record.items
                        ? record.items.filter((i) => i.item_type !== 'triangle').length
                        : 0;
                      const isWaitingPdf = record.status === 'Waiting for PDF';

                      return (
                        <tr
                          key={record.id}
                          className="hover:bg-slate-50/80 transition-colors group"
                        >
                          {/* Index */}
                          <td className="py-3 px-3.5 text-center font-bold text-slate-400">
                            {index + 1}
                          </td>

                          {/* Status Badge */}
                          <td className="py-3 px-3.5">
                            {isWaitingPdf ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-300 font-black text-[10px]">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                                Waiting for PDF
                              </span>
                            ) : record.status === 'Completed' ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-300 font-black text-[10px]">
                                <Icons.CheckCircle size={12} className="text-emerald-600" />
                                Completed
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-700 border border-blue-300 font-black text-[10px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                                {record.status || 'OIL Recorded'}
                              </span>
                            )}
                          </td>

                          {/* Equipment No. */}
                          <td className="py-3 px-3.5">
                            <span className="font-mono font-black text-slate-900 text-xs tracking-tight bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">
                              {record.equipment_no}
                            </span>
                          </td>

                          {/* Site Name */}
                          <td className="py-3 px-3.5">
                            <p className="font-bold text-slate-800">{record.site_name}</p>
                            {record.notes && (
                              <p className="text-[10px] text-slate-400 truncate max-w-xs">
                                {record.notes}
                              </p>
                            )}
                          </td>

                          {/* Inspection Date */}
                          <td className="py-3 px-3.5 font-bold text-slate-700">
                            {record.inspection_date || '-'}
                          </td>

                          {/* Inspector */}
                          <td className="py-3 px-3.5 text-slate-700 font-medium">
                            {record.inspector_name || '-'}
                          </td>

                          {/* Supervisor */}
                          <td className="py-3 px-3.5 text-slate-700 font-medium">
                            {record.supervisor ? (
                              <span className="font-bold text-slate-800">{record.supervisor}</span>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">-</span>
                            )}
                          </td>

                          {/* OIL Items Count (Triangle vs Square) */}
                          <td className="py-3 px-3.5">
                            {itemCount === 0 ? (
                              <span className="text-[11px] text-slate-400 italic">
                                ยังไม่มีรายการปัญหา
                              </span>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-slate-900">
                                  {itemCount} ข้อ
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                                  △ {triCount} สามเหลี่ยม
                                </span>
                                <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                                  □ {sqCount} สี่เหลี่ยม
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Source */}
                          <td className="py-3 px-3.5 text-center">
                            {record.source === 'auto' || record.booking_id ? (
                              <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                                Auto
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                                Manual
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Prominent Upload button if waiting for PDF */}
                              {isWaitingPdf && (
                                <button
                                  onClick={() => handleOpenUploadForRecord(record)}
                                  className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                                  title="อัปโหลดไฟล์ PDF 2 ไฟล์สำหรับงานนี้"
                                >
                                  <Icons.Upload size={13} />
                                  <span>อัปโหลด 2 PDF</span>
                                </button>
                              )}

                              {/* View detail button renamed to ดูรายการOILคงค้าง */}
                              <button
                                onClick={() => handleViewDetail(record)}
                                className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold transition-colors cursor-pointer shadow-2xs whitespace-nowrap"
                                title="ดูและจัดการรายการ OIL คงค้าง"
                              >
                                ดูรายการOILคงค้าง
                              </button>

                              {/* Edit table button */}
                              <button
                                onClick={() => {
                                  setVerifyModalData({
                                    equipmentNo: record.equipment_no,
                                    siteName: record.site_name,
                                    inspectorName: record.inspector_name,
                                    inspectionDate: record.inspection_date,
                                    supervisor: record.supervisor,
                                    items: record.items || [],
                                    installerFilename: record.installer_filename,
                                    customerFilename: record.customer_filename,
                                    existingRecordId: record.id,
                                    bookingId: record.booking_id,
                                  });
                                  setVerifyModalOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                title="แก้ไขข้อมูลในตาราง"
                              >
                                <Icons.Edit size={14} />
                              </button>

                              {/* Delete button */}
                              <button
                                onClick={() => handleDeleteRecord(record)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="ลบรายการนี้"
                              >
                                <Icons.Trash />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Upload Dual PDF Modal */}
      {uploadModalOpen && (
        <OilUploadModal
          existingRecord={selectedRecordForUpload}
          onClose={() => setUploadModalOpen(false)}
          onParsedSuccess={handleParsedSuccess}
        />
      )}

      {/* Editable Table Verification Modal (Before saving to Firebase) */}
      {verifyModalOpen && verifyModalData && (
        <OilEditableVerifyModal
          initialData={verifyModalData}
          inspectors={inspectors}
          currentUser={currentUser}
          onClose={() => {
            setVerifyModalOpen(false);
            setVerifyModalData(null);
          }}
          onSaveToFirebase={handleSaveToFirebase}
        />
      )}

      {/* Detail / Defect Checklist Modal */}
      {detailModalOpen && selectedRecordForDetail && (
        <OilDetailModal
          record={selectedRecordForDetail}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedRecordForDetail(null);
          }}
          onUpdateRecord={async (updated) => {
            await firestoreSaveOilRecord(updated);
            setSelectedRecordForDetail(updated);
            if (onRefreshRecords) onRefreshRecords();
          }}
          onEditHeader={() => {
            setDetailModalOpen(false);
            setVerifyModalData({
              equipmentNo: selectedRecordForDetail.equipment_no,
              siteName: selectedRecordForDetail.site_name,
              inspectorName: selectedRecordForDetail.inspector_name,
              inspectionDate: selectedRecordForDetail.inspection_date,
              supervisor: selectedRecordForDetail.supervisor,
              items: selectedRecordForDetail.items || [],
              installerFilename: selectedRecordForDetail.installer_filename,
              customerFilename: selectedRecordForDetail.customer_filename,
              existingRecordId: selectedRecordForDetail.id,
              bookingId: selectedRecordForDetail.booking_id,
            });
            setVerifyModalOpen(true);
          }}
          onUploadNewPdf={() => {
            setDetailModalOpen(false);
            setSelectedRecordForUpload(selectedRecordForDetail);
            setUploadModalOpen(true);
          }}
        />
      )}
    </div>
  );
};
