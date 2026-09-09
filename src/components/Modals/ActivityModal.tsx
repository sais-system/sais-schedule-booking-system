import React, { useState } from 'react';
import { SystemLog, SystemNotification, User } from '../../types';
import { Icons } from '../Icons';

interface ActivityModalProps {
  logs: SystemLog[];
  notifications: SystemNotification[];
  user: User | null;
  onClose: () => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead?: () => void;
  onClearAllNotifs?: () => void;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  logs,
  notifications,
  user,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onClearAllNotifs,
}) => {
  const [tab, setTab] = useState<'notif' | 'logs'>('notif');
  const [notifFilter, setNotifFilter] = useState<'all' | 'add' | 'edit' | 'move' | 'delete' | 'cancel'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const userNotifs = notifications.filter((n) => {
    return !n.target || n.target === user?.username || (user?.role === 'admin' && n.target === 'ALL_ADMIN');
  });

  const filteredNotifs = userNotifs.filter((n) => {
    if (notifFilter !== 'all' && n.type !== notifFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      n.message.toLowerCase().includes(q)
    );
  });

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.user.toLowerCase().includes(q)
    );
  });

  const unreadCount = userNotifs.filter((n) => String(n.isRead) !== 'true').length;

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'add':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Icons.Plus size={10} /> เพิ่มคิวตรวจ
          </span>
        );
      case 'edit':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <Icons.Edit size={10} /> แก้ไขคิวตรวจ
          </span>
        );
      case 'move':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
            ➔ ย้ายคิวตรวจ
          </span>
        );
      case 'cancel':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
            <Icons.AlertCircle size={10} /> ยกเลิกคิวตรวจ
          </span>
        );
      case 'delete':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            <Icons.Trash size={10} /> ลบคิวตรวจ
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            แจ้งเตือน
          </span>
        );
    }
  };

  return (
    <div className="backdrop z-[500] p-3 sm:p-4">
      <div className="modal-card p-4 sm:p-6 h-[88vh] flex flex-col bg-white rounded-3xl shadow-2xl relative w-full max-w-xl mx-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors cursor-pointer"
          title="ปิดหน้าต่าง"
        >
          <Icons.X size={16} />
        </button>

        <div className="flex items-center gap-2.5 mb-3 border-b border-slate-100 pb-3 flex-shrink-0">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
            <Icons.Bell size={20} />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight flex items-center gap-2">
              ประวัติความเคลื่อนไหวและการแจ้งเตือน
              {unreadCount > 0 && (
                <span className="text-[11px] font-bold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                  ใหม่ {unreadCount}
                </span>
              )}
            </h3>
            <span className="text-[11px] text-slate-400">
              บันทึกประวัติการเพิ่ม, แก้ไข, ย้าย, ยกเลิก และลบคิวงาน SAIS
            </span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 mb-3 bg-slate-100 p-1 rounded-xl flex-shrink-0">
          <button
            type="button"
            onClick={() => setTab('notif')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'notif' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icons.Bell size={13} />
            <span>การแจ้งเตือนงาน ({userNotifs.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('logs')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              tab === 'logs' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icons.CheckCircle size={13} />
            <span>ประวัติระบบ (System Logs)</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-2.5 flex-shrink-0">
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs">
            <span className="text-slate-400 mr-2">
              <Icons.Search size={14} />
            </span>
            <input
              type="text"
              placeholder={tab === 'notif' ? 'ค้นหาการแจ้งเตือน (ชื่องาน, ผู้ตรวจ, รายละเอียด)...' : 'ค้นหา Log (แอ็กชัน, ผู้ใช้, รายละเอียด)...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 outline-hidden text-slate-700 font-medium text-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-slate-400 hover:text-slate-600 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filter chips for Notifications tab */}
        {tab === 'notif' && (
          <div className="flex items-center justify-between gap-1 mb-2.5 flex-shrink-0 pb-1 border-b border-slate-100 overflow-x-auto custom-scrollbar">
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setNotifFilter('all')}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  notifFilter === 'all'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                ทั้งหมด ({userNotifs.length})
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter('add')}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  notifFilter === 'add'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}
              >
                + เพิ่ม
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter('edit')}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  notifFilter === 'edit'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                }`}
              >
                ✎ แก้ไข
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter('move')}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  notifFilter === 'move'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}
              >
                ➔ ย้าย
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter('cancel')}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  notifFilter === 'cancel'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300'
                }`}
              >
                ⚠ ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => setNotifFilter('delete')}
                className={`text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all whitespace-nowrap cursor-pointer ${
                  notifFilter === 'delete'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                ✕ ลบ
              </button>
            </div>

            {/* Quick Actions */}
            {onMarkAllRead && unreadCount > 0 && (
              <button
                type="button"
                onClick={onMarkAllRead}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="ทำเครื่องหมายว่าอ่านแล้วทั้งหมด"
              >
                อ่านทั้งหมด
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
          {tab === 'notif' ? (
            filteredNotifs.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-12 space-y-2">
                <Icons.Bell size={32} className="mx-auto text-slate-300" />
                <p className="font-bold">ไม่มีรายการแจ้งเตือนตามเงื่อนไข</p>
                <p className="text-[11px] text-slate-400">เมื่อมีการเพิ่ม, แก้ไข, ย้าย, ยกเลิก หรือลบคิวตรวจ ประวัติจะบันทึกที่นี่โดยอัตโนมัติ</p>
              </div>
            ) : (
              filteredNotifs.map((n) => {
                const isRead = String(n.isRead) === 'true';
                return (
                  <div
                    key={n.id}
                    onClick={() => onMarkRead(n.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isRead
                        ? 'bg-slate-50 border-slate-200/80 opacity-80 hover:opacity-100'
                        : 'bg-gradient-to-r from-blue-50/70 to-indigo-50/50 border-blue-200 shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {!isRead && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0"></span>}
                        {getTypeBadge(n.type)}
                        <span className="font-bold text-xs text-slate-800">
                          {n.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 shrink-0">
                        {new Date(n.timestamp).toLocaleString('th-TH', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed pl-1">{n.message}</p>
                  </div>
                );
              })
            )
          ) : filteredLogs.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-12">ไม่พบประวัติการทำงาน</div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={log.id || i} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs text-xs">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    {log.action}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(log.timestamp).toLocaleString('th-TH', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-slate-600 whitespace-pre-wrap bg-slate-50 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
                  {log.details}
                </div>
                <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <Icons.User size={12} /> ผู้ทำรายการ: <b className="text-slate-600">{log.user}</b>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
