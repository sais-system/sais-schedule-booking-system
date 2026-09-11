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
  OilTrackingRecord,
  STANDARD_PRODUCT_LINES,
} from './types';
import {
  getThaiTime,
  getLocalDateString,
  getMyInspectorName,
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
  loadOilRecordsFromStorage,
  saveOilRecordsToStorage,
} from './storage';
import {
  firestoreSaveBooking,
  firestoreSaveBookings,
  firestoreDeleteBooking,
  firestoreSaveInspectors,
  firestoreSaveUsers,
  firestoreSaveSettings,
  subscribeFirebaseBookings,
  subscribeFirebaseInspectors,
  subscribeFirebaseUsers,
  subscribeFirebaseSettings,
  subscribeFirebaseOilTracking,
  subscribeFirebaseNotifications,
  firestoreSaveNotification,
  firestoreBatchSaveNotifications,
  autoSyncAllBookingsToOilTracking,
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
import { AdminAppearanceSettings } from './components/AdminAppearanceSettings';
import { UniversalTextModal } from './components/Modals/UniversalTextModal';
import { SaisDatabasesModal } from './components/SaisDatabases/SaisDatabasesModal';
import { PullToRefreshHold } from './components/PullToRefreshHold';
import { EditableText, LiveEditProvider } from './components/EditableText';
import { useTranslation } from './i18n';

const PRODUCT_BADGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  ES1: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  '3300': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  '5500': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'ES5/ES5.1': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200' },
  'S-villas': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
  ES2: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  ES3: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  'MOR-R': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  'MOD-T': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  S7R4: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200' },
  Flex7: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200' },
  'ESC/MW': { bg: 'bg-lime-50', text: 'text-lime-800', border: 'border-lime-200' },
};

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
  const [showSaisDatabases, setShowSaisDatabases] = useState(false);
  const [saisDatabasesTab, setSaisDatabasesTab] = useState<'databases' | 'oil_tracking'>('oil_tracking');
  const [oilRecords, setOilRecords] = useState<OilTrackingRecord[]>(() => loadOilRecordsFromStorage());
  const [isNavVisible, setIsNavVisible] = useState(true);

  // Auto-hide bottom navigation on scroll
  useEffect(() => {
    let lastY = window.scrollY;
    const handleScroll = () => {
      const currentY = window.scrollY || document.documentElement.scrollTop;
      if (currentY > lastY + 25 && currentY > 50) {
        // Scrolling down: hide nav
        setIsNavVisible(false);
      } else if (currentY < lastY - 15) {
        // Scrolling up: show nav
        setIsNavVisible(true);
      }
      lastY = currentY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calendar & navigation states
  const [currentDate, setCurrentDate] = useState<Date>(getThaiTime());
  const [period, setPeriod] = useState<number>(getThaiTime().getDate() > 15 ? 1 : 0);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(getThaiTime());
  const [currentView, setCurrentView] = useState<'calendar' | 'search' | 'documents' | 'my_bookings' | 'dashboard' | 'admin'>('calendar');
  const [adminTab, setAdminTab] = useState<'menu' | 'users' | 'inspectors' | 'special' | 'all_bookings' | 'settings' | 'appearance'>('menu');
  const [showUniversalTextModal, setShowUniversalTextModal] = useState<boolean>(false);
  const [myBookingsTab, setMyBookingsTab] = useState<'pending' | 'approved' | 'completed' | 'leave'>('pending');
  const [selectedInspectorFilter, setSelectedInspectorFilter] = useState<string>('all');

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
  const [inspectorSearchQuery, setInspectorSearchQuery] = useState('');

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

  const gridScrollRef = useRef<HTMLDivElement | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  // Handle live custom text save for Admin
  const handleSaveCustomText = (idOrKey: string, newText: string) => {
    const updatedTexts = { ...(settings.customTexts || {}), [idOrKey]: newText };
    const updated = { ...settings, customTexts: updatedTexts };
    setSettings(updated);
    saveSettingsToStorage(updated);
    firestoreSaveSettings(updated);
  };

  const handleResetCustomText = (idOrKey: string) => {
    const updatedTexts = { ...(settings.customTexts || {}) };
    delete updatedTexts[idOrKey];
    const updated = { ...settings, customTexts: updatedTexts };
    setSettings(updated);
    saveSettingsToStorage(updated);
    firestoreSaveSettings(updated);
  };

  // Pull down and hold for 2 seconds to refresh Firebase
  const handlePullRefreshFirebase = async () => {
    try {
      await seedInitialCloudData();
    } catch (err) {
      console.error('Firebase pull refresh error:', err);
    }
  };

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

    const unsubOilTracking = subscribeFirebaseOilTracking((cloudOilRecords) => {
      if (cloudOilRecords) {
        setOilRecords(cloudOilRecords);
        saveOilRecordsToStorage(cloudOilRecords);
      }
    });

    const unsubNotifications = subscribeFirebaseNotifications((cloudNotifs) => {
      if (cloudNotifs && cloudNotifs.length > 0) {
        setNotifications(cloudNotifs);
        saveNotifsToStorage(cloudNotifs);
      }
    });

    return () => {
      unsubStatus();
      unsubBookings();
      unsubInspectors();
      unsubUsers();
      unsubSettings();
      unsubOilTracking();
      unsubNotifications();
    };
  }, []);

  // Automatic Background Sync for 'pass with OIL' bookings
  useEffect(() => {
    if (bookings && bookings.length > 0) {
      autoSyncAllBookingsToOilTracking(bookings, oilRecords).catch((err) => {
        console.warn('Auto sync pass with OIL bookings failed:', err);
      });
    }
  }, [bookings.length]);

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

  // Comprehensive list of Product Lines from standard certificate models, inspectors' certificates, and existing bookings
  const calendarProductLines = useMemo(() => {
    const linesSet = new Set<string>(STANDARD_PRODUCT_LINES);
    inspectors.forEach((ins) => {
      if (ins.product_lines) {
        ins.product_lines.split(',').forEach((pl) => {
          const trimmed = pl.trim();
          if (trimmed && trimmed !== 'All Products' && trimmed !== 'All') {
            linesSet.add(trimmed);
          }
        });
      }
    });
    bookings.forEach((b) => {
      if (b.product_line && b.product_line !== 'อื่นๆโปรดระบุ' && b.product_line !== 'All') {
        linesSet.add(b.product_line.trim());
      }
    });
    return Array.from(linesSet);
  }, [inspectors, bookings]);

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

  const pushNotification = useCallback(
    (notif: Omit<SystemNotification, 'id' | 'timestamp' | 'isRead'>) => {
      const newNotif: SystemNotification = {
        ...notif,
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        timestamp: new Date().toISOString(),
        isRead: 'false',
      };
      setNotifications((prev) => {
        const updated = [newNotif, ...prev.slice(0, 99)];
        saveNotifsToStorage(updated);
        firestoreSaveNotification(newNotif).catch(() => {});
        return updated;
      });
    },
    []
  );

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
        pushNotification({
          title: `ย้ายคิวตรวจ: ${task.site_name || task.equipment_no}`,
          message: `ย้ายจากวันที่ ${task.date} (${task.inspector_name}) ➔ วันที่ ${targetDate} (${targetInspector}) โดย ${currentUser?.username || 'Admin'}`,
          type: 'move',
          bookingId: task.id,
        });
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
        pushNotification({
          title: `ลบคิวตรวจ: ${task.site_name || task.equipment_no}`,
          message: `ลบรายการ ${task.site_name || task.equipment_no} วันที่ ${task.date} ลงถังขยะโดย ${currentUser?.username || 'Admin'}`,
          type: 'delete',
          bookingId: task.id,
        });
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
    let updated: Booking[];
    let targetBooking: Booking;
    if (formData.id) {
      // Edit existing
      const existing = bookings.find((b) => b.id === formData.id);
      targetBooking = { ...existing, ...formData } as Booking;
      updated = bookings.map((b) => (b.id === formData.id ? targetBooking : b));
      logSystem('UPDATE BOOKING', `แก้ไขคิวงาน: ${formData.site_name || targetBooking.equipment_no} (${targetBooking.date})`);
      pushNotification({
        title: `แก้ไขคิวตรวจ: ${targetBooking.site_name || targetBooking.equipment_no}`,
        message: `${currentUser?.username || 'ผู้ใช้'} ได้แก้ไขรายละเอียดคิวตรวจ วันที่ ${targetBooking.date} (${targetBooking.inspector_name})`,
        type: 'edit',
        bookingId: targetBooking.id,
      });
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
      logSystem('CREATE BOOKING', `จองคิวงานใหม่: ${targetBooking.site_name || targetBooking.equipment_no} (${targetBooking.date})`);
      pushNotification({
        title: `เพิ่มคิวตรวจใหม่: ${targetBooking.site_name || targetBooking.equipment_no}`,
        message: `${currentUser?.username || 'ผู้ใช้'} จองคิวตรวจวันที่ ${targetBooking.date} ผู้ตรวจ: ${targetBooking.inspector_name} ลิฟต์: ${targetBooking.equipment_no || '-'}`,
        type: 'add',
        bookingId: targetBooking.id,
      });
      setSuccessModal('จองคิวงานสำเร็จ');
    }
    setBookings(updated);
    saveBookingsToStorage(updated);
    firestoreSaveBooking(targetBooking);
    setLastSyncTime(getThaiTime());
    setModal(null);
  };

  // Delete Booking (Permanent)
  const handleDeleteBooking = (booking: Booking) => {
    setConfirmDialog({
      msg: `ยืนยันการลบรายการ "${booking.site_name || booking.equipment_no}" ออกจากระบบถาวรใช่หรือไม่?`,
      onConfirm: () => {
        setConfirmDialog(null);
        setModal(null);
        const updated = bookings.filter((b) => b.id !== booking.id);
        setBookings(updated);
        saveBookingsToStorage(updated);
        firestoreDeleteBooking(booking.id);
        logSystem('DELETE BOOKING', `ลบรายการ: ${booking.site_name || booking.equipment_no}`);
        pushNotification({
          title: `ลบคิวตรวจถาวร: ${booking.site_name || booking.equipment_no}`,
          message: `ลบคิวตรวจวันที่ ${booking.date} (${booking.inspector_name}) ลิฟต์ ${booking.equipment_no || '-'} ออกจากระบบถาวร`,
          type: 'delete',
          bookingId: booking.id,
        });
        setSuccessModal('ลบข้อมูลสำเร็จ');
      },
    });
  };

  // Cancel Booking (Soft delete / Keeps history on calendar)
  const handleCancelBooking = (booking: Booking) => {
    setConfirmDialog({
      msg: (
        <div className="space-y-2 text-left">
          <p className="font-bold text-slate-800 text-sm">
            ยืนยันการยกเลิกคิวตรวจ "{booking.site_name || booking.equipment_no}" ใช่หรือไม่?
          </p>
          <p className="text-xs text-slate-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed">
            📌 <b>การยกเลิกคิวตรวจ:</b> ระบบจะคงรายการไว้บนตารางปฏิทิน (แสดงสถานะขีดฆ่า [ยกเลิกคิว]) และบันทึกประวัติไว้ครบถ้วน สามารถเปิดใช้งานใหม่ได้ทุกเมื่อ
          </p>
        </div>
      ),
      onConfirm: () => {
        setConfirmDialog(null);
        setModal(null);
        const updatedBooking = { ...booking, status: 'cancelled' as const };
        const updated = bookings.map((b) => (b.id === booking.id ? updatedBooking : b));
        setBookings(updated);
        saveBookingsToStorage(updated);
        firestoreSaveBooking(updatedBooking);
        logSystem('CANCEL BOOKING', `ยกเลิกคิวตรวจ: ${booking.site_name || booking.equipment_no}`);
        pushNotification({
          title: `ยกเลิกคิวตรวจ: ${booking.site_name || booking.equipment_no}`,
          message: `ยกเลิกคิวตรวจวันที่ ${booking.date} (${booking.inspector_name}) โดย ${currentUser?.username || 'Admin'} (เก็บประวัติไซต์งานไว้)`,
          type: 'cancel',
          bookingId: booking.id,
        });
        setSuccessModal('ยกเลิกคิวตรวจและบันทึกประวัติไว้เรียบร้อย');
      },
    });
  };

  // Reactivate cancelled booking
  const handleReactivateBooking = (booking: Booking) => {
    const updatedBooking = { ...booking, status: 'active' as const };
    const updated = bookings.map((b) => (b.id === booking.id ? updatedBooking : b));
    setBookings(updated);
    saveBookingsToStorage(updated);
    firestoreSaveBooking(updatedBooking);
    logSystem('REACTIVATE BOOKING', `กู้คืนคิวตรวจ: ${booking.site_name || booking.equipment_no}`);
    pushNotification({
      title: `กู้คืนคิวตรวจ: ${booking.site_name || booking.equipment_no}`,
      message: `เปิดใช้งานคิวตรวจวันที่ ${booking.date} (${booking.inspector_name}) ใหม่อีกครั้ง โดย ${currentUser?.username || 'Admin'}`,
      type: 'edit',
      bookingId: booking.id,
    });
    setModal({ type: 'detail', data: updatedBooking });
    setSuccessModal('กู้คืนคิวตรวจเรียบร้อยแล้ว');
  };

  // Document verification toggle
  const handleVerifyDocument = (bookingId: string, docKey: 'layout_doc' | 'wiring_doc' | 'precheck_doc', isChecked: boolean) => {
    if (!isAdmin) return;
    const val = isChecked ? 'true' : 'false';
    const found = bookings.find((b) => b.id === bookingId);
    if (!found) return;
    const updatedBooking = { ...found, [docKey]: val };
    const updated = bookings.map((b) => (b.id === bookingId ? updatedBooking : b));
    setBookings(updated);
    saveBookingsToStorage(updated);
    firestoreSaveBooking(updatedBooking);
    logSystem('VERIFY DOC', `อัปเดตเอกสาร ${docKey} เป็น ${isChecked ? 'อนุมัติ' : 'รอตรวจสอบ'}`);
    setSuccessModal('อัปเดตสถานะเอกสารสำเร็จ');
  };

  // Add special events / leaves / holidays
  const handleAddSpecial = (
    specialType: 'leave' | 'company_event' | 'public_holiday',
    dates: string[],
    targetInspectors: string[],
    title: string,
    color = '#22c55e'
  ) => {
    // If inspector role, strictly ensure leaves are only created for the logged-in inspector
    let finalTargets = targetInspectors;
    if (currentUser?.role === 'inspector' && specialType === 'leave') {
      const myInspector = getMyInspectorName(currentUser, inspectors);
      finalTargets = [myInspector];
    }

    const newItems: Booking[] = [];
    dates.forEach((d) => {
      finalTargets.forEach((inspector) => {
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
  const handleLogin = (u: User, rememberMe: boolean = false) => {
    setCurrentUser(u);
    setStoredUser(u, rememberMe);
    logSystem('LOGIN', `ผู้ใช้ ${u.username} เข้าสู่ระบบ${rememberMe ? ' (จดจำการเข้าสู่ระบบ 24 ชม.)' : ''}`);
  };

  const handleRegister = (u: User) => {
    const updatedUsers = [...users, u];
    setUsers(updatedUsers);
    saveUsersToStorage(updatedUsers);
    firestoreSaveUsers(updatedUsers);
    logSystem('REGISTER', `ผู้ใช้ ${u.username} (${u.full_name}) สมัครสมาชิกใหม่ (รออนุมัติ)`);
  };

  const handleResetPassword = (name: string, phone: string, newPass: string) => {
    const safeName = (name || '').trim();
    const safePhone = (phone || '').trim();
    const idx = users.findIndex(
      (u) => (u.full_name || '').trim() === safeName && (u.phone || '').trim() === safePhone
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

  const liveEditContextValue = {
    customTexts: settings.customTexts || {},
    isAdmin,
    isLiveEdit: !!settings.isLiveEdit,
    onSaveText: handleSaveCustomText,
    onResetText: handleResetCustomText,
    onToggleLiveEdit: () => {
      const nextEdit = !settings.isLiveEdit;
      const nextSettings = { ...settings, isLiveEdit: nextEdit };
      setSettings(nextSettings);
      saveSettingsToStorage(nextSettings);
      firestoreSaveSettings(nextSettings);
      setSuccessModal(
        nextEdit
          ? 'เปิดโหมดปากกาแก้ไขข้อความสดแล้ว (คลิกที่ข้อความใดๆ บนหน้าเว็บเพื่อแก้ไข)'
          : 'ปิดโหมดปากกาแก้ไขข้อความแล้ว'
      );
    },
    onOpenUniversalModal: () => setShowUniversalTextModal(true),
  };

  // Requirement 4: Enforce Authentication Gate
  // Website and calendar can only be viewed, edited, modified, or deleted when logged in
  if (!currentUser) {
    return (
      <LiveEditProvider value={liveEditContextValue}>
        <AuthModal
          isGate={true}
          users={users}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onResetPassword={handleResetPassword}
          setAlertMsg={setAlertMsg}
          setSuccessModal={setSuccessModal}
        />
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
      </LiveEditProvider>
    );
  }

  return (
    <LiveEditProvider value={liveEditContextValue}>
      <div
        className="app-container"
        style={
          {
            '--app-bg': settings.appBg || '#f8fafc',
            '--header-bg': settings.headerBg || '#1e293b',
            '--header-text': settings.headerText || '#ffffff',
            '--nav-bg': settings.navBg || '#ffffff',
            '--nav-active-color': settings.navActiveColor || '#dc2626',
            '--nav-inactive-color': settings.navInactiveColor || '#64748b',
            '--font-nav-text': `${settings.fontNavText || 10}px`,
            '--table-header-bg': settings.tableHeaderBg || '#1e293b',
            '--table-header-text': settings.tableHeaderText || '#ffffff',
            '--table-border': settings.tableBorder || '#cbd5e1',
            '--card-radius': `${settings.cardRadius || 6}px`,
            '--card-padding': `${settings.cardPadding || 4}px`,
            '--card-min-height': `${settings.cardMinHeight || 35}px`,
            '--font-card-title': `${settings.fontCardTitle || 11}px`,
            '--font-card-sub': `${settings.fontCardSub || 10}px`,
            '--font-date-header': `${settings.fontDateHeader || 12}px`,
            '--font-inspector-header': `${settings.fontInspectorHeader || 12}px`,
            '--modal-bg': settings.modalBg || '#ffffff',
            '--modal-text': settings.modalText || '#0f172a',
            '--modal-font-scale': settings.fontModalScale || 1.0,
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

      {/* TOP HEADER: Clean responsive header. Stacks into separate lines on mobile to prevent overlapping */}
      <header className="main-header border-b border-slate-800/80 px-2.5 sm:px-4 py-1.5 sm:py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2 z-30 shrink-0 bg-slate-900 text-white shadow-xs">
        {/* Line 1 (Mobile) / Left (Desktop): App Logo & Site Title (Separate line on phones) */}
        <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0 w-full sm:w-auto">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-red-600 text-white font-black flex items-center justify-center text-xs sm:text-sm shadow-sm shrink-0">
              S
            </div>
            <div className="min-w-0 flex-1">
              <EditableText
                id="site_title"
                defaultText={settings.appName || 'SAIS SCHEDULE BOOKING & LIFT INSPECTION'}
                customTexts={settings.customTexts}
                isAdmin={isAdmin}
                isLiveEdit={settings.isLiveEdit}
                onSaveText={handleSaveCustomText}
                className="text-xs sm:text-sm md:text-base font-bold tracking-tight text-white block truncate"
                tag="h1"
              />
            </div>
          </div>

          {/* Mobile Cloud Status Pill */}
          <div className="flex sm:hidden items-center gap-1 text-[9px] bg-slate-800 border border-slate-700/60 px-2 py-0.5 rounded-full shrink-0">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                cloudStatus === 'connected'
                  ? 'bg-emerald-400'
                  : cloudStatus === 'syncing'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-slate-300 font-medium">
              {cloudStatus === 'connected' ? 'Firebase' : 'Sync'}
            </span>
          </div>
        </div>

        {/* Line 2 (Mobile) / Right (Desktop): Menu and utility actions */}
        <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-1.5 relative w-full sm:w-auto shrink-0 pt-1 sm:pt-0 border-t border-slate-800/60 sm:border-t-0">
          {/* Realtime Firebase Badge (Desktop) */}
          <div className="hidden sm:flex items-center gap-1.5 text-[9px] sm:text-[10px] bg-slate-800/90 border border-slate-700/60 px-2 sm:px-2.5 py-0.5 rounded-full shrink-0 mr-1">
            <span
              className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                cloudStatus === 'connected'
                  ? 'bg-emerald-400'
                  : cloudStatus === 'syncing'
                  ? 'bg-amber-400 animate-spin'
                  : 'bg-slate-400'
              }`}
            />
            <span className="text-slate-300 font-medium flex items-center gap-0.5">
              <Icons.Flame size={10} className="text-amber-400 shrink-0" />
              <span className="hidden lg:inline">Firebase 100%</span>
              <span>
                {cloudStatus === 'connected'
                  ? 'Realtime'
                  : cloudStatus === 'syncing'
                  ? 'กำลังซิงค์...'
                  : 'ออฟไลน์'}
              </span>
            </span>
          </div>
          {/* Tutorial Simulation & Handbook Button */}
          <button
            type="button"
            onClick={() => setTutorialOpen(true)}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold shadow-2xs flex items-center gap-1 transition-all active:scale-95 border border-amber-400/40 shrink-0"
            title={t.tutorialButton || t.tutorialBtn || 'จำลองสอนใช้งาน'}
          >
            <Icons.GraduationCap size={13} />
            <span className="hidden lg:inline">{t.tutorialButton || t.tutorialBtn || 'จำลองสอนใช้งาน'}</span>
          </button>

          {/* Live Edit Pen Toggle Button for Admins (Requirement 4) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                const nextEdit = !settings.isLiveEdit;
                const nextSettings = { ...settings, isLiveEdit: nextEdit };
                setSettings(nextSettings);
                saveSettingsToStorage(nextSettings);
                firestoreSaveSettings(nextSettings);
                setSuccessModal(
                  nextEdit
                    ? 'เปิดโหมดปากกาแก้ไขข้อความสดแล้ว (คลิกที่ข้อความใดๆ ที่มีไอคอนปากกาสีทองบนหน้าเว็บเพื่อแก้ไข)'
                    : 'ปิดโหมดปากกาแก้ไขข้อความแล้ว'
                );
              }}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold shadow-2xs flex items-center gap-1 transition-all active:scale-95 shrink-0 border ${
                settings.isLiveEdit
                  ? 'bg-amber-400 text-amber-950 border-amber-300 font-black shadow-amber-300/40 animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
              }`}
              title={settings.isLiveEdit ? 'คลิกเพื่อปิดโหมดปากกา' : 'คลิกเพื่อเปิดโหมดปากกาแก้ไขข้อความสดทุกจุด'}
            >
              <Icons.Edit size={13} />
              <span className="hidden lg:inline">
                {settings.isLiveEdit ? 'โหมดปากกา: เปิดอยู่' : 'ปากกาแก้ไขสด'}
              </span>
            </button>
          )}

          {/* Settings Menu Button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg transition-colors shrink-0 ${
              showSettings ? 'bg-blue-600 text-white shadow-xs' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={t.systemSettings || t.settingsBtn || 'การตั้งค่า & คลาวด์'}
          >
            <Icons.Settings size={15} />
          </button>

          {showSettings && (
            <>
              {/* Backdrop to close when clicking outside */}
              <div
                className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-[60] animate-fadeIn"
                onClick={() => setShowSettings(false)}
              />
              <div className="settings-menu animate-pop w-[290px] max-h-[85vh] overflow-y-auto custom-scrollbar z-[70] shadow-2xl">
                <div className="text-xs font-bold border-b border-slate-200 pb-2 mb-3 text-slate-800 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Icons.Settings size={15} className="text-slate-700" />
                    <EditableText id="settings_title" defaultText={t.systemSettings || t.settingsBtn || 'การตั้งค่า & คลาวด์'} />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">
                      v2.0 Cloud
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSettings(false)}
                      className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title="ปิดหน้าต่าง"
                    >
                      <Icons.X size={14} />
                    </button>
                  </div>
                </div>

                {/* Cloud Sync Status in Menu */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 mb-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="text-slate-600 flex items-center gap-1">
                      <Icons.Cloud size={13} className="text-blue-500" />
                      <EditableText id="settings_cloud_status_label" defaultText="สถานะคลาวด์:" />
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
                    <Icons.RefreshCw size={11} />
                    <EditableText id="settings_btn_force_sync" defaultText="บังคับซิงค์คลาวด์ทันที" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleExportJPG}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl mb-3 shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Icons.Download size={14} />
                  <EditableText id="settings_btn_export_jpg" defaultText="บันทึกตารางหน้านี้ (JPG)" />
                </button>

                <div className="space-y-3 text-xs border-t border-slate-100 pt-2">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 mb-1">
                      <EditableText id="settings_label_col_zoom" defaultText="ความกว้างตาราง (คอลัมน์)" />
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setColumnZoom((prev) => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
                        className="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm"
                      >
                        -
                      </button>
                      <span className="font-bold text-blue-600">{(columnZoom * 100).toFixed(0)}%</span>
                      <button
                        type="button"
                        onClick={() => setColumnZoom((prev) => Math.min(2.5, Math.round((prev + 0.1) * 10) / 10))}
                        className="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-500 mb-1">
                      <EditableText id="settings_label_table_font" defaultText="ขนาดฟอนต์ปกติ" />
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setTableFontScale((prev) => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
                        className="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm"
                      >
                        -
                      </button>
                      <span className="font-bold text-blue-600">{(tableFontScale * 100).toFixed(0)}%</span>
                      <button
                        type="button"
                        onClick={() => setTableFontScale((prev) => Math.min(2.5, Math.round((prev + 0.1) * 10) / 10))}
                        className="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-slate-500 mb-1">
                      <EditableText id="settings_label_special_font" defaultText="ขนาดฟอนต์ ลา/หยุด/กิจกรรม" />
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSpecialFontScale((prev) => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10))}
                        className="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm"
                      >
                        -
                      </button>
                      <span className="font-bold text-blue-600">{(specialFontScale * 100).toFixed(0)}%</span>
                      <button
                        type="button"
                        onClick={() => setSpecialFontScale((prev) => Math.min(2.5, Math.round((prev + 0.1) * 10) / 10))}
                        className="w-8 h-8 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setColumnZoom(1.0);
                      setTableFontScale(1.0);
                      setSpecialFontScale(1.0);
                    }}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition-colors"
                  >
                    <EditableText id="settings_btn_reset_zoom" defaultText="↺ คืนค่าขนาดเริ่มต้น" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="w-full mt-2 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Icons.Check size={14} />
                    <EditableText id="settings_btn_close" defaultText="ปิดหน้าต่างการตั้งค่า" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Notifications Button */}
          <button
            onClick={() => setShowActivityModal(true)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors relative"
            title="การแจ้งเตือน"
          >
            <Icons.Bell size={15} />
            {unreadNotifs.length > 0 && <span className="notif-dot animate-pulse"></span>}
          </button>

          {/* User badge & Quick Logout */}
          {currentUser ? (
            <div className="flex items-center gap-1">
              <div
                className="text-xs font-bold bg-white/20 px-2 py-1 rounded-xl flex items-center gap-1 text-white shadow-xs"
                title={`${currentUser.full_name || currentUser.username} (${currentUser.role})`}
              >
                <Icons.User size={12} />
                <span className="truncate max-w-[60px] sm:max-w-[90px]">{currentUser.username}</span>
                <span className="text-[8px] bg-red-600 text-white font-mono uppercase px-1 rounded font-bold">
                  {currentUser.role}
                </span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-xl transition-all active:scale-95 cursor-pointer"
                title="ออกจากระบบ (Logout)"
              >
                <Icons.LogOut size={13} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded-xl font-bold text-xs flex items-center gap-1 shadow-sm"
            >
              <Icons.User size={12} /> เข้าสู่ระบบ
            </button>
          )}
        </div>
      </header>

      {/* Main Views Container */}
      <main className="flex-1 overflow-hidden relative">
        {/* VIEW 1: CALENDAR */}
        {currentView === 'calendar' && (
          <div className="grid-container relative overflow-hidden">
            <div className="nav-bar bg-white px-3 py-2 border-b flex-shrink-0 z-20 flex justify-between items-center shadow-xs">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => changePeriod('prev')}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1 transition-colors"
                  title="ปุ่มลัด: ลูกศรซ้าย ←"
                >
                  <Icons.ChevronLeft />
                  <EditableText
                    id="cal_btn_prev"
                    defaultText="ย้อนกลับ"
                    customTexts={settings.customTexts}
                    isAdmin={isAdmin}
                    isLiveEdit={settings.isLiveEdit}
                    onSaveText={handleSaveCustomText}
                  />
                </button>
                <button
                  onClick={jumpToToday}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-1"
                  title="ปุ่มลัด: กดปุ่ม T บนคีย์บอร์ด"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  <EditableText
                    id="cal_btn_today"
                    defaultText="วันนี้ (Today)"
                    customTexts={settings.customTexts}
                    isAdmin={isAdmin}
                    isLiveEdit={settings.isLiveEdit}
                    onSaveText={handleSaveCustomText}
                  />
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
                <EditableText
                  id="cal_btn_next"
                  defaultText="ถัดไป"
                  customTexts={settings.customTexts}
                  isAdmin={isAdmin}
                  isLiveEdit={settings.isLiveEdit}
                  onSaveText={handleSaveCustomText}
                />
                <Icons.ChevronRight />
              </button>
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

            {/* Streamlined Calendar Filters Bar: Product Line & Inspector Dropdowns */}
            <div className="bg-slate-50 px-3 py-1.5 border-b border-slate-200 flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 text-xs shrink-0 shadow-2xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* Product Line Dropdown */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    <EditableText
                      id="lbl_filter_model"
                      defaultText="โมเดล:"
                      customTexts={settings.customTexts}
                      isAdmin={isAdmin}
                      isLiveEdit={settings.isLiveEdit}
                      onSaveText={handleSaveCustomText}
                    />
                  </span>
                  <select
                    value={calFilterProduct}
                    onChange={(e) => setCalFilterProduct(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer shadow-2xs hover:border-slate-400 transition-colors"
                  >
                    <option value="All">All</option>
                    {calendarProductLines.map((pl) => (
                      <option key={pl} value={pl}>
                        {pl}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Inspector Dropdown */}
                <div className="flex items-center gap-1.5 flex-1 min-w-[140px] max-w-[280px]">
                  <span className="text-[10px] font-bold text-slate-500 shrink-0">
                    <EditableText
                      id="lbl_filter_inspector"
                      defaultText="ผู้ตรวจ:"
                      customTexts={settings.customTexts}
                      isAdmin={isAdmin}
                      isLiveEdit={settings.isLiveEdit}
                      onSaveText={handleSaveCustomText}
                    />
                  </span>
                  <select
                    value={selectedInspectorFilter}
                    onChange={(e) => setSelectedInspectorFilter(e.target.value)}
                    className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 font-bold text-slate-700 outline-none focus:border-blue-500 cursor-pointer shadow-2xs hover:border-slate-400 transition-colors w-full truncate"
                  >
                    <option value="all">👥 ทุกคน ({inspectors.length} ท่าน)</option>
                    {inspectors.map((ins) => (
                      <option key={ins.name} value={ins.name}>
                        {ins.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Calendar Table Grid Wrapped in 2-Second Hold Pull-To-Refresh */}
            <PullToRefreshHold
              onRefresh={handlePullRefreshFirebase}
              scrollRef={gridScrollRef}
              className="flex-1 min-h-0 flex flex-col relative w-full h-full"
            >
              <div ref={gridScrollRef} className="grid-wrapper flex-1 min-h-0">
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
                  selectedInspectorFilter={selectedInspectorFilter}
                  onSaveCustomText={handleSaveCustomText}
                />
              </div>
            </PullToRefreshHold>

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
                <Icons.FileCheck /> ตรวจสอบเอกสารประกอบคิวงาน
              </h2>
              <p className="text-[11px] text-slate-500">
                คลิกเพื่ออนุมัติเอกสาร Layout, Wiring และ Pre-check สำหรับแต่ละไซต์งาน
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
                          const isSent = String(job[docProp]) === 'true';
                          const fileUrl = job[`${docKey}_img` as keyof Booking] as string | undefined;

                          return (
                            <div
                              key={docKey}
                              className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 ${
                                isSent ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200'
                              }`}
                            >
                              <span className="text-[10px] font-bold uppercase text-slate-700">{docKey}</span>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSent}
                                  onChange={(e) => handleVerifyDocument(job.id, docProp, e.target.checked)}
                                  className="w-3.5 h-3.5 accent-blue-600 rounded"
                                />
                                <span className="text-[9px] font-bold text-slate-700">
                                  {isSent ? 'อนุมัติแล้ว' : 'รอตรวจสอบ'}
                                </span>
                              </label>

                              {fileUrl && (
                                <button
                                  onClick={() => setViewFileUrl(fileUrl)}
                                  className="mt-1 text-[9px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-0.5 rounded-md w-full shadow-xs"
                                >
                                  ดูไฟล์
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

                {/* Appearance & Colors Customization (Requirement 3.1) */}
                <button
                  onClick={() => setAdminTab('appearance')}
                  className="p-4 bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600 text-white rounded-3xl shadow-md border border-pink-400/40 flex flex-col items-center gap-2 hover:opacity-95 transition-all text-center col-span-2"
                >
                  <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center">
                    <Icons.Palette size={24} />
                  </div>
                  <span className="font-bold text-sm text-white">🎨 ปรับแต่งสีและรูปลักษณ์ (Colors & Appearance)</span>
                  <span className="text-[11px] text-pink-100">
                    ปรับแต่งสีตัวอักษร, สีพื้นหลัง, ขนาดตัวอักษรทุกส่วน, ความกว้างคอลัมน์, โหมดปากกาแก้ไขข้อความ, คลังข้อความสากล
                  </span>
                </button>

                {/* Advanced Admin Settings & Detailed Configuration Button */}
                <button
                  onClick={() => setShowAdminSettingsModal(true)}
                  className="p-4 bg-slate-900 text-white rounded-3xl shadow-sm border border-slate-700 flex flex-col items-center gap-2 hover:bg-slate-800 transition-all text-center col-span-2"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center">
                    <Icons.Settings size={20} />
                  </div>
                  <span className="font-bold text-xs text-white">⚙️ จัดการระบบ Cloud & ความปลอดภัย (Cloud & System)</span>
                  <span className="text-[10px] text-slate-300">
                    ตั้งค่า Google Drive Folder, ซิงค์ Cloud Firestore, กู้คืนและสำรองข้อมูล
                  </span>
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

            {/* Admin Inspectors Tab: Unified Inspector, Certificate & Order Management */}
            {adminTab === 'inspectors' && (
              <div className="space-y-4 animate-pop pb-36">
                {/* Header & Main Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <Icons.FileCheck className="text-indigo-600" size={18} />
                      รายชื่อผู้ตรวจและ Certificate ({inspectors.length} ท่าน)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      เพิ่ม / แก้ไข / ลบ ผู้ตรวจ, ตั้งค่า Certificate สิทธิ์รับงาน, และจัดลำดับคอลัมน์บนตารางปฏิทิน
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setModal({ type: 'inspector_modal' })}
                      className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl shadow-xs flex items-center gap-1.5 transition-colors shrink-0"
                    >
                      <Icons.Plus size={14} /> เพิ่มผู้ตรวจใหม่ (Add Inspector)
                    </button>
                  </div>
                </div>

                {/* Info & Rules Banner */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-2xl border border-blue-200/80 text-xs text-blue-900 space-y-1 shadow-2xs">
                  <div className="font-bold flex items-center gap-1.5">
                    <span>💡 การเชื่อมโยงข้อมูลและสิทธิ์:</span>
                  </div>
                  <div className="text-[11px] text-slate-600 space-y-0.5 pl-2">
                    <div>• <b>ลำดับคอลัมน์บนตาราง:</b> ผู้ตรวจลำดับที่ 1 จะแสดงเป็นคอลัมน์แรกถัดจากวันที่บนตารางปฏิทิน (เรียง 1 → {inspectors.length} จากซ้ายไปขวา)</div>
                    <div>• <b>Certificate:</b> เมื่อผู้ใช้เลือกผู้ตรวจในหน้าจองคิว ระบบจะกรอง Product Line ตาม Certificate ของผู้ตรวจท่านนั้นๆ ให้ทันที</div>
                  </div>
                </div>

                {/* Search & Filter Bar */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={inspectorSearchQuery}
                      onChange={(e) => setInspectorSearchQuery(e.target.value)}
                      placeholder="ค้นหาชื่อผู้ตรวจ หรือรุ่น Certificate..."
                      className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:border-blue-400 outline-none shadow-2xs"
                    />
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icons.Search size={14} />
                    </span>
                    {inspectorSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setInspectorSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Inspectors List (Fully Scrollable Cards) */}
                <div className="space-y-2.5">
                  {inspectors
                    .filter(
                      (ins) =>
                        !inspectorSearchQuery.trim() ||
                        ins.name.toLowerCase().includes(inspectorSearchQuery.toLowerCase()) ||
                        (ins.product_lines &&
                          ins.product_lines.toLowerCase().includes(inspectorSearchQuery.toLowerCase()))
                    )
                    .map((ins) => {
                      const realIndex = inspectors.findIndex((x) => x.name === ins.name);
                      const currentOrder = realIndex + 1;
                      const parsedLines = ins.product_lines
                        ? ins.product_lines.split(',').map((s) => s.trim()).filter(Boolean)
                        : [];

                      return (
                        <div
                          key={ins.name}
                          className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-sm space-y-3 hover:border-indigo-300 transition-all"
                        >
                          {/* Top row: Order control, Name, and Actions */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              {/* Order selector & ▲/▼ buttons */}
                              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200 shrink-0">
                                <span className="text-[10px] font-black text-slate-400 px-1">
                                  #{currentOrder}
                                </span>
                                <select
                                  value={currentOrder}
                                  onChange={(e) => {
                                    const toOrder = parseInt(e.target.value);
                                    const targetIdx = Math.max(0, Math.min(inspectors.length - 1, toOrder - 1));
                                    if (targetIdx === realIndex) return;
                                    const updated = [...inspectors];
                                    const [moved] = updated.splice(realIndex, 1);
                                    updated.splice(targetIdx, 0, moved);
                                    const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
                                    setInspectors(reordered);
                                    saveInspectorsToStorage(reordered);
                                    firestoreSaveInspectors(reordered);
                                    logSystem('REORDER INSPECTOR', `เปลี่ยนลำดับ ${moved.name} เป็นลำดับที่ ${toOrder}`);
                                  }}
                                  className="text-xs font-black bg-white border border-indigo-200 text-indigo-700 rounded-lg px-2 py-0.5 shadow-2xs outline-none cursor-pointer hover:border-indigo-400"
                                  title="เปลี่ยนตำแหน่งคอลัมน์บนตาราง"
                                >
                                  {inspectors.map((_, orderIdx) => (
                                    <option key={orderIdx + 1} value={orderIdx + 1}>
                                      อันดับ {orderIdx + 1}
                                    </option>
                                  ))}
                                </select>
                                <div className="flex items-center gap-0.5">
                                  <button
                                    type="button"
                                    disabled={realIndex === 0}
                                    onClick={() => {
                                      if (realIndex === 0) return;
                                      const updated = [...inspectors];
                                      const [moved] = updated.splice(realIndex, 1);
                                      updated.splice(realIndex - 1, 0, moved);
                                      const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
                                      setInspectors(reordered);
                                      saveInspectorsToStorage(reordered);
                                      firestoreSaveInspectors(reordered);
                                      logSystem('REORDER INSPECTOR', `เลื่อน ${moved.name} ขึ้นเป็นลำดับที่ ${realIndex}`);
                                    }}
                                    title="เลื่อนขึ้น / คอลัมน์ไปทางซ้าย"
                                    className="w-6 h-6 rounded-md bg-white hover:bg-indigo-50 disabled:opacity-20 border border-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition-colors shadow-2xs"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    type="button"
                                    disabled={realIndex === inspectors.length - 1}
                                    onClick={() => {
                                      if (realIndex === inspectors.length - 1) return;
                                      const updated = [...inspectors];
                                      const [moved] = updated.splice(realIndex, 1);
                                      updated.splice(realIndex + 1, 0, moved);
                                      const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
                                      setInspectors(reordered);
                                      saveInspectorsToStorage(reordered);
                                      firestoreSaveInspectors(reordered);
                                      logSystem('REORDER INSPECTOR', `เลื่อน ${moved.name} ลงเป็นลำดับที่ ${realIndex + 2}`);
                                    }}
                                    title="เลื่อนลง / คอลัมน์ไปทางขวา"
                                    className="w-6 h-6 rounded-md bg-white hover:bg-indigo-50 disabled:opacity-20 border border-slate-200 text-slate-700 font-black text-xs flex items-center justify-center transition-colors shadow-2xs"
                                  >
                                    ▼
                                  </button>
                                </div>
                              </div>

                              {/* Inspector Name */}
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">
                                  <Icons.User size={14} />
                                </div>
                                <span className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                                  {ins.name}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => setModal({ type: 'inspector_modal', data: ins })}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center gap-1 transition-colors"
                                title="แก้ไข Certificate & ข้อมูลผู้ตรวจ"
                              >
                                <Icons.Settings size={13} />
                                <span className="hidden sm:inline">ตั้งค่า</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setModal({ type: 'inspector_modal', data: ins })}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
                                title="แก้ไขชื่อ"
                              >
                                <Icons.Edit size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDialog({
                                    msg: `ยืนยันการลบผู้ตรวจ "${ins.name}" ออกจากระบบ? (ลำดับแสดงผลบนตารางจะถูกปรับให้อัตโนมัติ)`,
                                    onConfirm: () => {
                                      setConfirmDialog(null);
                                      const updated = inspectors
                                        .filter((x) => x.name !== ins.name)
                                        .map((item, idx) => ({ ...item, order: idx + 1 }));
                                      setInspectors(updated);
                                      saveInspectorsToStorage(updated);
                                      firestoreSaveInspectors(updated);
                                      logSystem('DELETE INSPECTOR', `ลบผู้ตรวจ ${ins.name}`);
                                      setSuccessModal(`ลบผู้ตรวจ "${ins.name}" สำเร็จ`);
                                    },
                                  });
                                }}
                                className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-colors"
                                title="ลบผู้ตรวจ"
                              >
                                <Icons.Trash size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Certificate Badges display */}
                          <div className="pt-2 border-t border-slate-100 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-bold text-slate-600 flex items-center gap-1">
                                <Icons.Check size={12} className="text-emerald-600" />
                                Certificate สิทธิ์รับงาน ({parsedLines.length} รุ่น):
                              </span>
                              <button
                                type="button"
                                onClick={() => setModal({ type: 'inspector_modal', data: ins })}
                                className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                              >
                                + / - แก้ไข Certificate
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {parsedLines.length > 0 ? (
                                parsedLines.map((model) => {
                                  const color = PRODUCT_BADGE_COLORS[model] || {
                                    bg: 'bg-slate-100',
                                    text: 'text-slate-700',
                                    border: 'border-slate-300',
                                  };
                                  return (
                                    <span
                                      key={model}
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${color.bg} ${color.text} ${color.border} shadow-2xs`}
                                    >
                                      {model}
                                    </span>
                                  );
                                })
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">
                                  ยังไม่มี Certificate ที่กำหนด (จะไม่สามารถรับงานเฉพาะรุ่นได้)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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

            {/* Admin Appearance & Colors Customization Tab (Requirement 3.1) */}
            {(adminTab === 'appearance' || adminTab === 'settings') && (
              <AdminAppearanceSettings
                settings={settings}
                onSaveSettings={(newSettings) => {
                  setSettings(newSettings);
                  saveSettingsToStorage(newSettings);
                  firestoreSaveSettings(newSettings);
                  logSystem('UPDATE APPEARANCE', 'บันทึกการปรับแต่งสีและรูปลักษณ์');
                  setSuccessModal('บันทึกการปรับแต่งสีและรูปลักษณ์เรียบร้อยแล้ว');
                }}
                columnZoom={columnZoom}
                setColumnZoom={setColumnZoom}
                tableFontScale={tableFontScale}
                setTableFontScale={setTableFontScale}
                onOpenUniversalTextModal={() => setShowUniversalTextModal(true)}
                onBack={() => setAdminTab('menu')}
                setAlertMsg={setAlertMsg}
              />
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation (Auto-Hide on scroll) */}
      <nav className={`bottom-nav ${!isNavVisible ? 'nav-hidden' : ''}`}>
        <div
          className={`nav-item ${currentView === 'calendar' && !showSaisDatabases ? 'active' : ''}`}
          onClick={() => {
            setShowSaisDatabases(false);
            setCurrentView('calendar');
            setIsNavVisible(true);
          }}
        >
          <Icons.Home />
          <span>
            <EditableText
              id="nav_calendar"
              defaultText="ปฏิทิน"
              customTexts={settings.customTexts}
              isAdmin={isAdmin}
              isLiveEdit={settings.isLiveEdit}
              onSaveText={handleSaveCustomText}
            />
          </span>
        </div>
        <div
          className={`nav-item ${currentView === 'search' && !showSaisDatabases ? 'active' : ''}`}
          onClick={() => {
            setShowSaisDatabases(false);
            setCurrentView('search');
            setIsNavVisible(true);
          }}
        >
          <Icons.Search />
          <span>
            <EditableText
              id="nav_search"
              defaultText="ค้นหา"
              customTexts={settings.customTexts}
              isAdmin={isAdmin}
              isLiveEdit={settings.isLiveEdit}
              onSaveText={handleSaveCustomText}
            />
          </span>
        </div>
        {isAdmin && (
          <div
            className={`nav-item ${currentView === 'documents' && !showSaisDatabases ? 'active' : ''}`}
            onClick={() => {
              setShowSaisDatabases(false);
              setCurrentView('documents');
              setIsNavVisible(true);
            }}
          >
            <Icons.FileCheck />
            <span>
              <EditableText
                id="nav_documents"
                defaultText="ตรวจเอกสาร"
                customTexts={settings.customTexts}
                isAdmin={isAdmin}
                isLiveEdit={settings.isLiveEdit}
                onSaveText={handleSaveCustomText}
              />
            </span>
          </div>
        )}
        {currentUser && !isAdmin && currentUser.role !== 'viewer' && (
          <div
            className={`nav-item ${currentView === 'my_bookings' && !showSaisDatabases ? 'active' : ''}`}
            onClick={() => {
              setShowSaisDatabases(false);
              setCurrentView('my_bookings');
              setIsNavVisible(true);
            }}
          >
            <Icons.List />
            <span>
              <EditableText
                id="nav_my_bookings"
                defaultText="งานฉัน"
                customTexts={settings.customTexts}
                isAdmin={isAdmin}
                isLiveEdit={settings.isLiveEdit}
                onSaveText={handleSaveCustomText}
              />
            </span>
          </div>
        )}
        <div
          className={`nav-item ${showSaisDatabases && saisDatabasesTab === 'databases' ? 'active text-red-600 font-black' : ''}`}
          onClick={() => {
            setSaisDatabasesTab('databases');
            setShowSaisDatabases(true);
            setIsNavVisible(true);
          }}
          title="เปิด SAIS DATABASE (Pending Records)"
        >
          <Icons.Database />
          <span>
            <EditableText
              id="nav_database"
              defaultText="DATABASE"
              customTexts={settings.customTexts}
              isAdmin={isAdmin}
              isLiveEdit={settings.isLiveEdit}
              onSaveText={handleSaveCustomText}
            />
          </span>
        </div>
        <div
          className={`nav-item ${showSaisDatabases && saisDatabasesTab === 'oil_tracking' ? 'active text-red-600 font-black' : ''}`}
          onClick={() => {
            setSaisDatabasesTab('oil_tracking');
            setShowSaisDatabases(true);
            setIsNavVisible(true);
          }}
          title="เปิดระบบ TRACKING OIL (Open Item List)"
        >
          <Icons.FileText />
          <span>
            <EditableText
              id="nav_oil_tracking"
              defaultText="TRACKING OIL"
              customTexts={settings.customTexts}
              isAdmin={isAdmin}
              isLiveEdit={settings.isLiveEdit}
              onSaveText={handleSaveCustomText}
            />
          </span>
        </div>
        {isAdmin && (
          <div
            className={`nav-item ${currentView === 'admin' && !showSaisDatabases ? 'active' : ''}`}
            onClick={() => {
              setShowSaisDatabases(false);
              setCurrentView('admin');
              setAdminTab('menu');
              setIsNavVisible(true);
            }}
          >
            <Icons.Shield />
            <span>
              <EditableText
                id="nav_admin"
                defaultText="จัดการ"
                customTexts={settings.customTexts}
                isAdmin={isAdmin}
                isLiveEdit={settings.isLiveEdit}
                onSaveText={handleSaveCustomText}
              />
            </span>
          </div>
        )}
        {currentUser && (
          <div className="nav-item text-red-500 hover:text-red-600" onClick={handleLogout}>
            <Icons.LogOut />
            <span>
              <EditableText
                id="nav_logout"
                defaultText="ออกระบบ"
                customTexts={settings.customTexts}
                isAdmin={isAdmin}
                isLiveEdit={settings.isLiveEdit}
                onSaveText={handleSaveCustomText}
              />
            </span>
          </div>
        )}
        {/* Quick minimize toggle button */}
        <div
          className="nav-item text-slate-400 hover:text-slate-600 cursor-pointer hidden xs:flex"
          onClick={() => setIsNavVisible(false)}
          title="ย่อซ่อนแถบเมนู (Auto Hide)"
        >
          <Icons.ChevronDown size={18} />
          <span className="text-[9px]">ซ่อน</span>
        </div>
      </nav>

      {/* Floating Reveal Button when Nav is Auto-Hidden */}
      {!isNavVisible && (
        <button
          type="button"
          onClick={() => setIsNavVisible(true)}
          className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[995] bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-center gap-1.5 transition-all animate-pop cursor-pointer active:scale-95"
          title="แตะเพื่อแสดงแถบเมนูนำทาง"
        >
          <Icons.ChevronUp size={14} className="text-red-500 animate-bounce" />
          <span>แสดงเมนู</span>
        </button>
      )}

      {/* MODALS */}
      {modal?.type === 'booking' && (
        <div className="backdrop z-[1300] p-2 sm:p-4 overflow-y-auto flex items-start sm:items-center justify-center">
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
        <div className="backdrop z-[1300] p-2 sm:p-4 overflow-y-auto flex items-start sm:items-center justify-center">
          <DetailModal
            booking={modal.data}
            isAdmin={isAdmin}
            user={currentUser}
            onClose={() => setModal(null)}
            onEdit={() => setModal({ type: 'booking', data: modal.data })}
            onDelete={() => handleDeleteBooking(modal.data)}
            onCancelBooking={() => handleCancelBooking(modal.data)}
            onReactivateBooking={() => handleReactivateBooking(modal.data)}
            onViewFile={(url) => setViewFileUrl(url)}
            onOpenOilTracking={() => {
              setModal(null);
              setSaisDatabasesTab('oil_tracking');
              setShowSaisDatabases(true);
            }}
            onUpdateBooking={(updated) => {
              handleUpdateSingleBooking(updated);
              setModal({ type: 'detail', data: updated });
            }}
          />
        </div>
      )}

      {modal?.type === 'admin_cell_action' && (
        <div className="backdrop z-[1300] p-2 sm:p-4 overflow-y-auto flex items-start sm:items-center justify-center">
          <AdminCellModal
            data={modal.data}
            role={currentUser?.role}
            user={currentUser}
            inspectors={inspectors}
            onClose={() => setModal(null)}
            onBook={() => setModal({ type: 'booking', data: modal.data })}
            onAddEvent={() =>
              setModal({
                type: 'special_modal',
                specialType: 'events',
                initialDate: modal.data.date,
                initialInspector: modal.data.inspector_name,
              })
            }
            onAddLeave={() => {
              const isInspector = currentUser?.role === 'inspector';
              const myInspectorName = isInspector ? getMyInspectorName(currentUser, inspectors) : '';
              if (
                isInspector &&
                myInspectorName &&
                modal.data.inspector_name.toLowerCase() !== myInspectorName.toLowerCase()
              ) {
                setAlertMsg(
                  `⚠️ บัญชีของคุณผูกกับสิทธิ์ผู้ตรวจ "${myInspectorName}"\nไม่สามารถจองวันลาให้ผู้ตรวจท่านอื่น (${modal.data.inspector_name}) ได้ ท่านสามารถจองวันลาได้เฉพาะตนเองเท่านั้น`
                );
                return;
              }
              setModal({
                type: 'special_modal',
                specialType: 'leaves',
                initialDate: modal.data.date,
                initialInspector: isInspector ? myInspectorName : modal.data.inspector_name,
              });
            }}
            onAddHoliday={() =>
              setModal({
                type: 'special_modal',
                specialType: 'holidays',
                initialDate: modal.data.date,
              })
            }
          />
        </div>
      )}

      {modal?.type === 'special_modal' && (
        <div className="backdrop z-[1300] p-2 sm:p-4 overflow-y-auto flex items-start sm:items-center justify-center">
          <SpecialModal
            type={modal.specialType}
            inspectors={inspectors}
            bookings={bookings}
            user={currentUser}
            initialDate={modal.initialDate}
            initialInspector={modal.initialInspector}
            onClose={() => setModal(null)}
            onAddSpecial={handleAddSpecial}
            onDeleteBooking={handleDeleteBooking}
            onBulkDelete={handleBulkDelete}
            setAlertMsg={setAlertMsg}
          />
        </div>
      )}

      {modal?.type === 'user_modal' && (
        <div className="backdrop z-[1300] p-2 sm:p-4 overflow-y-auto flex items-start sm:items-center justify-center">
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
        <div className="backdrop z-[1300] p-2 sm:p-4 overflow-y-auto flex items-start sm:items-center justify-center">
          <InspectorModal
            inspector={modal.data}
            onClose={() => setModal(null)}
            onSave={(name, productLines, oldName) => {
              const trimmedName = name.trim();
              const trimmedLines = productLines.trim();
              let nextInspectors: Inspector[];
              if (oldName) {
                nextInspectors = inspectors.map((i) =>
                  i.name === oldName
                    ? { ...i, name: trimmedName, product_lines: trimmedLines }
                    : i
                );
                logSystem('UPDATE INSPECTOR', `แก้ไขผู้ตรวจ ${trimmedName}`);
              } else {
                nextInspectors = [
                  ...inspectors,
                  { name: trimmedName, product_lines: trimmedLines, order: inspectors.length + 1 },
                ];
                logSystem('ADD INSPECTOR', `เพิ่มผู้ตรวจใหม่ ${trimmedName}`);
              }

              const reordered = nextInspectors.map((ins, idx) => ({
                ...ins,
                order: ins.order ?? idx + 1,
              }));

              setInspectors(reordered);
              saveInspectorsToStorage(reordered);
              firestoreSaveInspectors(reordered);

              // Synchronize bookings if inspector was renamed
              if (oldName && oldName !== trimmedName) {
                const updatedBookings = bookings.map((b) =>
                  b.inspector_name === oldName ? { ...b, inspector_name: trimmedName } : b
                );
                setBookings(updatedBookings);
                saveBookingsToStorage(updatedBookings);
                firestoreSaveBookings(updatedBookings);
              }

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
            firestoreBatchSaveNotifications(updated).catch(() => {});
          }}
          onMarkAllRead={() => {
            const updated = notifications.map((n) => ({ ...n, isRead: 'true' }));
            setNotifications(updated);
            saveNotifsToStorage(updated);
            firestoreBatchSaveNotifications(updated).catch(() => {});
          }}
          onClearAllNotifs={() => {
            setNotifications([]);
            saveNotifsToStorage([]);
          }}
        />
      )}

      {/* Alert Dialog */}
      {alertMsg && (
        <div className="backdrop z-[1400] p-3 sm:p-4 overflow-y-auto flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-2xl sm:rounded-3xl p-5 sm:p-6 text-center shadow-2xl animate-pop my-auto">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Icons.Alert />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1.5">แจ้งเตือน</h3>
            <p className="text-xs text-slate-600 mb-5 whitespace-pre-line leading-relaxed">{alertMsg}</p>
            <button
              onClick={() => setAlertMsg(null)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="backdrop z-[1400] p-3 sm:p-4 overflow-y-auto flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-2xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl animate-pop text-center my-auto">
            <h3 className="text-base font-bold text-slate-800 mb-2">ยืนยันการทำรายการ</h3>
            <div className="text-xs text-slate-600 mb-5 whitespace-pre-line leading-relaxed">{confirmDialog.msg}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-all"
              >
                ยกเลิก
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md cursor-pointer active:scale-95 transition-all"
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
        <div className="backdrop z-[1400] p-2 sm:p-4 overflow-y-auto flex items-start sm:items-center justify-center">
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

      {/* SAIS DATABASES Modal Window (Unified Database & Tracking OIL) */}
      {showSaisDatabases && (
        <SaisDatabasesModal
          bookings={bookings}
          inspectors={inspectors}
          users={users}
          currentUser={currentUser}
          cloudStatus={cloudStatus}
          initialTab={saisDatabasesTab}
          oilRecords={oilRecords}
          onClose={() => setShowSaisDatabases(false)}
          onSaveBooking={handleSaveBooking}
          onDeleteBooking={handleDeleteBooking}
        />
      )}

      {/* Advanced Admin Settings & Detailed Website Configuration Modal */}
      {showAdminSettingsModal && (
        <AdminSettingsModal
          settings={settings}
          inspectors={inspectors}
          users={users}
          bookings={bookings}
          currentUser={currentUser}
          onClose={() => setShowAdminSettingsModal(false)}
          onSaveSettings={(newSettings) => {
            setSettings(newSettings);
            saveSettingsToStorage(newSettings);
            firestoreSaveSettings(newSettings);
            setSuccessModal('บันทึกการตั้งค่าเว็บไซต์อย่างละเอียดสำเร็จ');
          }}
          onSaveInspectors={(newInspectors) => {
            setInspectors(newInspectors);
            saveInspectorsToStorage(newInspectors);
            firestoreSaveInspectors(newInspectors);
            setSuccessModal('บันทึกลำดับผู้ตรวจบนตารางสำเร็จ');
          }}
          onSaveUsers={(newUsers) => {
            setUsers(newUsers);
            saveUsersToStorage(newUsers);
            firestoreSaveUsers(newUsers);
            setSuccessModal('บันทึกข้อมูลผู้ใช้สำเร็จ');
          }}
          onOpenCloudSync={() => setCloudShareOpen(true)}
          setAlertMsg={setAlertMsg}
          columnZoom={columnZoom}
          setColumnZoom={setColumnZoom}
          tableFontScale={tableFontScale}
          setTableFontScale={setTableFontScale}
          specialFontScale={specialFontScale}
          setSpecialFontScale={setSpecialFontScale}
          onExportJPG={handleExportJPG}
        />
      )}
      {/* Universal Text & Vocabulary Editor Modal (Requirement 4) */}
      {showUniversalTextModal && (
        <UniversalTextModal
          customTexts={settings.customTexts || {}}
          onSaveTexts={(updated) => {
            const nextSettings = { ...settings, customTexts: updated };
            setSettings(nextSettings);
            saveSettingsToStorage(nextSettings);
            firestoreSaveSettings(nextSettings);
            logSystem('UPDATE TEXTS', 'บันทึกการแก้ไขข้อความในคลังข้อความสากล');
            setSuccessModal('บันทึกข้อความทั้งหมดเรียบร้อยแล้ว');
          }}
          onClose={() => setShowUniversalTextModal(false)}
        />
      )}
      </div>
    </LiveEditProvider>
  );
}
