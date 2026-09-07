import React, { useState } from 'react';
import { Booking, Inspector, User } from '../../types';
import { Icons } from '../Icons';
import { getThaiTime, getLocalDateString } from '../../mockData';

interface SpecialModalProps {
  type: 'leaves' | 'events' | 'holidays';
  inspectors: Inspector[];
  bookings: Booking[];
  user: User | null;
  onClose: () => void;
  onAddSpecial: (
    specialType: 'leave' | 'company_event' | 'public_holiday',
    dates: string[],
    targetInspectors: string[],
    title: string,
    color?: string
  ) => void;
  onDeleteBooking: (booking: Booking) => void;
  onBulkDelete: (ids: string[]) => void;
  setAlertMsg: (msg: string | null) => void;
}

export const SpecialModal: React.FC<SpecialModalProps> = ({
  type,
  inspectors,
  bookings,
  user,
  onClose,
  onAddSpecial,
  onDeleteBooking,
  onBulkDelete,
  setAlertMsg,
}) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInspectors, setSelectedInspectors] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [leaveType, setLeaveType] = useState('ลาพักร้อน');
  const [customLeaveType, setCustomLeaveType] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventColor, setEventColor] = useState('#22c55e');
  const [holidayName, setHolidayName] = useState('');
  const [selectedToDelete, setSelectedToDelete] = useState<string[]>([]);

  const generateDateRange = (s: string, e: string, skipSunday = true) => {
    if (!s || !e) return [];
    const start = new Date(`${s}T12:00:00`);
    const end = new Date(`${e}T12:00:00`);
    if (start > end) return [];
    const dates: string[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      const isSun = curr.getDay() === 0;
      if (!skipSunday || !isSun) {
        dates.push(curr.toISOString().split('T')[0]);
      }
      curr.setDate(curr.getDate() + 1);
    }
    return dates;
  };

  const datesToCreate = generateDateRange(startDate, endDate, type !== 'holidays');

  const filteredList = bookings.filter((b) => {
    if (String(b.status) === 'cancelled') return false;
    if (type === 'leaves') return b.job_type === 'leave';
    if (type === 'events') return b.job_type === 'company_event';
    if (type === 'holidays') return b.job_type === 'public_holiday';
    return false;
  });

  const handleAdd = () => {
    if (!startDate || !endDate) {
      setAlertMsg('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด');
      return;
    }
    if (datesToCreate.length === 0) {
      setAlertMsg('ช่วงวันที่ที่เลือกไม่ถูกต้อง');
      return;
    }

    const todayStr = getLocalDateString(getThaiTime());
    const isAdmin = user?.role === 'admin';
    if (!isAdmin && datesToCreate.some((d) => d < todayStr)) {
      setAlertMsg(
        '⚠️ ไม่สามารถบันทึกข้อมูลย้อนหลังได้ (ก่อนวันที่ปัจจุบัน)\nเฉพาะสิทธิ์ผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถลงคิวตรวจ วันลา กิจกรรม หรือวันหยุดย้อนหลังได้ครับ'
      );
      return;
    }

    if (type === 'leaves') {
      if (selectedInspectors.length === 0) {
        setAlertMsg('กรุณาเลือกพนักงานที่ต้องการบันทึกวันลา');
        return;
      }
      const title = leaveType === 'อื่นๆ' ? customLeaveType : leaveType;
      if (!title) {
        setAlertMsg('กรุณาระบุประเภทการลา');
        return;
      }
      const targets = selectedInspectors.includes('ALL') ? inspectors.map((i) => i.name) : selectedInspectors;
      onAddSpecial('leave', datesToCreate, targets, title);
    } else if (type === 'events') {
      if (!eventName.trim()) {
        setAlertMsg('กรุณากรอกชื่อกิจกรรม');
        return;
      }
      const targets =
        selectedInspectors.length === 0 || selectedInspectors.includes('ALL')
          ? ['SYSTEM_EVENT']
          : selectedInspectors;
      onAddSpecial('company_event', datesToCreate, targets, eventName.trim(), eventColor);
    } else if (type === 'holidays') {
      if (!holidayName.trim()) {
        setAlertMsg('กรุณากรอกชื่อวันหยุด');
        return;
      }
      onAddSpecial('public_holiday', datesToCreate, ['SYSTEM_HOLIDAY'], holidayName.trim());
    }

    // Reset fields
    setStartDate('');
    setEndDate('');
    setSelectedInspectors([]);
    setEventName('');
    setHolidayName('');
  };

  const titles = {
    leaves: { title: 'จัดการวันลาพนักงาน', bg: 'bg-amber-500', icon: <Icons.User /> },
    events: { title: 'จัดการกิจกรรมบริษัท', bg: 'bg-emerald-600', icon: <Icons.Star /> },
    holidays: { title: 'จัดการวันหยุดบริษัท', bg: 'bg-red-600', icon: <Icons.CalendarX /> },
  };

  const currentTheme = titles[type];

  return (
    <div className="modal-card w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl animate-pop flex flex-col max-h-[92dvh] sm:max-h-[90vh] bg-white">
      <div className={`${currentTheme.bg} p-4 text-white flex justify-between items-center z-10 shrink-0`}>
        <h3 className="font-bold text-base flex items-center gap-2">
          {currentTheme.icon}
          {currentTheme.title}
        </h3>
        <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition-colors">
          <Icons.X />
        </button>
      </div>

      <div className="p-4 pb-12 sm:pb-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 space-y-4 -webkit-overflow-scrolling-touch">
        {/* Creation Box */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
          <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
            <Icons.Plus /> เพิ่มรายการใหม่ ({datesToCreate.length} วัน)
          </h4>

          {type === 'leaves' && (
            <>
              <div className="relative">
                <label className="text-[10px] font-bold text-slate-500 block mb-1">เลือกผู้ตรวจ / พนักงาน</label>
                <div
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl bg-slate-50 font-bold cursor-pointer flex justify-between items-center"
                >
                  <span className="truncate text-slate-700">
                    {selectedInspectors.length === 0
                      ? '-- กรุณาเลือก --'
                      : selectedInspectors.includes('ALL')
                      ? 'ทุกคนในบริษัท'
                      : selectedInspectors.join(', ')}
                  </span>
                  <span className="text-slate-400 text-xs">▼</span>
                </div>

                {showDropdown && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar p-1">
                    <label className="flex items-center gap-2 p-2 hover:bg-amber-50 rounded-lg cursor-pointer border-b border-slate-100 text-xs font-bold text-amber-900">
                      <input
                        type="checkbox"
                        checked={selectedInspectors.includes('ALL')}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedInspectors(['ALL']);
                          else setSelectedInspectors([]);
                        }}
                        className="accent-amber-500 w-4 h-4"
                      />
                      <span>ทุกคน</span>
                    </label>
                    {inspectors.map((ins) => (
                      <label key={ins.name} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-xs font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={selectedInspectors.includes(ins.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedInspectors((prev) =>
                                prev.includes('ALL') ? [ins.name] : [...prev, ins.name]
                              );
                            } else {
                              setSelectedInspectors((prev) => prev.filter((n) => n !== ins.name));
                            }
                          }}
                          className="accent-amber-500 w-4 h-4"
                        />
                        <span>{ins.name}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">ประเภทการลา</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold"
                >
                  <option value="ลาพักร้อน">ลาพักร้อน</option>
                  <option value="ลากิจ">ลากิจ</option>
                  <option value="ลาป่วย">ลาป่วย</option>
                  <option value="อื่นๆ">อื่นๆ (ระบุเอง)</option>
                </select>
              </div>

              {leaveType === 'อื่นๆ' && (
                <input
                  type="text"
                  placeholder="ระบุเหตุผลการลา..."
                  value={customLeaveType}
                  onChange={(e) => setCustomLeaveType(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-amber-50 font-bold outline-none"
                />
              )}
            </>
          )}

          {type === 'events' && (
            <>
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">ชื่อกิจกรรม</label>
                <input
                  type="text"
                  placeholder="เช่น Safety Month, ประชุมทีมประจำเดือน..."
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none"
                />
              </div>

              <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                <label className="text-[10px] font-bold text-emerald-900 block mb-1.5">🎨 เลือกสีกิจกรรมบนตาราง</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={eventColor}
                    onChange={(e) => setEventColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                  />
                  <div className="flex gap-1.5 flex-wrap">
                    {['#22c55e', '#3b82f6', '#8b5cf6', '#eab308', '#f97316', '#ec4899', '#64748b'].map((c) => (
                      <div
                        key={c}
                        onClick={() => setEventColor(c)}
                        className={`w-6 h-6 rounded-full cursor-pointer shadow-sm border border-black/10 transition-transform ${
                          eventColor === c ? 'scale-110 ring-2 ring-emerald-500' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}

          {type === 'holidays' && (
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">ชื่อวันหยุด</label>
              <input
                type="text"
                placeholder="เช่น วันขึ้นปีใหม่, วันสงกรานต์, วันหยุดชดเชย..."
                value={holidayName}
                onChange={(e) => setHolidayName(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">เริ่มวันที่</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-slate-50 font-bold text-blue-600"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">ถึงวันที่</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-slate-50 font-bold text-blue-600"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            className={`w-full py-3 text-white font-bold rounded-xl shadow-md text-xs active:scale-98 transition-all flex items-center justify-center gap-1.5 ${currentTheme.bg}`}
          >
            <Icons.Plus /> บันทึกรายการลงตาราง
          </button>
        </div>

        {/* List of created items */}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-slate-700">รายการในระบบ ({filteredList.length})</span>
            {selectedToDelete.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  onBulkDelete(selectedToDelete);
                  setSelectedToDelete([]);
                }}
                className="text-[10px] bg-red-50 text-red-600 font-bold px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
              >
                ลบที่เลือก ({selectedToDelete.length})
              </button>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {filteredList.map((item) => (
              <div
                key={item.id}
                className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedToDelete.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedToDelete((prev) => [...prev, item.id]);
                      else setSelectedToDelete((prev) => prev.filter((id) => id !== item.id));
                    }}
                    className="w-4 h-4 accent-red-600 rounded cursor-pointer flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-xs text-slate-800 block truncate">{item.site_name}</span>
                    <span className="text-[10px] text-slate-400 block font-medium">
                      📅 {item.date} {item.inspector_name !== 'SYSTEM_HOLIDAY' && item.inspector_name !== 'SYSTEM_EVENT' && `• ${item.inspector_name}`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onDeleteBooking(item)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                >
                  <Icons.Trash />
                </button>
              </div>
            ))}

            {filteredList.length === 0 && (
              <div className="text-center text-xs text-slate-400 py-8 bg-white rounded-xl border-2 border-dashed">
                ไม่มีรายการในหมวดหมู่นี้
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
