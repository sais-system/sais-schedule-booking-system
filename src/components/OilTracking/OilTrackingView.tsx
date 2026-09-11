import React, { useState, useEffect, useMemo } from 'react';
import { OilTrackingRecord, OilItem, Booking, Inspector, User, OilMasterUid, OilItemStatus } from '../../types';
import { Icons } from '../Icons';
import { OilUploadModal } from './OilUploadModal';
import { OilEditableVerifyModal } from './OilEditableVerifyModal';
import { OilDetailModal } from './OilDetailModal';
import { OilFixUploadModal } from './OilFixUploadModal';
import { OilMasterDataModal } from './OilMasterDataModal';
import {
  firestoreSaveOilRecord,
  firestoreDeleteOilRecord,
  autoSyncAllBookingsToOilTracking,
  subscribeFirebaseOilMasterUids,
  firestoreSaveOilMasterUid,
  firestoreDeleteOilMasterUid,
  firestoreBatchSaveOilMasterUids,
} from '../../firebase';
import { DEFAULT_OIL_MASTER_UIDS, getSlaStatus } from '../../utils/oilSlaHelper';

export interface FlattenedOilTask {
  record: OilTrackingRecord;
  item: OilItem;
  sla: ReturnType<typeof getSlaStatus>;
}

export type OilMainViewMode = 'SITES' | 'SLA_TASKS';
export type SlaUrgencyFilter =
  | 'ALL_ACTIVE'
  | 'OVERDUE'
  | 'DUE_SOON'
  | 'ON_TRACK'
  | 'REQUEST_CLOSE'
  | 'CLOSED'
  | 'TRIANGLE'
  | 'SQUARE'
  | 'ALL';

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
  // Main view mode: Sites view or Item-level SLA tasks view
  const [mainViewMode, setMainViewMode] = useState<OilMainViewMode>('SITES');

  // SLA Urgency Filter
  const [slaUrgencyFilter, setSlaUrgencyFilter] = useState<SlaUrgencyFilter>('ALL_ACTIVE');

  // Task fix upload modal & full photo preview
  const [selectedTaskForFix, setSelectedTaskForFix] = useState<FlattenedOilTask | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Expandable site items preview inside site cards
  const [expandedSiteIds, setExpandedSiteIds] = useState<Record<string, boolean>>({});

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'triangle' | 'square'>('ALL');
  const [selectedInspector, setSelectedInspector] = useState<string>('ALL');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('ALL');

  // Master Data UID Mapping State & Live Firestore Subscription
  const [masterList, setMasterList] = useState<OilMasterUid[]>(DEFAULT_OIL_MASTER_UIDS);
  const [masterDataModalOpen, setMasterDataModalOpen] = useState(false);

  // Role Access Checks
  const isAdmin = currentUser?.role === 'admin';

  // Realtime subscription for Oil Master UIDs
  useEffect(() => {
    const unsub = subscribeFirebaseOilMasterUids((items) => {
      if (items && items.length > 0) {
        setMasterList(items);
      }
    });
    return () => unsub();
  }, []);

  // Compute Active Tasks & Overdue Count across all records for header badges
  const { overdueCount, activeTaskCount } = useMemo(() => {
    let overdue = 0;
    let active = 0;
    oilRecords.forEach((rec) => {
      (rec.items || []).forEach((item) => {
        if (item.status !== 'Closed in SAP' && item.status !== 'Verified' && item.status !== 'Fixed') {
          active++;
          const sla = getSlaStatus(item, rec.inspection_date);
          if (sla.isOverdue) overdue++;
        }
      });
    });
    return { overdueCount: overdue, activeTaskCount: active };
  }, [oilRecords]);

  // Master Data CRUD Operations
  const handleSaveMasterItem = async (item: OilMasterUid) => {
    await firestoreSaveOilMasterUid(item);
    setMasterList((prev) => {
      const idx = prev.findIndex((m) => m.id === item.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = item;
        return copy;
      }
      return [...prev, item];
    });
  };

  const handleDeleteMasterItem = async (id: string) => {
    await firestoreDeleteOilMasterUid(id);
    setMasterList((prev) => prev.filter((m) => m.id !== id));
  };

  const handleBatchSaveMaster = async (items: OilMasterUid[]) => {
    await firestoreBatchSaveOilMasterUids(items);
    setMasterList(items);
  };

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedRecordForUpload, setSelectedRecordForUpload] = useState<OilTrackingRecord | null>(null);

  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyModalData, setVerifyModalData] = useState<any>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRecordForDetail, setSelectedRecordForDetail] = useState<OilTrackingRecord | null>(null);

  // Modal for viewing extracted Annotations Comment on clicking ! button
  const [selectedItemDetail, setSelectedItemDetail] = useState<{
    item: OilItem;
    record: OilTrackingRecord;
  } | null>(null);

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
      const insTrim = (selectedInspector || '').trim();
      list = list.filter((r) => (r.inspector_name || '').trim() === insTrim);
    }

    if (selectedSupervisor !== 'ALL') {
      const supTrim = (selectedSupervisor || '').trim();
      list = list.filter((r) => ((r.supervisor || '').trim()) === supTrim);
    }

    if (searchQuery && searchQuery.trim()) {
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
      if (r.inspector_name && typeof r.inspector_name === 'string' && r.inspector_name.trim()) set.add(r.inspector_name.trim());
    });
    inspectors.forEach((ins) => {
      if (ins.name && typeof ins.name === 'string' && ins.name.trim()) set.add(ins.name.trim());
    });
    return Array.from(set).sort();
  }, [oilRecords, inspectors]);

  // Unique list of supervisors for filter
  const availableSupervisors = useMemo(() => {
    const set = new Set<string>();
    oilRecords.forEach((r) => {
      if (r.supervisor && typeof r.supervisor === 'string' && r.supervisor.trim()) set.add(r.supervisor.trim());
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

  // Flatten all items across scoped records for the unified SLA Task Engine
  const allFlattenedTasks: FlattenedOilTask[] = useMemo(() => {
    const list: FlattenedOilTask[] = [];
    scopedRecords.forEach((record) => {
      (record.items || []).forEach((item) => {
        const sla = getSlaStatus(item, record.inspection_date);
        list.push({ record, item, sla });
      });
    });

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
      return a.sla.daysRemaining - b.sla.daysRemaining;
    });
  }, [scopedRecords]);

  // SLA task counts
  const taskCounts = useMemo(() => {
    const c = {
      total: allFlattenedTasks.length,
      active: 0,
      overdue: 0,
      dueSoon: 0,
      onTrack: 0,
      requestClose: 0,
      closed: 0,
      triangle: 0,
      square: 0,
    };
    allFlattenedTasks.forEach((t) => {
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
  }, [allFlattenedTasks]);

  // Filtered tasks based on slaUrgencyFilter
  const filteredTasks = useMemo(() => {
    return allFlattenedTasks.filter((t) => {
      const isClosed = t.item.status === 'Closed in SAP' || t.item.status === 'Verified' || t.item.status === 'Fixed';

      if (slaUrgencyFilter === 'ALL_ACTIVE') return !isClosed;
      if (slaUrgencyFilter === 'OVERDUE') return !isClosed && t.sla.status === 'OVERDUE';
      if (slaUrgencyFilter === 'DUE_SOON') return !isClosed && t.sla.status === 'DUE_SOON';
      if (slaUrgencyFilter === 'ON_TRACK') return !isClosed && t.sla.status === 'ON_TRACK';
      if (slaUrgencyFilter === 'REQUEST_CLOSE') return t.item.status === 'Request Close';
      if (slaUrgencyFilter === 'CLOSED') return isClosed;
      if (slaUrgencyFilter === 'TRIANGLE') return !isClosed && t.item.item_type === 'triangle';
      if (slaUrgencyFilter === 'SQUARE') return !isClosed && t.item.item_type === 'square';
      return true;
    });
  }, [allFlattenedTasks, slaUrgencyFilter]);

  // Actions on individual tasks
  const handleApproveCloseItem = async (task: FlattenedOilTask) => {
    const targetRecord = task.record;
    const updatedItems = (targetRecord.items || []).map((it) => {
      if (it.id === task.item.id) {
        return {
          ...it,
          status: 'Verified' as OilItemStatus,
          verified_by: currentUser?.full_name || currentUser?.username || 'Inspector',
          verified_at: new Date().toISOString(),
        };
      }
      return it;
    });

    const allDone = updatedItems.every(
      (it) => it.status === 'Verified' || it.status === 'Fixed' || it.status === 'Closed in SAP'
    );

    const updatedRecord: OilTrackingRecord = {
      ...targetRecord,
      items: updatedItems,
      status: allDone ? 'Completed' : targetRecord.status,
      updated_at: new Date().toISOString(),
    };

    await firestoreSaveOilRecord(updatedRecord);
    if (onRefreshRecords) onRefreshRecords();
  };

  const toggleSiteExpand = (recordId: string) => {
    setExpandedSiteIds((prev) => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  };

  return (
    <div
      className="flex-1 w-full h-full min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar bg-slate-50 pb-36"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* Top Action Bar: Clean, unified row with Sync, Master Data, and Add buttons */}
      <div className="bg-slate-900 text-white px-3.5 sm:px-6 py-2.5 sm:py-3 border-b border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Sync Button */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer disabled:opacity-50 active:scale-95 text-left"
            title="ตรวจสอบและดึงงาน 'pass with OIL' จากปฏิทินมาสร้าง Tracking อัตโนมัติ"
          >
            <Icons.RefreshCw size={13} className={isSyncing ? 'animate-spin text-red-400 shrink-0' : 'text-slate-400 shrink-0'} />
            <span>ซิงค์งานในตารางตรวจที่มีสถานะ pass with OIL</span>
          </button>
          {isSyncing && <span className="text-[11px] text-amber-400 font-medium">กำลังซิงค์...</span>}

          {/* 2. Master Data (UID Mapping) Button (Admin Only RBAC) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setMasterDataModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 hover:border-amber-400/60 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
              title="จัดการ Master Data: ผูกเลข UID กับสัญลักษณ์ 🔺 7 วัน / 🟥 28 วัน"
            >
              <Icons.Settings size={13} className="text-amber-400" />
              <span>Master Data ({masterList.length})</span>
            </button>
          )}
        </div>

        {/* 3. Upload / Extract PDF Button */}
        <button
          type="button"
          onClick={handleOpenUploadNew}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black shadow-md shadow-red-950/40 transition-all cursor-pointer active:scale-95 whitespace-nowrap"
        >
          <Icons.Plus size={15} />
          <span>+ เพิ่มรายการOILจากไฟล์PDF</span>
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

      {/* 1. TOP FILTER TOOLBAR: Well-structured search bar and filters */}
      <div className="bg-white border-b border-slate-200 px-3.5 sm:px-6 py-2.5 shadow-2xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Left Group: Search Bar + Inspector & Supervisor Filters */}
          <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2">
            {/* Search Box: Guaranteed inline icon with absolute flex centering */}
            <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
              <div className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Icons.Search size={15} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา Equipment No., ไซต์, UID, ช่าง..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-hidden transition-all shadow-2xs font-medium placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="ล้างคำค้นหา"
                >
                  <Icons.X size={13} />
                </button>
              )}
            </div>

            {/* Filter: ผู้ตรวจ & Supervisor Dropdowns */}
            <div className="grid grid-cols-2 sm:flex items-center gap-2">
              <select
                value={selectedInspector}
                onChange={(e) => setSelectedInspector(e.target.value)}
                className={`w-full sm:w-auto py-2 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer outline-hidden shadow-2xs truncate ${
                  selectedInspector !== 'ALL'
                    ? 'bg-red-50 text-red-900 border-red-300 ring-1 ring-red-300'
                    : 'bg-slate-50 hover:bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                }`}
              >
                <option value="ALL">👤 ผู้ตรวจ: ทั้งหมด</option>
                {availableInspectors.map((name) => (
                  <option key={name} value={name}>
                    👤 {name}
                  </option>
                ))}
              </select>

              <select
                value={selectedSupervisor}
                onChange={(e) => setSelectedSupervisor(e.target.value)}
                className={`w-full sm:w-auto py-2 px-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer outline-hidden shadow-2xs truncate ${
                  selectedSupervisor !== 'ALL'
                    ? 'bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-300'
                    : 'bg-slate-50 hover:bg-white text-slate-700 border-slate-200 hover:border-slate-300'
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
                className="py-1.5 px-2.5 rounded-xl text-[11px] font-bold text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 border border-slate-200 transition-colors cursor-pointer self-start sm:self-center whitespace-nowrap"
                title="ล้างตัวกรองทั้งหมด"
              >
                รีเซ็ตตัวกรอง
              </button>
            )}
          </div>

          {/* Quick Defect Type Toggle: All vs Triangle vs Square */}
          <div className="flex items-center gap-1.5 text-xs shrink-0 self-start lg:self-center">
            <button
              type="button"
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                typeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              ทุกประเภท
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('triangle')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                typeFilter === 'triangle'
                  ? 'bg-amber-600 text-white shadow-2xs ring-1 ring-amber-600'
                  : 'bg-slate-50 text-amber-800 hover:bg-amber-50 border border-amber-300'
              }`}
            >
              <span>🔺</span>
              <span>สามเหลี่ยม</span>
            </button>
            <button
              type="button"
              onClick={() => setTypeFilter('square')}
              className={`px-3 py-2 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap ${
                typeFilter === 'square'
                  ? 'bg-slate-700 text-white shadow-2xs ring-1 ring-slate-700'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-300'
              }`}
            >
              <span>🟥</span>
              <span>สี่เหลี่ยม</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CONSOLIDATED "OIL Fitter&Supervisor" STATUS DASHBOARD: Merged all status bars into one clean panel */}
      <div className="mx-3.5 sm:mx-6 mt-3 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header of Consolidated Status Section */}
        <div className="px-3.5 sm:px-5 py-2.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
              <Icons.Clock size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs sm:text-sm font-black tracking-wide text-white">
                  OIL Fitter&Supervisor
                </span>
                <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30">
                  🔺 7 วัน / 🟥 28 วัน
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {taskCounts.overdue > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMainViewMode('SLA_TASKS');
                  setSlaUrgencyFilter('OVERDUE');
                }}
                className="px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs animate-pulse"
                title="คลิกเพื่อดูงานเกินระยะเวลาOIL ทันที"
              >
                <span>⚠️ เกินระยะเวลาOIL {taskCounts.overdue} ข้อ!</span>
                <Icons.ChevronRight size={12} />
              </button>
            )}
            <div className="text-xs text-slate-300 font-bold">
              งานค้างแก้ไข: <span className="text-amber-400 font-black">{taskCounts.active} ข้อ</span>
            </div>
          </div>
        </div>

        {/* Section A: Consolidated Site Status Summary (3 compact cards in one unified grid) */}
        <div className="p-2.5 sm:p-3.5 border-b border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {/* Card 1: รายการคงค้าง */}
            <div
              onClick={() => {
                setStatusFilter('PENDING');
                setMainViewMode('SITES');
              }}
              className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer select-none ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-50 border-amber-500 shadow-xs ring-2 ring-amber-400/50'
                  : 'bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span className="text-xs font-black text-amber-900">รายการคงค้าง</span>
                </div>
                {waitingPdfCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-200 text-amber-900">
                    รอ PDF {waitingPdfCount}
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-amber-700">
                  {pendingSitesCount} <span className="text-[11px] font-bold text-amber-900/60">ไซต์</span>
                </span>
                <span className="text-[11px] font-bold text-amber-800">
                  {pendingUidsCount} ข้อ UID ค้าง
                </span>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-amber-200/50 flex items-center justify-between text-[10px] font-bold">
                <span className="text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-200">
                  🔺 {pendingTrianglesCount} สามเหลี่ยม
                </span>
                <span className="text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                  🟥 {pendingSquaresCount} สี่เหลี่ยม
                </span>
              </div>
            </div>

            {/* Card 2: ปิดรายการครบแล้ว */}
            <div
              onClick={() => {
                setStatusFilter('COMPLETED');
                setMainViewMode('SITES');
              }}
              className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer select-none ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-50 border-emerald-500 shadow-xs ring-2 ring-emerald-400/50'
                  : 'bg-white border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Icons.CheckCircle size={13} className="text-emerald-600" />
                  <span className="text-xs font-black text-emerald-900">ปิดรายการครบแล้ว</span>
                </div>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                  {totalSitesCount > 0 ? Math.round((completedSitesCount / totalSitesCount) * 100) : 0}% สำเร็จ
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-emerald-700">
                  {completedSitesCount} <span className="text-[11px] font-bold text-emerald-900/60">ไซต์</span>
                </span>
                <span className="text-[11px] font-bold text-emerald-800">
                  {completedUidsCount} ข้อ UID ปิดครบ
                </span>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-emerald-200/50 flex items-center justify-between text-[10px] font-bold">
                <span className="text-emerald-800 bg-emerald-100/80 px-1.5 py-0.2 rounded border border-emerald-200">
                  🔺 {completedTrianglesCount} สามเหลี่ยม
                </span>
                <span className="text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                  🟥 {completedSquaresCount} สี่เหลี่ยม
                </span>
              </div>
            </div>

            {/* Card 3: ไซต์งานทั้งหมด */}
            <div
              onClick={() => {
                setStatusFilter('ALL');
                setMainViewMode('SITES');
              }}
              className={`p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer select-none ${
                statusFilter === 'ALL' && mainViewMode === 'SITES'
                  ? 'bg-slate-100 border-slate-900 shadow-xs ring-2 ring-slate-800/40'
                  : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <Icons.Layout size={13} className="text-slate-600" />
                  <span className="text-xs font-bold text-slate-600">ไซต์งานทั้งหมด</span>
                </div>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  statusFilter === 'ALL' && mainViewMode === 'SITES' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  ทั้งหมด
                </span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-black text-slate-900">
                  {totalSitesCount} <span className="text-[11px] font-bold text-slate-500">ไซต์</span>
                </span>
                <span className="text-[11px] font-bold text-slate-600">
                  {totalUidsCount} ข้อ UID รวม
                </span>
              </div>
              <div className="mt-1.5 pt-1.5 border-t border-slate-200 flex items-center justify-between text-[10px] font-bold">
                <span className="text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                  🔺 {totalTrianglesCount} สามเหลี่ยม
                </span>
                <span className="text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                  🟥 {totalSquaresCount} สี่เหลี่ยม
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section B: OIL Fitter&Supervisor SLA Urgency Filter Chips & Mobile Dropdown */}
        <div className="p-2.5 sm:px-4 sm:py-3 bg-white border-t border-slate-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-black text-slate-700 flex items-center gap-1">
              <span>🎯 แถบสถานะกำหนดเวลา OIL Fitter&Supervisor:</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium">คลิกเพื่อดูรายการงาน</span>
          </div>

          {/* Mobile View: Drop-down Selector (sm:hidden) */}
          <div className="block sm:hidden my-1">
            <div className="relative">
              <label htmlFor="mobile-sla-filter-select" className="sr-only">
                เลือกสถานะกำหนดเวลา OIL
              </label>
              <select
                id="mobile-sla-filter-select"
                value={mainViewMode === 'SLA_TASKS' ? slaUrgencyFilter : 'ALL_ACTIVE'}
                onChange={(e) => {
                  setSlaUrgencyFilter(e.target.value as SlaUrgencyFilter);
                  setMainViewMode('SLA_TASKS');
                }}
                className={`w-full py-2.5 pl-3.5 pr-10 rounded-2xl border text-xs font-black appearance-none transition-all cursor-pointer shadow-xs focus:outline-none ${
                  mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'OVERDUE'
                    ? 'bg-red-50 text-red-900 border-red-400 ring-2 ring-red-400/50'
                    : mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'DUE_SOON'
                    ? 'bg-amber-50 text-amber-950 border-amber-400 ring-2 ring-amber-400/50'
                    : mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'ON_TRACK'
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-400 ring-2 ring-emerald-400/50'
                    : mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'REQUEST_CLOSE'
                    ? 'bg-purple-50 text-purple-950 border-purple-400 ring-2 ring-purple-400/50'
                    : mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'TRIANGLE'
                    ? 'bg-amber-50/70 text-amber-900 border-amber-300 ring-1 ring-amber-300'
                    : mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'SQUARE'
                    ? 'bg-blue-50 text-blue-900 border-blue-300 ring-1 ring-blue-300'
                    : mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'CLOSED'
                    ? 'bg-slate-100 text-slate-800 border-slate-300 ring-1 ring-slate-300'
                    : 'bg-slate-900 text-white border-slate-900 ring-2 ring-slate-900/30'
                }`}
              >
                <option value="ALL_ACTIVE" className="text-slate-900 bg-white">
                  OIL คงค้างทั้งหมด ({taskCounts.active} ข้อ)
                </option>
                <option value="OVERDUE" className="text-slate-900 bg-white">
                  🔴 เกินระยะเวลาOIL ({taskCounts.overdue} ข้อ)
                </option>
                <option value="DUE_SOON" className="text-slate-900 bg-white">
                  🟡 ใกล้ครบ ≤3 วัน ({taskCounts.dueSoon} ข้อ)
                </option>
                <option value="ON_TRACK" className="text-slate-900 bg-white">
                  🟢 แก้ไขทันตามกำหนด ({taskCounts.onTrack} ข้อ)
                </option>
                <option value="REQUEST_CLOSE" className="text-slate-900 bg-white">
                  ⏳ ส่งรูปแก้ไข (รอSAISตรวจสอบ) ({taskCounts.requestClose} ข้อ)
                </option>
                <option value="TRIANGLE" className="text-slate-900 bg-white">
                  🔺 7 วัน ({taskCounts.triangle} ข้อ)
                </option>
                <option value="SQUARE" className="text-slate-900 bg-white">
                  🟥 28 วัน ({taskCounts.square} ข้อ)
                </option>
                <option value="CLOSED" className="text-slate-900 bg-white">
                  ✅ ปิดแล้ว ({taskCounts.closed} ข้อ)
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
                <Icons.ChevronDown
                  size={17}
                  className={
                    mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'ALL_ACTIVE'
                      ? 'text-white'
                      : 'text-slate-600'
                  }
                />
              </div>
            </div>
            {/* Quick status summary label for mobile */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 px-1">
              <span>
                กำลังดู: <strong className="text-slate-900 font-black">
                  {slaUrgencyFilter === 'ALL_ACTIVE' ? 'OIL คงค้างทั้งหมด' :
                   slaUrgencyFilter === 'OVERDUE' ? '🔴 เกินระยะเวลาOIL' :
                   slaUrgencyFilter === 'DUE_SOON' ? '🟡 ใกล้ครบ ≤3 วัน' :
                   slaUrgencyFilter === 'ON_TRACK' ? '🟢 แก้ไขทันตามกำหนด' :
                   slaUrgencyFilter === 'REQUEST_CLOSE' ? '⏳ ส่งรูปแก้ไข (รอSAISตรวจสอบ)' :
                   slaUrgencyFilter === 'TRIANGLE' ? '🔺 7 วัน' :
                   slaUrgencyFilter === 'SQUARE' ? '🟥 28 วัน' : '✅ ปิดแล้ว'}
                </strong>
              </span>
              <span className="font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-200">
                {taskCounts[
                  slaUrgencyFilter === 'ALL_ACTIVE' ? 'active' :
                  slaUrgencyFilter === 'OVERDUE' ? 'overdue' :
                  slaUrgencyFilter === 'DUE_SOON' ? 'dueSoon' :
                  slaUrgencyFilter === 'ON_TRACK' ? 'onTrack' :
                  slaUrgencyFilter === 'REQUEST_CLOSE' ? 'requestClose' :
                  slaUrgencyFilter === 'TRIANGLE' ? 'triangle' :
                  slaUrgencyFilter === 'SQUARE' ? 'square' : 'closed'
                ]} ข้อ
              </span>
            </div>
          </div>

          {/* Desktop/Tablet Horizontal Chips (hidden sm:flex) */}
          <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setSlaUrgencyFilter('ALL_ACTIVE');
                setMainViewMode('SLA_TASKS');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'ALL_ACTIVE'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>OIL คงค้างทั้งหมด</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200/80 text-slate-800">
                {taskCounts.active}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSlaUrgencyFilter('OVERDUE');
                setMainViewMode('SLA_TASKS');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'OVERDUE'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs ring-2 ring-red-300'
                  : taskCounts.overdue > 0
                  ? 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                  : 'bg-slate-50 text-slate-500 border-slate-200'
              }`}
            >
              <span className={taskCounts.overdue > 0 ? 'animate-pulse' : ''}>🔴</span>
              <span>เกินระยะเวลาOIL</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  taskCounts.overdue > 0 ? 'bg-red-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {taskCounts.overdue}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSlaUrgencyFilter('DUE_SOON');
                setMainViewMode('SLA_TASKS');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'DUE_SOON'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                  : 'bg-amber-50/80 text-amber-900 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <span>🟡 ใกล้ครบ ≤3 วัน</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-200 text-amber-900">
                {taskCounts.dueSoon}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSlaUrgencyFilter('ON_TRACK');
                setMainViewMode('SLA_TASKS');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'ON_TRACK'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-emerald-50/80 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span>🟢 แก้ไขทันตามกำหนด</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-200 text-emerald-900">
                {taskCounts.onTrack}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSlaUrgencyFilter('REQUEST_CLOSE');
                setMainViewMode('SLA_TASKS');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'REQUEST_CLOSE'
                  ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                  : 'bg-purple-50/80 text-purple-900 border-purple-200 hover:bg-purple-100'
              }`}
            >
              <span>⏳ ส่งรูปแก้ไข (รอSAISตรวจสอบ)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-purple-200 text-purple-900">
                {taskCounts.requestClose}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSlaUrgencyFilter('TRIANGLE');
                setMainViewMode('SLA_TASKS');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'TRIANGLE'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>🔺 7 วัน</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
                {taskCounts.triangle}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSlaUrgencyFilter('SQUARE');
                setMainViewMode('SLA_TASKS');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'SQUARE'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>🟥 28 วัน</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
                {taskCounts.square}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSlaUrgencyFilter('CLOSED');
                setMainViewMode('SLA_TASKS');
              }}
              className={`px-3 py-1.5 rounded-xl border transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                mainViewMode === 'SLA_TASKS' && slaUrgencyFilter === 'CLOSED'
                  ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span>✅ ปิดแล้ว</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-200 text-slate-700">
                {taskCounts.closed}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN VIEW MODE SELECTOR TABS: Sites View vs OIL Fitter&Supervisor */}
      <div className="mx-3.5 sm:mx-6 mt-3.5 mb-1 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center p-1 bg-slate-200/80 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setMainViewMode('SITES')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              mainViewMode === 'SITES'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Layout size={15} className={mainViewMode === 'SITES' ? 'text-blue-600' : 'text-slate-400'} />
            <span>📋 ไซต์งานทั้งหมด</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                mainViewMode === 'SITES' ? 'bg-blue-100 text-blue-800' : 'bg-slate-300 text-slate-700'
              }`}
            >
              {filteredRecords.length} ไซต์
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMainViewMode('SLA_TASKS')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
              mainViewMode === 'SLA_TASKS'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Icons.Clock size={15} className={mainViewMode === 'SLA_TASKS' ? 'text-amber-600' : 'text-slate-400'} />
            <span>⏱️ OIL Fitter&Supervisor</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                taskCounts.overdue > 0
                  ? 'bg-red-600 text-white animate-pulse'
                  : mainViewMode === 'SLA_TASKS'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-slate-300 text-slate-700'
              }`}
            >
              {taskCounts.overdue > 0
                ? `${taskCounts.overdue} เกินระยะเวลาOIL / ${filteredTasks.length}`
                : `${filteredTasks.length} รายการ`}
            </span>
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-medium">
          {mainViewMode === 'SITES'
            ? `แสดงตารางไซต์งาน ${filteredRecords.length} รายการ`
            : `แสดงรายการข้อบกพร่อง OIL Fitter&Supervisor ${filteredTasks.length} รายการ`}
        </span>
      </div>

      {/* Main Content Area: Switchable between 'SLA_TASKS' and 'SITES' */}
      <div className="p-3 sm:p-6">
        {mainViewMode === 'SLA_TASKS' ? (
          /* ============================================================ */
          /* SLA & Supervisor / Fitter Urgent Tasks Stream (Unified View) */
          /* ============================================================ */
          <div>
            {filteredTasks.length === 0 ? (
              <div className="py-16 text-center bg-white rounded-3xl border border-slate-200 shadow-xs max-w-xl mx-auto space-y-3">
                <div className="w-14 h-14 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                  <Icons.CheckCircle size={28} />
                </div>
                <h3 className="text-sm font-black text-slate-800">
                  ไม่พบรายการข้อบกพร่องตามเงื่อนไขตัวกรองนี้
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed px-4">
                  {slaUrgencyFilter === 'OVERDUE'
                    ? 'ยอดเยี่ยมมาก! ไม่มีงานข้อบกพร่องที่เกินระยะเวลาOIL (🔺 7 วัน หรือ 🟥 28 วัน) ในระบบ'
                    : 'ลองเลือกตัวกรองอื่นในแถบ OIL Fitter&Supervisor หรือกดปุ่มด้านล่างเพื่อแสดงงานค้างทั้งหมด'}
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setSlaUrgencyFilter('ALL_ACTIVE')}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs"
                  >
                    แสดง OIL คงค้างทั้งหมด ({taskCounts.active} ข้อ)
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredTasks.map((task) => {
                  const isClosed =
                    task.item.status === 'Closed in SAP' ||
                    task.item.status === 'Verified' ||
                    task.item.status === 'Fixed';
                  const isRequestClose = task.item.status === 'Request Close';

                  return (
                    <div
                      key={`${task.record.id}_${task.item.id}`}
                      className={`rounded-3xl border transition-all duration-200 shadow-2xs flex flex-col justify-between overflow-hidden bg-white ${
                        task.sla.cardBorder
                      } ${task.sla.status === 'OVERDUE' && !isClosed ? 'ring-2 ring-red-400/60 bg-red-50/10' : ''}`}
                    >
                      {/* Top Content */}
                      <div className="p-4 sm:p-5 space-y-3">
                        {/* Header: Equipment No, Site Name, SLA Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => handleViewDetail(task.record)}
                                className="font-mono font-black text-slate-900 text-xs px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer text-left"
                                title="คลิกเพื่อดูรายละเอียดไซต์งานทั้งหมด"
                              >
                                {task.record.equipment_no}
                              </button>
                              <span className="text-[11px] text-slate-400 font-medium">
                                ตรวจ: {task.item.first_inspection_date || task.record.inspection_date || '-'}
                              </span>
                            </div>
                            <h4
                              className="font-bold text-slate-800 text-xs mt-1 truncate"
                              title={task.record.site_name}
                            >
                              {task.record.site_name}
                            </h4>
                          </div>

                          {/* SLA Status Badge */}
                          <div className="shrink-0">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-black shadow-2xs ${task.sla.badgeClass}`}
                            >
                              {task.sla.status === 'OVERDUE' && !isClosed && (
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                              )}
                              <span>{task.sla.label}</span>
                            </span>
                          </div>
                        </div>

                        {/* UID & Type & Workflow Status Pills */}
                        <div className="flex items-center gap-1.5 flex-wrap text-xs">
                          {/* UID pill */}
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-900 text-white font-mono font-black text-[11px]">
                            UID: {task.item.uid}
                          </span>

                          {/* Triangle / Square badge */}
                          {task.item.item_type === 'triangle' ? (
                            <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-black text-[10px] flex items-center gap-1">
                              <span>🔺</span>
                              <span>7 วัน (สามเหลี่ยม)</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-blue-100 text-blue-900 border border-blue-300 font-black text-[10px] flex items-center gap-1">
                              <span>🟥</span>
                              <span>28 วัน (สี่เหลี่ยม)</span>
                            </span>
                          )}

                          {/* Workflow status */}
                          {isRequestClose ? (
                            <span className="px-2 py-0.5 rounded-lg bg-purple-100 text-purple-900 border border-purple-300 font-black text-[10px]">
                              ⏳ ช่างขอปิดงาน (รอตรวจ)
                            </span>
                          ) : isClosed ? (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-[10px] flex items-center gap-1">
                              <Icons.CheckCircle size={10} />
                              <span>ปิดข้อบกพร่องแล้ว</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px]">
                              {task.item.status || 'รอดำเนินการ'}
                            </span>
                          )}
                        </div>

                        {/* SLA Countdown Bar */}
                        <div
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-[11px] font-bold ${
                            task.sla.status === 'OVERDUE' && !isClosed
                              ? 'bg-red-50/90 border-red-200 text-red-950'
                              : task.sla.status === 'DUE_SOON' && !isClosed
                              ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <Icons.Calendar size={13} className="opacity-70" />
                            <span>
                              กำหนด: {task.item.sla_due_date || task.sla.dueDateFormatted}
                            </span>
                          </div>
                          <span
                            className={`font-black ${
                              task.sla.status === 'OVERDUE' && !isClosed
                                ? 'text-red-700 animate-pulse'
                                : task.sla.status === 'DUE_SOON' && !isClosed
                                ? 'text-amber-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {task.sla.remainingDaysText}
                          </span>
                        </div>

                        {/* Defect Description */}
                        <div className="text-xs text-slate-700 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 space-y-1">
                          {task.item.title && (
                            <p className="font-bold text-slate-900 line-clamp-1">{task.item.title}</p>
                          )}
                          <p className="text-slate-600 line-clamp-2 leading-relaxed">
                            {task.item.description || task.item.comment || 'ไม่มีรายละเอียดข้อบกพร่อง'}
                          </p>
                        </div>

                        {/* Fix Proof / Photos / Notes from Fitter */}
                        {task.item.fix_notes && (
                          <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-950 space-y-0.5">
                            <span className="font-bold block text-amber-900">📝 บันทึกการแก้ไขของช่าง:</span>
                            <p className="italic">{task.item.fix_notes}</p>
                          </div>
                        )}

                        {task.item.fix_photos && task.item.fix_photos.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                              <span className="flex items-center gap-1">
                                <Icons.Camera size={12} className="text-blue-600" />
                                <span>รูปภาพหลักฐาน ({task.item.fix_photos.length} รูป):</span>
                              </span>
                              <span className="text-[10px] text-slate-400">กดที่รูปเพื่อขยาย</span>
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-1">
                              {task.item.fix_photos.map((photoUrl, pIdx) => (
                                <img
                                  key={pIdx}
                                  src={photoUrl}
                                  alt={`หลักฐาน ${pIdx + 1}`}
                                  onClick={() => setPreviewPhoto(photoUrl)}
                                  className="w-14 h-14 object-cover rounded-xl border border-slate-200 hover:scale-105 cursor-pointer transition-all shadow-2xs shrink-0"
                                />
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Supervisor / Inspector Sub-footer */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                          <span>Sup: {task.record.supervisor || '-'}</span>
                          <span>ผู้ตรวจ: {task.record.inspector_name || '-'}</span>
                        </div>
                      </div>

                      {/* Bottom Action Footer */}
                      <div className="p-3 bg-slate-50/90 border-t border-slate-100 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleViewDetail(task.record)}
                          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <Icons.FileText size={13} />
                          <span>ดูไซต์</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          {/* Fitter/Supervisor: Upload fix proof button */}
                          <button
                            type="button"
                            onClick={() => setSelectedTaskForFix(task)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                            title="แนบรูปถ่ายและบันทึกการแก้ไขสำหรับข้อนี้"
                          >
                            <Icons.Camera size={13} />
                            <span>แนบรูปแก้ไข</span>
                          </button>

                          {/* Inspector/Admin: Approve closing */}
                          {!isClosed && (
                            <button
                              type="button"
                              onClick={() => handleApproveCloseItem(task)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95"
                              title="อนุมัติปิดงานข้อนี้ (เปลี่ยนสถานะเป็น Verified)"
                            >
                              <Icons.CheckCircle size={13} />
                              <span>อนุมัติปิด</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* Standard Sites View (Mobile Cards & Desktop Table)           */
          /* ============================================================ */
          filteredRecords.length === 0 ? (
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
              {/* Mobile View: High-clarity Card List with SLA Badges & Accordion */}
              <div className="space-y-3 block sm:hidden">
                {filteredRecords.map((record) => {
                  const itemCount = record.items ? record.items.length : 0;
                  const triCount = record.items
                    ? record.items.filter((i) => i.item_type === 'triangle').length
                    : 0;
                  const sqCount = record.items
                    ? record.items.filter((i) => i.item_type !== 'triangle').length
                    : 0;
                  const isWaitingPdf = record.status === 'Waiting for PDF';

                  // Calculate SLA breakdown for this site
                  const siteOverdueCount = (record.items || []).filter((it) => {
                    const isDone = it.status === 'Closed in SAP' || it.status === 'Verified' || it.status === 'Fixed';
                    return !isDone && getSlaStatus(it, record.inspection_date).status === 'OVERDUE';
                  }).length;
                  const siteDueSoonCount = (record.items || []).filter((it) => {
                    const isDone = it.status === 'Closed in SAP' || it.status === 'Verified' || it.status === 'Fixed';
                    return !isDone && getSlaStatus(it, record.inspection_date).status === 'DUE_SOON';
                  }).length;

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

                        <div className="flex flex-col items-end gap-1">
                          {isWaitingPdf ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-300 font-black text-[10px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                              รออัพโหลดPDFเพื่อดึงรายการOIL
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

                          {/* Site SLA summary badge */}
                          {siteOverdueCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-900 border border-red-300 font-black text-[9px] animate-pulse">
                              🔴 เกินระยะเวลาOIL {siteOverdueCount} ข้อ
                            </span>
                          ) : siteDueSoonCount > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[9px]">
                              🟡 ใกล้ครบ {siteDueSoonCount} ข้อ
                            </span>
                          ) : itemCount > 0 && !isWaitingPdf ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[9px]">
                              🟢 SLA แก้ไขทันตามกำหนด
                            </span>
                          ) : null}
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
                          <span className="text-slate-400 text-[10px]">รายการOIL:</span>
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

                      {/* OIL Items UID Badges with ! Button */}
                      {record.items && record.items.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                              รายการ UID ({record.items.length}):
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleSiteExpand(record.id)}
                              className="text-[10px] text-blue-600 font-bold hover:underline cursor-pointer"
                            >
                              {expandedSiteIds[record.id] ? '▲ ซ่อนรายการย่อย' : '▼ ขยายดู SLA รายข้อ'}
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {record.items.map((it, idx) => {
                              const isTri = it.item_type === 'triangle';
                              return (
                                <div
                                  key={idx}
                                  className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-bold transition-all shadow-2xs ${
                                    isTri
                                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                                      : 'bg-slate-50 text-slate-800 border-slate-300'
                                  }`}
                                >
                                  <span className={isTri ? 'text-amber-600 font-black' : 'text-slate-600 font-black'}>
                                    {isTri ? '△' : '□'}
                                  </span>
                                  <span className="font-mono font-bold tracking-tight">{it.uid}</span>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedItemDetail({ item: it, record })}
                                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black cursor-pointer shadow-2xs transition-transform hover:scale-110 active:scale-95 ${
                                      isTri
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                                    title="กดเพื่อดูรายละเอียดข้อความ Annotations Comment"
                                  >
                                    !
                                  </button>
                                </div>
                              );
                            })}
                          </div>

                          {/* Expanded SLA Task Cards in Mobile */}
                          {expandedSiteIds[record.id] && (
                            <div className="mt-3 pt-3 border-t border-slate-200/60 space-y-2">
                              {record.items.map((item) => {
                                const sla = getSlaStatus(item, record.inspection_date);
                                const isDone =
                                  item.status === 'Closed in SAP' ||
                                  item.status === 'Verified' ||
                                  item.status === 'Fixed';
                                return (
                                  <div
                                    key={item.id}
                                    className={`p-2.5 rounded-xl border text-xs space-y-1.5 bg-white ${sla.cardBorder}`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-1 font-bold">
                                        <span>{item.item_type === 'triangle' ? '🔺' : '🟥'}</span>
                                        <span className="font-mono font-black">{item.uid}</span>
                                      </div>
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${sla.badgeClass}`}>
                                        {sla.label}
                                      </span>
                                    </div>
                                    <p className="text-slate-600 text-[11px] line-clamp-2">
                                      {item.description || item.comment || '-'}
                                    </p>
                                    <div className="flex items-center justify-between pt-1">
                                      <span className="text-[10px] text-slate-500 font-medium">
                                        กำหนด: {item.sla_due_date || sla.dueDateFormatted}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => setSelectedTaskForFix({ record, item, sla })}
                                          className="px-2 py-1 rounded-lg bg-blue-600 text-white text-[10px] font-bold cursor-pointer"
                                        >
                                          📷 แนบรูป
                                        </button>
                                        {!isDone && (
                                          <button
                                            type="button"
                                            onClick={() => handleApproveCloseItem({ record, item, sla })}
                                            className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold cursor-pointer"
                                          >
                                            ✅ ปิด
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* View Original PDF Button on Card */}
                      {(record.installer_pdf_url || record.customer_pdf_url || record.installer_filename || record.customer_filename) && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              const url = record.installer_pdf_url || record.customer_pdf_url;
                              if (url) {
                                window.open(url, '_blank', 'noopener,noreferrer');
                              } else {
                                const fn = record.installer_filename || record.customer_filename || 'OIL.pdf';
                                alert(`เอกสาร PDF ต้นฉบับ: ${fn}\n\nEquipment No: ${record.equipment_no}\nหากไฟล์อัปโหลดใน Google Drive สามารถค้นหาด้วยชื่อไฟล์หรือ Equipment No. นี้ได้ทันที`);
                              }
                            }}
                            className="w-full py-2 px-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                          >
                            <Icons.FileText size={14} className="text-red-600" />
                            <span>ดูไฟล์ PDF ต้นฉบับ</span>
                            {(record.installer_filename || record.customer_filename) && (
                              <span className="text-[10px] font-mono text-red-600/80 truncate max-w-[140px]">
                                ({record.installer_filename || record.customer_filename})
                              </span>
                            )}
                          </button>
                        </div>
                      )}

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

              {/* Tablet & Desktop View: High-density Table with SLA Integration */}
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
                        <th className="py-3 px-3.5 w-56">จำนวนปัญหา & SLA</th>
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

                        // Calculate SLA status for this site
                        const siteOverdueCount = (record.items || []).filter((it) => {
                          const isDone = it.status === 'Closed in SAP' || it.status === 'Verified' || it.status === 'Fixed';
                          return !isDone && getSlaStatus(it, record.inspection_date).status === 'OVERDUE';
                        }).length;
                        const siteDueSoonCount = (record.items || []).filter((it) => {
                          const isDone = it.status === 'Closed in SAP' || it.status === 'Verified' || it.status === 'Fixed';
                          return !isDone && getSlaStatus(it, record.inspection_date).status === 'DUE_SOON';
                        }).length;

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
                                  รออัพโหลดPDFเพื่อดึงรายการOIL
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

                            {/* OIL Items Count & SLA Summary */}
                            <td className="py-3 px-3.5">
                              {itemCount === 0 ? (
                                <span className="text-[11px] text-slate-400 italic">
                                  ยังไม่มีรายการปัญหา
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-black text-slate-900">
                                      {itemCount} ข้อ
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10px] font-bold">
                                      △ {triCount}
                                    </span>
                                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold">
                                      □ {sqCount}
                                    </span>
                                  </div>

                                  {/* Inline SLA breakdown */}
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {siteOverdueCount > 0 ? (
                                      <span className="px-1.5 py-0.5 rounded-md bg-red-100 text-red-900 border border-red-300 text-[9px] font-black animate-pulse">
                                        🔴 เกินระยะเวลาOIL {siteOverdueCount} ข้อ
                                      </span>
                                    ) : siteDueSoonCount > 0 ? (
                                      <span className="px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold">
                                        🟡 ใกล้ครบ {siteDueSoonCount} ข้อ
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                                        🟢 แก้ไขทันตามกำหนด
                                      </span>
                                    )}
                                  </div>
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
          )
        )}
      </div>

      {/* Upload Dual PDF Modal */}
      {uploadModalOpen && (
        <OilUploadModal
          existingRecord={selectedRecordForUpload}
          masterList={masterList}
          allExistingRecords={oilRecords}
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
          currentUser={currentUser}
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

      {/* Upload Fix Photos & Notes Modal (Fitter / Supervisor inline action) */}
      {selectedTaskForFix && (
        <OilFixUploadModal
          task={selectedTaskForFix}
          currentUser={currentUser}
          onClose={() => setSelectedTaskForFix(null)}
          onSuccess={async (updatedRecord) => {
            await firestoreSaveOilRecord(updatedRecord);
            setSelectedTaskForFix(null);
            if (onRefreshRecords) onRefreshRecords();
          }}
        />
      )}

      {/* Fullscreen Photo Preview Modal */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in"
          onClick={() => setPreviewPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setPreviewPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-red-400 p-2 text-sm font-bold flex items-center gap-1 cursor-pointer"
            >
              <Icons.X size={20} />
              <span>ปิดรูปภาพ</span>
            </button>
            <img
              src={previewPhoto}
              alt="หลักฐานภาพถ่ายการแก้ไข"
              className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl border border-slate-700"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Admin Master Data UID Mapping Modal (🔺 7 days vs 🟥 28 days) */}
      {masterDataModalOpen && isAdmin && (
        <OilMasterDataModal
          masterList={masterList}
          currentUser={currentUser}
          onClose={() => setMasterDataModalOpen(false)}
          onSaveItem={handleSaveMasterItem}
          onDeleteItem={handleDeleteMasterItem}
          onBatchSave={handleBatchSaveMaster}
        />
      )}

      {/* Extracted Annotations Comment Detail Modal (Triggered by ! button) */}
      {selectedItemDetail && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-pop">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-slate-50 to-blue-50/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${
                    selectedItemDetail.item.item_type === 'triangle'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-100 text-slate-800 border border-slate-300'
                  }`}
                >
                  {selectedItemDetail.item.item_type === 'triangle' ? '△' : '□'}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-slate-900 text-base">
                      {selectedItemDetail.item.uid}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        selectedItemDetail.item.item_type === 'triangle'
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {selectedItemDetail.item.item_type === 'triangle' ? '△ สามเหลี่ยม (Triangle)' : '□ สี่เหลี่ยม (Square)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {selectedItemDetail.record.equipment_no} • {selectedItemDetail.record.site_name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedItemDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <Icons.X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 custom-scrollbar text-xs">
              {/* Question Title if available */}
              {selectedItemDetail.item.title && (
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider mb-1">
                    หัวข้อการตรวจ / UID Question:
                  </span>
                  <p className="font-bold text-slate-800 text-xs leading-relaxed">
                    {selectedItemDetail.item.title}
                  </p>
                </div>
              )}

              {/* Strict Annotations Comment */}
              <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Icons.FileText size={13} />
                    รายละเอียดข้อความใน Annotations Comment:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedItemDetail.item.description || '');
                      alert('คัดลอกข้อความสำเร็จ');
                    }}
                    className="text-[10px] text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 bg-white px-2 py-0.5 rounded-md border border-blue-200 cursor-pointer transition-all hover:bg-blue-50"
                  >
                    <Icons.Copy size={11} /> คัดลอก
                  </button>
                </div>

                <div className="bg-white p-3 rounded-xl border border-blue-100 font-medium text-slate-800 text-xs leading-relaxed whitespace-pre-wrap select-text">
                  {selectedItemDetail.item.description || (
                    <span className="text-slate-400 italic">ไม่มีข้อความบันทึกใน Annotations Comment</span>
                  )}
                </div>
              </div>

              {/* Original Document / Fitter / Date info */}
              <div className="grid grid-cols-2 gap-2 text-[11px] p-3 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600">
                <div>
                  <span className="text-[10px] text-slate-400 block">วันที่ตรวจ:</span>
                  <span className="font-bold text-slate-700">{selectedItemDetail.record.inspection_date || '-'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">ผู้ตรวจ (SAIS):</span>
                  <span className="font-bold text-slate-700">{selectedItemDetail.record.inspector_name || '-'}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedItemDetail(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
