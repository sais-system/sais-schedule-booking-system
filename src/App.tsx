import React, { useState, useEffect, useMemo, useCallback } from 'react';
import html2canvas from 'html2canvas';
import {
  Booking,
  Inspector,
  User,
  WebSettings,
  SystemNotification,
  SystemLog,
  DayInfo,
} from './types';
import {
  getThaiTime,
  getLocalDateString,
  DEFAULT_SETTINGS,
} from './mockData';
import {
  getStoredUser,
  setStoredUser,
  loadInitialData,
  saveBookingsToStorage,
  saveInspectorsToStorage,
  saveUsersToStorage,
  saveSettingsToStorage,
  saveNotifsToStorage,
  logActivityAction,
} from './storage';
import {
  firestoreSaveBooking,
  firestoreDeleteBooking,
  firestoreSaveInspectors,
  firestoreSaveUsers,
  firestoreSaveSettings,
  subscribeFirebaseBookings,
  subscribeFirebaseInspectors,
  subscribeFirebaseUsers,
  subscribeFirebaseSettings,
  onFirebaseStatusChange,
  seedInitialCloudData,
} from './firebase';
import { Icons } from './components/Icons';
import { CalendarGrid } from './components/CalendarGrid';
import { RealtimeClock } from './components/RealtimeClock';
import { BookingModal } from './components/Modals/BookingModal';
import { DetailModal } from './components/Modals/DetailModal';
import { SpecialModal } from './components/Modals/SpecialModal';
import { AdminCellModal } from './components/Modals/AdminCellModal';
import { UserModal } from './components/Modals/UserModal';
import { InspectorModal } from './components/Modals/InspectorModal';
import { FilePreviewModal } from './components/Modals/FilePreviewModal';
import { AuthModal } from './components/Modals/AuthModal';
import { ActivityModal } from './components/Modals/ActivityModal';
import { TutorialModal } from './components/Modals/TutorialModal';
import { CloudShareModal } from './components/Modals/CloudShareModal';
import { AdminSettingsModal } from './components/Modals/AdminSettingsModal';
import { useTranslation } from './i18n';

