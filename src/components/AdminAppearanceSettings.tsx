import React, { useState } from 'react';
import { WebSettings } from '../types';
import { Icons } from './Icons';

interface AdminAppearanceSettingsProps {
  settings: WebSettings;
  onSaveSettings: (newSettings: WebSettings) => void;
  columnZoom?: number;
  setColumnZoom?: (val: number | ((prev: number) => number)) => void;
  tableFontScale?: number;
  setTableFontScale?: (val: number | ((prev: number) => number)) => void;
  onOpenUniversalTextModal: () => void;
  onBack: () => void;
  setAlertMsg: (msg: string | null) => void;
}

export const AdminAppearanceSettings: React.FC<AdminAppearanceSettingsProps> = ({
  settings,
  onSaveSettings,
  columnZoom = 1,
  setColumnZoom,
  tableFontScale = 1,
  setTableFontScale,
  onOpenUniversalTextModal,
  onBack,
  setAlertMsg,
}) => {
  const [formData, setFormData] = useState<WebSettings>({
    ...settings,
    appName: settings.appName || 'SAIS SCHEDULE BOOKING & LIFT INSPECTION',
    headerBg: settings.headerBg || '#1e293b',
    headerText: settings.headerText || '#ffffff',
    navBg: settings.navBg || '#ffffff',
    navActiveColor: settings.navActiveColor || '#dc2626',
    navInactiveColor: settings.navInactiveColor || '#64748b',
    fontNavText: settings.fontNavText || 10,
    tableHeaderBg: settings.tableHeaderBg || '#1e293b',
    tableHeaderText: settings.tableHeaderText || '#ffffff',
    tableBorder: settings.tableBorder || '#cbd5e1',
    gridColWidth: settings.gridColWidth || 120,
    fontDateHeader: settings.fontDateHeader || 12,
    fontInspectorHeader: settings.fontInspectorHeader || 12,
    todayBg: settings.todayBg || '#eff6ff',
    todayText: settings.todayText || '#1d4ed8',
    sundayBg: settings.sundayBg || '#fee2e2',
    sundayText: settings.sundayText || '#991b1b',
    normalBg: settings.normalBg || '#ffffff',
    normalText: settings.normalText || '#0f172a',
    modBg: settings.modBg || '#64748b',
    modText: settings.modText || '#ffffff',
    reinsBg: settings.reinsBg || '#fef08a',
    reinsText: settings.reinsText || '#854d0e',
    upcBg: settings.upcBg || '#f472b6',
    upcText: settings.upcText || '#ffffff',
    leaveBg: settings.leaveBg || '#fef3c7',
    leaveText: settings.leaveText || '#92400e',
    eventBg: settings.eventBg || '#f3e8ff',
    eventText: settings.eventText || '#6b21a8',
    holidayBg: settings.holidayBg || '#ffedd5',
    holidayText: settings.holidayText || '#9a3412',
    fontCardTitle: settings.fontCardTitle || 11,
    fontCardSub: settings.fontCardSub || 10,
    cardRadius: settings.cardRadius || 6,
    cardPadding: settings.cardPadding || 4,
    cardMinHeight: settings.cardMinHeight || 35,
    modalBg: settings.modalBg || '#ffffff',
    modalText: settings.modalText || '#0f172a',
    fontModalScale: settings.fontModalScale || 1.0,
    isLiveEdit: settings.isLiveEdit ?? false,
  });

  const [activeSection, setActiveSection] = useState<'all' | 'header_nav' | 'table' | 'cards' | 'modals' | 'live_edit'>('all');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleChange = (key: keyof WebSettings, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaveSuccess(false);
  };

  const handleSave = () => {
    onSaveSettings(formData);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (window.confirm('คุณต้องการรีเซ็ตการตั้งค่าสีและรูปลักษณ์ทั้งหมดกลับเป็นค่าเริ่มต้นหรือไม่?')) {
      const defaultSettings: WebSettings = {
        ...formData,
        headerBg: '#1e293b',
        headerText: '#ffffff',
        navBg: '#ffffff',
        navActiveColor: '#dc2626',
        navInactiveColor: '#64748b',
        fontNavText: 10,
        tableHeaderBg: '#1e293b',
        tableHeaderText: '#ffffff',
        tableBorder: '#cbd5e1',
        gridColWidth: 120,
        fontDateHeader: 12,
        fontInspectorHeader: 12,
        todayBg: '#eff6ff',
        todayText: '#1d4ed8',
        sundayBg: '#fee2e2',
        sundayText: '#991b1b',
        normalBg: '#ffffff',
        normalText: '#0f172a',
        modBg: '#64748b',
        modText: '#ffffff',
        reinsBg: '#fef08a',
        reinsText: '#854d0e',
        upcBg: '#f472b6',
        upcText: '#ffffff',
        leaveBg: '#fef3c7',
        leaveText: '#92400e',
        eventBg: '#f3e8ff',
        eventText: '#6b21a8',
        holidayBg: '#ffedd5',
        holidayText: '#9a3412',
        fontCardTitle: 11,
        fontCardSub: 10,
        cardRadius: 6,
        cardPadding: 4,
        cardMinHeight: 35,
        modalBg: '#ffffff',
        modalText: '#0f172a',
        fontModalScale: 1.0,
      };
      setFormData(defaultSettings);
      onSaveSettings(defaultSettings);
      if (setColumnZoom) setColumnZoom(1);
      if (setTableFontScale) setTableFontScale(1);
      setAlertMsg('คืนค่าเริ่มต้นเรียบร้อยแล้ว');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6 animate-pop">
      {/* Top Banner & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
            title="กลับไปยังเมนูแอดมินหลัก"
          >
            <Icons.ChevronLeft size={20} />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-pink-100 text-pink-600">
                <Icons.Palette size={18} />
              </span>
              ปรับแต่งสีและรูปลักษณ์ (Appearance & Colors Customization)
            </h2>
            <p className="text-xs text-slate-500">
              ปรับแต่งสีพื้นหลัง สีตัวอักษร ขนาดฟอนต์ ความกว้างคอลัมน์ และรูปลักษณ์ทุกส่วนได้อย่างอิสระ
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenUniversalTextModal}
            className="text-xs font-bold px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Icons.Edit size={14} /> คลังข้อความสากล & แก้ไขคำ
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="text-xs font-bold px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Icons.Check size={14} /> บันทึกการตั้งค่า
          </button>
        </div>
      </div>

      {/* Section Quick Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs custom-scrollbar">
        {[
          { id: 'all', label: 'ทั้งหมด (All Sections)', icon: Icons.List },
          { id: 'header_nav', label: 'แถบบน & เมนูล่าง', icon: Icons.Compass },
          { id: 'table', label: 'ตาราง & คอลัมน์', icon: Icons.Calendar },
          { id: 'cards', label: 'การ์ดงาน & ฟอนต์', icon: Icons.FileText },
          { id: 'modals', label: 'หน้าต่างป๊อปอัป', icon: Icons.Layout },
          { id: 'live_edit', label: 'โหมดปากกาแก้ไขสด', icon: Icons.Edit },
        ].map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon size={13} />
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <Icons.Check size={16} className="text-emerald-600" />
          บันทึกการตั้งค่าสีและรูปลักษณ์เรียบร้อยแล้ว มีผลบนเว็บไซต์ทันที!
        </div>
      )}

      {/* SECTION 1: HEADER & NAVIGATION */}
      {(activeSection === 'all' || activeSection === 'header_nav') && (
        <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
            1. แถบเมนูด้านบน และเมนูนำทางด้านล่าง (Header & Navigation)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                ชื่อระบบบนหัวเว็บ (App Name)
              </label>
              <input
                type="text"
                value={formData.appName || ''}
                onChange={(e) => handleChange('appName', e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-bold text-slate-800 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีแถบด้านบน (Header Bg)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.headerBg || '#1e293b'}
                  onChange={(e) => handleChange('headerBg', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.headerBg}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีตัวอักษรแถบบน (Header Text)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.headerText || '#ffffff'}
                  onChange={(e) => handleChange('headerText', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.headerText}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีพื้นหลังเมนูล่าง (Nav Bg)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.navBg || '#ffffff'}
                  onChange={(e) => handleChange('navBg', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.navBg}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีเมนูล่างเมื่อเลือก (Active Color)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.navActiveColor || '#dc2626'}
                  onChange={(e) => handleChange('navActiveColor', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.navActiveColor}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีเมนูล่างปกติ (Inactive Color)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.navInactiveColor || '#64748b'}
                  onChange={(e) => handleChange('navInactiveColor', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.navInactiveColor}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                ขนาดตัวอักษรเมนูล่าง: {formData.fontNavText}px
              </label>
              <input
                type="range"
                min={8}
                max={16}
                value={formData.fontNavText || 10}
                onChange={(e) => handleChange('fontNavText', Number(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: TABLE & CALENDAR */}
      {(activeSection === 'all' || activeSection === 'table') && (
        <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
            2. ตารางปฏิทินงานตรวจ & คอลัมน์ (Table & Calendar Grid)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีหัวตาราง (ผู้ตรวจ/วันที่)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.tableHeaderBg || '#1e293b'}
                  onChange={(e) => handleChange('tableHeaderBg', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.tableHeaderBg}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีตัวอักษรหัวตาราง
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.tableHeaderText || '#ffffff'}
                  onChange={(e) => handleChange('tableHeaderText', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.tableHeaderText}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีเส้นตาราง (Table Border)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.tableBorder || '#cbd5e1'}
                  onChange={(e) => handleChange('tableBorder', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.tableBorder}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                ความกว้างคอลัมน์ผู้ตรวจ: {formData.gridColWidth}px
              </label>
              <input
                type="range"
                min={90}
                max={220}
                step={5}
                value={Number(formData.gridColWidth) || 120}
                onChange={(e) => handleChange('gridColWidth', Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีพื้นหลังวันอาทิตย์ (Sunday)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.sundayBg || '#fee2e2'}
                  onChange={(e) => handleChange('sundayBg', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.sundayBg}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีตัวอักษรวันอาทิตย์
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.sundayText || '#991b1b'}
                  onChange={(e) => handleChange('sundayText', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.sundayText}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีไฮไลต์ "วันนี้" (Today Highlight)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.todayBg || '#eff6ff'}
                  onChange={(e) => handleChange('todayBg', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.todayBg}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีตัวอักษร "วันนี้"
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.todayText || '#1d4ed8'}
                  onChange={(e) => handleChange('todayText', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.todayText}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                ขนาดฟอนต์คอลัมน์วันที่: {formData.fontDateHeader}px
              </label>
              <input
                type="range"
                min={9}
                max={20}
                value={formData.fontDateHeader || 12}
                onChange={(e) => handleChange('fontDateHeader', Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                ขนาดฟอนต์ชื่อผู้ตรวจ: {formData.fontInspectorHeader}px
              </label>
              <input
                type="range"
                min={9}
                max={20}
                value={formData.fontInspectorHeader || 12}
                onChange={(e) => handleChange('fontInspectorHeader', Number(e.target.value))}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            {setColumnZoom && (
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  การซูมคอลัมน์ตาราง: {columnZoom.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min={0.7}
                  max={2.0}
                  step={0.1}
                  value={columnZoom}
                  onChange={(e) => setColumnZoom(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            )}

            {setTableFontScale && (
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  อัตราส่วนขนาดฟอนต์ตาราง: {tableFontScale.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min={0.7}
                  max={1.8}
                  step={0.1}
                  value={tableFontScale}
                  onChange={(e) => setTableFontScale(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 3: JOB CARDS & COLOR TYPES */}
      {(activeSection === 'all' || activeSection === 'cards') && (
        <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            3. สีการ์ดงาน & ฟอนต์ตัวอักษรแต่ละประเภท (Card Colors & Typography)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Normal Job */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>งานตรวจปกติ (Normal)</span>
                <span className="w-3 h-3 rounded-full border border-slate-300" style={{ background: formData.normalBg }}></span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">สีพื้นหลัง</span>
                  <input
                    type="color"
                    value={formData.normalBg || '#ffffff'}
                    onChange={(e) => handleChange('normalBg', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">สีตัวอักษร</span>
                  <input
                    type="color"
                    value={formData.normalText || '#0f172a'}
                    onChange={(e) => handleChange('normalText', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* MOD Job */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>งาน MOD</span>
                <span className="w-3 h-3 rounded-full border border-slate-300" style={{ background: formData.modBg }}></span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">สีพื้นหลัง</span>
                  <input
                    type="color"
                    value={formData.modBg || '#64748b'}
                    onChange={(e) => handleChange('modBg', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">สีตัวอักษร</span>
                  <input
                    type="color"
                    value={formData.modText || '#ffffff'}
                    onChange={(e) => handleChange('modText', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Re-ins Job */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>งานตรวจซ้ำ (Re-ins)</span>
                <span className="w-3 h-3 rounded-full border border-slate-300" style={{ background: formData.reinsBg }}></span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">สีพื้นหลัง</span>
                  <input
                    type="color"
                    value={formData.reinsBg || '#fef08a'}
                    onChange={(e) => handleChange('reinsBg', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">สีตัวอักษร</span>
                  <input
                    type="color"
                    value={formData.reinsText || '#854d0e'}
                    onChange={(e) => handleChange('reinsText', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* UPC Job */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>งานต่างจังหวัด (UPC)</span>
                <span className="w-3 h-3 rounded-full border border-slate-300" style={{ background: formData.upcBg }}></span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">สีพื้นหลัง</span>
                  <input
                    type="color"
                    value={formData.upcBg || '#f472b6'}
                    onChange={(e) => handleChange('upcBg', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">สีตัวอักษร</span>
                  <input
                    type="color"
                    value={formData.upcText || '#ffffff'}
                    onChange={(e) => handleChange('upcText', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Leave */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>วันลา (Leave)</span>
                <span className="w-3 h-3 rounded-full border border-slate-300" style={{ background: formData.leaveBg }}></span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">สีพื้นหลัง</span>
                  <input
                    type="color"
                    value={formData.leaveBg || '#fef3c7'}
                    onChange={(e) => handleChange('leaveBg', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">สีตัวอักษร</span>
                  <input
                    type="color"
                    value={formData.leaveText || '#92400e'}
                    onChange={(e) => handleChange('leaveText', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Event */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>กิจกรรมบริษัท (Event)</span>
                <span className="w-3 h-3 rounded-full border border-slate-300" style={{ background: formData.eventBg }}></span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">สีพื้นหลัง</span>
                  <input
                    type="color"
                    value={formData.eventBg || '#f3e8ff'}
                    onChange={(e) => handleChange('eventBg', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">สีตัวอักษร</span>
                  <input
                    type="color"
                    value={formData.eventText || '#6b21a8'}
                    onChange={(e) => handleChange('eventText', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Holiday */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800 flex items-center justify-between">
                <span>วันหยุดบริษัท (Holiday)</span>
                <span className="w-3 h-3 rounded-full border border-slate-300" style={{ background: formData.holidayBg }}></span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block">สีพื้นหลัง</span>
                  <input
                    type="color"
                    value={formData.holidayBg || '#ffedd5'}
                    onChange={(e) => handleChange('holidayBg', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">สีตัวอักษร</span>
                  <input
                    type="color"
                    value={formData.holidayText || '#9a3412'}
                    onChange={(e) => handleChange('holidayText', e.target.value)}
                    className="w-full h-7 rounded border cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Typography sliders */}
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
              <div className="font-bold text-slate-800">
                <span>ขนาดฟอนต์หัวการ์ด: {formData.fontCardTitle}px</span>
              </div>
              <input
                type="range"
                min={8}
                max={18}
                value={formData.fontCardTitle || 11}
                onChange={(e) => handleChange('fontCardTitle', Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="font-bold text-slate-800 text-[11px] pt-1">
                <span>ขนาดฟอนต์รายละเอียด: {formData.fontCardSub}px</span>
              </div>
              <input
                type="range"
                min={8}
                max={16}
                value={formData.fontCardSub || 10}
                onChange={(e) => handleChange('fontCardSub', Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: MODALS & WINDOWS */}
      {(activeSection === 'all' || activeSection === 'modals') && (
        <div className="border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4 bg-slate-50/50">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            4. หน้าต่างป๊อปอัป & กล่องข้อความ (Modals & Windows)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีพื้นหลังหน้าต่างป๊อปอัป (Modal Bg)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.modalBg || '#ffffff'}
                  onChange={(e) => handleChange('modalBg', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.modalBg}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                สีตัวอักษรหน้าต่างป๊อปอัป (Modal Text)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.modalText || '#0f172a'}
                  onChange={(e) => handleChange('modalText', e.target.value)}
                  className="w-10 h-8 rounded-lg border border-slate-300 cursor-pointer"
                />
                <span className="font-mono text-[11px] text-slate-600">{formData.modalText}</span>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">
                อัตราส่วนขนาดตัวอักษรหน้าต่าง: {(formData.fontModalScale || 1.0).toFixed(1)}x
              </label>
              <input
                type="range"
                min={0.8}
                max={1.4}
                step={0.05}
                value={formData.fontModalScale || 1.0}
                onChange={(e) => handleChange('fontModalScale', Number(e.target.value))}
                className="w-full accent-purple-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: LIVE EDIT PEN & UNIVERSAL TEXT */}
      {(activeSection === 'all' || activeSection === 'live_edit') && (
        <div className="border border-amber-300 rounded-2xl p-4 sm:p-5 space-y-4 bg-amber-50/40">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              5. โหมดปากกาแก้ไขข้อความสด (Universal Live Text Editor)
            </h3>
            <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
              แก้ไขได้ทุกตัวอักษร
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white rounded-2xl border border-amber-200 shadow-2xs">
            <div className="space-y-1">
              <div className="font-bold text-xs text-slate-800 flex items-center gap-2">
                <Icons.Edit className="text-amber-500" size={16} />
                เปิด/ปิดโหมดปากกาแก้ไขข้อความบนหน้าเว็บ (Live Text Edit Mode)
              </div>
              <p className="text-[11px] text-slate-500">
                เมื่อเปิดใช้งาน จะปรากฏไอคอนปากกาสีทองบนทุกข้อความในเว็บไซต์ คลิกเพื่อแก้ไขข้อความได้ทันทีโดยไม่ต้องแก้โค้ด
              </p>
            </div>

            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isLiveEdit ?? false}
                  onChange={(e) => handleChange('isLiveEdit', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
              <span className="text-xs font-bold text-slate-700">
                {formData.isLiveEdit ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onOpenUniversalTextModal}
              className="text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md flex items-center gap-2 transition-all active:scale-95"
            >
              <Icons.FileText size={15} /> เปิดคลังข้อความสากลของเว็บไซต์ (Universal Text Manager)
            </button>
            <span className="text-[11px] text-amber-800">
              * ค้นหาและแก้ข้อความทุกเมนู ทุกหน้าต่างพร้อมกันได้ที่นี่
            </span>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-200">
        <button
          type="button"
          onClick={handleResetDefaults}
          className="text-xs font-bold text-slate-500 hover:text-rose-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1.5"
        >
          <Icons.RotateCcw size={13} /> คืนค่าเริ่มต้นทั้งหมด
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
          >
            กลับสู่เมนูแอดมิน
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="text-xs font-bold px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <Icons.Check size={16} /> บันทึกการตั้งค่าสีและรูปลักษณ์
          </button>
        </div>
      </div>
    </div>
  );
};
