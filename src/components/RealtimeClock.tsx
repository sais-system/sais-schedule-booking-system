import React, { useState, useEffect } from 'react';
import { getThaiTime } from '../mockData';
import { Icons } from './Icons';

interface RealtimeClockProps {
  lastSyncTime: Date;
}

export const RealtimeClock: React.FC<RealtimeClockProps> = React.memo(({ lastSyncTime }) => {
  const [currentTime, setCurrentTime] = useState<Date>(getThaiTime());

  useEffect(() => {
    const timerId = setInterval(() => setCurrentTime(getThaiTime()), 1000);
    return () => clearInterval(timerId);
  }, []);

  const minutesAgo = Math.floor((getThaiTime().getTime() - new Date(lastSyncTime).getTime()) / 60000);

  return (
    <div className="realtime-clock flex flex-col sm:flex-row items-center justify-between gap-1 px-4 py-2 bg-slate-50 border-t border-slate-200 shadow-inner z-30">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
        <span className="text-slate-500 flex items-center"><Icons.Clock /></span>
        <span>
          {currentTime.toLocaleDateString('th-TH', {
            timeZone: 'Asia/Bangkok',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}{' '}
          {currentTime.toLocaleTimeString('th-TH', { timeZone: 'Asia/Bangkok' })}
        </span>
      </div>
      <div className="text-[11px] text-slate-500 font-normal bg-white px-2.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span>อัปเดตข้อมูลล่าสุด: {minutesAgo < 1 ? 'เพิ่งอัปเดตเมื่อสักครู่' : `${minutesAgo} นาทีที่แล้ว`}</span>
      </div>
    </div>
  );
});
