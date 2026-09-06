import React from 'react';
import { Icons } from '../Icons';

interface AdminCellModalProps {
  data: { date: string; inspector_name: string };
  onClose: () => void;
  onBook: () => void;
  onAddEvent: () => void;
  onAddLeave: () => void;
  onAddHoliday: () => void;
}

export const AdminCellModal: React.FC<AdminCellModalProps> = ({
  data,
  onClose,
  onBook,
  onAddEvent,
  onAddLeave,
  onAddHoliday,
}) => {
  return (
    <div className="modal-card p-6 text-center animate-pop w-full max-w-sm bg-white rounded-3xl shadow-2xl relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors"
      >
        <Icons.X />
      </button>

      <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
        <Icons.CalendarX />
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight">จัดการคิวตรวจ / วันพิเศษ</h3>
      <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        วันที่: <span className="font-bold text-blue-600">{data.date}</span> &nbsp;|&nbsp; ผู้ตรวจ:{' '}
        <span className="font-bold text-blue-600">{data.inspector_name}</span>
      </p>

      <div className="space-y-2.5">
        <button
          onClick={onBook}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98"
        >
          <Icons.Plus /> จองคิวตรวจ SAIS ปกติ
        </button>
        <button
          onClick={onAddEvent}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98"
        >
          <Icons.Star /> เพิ่มกิจกรรมบริษัท (Event)
        </button>
        <button
          onClick={onAddLeave}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98"
        >
          <Icons.User /> จองวันลาให้พนักงาน (Leave)
        </button>
        <button
          onClick={onAddHoliday}
          className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98"
        >
          <Icons.CalendarX /> เพิ่มวันหยุดบริษัท (Holiday)
        </button>
      </div>
    </div>
  );
};
