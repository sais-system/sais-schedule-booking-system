import React, { useState, useMemo } from 'react';
import { Icons } from '../Icons';

export interface TextDefinition {
  id: string;
  category: 'header_nav' | 'calendar' | 'booking' | 'detail' | 'admin' | 'status_alert';
  label: string;
  defaultText: string;
  multiline?: boolean;
}

export const APP_TEXT_DEFINITIONS: TextDefinition[] = [
  // --- Header & Nav ---
  { id: 'site_title', category: 'header_nav', label: 'ชื่อระบบที่แถบด้านบน (Site Title)', defaultText: 'SAIS SCHEDULE BOOKING & LIFT INSPECTION' },
  { id: 'nav_calendar', category: 'header_nav', label: 'เมนูล่าง: ปฏิทินงานตรวจ', defaultText: 'ปฏิทินงานตรวจ' },
  { id: 'nav_search', category: 'header_nav', label: 'เมนูล่าง: ค้นหางานตรวจ', defaultText: 'ค้นหางาน' },
  { id: 'nav_stats', category: 'header_nav', label: 'เมนูล่าง: สถิติงานตรวจ', defaultText: 'สถิติงาน' },
  { id: 'nav_sais_db', category: 'header_nav', label: 'เมนูล่าง: SAIS Databases', defaultText: 'SAIS DB' },
  { id: 'nav_admin', category: 'header_nav', label: 'เมนูล่าง: ผู้ดูแลระบบ', defaultText: 'ผู้ดูแล' },
  { id: 'btn_today', category: 'header_nav', label: 'ปุ่ม: วันนี้', defaultText: 'วันนี้' },
  { id: 'btn_prev', category: 'header_nav', label: 'ปุ่ม: สัปดาห์ก่อนหน้า', defaultText: 'ก่อนหน้า' },
  { id: 'btn_next', category: 'header_nav', label: 'ปุ่ม: สัปดาห์ถัดไป', defaultText: 'ถัดไป' },
  { id: 'btn_live_edit_on', category: 'header_nav', label: 'โหมดปากกา: เปิดอยู่', defaultText: 'เปิดโหมดปากกาแก้ไข' },
  { id: 'btn_live_edit_off', category: 'header_nav', label: 'โหมดปากกา: ปิดอยู่', defaultText: 'โหมดปกติ' },

  // --- Calendar & Table ---
  { id: 'tbl_date_col', category: 'calendar', label: 'หัวตาราง: วันที่', defaultText: 'วันที่' },
  { id: 'tbl_all_jobs', category: 'calendar', label: 'หัวตาราง: งานทั้งหมด', defaultText: 'งานทั้งหมด' },
  { id: 'tbl_sunday', category: 'calendar', label: 'ชื่อวัน: อาทิตย์', defaultText: 'อาทิตย์' },
  { id: 'tbl_today_badge', category: 'calendar', label: 'ป้ายกำกับ: วันนี้', defaultText: 'วันนี้' },
  { id: 'tbl_no_jobs', category: 'calendar', label: 'ข้อความ: ไม่มีคิวงานในวันนี้', defaultText: 'ไม่มีคิวงาน' },
  { id: 'tbl_drag_hint', category: 'calendar', label: 'คำแนะนำการลาก: ลากย้ายคิวงาน', defaultText: 'ลากการ์ดเพื่อย้ายวันหรือสลับผู้ตรวจ' },
  { id: 'tbl_filter_location', category: 'calendar', label: 'ตัวกรอง: พื้นที่', defaultText: 'พื้นที่ทั้งหมด' },
  { id: 'tbl_filter_inspector', category: 'calendar', label: 'ตัวกรอง: ผู้ตรวจ', defaultText: 'ผู้ตรวจทั้งหมด' },

  // --- Booking Modal ---
  { id: 'bk_title_new', category: 'booking', label: 'หน้าต่างจองคิว: หัวข้อเพิ่มคิวใหม่', defaultText: 'จองคิวงานตรวจลิฟต์ใหม่' },
  { id: 'bk_title_edit', category: 'booking', label: 'หน้าต่างจองคิว: หัวข้อแก้ไขคิวงาน', defaultText: 'แก้ไขข้อมูลคิวงานตรวจ' },
  { id: 'bk_lbl_project', category: 'booking', label: 'ป้าย: ชื่อไซต์งาน / โครงการ', defaultText: 'ชื่อไซต์งาน / โครงการ' },
  { id: 'bk_lbl_job_no', category: 'booking', label: 'ป้าย: รหัสงาน / หมายเลขเครื่อง', defaultText: 'หมายเลขเครื่อง / Job No.' },
  { id: 'bk_lbl_job_type', category: 'booking', label: 'ป้าย: ประเภทงานตรวจ', defaultText: 'ประเภทงานตรวจ' },
  { id: 'bk_lbl_location', category: 'booking', label: 'ป้าย: พื้นที่ไซต์งาน', defaultText: 'พื้นที่ไซต์งาน' },
  { id: 'bk_lbl_inspector', category: 'booking', label: 'ป้าย: เลือกผู้ตรวจงาน', defaultText: 'ผู้ตรวจงาน' },
  { id: 'bk_lbl_date', category: 'booking', label: 'ป้าย: วันที่ตรวจ', defaultText: 'วันที่ตรวจ' },
  { id: 'bk_lbl_contact_name', category: 'booking', label: 'ป้าย: ชื่อช่างหน้างาน', defaultText: 'ชื่อช่างหน้างาน / ผู้ประสานงาน' },
  { id: 'bk_lbl_contact_tel', category: 'booking', label: 'ป้าย: เบอร์โทรติดต่อ', defaultText: 'เบอร์โทรศัพท์ติดต่อ' },
  { id: 'bk_lbl_notes', category: 'booking', label: 'ป้าย: หมายเหตุเพิ่มเติม', defaultText: 'หมายเหตุเพิ่มเติม' },
  { id: 'bk_lbl_docs', category: 'booking', label: 'ป้าย: แนบเอกสารประกอบ', defaultText: 'แนบเอกสารการจอง' },
  { id: 'bk_btn_submit', category: 'booking', label: 'ปุ่ม: บันทึกการจองคิว', defaultText: 'บันทึกการจองคิวตรวจ' },
  { id: 'bk_btn_cancel', category: 'booking', label: 'ปุ่ม: ยกเลิก / ปิด', defaultText: 'ยกเลิก' },

  // --- Detail Modal ---
  { id: 'dt_title', category: 'detail', label: 'หน้ารายละเอียด: หัวข้อหน้าต่าง', defaultText: 'รายละเอียดคิวงานตรวจ' },
  { id: 'dt_lbl_sais_result', category: 'detail', label: 'หน้ารายละเอียด: หัวข้อผลการตรวจ SAIS', defaultText: 'ผลการตรวจงาน SAIS' },
  { id: 'dt_lbl_passed', category: 'detail', label: 'สถานะ: ผ่านการตรวจ (Passed)', defaultText: 'ผ่านการตรวจ (Passed)' },
  { id: 'dt_lbl_failed', category: 'detail', label: 'สถานะ: ไม่ผ่านการตรวจ (Failed)', defaultText: 'ไม่ผ่านการตรวจ (Failed)' },
  { id: 'dt_lbl_pending', category: 'detail', label: 'สถานะ: รอผลตรวจ (Pending)', defaultText: 'รอผลการตรวจ' },
  { id: 'dt_lbl_technician', category: 'detail', label: 'หน้ารายละเอียด: ช่างที่หน้างาน', defaultText: 'ช่างที่หน้างาน' },
  { id: 'dt_lbl_location', category: 'detail', label: 'หน้ารายละเอียด: พื้นที่และสถานที่', defaultText: 'สถานที่ตรวจงาน' },
  { id: 'dt_lbl_docs', category: 'detail', label: 'หน้ารายละเอียด: เอกสารแนบ', defaultText: 'เอกสารแนบประกอบ' },
  { id: 'dt_btn_maps', category: 'detail', label: 'ปุ่ม: นำทางด้วย Google Maps', defaultText: 'เปิดแผนที่นำทาง' },
  { id: 'dt_btn_edit', category: 'detail', label: 'ปุ่ม: แก้ไขข้อมูลรายการนี้', defaultText: 'แก้ไขข้อมูลรายการนี้' },
  { id: 'dt_btn_cancel_job', category: 'detail', label: 'ปุ่ม: ยกเลิกคิวตรวจ', defaultText: 'ยกเลิกคิวตรวจ (เก็บประวัติ)' },
  { id: 'dt_btn_delete', category: 'detail', label: 'ปุ่ม: ลบรายการถาวร', defaultText: 'ลบรายการนี้ออกจากระบบ' },

  // --- Admin Panel ---
  { id: 'adm_title', category: 'admin', label: 'แอดมิน: หัวข้อเมนูแอดมิน', defaultText: 'แผงควบคุมระบบผู้ดูแล (Admin Panel)' },
  { id: 'adm_users', category: 'admin', label: 'แอดมิน: จัดการผู้ใช้งาน', defaultText: 'จัดการผู้ใช้งาน' },
  { id: 'adm_inspectors', category: 'admin', label: 'แอดมิน: ผู้ตรวจ & Certificate', defaultText: 'ผู้ตรวจ & Certificate' },
  { id: 'adm_special', category: 'admin', label: 'แอดมิน: วันกิจกรรม / วันลา / วันหยุด', defaultText: 'จัดการวันกิจกรรม / วันลา / วันหยุด' },
  { id: 'adm_appearance', category: 'admin', label: 'แอดมิน: ปรับแต่งสีและรูปลักษณ์', defaultText: 'ปรับแต่งสีและรูปลักษณ์' },
  { id: 'adm_btn_universal_text', category: 'admin', label: 'แอดมิน: ปุ่มคลังข้อความ', defaultText: 'คลังข้อความ & แปลภาษาทุกคำ' },

  // --- Status & Alerts ---
  { id: 'alert_saved_success', category: 'status_alert', label: 'แจ้งเตือน: บันทึกข้อมูลสำเร็จ', defaultText: 'บันทึกข้อมูลเรียบร้อยแล้ว' },
  { id: 'alert_delete_confirm', category: 'status_alert', label: 'แจ้งเตือน: ยืนยันการลบ', defaultText: 'คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?' },
  { id: 'alert_fill_required', category: 'status_alert', label: 'แจ้งเตือน: กรุณากรอกข้อมูลให้ครบถ้วน', defaultText: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' },
];

interface UniversalTextModalProps {
  customTexts: Record<string, string>;
  onSaveTexts: (updated: Record<string, string>) => void;
  onClose: () => void;
}

export const UniversalTextModal: React.FC<UniversalTextModalProps> = ({
  customTexts,
  onSaveTexts,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [localTexts, setLocalTexts] = useState<Record<string, string>>({ ...customTexts });
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const categories = [
    { id: 'all', label: 'ทั้งหมด (All)', icon: Icons.List },
    { id: 'header_nav', label: 'ส่วนหัว & เมนูนำทาง', icon: Icons.Compass },
    { id: 'calendar', label: 'ตารางปฏิทินงาน', icon: Icons.Calendar },
    { id: 'booking', label: 'หน้าต่างจองคิวตรวจ', icon: Icons.PlusCircle },
    { id: 'detail', label: 'หน้ารายละเอียดคิวงาน', icon: Icons.FileText },
    { id: 'admin', label: 'เมนูผู้ดูแลระบบ (Admin)', icon: Icons.Shield },
    { id: 'status_alert', label: 'สถานะ & การแจ้งเตือน', icon: Icons.Bell },
  ];

  const filteredDefinitions = useMemo(() => {
    return APP_TEXT_DEFINITIONS.filter((item) => {
      const matchesCat = activeCategory === 'all' || item.category === activeCategory;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return matchesCat;
      const currentVal = localTexts[item.id] || item.defaultText;
      return (
        matchesCat &&
        (item.label.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          item.defaultText.toLowerCase().includes(q) ||
          currentVal.toLowerCase().includes(q))
      );
    });
  }, [activeCategory, searchQuery, localTexts]);

  const handleTextChange = (id: string, val: string) => {
    setLocalTexts((prev) => ({
      ...prev,
      [id]: val,
    }));
    setSaveSuccess(false);
  };

  const handleResetSingle = (id: string) => {
    setLocalTexts((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setSaveSuccess(false);
  };

  const handleResetAll = () => {
    if (window.confirm('คุณต้องการคืนค่าเริ่มต้นของข้อความทั้งหมดใช่หรือไม่?')) {
      setLocalTexts({});
      onSaveTexts({});
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const handleSaveAll = () => {
    onSaveTexts(localTexts);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const modifiedCount = useMemo(() => {
    return Object.keys(localTexts).filter((key) => {
      const def = APP_TEXT_DEFINITIONS.find((d) => d.id === key);
      return def ? localTexts[key] !== def.defaultText : true;
    }).length;
  }, [localTexts]);

  return (
    <div className="fixed inset-0 z-[1400] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92dvh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-pop">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-amber-600 to-orange-600 text-white flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <Icons.Edit size={22} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight flex items-center gap-2">
                คลังข้อความสากล & ปากกาแก้ไขสด (Universal Text Manager)
              </h3>
              <p className="text-[11px] text-amber-100 font-medium">
                แก้ไขข้อความทุกตัวอักษรบนเว็บไซต์ ทุกเมนู ทุกหน้าต่าง โดยไม่ต้องแก้โค้ด ({modifiedCount} รายการที่กำหนดเอง)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-2xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Toolbar: Search + Category Tabs */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-2.5 shrink-0">
          {/* Search bar */}
          <div className="relative">
            <Icons.Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาข้อความเดิม, คำแปล, หรือรหัสข้อความ (ID)..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <Icons.X size={14} />
              </button>
            )}
          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all text-xs ${
                    isActive
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={13} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* List of text items */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 custom-scrollbar bg-slate-100/50">
          {filteredDefinitions.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs">
              ไม่พบข้อความที่ตรงกับการค้นหา "{searchQuery}"
            </div>
          ) : (
            filteredDefinitions.map((item) => {
              const currentVal = localTexts[item.id] !== undefined ? localTexts[item.id] : item.defaultText;
              const isCustomized = localTexts[item.id] !== undefined && localTexts[item.id] !== item.defaultText;

              return (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-2xl bg-white border transition-all shadow-2xs ${
                    isCustomized
                      ? 'border-amber-400/90 ring-1 ring-amber-300/40 bg-amber-50/20'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-slate-800">{item.label}</span>
                      <code className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-mono border border-amber-200/60">
                        {item.id}
                      </code>
                    </div>
                    {isCustomized && (
                      <button
                        type="button"
                        onClick={() => handleResetSingle(item.id)}
                        className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline"
                        title="คืนค่าเป็นข้อความเริ่มต้น"
                      >
                        <Icons.RotateCcw size={11} /> คืนค่าเดิม
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        ข้อความตั้งต้น (Default):
                      </span>
                      <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-mono select-all">
                        {item.defaultText}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 block mb-0.5">
                        ข้อความที่กำหนดเอง (Custom Value):
                      </span>
                      {item.multiline ? (
                        <textarea
                          rows={2}
                          value={currentVal}
                          onChange={(e) => handleTextChange(item.id, e.target.value)}
                          className="w-full text-xs p-2 rounded-xl border border-amber-300 bg-white focus:ring-2 focus:ring-amber-200 outline-none font-medium text-slate-900"
                        />
                      ) : (
                        <input
                          type="text"
                          value={currentVal}
                          onChange={(e) => handleTextChange(item.id, e.target.value)}
                          className="w-full text-xs p-2 rounded-xl border border-amber-300 bg-white focus:ring-2 focus:ring-amber-200 outline-none font-medium text-slate-900"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetAll}
              className="text-xs font-bold text-slate-500 hover:text-rose-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              คืนค่าเริ่มต้นทั้งหมด
            </button>
            {saveSuccess && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 animate-fadeIn">
                <Icons.Check size={14} /> บันทึกสำเร็จแล้ว!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
            >
              ปิดหน้าต่าง
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              className="text-xs font-bold px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md flex items-center gap-1.5 transition-all active:scale-95"
            >
              <Icons.Check size={16} /> บันทึกการเปลี่ยนแปลง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
