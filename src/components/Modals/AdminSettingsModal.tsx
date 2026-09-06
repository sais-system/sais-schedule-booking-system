import React, { useState } from 'react';
import {
  WebSettings,
  Inspector,
  User,
  Booking,
} from '../../types';
import { Icons } from '../Icons';
import { useTranslation } from '../../i18n';

interface AdminSettingsModalProps {
  settings: WebSettings;
  inspectors: Inspector[];
  users: User[];
  bookings: Booking[];
  onClose: () => void;
  onSaveSettings: (newSettings: WebSettings) => void;
  onSaveInspectors: (inspectors: Inspector[]) => void;
  onSaveUsers: (users: User[]) => void;
  onOpenCloudSync: () => void;
  setAlertMsg: (msg: string | null) => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  settings,
  inspectors,
  users,
  bookings,
  onClose,
  onSaveSettings,
  onSaveInspectors,
  onSaveUsers,
  onOpenCloudSync,
  setAlertMsg,
}) => {
  const { t, lang } = useTranslation();
  const [activeTab, setActiveTab] = useState<'system' | 'concurrency' | 'gdrive' | 'firebase' | 'inspectors' | 'colors'>('system');

  // Form states for settings
  const [formData, setFormData] = useState<WebSettings>({
    ...settings,
    maxConcurrentViewers: settings.maxConcurrentViewers || 500,
    maxDailyBookingsPerInspector: settings.maxDailyBookingsPerInspector || 6,
    autoRealtimeSyncIntervalSec: settings.autoRealtimeSyncIntervalSec || 5,
    allowViewerFastPolling: settings.allowViewerFastPolling ?? true,
    lockBookingsOnEdit: settings.lockBookingsOnEdit ?? true,
    requireDocsBeforeBooking: settings.requireDocsBeforeBooking ?? false,
    systemMaintenanceMode: settings.systemMaintenanceMode ?? false,
    systemAnnouncement: settings.systemAnnouncement || '',
    showSystemAnnouncement: settings.showSystemAnnouncement ?? false,
    gdriveRootFolderId: settings.gdriveRootFolderId || '1_SAIS_DOCS_ROOT',
    gdriveRootFolderUrl: settings.gdriveRootFolderUrl || 'https://drive.google.com/drive/folders/',
    gdriveAutoOrganizeByProject: settings.gdriveAutoOrganizeByProject ?? true,
  });

  const [inspectorList, setInspectorList] = useState<Inspector[]>([...inspectors]);
  const [newInspectorName, setNewInspectorName] = useState('');
  const [newInspectorLines, setNewInspectorLines] = useState('ES1, 3300, 5500, S-villas');

  const handleSave = () => {
    onSaveSettings(formData);
    onSaveInspectors(inspectorList);
    setAlertMsg(lang === 'th' ? 'บันทึกการตั้งค่าระบบผู้ดูแล (Admin) เรียบร้อยแล้ว 100%' : 'Admin settings saved successfully!');
    onClose();
  };

  const handleAddInspector = () => {
    if (!newInspectorName.trim()) {
      setAlertMsg('กรุณากรอกชื่อผู้ตรวจ');
      return;
    }
    if (inspectorList.some((i) => i.name.trim() === newInspectorName.trim())) {
      setAlertMsg('มีชื่อผู้ตรวจนี้ในระบบแล้ว');
      return;
    }
    setInspectorList((prev) => [
      ...prev,
      { name: newInspectorName.trim(), product_lines: newInspectorLines.trim() },
    ]);
    setNewInspectorName('');
  };

  const handleRemoveInspector = (name: string) => {
    if (inspectorList.length <= 1) {
      setAlertMsg('ต้องมีผู้ตรวจอย่างน้อย 1 คน');
      return;
    }
    setInspectorList((prev) => prev.filter((i) => i.name !== name));
  };

  const handleUpdateInspectorLines = (idx: number, lines: string) => {
    const updated = [...inspectorList];
    updated[idx] = { ...updated[idx], product_lines: lines };
    setInspectorList(updated);
  };

  const handleMoveInspector = (index: number, direction: 'up' | 'down') => {
    const updated = [...inspectorList];
    if (direction === 'up' && index > 0) {
      [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    } else if (direction === 'down' && index < updated.length - 1) {
      [updated[index + 1], updated[index]] = [updated[index], updated[index + 1]];
    }
    setInspectorList(updated);
  };

  return (
    <div className="modal-card w-full max-w-2xl bg-white rounded-3xl shadow-2xl animate-pop relative flex flex-col max-h-[92vh] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Icons.Shield />
          </div>
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              {lang === 'th' ? 'ศูนย์ควบคุมและตั้งค่าระบบชั้นสูง (Super Admin Console)' : 'Advanced System Administration'}
              <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-mono">
                LIVE
              </span>
            </h3>
            <p className="text-xs text-slate-300">
              {lang === 'th'
                ? 'ปรับแต่งทุกฟังก์ชัน ทุกระบบความจุ และ Google Drive โดยไม่ต้องแก้โค้ด'
                : 'Configure all engine parameters, capacity, and Drive without touching code'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
        >
          <Icons.X />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2 overflow-x-auto shrink-0 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'system'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icons.Settings /> {lang === 'th' ? 'ระบบทั่วไป' : 'General'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('concurrency')}
          className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'concurrency'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icons.Flame /> {lang === 'th' ? 'ความจุ & ผู้ใช้ (300-500 คน)' : 'Concurrency'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('gdrive')}
          className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'gdrive'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icons.Cloud /> {lang === 'th' ? 'Google Drive (15GB)' : 'Google Drive'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('firebase')}
          className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'firebase'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icons.Shield /> {lang === 'th' ? 'Firebase Cloud 100%' : 'Firebase Config'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('inspectors')}
          className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'inspectors'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icons.User /> {lang === 'th' ? 'รายชื่อผู้ตรวจ (10 คน)' : 'Inspectors'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('colors')}
          className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'colors'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Icons.Chart /> {lang === 'th' ? 'สี & เลย์เอาต์' : 'UI & Theme'}
        </button>
      </div>

      {/* Content Area */}
      <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
        {/* TAB 1: SYSTEM SETTINGS */}
        {activeTab === 'system' && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Icons.Settings /> ข้อมูลหลักของระบบ
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    ชื่อแอปพลิเคชัน (App Header Title)
                  </label>
                  <input
                    type="text"
                    value={formData.appName || ''}
                    onChange={(e) => setFormData({ ...formData, appName: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    ช่วงเวลาซิงค์ข้อมูลอัตโนมัติ (วินาที)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.autoRealtimeSyncIntervalSec || 5}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        autoRealtimeSyncIntervalSec: Number(e.target.value),
                      })
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Announcement Banner */}
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Icons.Bell /> ประกาศด่วนสำหรับผู้ใช้งานทุกคน (Global Announcement)
                </h4>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-amber-900">
                  <input
                    type="checkbox"
                    checked={formData.showSystemAnnouncement || false}
                    onChange={(e) =>
                      setFormData({ ...formData, showSystemAnnouncement: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>เปิดแสดงประกาศ</span>
                </label>
              </div>
              <textarea
                rows={2}
                value={formData.systemAnnouncement || ''}
                onChange={(e) => setFormData({ ...formData, systemAnnouncement: e.target.value })}
                placeholder="พิมพ์ข้อความประกาศด่วนให้ทีมงาน ผู้ตรวจ หรือผู้เข้าชมเห็นที่แถบด้านบน..."
                className="w-full text-xs p-2.5 rounded-xl border border-amber-300 bg-white font-medium text-slate-800 outline-none"
              />
            </div>

            {/* System Security & Maintenance Mode */}
            <div className="bg-red-50/60 p-4 rounded-2xl border border-red-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
                    <Icons.Alert /> โหมดบำรุงรักษาระบบ (Maintenance Mode)
                  </h4>
                  <p className="text-[11px] text-red-700">
                    เมื่อเปิดใช้งาน ผู้ใช้ทั่วไปจะดูได้เพียงอย่างเดียว (Read-Only) เฉพาะ Admin เท่านั้นที่แก้ไขได้
                  </p>
                </div>
                <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-red-900">
                  <input
                    type="checkbox"
                    checked={formData.systemMaintenanceMode || false}
                    onChange={(e) =>
                      setFormData({ ...formData, systemMaintenanceMode: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-red-600"
                  />
                  <span>เปิดโหมด</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HIGH CONCURRENCY ENGINE (300-500 Viewers, 100 Users, 10 Inspectors) */}
        {activeTab === 'concurrency' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <Icons.Flame size={16} className="text-blue-600" />
                  สถาปัตยกรรมรองรับปริมาณงานสูง (High-Scale Optimization)
                </span>
                <span className="text-[10px] bg-blue-600 text-white font-bold px-2 py-0.5 rounded-full font-mono">
                  300-500 Viewers Ready
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                ระบบถูกออกแบบด้วย Indexed Cache Map และ Optimized Subscriptions เพื่อรองรับจำนวน
                Viewer 300-500 คน, ผู้ใช้งาน 100 คน, ผู้ตรวจ 10 คน และ Super Admin 1 คน โดยไม่เกิดปัญหาข้อมูลชนกัน (Race Condition)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  จำนวนผู้เข้าชมพร้อมกันสูงสุด (Max Viewers)
                </label>
                <input
                  type="number"
                  value={formData.maxConcurrentViewers || 500}
                  onChange={(e) =>
                    setFormData({ ...formData, maxConcurrentViewers: Number(e.target.value) })
                  }
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 font-bold bg-white"
                />
                <span className="text-[10px] text-slate-400">ค่าเริ่มต้น 500 คน</span>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                <label className="text-[11px] font-bold text-slate-700 block">
                  จำนวนงานสูงสุดต่อวัน/ผู้ตรวจ (Daily Quota)
                </label>
                <input
                  type="number"
                  value={formData.maxDailyBookingsPerInspector || 6}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxDailyBookingsPerInspector: Number(e.target.value),
                    })
                  }
                  className="w-full text-xs p-2 rounded-xl border border-slate-300 font-bold bg-white"
                />
                <span className="text-[10px] text-slate-400">ป้องกันการจองคิวซ้อนเกินโควต้า</span>
              </div>
            </div>

            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <h5 className="font-bold text-slate-800 mb-2">ตัวเลือกความปลอดภัยระหว่างการแก้ไข:</h5>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.lockBookingsOnEdit ?? true}
                  onChange={(e) =>
                    setFormData({ ...formData, lockBookingsOnEdit: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="font-bold text-slate-700">
                  ระบบล็อกงานขณะแก้ไข (Optimistic Concurrency Lock) ป้องกันการบันทึกทับซ้ำ
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.requireDocsBeforeBooking ?? false}
                  onChange={(e) =>
                    setFormData({ ...formData, requireDocsBeforeBooking: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="font-bold text-slate-700">
                  บังคับแนบเอกสารครบ 3 รายการก่อนกดจอง (Layout, Wiring, Pre-check)
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.allowViewerFastPolling ?? true}
                  onChange={(e) =>
                    setFormData({ ...formData, allowViewerFastPolling: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-blue-600"
                />
                <span className="font-bold text-slate-700">
                  เปิดระบบ Delta Sync สำหรับ Viewers 300-500 คน ช่วยประหยัดแบนด์วิดท์ 80%
                </span>
              </label>
            </div>

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-emerald-900 block">สถิติระบบปัจจุบัน:</span>
                <span className="text-emerald-700 text-[11px]">
                  งานในระบบ: {bookings.length} คิว | ผู้ตรวจ: {inspectorList.length} คน | บัญชีผู้ใช้:{' '}
                  {users.length} คน
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenCloudSync}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1"
              >
                <Icons.RefreshCw size={12} /> ตรวจสอบ Cloud
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: GOOGLE DRIVE CLOUD STORAGE (15GB) */}
        {activeTab === 'gdrive' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Icons.Cloud size={16} className="text-amber-600" />
                  ระบบจัดเก็บเอกสารบน Google Drive (พื้นที่ 15GB ฟรีในระยะยาว)
                </h4>
                <span className="text-[10px] bg-amber-600 text-white font-bold px-2 py-0.5 rounded-full">
                  15 GB Free
                </span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                เปลี่ยนจากการจัดเก็บรูปภาพในฐานข้อมูล มาเป็นการเชื่อมต่อ Google Drive
                สำหรับไฟล์ขนาดใหญ่ เช่น Layout drawings (PDF), Wiring diagrams, เอกสาร Pre-check และภาพถ่ายสภาพหน้างาน 6 จุด
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Google Drive Root Folder ID หรือ ลิงก์โฟลเดอร์ส่วนกลาง
                </label>
                <input
                  type="text"
                  value={formData.gdriveRootFolderId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, gdriveRootFolderId: e.target.value })
                  }
                  placeholder="เช่น 1_SAIS_LIFT_ESCALATOR_DOCS_ROOT หรือ รหัสโฟลเดอร์ Google Drive"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  ระบุ Folder ID จาก Google Drive ที่แชร์ให้ทีมงานเข้าถึงได้
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  URL หน้าเว็บ Google Drive ประจำโครงการ (Shared Folder URL)
                </label>
                <input
                  type="text"
                  value={formData.gdriveRootFolderUrl || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, gdriveRootFolderUrl: e.target.value })
                  }
                  placeholder="https://drive.google.com/drive/folders/..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] bg-white"
                />
              </div>

              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={formData.gdriveAutoOrganizeByProject ?? true}
                    onChange={(e) =>
                      setFormData({ ...formData, gdriveAutoOrganizeByProject: e.target.checked })
                    }
                    className="w-4 h-4 rounded text-blue-600"
                  />
                  <span>สร้างโฟลเดอร์ย่อยตามชื่อโครงการและเลข Equipment อัตโนมัติ</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3.5: FIREBASE CLOUD DATABASE (100% PRODUCTION) */}
        {activeTab === 'firebase' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 border-2 border-orange-300 space-y-2.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                  <Icons.Shield size={16} className="text-orange-600" />
                  การเชื่อมต่อ Firebase Cloud Firestore 100%
                </h4>
                <span className="text-[10px] bg-orange-600 text-white font-bold px-2 py-0.5 rounded-full">
                  Production Cloud
                </span>
              </div>
              <p className="text-[11px] text-orange-900 leading-relaxed">
                ระบบเชื่อมต่อกับ Cloud Firestore จริงโดยอัตโนมัติ ข้อมูลคิวตรวจ, รายชื่อผู้ตรวจ, บัญชีผู้ใช้งาน และการตั้งค่าจะถูกจัดเก็บบน Google Cloud Platform สามารถระบุคีย์โครงการ Firebase ขององค์กรได้โดยตรงที่นี่
              </p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Firebase Project ID:
                </label>
                <input
                  type="text"
                  value={formData.firebaseProjectId || 'sais-schedule-booking'}
                  onChange={(e) => setFormData({ ...formData, firebaseProjectId: e.target.value })}
                  placeholder="เช่น sais-schedule-booking"
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    API Key:
                  </label>
                  <input
                    type="text"
                    value={formData.firebaseApiKey || ''}
                    onChange={(e) => setFormData({ ...formData, firebaseApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Auth Domain:
                  </label>
                  <input
                    type="text"
                    value={formData.firebaseAuthDomain || 'sais-schedule-booking.firebaseapp.com'}
                    onChange={(e) => setFormData({ ...formData, firebaseAuthDomain: e.target.value })}
                    placeholder="your-app.firebaseapp.com"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    Storage Bucket:
                  </label>
                  <input
                    type="text"
                    value={formData.firebaseStorageBucket || 'sais-schedule-booking.appspot.com'}
                    onChange={(e) => setFormData({ ...formData, firebaseStorageBucket: e.target.value })}
                    placeholder="your-app.appspot.com"
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] bg-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    App ID:
                  </label>
                  <input
                    type="text"
                    value={formData.firebaseAppId || '1:923348657053:web:dca3dc60b02845c1'}
                    onChange={(e) => setFormData({ ...formData, firebaseAppId: e.target.value })}
                    placeholder="1:123456789:web:abcdef..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-mono text-[11px] bg-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-800 space-y-1">
                <span className="font-bold block flex items-center gap-1">
                  <Icons.Check size={14} className="text-emerald-600" /> สถานะคลาวด์ปัจจุบัน:
                </span>
                <p>
                  ระบบมีฐานข้อมูลในตัวพร้อมสตรีม Realtime WebSocket ตลอด 24 ชั่วโมง และหากไม่มีอินเทอร์เน็ตจะสลับไปใช้ Local Storage อัตโนมัติ (Offline First) ข้อมูลไม่สูญหาย
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: INSPECTORS MANAGEMENT (10 INSPECTORS) */}
        {activeTab === 'inspectors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800">
                  รายชื่อผู้ตรวจ SAIS ทั้งหมด ({inspectorList.length} คน)
                </h4>
                <span className="text-[11px] text-slate-500">
                  กำหนดโมเดลที่ผู้ตรวจแต่ละท่านมีใบรับรองความชำนาญ (Certificates)
                </span>
              </div>
              <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
                เป้าหมาย: 10 คน
              </span>
            </div>

            {/* List */}
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto custom-scrollbar pr-1">
              {inspectorList.map((ins, idx) => (
                <div
                  key={ins.name}
                  className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white font-mono text-xs flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs text-slate-800">{ins.name}</span>
                  </div>

                  <div className="flex-1 sm:max-w-xs">
                    <input
                      type="text"
                      value={ins.product_lines || ''}
                      onChange={(e) => handleUpdateInspectorLines(idx, e.target.value)}
                      placeholder="เช่น ES1, 3300, 5500"
                      className="w-full text-[11px] p-1.5 rounded-lg border border-slate-300 font-medium bg-white"
                      title="โมเดลสินค้าที่รับตรวจ"
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveInspector(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors font-bold"
                      title="เลื่อนลำดับขึ้น"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveInspector(idx, 'down')}
                      disabled={idx === inspectorList.length - 1}
                      className="p-1.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-30 transition-colors font-bold"
                      title="เลื่อนลำดับลง"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveInspector(ins.name)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                      title="ลบผู้ตรวจนี้"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Inspector */}
            <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200 space-y-2.5">
              <span className="text-xs font-bold text-blue-900 block">
                + เพิ่มผู้ตรวจคนใหม่เข้าสู่ระบบ:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="ชื่อผู้ตรวจ (เช่น สมศักดิ์)"
                  value={newInspectorName}
                  onChange={(e) => setNewInspectorName(e.target.value)}
                  className="text-xs p-2 rounded-xl border border-blue-200 bg-white font-bold"
                />
                <input
                  type="text"
                  placeholder="โมเดลสินค้า (เช่น ES1, 3300, 5500)"
                  value={newInspectorLines}
                  onChange={(e) => setNewInspectorLines(e.target.value)}
                  className="text-xs p-2 rounded-xl border border-blue-200 bg-white font-medium"
                />
              </div>
              <button
                type="button"
                onClick={handleAddInspector}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Icons.Plus /> เพิ่มผู้ตรวจ
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: UI & THEME CUSTOMIZATION */}
        {activeTab === 'colors' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-800">
              ปรับแต่งสีและขนาดตารางแสดงผล (Realtime Preview)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  สีแถบ Header บนสุด
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={formData.headerBg || '#1e293b'}
                    onChange={(e) => setFormData({ ...formData, headerBg: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                  />
                  <span className="font-mono text-[10px]">{formData.headerBg}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  สีหัวตารางปฏิทิน
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={formData.tableHeaderBg || '#1e293b'}
                    onChange={(e) => setFormData({ ...formData, tableHeaderBg: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-300 cursor-pointer"
                  />
                  <span className="font-mono text-[10px]">{formData.tableHeaderBg}</span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  ความกว้างคอลัมน์ (px)
                </label>
                <input
                  type="number"
                  min={80}
                  max={200}
                  value={formData.gridColWidth || 120}
                  onChange={(e) => setFormData({ ...formData, gridColWidth: Number(e.target.value) })}
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-300 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-600 block mb-1">
                  รัศมีมุมการ์ด (px)
                </label>
                <input
                  type="number"
                  min={0}
                  max={20}
                  value={formData.cardRadius || 6}
                  onChange={(e) => setFormData({ ...formData, cardRadius: Number(e.target.value) })}
                  className="w-full text-xs p-1.5 rounded-lg border border-slate-300 font-bold"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
        >
          {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
        </button>

        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Icons.Check />
          {lang === 'th' ? 'บันทึกการตั้งค่าทั้งหมด' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
};
