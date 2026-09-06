import React from 'react';
import { Icons } from '../Icons';

interface CloudShareModalProps {
  onClose: () => void;
  appUrl: string;
}

export const CloudShareModal: React.FC<CloudShareModalProps> = ({ onClose, appUrl }) => {
  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    alert('คัดลอกลิงก์เรียบร้อยแล้ว');
  };

  return (
    <div className="modal-card w-full max-w-lg bg-white rounded-3xl shadow-2xl animate-pop relative flex flex-col max-h-[92vh] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-blue-600 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white shadow-sm">
            <Icons.Cloud />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              ศูนย์แชร์ลิงก์ & คลาวด์อัตโนมัติ
            </h3>
            <p className="text-xs text-blue-100">
              ใช้งานได้ทันที ไม่ต้องก๊อปปี้โค้ด พร้อมซิงค์ Firebase
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bg-black/10 hover:bg-black/20 text-white p-2 rounded-full transition-colors"
        >
          <Icons.X />
        </button>
      </div>

      {/* Content Area */}
      <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
        
        {/* Link Sharing Section */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Icons.Globe className="text-blue-600" /> ลิงก์สำหรับเข้าใช้งานระบบ
            </h4>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              24/7
            </span>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={appUrl}
              className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 font-mono text-slate-600 bg-white"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5"
            >
              <Icons.Copy size={14} /> คัดลอก
            </button>
          </div>
          <a
            href={appUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full block text-center py-2.5 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-bold rounded-xl transition-colors"
          >
            <Icons.ExternalLink size={14} className="inline mr-1" /> เปิดใช้งานทันทีบนแท็บใหม่
          </a>
        </div>

        {/* Cloud Status Section */}
        <div className="bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200 space-y-3">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <Icons.Flame className="text-orange-500" /> Firebase Firestore
            </h4>
            <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-bold">
              เชื่อมต่อในตัว ✓
            </span>
          </div>
          <p className="text-[11px] text-emerald-800 leading-relaxed">
            ฐานข้อมูล Cloud Firestore ซิงค์ตารางงานอัตโนมัติ ทุกคนเปิดดูได้ทันที ข้อมูลไม่หาย
          </p>
        </div>
      </div>
    </div>
  );
};
