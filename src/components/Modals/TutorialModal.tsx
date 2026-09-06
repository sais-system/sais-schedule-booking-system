import React, { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import { Language, translations } from '../../i18n';

interface TutorialModalProps {
  lang?: Language;
  onClose: () => void;
  onStartBookingDemo?: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({
  lang = 'th',
  onClose,
  onStartBookingDemo,
}) => {
  const t = translations[lang];
  const [activeTab, setActiveTab] = useState<'simulation' | 'handbook'>('simulation');
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [handbookSearch, setHandbookSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  // Simulation steps
  const simulationSteps = [
    {
      title: lang === 'th' ? '1. ภาพรวมระบบและปฏิทินไทย (System Overview)' : '1. System Overview & Calendar',
      icon: <Icons.Clock size={20} className="text-blue-500" />,
      desc:
        lang === 'th'
          ? 'ระบบรองรับปี พ.ศ. ของไทย พร้อมนาฬิกาเรียลไทม์ประเทศไทย (ICT / UTC+7) สามารถสลับมุมมองได้ทั้งแบบรายวัน รายสัปดาห์ รายเดือน และตารางรวม'
          : 'Supports Thailand Buddhist Era (BE) calendar with real-time Thailand Clock (ICT / UTC+7), switchable between Day, Week, Month, and Table views.',
      highlights: [
        lang === 'th' ? 'นาฬิกาเวลาจริงประเทศไทยพร้อมวันที่ พ.ศ.' : 'Thailand Real-time clock with BE year',
        lang === 'th' ? 'แยกแถวตามรายชื่อผู้ตรวจ (Inspector Rows)' : 'Dedicated rows per inspector',
        lang === 'th' ? 'สลับภาษา TH / EN ได้ตลอดเวลา' : 'Switch TH / EN anytime',
      ],
      previewType: 'overview',
    },
    {
      title: lang === 'th' ? '2. จำลองการจองคิวและปักหมุด Google Maps' : '2. Simulated Booking & Map Pinning',
      icon: <Icons.MapPin size={20} className="text-red-500" />,
      desc:
        lang === 'th'
          ? 'การจองคิวตรวจงานใหม่: ระบุชื่อโครงการ, Equipment No., Product Line และกด "ปักหมุดบนแผนที่ Google Maps" เพื่อเลือกพิกัดไซต์งานและสร้างลิงก์นำทางอัตโนมัติ'
          : 'Book inspection: fill site name, equipment number, product line, and click "Pin on Google Maps" to set GPS coordinates and direct route navigation.',
      highlights: [
        lang === 'th' ? 'ค้นหาชื่ออาคาร หรือใช้ GPS พิกัดปัจจุบัน' : 'Search landmark or use GPS location',
        lang === 'th' ? 'คลิกย้ายหมุดบนแผนที่ได้อิสระ' : 'Click freely to reposition map pin',
        lang === 'th' ? 'ปุ่มทดสอบเปิด Google Maps นำทาง 1 คลิก' : '1-click test navigation button',
      ],
      previewType: 'booking_map',
    },
    {
      title: lang === 'th' ? '3. เงื่อนไขเอกสารบังคับ 100% & กล้องสแกน' : '3. 100% Mandatory Docs & Scanner',
      icon: <Icons.Camera size={20} className="text-emerald-500" />,
      desc:
        lang === 'th'
          ? 'ระบบมีระบบความปลอดภัยตรวจสอบเอกสาร: ต้องแนบครบทั้ง 3 รายการ (แบบ Layout, Single Line/Wiring, ใบ Pre-check) ก่อนจึงจะสามารถกดยืนยันการจองได้ พร้อมสลับกล้องหน้า/กล้องหลังและเปิดไฟฉายได้'
          : 'Strict requirement: Layout, Wiring, and Pre-check forms must be 100% attached to confirm booking. Supports front/back camera switch and torch.',
      highlights: [
        lang === 'th' ? 'สลับกล้องหน้า/กล้องหลัง และเปิดไฟฉาย' : 'Front/Back camera switch + torch',
        lang === 'th' ? 'ระบบตรวจความครบถ้วน 3/3 รายการ' : 'Validation checklist (3/3 docs required)',
        lang === 'th' ? 'รองรับรูปสภาพหน้างาน 6 จุดสำคัญ' : '6 Site condition photo points',
      ],
      previewType: 'camera_docs',
    },
    {
      title: lang === 'th' ? '4. ระบบค้นหา กรองข้อมูล & บันทึกประวัติ' : '4. Smart Search, Filters & Audit Trail',
      icon: <Icons.Search size={20} className="text-purple-500" />,
      desc:
        lang === 'th'
          ? 'ค้นหาคิวงานทันทีด้วยชื่อโครงการ, เลขอุปกรณ์ (Equipment No.) หรือเบอร์โทร พร้อมกรองแยกตามผู้ตรวจและสายผลิตภัณฑ์ และมีระบบ Audit Log บันทึกประวัติความเคลื่อนไหวทุกรายการ'
          : 'Instantly search by site name, Equipment No, or phone. Filter by inspector or product line with automatic audit trail logs of every modification.',
      highlights: [
        lang === 'th' ? 'ค้นหาด่วนแบบ Real-time ตามคำสำคัญ' : 'Instant real-time keyword search',
        lang === 'th' ? 'กรองแยกตามผู้ตรวจ หรือรุ่นผลิตภัณฑ์' : 'Filter by inspector or product line badge',
        lang === 'th' ? 'บันทึกประวัติสร้าง/แก้ไข/ลบงานอัตโนมัติ' : 'Full system activity audit trail logs',
      ],
      previewType: 'search_filter',
    },
    {
      title: lang === 'th' ? '5. ลาก-วางย้ายตาราง (Drag & Drop) & ถังขยะ' : '5. Drag & Drop & Trash Bin',
      icon: <Icons.List size={20} className="text-amber-500" />,
      desc:
        lang === 'th'
          ? 'สามารถคลิกลากการ์ดงานเพื่อย้ายไปยังผู้ตรวจท่านอื่น หรือย้ายไปยังวันที่ต้องการได้อย่างสะดวกรวดเร็ว หรือลากลงถังขยะด้านล่างเพื่อลบงาน'
          : 'Drag cards between inspector rows or dates to reschedule, or drop onto the bottom trash bin to remove the booking.',
      highlights: [
        lang === 'th' ? 'ลากเปลี่ยนผู้ตรวจหรือเปลี่ยนวันที่ทันที' : 'Drag to swap inspector or date instantly',
        lang === 'th' ? 'ถังขยะมีแอนิเมชันขยายตอบสนองเมื่อลากมาโดน' : 'Interactive animated trash target',
        lang === 'th' ? 'อัปเดตข้อมูลบนคลาวด์แบบเรียลไทม์' : 'Instant cloud synchronization',
      ],
      previewType: 'dragdrop',
    },
    {
      title: lang === 'th' ? '6. การตั้งค่าระบบ & Cloud Firestore 100%' : '6. Settings & Realtime Cloud Sync',
      icon: <Icons.Cloud size={20} className="text-cyan-500" />,
      desc:
        lang === 'th'
          ? 'ระบบเชื่อมต่อ Firebase Firestore 100% เรียลไทม์ ซิงค์ข้อมูลทุกการกระทำทันที พร้อมเมนูตั้งค่าขนาดความกว้างคอลัมน์ ความโค้งมนการ์ด และส่งออกตารางเป็นภาพ JPG'
          : '100% Realtime Cloud Firestore integration. Synchronizes all actions instantly with column sizing, card radius customization, and JPG export.',
      highlights: [
        lang === 'th' ? 'ฐานข้อมูล Cloud Firestore เรียลไทม์ 100%' : '100% Realtime Cloud Firestore',
        lang === 'th' ? 'ส่งออกตารางงานรายสัปดาห์/รายวันเป็น JPG' : 'Export schedule as high-res JPG image',
        lang === 'th' ? 'ปรับแต่งขนาดตารางและสีกรอบได้ตามต้องการ' : 'Customizable grid column width and theme',
      ],
      previewType: 'settings_cloud',
    },
  ];

  // Auto-play timer
  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= simulationSteps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 4500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, simulationSteps.length]);

  // Handbook Articles
  const handbookArticles = [
    {
      id: 'booking',
      category: 'booking',
      title: lang === 'th' ? 'วิธีการลงจองคิวตรวจงานใหม่' : 'How to Book an Inspection Queue',
      content:
        lang === 'th'
          ? [
              '1. กดปุ่ม "+ จองคิวงานใหม่" ที่แถบเมนูด้านบน หรือดับเบิลคลิกที่ช่องวันที่ของผู้ตรวจที่ต้องการ',
              '2. เลือกประเภทงาน (New, MOD, Re-ins) และเลือก Product Line ของลิฟต์หรือบันไดเลื่อน',
              '3. กรอก Equipment No. (เช่น 11732041), Unit No. และชื่อโครงการสถานที่ติดตั้ง',
              '4. กรอกเบอร์ติดต่อหน้างาน (10 หลัก)',
              '5. กดปุ่ม "ปักหมุดบนแผนที่ Google Maps" เพื่อเลือกตำแหน่งไซต์งานจริง หรือพิมพ์พิกัด GPS',
              '6. แนบเอกสารบังคับทั้ง 3 รายการให้ครบถ้วน 100% ก่อนกดยืนยันการจอง',
            ]
          : [
              '1. Click "+ Book New Job" in the top bar or double click any date cell in an inspector row.',
              '2. Select Job Type (New, MOD, Re-ins) and Product Line of the elevator/escalator.',
              '3. Enter Equipment No. (e.g. 11732041), Unit No., and Project Site Name.',
              '4. Enter Site Contact Phone Number (10 digits).',
              '5. Click "Pin on Google Maps" to locate the site coordinates and generate navigation.',
              '6. Attach all 3 mandatory documents 100% before clicking Confirm Booking.',
            ],
    },
    {
      id: 'map_pinning',
      category: 'map',
      title: lang === 'th' ? 'การปักหมุด Google Maps และการนำทาง' : 'Google Maps Pinning & Navigation',
      content:
        lang === 'th'
          ? [
              '1. ในฟอร์มจองคิว กดปุ่ม "เปิดแผนที่เพื่อปักหมุด" หรือ "แก้ไขตำแหน่งหมุด"',
              '2. ใช้ช่องค้นหาเพื่อพิมพ์ชื่ออาคาร ถนน หรือเลือกจาก "สถานที่ด่วน" ที่มีเตรียมไว้ให้',
              '3. สามารถกดปุ่ม "📍 ใช้ตำแหน่ง GPS ปัจจุบันของฉัน" เพื่อดึงพิกัดจริงจากอุปกรณ์',
              '4. คลิกที่ใดก็ได้บนผืนแผนที่เพื่อเลื่อนหมุดไปยังจุดที่แม่นยำ',
              '5. กด "บันทึกหมุดตำแหน่งนี้" เพื่อบันทึกพิกัด ละติจูด/ลองจิจูด และลิงก์ Google Maps',
              '6. ผู้ตรวจสามารถกดปุ่ม "เปิด Google Maps นำทาง" ในหน้ารายละเอียดเพื่อเปิดแอป Google Maps นำทางขับรถได้ทันที',
            ]
          : [
              '1. In the booking modal, click "Pin on Google Maps" or "Edit Pin Location".',
              '2. Use the search box to find buildings, streets, or select from quick preset landmarks.',
              '3. Click "Use My Current GPS Location" to retrieve current device coordinates.',
              '4. Click anywhere on the map frame to reposition the pin marker precisely.',
              '5. Click "Confirm Pin Location" to store coordinates and Google Maps search link.',
              '6. Inspectors can click "Open Google Maps Navigation" in DetailModal to launch driving directions.',
            ],
    },
    {
      id: 'camera',
      category: 'camera',
      title: lang === 'th' ? 'การใช้กล้องหน้า/กล้องหลังสแกนเอกสาร' : 'Using Front/Back Camera Document Scanner',
      content:
        lang === 'th'
          ? [
              '1. กดปุ่ม "สแกนด้วยกล้อง" ข้างเอกสารที่ต้องการ (Layout, Wiring, Pre-check หรือภาพหน้างาน)',
              '2. เลือกว่าจะใช้ "กล้องหน้า (Front)" หรือ "กล้องหลัง (Back)"',
              '3. หากใช้งานบนมือถือในที่มืด สามารถกดปุ่ม "เปิดไฟฉาย (Torch)" เพื่อช่วยให้ภาพสว่างคมชัด',
              '4. กดถ่ายภาพ ตรวจสอบพรีวิวภาพ และกดยืนยันเพื่อบันทึกเข้าสู่ระบบ',
              '5. ระบบจะทำการบีบอัดรูปภาพอัตโนมัติเพื่อให้เปิดได้อย่างรวดเร็วและประหยัดพื้นที่จัดเก็บ',
            ]
          : [
              '1. Click "Scan with Camera" next to any required document or site condition point.',
              '2. Switch between "Front Camera" and "Back Camera" as needed.',
              '3. On supported mobile devices, toggle the "Torch / Flashlight" for clear scanning in dark areas.',
              '4. Capture the frame, preview the image, and confirm to save.',
              '5. The system automatically compresses images for rapid loading and cloud optimization.',
            ],
    },
    {
      id: 'search',
      category: 'search',
      title: lang === 'th' ? 'การค้นหา กรองข้อมูล และบันทึกประวัติ (Audit Trail)' : 'Search, Filter & System Logs',
      content:
        lang === 'th'
          ? [
              '1. พิมพ์คำค้นหาในช่อง "ค้นหา..." เพื่อกรองงานตามชื่อไซต์, หมายเลข Equipment No., หรือเบอร์โทรศัพท์ทันที',
              '2. ใช้แถบตัวกรอง (Filters) เพื่อดูเฉพาะงานของผู้ตรวจที่ต้องการ หรือแยกตามโมเดลสินค้า (เช่น ES1, 5500)',
              '3. สลับดูงานตามประเภท: งานติดตั้งใหม่ (New), งานปรับปรุง (MOD) หรืองานตรวจซ้ำ (Re-inspection)',
              '4. ทุกการสร้างคิวงาน การแก้ไข การเปลี่ยนผู้ตรวจ หรือการลบงาน จะถูกบันทึกลงในระบบบันทึกประวัติ (System Logs) อย่างละเอียด',
              '5. ผู้ดูแลระบบสามารถกดดูประวัติย้อนหลังได้จากเมนูด้านบนเพื่อความโปร่งใสและตรวจสอบได้ 100%',
            ]
          : [
              '1. Type in the search box to filter instantly by project site, equipment number, or contact phone.',
              '2. Use filter chips to narrow down by specific inspector or elevator product line model.',
              '3. Filter jobs by type: New Installation, Modernization (MOD), or Re-inspection.',
              '4. Every action (booking creation, editing, inspector change, status update, deletion) is logged in the Audit Trail.',
              '5. Administrators can review historical activity logs at any time for 100% transparency.',
            ],
    },
    {
      id: 'dragdrop',
      category: 'calendar',
      title: lang === 'th' ? 'การลาก-วาง (Drag & Drop) และถังขยะ' : 'Drag & Drop Scheduling & Trash',
      content:
        lang === 'th'
          ? [
              '1. คลิกค้างที่การ์ดงาน แล้วลากไปยังช่องวันที่หรือผู้ตรวจคนอื่นเพื่อเปลี่ยนคิวงานทันที',
              '2. เมื่อลากไปวาง ระบบจะบันทึกและซิงค์ขึ้นสู่ Cloud Firestore ทันที',
              '3. หากต้องการลบคิวงาน สามารถลากการ์ดมาวางลงในช่อง "ถังขยะ" สีแดงด้านล่างสุดของหน้าจอ',
              '4. ผู้ดูแลระบบสามารถกู้คืนงานที่ลบได้จากปุ่ม "ถังขยะ" ในแถบมุมมอง',
            ]
          : [
              '1. Click and hold any job card, then drag it to another date or inspector row.',
              '2. Once dropped, the system saves and syncs changes to Cloud Firestore immediately.',
              '3. To delete a job, drag the card into the red "Trash" zone at the bottom of the screen.',
              '4. Admins can restore deleted jobs from the Trash view tab.',
            ],
    },
    {
      id: 'cloud',
      category: 'cloud',
      title: lang === 'th' ? 'ระบบฐานข้อมูล Cloud Firestore 100%' : '100% Realtime Cloud Firestore',
      content:
        lang === 'th'
          ? [
              '1. ระบบเชื่อมต่อกับ Firebase Firestore แบบ Realtime Listener ตลอดเวลา',
              '2. มีป้ายแสดงสถานะ "Firebase 100% เรียลไทม์คลาวด์" พร้อมจุดสีเขียวกะพริบที่ส่วนหัวของระบบ',
              '3. หากสัญญาณเน็ตขัดข้อง ข้อมูลจะถูกจัดเก็บในเครื่องและซิงค์ขึ้นคลาวด์ทันทีที่กลับมาออนไลน์',
              '4. สามารถกดปุ่ม "บังคับซิงค์คลาวด์ทันที" ในเมนูตั้งค่าเพื่อรีเฟรชข้อมูลล่าสุดได้ทุกเมื่อ',
            ]
          : [
              '1. Connected to Firebase Firestore with 24/7 Realtime Listeners.',
              '2. Status badge "Firebase 100% Realtime Cloud" with pulsating green dot indicates live connectivity.',
              '3. If internet drops, data is queued locally and automatically synced upon reconnection.',
              '4. You can click "Force Cloud Sync Now" inside Settings anytime to refresh latest data.',
            ],
    },
  ];

  const filteredHandbook = handbookArticles.filter((item) => {
    const matchCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchSearch =
      item.title.toLowerCase().includes(handbookSearch.toLowerCase()) ||
      item.content.some((line) => line.toLowerCase().includes(handbookSearch.toLowerCase()));
    return matchCategory && matchSearch;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white ring-2 ring-white/20">
              <Icons.GraduationCap size={22} />
            </div>
            <div>
              <h3 className="text-base md:text-lg font-bold leading-tight flex items-center gap-2">
                {t.tutorialModalTitle}
              </h3>
              <p className="text-xs text-blue-200/90">
                {lang === 'th'
                  ? 'ระบบจำลองการทำงานจริง และคู่มืออธิบายฟังก์ชันทุกส่วนของระบบ'
                  : 'Interactive workflow simulator and complete system feature handbook'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab('simulation')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'simulation'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icons.Play size={14} /> {t.tutorialModeSim}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('handbook')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'handbook'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icons.BookOpen size={14} /> {t.tutorialModeDoc}
            </button>
          </div>

          {activeTab === 'simulation' ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPlaying(!isPlaying)}
                className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors ${
                  isPlaying
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700'
                }`}
              >
                {isPlaying ? <Icons.Pause size={13} /> : <Icons.Play size={13} />}
                {isPlaying ? t.pause : t.autoPlay}
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                type="text"
                placeholder={lang === 'th' ? 'ค้นหาคู่มือ...' : 'Search handbook...'}
                value={handbookSearch}
                onChange={(e) => setHandbookSearch(e.target.value)}
                className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:border-blue-400 w-44 md:w-56"
              />
              <span className="absolute left-2.5 top-2 text-slate-400">
                <Icons.Search />
              </span>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'simulation' ? (
            /* ================= SIMULATION MODE ================= */
            <div className="space-y-6">
              {/* Step indicator pills */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {simulationSteps.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCurrentStep(idx);
                      setIsPlaying(false);
                    }}
                    className={`p-2 rounded-xl text-center border text-xs font-bold transition-all flex flex-col items-center gap-1 ${
                      currentStep === idx
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm ring-2 ring-blue-400/20'
                        : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <span>{s.icon}</span>
                    <span className="truncate text-[10px] w-full">{s.title.split(' ')[1] || s.title}</span>
                  </button>
                ))}
              </div>

              {/* Current Step Interactive Card */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-5 rounded-2xl border border-blue-100 shadow-sm">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center">
                      {simulationSteps[currentStep].icon}
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-blue-600">
                        {t.step} {currentStep + 1} / {simulationSteps.length}
                      </span>
                      <h4 className="text-base font-bold text-slate-900 leading-tight">
                        {simulationSteps[currentStep].title}
                      </h4>
                    </div>
                  </div>

                  <span className="text-xs bg-white px-3 py-1 rounded-full font-bold text-slate-600 border border-slate-200 shadow-2xs">
                    {lang === 'th' ? 'จำลองระบบ' : 'Simulation'}
                  </span>
                </div>

                <p className="text-xs md:text-sm text-slate-700 leading-relaxed mb-4">
                  {simulationSteps[currentStep].desc}
                </p>

                {/* Simulated Interactive Preview Box */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-inner mb-4 overflow-hidden">
                  {currentStep === 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-slate-900 text-white rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span>
                          <span className="font-mono text-sm font-bold">14:30:45 ICT</span>
                          <span className="text-[10px] bg-red-600 px-2 py-0.5 rounded font-bold">LIVE THAI TIME</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="bg-blue-600 px-2 py-0.5 rounded font-bold">2569 พ.ศ.</span>
                          <span className="bg-white/10 px-2 py-0.5 rounded font-bold">🇹🇭 TH | 🇬🇧 EN</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        {['รายวัน (Day)', 'รายสัปดาห์ (Week)', 'รายเดือน (Month)', 'ตารางรวม (Table)'].map((v, i) => (
                          <div
                            key={i}
                            className={`p-2 rounded-lg font-bold border ${
                              i === 1
                                ? 'bg-blue-600 text-white border-blue-600 shadow'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {v}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold text-blue-800 block">จำลองข้อมูลที่กรอก:</span>
                          <span className="font-bold text-xs text-slate-800">
                            โครงการ: อาคาร ซีพี ทาวเวอร์ 3 พญาไท | Eq No. 11732041 | Product: ES1
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] px-2.5 py-1 bg-red-100 text-red-700 rounded-lg font-bold flex items-center gap-1 border border-red-200">
                            <Icons.MapPin size={12} /> ปักหมุด: 13.758400, 100.534900
                          </span>
                        </div>
                      </div>

                      <div className="relative h-28 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]"></div>
                        <div className="relative flex flex-col items-center animate-bounce">
                          <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded shadow">
                            📍 CP Tower 3 Phayathai
                          </span>
                          <Icons.MapPin size={28} className="text-red-600 drop-shadow" />
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <span className="text-[10px] bg-emerald-600 text-white px-2.5 py-1 rounded-lg font-bold shadow flex items-center gap-1">
                            <Icons.Navigation size={10} /> นำทาง Google Maps
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-3">
                      <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200 text-xs font-bold text-amber-800 flex items-center justify-between">
                        <span>⚠️ เงื่อนไขความปลอดภัย: ต้องแนบเอกสารให้ครบ 100% (3/3 อย่าง)</span>
                        <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded font-bold">
                          ✓ ครบถ้วน
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { name: '1. แบบ Layout', status: '✓ แนบแล้ว', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                          { name: '2. Single Line', status: '✓ แนบแล้ว', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                          { name: '3. ใบ Pre-check', status: '✓ แนบแล้ว', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
                        ].map((d, i) => (
                          <div key={i} className={`p-2.5 rounded-xl border text-center ${d.color}`}>
                            <span className="text-[11px] font-bold block">{d.name}</span>
                            <span className="text-[10px] font-black">{d.status}</span>
                          </div>
                        ))}
                      </div>

                      <div className="p-2 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs px-3">
                        <span className="flex items-center gap-1.5 text-[11px]">
                          <Icons.Camera size={14} className="text-blue-400" />
                          รองรับการสลับกล้องหน้า/กล้องหลัง + เปิดไฟฉาย (Torch)
                        </span>
                        <span className="text-[10px] bg-blue-600 px-2 py-0.5 rounded font-bold">Active</span>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-3">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 pb-2.5 border-b border-slate-700">
                        <div className="w-full sm:w-auto flex-1 flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                          <Icons.Search size={14} className="text-slate-400" />
                          <span className="text-xs font-mono text-emerald-400">"S-villas"</span>
                          <span className="text-[10px] text-slate-400">| ค้นพบ 3 รายการ</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-md font-bold">
                            Product: S-villas
                          </span>
                          <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-md font-bold">
                            Type: New
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">โครงการ สิริ เพลส ลาดพร้าว</span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">S-villas</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-mono">EQ: 11094821 • ผู้ตรวจ: ชูศักดิ์</span>
                        </div>
                        <div className="bg-slate-800/90 p-2.5 rounded-lg border border-slate-700 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">วิลล่า มาร์เก็ต สุขุมวิท 49</span>
                            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded">S-villas</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-mono">EQ: 11094822 • ผู้ตรวจ: วันชัย</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                          <span className="text-[10px] font-bold text-blue-700 block mb-1">ผู้ตรวจ: ชูศักดิ์</span>
                          <div className="bg-white p-2 rounded-lg border border-blue-300 shadow-sm text-xs font-bold text-slate-800 flex items-center justify-between">
                            <span>🏢 อาคาร ซีพี ทาวเวอร์ 3</span>
                            <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded">ES1</span>
                          </div>
                        </div>

                        <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-300 flex items-center justify-center text-xs font-bold text-slate-400">
                          ลากการ์ดมาวางที่นี่เพื่อย้ายคิว ➔
                        </div>
                      </div>

                      <div className="p-2.5 bg-red-50 rounded-xl border border-red-200 flex items-center justify-center gap-2 text-red-700 font-bold text-xs">
                        <Icons.Trash /> ถังขยะลบคิวงาน (ลากการ์ดมาวางเพื่อลบ)
                      </div>
                    </div>
                  )}

                  {currentStep === 5 && (
                    <div className="space-y-2 text-xs">
                      <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="font-bold text-xs">Firebase Firestore 100% Realtime Cloud</span>
                        </div>
                        <span className="bg-emerald-500 text-slate-900 font-black text-[10px] px-2 py-0.5 rounded">
                          ONLINE & SYNCED
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                        <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                          ส่งออกตารางภาพ JPG
                        </div>
                        <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                          ปรับความกว้างคอลัมน์
                        </div>
                        <div className="p-2 bg-slate-100 rounded-lg border border-slate-200">
                          สลับภาษา TH / EN
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Highlights List */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    {lang === 'th' ? 'จุดเด่นของฟังก์ชันนี้:' : 'Key Highlights:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {simulationSteps[currentStep].highlights.map((h, i) => (
                      <div
                        key={i}
                        className="bg-white p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 flex items-center gap-2"
                      >
                        <Icons.Check />
                        <span className="text-[11px]">{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Step Navigation Controls */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  disabled={currentStep === 0}
                  onClick={() => {
                    setCurrentStep((prev) => Math.max(0, prev - 1));
                    setIsPlaying(false);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-40 transition-colors"
                >
                  <Icons.ChevronLeft size={16} /> {t.prevStep}
                </button>

                <div className="flex items-center gap-1.5">
                  {simulationSteps.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCurrentStep(i);
                        setIsPlaying(false);
                      }}
                      className={`w-2.5 h-2.5 rounded-full transition-all ${
                        currentStep === i ? 'w-7 bg-blue-600' : 'bg-slate-300'
                      }`}
                    />
                  ))}
                </div>

                {currentStep < simulationSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setCurrentStep((prev) => prev + 1);
                      setIsPlaying(false);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    {t.nextStep} <Icons.ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95"
                  >
                    <Icons.Check /> {t.finishTutorial}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ================= HANDBOOK MODE ================= */
            <div className="space-y-4">
              {/* Category Pills */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: lang === 'th' ? 'ทั้งหมด' : 'All' },
                  { id: 'booking', label: lang === 'th' ? 'การจองคิว' : 'Booking' },
                  { id: 'map', label: lang === 'th' ? 'ปักหมุด Google Maps' : 'Google Maps' },
                  { id: 'camera', label: lang === 'th' ? 'กล้องสแกนเอกสาร' : 'Camera Scanner' },
                  { id: 'search', label: lang === 'th' ? 'ค้นหา & กรองข้อมูล' : 'Search & Filter' },
                  { id: 'calendar', label: lang === 'th' ? 'ตาราง & Drag Drop' : 'Schedule & Drag' },
                  { id: 'cloud', label: lang === 'th' ? 'Cloud Firestore' : 'Cloud Firestore' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveCategory(c.id)}
                    className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-all ${
                      activeCategory === c.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Handbook Articles Accordion / Cards */}
              <div className="space-y-3">
                {filteredHandbook.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    {lang === 'th' ? 'ไม่พบหัวข้อคู่มือที่ค้นหา' : 'No handbook topics found'}
                  </div>
                ) : (
                  filteredHandbook.map((article) => (
                    <div
                      key={article.id}
                      className="bg-slate-50 hover:bg-blue-50/20 p-4 rounded-2xl border border-slate-200 transition-colors"
                    >
                      <h4 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        {article.title}
                      </h4>

                      <ul className="space-y-1.5 text-xs text-slate-700">
                        {article.content.map((line, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-500 font-bold shrink-0">•</span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {lang === 'th'
              ? 'ระบบคิวตรวจงาน SAIS • มั่นใจ ปลอดภัย เอกสารครบ 100%'
              : 'SAIS Queue Inspection System • 100% Reliable & Realtime Cloud'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
