import React, { useState } from 'react';
import { Icons } from '../Icons';
import { useTranslation } from '../../i18n';

interface CloudShareModalProps {
  onClose: () => void;
  cloudStatus: 'connected' | 'syncing' | 'offline';
  onForceSync: () => Promise<void>;
}

export const CloudShareModal: React.FC<CloudShareModalProps> = ({
  onClose,
  cloudStatus,
  onForceSync,
}) => {
  const { lang } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Live direct URL dynamically resolved from current browser window or cloud preview URL
  const liveUrl = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
    ? window.location.origin
    : 'https://ais-dev-nyzbdit2hskvqll37wcyz7-923348657053.asia-southeast1.run.app';

  const handleCopy = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(liveUrl);
      } else {
        const ta = document.createElement('textarea');
        ta.value = liveUrl;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // ignore
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await onForceSync();
      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch {
      // ignore
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-pop">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center border border-white/20 shadow-xs">
              <Icons.Cloud size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg leading-tight">
                {lang === 'th' ? 'ศูนย์แชร์ลิงก์ & คลาวด์อัตโนมัติ' : 'Live Cloud & Share Center'}
              </h3>
              <p className="text-[11px] text-blue-100">
                {lang === 'th'
                  ? 'ใช้งานได้ทันที ไม่ต้องก๊อปปี้โค้ด พร้อมซิงค์ Firebase'
                  : 'Instant live URL with automated Firebase & Cloud sync'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto custom-scrollbar text-slate-700 text-xs">
          {/* Main Direct URL Box */}
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-900 text-xs flex items-center gap-1.5">
                <Icons.Globe size={15} className="text-blue-600" />
                {lang === 'th' ? 'ลิงก์ URL สำหรับเข้าใช้งานจริง (Production)' : 'Production Web URL'}
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                ออนไลน์ 24/7
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={liveUrl}
                className="w-full text-xs font-mono bg-white border border-blue-200 rounded-xl px-3 py-2 text-slate-800 select-all outline-none focus:ring-2 focus:ring-blue-400"
              />
              <button
                type="button"
                onClick={handleCopy}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-95'
                }`}
              >
                {copied ? <Icons.Check size={14} /> : <Icons.Copy size={14} />}
                <span>{copied ? (lang === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : (lang === 'th' ? 'คัดลอก' : 'Copy')}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 border border-blue-300 text-blue-700 font-bold rounded-xl text-center flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Icons.ExternalLink size={13} /> {lang === 'th' ? 'เปิดใช้งานทันทีบนแท็บใหม่' : 'Open in New Tab'}
              </a>
            </div>
          </div>

          {/* Direct ZIP Download & GitHub Upload Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-300 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <Icons.Download size={22} className="text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                    {lang === 'th' ? '📦 ดาวน์โหลด Source Code ทั้งหมด (.ZIP)' : '📦 Download Full Source Code (.ZIP)'}
                    <span className="text-[10px] bg-purple-600 text-white font-bold px-2 py-0.5 rounded-full">
                      ไฟล์พร้อมใช้
                    </span>
                  </h4>
                  <p className="text-[11px] text-purple-800">
                    {lang === 'th'
                      ? 'รวมโค้ดทั้งหมด, README.md, และคู่มือ GitHub พร้อมนำไปอัปโหลดขึ้น GitHub หรือรันในเครื่อง'
                      : 'Complete project files including README & GitHub Actions, ready to push.'}
                  </p>
                </div>
              </div>

              <a
                href="/sais-schedule-booking-source.zip"
                download="sais-schedule-booking-source.zip"
                className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 shrink-0"
              >
                <Icons.Download size={16} />
                <span>{lang === 'th' ? 'ดาวน์โหลดไฟล์ .ZIP' : 'Download .ZIP'}</span>
              </a>
            </div>

            {/* Quick Step-by-Step Git Commands */}
            <div className="bg-slate-900 text-slate-200 p-3 rounded-xl space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-sans">
                <span className="font-bold text-white flex items-center gap-1">
                  💻 คำสั่งอัปโหลดขึ้น GitHub ด้วย Git:
                </span>
                <span>(พิมพ์ใน Terminal หลังแตกไฟล์ ZIP)</span>
              </div>
              <div className="space-y-1 select-all text-emerald-400">
                <p>git init</p>
                <p>git add .</p>
                <p>git commit -m "Initial commit: SAIS Schedule Booking"</p>
                <p>git branch -M main</p>
                <p className="text-amber-300">git remote add origin https://github.com/&lt;USERNAME&gt;/&lt;REPO&gt;.git</p>
                <p>git push -u origin main</p>
              </div>
            </div>
          </div>

          {/* Automated Cloud & Infrastructure Selection Card */}
          <div className="space-y-3">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Icons.ShieldCheck size={16} className="text-emerald-600" />
              {lang === 'th'
                ? 'ข้อมูลการเชื่อมต่อระบบคลาวด์ (Cloud Infrastructure)'
                : 'Cloud Infrastructure'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option 1: Firebase Firestore (Active) */}
              <div className="p-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50/50 space-y-1.5 relative">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-900 text-xs flex items-center gap-1">
                    🔥 Firebase Firestore
                  </span>
                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded-md">
                    เชื่อมต่อในตัว ✓
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {lang === 'th'
                    ? 'ฐานข้อมูล Cloud Firestore ซิงค์ตารางงานอัตโนมัติ ทุกคนเปิดดูได้ทันที ข้อมูลไม่หาย'
                    : 'Realtime Cloud Firestore automatically syncs all jobs across all devices.'}
                </p>
                <div className="pt-1 flex items-center justify-between text-[10px] font-bold text-emerald-700">
                  <span>สถานะ: {cloudStatus === 'connected' ? '🟢 เชื่อมต่อแล้ว' : '🟡 กำลังซิงค์'}</span>
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="text-blue-600 hover:underline flex items-center gap-0.5"
                  >
                    <Icons.RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
                    {isSyncing ? 'กำลังซิงค์...' : 'ซิงค์ทันที'}
                  </button>
                </div>
              </div>

              {/* Option 2: GitHub Repository */}
              <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    🐙 GitHub Setup
                  </span>
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded-md">
                    พร้อมไฟล์ README
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {lang === 'th'
                    ? 'ในไฟล์ ZIP มีทั้งโค้ดตัวเต็ม, README.md อธิบายอย่างละเอียด, และ GitHub Actions พร้อม Deploy อัตโนมัติ'
                    : 'ZIP includes complete source, README.md instructions, and GitHub Actions workflow.'}
                </p>
              </div>
            </div>
          </div>

          {/* Sync Success Banner */}
          {syncSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-bold text-center animate-fade-in flex items-center justify-center gap-1.5">
              <Icons.Check size={14} /> ซิงค์ข้อมูลกับ Cloud Firestore เรียบร้อยแล้ว!
            </div>
          )}

          {/* User Guide Notes */}
          <div className="bg-slate-100 p-3.5 rounded-xl space-y-1.5 text-[11px] text-slate-600">
            <span className="font-bold text-slate-800 block">💡 ข้อแนะนำสำหรับการเปิดบนโทรศัพท์มือถือ (Mobile / Android / iOS):</span>
            <ul className="list-disc list-inside space-y-1 text-[10px]">
              <li>หากเปิดในแอปเบราว์เซอร์แล้วขึ้นข้อความ <span className="font-bold text-amber-700">"Action required to load your app"</span> ให้กดปุ่ม <span className="font-bold text-blue-700">"Authenticate in new window"</span> หรือกดเปิดที่ <span className="font-bold">ลิงก์ URL จริง</span> ด้านบนได้โดยตรงทันที</li>
              <li>ระบบเป็น Responsive รองรับสัมผัส (Touch) บนมือถือ 100% พร้อมปุ่มสแกนเอกสารด้วยกล้องมือถือ</li>
              <li>ข้อมูลคิวงานและรูปภาพจะถูกบันทึกและซิงค์แบบเรียลไทม์ ผู้ใช้ 100 คน และผู้ตรวจ 10 คน จะเห็นข้อมูลอัปเดตพร้อมกันทันที</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
          >
            {lang === 'th' ? 'เข้าใจแล้ว / ปิด' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
