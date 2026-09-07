import React, { useState, useMemo, useRef } from 'react';
import {
  SaisRecord,
  MONTHS,
  DEFAULT_WIDTHS,
  COLUMNS_DEF,
  formatDateToDDMMYY,
  getMonthOnly,
  parseRemarkHistory,
} from './types';
import { Icons } from '../Icons';

interface SaisPendingTableProps {
  records: SaisRecord[];
  selectedMonth: string;
  onChangeMonth: (m: string) => void;
  onSelectRecord: (r: SaisRecord) => void;
  onAddNew: () => void;
  initialDrillFilter?: { status?: string; inspector?: string; productLine?: string; type?: string };
}

export const SaisPendingTable: React.FC<SaisPendingTableProps> = ({
  records,
  selectedMonth,
  onChangeMonth,
  onSelectRecord,
  onAddNew,
  initialDrillFilter,
}) => {
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  // Column visibility and widths
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('sais_col_widths');
      return saved ? JSON.parse(saved) : DEFAULT_WIDTHS;
    } catch (e) {
      return DEFAULT_WIDTHS;
    }
  });

  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    COLUMNS_DEF.forEach((c) => (init[c.id] = true));
    return init;
  });
  const [showColSettings, setShowColSettings] = useState(false);

  // Column inline filters
  const [colFilters, setColFilters] = useState<Record<string, string>>({
    insp: initialDrillFilter?.inspector || 'all',
    prod: initialDrillFilter?.productLine || 'all',
    type: initialDrillFilter?.type || 'all',
    status: initialDrillFilter?.status || 'all',
    cond: 'all',
    pre: 'all',
    buz: 'all',
    sys: 'all',
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Column Resizing Refs
  const resizingCol = useRef<{ id: string; startX: number; startWidth: number } | null>(null);

  const startResize = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingCol.current = {
      id,
      startX: e.clientX,
      startWidth: colWidths[id] || 100,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingCol.current) return;
      const diff = moveEvent.clientX - resizingCol.current.startX;
      const newWidth = Math.max(45, resizingCol.current.startWidth + diff);
      setColWidths((prev) => {
        const next = { ...prev, [resizingCol.current!.id]: newWidth };
        try {
          localStorage.setItem('sais_col_widths', JSON.stringify(next));
        } catch (err) {}
        return next;
      });
    };

    const handleMouseUp = () => {
      resizingCol.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Distinct options for inline dropdowns
  const optionsMap = useMemo(() => {
    const opts: Record<string, Set<string>> = {
      insp: new Set(),
      prod: new Set(),
      type: new Set(),
      status: new Set(),
      cond: new Set(),
      pre: new Set(),
      buz: new Set(),
      sys: new Set(),
    };

    records.forEach((r) => {
      if (r.inspectorName) opts.insp.add(r.inspectorName);
      if (r.productLine) opts.prod.add(r.productLine);
      if (r.type) opts.type.add(r.type);
      if (r.saisStatus) opts.status.add(r.saisStatus);
      if (r.condition) opts.cond.add(r.condition);
      if (r.preCheck) opts.pre.add(r.preCheck);
      if (r.buzzer) opts.buz.add(r.buzzer);
      if (r.generatedInSystem) opts.sys.add(r.generatedInSystem);
    });

    return {
      insp: Array.from(opts.insp).sort(),
      prod: Array.from(opts.prod).sort(),
      type: Array.from(opts.type).sort(),
      status: Array.from(opts.status).sort(),
      cond: Array.from(opts.cond).sort(),
      pre: Array.from(opts.pre).sort(),
      buz: Array.from(opts.buz).sort(),
      sys: Array.from(opts.sys).sort(),
    };
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Month Filter
      if (selectedMonth !== 'all') {
        const m = getMonthOnly(r.inspectionDate);
        if (m !== selectedMonth) return false;
      }

      // Search Term (equipmentNo, jobSite, inspectorName)
      if (activeSearch.trim()) {
        const q = activeSearch.toLowerCase().trim();
        const eq = (r.equipmentNo || '').toLowerCase();
        const site = (r.jobSite || '').toLowerCase();
        const insp = (r.inspectorName || '').toLowerCase();
        if (!eq.includes(q) && !site.includes(q) && !insp.includes(q)) {
          return false;
        }
      }

      // Column dropdown filters
      if (colFilters.insp !== 'all' && r.inspectorName !== colFilters.insp) return false;
      if (colFilters.prod !== 'all' && r.productLine !== colFilters.prod) return false;
      if (colFilters.type !== 'all' && r.type !== colFilters.type) return false;
      if (colFilters.status !== 'all' && r.saisStatus !== colFilters.status) return false;
      if (colFilters.cond !== 'all' && r.condition !== colFilters.cond) return false;
      if (colFilters.pre !== 'all' && r.preCheck !== colFilters.pre) return false;
      if (colFilters.buz !== 'all' && r.buzzer !== colFilters.buz) return false;
      if (colFilters.sys !== 'all' && r.generatedInSystem !== colFilters.sys) return false;

      return true;
    });
  }, [records, selectedMonth, activeSearch, colFilters]);

  // Paginated data
  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Active filters list for badges
  const activeBadges = useMemo(() => {
    const badges: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (selectedMonth !== 'all') {
      const monthLabel = MONTHS.find((m) => m.value === selectedMonth)?.label || selectedMonth;
      badges.push({
        key: 'month',
        label: `เดือน: ${monthLabel}`,
        onRemove: () => onChangeMonth('all'),
      });
    }
    if (activeSearch.trim()) {
      badges.push({
        key: 'search',
        label: `ค้นหา: "${activeSearch}"`,
        onRemove: () => {
          setActiveSearch('');
          setSearchTerm('');
        },
      });
    }
    Object.entries(colFilters).forEach(([k, v]) => {
      if (v !== 'all') {
        const colDef = COLUMNS_DEF.find((c) => c.id === k);
        badges.push({
          key: k,
          label: `${colDef?.label || k}: ${v}`,
          onRemove: () => setColFilters((prev) => ({ ...prev, [k]: 'all' })),
        });
      }
    });
    return badges;
  }, [selectedMonth, activeSearch, colFilters, onChangeMonth]);

  const clearAllFilters = () => {
    onChangeMonth('all');
    setActiveSearch('');
    setSearchTerm('');
    setColFilters({
      insp: 'all',
      prod: 'all',
      type: 'all',
      status: 'all',
      cond: 'all',
      pre: 'all',
      buz: 'all',
      sys: 'all',
    });
    setCurrentPage(1);
  };

  return (
    <div className="space-y-3 pb-16">
      {/* Top Controls Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Title & Count Badge */}
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-slate-800 tracking-tight">PENDING RECORDS</h3>
            <span className="text-xs font-black bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full">
              ({totalItems})
            </span>
          </div>

          {/* Month selector */}
          <select
            value={selectedMonth}
            onChange={(e) => {
              onChangeMonth(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-red-500"
          >
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 flex-1 sm:flex-initial max-w-md">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="ค้นหา Eq No / Site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setActiveSearch(searchTerm);
                  setCurrentPage(1);
                }
              }}
              className="w-full text-xs font-medium pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 outline-none focus:ring-2 focus:ring-red-500"
            />
            <span className="absolute left-2.5 top-2 text-slate-400">
              <Icons.Search size={14} />
            </span>
          </div>

          <button
            onClick={() => {
              setActiveSearch(searchTerm);
              setCurrentPage(1);
            }}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all active:scale-95 shrink-0"
          >
            ค้นหา
          </button>

          {/* Column Settings Toggle */}
          <button
            onClick={() => setShowColSettings(!showColSettings)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors shrink-0"
            title="จัดการคอลัมน์"
          >
            <Icons.Columns size={16} />
          </button>

          {/* Add New Record Button */}
          <button
            onClick={onAddNew}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0"
          >
            <Icons.Plus size={15} />
            <span>เพิ่มข้อมูล</span>
          </button>
        </div>
      </div>

      {/* Column Visibility Panel (if toggled) */}
      {showColSettings && (
        <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs animate-pop">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-slate-700">แสดง / ซ่อน คอลัมน์</span>
            <button
              onClick={() => {
                setColWidths(DEFAULT_WIDTHS);
                localStorage.removeItem('sais_col_widths');
              }}
              className="text-[10px] text-blue-600 hover:underline font-bold"
            >
              คืนค่าความกว้างเริ่มต้น
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {COLUMNS_DEF.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibleCols[c.id] ?? true}
                  onChange={(e) => setVisibleCols({ ...visibleCols, [c.id]: e.target.checked })}
                  className="rounded text-red-600"
                />
                <span className="text-[11px] font-medium text-slate-700">{c.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Active Filter Badges Bar */}
      {activeBadges.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-2 rounded-xl text-xs">
          <span className="text-[10px] font-bold text-slate-500 mr-1">ตัวกรองที่ใช้งานอยู่:</span>
          {activeBadges.map((b) => (
            <span
              key={b.key}
              className="inline-flex items-center gap-1 bg-white border border-slate-300 text-slate-800 px-2 py-0.5 rounded-md text-[11px] font-bold shadow-2xs"
            >
              {b.label}
              <button
                onClick={b.onRemove}
                className="text-slate-400 hover:text-rose-600 ml-0.5 font-black"
              >
                ×
              </button>
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-[10px] font-bold text-red-600 hover:text-red-700 underline ml-2"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}

      {/* Main High-Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar max-h-[650px] relative">
          <table className="w-full text-left border-collapse text-xs select-none">
            {/* Sticky Table Header with Resizable columns and Filters */}
            <thead className="bg-slate-900 text-white sticky top-0 z-20">
              <tr>
                {/* No. */}
                {visibleCols.no && (
                  <th
                    style={{ width: `${colWidths.no || 50}px` }}
                    className="p-2.5 font-bold text-center border-r border-slate-800 relative"
                  >
                    No.
                    <div
                      onMouseDown={(e) => startResize('no', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Insp. Date */}
                {visibleCols.inspDate && (
                  <th
                    style={{ width: `${colWidths.inspDate || 100}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative whitespace-nowrap"
                  >
                    INSP. DATE
                    <div
                      onMouseDown={(e) => startResize('inspDate', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Eq. No. */}
                {visibleCols.eqNo && (
                  <th
                    style={{ width: `${colWidths.eqNo || 110}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative whitespace-nowrap"
                  >
                    EQ. NO.
                    <div
                      onMouseDown={(e) => startResize('eqNo', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Gen. Date */}
                {visibleCols.genDate && (
                  <th
                    style={{ width: `${colWidths.genDate || 100}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative whitespace-nowrap"
                  >
                    GEN. DATE
                    <div
                      onMouseDown={(e) => startResize('genDate', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Gen. Sys */}
                {visibleCols.sys && (
                  <th
                    style={{ width: `${colWidths.sys || 90}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="whitespace-nowrap">GEN. SYS</span>
                      <select
                        value={colFilters.sys}
                        onChange={(e) => setColFilters({ ...colFilters, sys: e.target.value })}
                        className="bg-slate-800 text-[10px] text-white rounded p-0.5 border border-slate-700 outline-none"
                      >
                        <option value="all">All</option>
                        {optionsMap.sys.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      onMouseDown={(e) => startResize('sys', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Inspector Name */}
                {visibleCols.insp && (
                  <th
                    style={{ width: `${colWidths.insp || 140}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="whitespace-nowrap">INSPECTOR</span>
                      <select
                        value={colFilters.insp}
                        onChange={(e) => setColFilters({ ...colFilters, insp: e.target.value })}
                        className="bg-slate-800 text-[10px] text-white rounded p-0.5 border border-slate-700 outline-none truncate"
                      >
                        <option value="all">All</option>
                        {optionsMap.insp.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      onMouseDown={(e) => startResize('insp', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Product Line */}
                {visibleCols.prod && (
                  <th
                    style={{ width: `${colWidths.prod || 90}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="whitespace-nowrap">PROD. LINE</span>
                      <select
                        value={colFilters.prod}
                        onChange={(e) => setColFilters({ ...colFilters, prod: e.target.value })}
                        className="bg-slate-800 text-[10px] text-white rounded p-0.5 border border-slate-700 outline-none"
                      >
                        <option value="all">All</option>
                        {optionsMap.prod.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      onMouseDown={(e) => startResize('prod', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Type */}
                {visibleCols.type && (
                  <th
                    style={{ width: `${colWidths.type || 90}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="whitespace-nowrap">TYPE</span>
                      <select
                        value={colFilters.type}
                        onChange={(e) => setColFilters({ ...colFilters, type: e.target.value })}
                        className="bg-slate-800 text-[10px] text-white rounded p-0.5 border border-slate-700 outline-none"
                      >
                        <option value="all">All</option>
                        {optionsMap.type.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      onMouseDown={(e) => startResize('type', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Job Site */}
                {visibleCols.site && (
                  <th
                    style={{ width: `${colWidths.site || 160}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative whitespace-nowrap"
                  >
                    JOB SITE
                    <div
                      onMouseDown={(e) => startResize('site', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Unit */}
                {visibleCols.unit && (
                  <th
                    style={{ width: `${colWidths.unit || 80}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative text-center"
                  >
                    UNIT
                    <div
                      onMouseDown={(e) => startResize('unit', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Condition */}
                {visibleCols.cond && (
                  <th
                    style={{ width: `${colWidths.cond || 120}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="whitespace-nowrap">CONDITION</span>
                      <select
                        value={colFilters.cond}
                        onChange={(e) => setColFilters({ ...colFilters, cond: e.target.value })}
                        className="bg-slate-800 text-[10px] text-white rounded p-0.5 border border-slate-700 outline-none"
                      >
                        <option value="all">All</option>
                        {optionsMap.cond.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      onMouseDown={(e) => startResize('cond', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Pre Check */}
                {visibleCols.pre && (
                  <th
                    style={{ width: `${colWidths.pre || 80}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative text-center"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="whitespace-nowrap">PRE CHK</span>
                      <select
                        value={colFilters.pre}
                        onChange={(e) => setColFilters({ ...colFilters, pre: e.target.value })}
                        className="bg-slate-800 text-[10px] text-white rounded p-0.5 border border-slate-700 outline-none"
                      >
                        <option value="all">All</option>
                        {optionsMap.pre.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      onMouseDown={(e) => startResize('pre', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Buzzer */}
                {visibleCols.buz && (
                  <th
                    style={{ width: `${colWidths.buz || 80}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative text-center"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="whitespace-nowrap">BUZZER</span>
                      <select
                        value={colFilters.buz}
                        onChange={(e) => setColFilters({ ...colFilters, buz: e.target.value })}
                        className="bg-slate-800 text-[10px] text-white rounded p-0.5 border border-slate-700 outline-none"
                      >
                        <option value="all">All</option>
                        {optionsMap.buz.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      onMouseDown={(e) => startResize('buz', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Remark */}
                {visibleCols.remark && (
                  <th
                    style={{ width: `${colWidths.remark || 170}px` }}
                    className="p-2.5 font-bold border-r border-slate-800 relative whitespace-nowrap"
                  >
                    REMARK
                    <div
                      onMouseDown={(e) => startResize('remark', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}

                {/* Status */}
                {visibleCols.status && (
                  <th
                    style={{ width: `${colWidths.status || 125}px` }}
                    className="p-2.5 font-bold relative"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="whitespace-nowrap">SAIS STATUS</span>
                      <select
                        value={colFilters.status}
                        onChange={(e) => setColFilters({ ...colFilters, status: e.target.value })}
                        className="bg-slate-800 text-[10px] text-white rounded p-0.5 border border-slate-700 outline-none"
                      >
                        <option value="all">All</option>
                        {optionsMap.status.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div
                      onMouseDown={(e) => startResize('status', e)}
                      className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-red-500"
                    />
                  </th>
                )}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-12 text-center text-slate-400 font-medium">
                    ไม่พบข้อมูลที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, idx) => {
                  const globalIdx = (currentPage - 1) * pageSize + idx + 1;
                  const remarks = parseRemarkHistory(row.remark);
                  const latestRemark = remarks.length > 0 ? remarks[remarks.length - 1].text : '';

                  // Row alternate bg by inspection date grouping
                  const isEvenRow = idx % 2 === 0;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => onSelectRecord(row)}
                      className={`border-b border-slate-100 hover:bg-blue-50/60 cursor-pointer transition-colors ${
                        isEvenRow ? 'bg-white' : 'bg-slate-50/50'
                      }`}
                    >
                      {/* No. */}
                      {visibleCols.no && (
                        <td className="p-2 text-center text-slate-500 font-bold border-r border-slate-100">
                          {globalIdx}
                        </td>
                      )}

                      {/* Insp Date */}
                      {visibleCols.inspDate && (
                        <td className="p-2 text-blue-600 font-black border-r border-slate-100 whitespace-nowrap">
                          {formatDateToDDMMYY(row.inspectionDate)}
                        </td>
                      )}

                      {/* Eq No */}
                      {visibleCols.eqNo && (
                        <td className="p-2 font-black text-slate-900 border-r border-slate-100 whitespace-nowrap">
                          {row.equipmentNo}
                        </td>
                      )}

                      {/* Gen Date */}
                      {visibleCols.genDate && (
                        <td className="p-2 text-slate-500 font-medium border-r border-slate-100 whitespace-nowrap">
                          {formatDateToDDMMYY(row.generatedDate)}
                        </td>
                      )}

                      {/* Gen Sys */}
                      {visibleCols.sys && (
                        <td className="p-2 text-center font-bold text-slate-700 border-r border-slate-100">
                          {row.generatedInSystem || '-'}
                        </td>
                      )}

                      {/* Inspector */}
                      {visibleCols.insp && (
                        <td className="p-2 font-bold text-slate-800 border-r border-slate-100 truncate max-w-[150px]">
                          {row.inspectorName}
                        </td>
                      )}

                      {/* Prod Line */}
                      {visibleCols.prod && (
                        <td className="p-2 font-bold text-slate-700 border-r border-slate-100">
                          {row.productLine}
                        </td>
                      )}

                      {/* Type (with green badge for NI CNX, pink badge for NI HKT) */}
                      {visibleCols.type && (
                        <td className="p-2 border-r border-slate-100">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] inline-block ${
                              row.type === 'NI CNX'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : row.type === 'NI HKT'
                                ? 'bg-pink-100 text-pink-800 border border-pink-300'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {row.type}
                          </span>
                        </td>
                      )}

                      {/* Job Site */}
                      {visibleCols.site && (
                        <td className="p-2 font-medium text-slate-800 border-r border-slate-100 truncate max-w-[180px]">
                          {row.jobSite}
                        </td>
                      )}

                      {/* Unit */}
                      {visibleCols.unit && (
                        <td className="p-2 text-center font-bold text-slate-700 border-r border-slate-100">
                          {row.unit || 'L1'}
                        </td>
                      )}

                      {/* Condition */}
                      {visibleCols.cond && (
                        <td className="p-2 border-r border-slate-100">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              row.condition === 'TEMPORARY POWER SUPPLY'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : row.condition === 'BUILDER LIFT'
                                ? 'bg-orange-100 text-orange-900 border border-orange-300'
                                : 'text-slate-600'
                            }`}
                          >
                            {row.condition || 'Final'}
                          </span>
                        </td>
                      )}

                      {/* Pre Check */}
                      {visibleCols.pre && (
                        <td className="p-2 text-center font-black border-r border-slate-100">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              row.preCheck === 'OK'
                                ? 'text-emerald-700 bg-emerald-50 font-black'
                                : row.preCheck === 'NO'
                                ? 'text-rose-700 bg-rose-100 font-black border border-rose-300'
                                : 'text-slate-400'
                            }`}
                          >
                            {row.preCheck || '-'}
                          </span>
                        </td>
                      )}

                      {/* Buzzer */}
                      {visibleCols.buz && (
                        <td className="p-2 text-center font-black border-r border-slate-100">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] ${
                              row.buzzer === 'YES'
                                ? 'text-blue-700 bg-blue-50 font-black'
                                : row.buzzer === 'NO'
                                ? 'text-rose-700 bg-rose-100 font-black border border-rose-300'
                                : 'text-slate-400'
                            }`}
                          >
                            {row.buzzer || '-'}
                          </span>
                        </td>
                      )}

                      {/* Remark */}
                      {visibleCols.remark && (
                        <td className="p-2 border-r border-slate-100 max-w-[200px] truncate text-slate-500">
                          {latestRemark ? (
                            <span className="flex items-center gap-1">
                              <Icons.MessageSquare size={12} className="text-slate-400 shrink-0" />
                              <span className="truncate">{latestRemark}</span>
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                      )}

                      {/* SAIS Status */}
                      {visibleCols.status && (
                        <td className="p-2 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black inline-block ${
                              row.saisStatus?.includes('Completed')
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : row.saisStatus?.includes('OIL')
                                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                : row.saisStatus?.includes('Failed')
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {row.saisStatus || 'PENDING'}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <span>แสดงต่อหน้า:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="px-2 py-1 bg-white border border-slate-300 rounded-lg font-bold outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-slate-400">|</span>
            <span>
              แสดง {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, totalItems)} จาก {totalItems} รายการ
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold"
            >
              <Icons.ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 font-bold text-slate-800">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 font-bold"
            >
              <Icons.ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
