import { useState, useEffect } from 'react';

export type Language = 'th' | 'en';

export const translations = {
  th: {
    // Header & Meta
    appName: 'ระบบจัดการคิวตรวจงาน SAIS',
    cloudRealtime: 'Firebase 100% เรียลไทม์คลาวด์',
    cloudConnected: 'เชื่อมต่อแล้ว 100%',
    cloudSyncing: 'กำลังซิงค์...',
    cloudOffline: 'ออฟไลน์',
    forceSync: 'บังคับซิงค์คลาวด์ทันที',
    thaiTime: 'เวลาประเทศไทย (ICT / UTC+7)',
    yearBE: 'พ.ศ.',
    
    // Top Bar Buttons
    newBooking: 'จองคิวงานใหม่',
    tutorialBtn: 'จำลองสอนใช้งาน',
    settingsBtn: 'การตั้งค่า & คลาวด์',
    login: 'เข้าสู่ระบบ',
    logout: 'ออกจากระบบ',
    userRole: 'สิทธิ์ผู้ใช้',
    
    // Nav Views
    viewDay: 'รายวัน',
    viewWeek: 'รายสัปดาห์',
    viewMonth: 'รายเดือน',
    viewTable: 'ตารางรวม',
    viewAdmin: 'สรุปสถิติ',
    today: 'วันนี้',
    trashHint: 'ลากมาที่นี่เพื่อลบ',
    
    // Actions & Common
    confirm: 'ยืนยัน',
    cancel: 'ยกเลิก',
    save: 'บันทึก',
    delete: 'ลบ',
    edit: 'แก้ไข',
    close: 'ปิด',
    search: 'ค้นหา',
    copy: 'คัดลอก',
    copied: 'คัดลอกแล้ว!',
    download: 'ดาวน์โหลด',
    exportJpg: 'ส่งออกภาพ JPG ตารางงาน',
    status: 'สถานะ',
    allInspectors: 'ผู้ตรวจทั้งหมด',
    
    // Booking Form
    bookingTitleNew: 'จองคิวตรวจงาน',
    bookingTitleEdit: 'แก้ไขข้อมูลคิวงาน',
    inspectionDate: 'วันที่ตรวจ',
    inspector: 'ผู้ตรวจ',
    siteName: 'ชื่อโครงการ / สถานที่',
    siteNamePlaceholder: 'เช่น อาคาร ซีพี ทาวเวอร์ 3 พญาไท',
    productLine: 'Product Line',
    jobType: 'ประเภทงาน',
    area: 'พื้นที่',
    siteTel: 'เบอร์โทรหน้างาน',
    googleMapLink: 'ลิงก์ / พิกัด Google Maps',
    pinOnMap: 'ปักหมุดบนแผนที่ Google Maps',
    pinOnMapHint: 'คลิกเพื่อเลือกตำแหน่งพิกัดและปักหมุดนำทาง',
    testMapNav: 'ทดสอบเปิด Google Maps นำทาง',
    
    // Mandatory Documents
    mandatoryDocsHeader: 'อัปโหลดเอกสารบังคับ (ต้องครบ 3 อย่าง)',
    mandatoryNotice: 'ระบบกำหนดให้ต้องแนบเอกสารให้ครบทั้ง 3 รายการก่อนจึงจะสามารถกดยืนยันการจองคิวงานได้',
    docLayout: 'แบบ Layout',
    docWiring: 'Single Line / Wiring Diagram',
    docPrecheck: 'ผล Pre-check ก่อนเข้างาน',
    docComplete: 'เอกสารครบ 3/3 รายการแล้ว',
    docIncomplete: 'เอกสารยังไม่ครบ',
    missingDocsNotice: 'ยังขาดเอกสาร:',
    scanWithCamera: 'สแกนด้วยกล้อง',
    uploadFile: 'อัปโหลดไฟล์',
    
    // Site Conditions
    siteConditionsHeader: 'รูปภาพสภาพหน้างาน (6 จุดสำคัญ)',
    siteConditionsHint: 'สามารถถ่ายรูปหรือแนบภาพเพิ่มเติมได้ทั้งก่อนและหลังตรวจงาน',
    cond1: '1. หน้าตู้คอนโทรล',
    cond2: '2. บนหลังคาลิฟต์',
    cond3: '3. ด้านบนปล่อง',
    cond4: '4. ก้นบ่อลิฟต์',
    cond5: '5. ภายในตู้ลิฟต์',
    cond6: '6. หน้าชั้นและรอบวงกบประตูนอก',
    
    // Detail Modal
    jobDetails: 'รายละเอียดคิวงาน',
    jobShareTitle: 'ลิงก์ตรงและข้อมูลงาน',
    jobShareDesc: 'คัดลอกลิงก์ตรงของคิวงานนี้เพื่อส่งต่อให้ผู้ตรวจหรือทีมงานเปิดดูรายละเอียดได้ทันที',
    copyJobLink: 'คัดลอกลิงก์งาน',
    navGoogleMaps: 'เปิด Google Maps นำทางไปยังไซต์งาน',
    coordinates: 'พิกัด GPS',
    verifyDoc: 'อนุมัติเอกสาร',
    unverifyDoc: 'รอตรวจสอบ',
    
    // Map Pinning Modal
    mapModalTitle: 'ปักหมุดตำแหน่งไซต์งานบน Google Maps',
    mapModalSubtitle: 'คลิกบนแผนที่เพื่อปักหมุด ค้นหาสถานที่ หรือใช้พิกัดปัจจุบัน',
    searchPlacePlaceholder: 'ค้นหาสถานที่ อาคาร ถนน จังหวัด...',
    useGpsLocation: 'ใช้ตำแหน่ง GPS ปัจจุบันของฉัน',
    gpsLocating: 'กำลังระบุพิกัด...',
    latLngDisplay: 'พิกัดปัจจุบัน:',
    confirmPin: 'บันทึกหมุดตำแหน่งนี้',
    presetLocations: 'สถานที่ด่วน:',
    
    // Tutorial & Simulation
    tutorialModalTitle: 'ระบบจำลองการทำงานและคู่มือการใช้งาน (Tutorial)',
    tutorialModeSim: 'จำลองการใช้งานจริง (Simulation)',
    tutorialModeDoc: 'คู่มือระบบทุกฟังก์ชัน (Handbook)',
    autoPlay: 'เล่นอัตโนมัติ',
    pause: 'หยุดชั่วคราว',
    prevStep: 'ย้อนกลับ',
    nextStep: 'ขั้นตอนถัดไป',
    step: 'ขั้นตอนที่',
    finishTutorial: 'เสร็จสิ้นการสอน',
    restartTutorial: 'เริ่มใหม่อีกครั้ง',
    
    // Settings Modal
    settingsTitle: 'การตั้งค่ามุมมองและระบบ',
    cloudSection: 'สถานะฐานข้อมูลคลาวด์',
    themeColor: 'สีกรอบและธีม',
    tableScale: 'ขนาดความกว้างคอลัมน์',
    cardRadius: 'ความโค้งมนการ์ด',
    languageSetting: 'ภาษาของระบบ (Language)',
  },
  en: {
    // Header & Meta
    appName: 'SAIS Inspection Booking System',
    cloudRealtime: 'Firebase 100% Realtime Cloud',
    cloudConnected: 'Connected 100%',
    cloudSyncing: 'Syncing...',
    cloudOffline: 'Offline',
    forceSync: 'Force Cloud Sync Now',
    thaiTime: 'Thailand Time (ICT / UTC+7)',
    yearBE: 'BE',
    
    // Top Bar Buttons
    newBooking: 'Book New Job',
    tutorialBtn: 'Tutorial & Sim',
    settingsBtn: 'Settings & Cloud',
    login: 'Login',
    logout: 'Logout',
    userRole: 'Role',
    
    // Nav Views
    viewDay: 'Daily',
    viewWeek: 'Weekly',
    viewMonth: 'Monthly',
    viewTable: 'Table View',
    viewAdmin: 'Dashboard',
    today: 'Today',
    trashHint: 'Drag here to delete',
    
    // Actions & Common
    confirm: 'Confirm',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    search: 'Search',
    copy: 'Copy',
    copied: 'Copied!',
    download: 'Download',
    exportJpg: 'Export Schedule JPG',
    status: 'Status',
    allInspectors: 'All Inspectors',
    
    // Booking Form
    bookingTitleNew: 'Book Inspection Queue',
    bookingTitleEdit: 'Edit Inspection Booking',
    inspectionDate: 'Inspection Date',
    inspector: 'Inspector',
    siteName: 'Project / Site Name',
    siteNamePlaceholder: 'e.g. CP Tower 3 Phayathai Building',
    productLine: 'Product Line',
    jobType: 'Job Type',
    area: 'Area',
    siteTel: 'Site Contact Phone',
    googleMapLink: 'Google Maps Link / Coordinates',
    pinOnMap: 'Pin on Google Maps',
    pinOnMapHint: 'Click to select coordinates and pin for direct navigation',
    testMapNav: 'Test Google Maps Navigation',
    
    // Mandatory Documents
    mandatoryDocsHeader: 'Mandatory Documents Upload (All 3 required)',
    mandatoryNotice: 'All 3 required documents must be attached before confirming the booking.',
    docLayout: 'Layout Drawing',
    docWiring: 'Single Line / Wiring Diagram',
    docPrecheck: 'Pre-check Inspection Form',
    docComplete: 'All 3/3 documents attached',
    docIncomplete: 'Documents incomplete',
    missingDocsNotice: 'Missing documents:',
    scanWithCamera: 'Scan with Camera',
    uploadFile: 'Upload File',
    
    // Site Conditions
    siteConditionsHeader: 'Site Conditions (6 Key Checkpoints)',
    siteConditionsHint: 'Capture or upload additional site photos before and after inspection.',
    cond1: '1. Control Cabinet',
    cond2: '2. Elevator Car Roof',
    cond3: '3. Hoistway Top',
    cond4: '4. Elevator Pit',
    cond5: '5. Inside Elevator Car',
    cond6: '6. Landing Doors & Frames',
    
    // Detail Modal
    jobDetails: 'Job Inspection Details',
    jobShareTitle: 'Job Direct Link & Quick Actions',
    jobShareDesc: 'Copy direct URL of this job to quickly share with inspectors or site team.',
    copyJobLink: 'Copy Job Link',
    navGoogleMaps: 'Open Google Maps Navigation to Site',
    coordinates: 'GPS Coordinates',
    verifyDoc: 'Approve Document',
    unverifyDoc: 'Pending Review',
    
    // Map Pinning Modal
    mapModalTitle: 'Pin Site Location on Google Maps',
    mapModalSubtitle: 'Click on the map to pin, search for places, or use your current GPS location',
    searchPlacePlaceholder: 'Search building, street, province...',
    useGpsLocation: 'Use My Current GPS Location',
    gpsLocating: 'Locating GPS...',
    latLngDisplay: 'Current Coordinates:',
    confirmPin: 'Confirm Pin Location',
    presetLocations: 'Quick Locations:',
    
    // Tutorial & Simulation
    tutorialModalTitle: 'System Simulation & Interactive Tutorial',
    tutorialModeSim: 'Interactive Simulation',
    tutorialModeDoc: 'Complete System Handbook',
    autoPlay: 'Auto-Play',
    pause: 'Pause',
    prevStep: 'Previous',
    nextStep: 'Next Step',
    step: 'Step',
    finishTutorial: 'Finish Tutorial',
    restartTutorial: 'Restart Tutorial',
    
    // Settings Modal
    settingsTitle: 'View & System Settings',
    cloudSection: 'Cloud Database Status',
    themeColor: 'Color & Theme',
    tableScale: 'Column Width Scale',
    cardRadius: 'Card Radius',
    languageSetting: 'System Language',
  },
};

const LANG_STORAGE_KEY = 'sais_language_preference';

export const getStoredLanguage = (): Language => {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'th') return saved;
  } catch (e) {
    // ignore
  }
  return 'th';
};

export const setStoredLanguage = (lang: Language): void => {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch (e) {
    // ignore
  }
};

export function useTranslation() {
  const [lang, setLang] = useState<Language>(getStoredLanguage);

  useEffect(() => {
    const handleStorage = () => {
      setLang(getStoredLanguage());
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const changeLang = (newLang: Language) => {
    setLang(newLang);
    setStoredLanguage(newLang);
    window.dispatchEvent(new Event('storage'));
  };

  const t = translations[lang];

  return { lang, changeLang, setLanguage: changeLang, t };
}