export default function App() {
  const { t, lang, setLanguage } = useTranslation();
  
  // 1. Core State (ปลอดภัย: หากไม่มีการเก็บ User หรือกด Logout จะบังคับให้แสดงหน้า Login ทันที)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = getStoredUser();
    // ถ้าไม่มีข้อมูลใน Session หรือถูกสั่ง Logout จะบังคับเป็น null
    return saved || null;
  });

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [settings, setSettings] = useState<WebSettings>(DEFAULT_SETTINGS);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [cloudStatus, setCloudStatus] = useState<'connected' | 'syncing' | 'offline' | 'error'>('connected');
  const [tutorialOpen, setTutorialOpen] = useState(false);

  // Calendar & navigation states
  const [currentDate, setCurrentDate] = useState<Date>(getThaiTime());
  const [period, setPeriod] = useState<number>(getThaiTime().getDate() > 15 ? 1 : 0);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(getThaiTime());
  const [currentView, setCurrentView] = useState<'calendar' | 'search' | 'documents' | 'my_bookings' | 'dashboard' | 'admin'>('calendar');
  const [adminTab, setAdminTab] = useState<'menu' | 'users' | 'inspectors' | 'special' | 'all_bookings' | 'settings'>('menu');
  const [myBookingsTab, setMyBookingsTab] = useState<'pending' | 'approved' | 'completed' | 'leave'>('pending');

  // UI Scales and Zoom
  const [tableFontScale, setTableFontScale] = useState<number>(1.0);
  const [specialFontScale, setSpecialFontScale] = useState<number>(1.0);
  const [columnZoom, setColumnZoom] = useState<number>(1.0);

  // Modals and dialogs
  const [modal, setModal] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(!currentUser); // แสดงหน้า Login ทันทีถ้ายังไม่ล็อกอิน
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);
  const [viewFileUrl, setViewFileUrl] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ msg: string | React.ReactNode; onConfirm: () => void } | null>(null);
  const [successModal, setSuccessModal] = useState<string | React.ReactNode | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [quickAddType, setQuickAddType] = useState<string>('job');

  // Drag & drop states
  const [isDragging, setIsDragging] = useState(false);
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [draggingTask, setDraggingTask] = useState<Booking | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [searchFilterArea, setSearchFilterArea] = useState('All');
  const [searchInspector, setSearchInspector] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Dashboard filters
  const [dashYear, setDashYear] = useState(getThaiTime().getFullYear().toString());
  const [dashMonth, setDashMonth] = useState((getThaiTime().getMonth() + 1).toString());
  const [dashArea, setDashArea] = useState('All');
  const [dashJobType, setDashJobType] = useState('All');

  // Month-Year Picker
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState<number>(getThaiTime().getFullYear());

  // Cloud Share Modal & Quick Calendar Filters
  const [cloudShareOpen, setCloudShareOpen] = useState(false);
  const [calFilterProduct, setCalFilterProduct] = useState<string>('All');
  const [calFilterJobType, setCalFilterJobType] = useState<string>('All');

  const isAdmin = currentUser?.role === 'admin';

  // 2. Initialize data on mount and subscribe to Firebase Firestore 100%
  useEffect(() => {
    const data = loadInitialData();
    setBookings(data.bookings);
    setInspectors(data.inspectors);
    setUsers(data.users);
    setSettings(data.settings);
    setNotifications(data.notifications);
    setLogs(data.logs);

    const unsubStatus = onFirebaseStatusChange((status) => {
      setCloudStatus(status);
    });

    const unsubBookings = subscribeFirebaseBookings((cloudBookings) => {
      if (cloudBookings && cloudBookings.length > 0) {
        setBookings(cloudBookings);
        saveBookingsToStorage(cloudBookings);
        setLastSyncTime(getThaiTime());
      }
    });

    const unsubInspectors = subscribeFirebaseInspectors((cloudInspectors) => {
      if (cloudInspectors && cloudInspectors.length > 0) {
        setInspectors(cloudInspectors);
        saveInspectorsToStorage(cloudInspectors);
      }
    });

    const unsubUsers = subscribeFirebaseUsers((cloudUsers) => {
      if (cloudUsers && cloudUsers.length > 0) {
        setUsers(cloudUsers);
        saveUsersToStorage(cloudUsers);
      }
    });

    const unsubSettings = subscribeFirebaseSettings((cloudSettings) => {
      if (cloudSettings) {
        setSettings(cloudSettings);
        saveSettingsToStorage(cloudSettings);
      }
    });

    return () => {
      unsubStatus();
      unsubBookings();
      unsubInspectors();
      unsubUsers();
      unsubSettings();
    };
  }, []);

  // Auto-dismiss success popup
  useEffect(() => {
    if (successModal) {
      const t = setTimeout(() => setSuccessModal(null), 3500);
      return () => clearTimeout(t);
    }
  }, [successModal]);

  const logSystem = useCallback(
    (action: string, details: string) => {
      const updated = logActivityAction(action, details, currentUser?.username || 'system', logs);
      setLogs(updated);
    },
    [currentUser, logs]
  );

  const changePeriod = (dir: 'prev' | 'next') => {
    if (dir === 'next') {
      if (period === 0) setPeriod(1);
      else {
        setPeriod(0);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
      }
    } else {
      if (period === 1) setPeriod(0);
      else {
        setPeriod(1);
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
      }
    }
  };

  const jumpToToday = () => {
    const now = getThaiTime();
    setCurrentDate(now);
    setPeriod(now.getDate() <= 15 ? 0 : 1);
    if (currentView !== 'calendar') setCurrentView('calendar');
  };

  const calendarDisplayBookings = useMemo(() => {
    if (calFilterProduct === 'All' && calFilterJobType === 'All') return bookings;
    return bookings.filter((b) => {
      if (calFilterProduct !== 'All' && b.product_line !== calFilterProduct) return false;
      if (calFilterJobType !== 'All' && b.job_type !== calFilterJobType) return false;
      return true;
    });
  }, [bookings, calFilterProduct, calFilterJobType]);

  const daysInView: DayInfo[] = useMemo(() => {
    const days: DayInfo[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const start = period === 0 ? 1 : 16;
    const end = period === 0 ? 15 : lastDay;

    const todayStr = getLocalDateString(getThaiTime());

    for (let i = 0; i < 16; i++) {
      const d = start + i;
      if (d <= end) {
        const dateObj = new Date(year, month, d);
        const dateStr = getLocalDateString(dateObj);
        const globalHolidays = bookings.filter(
          (b) => b.date === dateStr && b.inspector_name === 'SYSTEM_HOLIDAY' && b.status !== 'cancelled'
        );
        const globalEvents = bookings.filter(
          (b) => b.date === dateStr && b.inspector_name === 'SYSTEM_EVENT' && b.status !== 'cancelled'
        );

        days.push({
          full: dateStr,
          day: d,
          weekday: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
          isSunday: dateObj.getDay() === 0,
          isGlobalHoliday: globalHolidays.length > 0 || dateObj.getDay() === 0,
          globalHolidays,
          isGlobalEvent: globalEvents.length > 0,
          globalEvents,
          isToday: dateStr === todayStr,
          isEmpty: false,
        });
      } else {
        days.push({
          full: '',
          day: 0,
          weekday: '',
          isSunday: false,
          isGlobalHoliday: false,
          globalHolidays: [],
          isGlobalEvent: false,
          globalEvents: [],
          isToday: false,
          isEmpty: true,
        });
      }
    }
    return days;
  }, [currentDate, period, bookings]);

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('taskId', taskId);
    const found = bookings.find((b) => b.id === taskId);
    if (found) setDraggingTask(found);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsTrashHovered(false);
    setDraggingTask(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-50', 'border-2', 'border-blue-400', 'border-dashed');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('bg-blue-50', 'border-2', 'border-blue-400', 'border-dashed');
  };

  const handleDrop = (e: React.DragEvent, targetDate: string, targetInspector: string) => {
    e.preventDefault();
    e.currentTarget.classList.remove('bg-blue-50', 'border-2', 'border-blue-400', 'border-dashed');

    if (!isAdmin) {
      setAlertMsg('เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถลากย้ายคิวงานได้ครับ');
      return;
    }

    const taskId = e.dataTransfer.getData('taskId');
    const task = draggingTask || bookings.find((b) => b.id === taskId);
    if (!task) return;

    if (task.date === targetDate && task.inspector_name === targetInspector) {
      setDraggingTask(null);
      return;
    }

    setConfirmDialog({
      msg: (
        <div className="text-left space-y-2">
          <div className="text-sm font-bold text-slate-800 text-center bg-slate-100 p-2 rounded-xl">
            {task.site_name || task.equipment_no}
          </div>
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">เลื่อนวันที่:</span>
              <span className="font-bold text-blue-600">
                {task.date} ➡️ {targetDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ย้ายผู้ตรวจ:</span>
              <span className="font-bold text-indigo-600">
                {task.inspector_name} ➡️ {targetInspector}
              </span>
            </div>
          </div>
        </div>
      ),
      onConfirm: () => {
        setConfirmDialog(null);
        const updatedTask = { ...task, date: targetDate, inspector_name: targetInspector };
        const updated = bookings.map((b) => (b.id === task.id ? updatedTask : b));
        setBookings(updated);
        saveBookingsToStorage(updated);
        firestoreSaveBooking(updatedTask);
        logSystem('MOVE BOOKING', `ย้าย ${task.site_name} ไปวันที่ ${targetDate} ผู้ตรวจ ${targetInspector}`);
        setSuccessModal('ย้ายคิวงานสำเร็จเรียบร้อย');
      },
    });
  };

  const handleTrashDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setIsTrashHovered(false);

    if (!isAdmin) return;
    const taskId = e.dataTransfer.getData('taskId');
    const task = draggingTask || bookings.find((b) => b.id === taskId);
    if (!task) return;

    setConfirmDialog({
      msg: `คุณต้องการลบรายการ "${task.site_name || task.equipment_no}" ลงถังขยะใช่หรือไม่?`,
      onConfirm: () => {
        setConfirmDialog(null);
        const updated = bookings.filter((b) => b.id !== task.id);
        setBookings(updated);
        saveBookingsToStorage(updated);
        firestoreDeleteBooking(task.id);
        logSystem('DELETE VIA TRASH', `ลบรายการ ${task.site_name || task.equipment_no}`);
        setSuccessModal('ลบรายการลงถังขยะสำเร็จ');
      },
    });
  };

  const handleUpdateSingleBooking = (updatedBooking: Booking) => {
    const updated = bookings.map((b) => (b.id === updatedBooking.id ? updatedBooking : b));
    setBookings(updated);
    saveBookingsToStorage(updated);
    firestoreSaveBooking(updatedBooking);
    logSystem('UPDATE BOOKING DOCS', `อัปเดตเอกสารงาน: ${updatedBooking.site_name || updatedBooking.equipment_no}`);
    setSuccessModal('บันทึกและซิงค์เอกสารขึ้นคลาวด์เรียบร้อย');
  };

  const handleSaveBooking = (formData: Partial<Booking>) => {
    if (settings.systemMaintenanceMode && !isAdmin) {
      setAlertMsg('ระบบอยู่ในโหมดปิดปรับปรุงชั่วคราว (Maintenance Mode) ไม่สามารถบันทึกคิวตรวจได้ในขณะนี้');
      return;
    }

    let updated: Booking[];
    let targetBooking: Booking;
    if (formData.id) {
      const existing = bookings.find((b) => b.id === formData.id);
      targetBooking = { ...existing, ...formData } as Booking;
      updated = bookings.map((b) => (b.id === formData.id ? targetBooking : b));
      logSystem('UPDATE BOOKING', `แก้ไขคิวงาน: ${formData.site_name} (${formData.date})`);
      setSuccessModal('แก้ไขคิวงานสำเร็จ');
    } else {
      targetBooking = {
        ...formData,
        id: 'book-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        created_by: currentUser?.username || 'somchai',
        status: 'active',
      } as Booking;
      updated = [targetBooking, ...bookings];
      logSystem('CREATE BOOKING', `จองคิวงานใหม่: ${targetBooking.site_name} (${targetBooking.date})`);
      setSuccessModal('จองคิวงานสำเร็จ');
    }
    setBookings(updated);
    saveBookingsToStorage(updated);
    firestoreSaveBooking(targetBooking);
    setLastSyncTime(getThaiTime());
    setModal(null);
  };

  const handleDeleteBooking = (booking: Booking) => {
    setConfirmDialog({
      msg: `ยืนยันการลบรายการ "${booking.site_name || booking.equipment_no}" ใช่หรือไม่?`,
      onConfirm: () => {
        setConfirmDialog(null);
        setModal(null);
        const updated = bookings.filter((b) => b.id !== booking.id);
        setBookings(updated);
        saveBookingsToStorage(updated);
        firestoreDeleteBooking(booking.id);
        logSystem('DELETE BOOKING', `ลบรายการ: ${booking.site_name || booking.equipment_no}`);
        setSuccessModal('ลบข้อมูลสำเร็จ');
      },
    });
  };

  const handleVerifyDocument = (bookingId: string, docKey: 'layout_doc' | 'wiring_doc' | 'precheck_doc', isChecked: boolean) => {
    if (!isAdmin) return;
    const val = isChecked ? 'verified' : 'true';
    const statusVal = isChecked ? 'verified' : 'pending';
    const statusKey = docKey === 'layout_doc' ? 'layout_status' : docKey === 'wiring_doc' ? 'wiring_status' : 'precheck_status';
    
    const found = bookings.find((b) => b.id === bookingId);
    if (!found) return;
    const updatedBooking = { ...found, [docKey]: val, [statusKey]: statusVal };
    const updated = bookings.map((b) => (b.id === bookingId ? updatedBooking : b));
    setBookings(updated);
    saveBookingsToStorage(updated);
    firestoreSaveBooking(updatedBooking);
    setSuccessModal(isChecked ? 'ยืนยันการตรวจสอบเอกสารเรียบร้อย' : 'ปรับสถานะเป็นรอตรวจสอบ');
  };

  const handleAddSpecial = (
    specialType: 'leave' | 'company_event' | 'public_holiday',
    dates: string[],
    targetInspectors: string[],
    title: string,
    color = '#22c55e'
  ) => {
    const newItems: Booking[] = [];
    dates.forEach((d) => {
      targetInspectors.forEach((inspector) => {
        let eq = `SPECIAL_${Date.now()}`;
        if (specialType === 'leave') eq = `LEAVE_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        if (specialType === 'company_event') eq = `EVENT_${Date.now()}_${color}`;
        if (specialType === 'public_holiday') eq = `HLD_${Date.now()}`;

        newItems.push({
          id: 'sp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          date: d,
          inspector_name: inspector,
          job_type: specialType,
          site_name: title,
          equipment_no: eq,
          status: 'active',
          created_by: currentUser?.username || 'admin',
        });
      });
    });

    const updated = [...newItems, ...bookings];
    setBookings(updated);
    saveBookingsToStorage(updated);
    newItems.forEach((item) => firestoreSaveBooking(item));
    setSuccessModal(`เพิ่ม ${title} สำเร็จ (${newItems.length} รายการ)`);
  };

  const handleBulkDelete = (ids: string[]) => {
    setConfirmDialog({
      msg: `ยืนยันการลบรายการที่เลือกทั้งหมด ${ids.length} รายการ?`,
      onConfirm: () => {
        setConfirmDialog(null);
        const updated = bookings.filter((b) => !ids.includes(b.id));
        setBookings(updated);
        saveBookingsToStorage(updated);
        ids.forEach((id) => firestoreDeleteBooking(id));
        setSuccessModal(`ลบสำเร็จ ${ids.length} รายการ`);
      },
    });
  };

  const handleExportJPG = () => {
    setShowSettings(false);
    setCurrentView('calendar');
    setLoadingMsg('กำลังสร้างและปรับความคมชัดภาพตาราง...');
    setIsExporting(true);

    setTimeout(() => {
      const targetNode = document.getElementById('calendar-export-area');
      if (targetNode) {
        html2canvas(targetNode, {
          scale: 1.5,
          useCORS: true,
          backgroundColor: '#f8fafc',
          windowWidth: targetNode.scrollWidth,
          windowHeight: targetNode.scrollHeight,
        })
          .then((canvas) => {
            const link = document.createElement('a');
            link.download = `SAIS_Schedule_${currentDate.getFullYear()}_${currentDate.getMonth() + 1}_P${period + 1}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
            setIsExporting(false);
            setLoadingMsg(null);
            setSuccessModal('บันทึกรูปภาพตารางสำเร็จ');
          })
          .catch(() => {
            setIsExporting(false);
            setLoadingMsg(null);
            setAlertMsg('เกิดข้อผิดพลาดในการบันทึกภาพ');
          });
      } else {
        setIsExporting(false);
        setLoadingMsg(null);
        setAlertMsg('ไม่พบตารางข้อมูล');
      }
    }, 800);
  };

  // Auth functions (ปลอดภัย: ล้าง Session ทันทีเมื่อกดออกจากระบบ)
  const handleLogin = (u: User) => {
    setCurrentUser(u);
    setStoredUser(u);
    setShowAuthModal(false);
    logSystem('LOGIN', `ผู้ใช้ ${u.username} เข้าสู่ระบบ`);
  };

  const handleRegister = (u: User) => {
    const updatedUsers = [...users, u];
    setUsers(updatedUsers);
    saveUsersToStorage(updatedUsers);
    logSystem('REGISTER', `ผู้ใช้ ${u.username} สมัครสมาชิก`);
  };

  const handleResetPassword = (name: string, phone: string, newPass: string) => {
    const idx = users.findIndex(
      (u) => u.full_name.trim() === name.trim() && u.phone?.trim() === phone.trim()
    );
    if (idx !== -1) {
      const updated = [...users];
      updated[idx] = { ...updated[idx], password: newPass };
      setUsers(updated);
      saveUsersToStorage(updated);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setConfirmDialog({
      msg: 'คุณต้องการออกจากระบบ SAIS ใช่หรือไม่?',
      onConfirm: () => {
        setConfirmDialog(null);
        // ล้างข้อมูลผู้ใช้ทั้งหมดออกจาก Session และ LocalStorage ทันที
        setCurrentUser(null);
        setStoredUser(null);
        localStorage.removeItem('sais_current_user');
        setShowAuthModal(true);
      },
    });
  };

  return (
    <div
      className="app-container"
      style={
        {
          '--app-bg': settings.appBg || '#f8fafc',
          '--header-bg': settings.headerBg || '#1e293b',
          '--header-text': settings.headerText || '#ffffff',
          '--table-header-bg': settings.tableHeaderBg || '#1e293b',
          '--table-header-text': settings.tableHeaderText || '#ffffff',
          '--table-border': settings.tableBorder || '#cbd5e1',
          '--card-radius': `${settings.cardRadius || 6}px`,
          '--card-padding': `${settings.cardPadding || 4}px`,
        } as React.CSSProperties
      }
    >
      {/* Drag Trash Dropzone */}
      <div
        className={`trash-dropzone ${isDragging ? 'visible' : ''} ${isTrashHovered ? 'hovered' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsTrashHovered(true);
        }}
        onDragLeave={() => setIsTrashHovered(false)}
        onDrop={handleTrashDrop}
      >
        <Icons.AnimatedTrash isHovered={isTrashHovered} />
        <span className="trash-text">{isTrashHovered ? 'ปล่อยเพื่อลบทิ้ง!' : 'ลากมาทิ้งที่นี่'}</span>
      </div>

      {/* Main Header */}
      <header className="main-header">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-red-600 text-white font-black flex items-center justify-center text-sm shadow-md">
            S
          </div>
          <div>
            <h1 className="text-sm md:text-base font-bold tracking-tight leading-tight">
              {settings.appName || 'SAIS BOOKING'}
            </h1>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-slate-300 font-medium flex items-center gap-0.5">
                <Icons.Flame size={11} className="text-amber-400" />
                Firebase 100% Realtime Cloud
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 relative">
          <button
            type="button"
            onClick={() => setCloudShareOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-blue-400/40"
          >
            <Icons.Cloud size={15} />
            <span className="hidden sm:inline">แชร์ลิงก์</span>
          </button>

          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-amber-400/40"
          >
            <Icons.GraduationCap size={15} />
            <span className="hidden sm:inline">คู่มือ</span>
          </button>

          <button
            type="button"
            onClick={() => setLanguage(lang === 'th' ? 'en' : 'th')}
            className="px-2 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 border border-white/15 transition-all active:scale-95"
          >
            <Icons.Languages size={14} className="text-blue-300" />
            <span className="font-mono text-[11px] font-bold">{lang === 'th' ? '🇹🇭 TH' : '🇬🇧 EN'}</span>
          </button>

          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Icons.Settings />
          </button>

          {showSettings && (
            <div className="settings-menu animate-pop w-[270px] max-h-[80vh] overflow-y-auto custom-scrollbar">
              <h4 className="text-xs font-bold border-b border-slate-200 pb-2 mb-3 text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Icons.Settings /> {t.systemSettings}
                </span>
                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">v2.0</span>
              </h4>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setShowAdminSettingsModal(true);
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-slate-900 to-blue-900 text-white text-xs font-bold rounded-xl flex items-center justify-between gap-1.5 mb-2 shadow-sm"
                >
                  <span className="flex items-center gap-1.5">
                    <Icons.Shield /> Super Admin Console
                  </span>
                  <span className="text-[10px] bg-blue-500/80 px-2 py-0.5 rounded text-white font-mono">PRO</span>
                </button>
              )}

              <button
                onClick={handleExportJPG}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl mb-3 shadow-sm flex items-center justify-center gap-1.5"
              >
                <Icons.Download /> บันทึกตารางหน้านี้ (JPG)
              </button>
            </div>
          )}

          <button
            onClick={() => setShowActivityModal(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors relative"
          >
            <Icons.Bell />
            {notifications.length > 0 && <span className="notif-dot animate-pulse"></span>}
          </button>

          {currentUser ? (
            <div className="text-xs font-bold bg-white/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <Icons.User />
              <span className="truncate max-w-[90px]">{currentUser.username}</span>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm"
            >
              <Icons.User /> เข้าสู่ระบบ
            </button>
          )}
        </div>
      </header>

      {/* Main Views Container */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {settings.showSystemAnnouncement && settings.systemAnnouncement && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs shrink-0 z-30">
            <div className="flex items-center gap-2 overflow-hidden">
              <Icons.Bell size={14} className="shrink-0" />
              <span className="truncate">{settings.systemAnnouncement}</span>
            </div>
          </div>
        )}

        {/* VIEW 1: CALENDAR */}
        {currentView === 'calendar' && (
          <div className="grid-container relative overflow-hidden pb-16">
            <div className="nav-bar bg-white px-3 py-2 border-b flex-shrink-0 z-20 flex justify-between items-center shadow-xs">
              <button
                onClick={() => changePeriod('prev')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                <Icons.ChevronLeft /> ย้อนกลับ
              </button>
              <div
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="text-center font-bold text-slate-800 text-sm flex items-center gap-1 cursor-pointer px-3 py-1 rounded-xl"
              >
                {period === 0 ? '1-15 ' : `16-${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()} `}
                {currentDate.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}
              </div>
              <button
                onClick={() => changePeriod('next')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1"
              >
                ถัดไป <Icons.ChevronRight />
              </button>
            </div>

            <div className="grid-wrapper">
              <CalendarGrid
                daysInView={daysInView}
                inspectors={inspectors}
                settings={settings}
                isAdmin={isAdmin}
                user={currentUser}
                setModal={setModal}
                setAlertMsg={setAlertMsg}
                setQuickAddType={setQuickAddType}
                handleDrop={handleDrop}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDragStart={handleDragStart}
                handleDragEnd={handleDragEnd}
                filteredBookings={calendarDisplayBookings}
                tableFontScale={tableFontScale}
                specialFontScale={specialFontScale}
                columnZoom={columnZoom}
                isExporting={isExporting}
              />
            </div>
            <RealtimeClock lastSyncTime={lastSyncTime} />
          </div>
        )}

        {/* VIEW 2: SEARCH */}
        {currentView === 'search' && (
          <div className="page-view pb-24 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
            <div className="sticky top-0 bg-slate-100 z-10 pb-3 pt-1">
              <h2 className="text-lg font-bold text-slate-800 mb-2">ค้นหางานตรวจ</h2>
            </div>
          </div>
        )}

        {/* VIEW 3: DOCUMENTS */}
        {currentView === 'documents' && isAdmin && (
          <div className="page-view pb-24 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
            <h2 className="text-lg font-bold text-slate-800 mb-2">ตรวจสอบเอกสาร</h2>
          </div>
        )}

        {/* VIEW 4: MY BOOKINGS */}
        {currentView === 'my_bookings' && !isAdmin && (
          <div className="page-view pb-24 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
            <h2 className="text-lg font-bold text-slate-800 mb-2">งานของฉัน</h2>
          </div>
        )}

        {/* VIEW 5: DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="page-view pb-24 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
            <h2 className="text-lg font-bold text-slate-800 mb-2">สถิติระบบ</h2>
          </div>
        )}

        {/* VIEW 6: ADMIN */}
        {currentView === 'admin' && isAdmin && (
          <div className="page-view pb-24 overflow-y-auto max-h-[calc(100vh-120px)] custom-scrollbar">
            <h2 className="text-lg font-bold text-slate-800 mb-2">แผงควบคุมแอดมิน</h2>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div className={`nav-item ${currentView === 'calendar' ? 'active' : ''}`} onClick={() => setCurrentView('calendar')}>
          <Icons.Home />
          <span>ปฏิทิน</span>
        </div>
        <div className={`nav-item ${currentView === 'search' ? 'active' : ''}`} onClick={() => setCurrentView('search')}>
          <Icons.Search />
          <span>ค้นหา</span>
        </div>
        {isAdmin && (
          <div className={`nav-item ${currentView === 'documents' ? 'active' : ''}`} onClick={() => setCurrentView('documents')}>
            <Icons.FileCheck />
            <span>ตรวจเอกสาร</span>
          </div>
        )}
        {currentUser && !isAdmin && currentUser.role !== 'viewer' && (
          <div className={`nav-item ${currentView === 'my_bookings' ? 'active' : ''}`} onClick={() => setCurrentView('my_bookings')}>
            <Icons.List />
            <span>งานฉัน</span>
          </div>
        )}
        <div className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>
          <Icons.Chart />
          <span>สถิติ</span>
        </div>
        {isAdmin && (
          <div className={`nav-item ${currentView === 'admin' ? 'active' : ''}`} onClick={() => { setCurrentView('admin'); setAdminTab('menu'); }}>
            <Icons.Shield />
            <span>จัดการ</span>
          </div>
        )}
        {currentUser && (
          <div className="nav-item text-red-500 hover:text-red-600" onClick={handleLogout}>
            <Icons.LogOut />
            <span>ออกระบบ</span>
          </div>
        )}
      </nav>

      {/* MODALS (หุ้มด้วย Overflow-y-auto เพื่อให้เลื่อนดูได้บนมือถือทุกหน้าต่าง) */}
      {modal?.type === 'booking' && (
        <div className="backdrop z-[100] p-4 flex items-center justify-center overflow-y-auto">
          <BookingModal
            data={modal.data}
            inspectors={inspectors}
            isAdmin={isAdmin}
            user={currentUser}
            onClose={() => setModal(null)}
            onSubmit={handleSaveBooking}
            onViewFile={(url) => setViewFileUrl(url)}
            setAlertMsg={setAlertMsg}
          />
        </div>
      )}

      {modal?.type === 'detail' && (
        <div className="backdrop z-[100] p-4 flex items-center justify-center overflow-y-auto">
          <DetailModal
            booking={modal.data}
            isAdmin={isAdmin}
            user={currentUser}
            onClose={() => setModal(null)}
            onEdit={() => setModal({ type: 'booking', data: modal.data })}
            onDelete={() => handleDeleteBooking(modal.data)}
            onViewFile={(url) => setViewFileUrl(url)}
            onUpdateBooking={(updated) => {
              handleUpdateSingleBooking(updated);
              setModal({ type: 'detail', data: updated });
            }}
          />
        </div>
      )}

      {modal?.type === 'admin_cell_action' && (
        <div className="backdrop z-[100] p-4 flex items-center justify-center overflow-y-auto">
          <AdminCellModal
            data={modal.data}
            onClose={() => setModal(null)}
            onBook={() => setModal({ type: 'booking', data: modal.data })}
            onAddEvent={() => setModal({ type: 'special_modal', specialType: 'events' })}
            onAddLeave={() => setModal({ type: 'special_modal', specialType: 'leaves' })}
            onAddHoliday={() => setModal({ type: 'special_modal', specialType: 'holidays' })}
          />
        </div>
      )}

      {modal?.type === 'special_modal' && (
        <div className="backdrop z-[100] p-4 flex items-center justify-center overflow-y-auto">
          <SpecialModal
            type={modal.specialType}
            inspectors={inspectors}
            bookings={bookings}
            user={currentUser}
            onClose={() => setModal(null)}
            onAddSpecial={handleAddSpecial}
            onDeleteBooking={handleDeleteBooking}
            onBulkDelete={handleBulkDelete}
            setAlertMsg={setAlertMsg}
          />
        </div>
      )}

      {modal?.type === 'user_modal' && (
        <div className="backdrop z-[100] p-4 flex items-center justify-center overflow-y-auto">
          <UserModal
            user={modal.data}
            isNew={modal.isNew}
            inspectors={inspectors}
            existingUsers={users}
            onClose={() => setModal(null)}
            onSave={(updatedUser) => {
              let nextUsers: User[];
              if (modal.isNew) {
                nextUsers = [...users, updatedUser];
              } else {
                nextUsers = users.map((u) => (u.username === updatedUser.username ? updatedUser : u));
              }
              setUsers(nextUsers);
              saveUsersToStorage(nextUsers);
              firestoreSaveUsers(nextUsers);
              setSuccessModal('บันทึกข้อมูลผู้ใช้เรียบร้อย');
              setModal(null);
            }}
            setAlertMsg={setAlertMsg}
          />
        </div>
      )}

      {modal?.type === 'inspector_modal' && (
        <div className="backdrop z-[100] p-4 flex items-center justify-center overflow-y-auto">
          <InspectorModal
            inspector={modal.data}
            onClose={() => setModal(null)}
            onSave={(name, productLines, oldName) => {
              let nextInspectors: Inspector[];
              if (oldName) {
                nextInspectors = inspectors.map((i) => (i.name === oldName ? { name, product_lines: productLines } : i));
              } else {
                nextInspectors = [...inspectors, { name, product_lines: productLines }];
              }
              setInspectors(nextInspectors);
              saveInspectorsToStorage(nextInspectors);
              firestoreSaveInspectors(nextInspectors);
              setSuccessModal('บันทึกข้อมูลผู้ตรวจเรียบร้อย');
              setModal(null);
            }}
            setAlertMsg={setAlertMsg}
          />
        </div>
      )}

      {viewFileUrl && <FilePreviewModal url={viewFileUrl} onClose={() => setViewFileUrl(null)} />}

      {/* ปลอดภัย: บังคับแสดงหน้า Login ทันทีหากยังไม่ได้เข้าสู่ระบบ */}
      {showAuthModal && (
        <div className="backdrop z-[250] p-4 flex items-center justify-center overflow-y-auto">
          <AuthModal
            users={users}
            onLogin={handleLogin}
            onRegister={handleRegister}
            onResetPassword={handleResetPassword}
            onClose={() => {
              // ถ้ายังไม่ได้ล็อกอิน ห้ามปิดหน้าต่าง Auth
              if (currentUser) setShowAuthModal(false);
            }}
            setAlertMsg={setAlertMsg}
            setSuccessModal={setSuccessModal}
          />
        </div>
      )}

      {showActivityModal && (
        <div className="backdrop z-[500] p-4 flex items-center justify-center overflow-y-auto">
          <ActivityModal
            logs={logs}
            notifications={notifications}
            user={currentUser}
            onClose={() => setShowActivityModal(false)}
            onMarkRead={(id) => {
              const updated = notifications.map((n) => (n.id === id ? { ...n, isRead: 'true' } : n));
              setNotifications(updated);
              saveNotifsToStorage(updated);
            }}
          />
        </div>
      )}

      {/* Alert Dialog */}
      {alertMsg && (
        <div className="backdrop z-[600] p-4 flex items-center justify-center overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl animate-pop">
            <h3 className="text-base font-bold text-slate-800 mb-1.5">แจ้งเตือน</h3>
            <p className="text-xs text-slate-600 mb-5 whitespace-pre-line leading-relaxed">{alertMsg}</p>
            <button onClick={() => setAlertMsg(null)} className="w-full py-3 bg-slate-800 text-white font-bold rounded-xl text-xs">
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="backdrop z-[600] p-4 flex items-center justify-center overflow-y-auto">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-pop text-center">
            <h3 className="text-base font-bold text-slate-800 mb-2">ยืนยันการทำรายการ</h3>
            <div className="text-xs text-slate-600 mb-5 whitespace-pre-line leading-relaxed">{confirmDialog.msg}</div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs">
                ยกเลิก
              </button>
              <button onClick={confirmDialog.onConfirm} className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl text-xs shadow-md">
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {successModal && (
        <div className="fixed inset-0 z-[700] flex items-center justify-center pointer-events-none p-4">
          <div className="bg-white w-[85%] max-w-[280px] rounded-3xl p-5 text-center shadow-2xl animate-pop border-4 border-emerald-400">
            <div className="mx-auto w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mb-2.5">
              <Icons.Check />
            </div>
            <div className="text-sm font-bold text-slate-800">{successModal}</div>
          </div>
        </div>
      )}

      {loadingMsg && (
        <div className="backdrop z-[800] gap-3">
          <Icons.Loader />
          <span className="text-white font-bold text-xs bg-slate-900/70 px-4 py-2 rounded-full border border-slate-700">
            {loadingMsg}
          </span>
        </div>
      )}

      {tutorialOpen && (
        <div className="backdrop z-[100] p-4 flex items-center justify-center overflow-y-auto">
          <TutorialModal
            lang={lang}
            onClose={() => setTutorialOpen(false)}
            onStartBookingDemo={() => {
              setTutorialOpen(false);
              setModal({ type: 'booking', data: null });
            }}
          />
        </div>
      )}

      {cloudShareOpen && (
        <div className="backdrop z-[100] p-4 flex items-center justify-center overflow-y-auto">
          <CloudShareModal
            onClose={() => setCloudShareOpen(false)}
            cloudStatus={cloudStatus}
            onForceSync={async () => {
              await seedInitialCloudData();
              setSuccessModal('ซิงค์ข้อมูล Cloud Firestore สำเร็จแล้ว 100%');
            }}
          />
        </div>
      )}

      {showAdminSettingsModal && (
        <div className="backdrop z-[500] p-4 flex items-center justify-center overflow-y-auto">
          <AdminSettingsModal
            settings={settings}
            inspectors={inspectors}
            users={users}
            bookings={bookings}
            onClose={() => setShowAdminSettingsModal(false)}
            onSaveSettings={(newSettings) => {
              setSettings(newSettings);
              saveSettingsToStorage(newSettings);
              firestoreSaveSettings(newSettings);
            }}
            onSaveInspectors={(newInspectors) => {
              setInspectors(newInspectors);
              saveInspectorsToStorage(newInspectors);
              firestoreSaveInspectors(newInspectors);
            }}
            onSaveUsers={(newUsers) => {
              setUsers(newUsers);
              saveUsersToStorage(newUsers);
              firestoreSaveUsers(newUsers);
            }}
            onOpenCloudSync={() => {
              setShowAdminSettingsModal(false);
              setCloudShareOpen(true);
            }}
            setAlertMsg={setAlertMsg}
          />
        </div>
      )}
    </div>
  );
}
