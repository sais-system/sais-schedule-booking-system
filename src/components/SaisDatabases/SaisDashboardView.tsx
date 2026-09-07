import React, { useMemo } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';
import * as XLSX from 'xlsx';
import { SaisRecord, getInspectorSortIndex, getMonthOnly, getYearOnly } from './types';
import { Icons } from '../Icons';

interface SaisDashboardViewProps {
  records: SaisRecord[];
  selectedYear: string;
  onChangeYear: (y: string) => void;
  selectedPeriod: string;
  onChangePeriod: (p: string) => void;
  onDrillDown: (filters: { status?: string; inspector?: string; productLine?: string; type?: string }) => void;
}

export const SaisDashboardView: React.FC<SaisDashboardViewProps> = ({
  records,
  selectedYear,
  onChangeYear,
  selectedPeriod,
  onChangePeriod,
  onDrillDown,
}) => {
  // Available Years
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      const y = getYearOnly(r.inspectionDate);
      if (y) set.add(y);
    });
    const currY = new Date().getFullYear().toString();
    set.add(currY);
    set.add((parseInt(currY) - 1).toString());
    return ['all', ...Array.from(set).sort().reverse()];
  }, [records]);

  // Filtered dataset for selected period
  const filteredData = useMemo(() => {
    return records.filter((r) => {
      if (selectedYear !== 'all') {
        const y = getYearOnly(r.inspectionDate);
        if (y !== selectedYear) return false;
      }

      if (selectedPeriod !== 'all') {
        const m = getMonthOnly(r.inspectionDate);
        if (selectedPeriod.startsWith('q')) {
          const q = parseInt(selectedPeriod.replace('q', ''));
          const monthNum = parseInt(m);
          if (q === 1 && (monthNum < 1 || monthNum > 3)) return false;
          if (q === 2 && (monthNum < 4 || monthNum > 6)) return false;
          if (q === 3 && (monthNum < 7 || monthNum > 9)) return false;
          if (q === 4 && (monthNum < 10 || monthNum > 12)) return false;
        } else {
          if (m !== selectedPeriod) return false;
        }
      }
      return true;
    });
  }, [records, selectedYear, selectedPeriod]);

  // Calculations
  const stats = useMemo(() => {
    const total = filteredData.length;
    let completed = 0;
    let passedOil = 0;
    let failed = 0;
    let cancelled = 0;
    let pending = 0;

    let preCheckOk = 0;
    let preCheckTotal = 0;
    let buzzerYes = 0;
    let buzzerTotal = 0;

    filteredData.forEach((r) => {
      const st = r.saisStatus || '';
      if (st.includes('Completed')) completed++;
      else if (st.includes('OIL')) passedOil++;
      else if (st.includes('Failed')) failed++;
      else if (st.includes('ยกเลิก')) cancelled++;
      else pending++;

      if (r.preCheck) {
        preCheckTotal++;
        if (r.preCheck.toUpperCase() === 'OK') preCheckOk++;
      }
      if (r.buzzer) {
        buzzerTotal++;
        if (r.buzzer.toUpperCase() === 'YES') buzzerYes++;
      }
    });

    const fpy = total > 0 ? Math.round(((completed + passedOil) / total) * 100) : 0;
    const failRate = total > 0 ? Math.round((failed / total) * 100) : 0;

    // Previous month comparison for MoM Trend
    let prevMonthTotal = 0;
    let prevMonthPassed = 0;
    const currentMonthNum = new Date().getMonth() + 1;
    const prevMonthNum = currentMonthNum === 1 ? 12 : currentMonthNum - 1;
    const prevMonthStr = String(prevMonthNum).padStart(2, '0');

    records.forEach((r) => {
      const m = getMonthOnly(r.inspectionDate);
      if (m === prevMonthStr) {
        prevMonthTotal++;
        if (r.saisStatus.includes('Completed') || r.saisStatus.includes('OIL')) {
          prevMonthPassed++;
        }
      }
    });

    const prevFpy = prevMonthTotal > 0 ? Math.round((prevMonthPassed / prevMonthTotal) * 100) : 0;
    const momDiff = fpy - prevFpy;

    return {
      total,
      completed,
      passedOil,
      failed,
      cancelled,
      pending,
      fpy,
      failRate,
      momDiff,
      preCheckPct: preCheckTotal > 0 ? Math.round((preCheckOk / preCheckTotal) * 100) : 100,
      buzzerPct: buzzerTotal > 0 ? Math.round((buzzerYes / buzzerTotal) * 100) : 100,
    };
  }, [filteredData, records]);

  // Donut chart data
  const pieData = useMemo(() => {
    return [
      { name: 'Completed', value: stats.completed, color: '#10B981', statusKey: 'Passed with Completed' },
      { name: 'Passed with OIL', value: stats.passedOil, color: '#F59E0B', statusKey: 'Passed with OIL' },
      { name: 'Failed', value: stats.failed, color: '#EF4444', statusKey: 'Failed' },
      ...(stats.pending > 0 ? [{ name: 'Pending', value: stats.pending, color: '#9CA3AF', statusKey: 'PENDING' }] : []),
    ].filter((d) => d.value > 0);
  }, [stats]);

  // Product line bar chart data
  const productLineData = useMemo(() => {
    const map: Record<string, { product: string; completed: number; passedOil: number; failed: number; total: number }> = {};
    filteredData.forEach((r) => {
      const prod = r.productLine || 'Other';
      if (!map[prod]) {
        map[prod] = { product: prod, completed: 0, passedOil: 0, failed: 0, total: 0 };
      }
      map[prod].total++;
      if (r.saisStatus.includes('Completed')) map[prod].completed++;
      else if (r.saisStatus.includes('OIL')) map[prod].passedOil++;
      else if (r.saisStatus.includes('Failed')) map[prod].failed++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // Risk by Type
  const typeAnalysis = useMemo(() => {
    const map: Record<string, { type: string; total: number; failed: number }> = {};
    filteredData.forEach((r) => {
      const t = r.type || 'Standard';
      if (!map[t]) map[t] = { type: t, total: 0, failed: 0 };
      map[t].total++;
      if (r.saisStatus.includes('Failed')) map[t].failed++;
    });
    return Object.values(map)
      .map((item) => ({
        ...item,
        failPct: item.total > 0 ? Math.round((item.failed / item.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // Risk by Condition
  const conditionAnalysis = useMemo(() => {
    const map: Record<string, { cond: string; total: number; failed: number }> = {};
    filteredData.forEach((r) => {
      const c = r.condition || 'Final';
      if (!map[c]) map[c] = { cond: c, total: 0, failed: 0 };
      map[c].total++;
      if (r.saisStatus.includes('Failed')) map[c].failed++;
    });
    return Object.values(map).map((item) => ({
      ...item,
      failPct: item.total > 0 ? Math.round((item.failed / item.total) * 100) : 0,
    }));
  }, [filteredData]);

  // Inspector Leaderboard (ลำดับคงที่ 1-8)
  const leaderboard = useMemo(() => {
    const map: Record<string, { name: string; total: number; completed: number; passedOil: number; failed: number }> = {};
    filteredData.forEach((r) => {
      const ins = r.inspectorName;
      if (!ins) return;
      if (!map[ins]) map[ins] = { name: ins, total: 0, completed: 0, passedOil: 0, failed: 0 };
      map[ins].total++;
      if (r.saisStatus.includes('Completed')) map[ins].completed++;
      else if (r.saisStatus.includes('OIL')) map[ins].passedOil++;
      else if (r.saisStatus.includes('Failed')) map[ins].failed++;
    });

    return Object.values(map)
      .map((item) => ({
        ...item,
        fpy: item.total > 0 ? Math.round(((item.completed + item.passedOil) / item.total) * 100) : 0,
        sortIdx: getInspectorSortIndex(item.name),
      }))
      .sort((a, b) => a.sortIdx - b.sortIdx || b.total - a.total);
  }, [filteredData]);

  // Excel Export
  const handleExportExcel = () => {
    const exportRows = filteredData.map((r, i) => ({
      'No.': i + 1,
      'Inspection Date': r.inspectionDate,
      'Equipment No.': r.equipmentNo,
      'Generated Date': r.generatedDate || '',
      'Generated In System': r.generatedInSystem || '',
      'Inspector Name': r.inspectorName,
      'Product Line': r.productLine,
      'Type': r.type,
      'Job Site': r.jobSite,
      'Unit': r.unit,
      'Condition': r.condition || '',
      'Pre Check': r.preCheck || '',
      'Buzzer': r.buzzer || '',
      'Remark': r.remark || '',
      'SAIS Status': r.saisStatus,
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SAIS_Records');
    XLSX.writeFile(wb, `SAIS_Data_Export_${selectedYear}_${selectedPeriod}.xlsx`);
  };

  // PDF Export
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-4 pb-20 max-w-7xl mx-auto">
      {/* Filter and Export Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Year selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">ปี:</span>
            <select
              value={selectedYear}
              onChange={(e) => onChangeYear(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">ทุกปี (All Years)</option>
              {availableYears.filter((y) => y !== 'all').map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Period selector */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500">ช่วงเวลา:</span>
            <select
              value={selectedPeriod}
              onChange={(e) => onChangePeriod(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="all">ทั้งปี (Full Year)</option>
              <option value="q1">ไตรมาส 1 (ม.ค. - มี.ค.)</option>
              <option value="q2">ไตรมาส 2 (เม.ย. - มิ.ย.)</option>
              <option value="q3">ไตรมาส 3 (ก.ค. - ก.ย.)</option>
              <option value="q4">ไตรมาส 4 (ต.ค. - ธ.ค.)</option>
              <option disabled>──────────</option>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).map((m, idx) => (
                <option key={m} value={m}>
                  เดือน {idx + 1} ({['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][idx]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <Icons.FileSpreadsheet size={14} />
            <span>Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <Icons.Download size={14} />
            <span>พิมพ์ / PDF</span>
          </button>
        </div>
      </div>

      {/* 3 Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: Total Inspected */}
        <div
          onClick={() => onDrillDown({})}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-blue-400 cursor-pointer transition-all relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">TOTAL INSPECTED</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icons.Target size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs font-bold text-slate-500">งาน</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">จำนวนงานเข้าตรวจทั้งหมด (รวมรอผล)</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
        </div>

        {/* Card 2: First Pass Yield */}
        <div
          onClick={() => onDrillDown({ status: 'Passed with Completed' })}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-400 cursor-pointer transition-all relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">FIRST PASS YIELD</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icons.Award size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600">{stats.fpy}%</span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                stats.momDiff >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {stats.momDiff >= 0 ? <Icons.TrendingUp size={11} /> : <Icons.TrendingDown size={11} />}
              {stats.momDiff >= 0 ? `+${stats.momDiff}%` : `${stats.momDiff}%`} MoM
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">ผ่านสำเร็จ (Completed + OIL)</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500"></div>
        </div>

        {/* Card 3: Failed Defects */}
        <div
          onClick={() => onDrillDown({ status: 'Failed' })}
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs hover:border-rose-400 cursor-pointer transition-all relative overflow-hidden group"
        >
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">FAILED DEFECTS</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Icons.ShieldAlert size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600">{stats.failed}</span>
            <span className="text-xs font-bold text-rose-500">({stats.failRate}%)</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5">ต้องแก้ไข (คลิกเพื่อดูรายชื่อไซต์งาน)</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500"></div>
        </div>
      </div>

      {/* Chart Row 1: Donut Chart + Product Line Stacked Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Donut Chart */}
        <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Icons.PieChart size={16} className="text-slate-600" /> สัดส่วนผลการตรวจ
            </h3>
            <span className="text-[10px] font-bold text-slate-400">คลิกเพื่อกรองข้อมูล</span>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            {pieData.length === 0 ? (
              <div className="text-center text-xs text-slate-400">ไม่มีข้อมูลตามตัวกรอง</div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      onClick={(entry: any) => onDrillDown({ status: entry?.statusKey || entry?.name })}
                      cursor="pointer"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
                {/* Center text in donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xl font-black text-slate-800">{stats.total}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase">TOTAL</span>
                </div>
              </>
            )}
          </div>

          {/* Donut Legend */}
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px]">
            {pieData.map((item) => (
              <div
                key={item.name}
                onClick={() => onDrillDown({ status: item.statusKey })}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                  <span className="text-slate-600 font-medium truncate">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Product Line Stacked Bar Chart */}
        <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Icons.Chart size={16} className="text-slate-600" /> ผลงานตามรุ่น Product Line
            </h3>
            <span className="text-[10px] font-bold text-slate-400">Failed / OIL / Completed</span>
          </div>

          <div className="h-64 w-full">
            {productLineData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">ไม่มีข้อมูล</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={productLineData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                  onClick={(state: any) => {
                    if (state && state.activePayload && state.activePayload[0]) {
                      onDrillDown({ productLine: state.activePayload[0].payload.product });
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="product" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <RechartsTooltip />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                  <Bar dataKey="failed" name="Failed" stackId="a" fill="#EF4444" cursor="pointer" />
                  <Bar dataKey="passedOil" name="Passed with OIL" stackId="a" fill="#F59E0B" cursor="pointer" />
                  <Bar dataKey="completed" name="Completed" stackId="a" fill="#10B981" cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Risk Analysis, Site Readiness & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Level 3 Risk Analysis */}
        <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Icons.ShieldAlert size={16} className="text-amber-500" /> การวิเคราะห์เชิงลึก (Risk Analysis)
            </h3>
          </div>

          {/* Risk by Type */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">วิเคราะห์ตาม TYPE งาน</span>
            <div className="space-y-2">
              {typeAnalysis.map((item) => (
                <div
                  key={item.type}
                  onClick={() => onDrillDown({ type: item.type })}
                  className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-slate-700">{item.type}</span>
                    <span className="text-rose-600">Fail {item.failPct}% ({item.failed}/{item.total})</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.failPct > 30 ? 'bg-rose-500' : item.failPct > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.max(5, item.failPct)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk by Condition */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">วิเคราะห์สภาพหน้างาน</span>
            <div className="space-y-1.5">
              {conditionAnalysis.map((item) => (
                <div key={item.cond} className="flex justify-between items-center text-xs p-1.5 bg-slate-50 rounded-lg">
                  <span className="text-slate-700 font-medium">{item.cond}</span>
                  <span className="font-bold text-slate-800">{item.total} งาน</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Readiness Gauges: Pre-Check & Buzzer */}
        <div className="lg:col-span-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Icons.CheckCircle size={16} className="text-emerald-600" /> ความพร้อมหน้างาน
            </h3>
          </div>

          <div className="space-y-4">
            {/* Pre Check */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">PRE-CHECK (OK)</span>
                <span className="text-base font-black text-emerald-600">{stats.preCheckPct}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${stats.preCheckPct}%` }}
                ></div>
              </div>
            </div>

            {/* Buzzer */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700">BUZZER (YES)</span>
                <span className="text-base font-black text-blue-600">{stats.buzzerPct}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${stats.buzzerPct}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-[10px] text-amber-800 leading-tight">
            💡 ตรวจสอบ Buzzer และ Pre-Check ให้เรียบร้อยก่อนส่งมอบงานตรวจเพื่อลดความเสี่ยงการ Failed
          </div>
        </div>

        {/* Inspector Leaderboard (ลำดับคงที่) */}
        <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <Icons.Award size={16} className="text-amber-500" /> สถิติผู้ตรวจ (Inspector Leaderboard)
            </h3>
            <span className="text-[10px] text-slate-400">ลำดับคงที่ 1-8</span>
          </div>

          <div className="space-y-1.5 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
            {leaderboard.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">ไม่มีข้อมูลผู้ตรวจ</div>
            ) : (
              leaderboard.map((item, idx) => (
                <div
                  key={item.name}
                  onClick={() => onDrillDown({ inspector: item.name })}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 hover:border-blue-200 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                        idx === 0
                          ? 'bg-amber-400 text-amber-950 shadow-xs'
                          : idx === 1
                          ? 'bg-slate-300 text-slate-800'
                          : idx === 2
                          ? 'bg-amber-700 text-amber-100'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-800 truncate">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {item.total} งาน
                    </span>
                    <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {item.fpy}% FPY
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
