import React, { useState } from 'react';
import { SystemLog, SystemNotification, User } from '../../types';
import { Icons } from '../Icons';

interface ActivityModalProps {
  logs: SystemLog[];
  notifications: SystemNotification[];
  user: User | null;
  onClose: () => void;
  onMarkRead: (id: string) => void;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  logs,
  notifications,
  user,
  onClose,
  onMarkRead,
}) => {
  const [tab, setTab] = useState<'notif' | 'logs'>('notif');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q) ||
      log.user.toLowerCase().includes(q)
    );
  });

  const userNotifs = notifications.filter((n) => {
    return !n.target || n.target === user?.username || (user?.role === 'admin' && n.target === 'ALL_ADMIN');
  });

  return (
    <div className="backdrop z-[500] p-4">
      <div className="modal-card p-6 h-[85vh] flex flex-col bg-white rounded-3xl shadow-2xl relative w-full max-w-lg">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors"
        >
          <Icons.X />
        </button>

        <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3 flex-shrink-0">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <Icons.Bell />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 leading-tight">ประวัติและการแจ้งเตือน</h3>
            <span className="text-[11px] text-slate-400">ระบบบันทึกความเคลื่อนไหว SAIS</span>
          </div>
        </div>

        {/* Tab switch */}
        <div className="flex gap-2 mb-3 bg-slate-100 p-1 rounded-xl flex-shrink-0">
          <button
            onClick={() => setTab('notif')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'notif' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            การแจ้งเตือน ({userNotifs.length})
          </button>
          <button
            onClick={() => setTab('logs')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'logs' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            ประวัติการทำงาน (Logs)
          </button>
        </div>

        {tab === 'logs' && (
          <div className="mb-3 flex-shrink-0">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs">
              <span className="text-slate-400 mr-2">
                <Icons.Search />
              </span>
              <input
                type="text"
                placeholder="ค้นหา Log (แอ็กชัน, ชื่อผู้ใช้, รายละเอียด)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-slate-700 font-medium"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar">
          {tab === 'notif' ? (
            userNotifs.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-12">ไม่มีการแจ้งเตือนใหม่</div>
            ) : (
              userNotifs.map((n) => {
                const isRead = String(n.isRead) === 'true';
                return (
                  <div
                    key={n.id}
                    onClick={() => onMarkRead(n.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isRead ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-blue-50/60 border-blue-200 shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                        {!isRead && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>}
                        {n.title}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(n.timestamp).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                  </div>
                );
              })
            )
          ) : filteredLogs.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-12">ไม่พบประวัติการทำงาน</div>
          ) : (
            filteredLogs.map((log, i) => (
              <div key={log.id || i} className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs">
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
                  <Icons.User /> ผู้ทำรายการ: <b className="text-slate-600">{log.user}</b>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
