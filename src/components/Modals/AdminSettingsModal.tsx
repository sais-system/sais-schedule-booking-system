import React, { useState, useEffect } from 'react';
import {
  WebSettings,
  Inspector,
  User,
  Booking,
} from '../../types';
import { Icons } from '../Icons';
import { useTranslation } from '../../i18n';
import { testFirebaseConnection, forceCloudSyncAll } from '../../firebase';

interface AdminSettingsModalProps {
  settings: WebSettings;
  inspectors: Inspector[];
  users: User[];
  bookings: Booking[];
  currentUser?: User | null;
  onClose: () => void;
  onSaveSettings: (newSettings: WebSettings) => void;
  onSaveInspectors: (inspectors: Inspector[]) => void;
  onSaveUsers: (users: User[]) => void;
  onOpenCloudSync: () => void;
  setAlertMsg: (msg: string | null) => void;
  columnZoom?: number;
  setColumnZoom?: (val: number | ((prev: number) => number)) => void;
  tableFontScale?: number;
  setTableFontScale?: (val: number | ((prev: number) => number)) => void;
  specialFontScale?: number;
  setSpecialFontScale?: (val: number | ((prev: number) => number)) => void;
  onExportJPG?: () => void;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  settings,
  inspectors,
  users,
  bookings,
  currentUser,
  onClose,
  onSaveSettings,
  onSaveInspectors,
  onSaveUsers,
  setAlertMsg,
  columnZoom = 1,
  setColumnZoom,
  tableFontScale = 1,
  setTableFontScale,
  specialFontScale = 1,
  setSpecialFontScale,
  onExportJPG,
}) => {
  const { lang } = useTranslation();
  const [activeTab, setActiveTab] = useState<'system' | 'display' | 'firebase' | 'gdrive'>('system');

  // Form states for settings
  const [formData, setFormData] = useState<WebSettings>({
    ...settings,
    fontCardTitle: settings.fontCardTitle || 11,
    fontCardSub: settings.fontCardSub || 10,
    fontLeave: settings.fontLeave || 11,
    fontActivity: settings.fontActivity || 11,
    fontHoliday: settings.fontHoliday || 11,
    fontDateHeader: settings.fontDateHeader || 12,
    fontInspectorHeader: settings.fontInspectorHeader || 12,
    cardMinHeight: settings.cardMinHeight || 35,
    cardPadding: settings.cardPadding || 4,
    cardRadius: settings.cardRadius || 6,
    gridColWidth: settings.gridColWidth || 120,
    sundayBg: settings.sundayBg || '#fee2e2',
    sundayText: settings.sundayText || '#991b1b',
    todayBg: settings.todayBg || '#eff6ff',
    todayText: settings.todayText || '#1d4ed8',
    leaveBg: settings.leaveBg || '#fef3c7',
    leaveText: settings.leaveText || '#92400e',
    eventBg: settings.eventBg || '#f3e8ff',
    eventText: settings.eventText || '#6b21a8',
    holidayBg: settings.holidayBg || '#ffedd5',
    holidayText: settings.holidayText || '#9a3412',
    normalBg: settings.normalBg || '#ffffff',
    normalText: settings.normalText || '#0f172a',
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
    firebaseApiKey: settings.firebaseApiKey || 'AIzaSyBOqWqVBTLdr2se2Ktc5SwjXglb55n69go',
    firebaseAuthDomain: settings.firebaseAuthDomain || 'sais-schedule-booking.firebaseapp.com',
    firebaseProjectId: settings.firebaseProjectId || 'sais-schedule-booking',
    firebaseStorageBucket: settings.firebaseStorageBucket || 'sais-schedule-booking.firebasestorage.app',
    firebaseMessagingSenderId: settings.firebaseMessagingSenderId || '908596453130',
    firebaseAppId: settings.firebaseAppId || '1:908596453130:web:e34a5769730672a1d6a4f3',
  });

  // Password-lock state for sensitive configurations (GDrive & Firebase)
  const [isFirebaseLocked, setIsFirebaseLocked] = useState(true);
  const [isGdriveLocked, setIsGdriveLocked] = useState(true);
  const [unlockTarget, setUnlockTarget] = useState<'firebase' | 'gdrive' | null>(null);
  const [unlockPasswordInput, setUnlockPasswordInput] = useState('');
  const [unlockError, setUnlockError] = useState('');

  // Firebase testing and sync states
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [cloudTestMessage, setCloudTestMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);

  // Inspector & User lists
  const [inspectorList, setInspectorList] = useState<Inspector[]>([...inspectors]);
  const [newInspectorName, setNewInspectorName] = useState('');
  const [newInspectorLines, setNewInspectorLines] = useState('ES1, 3300, 5500, S-villas');

  const [userList, setUserList] = useState<User[]>([...users]);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'inspector' | 'user' | 'viewer'>('user');

  // Keep inspector and user lists synced with props
  useEffect(() => {
    setInspectorList([...inspectors].sort((a, b) => (a.order ?? 999) - (b.order ?? 999)));
  }, [inspectors]);

  useEffect(() => {
    setUserList([...users]);
  }, [users]);

  const handleSave = () => {
    onSaveSettings(formData);
    onSaveInspectors(inspectorList);
    onSaveUsers(userList);
    setAlertMsg(lang === 'th' ? '✅ บันทึกการตั้งค่าระบบและผู้ตรวจเรียบร้อยแล้ว' : '✅ Settings saved successfully');
    onClose();
  };

  const handleMoveInspector = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= inspectorList.length) return;
    const updated = [...inspectorList];
    const [removed] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, removed);
    const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
    setInspectorList(reordered);
    onSaveInspectors(reordered);
  };

  const handleSetInspectorOrder = (currentIndex: number, newOrder: number) => {
    const targetIndex = Math.max(0, Math.min(inspectorList.length - 1, newOrder - 1));
    if (targetIndex === currentIndex) return;
    const updated = [...inspectorList];
    const [moved] = updated.splice(currentIndex, 1);
    updated.splice(targetIndex, 0, moved);
    const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
    setInspectorList(reordered);
    onSaveInspectors(reordered);
  };

  const handleAddInspector = () => {
    if (!newInspectorName.trim()) return;
    const exists = inspectorList.some((ins) => ins.name.trim() === newInspectorName.trim());
    if (exists) {
      alert(lang === 'th' ? 'มีผู้ตรวจชื่อนี้อยู่แล้ว' : 'Inspector already exists');
      return;
    }
    const newIns: Inspector = {
      name: newInspectorName.trim(),
      product_lines: newInspectorLines.trim() || 'All Products',
      order: inspectorList.length + 1,
    };
    const nextList = [...inspectorList, newIns].map((item, idx) => ({ ...item, order: idx + 1 }));
    setInspectorList(nextList);
    onSaveInspectors(nextList);
    setNewInspectorName('');
  };

  const handleRemoveInspector = (name: string) => {
    if (confirm(lang === 'th' ? `ต้องการลบผู้ตรวจ "${name}" หรือไม่?` : `Delete inspector "${name}"?`)) {
      const nextList = inspectorList
        .filter((ins) => ins.name !== name)
        .map((item, idx) => ({ ...item, order: idx + 1 }));
      setInspectorList(nextList);
      onSaveInspectors(nextList);
    }
  };

  const handleUpdateInspectorLines = (idx: number, lines: string) => {
    const updated = [...inspectorList];
    updated[idx] = { ...updated[idx], product_lines: lines };
    setInspectorList(updated);
    onSaveInspectors(updated);
  };

  const handleAddUser = () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      alert('กรุณากรอก Username และ Password ให้ครบถ้วน');
      return;
    }
    if (userList.some((u) => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      alert('Username นี้มีอยู่ในระบบแล้ว');
      return;
    }
    const newUser: User = {
      username: newUsername.trim(),
      full_name: newFullName.trim() || newUsername.trim(),
      password: newPassword.trim(),
      role: newRole,
      status: 'approved',
      created_at: new Date().toISOString(),
    };
    const nextUsers = [...userList, newUser];
    setUserList(nextUsers);
    onSaveUsers(nextUsers);
    setNewUsername('');
    setNewFullName('');
    setNewPassword('');
  };

  const handleRemoveUser = (username: string) => {
    if (username === 'jirapong') {
      alert('ไม่สามารถลบ Super Admin หลักของระบบได้');
      return;
    }
    if (confirm(`ต้องการลบผู้ใช้ "${username}" หรือไม่?`)) {
      const nextUsers = userList.filter((u) => u.username !== username);
      setUserList(nextUsers);
      onSaveUsers(nextUsers);
    }
  };

  // Verify Admin Password to Unlock Config
  const handleVerifyUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = unlockPasswordInput.trim();
    // Allow admin password check against currentUser or master passwords
    const isValid =
      cleanPass === 'admin123' ||
      cleanPass === '1234' ||
      (currentUser && currentUser.password === cleanPass);

    if (isValid) {
      if (unlockTarget === 'firebase') {
        setIsFirebaseLocked(false);
      } else if (unlockTarget === 'gdrive') {
        setIsGdriveLocked(false);
      }
      setUnlockTarget(null);
      setUnlockPasswordInput('');
      setUnlockError('');
      setAlertMsg(
        lang === 'th'
          ? '🔓 ปลดล็อกสำเร็จ สามารถแก้ไขการตั้งค่าได้แล้ว'
          : '🔓 Unlocked successfully. You can now edit settings.'
      );
    } else {
      setUnlockError(lang === 'th' ? 'รหัสผ่านแอดมินไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง' : 'Incorrect admin password.');
    }
  };

  // Cloud Live Ping Test
  const handleTestCloudConnection = async () => {
    setIsTestingCloud(true);
    setCloudTestMessage(null);
    try {
      const res = await testFirebaseConnection();
      setCloudTestMessage({ success: res.success, text: res.message });
    } catch (err: any) {
      setCloudTestMessage({ success: false, text: err?.message || 'Connection test failed' });
    } finally {
      setIsTestingCloud(false);
    }
  };

  // Force Full Sync to Cloud
  const handleForceFullSync = async () => {
    if (!confirm('ต้องการซิงค์ข้อมูลทั้งหมด (คิวงาน, ผู้ตรวจ, ผู้ใช้, ตั้งค่า) ขึ้น Cloud Firestore หรือไม่?')) {
      return;
    }
    setIsSyncingAll(true);
    try {
      const res = await forceCloudSyncAll(bookings, inspectorList, userList, formData);
      if (res.success) {
        setAlertMsg(`🚀 ซิงค์ข้อมูลทั้งหมดขึ้น Cloud Firestore สำเร็จเรียบร้อย (${res.count} เอกสาร)`);
      } else {
        alert(`เกิดข้อผิดพลาดในการซิงค์: ${res.error}`);
      }
    } catch (err: any) {
      alert(`ซิงค์ไม่สำเร็จ: ${err?.message}`);
    } finally {
      setIsSyncingAll(false);
    }
  };

  return (
    <div className="backdrop">
      <div className="modal-card w-full max-w-3xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl animate-pop relative flex flex-col max-h-[92dvh] overflow-hidden mx-2 sm:mx-auto">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Icons.Shield />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold flex items-center gap-2">
                {lang === 'th' ? 'ศูนย์ควบคุมและตั้งค่าขั้นสูง (Enterprise Pro Max)' : 'Super Admin & Advanced Console'}
                <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full font-mono font-black">
                  ONLINE
                </span>
              </h3>
              <p className="text-[11px] text-slate-300 hidden sm:block">
                {lang === 'th'
                  ? 'รวมการตั้งค่าแอดมินและการตั้งค่าตารางขั้นสูง พร้อมระบบล็อกรหัสผ่านรักษาความปลอดภัย'
                  : 'Unified Admin & Display Controls with Password-Protected Cloud Configurations'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors active:scale-95"
          >
            <Icons.X />
          </button>
        </div>

        {/* Tabs Bar with Horizontal Scroll for Mobile */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-3 sm:px-6 pt-2 gap-1 sm:gap-2 overflow-x-auto custom-scrollbar shrink-0 text-xs font-bold -webkit-overflow-scrolling-touch">
          <button
            type="button"
            onClick={() => setActiveTab('system')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'system'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icons.Settings size={14} /> {lang === 'th' ? 'ระบบทั่วไป' : 'General'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('display')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'display'
                ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icons.Chart size={14} /> {lang === 'th' ? 'การแสดงผล & ตาราง' : 'Display & Grid'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('firebase')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'firebase'
                ? 'border-orange-500 text-orange-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icons.Shield size={14} /> {lang === 'th' ? 'Firebase Cloud' : 'Firebase'}
            {isFirebaseLocked ? <span className="text-[10px]">🔒</span> : <span className="text-[10px]">🔓</span>}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('gdrive')}
            className={`px-3 py-2 border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'gdrive'
                ? 'border-emerald-600 text-emerald-600 bg-white rounded-t-xl shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icons.Cloud size={14} /> {lang === 'th' ? 'Google Drive (Folder ID)' : 'Google Drive'}
            {isGdriveLocked ? <span className="text-[10px]">🔒</span> : <span className="text-[10px]">🔓</span>}
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          {/* TAB 1: GENERAL SYSTEM SETTINGS */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/70 rounded-2xl border border-blue-200">
                <h4 className="text-xs font-bold text-blue-900 mb-1">
                  การตั้งค่าทั่วไปของระบบ Schindler SAIS Thailand
                </h4>
                <p className="text-[11px] text-blue-700">
                  ควบคุมการประกาศข่าวสาร สิทธิการจอง และโหมดปิดปรับปรุงชั่วคราว
                </p>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">
                    ข้อความประกาศแจ้งเตือนระบบ (Announcement Banner):
                  </label>
                  <input
                    type="text"
                    value={formData.systemAnnouncement || ''}
                    onChange={(e) => setFormData({ ...formData, systemAnnouncement: e.target.value })}
                    placeholder="เช่น ประกาศ: ปิดรับคิวตรวจช่วงวันหยุดปีใหม่ หรือ กรุณาส่งเอกสารก่อน 15:00 น."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium bg-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.showSystemAnnouncement ?? false}
                      onChange={(e) =>
                        setFormData({ ...formData, showSystemAnnouncement: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>เปิดแสดงข้อความประกาศบนแถบหัวเว็บ</span>
                  </label>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-red-700">
                    <input
                      type="checkbox"
                      checked={formData.systemMaintenanceMode ?? false}
                      onChange={(e) =>
                        setFormData({ ...formData, systemMaintenanceMode: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-red-600"
                    />
                    <span>โหมดปิดปรับปรุงระบบชั่วคราว (Maintenance Mode - เฉพาะ Admin เข้าได้)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.requireDocsBeforeBooking ?? false}
                      onChange={(e) =>
                        setFormData({ ...formData, requireDocsBeforeBooking: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-blue-600"
                    />
                    <span>บังคับแนบเอกสาร Drawing/Wiring ครบก่อนจึงจะกดยืนยันจองคิวได้</span>
                  </label>
                </div>

                <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Icons.Edit size={14} /> โหมดปากกาแก้ไขข้อความหน้าเว็บแบบสด (Live Text Edit)
                    </h5>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      เมื่อเปิดใช้งาน จะปรากฏปุ่มปากกาบนข้อความและหัวข้อต่างๆ บนหน้าเว็บ ให้แอดมินคลิกแก้ไขคำได้ทันที
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                    <input
                      type="checkbox"
                      checked={formData.isLiveEdit ?? false}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, isLiveEdit: e.target.checked }))
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ADVANCED DISPLAY & TABLE SETTINGS (MERGED FROM FLOATING MENU) */}
          {activeTab === 'display' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold">ปรับแต่งการแสดงผลตารางและการซูม (Enterprise Display Engine)</h4>
                  <p className="text-[11px] text-slate-300">
                    ปรับขนาดคอลัมน์ ฟอนต์ และบันทึกรูปภาพตารางปฏิทิน
                  </p>
                </div>
                {onExportJPG && (
                  <button
                    type="button"
                    onClick={() => {
                      onExportJPG();
                      onClose();
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <Icons.Download size={14} /> เซฟภาพ JPG
                  </button>
                )}
              </div>

              {/* Column Zoom */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 block mb-2">
                    ซูมความกว้างคอลัมน์ผู้ตรวจ
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      disabled={!setColumnZoom}
                      onClick={() => setColumnZoom && setColumnZoom((z) => Math.max(0.6, z - 0.1))}
                      className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-sm"
                    >
                      -
                    </button>
                    <span className="font-mono font-bold text-xs text-blue-700">
                      {Math.round(columnZoom * 100)}%
                    </span>
                    <button
                      type="button"
                      disabled={!setColumnZoom}
                      onClick={() => setColumnZoom && setColumnZoom((z) => Math.min(2.0, z + 0.1))}
                      className="w-8 h-8 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex justify-center gap-1 mt-2">
                    {[0.8, 1.0, 1.2, 1.5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setColumnZoom && setColumnZoom(val)}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          Math.round(columnZoom * 100) === Math.round(val * 100)
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {Math.round(val * 100)}%
                      </button>
                    ))}
                  </div>
                </div>

              {/* Granular Typography Controls */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    🔤 ขนาดตัวอักษรแบบละเอียด (Granular Typography)
                  </h4>
                  <span className="text-[10px] text-slate-500 font-medium">ปรับขนาดเป็นหน่วยพิกเซล (px)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      หัวข้องาน / โครงการ
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={8}
                        max={20}
                        value={formData.fontCardTitle || 11}
                        onChange={(e) => setFormData({ ...formData, fontCardTitle: Number(e.target.value) })}
                        className="w-full text-xs p-1 rounded-lg border border-slate-300 font-bold text-center"
                      />
                      <span className="text-[10px] text-slate-400">px</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      รายละเอียดงาน / รุ่น
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={7}
                        max={18}
                        value={formData.fontCardSub || 10}
                        onChange={(e) => setFormData({ ...formData, fontCardSub: Number(e.target.value) })}
                        className="w-full text-xs p-1 rounded-lg border border-slate-300 font-bold text-center"
                      />
                      <span className="text-[10px] text-slate-400">px</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-amber-800 block mb-1">
                      ข้อความการ์ดวันลา
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={8}
                        max={20}
                        value={formData.fontLeave || 11}
                        onChange={(e) => setFormData({ ...formData, fontLeave: Number(e.target.value) })}
                        className="w-full text-xs p-1 rounded-lg border border-slate-300 font-bold text-center"
                      />
                      <span className="text-[10px] text-slate-400">px</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-purple-800 block mb-1">
                      ข้อความกิจกรรม/อบรม
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={8}
                        max={20}
                        value={formData.fontActivity || 11}
                        onChange={(e) => setFormData({ ...formData, fontActivity: Number(e.target.value) })}
                        className="w-full text-xs p-1 rounded-lg border border-slate-300 font-bold text-center"
                      />
                      <span className="text-[10px] text-slate-400">px</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-orange-800 block mb-1">
                      ข้อความวันหยุดนักขัตฯ
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={8}
                        max={20}
                        value={formData.fontHoliday || 11}
                        onChange={(e) => setFormData({ ...formData, fontHoliday: Number(e.target.value) })}
                        className="w-full text-xs p-1 rounded-lg border border-slate-300 font-bold text-center"
                      />
                      <span className="text-[10px] text-slate-400">px</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      แถบวันที่ในตาราง
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={9}
                        max={22}
                        value={formData.fontDateHeader || 12}
                        onChange={(e) => setFormData({ ...formData, fontDateHeader: Number(e.target.value) })}
                        className="w-full text-xs p-1 rounded-lg border border-slate-300 font-bold text-center"
                      />
                      <span className="text-[10px] text-slate-400">px</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      แถบชื่อผู้ตรวจ
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={9}
                        max={22}
                        value={formData.fontInspectorHeader || 12}
                        onChange={(e) => setFormData({ ...formData, fontInspectorHeader: Number(e.target.value) })}
                        className="w-full text-xs p-1 rounded-lg border border-slate-300 font-bold text-center"
                      />
                      <span className="text-[10px] text-slate-400">px</span>
                    </div>
                  </div>

                  <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">
                      ความสูงการ์ดต่ำสุด
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={22}
                        max={80}
                        value={formData.cardMinHeight || 35}
                        onChange={(e) => setFormData({ ...formData, cardMinHeight: Number(e.target.value) })}
                        className="w-full text-xs p-1 rounded-lg border border-slate-300 font-bold text-center"
                      />
                      <span className="text-[10px] text-slate-400">px</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Dimensions & Table Column Width */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">📐 ขนาดการ์ดและคอลัมน์ตาราง</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      ระยะขอบภายในการ์ด (Padding px)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={formData.cardPadding || 4}
                      onChange={(e) => setFormData({ ...formData, cardPadding: Number(e.target.value) })}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-1">
                      ความกว้างคอลัมน์พื้นฐาน (px)
                    </label>
                    <input
                      type="number"
                      min={80}
                      max={240}
                      value={formData.gridColWidth || 120}
                      onChange={(e) => setFormData({ ...formData, gridColWidth: Number(e.target.value) })}
                      className="w-full text-xs p-1.5 rounded-lg border border-slate-300 font-bold bg-white"
                    />
                  </div>

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
                </div>
              </div>

              {/* Granular Theme Colors */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 block">🎨 ปรับแต่งสีแถบและประเภทการ์ดแบบละเอียด</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        fontCardTitle: 11,
                        fontCardSub: 10,
                        fontLeave: 11,
                        fontActivity: 11,
                        fontHoliday: 11,
                        fontDateHeader: 12,
                        fontInspectorHeader: 12,
                        cardMinHeight: 35,
                        cardPadding: 4,
                        cardRadius: 6,
                        gridColWidth: 120,
                        sundayBg: '#fee2e2',
                        sundayText: '#991b1b',
                        todayBg: '#eff6ff',
                        todayText: '#1d4ed8',
                        leaveBg: '#fef3c7',
                        leaveText: '#92400e',
                        eventBg: '#f3e8ff',
                        eventText: '#6b21a8',
                        holidayBg: '#ffedd5',
                        holidayText: '#9a3412',
                      })
                    }
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
                  >
                    คืนค่าเริ่มต้นมาตรฐาน
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-red-700 block mb-1">วันอาทิตย์ (Sunday)</span>
                    <div className="flex items-center gap-1 mb-1">
                      <input
                        type="color"
                        value={formData.sundayBg || '#fee2e2'}
                        onChange={(e) => setFormData({ ...formData, sundayBg: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer"
                        title="สีพื้นหลัง"
                      />
                      <span className="text-[9px] text-slate-500">พื้น</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={formData.sundayText || '#991b1b'}
                        onChange={(e) => setFormData({ ...formData, sundayText: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer"
                        title="สีตัวอักษร"
                      />
                      <span className="text-[9px] text-slate-500">ตัวหนังสือ</span>
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-blue-700 block mb-1">วันนี้ (Today)</span>
                    <div className="flex items-center gap-1 mb-1">
                      <input
                        type="color"
                        value={formData.todayBg || '#eff6ff'}
                        onChange={(e) => setFormData({ ...formData, todayBg: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer"
                        title="สีพื้นหลัง"
                      />
                      <span className="text-[9px] text-slate-500">พื้น</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={formData.todayText || '#1d4ed8'}
                        onChange={(e) => setFormData({ ...formData, todayText: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer"
                        title="สีตัวอักษร"
                      />
                      <span className="text-[9px] text-slate-500">ตัวหนังสือ</span>
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-amber-700 block mb-1">การ์ดวันลา (Leave)</span>
                    <div className="flex items-center gap-1 mb-1">
                      <input
                        type="color"
                        value={formData.leaveBg || '#fef3c7'}
                        onChange={(e) => setFormData({ ...formData, leaveBg: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer"
                        title="สีพื้นหลัง"
                      />
                      <span className="text-[9px] text-slate-500">พื้น</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={formData.leaveText || '#92400e'}
                        onChange={(e) => setFormData({ ...formData, leaveText: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer"
                        title="สีตัวอักษร"
                      />
                      <span className="text-[9px] text-slate-500">ตัวหนังสือ</span>
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-purple-700 block mb-1">กิจกรรม (Event)</span>
                    <div className="flex items-center gap-1 mb-1">
                      <input
                        type="color"
                        value={formData.eventBg || '#f3e8ff'}
                        onChange={(e) => setFormData({ ...formData, eventBg: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer"
                        title="สีพื้นหลัง"
                      />
                      <span className="text-[9px] text-slate-500">พื้น</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={formData.eventText || '#6b21a8'}
                        onChange={(e) => setFormData({ ...formData, eventText: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer"
                        title="สีตัวอักษร"
                      />
                      <span className="text-[9px] text-slate-500">ตัวหนังสือ</span>
                    </div>
                  </div>

                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-orange-700 block mb-1">วันหยุด (Holiday)</span>
                    <div className="flex items-center gap-1 mb-1">
                      <input
                        type="color"
                        value={formData.holidayBg || '#ffedd5'}
                        onChange={(e) => setFormData({ ...formData, holidayBg: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer"
                        title="สีพื้นหลัง"
                      />
                      <span className="text-[9px] text-slate-500">พื้น</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={formData.holidayText || '#9a3412'}
                        onChange={(e) => setFormData({ ...formData, holidayText: e.target.value })}
                        className="w-6 h-6 rounded cursor-pointer"
                        title="สีตัวอักษร"
                      />
                      <span className="text-[9px] text-slate-500">ตัวหนังสือ</span>
                    </div>
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="mt-3 p-3 bg-white rounded-xl border border-dashed border-slate-300">
                  <span className="text-[10px] font-bold text-slate-400 block mb-2 uppercase tracking-wider">
                    พรีวิวตัวอย่างการ์ดงานจริง (Real-Time Live Preview)
                  </span>
                  <div className="flex flex-wrap items-center gap-3">
                    <div
                      style={{
                        minHeight: `${formData.cardMinHeight || 35}px`,
                        padding: `${formData.cardPadding || 4}px`,
                        borderRadius: `${formData.cardRadius || 6}px`,
                        backgroundColor: '#ffffff',
                        border: '1px solid #cbd5e1',
                      }}
                      className="flex-1 min-w-[140px] shadow-sm flex flex-col justify-center"
                    >
                      <span
                        style={{ fontSize: `${formData.fontCardTitle || 11}px` }}
                        className="font-bold text-slate-800 truncate block leading-tight"
                      >
                        Noble Around Ari (ES1)
                      </span>
                      <span
                        style={{ fontSize: `${formData.fontCardSub || 10}px` }}
                        className="text-slate-500 truncate block leading-tight mt-0.5"
                      >
                        ตรวจครั้งที่ 1 • 09:00
                      </span>
                    </div>

                    <div
                      style={{
                        minHeight: `${formData.cardMinHeight || 35}px`,
                        padding: `${formData.cardPadding || 4}px`,
                        borderRadius: `${formData.cardRadius || 6}px`,
                        backgroundColor: formData.leaveBg || '#fef3c7',
                        color: formData.leaveText || '#92400e',
                        border: '1px solid rgba(0,0,0,0.08)',
                      }}
                      className="flex-1 min-w-[120px] shadow-sm flex items-center justify-center font-bold"
                    >
                      <span style={{ fontSize: `${formData.fontLeave || 11}px` }}>
                        ลาพักร้อน (Leave)
                      </span>
                    </div>

                    <div
                      style={{
                        minHeight: `${formData.cardMinHeight || 35}px`,
                        padding: `${formData.cardPadding || 4}px`,
                        borderRadius: `${formData.cardRadius || 6}px`,
                        backgroundColor: formData.eventBg || '#f3e8ff',
                        color: formData.eventText || '#6b21a8',
                        border: '1px solid rgba(0,0,0,0.08)',
                      }}
                      className="flex-1 min-w-[120px] shadow-sm flex items-center justify-center font-bold"
                    >
                      <span style={{ fontSize: `${formData.fontActivity || 11}px` }}>
                        อบรมความปลอดภัย (Training)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FIREBASE CLOUD (WITH PASSWORD SECURITY LOCK) */}
          {activeTab === 'firebase' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 via-amber-50 to-red-50 border-2 border-orange-300 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                    <Icons.Shield size={16} className="text-orange-600" />
                    การตั้งค่า Firebase Cloud Firestore (100% Production Online)
                  </h4>
                  <div className="flex items-center gap-2">
                    {isFirebaseLocked ? (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border border-red-200">
                        🔒 ป้องกันการแก้ไข (Locked)
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border border-emerald-200">
                        🔓 ปลดล็อกแล้ว (Editable)
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-orange-900 leading-relaxed">
                  ฐานข้อมูลจริงบน Google Cloud Firestore พร้อมทำงานอัตโนมัติตลอด 24 ชม. ไม่ต้องติดตั้งเซิร์ฟเวอร์
                  ช่องกรอกถูกล็อกรหัสผ่านเพื่อป้องกันการแก้ไขโดยไม่ได้ตั้งใจ
                </p>

                <div className="pt-2 flex flex-wrap gap-2 items-center">
                  {isFirebaseLocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUnlockTarget('firebase');
                        setUnlockPasswordInput('');
                        setUnlockError('');
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Icons.Lock size={14} /> ปลดล็อกด้วยรหัสผ่านแอดมินเพื่อแก้ไข
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsFirebaseLocked(true)}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                    >
                      <Icons.Check size={14} /> ล็อกการตั้งค่าความปลอดภัยทันที
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={isTestingCloud}
                    onClick={handleTestCloudConnection}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Icons.RefreshCw size={14} className={isTestingCloud ? 'animate-spin' : ''} />
                    {isTestingCloud ? 'กำลังทดสอบเชื่อมต่อ...' : '⚡ ทดสอบการเชื่อมต่อสด'}
                  </button>

                  <button
                    type="button"
                    disabled={isSyncingAll}
                    onClick={handleForceFullSync}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                  >
                    <Icons.Cloud size={14} />
                    {isSyncingAll ? 'กำลังซิงค์...' : '🚀 บังคับซิงค์ข้อมูลทั้งหมดขึ้น Firestore'}
                  </button>
                </div>

                {cloudTestMessage && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      cloudTestMessage.success
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }`}
                  >
                    {cloudTestMessage.success ? <Icons.Check size={16} /> : <Icons.AlertCircle size={16} />}
                    <span>{cloudTestMessage.text}</span>
                  </div>
                )}
              </div>

              {/* Locked / Editable Inputs with Security Masking */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                    {isFirebaseLocked && <span>🔒</span>} Firebase Project ID:
                  </label>
                  <input
                    type={isFirebaseLocked ? "password" : "text"}
                    disabled={isFirebaseLocked}
                    readOnly={isFirebaseLocked}
                    value={isFirebaseLocked ? '••••••••••••••••' : (formData.firebaseProjectId || 'sais-schedule-booking')}
                    onChange={(e) => setFormData({ ...formData, firebaseProjectId: e.target.value })}
                    className={`w-full text-xs p-2.5 rounded-xl border font-mono text-[11px] transition-all ${
                      isFirebaseLocked
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300 select-none tracking-widest'
                        : 'bg-white text-slate-800 font-bold border-blue-400 focus:ring-2 focus:ring-blue-500'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                      {isFirebaseLocked && <span>🔒</span>} API Key:
                    </label>
                    <input
                      type={isFirebaseLocked ? "password" : "text"}
                      disabled={isFirebaseLocked}
                      readOnly={isFirebaseLocked}
                      value={isFirebaseLocked ? '••••••••••••••••••••••••••••••••••••' : (formData.firebaseApiKey || 'AIzaSyBOqWqVBTLdr2se2Ktc5SwjXglb55n69go')}
                      onChange={(e) => setFormData({ ...formData, firebaseApiKey: e.target.value })}
                      className={`w-full text-xs p-2.5 rounded-xl border font-mono text-[11px] transition-all ${
                        isFirebaseLocked
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300 select-none tracking-widest'
                          : 'bg-white text-slate-800 font-bold border-blue-400 focus:ring-2 focus:ring-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                      {isFirebaseLocked && <span>🔒</span>} Auth Domain:
                    </label>
                    <input
                      type={isFirebaseLocked ? "password" : "text"}
                      disabled={isFirebaseLocked}
                      readOnly={isFirebaseLocked}
                      value={isFirebaseLocked ? '••••••••••••••••••••••••••••••••' : (formData.firebaseAuthDomain || 'sais-schedule-booking.firebaseapp.com')}
                      onChange={(e) => setFormData({ ...formData, firebaseAuthDomain: e.target.value })}
                      className={`w-full text-xs p-2.5 rounded-xl border font-mono text-[11px] transition-all ${
                        isFirebaseLocked
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300 select-none tracking-widest'
                          : 'bg-white text-slate-800 font-bold border-blue-400 focus:ring-2 focus:ring-blue-500'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                      {isFirebaseLocked && <span>🔒</span>} Storage Bucket:
                    </label>
                    <input
                      type={isFirebaseLocked ? "password" : "text"}
                      disabled={isFirebaseLocked}
                      readOnly={isFirebaseLocked}
                      value={isFirebaseLocked ? '••••••••••••••••••••••••••••••••' : (formData.firebaseStorageBucket || 'sais-schedule-booking.firebasestorage.app')}
                      onChange={(e) => setFormData({ ...formData, firebaseStorageBucket: e.target.value })}
                      className={`w-full text-xs p-2.5 rounded-xl border font-mono text-[11px] transition-all ${
                        isFirebaseLocked
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300 select-none tracking-widest'
                          : 'bg-white text-slate-800 font-bold border-blue-400 focus:ring-2 focus:ring-blue-500'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                      {isFirebaseLocked && <span>🔒</span>} Messaging Sender ID:
                    </label>
                    <input
                      type={isFirebaseLocked ? "password" : "text"}
                      disabled={isFirebaseLocked}
                      readOnly={isFirebaseLocked}
                      value={isFirebaseLocked ? '••••••••••••' : (formData.firebaseMessagingSenderId || '908596453130')}
                      onChange={(e) =>
                        setFormData({ ...formData, firebaseMessagingSenderId: e.target.value })
                      }
                      className={`w-full text-xs p-2.5 rounded-xl border font-mono text-[11px] transition-all ${
                        isFirebaseLocked
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300 select-none tracking-widest'
                          : 'bg-white text-slate-800 font-bold border-blue-400 focus:ring-2 focus:ring-blue-500'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                    {isFirebaseLocked && <span>🔒</span>} App ID:
                  </label>
                  <input
                    type={isFirebaseLocked ? "password" : "text"}
                    disabled={isFirebaseLocked}
                    readOnly={isFirebaseLocked}
                    value={isFirebaseLocked ? '••••••••••••••••••••••••••••••••••••' : (formData.firebaseAppId || '1:908596453130:web:e34a5769730672a1d6a4f3')}
                    onChange={(e) => setFormData({ ...formData, firebaseAppId: e.target.value })}
                    className={`w-full text-xs p-2.5 rounded-xl border font-mono text-[11px] transition-all ${
                      isFirebaseLocked
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300 select-none tracking-widest'
                        : 'bg-white text-slate-800 font-bold border-blue-400 focus:ring-2 focus:ring-blue-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GOOGLE DRIVE (FOR PDFS & IMAGES STORAGE - PASSWORD PROTECTED) */}
          {activeTab === 'gdrive' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Icons.Cloud size={16} className="text-emerald-600" />
                    การเชื่อมต่อ Google Drive จัดเก็บไฟล์ PDF & รูปภาพ
                  </h4>
                  <div className="flex items-center gap-2">
                    {isGdriveLocked ? (
                      <span className="text-[10px] bg-red-100 text-red-700 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border border-red-200">
                        🔒 ป้องกันการแก้ไข (Locked)
                      </span>
                    ) : (
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold flex items-center gap-1 border border-emerald-200">
                        🔓 ปลดล็อกแล้ว (Editable)
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-emerald-900 leading-relaxed">
                  ระบุ Google Drive Folder ID เพื่อจัดเก็บไฟล์เอกสารแนบ PDF (Open Item List, Floor Plan, Pre-check) และรูปภาพหน้างานทั้งหมดอย่างปลอดภัย
                  ต้องใส่รหัสผ่านผู้ดูแลระบบก่อนดูค่าและแก้ไขเพื่อความปลอดภัยสูงสุด
                </p>

                <div className="pt-2 flex flex-wrap gap-2 items-center">
                  {isGdriveLocked ? (
                    <button
                      type="button"
                      onClick={() => {
                        setUnlockTarget('gdrive');
                        setUnlockPasswordInput('');
                        setUnlockError('');
                      }}
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Icons.Lock size={14} /> ปลดล็อกด้วยรหัสผ่านแอดมินเพื่อแก้ไข
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsGdriveLocked(true)}
                      className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer"
                    >
                      <Icons.Check size={14} /> ล็อกการตั้งค่าความปลอดภัยทันที
                    </button>
                  )}

                  {formData.gdriveRootFolderId && !isGdriveLocked && (
                    <a
                      href={`https://drive.google.com/drive/folders/${formData.gdriveRootFolderId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs active:scale-95 transition-all"
                    >
                      <Icons.ExternalLink size={14} /> เปิดโฟลเดอร์ใน Google Drive
                    </a>
                  )}
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                    {isGdriveLocked && <span>🔒</span>} Google Drive Folder ID (สำหรับจัดเก็บ PDF และรูปภาพ):
                  </label>
                  <input
                    type={isGdriveLocked ? "password" : "text"}
                    disabled={isGdriveLocked}
                    readOnly={isGdriveLocked}
                    value={isGdriveLocked ? '••••••••••••••••••••••••••••••••' : (formData.gdriveRootFolderId || '')}
                    onChange={(e) => setFormData({ ...formData, gdriveRootFolderId: e.target.value.trim() })}
                    placeholder="เช่น 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OIv524"
                    className={`w-full text-xs p-2.5 rounded-xl border font-mono text-[11px] transition-all ${
                      isGdriveLocked
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300 select-none tracking-widest'
                        : 'bg-white text-slate-800 font-bold border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    💡 คัดลอก Folder ID จาก URL ใน Google Drive เช่น drive.google.com/drive/folders/<b>[FOLDER_ID]</b>
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                    {isGdriveLocked && <span>🔒</span>} Google Drive Web URL สำรอง:
                  </label>
                  <input
                    type={isGdriveLocked ? "password" : "text"}
                    disabled={isGdriveLocked}
                    readOnly={isGdriveLocked}
                    value={isGdriveLocked ? '••••••••••••••••••••••••••••••••••••••••' : (formData.gdriveRootFolderUrl || '')}
                    onChange={(e) => setFormData({ ...formData, gdriveRootFolderUrl: e.target.value })}
                    placeholder="https://drive.google.com/drive/folders/..."
                    className={`w-full text-xs p-2.5 rounded-xl border font-mono text-[11px] transition-all ${
                      isGdriveLocked
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300 select-none tracking-widest'
                        : 'bg-white text-slate-800 font-bold border-emerald-500 focus:ring-2 focus:ring-emerald-500'
                    }`}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                    {isGdriveLocked && <span>🔒</span>} โฟลเดอร์เฉพาะสำหรับจัดเก็บ OIL Reports & Checklists (Oil Folder ID):
                  </label>
                  <input
                    type={isGdriveLocked ? "password" : "text"}
                    disabled={isGdriveLocked}
                    readOnly={isGdriveLocked}
                    value={isGdriveLocked ? '••••••••••••••••••••••••••••••••' : (formData.gdriveOilFolderId || '')}
                    onChange={(e) => setFormData({ ...formData, gdriveOilFolderId: e.target.value.trim() })}
                    placeholder="เช่น 1_SAIS_OIL_TRACKING_DOCS_ROOT (เว้นว่างเพื่อใช้ Folder หลัก)"
                    className={`w-full text-xs p-2.5 rounded-xl border font-mono text-[11px] transition-all ${
                      isGdriveLocked
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-300 select-none tracking-widest'
                        : 'bg-white text-slate-800 font-bold border-indigo-500 focus:ring-2 focus:ring-indigo-500'
                    }`}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    📁 ระบุ Folder ID สำหรับแยกจัดเก็บรายงาน Open Item List (OIL) PDF และรายงานผลตรวจสอบลิฟต์โดยเฉพาะ
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                    <input
                      type="checkbox"
                      disabled={isGdriveLocked}
                      checked={formData.gdriveAutoOrganizeByProject ?? true}
                      onChange={(e) =>
                        setFormData({ ...formData, gdriveAutoOrganizeByProject: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600"
                    />
                    <span>สร้างโฟลเดอร์ย่อยแยกตามชื่องาน / รหัสงาน (Auto-categorize by Project)</span>
                  </label>
                </div>

                <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                  <span className="font-bold text-[11px] flex items-center gap-1">
                    <Icons.CheckCircle size={13} className="text-emerald-600" />
                    ประโยชน์ของการเชื่อมต่อ Google Drive:
                  </span>
                  <div className="text-[10px] text-emerald-800 space-y-0.5 pl-3">
                    <div>• ไฟล์ PDF Open Item List, Floor Plan, Pre-check และรูปถ่ายหน้างานจะถูกส่งเข้าโฟลเดอร์นี้โดยตรง</div>
                    <div>• วิศวกรและผู้ตรวจสามารถเปิดดูเอกสารย้อนหลังได้จากตารางคิวตรวจและระบบ Tracking OIL ตลอด 24 ชม.</div>
                    <div>• ป้องกันข้อมูลสูญหายและประหยัดพื้นที่เซิร์ฟเวอร์</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Centered Admin Notice */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-blue-900 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium">
              💡 <span>จัดการรายชื่อผู้ตรวจ, สิทธิ์ และบัญชีผู้ใช้ได้ที่ <b>แผงควบคุมระบบ (Admin Panel)</b> บนแถบเมนูหลัก</span>
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 sm:px-6 py-3 sm:py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            {lang === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
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

        {/* Password Prompt Modal for Unlocking Firebase / GDrive */}
        {unlockTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4 animate-pop border border-slate-200">
              <div className="flex items-center gap-2.5 text-amber-600">
                <div className="p-2 bg-amber-100 rounded-xl">
                  <Icons.Lock size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">
                    ยืนยันรหัสผ่านเพื่อปลดล็อก
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {unlockTarget === 'firebase' ? 'Firebase Cloud Config' : 'Google Drive Config'}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                การตั้งค่าส่วนนี้มีความสำคัญสูงสุดต่อระบบ กรุณากรอกรหัสผ่านผู้ดูแลระบบ (Admin Password) เพื่อดำเนินการแก้ไข
              </p>

              <form onSubmit={handleVerifyUnlock} className="space-y-3">
                <div>
                  <input
                    type="password"
                    autoFocus
                    placeholder="กรอกรหัสผ่าน Admin (เช่น admin123)"
                    value={unlockPasswordInput}
                    onChange={(e) => {
                      setUnlockPasswordInput(e.target.value);
                      setUnlockError('');
                    }}
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-medium focus:ring-2 focus:ring-blue-500"
                  />
                  {unlockError && (
                    <span className="text-[11px] text-red-600 font-bold block mt-1">
                      {unlockError}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setUnlockTarget(null);
                      setUnlockPasswordInput('');
                      setUnlockError('');
                    }}
                    className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-xs"
                  >
                    ปลดล็อก
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
