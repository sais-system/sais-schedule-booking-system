import React from 'react';
import { Icons } from '../Icons';
import { User, Inspector } from '../../types';
import { getMyInspectorName } from '../../mockData';

interface AdminCellModalProps {
  data: { date: string; inspector_name: string };
  onClose: () => void;
  onBook: () => void;
  onAddEvent?: () => void;
  onAddLeave: () => void;
  onAddHoliday?: () => void;
  role?: string;
  user?: User | null;
  inspectors?: Inspector[];
}

export const AdminCellModal: React.FC<AdminCellModalProps> = ({
  data,
  onClose,
  onBook,
  onAddEvent,
  onAddLeave,
  onAddHoliday,
  role,
  user,
  inspectors = [],
}) => {
  const isInspector = role === 'inspector' || user?.role === 'inspector';
  const myInspectorName = isInspector ? getMyInspectorName(user, inspectors) : '';
  const isSelf =
    !isInspector ||
    !myInspectorName ||
    data.inspector_name.toLowerCase() === myInspectorName.toLowerCase();

  return (
    <div className="modal-card p-6 text-center animate-pop w-full max-w-sm bg-white rounded-3xl shadow-2xl relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors cursor-pointer"
      >
        <Icons.X />
      </button>

      <div
        className={`w-12 h-12 ${
          isInspector ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
        } rounded-2xl flex items-center justify-center mx-auto mb-3`}
      >
        {isInspector ? <Icons.Calendar /> : <Icons.CalendarX />}
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-1 leading-tight">
        {isInspector ? 'จัดการคิวตรวจ / วันลา' : 'จัดการคิวตรวจ / วันพิเศษ'}
      </h3>
      {isInspector && (
        <div className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full inline-block mb-2 border border-amber-200">
          สิทธิ์ผู้ตรวจ (Inspector) {myInspectorName ? `: ${myInspectorName}` : ''}
        </div>
      )}
      <p className="text-xs text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
        วันที่: <span className="font-bold text-blue-600">{data.date}</span> &nbsp;|&nbsp; ผู้ตรวจ:{' '}
        <span className="font-bold text-blue-600">{data.inspector_name}</span>
      </p>

      <div className="space-y-2.5">
        <button
          onClick={onBook}
          className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98 cursor-pointer"
        >
          <Icons.Plus /> จองคิวตรวจ SAIS
        </button>

        {isInspector ? (
          isSelf ? (
            <button
              onClick={onAddLeave}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98 cursor-pointer"
            >
              <Icons.User /> เพิ่มวันลาของฉัน ({myInspectorName})
            </button>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-black text-amber-900">
                <Icons.Lock size={13} className="text-amber-600" />
                <span>ไม่สามารถจองวันลาให้ผู้ตรวจท่านอื่นได้</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                คุณเข้าสู่ระบบในสิทธิ์ผู้ตรวจ <b className="text-amber-950 font-black">"{myInspectorName}"</b> สามารถจองวันลาได้เฉพาะตนเองเท่านั้น ไม่สามารถลงวันลาให้ {data.inspector_name} ได้
              </p>
            </div>
          )
        ) : (
          <button
            onClick={onAddLeave}
            className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98 cursor-pointer"
          >
            <Icons.User /> จองวันลาให้พนักงาน (Leave)
          </button>
        )}

        {!isInspector && onAddEvent && (
          <button
            onClick={onAddEvent}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98 cursor-pointer"
          >
            <Icons.Star /> เพิ่มกิจกรรมบริษัท (Event)
          </button>
        )}

        {!isInspector && onAddHoliday && (
          <button
            onClick={onAddHoliday}
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all active:scale-98 cursor-pointer"
          >
            <Icons.CalendarX /> เพิ่มวันหยุดบริษัท (Holiday)
          </button>
        )}
      </div>
    </div>
  );
};
