import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  // 1. Core State
  const [currentUser, setCurrentUser] = useState<User | null>(getStoredUser);
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
  const [tableFontScale, setTableFontScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sais_table_font_scale');
      return saved ? parseFloat(saved) : 1.0;
    } catch (e) {
      return 1.0;
    }
  });
  const [specialFontScale, setSpecialFontScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sais_special_font_scale');
      return saved ? parseFloat(saved) : 1.0;
    } catch (e) {
      return 1.0;
    }
  });
  const [columnZoom, setColumnZoom] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('sais_column_zoom');
      return saved ? parseFloat(saved) : 1.0;
    } catch (e) {
      return 1.0;
    }
  });

  // Modals and dialogs
  const [modal, setModal] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdminSettingsModal, setShowAdminSettingsModal] = useState(false);
  const [viewFileUrl, setViewFileUrl] = useState<string | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ msg: string | React.ReactNode; onConfirm: () => void } | null>(null);
  const [promptDialog, setPromptDialog] = useState<{ msg: string; onSubmit: (val: string) => void } | null>(null);
  const [successModal, setSuccessModal] = useState<string | React.ReactNode | null>(null);
  const [loadingMsg, setLoadingMsg] = useState<string | null>(null);
  const [quickAddType, setQuickAddType] = useState<string>('job');

  // Drag & drop states
  const [isDragging, setIsDragging] = useState(false);
  const [isTrashHovered, setIsTrashHovered] = useState(false);
  const [draggingTask, setDraggingTask] = useState<Booking | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Filters for search and dashboard
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
    // A. Local storage immediate cache load
    const data = loadInitialData();
    setBookings(data.bookings);
    setInspectors(data.inspectors);
    setUsers(data.users);
    setSettings(data.settings);
    setNotifications(data.notifications);
    setLogs(data.logs);

    // B. Realtime Cloud Firestore listeners
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

  // Save UI scale settings
  useEffect(() => {
    localStorage.setItem('sais_table_font_scale', tableFontScale.toString());
  }, [tableFontScale]);
  useEffect(() => {
    localStorage.setItem('sais_special_font_scale', specialFontScale.toString());
  }, [specialFontScale]);
  useEffect(() => {
    localStorage.setItem('sais_column_zoom', columnZoom.toString());
  }, [columnZoom]);

  // Auto-dismiss success popup
  useEffect(() => {
    if (successModal) {
      const t = setTimeout(() => setSuccessModal(null), 3500);
      return () => clearTimeout(t);
    }
  }, [successModal]);

  // Deep-link auto open when opened via direct job link (?bookingId=...)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const bookingId = params.get('bookingId');
      if (bookingId && bookings.length > 0) {
        const matched = bookings.find((b) => b.id === bookingId);
        if (matched) {
          setModal({ type: 'detail', data: matched });
        }
      }
    } catch {
      // ignore
    }
  }, [bookings]);

  // Helper log action
  const logSystem = useCallback(
    (action: string, details: string) => {
      const updated = logActivityAction(action, details, currentUser?.username || 'system', logs);
      setLogs(updated);
    },
    [currentUser, logs]
  );

  // Month navigation
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

  // Jump to Today
  const jumpToToday = () => {
    const now = getThaiTime();
    setCurrentDate(now);
    setPeriod(now.getDate() <= 15 ? 0 : 1);
    if (currentView !== 'calendar') setCurrentView('calendar');
  };

  // Filtered bookings for Calendar view
  const calendarDisplayBookings = useMemo(() => {
    if (calFilterProduct === 'All' && calFilterJobType === 'All') return bookings;
    return bookings.filter((b) => {
      if (calFilterProduct !== 'All' && b.product_line !== calFilterProduct) return false;
      if (calFilterJobType !== 'All' && b.job_type !== calFilterJobType) return false;
      return true;
    });
  }, [bookings, calFilterProduct, calFilterJobType]);

  // Global keyboard shortcuts for fast power navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.key === 't' || e.key === 'T') {
        jumpToToday();
      } else if (e.key === 'ArrowLeft') {
        if (currentView === 'calendar') changePeriod('prev');
      } else if (e.key === 'ArrowRight') {
        if (currentView === 'calendar') changePeriod('next');
      } else if (e.key === '/') {
        e.preventDefault();
        setCurrentView('search');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, period, currentDate]);

  // Generate days in current period view
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

  // Unread notifications
  const unreadNotifs = useMemo(() => {
    return notifications.filter((n) => {
      const isTargeted = !n.target || n.target === currentUser?.username || (isAdmin && n.target === 'ALL_ADMIN');
      return isTargeted && String(n.isRead) !== 'true';
    });
  }, [notifications, currentUser, isAdmin]);

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
        const updated = bookings.map((b) =>
          b.id === task.id ? updatedTask : b
        );
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

  // Update Single Booking from Scanner or Quick Action
  const handleUpdateSingleBooking = (updatedBooking: Booking) => {
    const updated = bookings.map((b) => (b.id === updatedBooking.id ? updatedBooking : b));
    setBookings(updated);
    saveBookingsToStorage(updated);
    firestoreSaveBooking(updatedBooking);
    logSystem('UPDATE BOOKING DOCS', `อัปเดตเอกสารงาน: ${updatedBooking.site_name || updatedBooking.equipment_no}`);
    setSuccessModal('บันทึกและซิงค์เอกสารขึ้นคลาวด์เรียบร้อย');
  };

  // Booking Save (New or Edit)
  const handleSaveBooking = (formData: Partial<Booking>) => {
    // Check maintenance mode
    if (settings.systemMaintenanceMode && !isAdmin) {
      setAlertMsg('ระบบอยู่ในโหมดปิดปรับปรุงชั่วคราว (Maintenance Mode) ไม่สามารถบันทึกคิวตรวจได้ในขณะนี้');
      return;
    }

    // Check inspector quota per day
    if (!formData.id && formData.inspector_name && formData.date && settings.maxDailyBookingsPerInspector) {
      const existingCount = bookings.filter(
        (b) =>
          b.inspector_name === formData.inspector_name &&
          b.date === formData.date &&
          !String(b.job_type).includes('leave') &&
          !String(b.job_type).includes('event') &&
          !String(b.job_type).includes('holiday')
      ).length;

      if (existingCount >= settings.maxDailyBookingsPerInspector && !isAdmin) {
        setAlertMsg(
          `ผู้ตรวจ "${formData.inspector_name}" มีคิวงานเต็มโควตาวันนี้แล้ว (${existingCount}/${settings.maxDailyBookingsPerInspector} งาน) กรุณาเลือกผู้ตรวจท่านอื่นหรือวันอื่น`
        );
        return;
      }
    }

    let updated: Booking[];
    let targetBooking: Booking;
    if (formData.id) {
      // Edit existing
      const existing = bookings.find((b) => b.id === formData.id);
      targetBooking = { ...existing, ...formData } as Booking;
      updated = bookings.map((b) => (b.id === formData.id ? targetBooking : b));
      logSystem('UPDATE BOOKING', `แก้ไขคิวงาน: ${formData.site_name} (${formData.date})`);
      setSuccessModal('แก้ไขคิวงานสำเร็จ');
    } else {
      // Create new
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

  // Delete Booking
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

  // Document verification toggle
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
    logSystem('VERIFY DOC', `อัปเดตเอกสาร ${docKey} เป็น ${isChecked ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบ'}`);
    setSuccessModal(isChecked ? 'ยืนยันการตรวจสอบเอกสารเรียบร้อย (ตรวจสอบแล้ว)' : 'ปรับสถานะเอกสารเป็น (รอตรวจสอบ)');
  };

  // Add special events / leaves / holidays
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
    logSystem(`ADD ${specialType.toUpperCase()}`, `เพิ่ม ${title} จำนวน ${newItems.length} รายการ`);
    setSuccessModal(`เพิ่ม ${title} สำเร็จ (${newItems.length} รายการ)`);
  };

  // Bulk Delete
  const handleBulkDelete = (ids: string[]) => {
    setConfirmDialog({
      msg: `ยืนยันการลบรายการที่เลือกทั้งหมด ${ids.length} รายการ?`,
      onConfirm: () => {
        setConfirmDialog(null);
        const updated = bookings.filter((b) => !ids.includes(b.id));
        setBookings(updated);
        saveBookingsToStorage(updated);
        ids.forEach((id) => firestoreDeleteBooking(id));
        logSystem('BULK DELETE', `ลบข้อมูลจำนวน ${ids.length} รายการ`);
        setSuccessModal(`ลบสำเร็จ ${ids.length} รายการ`);
      },
    });
  };

  // Export calendar to JPG
  const handleExportJPG = () => {
    setShowSettings(false);
    setCurrentView('calendar');
    setLoadingMsg('กำลังสร้างและปรับความคมชัดภาพตาราง... (รอสักครู่)');
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

  // Auth functions
  const handleLogin = (u: User) => {
    setCurrentUser(u);
    setStoredUser(u);
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
      logSystem('RESET PASSWORD', `รีเซ็ตรหัสผ่านสำหรับ ${updated[idx].username}`);
      return true;
    }
    return false;
  };

  const handleLogout = () => {
    setConfirmDialog({
      msg: 'คุณต้องการออกจากระบบ SAIS ใช่หรือไม่?',
      onConfirm: () => {
        setConfirmDialog(null);
        setCurrentUser(null);
        setStoredUser(null);
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
      {/* Trash Dropzone for Drag-to-delete */}
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
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  cloudStatus === 'connected'
                    ? 'bg-emerald-400'
                    : cloudStatus === 'syncing'
                    ? 'bg-amber-400 animate-spin'
                    : 'bg-slate-400'
                }`}
              ></span>
              <span className="text-slate-300 font-medium flex items-center gap-0.5">
                <Icons.Flame size={11} className="text-amber-400" />
                Firebase 100%{' '}
                {cloudStatus === 'connected'
                  ? 'Realtime Cloud'
                  : cloudStatus === 'syncing'
                  ? 'กำลังซิงค์...'
                  : 'ออฟไลน์'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 relative">
          {/* Cloud & Share Direct URL Button */}
          <button
            type="button"
            onClick={() => setCloudShareOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-blue-400/40"
            title={lang === 'th' ? 'ศูนย์แชร์ลิงก์ & คลาวด์อัตโนมัติ' : 'Live Cloud & Share URL'}
          >
            <Icons.Cloud size={15} />
            <span className="hidden sm:inline">{lang === 'th' ? 'แชร์ลิงก์' : 'Share'}</span>
          </button>

          {/* Tutorial Simulation & Handbook Button (FEATURE 4) */}
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-all active:scale-95 border border-amber-400/40"
            title={t.tutorialButton}
          >
            <Icons.GraduationCap size={15} />
            <span className="hidden sm:inline">{t.tutorialButton}</span>
          </button>

          {/* Language Switcher (FEATURE 3) */}
          <button
            type="button"
            onClick={() => setLanguage(lang === 'th' ? 'en' : 'th')}
            className="px-2 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center gap-1.5 border border-white/15 transition-all active:scale-95"
            title={lang === 'th' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย'}
          >
            <Icons.Languages size={14} className="text-blue-300" />
            <span className="font-mono text-[11px] font-bold">
              {lang === 'th' ? '🇹🇭 TH' : '🇬🇧 EN'}
            </span>
          </button>

          {/* Settings Menu Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title={t.systemSettings}
          >
            <Icons.Settings />
          </button>

          {showSettings && (
            <div className="settings-menu animate-pop w-[270px] max-h-[80vh] overflow-y-auto custom-scrollbar">
              <h4 className="text-xs font-bold border-b border-slate-200 pb-2 mb-3 text-slate-800 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Icons.Settings /> {t.systemSettings}
                </span>
                <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                  v2.0 Cloud
                </span>
              </h4>

              {/* Cloud Share & Live URL Launcher in Settings */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setShowSettings(false);
                    setShowAdminSettingsModal(true);
                  }}
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-slate-900 to-blue-900 hover:from-slate-800 hover:to-blue-800 text-white text-xs font-bold rounded-xl flex items-center justify-between gap-1.5 mb-2 shadow-sm transition-all"
                >
                  <span className="flex items-center gap-1.5">
                    <Icons.Shield />
                    {lang === 'th' ? 'ศูนย์ควบคุม Admin (Super)' : 'Super Admin Console'}
                  </span>
                  <span className="text-[10px] bg-blue-500/80 px-2 py-0.5 rounded text-white font-mono">
                    PRO
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  setCloudShareOpen(true);
                }}
                className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 text-xs font-bold rounded-xl flex items-center justify-between gap-1.5 mb-2 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Icons.Cloud size={15} className="text-blue-600" />
                  {lang === 'th' ? 'ศูนย์แชร์ลิงก์ & คลาวด์' : 'Live Cloud & Share URL'}
                </span>
                <span className="text-[10px] bg-blue-200/80 px-1.5 py-0.5 rounded text-blue-800">
                  เปิดดู
                </span>
              </button>

              {/* Direct Download ZIP in Settings */}
              <a
                href="/sais-schedule-booking-source.zip"
                download="sais-schedule-booking-source.zip"
                onClick={() => setShowSettings(false)}
                className="w-full py-2 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 text-xs font-bold rounded-xl flex items-center justify-between gap-1.5 mb-2.5 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Icons.Download size={15} className="text-purple-600" />
                  {lang === 'th' ? 'ดาวน์โหลดโค้ด (.ZIP)' : 'Download Code (.ZIP)'}
                </span>
                <span className="text-[10px] bg-purple-200/80 px-1.5 py-0.5 rounded text-purple-800 font-mono">
                  .ZIP
                </span>
              </a>

              {/* Tutorial Quick Launcher in Settings */}
              <button
                type="button"
                onClick={() => {
                  setShowSettings(false);
                  setTutorialOpen(true);
                }}
                className="w-full py-2 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded-xl flex items-center justify-between gap-1.5 mb-2.5 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Icons.GraduationCap size={15} className="text-amber-600" /> {t.tutorialModalTitle}
                </span>
                <span className="text-[10px] bg-amber-200/80 px-1.5 py-0.5 rounded text-amber-800">
                  เปิดดู
                </span>
              </button>

              {/* Language Switcher in Settings */}
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 mb-2.5 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <Icons.Languages size={14} className="text-blue-600" /> {t.language}:
                </span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setLanguage('th')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      lang === 'th'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    🇹🇭 TH
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage('en')}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
                      lang === 'en'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200'
                    }`}
                  >
                    🇬🇧 EN
                  </button>
                </div>
              </div>

              {/* Cloud Sync Status in Menu */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-3 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Icons.Cloud size={13} className="text-blue-500" /> สถานะคลาวด์:
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] ${
                      cloudStatus === 'connected'
                        ? 'bg-emerald-100 text-emerald-800'
                        : cloudStatus === 'syncing'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {cloudStatus === 'connected' ? '🟢 เชื่อมต่อแล้ว 100%' : '🟡 กำลังซิงค์'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    setLoadingMsg('กำลังซิงค์ข้อมูลกับ Firebase Firestore...');
                    await seedInitialCloudData();
                    setLoadingMsg(null);
                    setSuccessModal('ซิงค์ข้อมูล Cloud Firestore 100% สำเร็จ');
                  }}
                  className="w-full py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <Icons.RefreshCw size={11} /> บังคับซิงค์คลาวด์ทันที
                </button>
              </div>

              <button
                onClick={handleExportJPG}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl mb-3 shadow-sm flex items-center justify-center gap-1.5"
              >
                <Icons.Download /> บันทึกตารางหน้านี้ (JPG)
              </button>

              <div className="space-y-3 text-xs border-t border-slate-100 pt-2">
                <div>
                  <div className="text-[10px] font-bold text-slate-500 mb-1">ความกว้างตาราง (คอลัมน์)</div>
                  <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setColumnZoom((prev) => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm"
                    >
                      -
                    </button>
                    <span className="font-bold text-blue-600">{(columnZoom * 100).toFixed(0)}%</span>
                    <button
                      onClick={() => setColumnZoom((prev) => Math.min(2.5, Math.round((prev + 0.1) * 10) / 10))}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-500 mb-1">ขนาดฟอนต์ปกติ</div>
                  <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setTableFontScale((prev) => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm"
                    >
                      -
                    </button>
                    <span className="font-bold text-blue-600">{(tableFontScale * 100).toFixed(0)}%</span>
                    <button
                      onClick={() => setTableFontScale((prev) => Math.min(2.5, Math.round((prev + 0.1) * 10) / 10))}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-bold text-slate-500 mb-1">ขนาดฟอนต์ ลา/หยุด/กิจกรรม</div>
                  <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setSpecialFontScale((prev) => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm"
                    >
                      -
                    </button>
                    <span className="font-bold text-blue-600">{(specialFontScale * 100).toFixed(0)}%</span>
                    <button
                      onClick={() => setSpecialFontScale((prev) => Math.min(2.5, Math.round((prev + 0.1) * 10) / 10))}
                      className="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setColumnZoom(1.0);
                    setTableFontScale(1.0);
                    setSpecialFontScale(1.0);
                  }}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition-colors"
                >
                  ↺ คืนค่าขนาดเริ่มต้น
                </button>
              </div>
            </div>
          )}

          {/* Notifications Button */}
          <button
            onClick={() => setShowActivityModal(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors relative"
            title="การแจ้งเตือน"
          >
            <Icons.Bell />
            {unreadNotifs.length > 0 && <span className="notif-dot animate-pulse"></span>}
          </button>

          {/* User badge */}
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
        {/* Global Announcement Banner if enabled */}
        {settings.showSystemAnnouncement && settings.systemAnnouncement && (
          <div className="bg-amber-500 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-xs shrink-0 z-30">
            <div className="flex items-center gap-2 overflow-hidden">
              <Icons.Bell size={14} className="shrink-0" />
              <span className="truncate">{settings.systemAnnouncement}</span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono shrink-0">
              ประกาศส่วนกลาง
            </span>
          </div>
        )}
        {/* VIEW 1: CALENDAR */}
        {currentView === 'calendar' && (
          <div className="grid-container relative overflow-hidden pb-16">
            <div className="nav-bar bg-white px-3 py-2 border-b flex-shrink-0 z-20 flex justify-between items-center shadow-xs">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => changePeriod('prev')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 transition-colors"
                  title="ปุ่มลัด: ลูกศรซ้าย ←"
                >
                  <Icons.ChevronLeft /> ย้อนกลับ
                </button>
                <button
                  onClick={jumpToToday}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
                  title="ปุ่มลัด: กดปุ่ม T บนคีย์บอร์ด"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  วันนี้ (Today)
                </button>
              </div>

              <div
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="text-center font-bold text-slate-800 text-sm flex items-center gap-1 cursor-pointer hover:bg-slate-50 px-3 py-1 rounded-xl border border-transparent hover:border-slate-200 transition-all"
              >
                {period === 0
                  ? '1-15 '
                  : `16-${new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()} `}
                {currentDate.toLocaleDateString('th-TH', { month: 'short', year: 'numeric' })}
                <span className="text-slate-400 text-xs ml-1">▼</span>
              </div>

              <button
                onClick={() => changePeriod('next')}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 transition-colors"
                title="ปุ่มลัด: ลูกศรขวา →"
              >
                ถัดไป <Icons.ChevronRight />
              </button>
            </div>

            {/* Quick Filter Strip for Product Line */}
            <div className="bg-slate-50/90 px-3 py-1.5 border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto text-xs">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                  โมเดล:
                </span>
                {['All', 'ES1', '3300', '5500', 'S-villas', 'ES2'].map((prod) => (
                  <button
                    key={prod}
                    type="button"
                    onClick={() => setCalFilterProduct(prod)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all ${
                      calFilterProduct === prod
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {prod === 'All' ? 'ทั้งหมด' : prod}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 shrink-0 text-[10px] text-slate-500 font-mono">
                {calendarDisplayBookings.filter((b) => b.status !== 'cancelled').length} งาน
              </div>
            </div>

            {/* Month-Year Jump Picker */}
            {showMonthPicker && (
              <div className="absolute top-[48px] left-0 right-0 bg-white border-b border-slate-200 p-4 z-40 shadow-xl animate-pop">
                <div className="flex justify-between items-center mb-3 px-2">
                  <button
                    onClick={() => setPickerYear((p) => p - 1)}
                    className="p-2 bg-slate-100 rounded-lg text-slate-600 font-bold"
                  >
                    <Icons.ChevronLeft />
                  </button>
                  <span className="font-bold text-base text-red-600">ปี {pickerYear + 543}</span>
                  <button
                    onClick={() => setPickerYear((p) => p + 1)}
                    className="p-2 bg-slate-100 rounded-lg text-slate-600 font-bold"
                  >
                    <Icons.ChevronRight />
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'].map(
                    (m, idx) => (
                      <button
                        key={m}
                        onClick={() => {
                          setCurrentDate(new Date(pickerYear, idx, 1));
                          setPeriod(0);
                          setShowMonthPicker(false);
                        }}
                        className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                          currentDate.getMonth() === idx && currentDate.getFullYear() === pickerYear
                            ? 'bg-red-600 text-white border-red-600 shadow-sm'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m}
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Calendar Table Grid */}
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
          <div className="page-view pb-24">
            <div className="sticky top-0 bg-slate-100 z-10 pb-3 pt-1">
              <div className="flex justify-between items-center mb-3 gap-2">
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap">
                  <Icons.Search /> ค้นหางานตรวจ
                </h2>
                <div className="flex gap-2">
                  <select
                    value={searchFilterArea}
                    onChange={(e) => setSearchFilterArea(e.target.value)}
                    className="text-xs p-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 outline-none shadow-xs"
                  >
                    <option value="All">ทุกพื้นที่</option>
                    <option value="กรุงเทพและปริมณฑล">กทม. และปริมณฑล</option>
                    <option value="ภูเก็ต">ภูเก็ต</option>
                    <option value="เชียงใหม่">เชียงใหม่</option>
                  </select>

                  <select
                    value={searchInspector}
                    onChange={(e) => setSearchInspector(e.target.value)}
                    className="text-xs p-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 outline-none shadow-xs"
                  >
                    <option value="All">ทุกผู้ตรวจ</option>
                    {inspectors.map((ins) => (
                      <option key={ins.name} value={ins.name}>
                        {ins.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center bg-white border border-slate-300 rounded-2xl px-3 py-2.5 shadow-sm">
                <span className="text-slate-400 mr-2">
                  <Icons.Search />
                </span>
                <input
                  type="text"
                  placeholder="พิมพ์ Equipment No., ชื่อโครงการ, หรือคำค้น..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-0 outline-none text-xs font-bold text-slate-700"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="text-slate-400 p-1 hover:text-slate-600">
                    <Icons.X />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2.5 mt-2">
              {(() => {
                const results = bookings
                  .filter((b) => {
                    if (b.status === 'cancelled') return false;
                    if (b.job_type === 'public_holiday' || b.job_type === 'company_event' || b.job_type === 'leave')
                      return false;

                    const matchArea = searchFilterArea === 'All' ? true : b.area === searchFilterArea;
                    const matchIns = searchInspector === 'All' ? true : b.inspector_name === searchInspector;
                    const s = searchQuery.toLowerCase().trim();
                    const matchText =
                      !s ||
                      (b.equipment_no && b.equipment_no.toLowerCase().includes(s)) ||
                      (b.site_name && b.site_name.toLowerCase().includes(s)) ||
                      (b.inspector_name && b.inspector_name.toLowerCase().includes(s));

                    return matchArea && matchIns && matchText;
                  })
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                if (results.length === 0) {
                  return (
                    <div className="text-center text-xs text-slate-400 py-12 bg-white rounded-2xl border-2 border-dashed">
                      ไม่พบคิวงานที่ตรงกับเงื่อนไขการค้นหา
                    </div>
                  );
                }

                return results.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setModal({ type: 'detail', data: item })}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-slate-900 truncate pr-2">{item.site_name}</span>
                      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-100 whitespace-nowrap">
                        {item.date}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Eq No.</span>
                        <span className="font-bold text-slate-800">{item.equipment_no || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">ผู้ตรวจ</span>
                        <span className="font-bold text-blue-600">{item.inspector_name || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Product Line</span>
                        <span className="font-bold text-slate-800">{item.product_line || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">พื้นที่</span>
                        <span className="font-bold text-slate-800">{item.area || '-'}</span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* VIEW 3: DOCUMENTS (Admin Only) */}
        {currentView === 'documents' && isAdmin && (
          <div className="page-view pb-24">
            <div className="sticky top-0 bg-slate-100 z-10 pb-3 pt-1 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Icons.FileCheck /> ตรวจสอบเอกสารประกอบคิวงาน (รอตรวจสอบ / ตรวจสอบแล้ว)
              </h2>
              <p className="text-[11px] text-slate-500">
                ตรวจสอบเอกสาร Layout, Wiring และ Pre-check ที่ถูกส่งขึ้น Google Drive พร้อมปุ่มเปิดดูและสลับสถานะ
              </p>
            </div>

            <div className="space-y-3 mt-3">
              {(() => {
                const jobList = bookings
                  .filter(
                    (b) =>
                      b.status !== 'cancelled' &&
                      b.job_type !== 'leave' &&
                      b.job_type !== 'company_event' &&
                      b.job_type !== 'public_holiday'
                  )
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                if (jobList.length === 0) {
                  return (
                    <div className="text-center text-xs text-slate-400 py-12 bg-white rounded-2xl border-2 border-dashed">
                      ไม่มีรายการงานตรวจ
                    </div>
                  );
                }

                return jobList.slice(0, 30).map((job) => {
                  const l_ok = String(job.layout_doc) === 'true';
                  const w_ok = String(job.wiring_doc) === 'true';
                  const p_ok = String(job.precheck_doc) === 'true';
                  const all_ok = l_ok && w_ok && p_ok;

                  return (
                    <div
                      key={job.id}
                      className={`p-4 rounded-2xl bg-white shadow-sm border-2 transition-all ${
                        all_ok ? 'border-emerald-200 bg-emerald-50/20' : 'border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                        <div
                          onClick={() => setModal({ type: 'detail', data: job })}
                          className="cursor-pointer hover:text-blue-600"
                        >
                          <div className="font-bold text-xs text-slate-800">
                            {job.equipment_no} <span className="text-slate-400 font-normal">/ {job.unit_no}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[220px]">{job.site_name}</div>
                        </div>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-md">
                          {job.date}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {(['layout', 'wiring', 'precheck'] as const).map((docKey) => {
                          const docProp = `${docKey}_doc` as const;
                          const rawStatus = job[`${docKey}_status` as keyof Booking] as string | undefined;
                          const rawDocFlag = String(job[docProp]);
                          const isVerified = rawStatus === 'verified' || rawDocFlag === 'verified';
                          const fileUrl = job[`${docKey}_img` as keyof Booking] as string | undefined;
                          const fileName = job[`${docKey}_filename` as keyof Booking] as string | undefined;

                          return (
                            <div
                              key={docKey}
                              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 ${
                                isVerified
                                  ? 'bg-emerald-50/80 border-emerald-300'
                                  : fileUrl
                                  ? 'bg-amber-50/70 border-amber-300'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <span className="text-[10px] font-bold uppercase text-slate-700">{docKey}</span>
                              <label className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isVerified}
                                  onChange={(e) => handleVerifyDocument(job.id, docProp, e.target.checked)}
                                  className="w-3.5 h-3.5 accent-emerald-600 rounded"
                                />
                                <span className={`text-[10px] font-bold ${isVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                                  {isVerified ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบ'}
                                </span>
                              </label>

                              {fileName && (
                                <span className="text-[8px] text-slate-500 truncate max-w-full" title={fileName}>
                                  {fileName}
                                </span>
                              )}

                              {fileUrl && (
                                <button
                                  onClick={() => setViewFileUrl(fileUrl)}
                                  className="mt-1 text-[9px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-0.5 rounded-md w-full shadow-xs flex items-center justify-center gap-1"
                                >
                                  <Icons.Eye size={10} /> ดูเอกสาร
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

        {/* VIEW 4: MY BOOKINGS (For Users & Inspectors) */}
        {currentView === 'my_bookings' && !isAdmin && (
          <div className="page-view pb-24">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Icons.List /> {currentUser?.role === 'inspector' ? 'คิวงานตรวจของฉัน' : 'งานที่ฉันจองไว้'}
              </h2>
              {currentUser?.role === 'inspector' && (
                <button
                  onClick={() =>
                    setModal({
                      type: 'special_modal',
                      specialType: 'leaves',
                    })
                  }
                  className="text-xs bg-amber-50 text-amber-700 font-bold px-3 py-1.5 rounded-xl border border-amber-200 shadow-xs flex items-center gap-1"
                >
                  <Icons.Plus /> แจ้งวันลา
                </button>
              )}
            </div>

            <div className="flex gap-1.5 mb-3 bg-slate-200/70 p-1 rounded-xl">
              <button
                onClick={() => setMyBookingsTab('pending')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  myBookingsTab === 'pending' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                ⏳ รอดำเนินการ
              </button>
              <button
                onClick={() => setMyBookingsTab('approved')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  myBookingsTab === 'approved' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600'
                }`}
              >
                ✅ อนุมัติแล้ว
              </button>
              <button
                onClick={() => setMyBookingsTab('completed')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  myBookingsTab === 'completed' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600'
                }`}
              >
                🗄️ ประวัติ
              </button>
            </div>

            <div className="space-y-2.5">
              {(() => {
                const todayStr = getLocalDateString(getThaiTime());
                const isInspector = currentUser?.role === 'inspector';
                const mappedName = currentUser?.inspector_mapped_name || currentUser?.full_name || currentUser?.username;

                const myJobs = bookings
                  .filter((b) => {
                    if (b.status === 'cancelled') return false;
                    if (b.job_type === 'public_holiday' || b.job_type === 'company_event') return false;

                    if (isInspector) {
                      const match =
                        b.inspector_name?.toLowerCase() === mappedName?.toLowerCase() ||
                        b.inspector_name?.toLowerCase() === currentUser?.username.toLowerCase();
                      if (!match) return false;
                    } else {
                      if (b.created_by !== currentUser?.username) return false;
                    }

                    const isAllApproved =
                      String(b.layout_doc) === 'true' &&
                      String(b.wiring_doc) === 'true' &&
                      String(b.precheck_doc) === 'true';
                    const isPast = b.date < todayStr;

                    if (myBookingsTab === 'completed') return isPast;
                    if (myBookingsTab === 'approved') return isAllApproved && !isPast;
                    return !isAllApproved && !isPast;
                  })
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                if (myJobs.length === 0) {
                  return (
                    <div className="text-center text-xs text-slate-400 py-12 bg-white rounded-2xl border-2 border-dashed">
                      ไม่มีรายการในหมวดหมู่นี้
                    </div>
                  );
                }

                return myJobs.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setModal({ type: 'detail', data: item })}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-400 transition-all space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-xs text-slate-900 truncate pr-2">{item.site_name}</span>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {item.date}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-xl">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Eq No.</span>
                        <span className="font-bold text-slate-800">{item.equipment_no || '-'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">ผู้ตรวจ</span>
                        <span className="font-bold text-blue-600">{item.inspector_name || '-'}</span>
                      </div>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* VIEW 5: DASHBOARD */}
        {currentView === 'dashboard' && (
          <div className="page-view pb-24 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Icons.PieChart /> ภาพรวมระบบและสถิติ (Dashboard)
              </h2>
              <p className="text-[11px] text-slate-500">วิเคราะห์ข้อมูลการตรวจ คุณภาพเอกสาร และสถิติต่างๆ</p>
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">ปี (Year)</label>
                <select
                  value={dashYear}
                  onChange={(e) => setDashYear(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none"
                >
                  <option value="All">ทุกปี</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">เดือน (Month)</label>
                <select
                  value={dashMonth}
                  onChange={(e) => setDashMonth(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none"
                >
                  <option value="All">ทุกเดือน</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m.toString()}>
                      เดือน {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">พื้นที่ (Area)</label>
                <select
                  value={dashArea}
                  onChange={(e) => setDashArea(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none"
                >
                  <option value="All">ทุกพื้นที่</option>
                  <option value="กรุงเทพและปริมณฑล">กทม. และปริมณฑล</option>
                  <option value="ภูเก็ต">ภูเก็ต</option>
                  <option value="เชียงใหม่">เชียงใหม่</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 block mb-1">ประเภทงาน</label>
                <select
                  value={dashJobType}
                  onChange={(e) => setDashJobType(e.target.value)}
                  className="w-full p-2 rounded-xl border border-slate-300 bg-slate-50 font-bold outline-none"
                >
                  <option value="All">ทุกประเภท</option>
                  <option value="New">New</option>
                  <option value="MOD">MOD</option>
                  <option value="Re-ins temporary power supply">Re-ins temporary</option>
                  <option value="Re-ins builder lift">Re-ins builder lift</option>
                </select>
              </div>
            </div>

            {/* Calculations */}
            {(() => {
              const activeTasks = bookings.filter((b) => {
                if (b.status === 'cancelled') return false;
                if (b.job_type === 'leave' || b.job_type === 'company_event' || b.job_type === 'public_holiday')
                  return false;

                const d = new Date(b.date);
                if (isNaN(d.getTime())) return false;

                if (dashYear !== 'All' && d.getFullYear().toString() !== dashYear) return false;
                if (dashMonth !== 'All' && (d.getMonth() + 1).toString() !== dashMonth) return false;
                if (dashArea !== 'All' && b.area !== dashArea) return false;
                if (dashJobType !== 'All' && b.job_type !== dashJobType) return false;

                return true;
              });

              const totalCount = activeTasks.length;
              const completeDocCount = activeTasks.filter(
                (t) =>
                  String(t.layout_doc) === 'true' &&
                  String(t.wiring_doc) === 'true' &&
                  String(t.precheck_doc) === 'true'
              ).length;
              const passRate = totalCount > 0 ? Math.round((completeDocCount / totalCount) * 100) : 0;

              // Top inspectors
              const inspectorCounts: Record<string, number> = {};
              activeTasks.forEach((t) => {
                inspectorCounts[t.inspector_name] = (inspectorCounts[t.inspector_name] || 0) + 1;
              });
              const sortedInspectors = inspectors
                .map((ins) => ({ name: ins.name, count: inspectorCounts[ins.name] || 0 }))
                .sort((a, b) => b.count - a.count);

              // Job types
              const typeCounts: Record<string, number> = {};
              activeTasks.forEach((t) => {
                const jt = t.job_type || 'อื่นๆ';
                typeCounts[jt] = (typeCounts[jt] || 0) + 1;
              });

              return (
                <div className="space-y-3.5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-4 rounded-3xl shadow-sm">
                      <span className="text-[10px] font-bold text-blue-100 block mb-1">คิวงานตามเงื่อนไข</span>
                      <div className="text-3xl font-black">
                        {totalCount} <span className="text-xs font-normal opacity-80">งาน</span>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-4 rounded-3xl shadow-sm">
                      <span className="text-[10px] font-bold text-emerald-100 block mb-1">อัตราเอกสารครบถ้วน</span>
                      <div className="text-3xl font-black">{passRate}%</div>
                      <span className="text-[10px] text-emerald-100 opacity-80 mt-1 block">
                        ({completeDocCount} / {totalCount} งาน)
                      </span>
                    </div>
                  </div>

                  {/* Inspector Leaderboard */}
                  <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Icons.Award /> สถิติจำนวนงานแยกตามผู้ตรวจ
                    </h3>
                    <div className="space-y-2">
                      {sortedInspectors.map((ins, i) => (
                        <div
                          key={ins.name}
                          className="flex items-center justify-between p-2.5 bg-slate-50 rounded-2xl border border-slate-100"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center">
                              {i + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-700">{ins.name}</span>
                          </div>
                          <span className="text-xs font-black text-blue-600 bg-white px-2.5 py-1 rounded-xl border border-slate-200">
                            {ins.count} คิว
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Job Type Breakdown */}
                  <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Icons.Chart /> สัดส่วนประเภทงานตรวจ
                    </h3>
                    <div className="space-y-2.5">
                      {Object.entries(typeCounts).map(([type, cnt]) => {
                        const pct = totalCount > 0 ? Math.round((cnt / totalCount) * 100) : 0;
                        return (
                          <div key={type} className="space-y-1">
                            <div className="flex justify-between text-xs font-bold text-slate-700">
                              <span>{type}</span>
                              <span>
                                {cnt} งาน ({pct}%)
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                              <div className="bg-blue-600 h-full rounded-full" style={{ width: `${pct}%` }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* VIEW 6: ADMIN PANEL */}
        {currentView === 'admin' && isAdmin && (
          <div className="page-view pb-24 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Icons.Shield /> แผงควบคุมระบบ (Admin Panel)
              </h2>
              {adminTab !== 'menu' && (
                <button
                  onClick={() => setAdminTab('menu')}
                  className="text-xs bg-white text-slate-600 px-3 py-1.5 rounded-xl border border-slate-200 font-bold shadow-xs hover:bg-slate-50"
                >
                  <Icons.ChevronLeft /> กลับเมนูหลัก
                </button>
              )}
            </div>

            {adminTab === 'menu' && (
              <div className="grid grid-cols-2 gap-3 animate-pop">
                <button
                  onClick={() => setAdminTab('users')}
                  className="p-4 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center gap-2.5 hover:border-blue-400 transition-all text-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icons.User />
                  </div>
                  <span className="font-bold text-xs text-slate-800">จัดการผู้ใช้งาน ({users.length})</span>
                </button>

                <button
                  onClick={() => setAdminTab('inspectors')}
                  className="p-4 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center gap-2.5 hover:border-indigo-400 transition-all text-center"
                >
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Icons.FileCheck />
                  </div>
                  <span className="font-bold text-xs text-slate-800">ผู้ตรวจ & Certificate ({inspectors.length})</span>
                </button>

                <button
                  onClick={() => setAdminTab('special')}
                  className="p-4 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center gap-2.5 hover:border-amber-400 transition-all text-center col-span-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Icons.Clock />
                  </div>
                  <span className="font-bold text-xs text-slate-800">จัดการวันกิจกรรม / วันลา / วันหยุดบริษัท</span>
                </button>

                <button
                  onClick={() => setShowAdminSettingsModal(true)}
                  className="p-4 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 text-white rounded-3xl shadow-md border border-blue-400/30 flex flex-col items-center gap-2.5 hover:scale-[1.02] transition-all text-center col-span-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30">
                    <Icons.Shield />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-white block">
                      ศูนย์ควบคุมระบบชั้นสูง (Super Admin Console)
                    </span>
                    <span className="text-[10px] text-blue-300">
                      ตั้งค่า Google Drive (15GB), ผู้ตรวจ 10 คน, โควตางาน, และระบบความจุ 300-500 คน
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setAdminTab('settings')}
                  className="p-4 bg-white rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center gap-2.5 hover:border-pink-400 transition-all text-center col-span-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center">
                    <Icons.Settings />
                  </div>
                  <span className="font-bold text-xs text-slate-800">ปรับแต่งสีและหน้าตาเว็บไซต์ (UI Customization)</span>
                </button>
              </div>
            )}

            {/* Admin Users Tab */}
            {adminTab === 'users' && (
              <div className="space-y-3 animate-pop">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800">รายชื่อผู้ใช้ทั้งหมด ({users.length})</h3>
                  <button
                    onClick={() => setModal({ type: 'user_modal', isNew: true })}
                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1"
                  >
                    <Icons.Plus /> เพิ่มผู้ใช้ใหม่
                  </button>
                </div>

                <div className="space-y-2">
                  {users.map((u) => (
                    <div
                      key={u.username}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">{u.username}</span>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              u.role === 'admin'
                                ? 'bg-red-100 text-red-700'
                                : u.role === 'inspector'
                                ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {u.role}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">{u.full_name}</span>
                        {u.inspector_mapped_name && (
                          <span className="text-[10px] text-amber-600 font-bold block">
                            🔗 ผูกกับ: {u.inspector_mapped_name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setModal({ type: 'user_modal', data: u, isNew: false })}
                          className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                        >
                          <Icons.Edit />
                        </button>
                        {u.username !== 'admin' && u.username !== 'jirapong' && (
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                msg: `ยืนยันการลบผู้ใช้ "${u.username}" ออกจากระบบ?`,
                                onConfirm: () => {
                                  setConfirmDialog(null);
                                  const updated = users.filter((x) => x.username !== u.username);
                                  setUsers(updated);
                                  saveUsersToStorage(updated);
                                  firestoreSaveUsers(updated);
                                  logSystem('DELETE USER', `ลบผู้ใช้ ${u.username}`);
                                  setSuccessModal('ลบผู้ใช้สำเร็จ');
                                },
                              });
                            }}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                          >
                            <Icons.Trash />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Inspectors Tab */}
            {adminTab === 'inspectors' && (
              <div className="space-y-3 animate-pop">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-slate-800">รายชื่อผู้ตรวจ ({inspectors.length})</h3>
                  <button
                    onClick={() => setModal({ type: 'inspector_modal' })}
                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1"
                  >
                    <Icons.Plus /> เพิ่มผู้ตรวจ
                  </button>
                </div>

                <div className="space-y-2">
                  {inspectors.map((ins) => (
                    <div
                      key={ins.name}
                      className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-slate-800">{ins.name}</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setModal({ type: 'inspector_modal', data: ins })}
                            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"
                          >
                            <Icons.Edit />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmDialog({
                                msg: `ยืนยันการลบผู้ตรวจ "${ins.name}"?`,
                                onConfirm: () => {
                                  setConfirmDialog(null);
                                  const updated = inspectors.filter((x) => x.name !== ins.name);
                                  setInspectors(updated);
                                  saveInspectorsToStorage(updated);
                                  firestoreSaveInspectors(updated);
                                  logSystem('DELETE INSPECTOR', `ลบผู้ตรวจ ${ins.name}`);
                                  setSuccessModal('ลบผู้ตรวจสำเร็จ');
                                },
                              });
                            }}
                            className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl"
                          >
                            <Icons.Trash />
                          </button>
                        </div>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        <span className="font-bold">Product Lines: </span>
                        {ins.product_lines || 'ES1, 3300, S-villas'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Special Tab */}
            {adminTab === 'special' && (
              <div className="space-y-3 animate-pop">
                <button
                  onClick={() => setModal({ type: 'special_modal', specialType: 'leaves' })}
                  className="w-full p-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-amber-400 transition-all text-xs font-bold text-amber-900"
                >
                  <span className="flex items-center gap-2">
                    <Icons.User /> จัดการวันลาพนักงาน
                  </span>
                  <Icons.ChevronRight />
                </button>

                <button
                  onClick={() => setModal({ type: 'special_modal', specialType: 'events' })}
                  className="w-full p-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-emerald-400 transition-all text-xs font-bold text-emerald-900"
                >
                  <span className="flex items-center gap-2">
                    <Icons.Star /> จัดการกิจกรรมบริษัท (Event)
                  </span>
                  <Icons.ChevronRight />
                </button>

                <button
                  onClick={() => setModal({ type: 'special_modal', specialType: 'holidays' })}
                  className="w-full p-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-red-400 transition-all text-xs font-bold text-red-900"
                >
                  <span className="flex items-center gap-2">
                    <Icons.CalendarX /> จัดการวันหยุดบริษัท (Holiday)
                  </span>
                  <Icons.ChevronRight />
                </button>
              </div>
            )}

            {/* Admin UI Settings Tab */}
            {adminTab === 'settings' && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 animate-pop">
                <h3 className="text-xs font-bold text-slate-800 border-b border-slate-100 pb-2">
                  🎨 ตั้งค่าชื่อและสีสันระบบ
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 block mb-1">ชื่อระบบ (App Name)</label>
                    <input
                      type="text"
                      value={settings.appName || ''}
                      onChange={(e) => setSettings((s) => ({ ...s, appName: e.target.value }))}
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 font-bold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">สีแถบด้านบน (Header)</label>
                      <input
                        type="color"
                        value={settings.headerBg || '#1e293b'}
                        onChange={(e) => setSettings((s) => ({ ...s, headerBg: e.target.value }))}
                        className="w-full h-9 rounded-xl border border-slate-200 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">สีกิจกรรม (Event)</label>
                      <input
                        type="color"
                        value={settings.eventBg || '#22c55e'}
                        onChange={(e) => setSettings((s) => ({ ...s, eventBg: e.target.value }))}
                        className="w-full h-9 rounded-xl border border-slate-200 cursor-pointer"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      saveSettingsToStorage(settings);
                      firestoreSaveSettings(settings);
                      logSystem('UPDATE SETTINGS', 'บันทึกการตั้งค่า UI');
                      setSuccessModal('บันทึกการตั้งค่าเรียบร้อยแล้ว');
                    }}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md transition-all mt-2"
                  >
                    บันทึกการตั้งค่า
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <div
          className={`nav-item ${currentView === 'calendar' ? 'active' : ''}`}
          onClick={() => setCurrentView('calendar')}
        >
          <Icons.Home />
          <span>ปฏิทิน</span>
        </div>
        <div
          className={`nav-item ${currentView === 'search' ? 'active' : ''}`}
          onClick={() => setCurrentView('search')}
        >
          <Icons.Search />
          <span>ค้นหา</span>
        </div>
        {isAdmin && (
          <div
            className={`nav-item ${currentView === 'documents' ? 'active' : ''}`}
            onClick={() => setCurrentView('documents')}
          >
            <Icons.FileCheck />
            <span>ตรวจเอกสาร</span>
          </div>
        )}
        {currentUser && !isAdmin && currentUser.role !== 'viewer' && (
          <div
            className={`nav-item ${currentView === 'my_bookings' ? 'active' : ''}`}
            onClick={() => setCurrentView('my_bookings')}
          >
            <Icons.List />
            <span>งานฉัน</span>
          </div>
        )}
        <div
          className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
          onClick={() => setCurrentView('dashboard')}
        >
          <Icons.Chart />
          <span>สถิติ</span>
        </div>
        {isAdmin && (
          <div
            className={`nav-item ${currentView === 'admin' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('admin');
              setAdminTab('menu');
            }}
          >
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

      {/* MODALS */}
      {modal?.type === 'booking' && (
        <div className="backdrop z-[100] p-4 flex items-center justify-center">
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
        <div className="backdrop z-[100] p-4 flex items-center justify-center">
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
        <div className="backdrop z-[100] p-4 flex items-center justify-center">
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
        <div className="backdrop z-[100] p-4 flex items-center justify-center">
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
        <div className="backdrop z-[100] p-4 flex items-center justify-center">
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
                logSystem('CREATE USER', `สร้างผู้ใช้ใหม่ ${updatedUser.username}`);
              } else {
                nextUsers = users.map((u) => (u.username === updatedUser.username ? updatedUser : u));
                logSystem('UPDATE USER', `แก้ไขข้อมูลผู้ใช้ ${updatedUser.username}`);
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
        <div className="backdrop z-[100] p-4 flex items-center justify-center">
          <InspectorModal
            inspector={modal.data}
            onClose={() => setModal(null)}
            onSave={(name, productLines, oldName) => {
              let nextInspectors: Inspector[];
              if (oldName) {
                nextInspectors = inspectors.map((i) => (i.name === oldName ? { name, product_lines: productLines } : i));
                logSystem('UPDATE INSPECTOR', `แก้ไขผู้ตรวจ ${name}`);
              } else {
                nextInspectors = [...inspectors, { name, product_lines: productLines }];
                logSystem('ADD INSPECTOR', `เพิ่มผู้ตรวจใหม่ ${name}`);
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

      {showAuthModal && (
        <AuthModal
          users={users}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onResetPassword={handleResetPassword}
          onClose={() => setShowAuthModal(false)}
          setAlertMsg={setAlertMsg}
          setSuccessModal={setSuccessModal}
        />
      )}

      {showActivityModal && (
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
      )}

      {/* Alert Dialog */}
      {alertMsg && (
        <div className="backdrop z-[600] p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl animate-pop">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Icons.Alert />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">แจ้งเตือน</h3>
            <p className="text-xs text-slate-600 mb-5 whitespace-pre-line leading-relaxed">{alertMsg}</p>
            <button
              onClick={() => setAlertMsg(null)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="backdrop z-[600] p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-pop text-center">
            <h3 className="text-base font-bold text-slate-800 mb-2">ยืนยันการทำรายการ</h3>
            <div className="text-xs text-slate-600 mb-5 whitespace-pre-line leading-relaxed">{confirmDialog.msg}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Notification Popup */}
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

      {/* Loading Overlay */}
      {loadingMsg && (
        <div className="backdrop z-[800] gap-3">
          <Icons.Loader />
          <span className="text-white font-bold text-xs bg-slate-900/70 px-4 py-2 rounded-full border border-slate-700">
            {loadingMsg}
          </span>
        </div>
      )}

      {/* Tutorial Simulation & Handbook Modal (FEATURE 4) */}
      {tutorialOpen && (
        <TutorialModal
          lang={lang}
          onClose={() => setTutorialOpen(false)}
          onStartBookingDemo={() => {
            setTutorialOpen(false);
            setModal({ type: 'booking', data: null });
          }}
        />
      )}

      {/* Cloud & Share Direct URL Modal (FEATURE 3) */}
      {cloudShareOpen && (
        <CloudShareModal
          onClose={() => setCloudShareOpen(false)}
          cloudStatus={cloudStatus}
          onForceSync={async () => {
            await seedInitialCloudData();
            setSuccessModal('ซิงค์ข้อมูล Cloud Firestore สำเร็จแล้ว 100%');
          }}
        />
      )}

      {/* Super Admin Console Modal */}
      {showAdminSettingsModal && (
        <div className="backdrop z-[500] p-4 flex items-center justify-center">
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
              logSystem('UPDATE SETTINGS', 'อัปเดตการตั้งค่าระบบผ่าน Super Admin Console');
            }}
            onSaveInspectors={(newInspectors) => {
              setInspectors(newInspectors);
              saveInspectorsToStorage(newInspectors);
              firestoreSaveInspectors(newInspectors);
              logSystem('UPDATE INSPECTORS', `อัปเดตผู้ตรวจ ${newInspectors.length} คน`);
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
