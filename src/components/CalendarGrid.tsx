import React, { useMemo } from 'react';
import { Booking, Inspector, WebSettings, DayInfo, User } from '../types';
import { getThaiTime, getLocalDateString } from '../mockData';
import { EditableText } from './EditableText';

interface CalendarGridProps {
  daysInView: DayInfo[];
  inspectors: Inspector[];
  settings: WebSettings;
  isAdmin: boolean;
  user: User | null;
  setModal: (modal: any) => void;
  setAlertMsg: (msg: string | null) => void;
  setQuickAddType: (type: string) => void;
  handleDrop: (e: React.DragEvent, targetDate: string, targetInspector: string) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDragStart: (e: React.DragEvent, taskId: string) => void;
  handleDragEnd: (e: React.DragEvent) => void;
  filteredBookings: Booking[];
  tableFontScale: number;
  specialFontScale: number;
  columnZoom: number;
  isExporting: boolean;
  selectedInspectorFilter?: string | null;
  onSaveCustomText?: (id: string, text: string) => void;
}

const formatSafeDate = (val?: string) => {
  if (!val) return '';
  const str = String(val);
  if (str.includes('T')) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  return str.split('T')[0];
};

const getCardStyle = (task: Booking, settings: WebSettings = {}) => {
  const jobType = String(task.job_type || '').toLowerCase();
  const area = String(task.area || '').trim();
  const siteStr = String(task.site_name || '').toLowerCase();
  const eqStr = String(task.equipment_no || '').toLowerCase();
  const combinedStr = siteStr + ' ' + eqStr;

  const isLeave = jobType === 'leave' || combinedStr.includes('leave_') || combinedStr.includes('ลา') || combinedStr === 'ลา';

  if (jobType === 'public_holiday' || combinedStr.includes('hld_')) {
    return { bg: settings.holidayBg || '#D0021B', text: settings.holidayText || '#ffffff', isSpecial: true, isLeave: false };
  }
  if (jobType === 'company_event' || combinedStr.includes('event_') || combinedStr.includes('meeting')) {
    let eventBg = settings.eventBg || '#22c55e';
    const match = String(task.equipment_no).match(/_(#[0-9a-fA-F]{6})/);
    if (match) eventBg = match[1];
    return { bg: eventBg, text: settings.eventText || '#ffffff', isSpecial: true, isLeave: false };
  }
  if (isLeave) {
    return { bg: settings.leaveBg || '#eab308', text: settings.leaveText || '#ffffff', isSpecial: true, isLeave: true };
  }
  if (area !== '' && area !== 'กรุงเทพและปริมณฑล' && area !== 'ไม่ระบุ') {
    return { bg: settings.upcBg || '#f472b6', text: settings.upcText || '#ffffff', isSpecial: false, isLeave: false };
  }
  if (jobType === 'mod') {
    return { bg: settings.modBg || '#64748b', text: settings.modText || '#ffffff', isSpecial: false, isLeave: false };
  }
  if (jobType.includes('re-ins') || jobType.includes('temporary') || jobType.includes('builder lift')) {
    return { bg: settings.reinsBg || '#fef08a', text: settings.reinsText || '#854d0e', isSpecial: false, isLeave: false };
  }
  return { bg: settings.normalBg || '#e2e8f0', text: settings.normalText || '#1e293b', isSpecial: false, isLeave: false };
};

export const CalendarGrid: React.FC<CalendarGridProps> = React.memo(({
  daysInView,
  inspectors,
  settings,
  isAdmin,
  user,
  setModal,
  setAlertMsg,
  setQuickAddType,
  handleDrop,
  handleDragOver,
  handleDragLeave,
  handleDragStart,
  handleDragEnd,
  filteredBookings,
  tableFontScale,
  specialFontScale,
  columnZoom,
  isExporting,
  selectedInspectorFilter,
  onSaveCustomText,
}) => {
  const taskMap = useMemo(() => {
    const map: Record<string, Booking[]> = {};
    filteredBookings.forEach((task) => {
      if (String(task.status) === 'cancelled') return;
      const dateStr = formatSafeDate(task.date);
      if (!dateStr) return;
      const key = `${dateStr}_${task.inspector_name}`;
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    return map;
  }, [filteredBookings]);

  const visibleInspectors = useMemo(() => {
    let list = inspectors;
    if (selectedInspectorFilter && selectedInspectorFilter !== 'all') {
      const found = inspectors.filter((ins) => ins.name === selectedInspectorFilter);
      list = found.length > 0 ? found : inspectors;
    }
    return [...list].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  }, [inspectors, selectedInspectorFilter]);

  const numInspectors = visibleInspectors.length || 1;
  const isSingleMobileView = numInspectors === 1;
  const screenWidth = typeof window !== 'undefined' ? window.innerWidth || 375 : 375;
  const baseColWidth = isSingleMobileView
    ? Math.max(260, screenWidth - 65)
    : (settings?.gridColWidth ? Number(settings.gridColWidth) : Math.max(120, Math.floor((screenWidth - 50) / 3)));
  const colWidthPx = Math.max(110, Math.floor(baseColWidth * columnZoom));
  const gridCols = isExporting
    ? `65px repeat(${numInspectors}, 300px)`
    : isSingleMobileView
    ? `50px minmax(260px, 1fr)`
    : `48px repeat(${numInspectors}, ${colWidthPx}px)`;

  return (
    <div
      id="calendar-export-area"
      className={`calendar-grid ${isExporting ? 'export-mode' : ''}`}
      style={{
        gridTemplateColumns: gridCols,
        width: isSingleMobileView ? '100%' : 'max-content',
        minWidth: '100%',
        backgroundColor: isExporting ? '#cbd5e1' : undefined,
      }}
    >
      <div
        className={`sticky-corner font-bold flex items-center justify-center ${isExporting ? 'min-h-[60px]' : ''}`}
        style={{ fontSize: `${(settings.fontDateHeader || (isExporting ? 14 : 11)) * tableFontScale}px` }}
      >
        <EditableText
          id="table_corner_date"
          defaultText="DATE"
          customTexts={settings.customTexts}
          isAdmin={isAdmin}
          isLiveEdit={settings.isLiveEdit}
          onSaveText={onSaveCustomText}
        />
      </div>

      {visibleInspectors.map((ins, i) => (
        <div key={i} className={`sticky-top flex items-center justify-center ${isExporting ? 'min-h-[60px] !py-3' : ''}`}>
          <div
            className={`font-bold w-full text-center px-1 ${isExporting ? 'break-words leading-tight' : 'truncate'}`}
            style={{ fontSize: `${(settings.fontInspectorHeader || (isExporting ? 16 : 13)) * tableFontScale}px` }}
          >
            {ins.name || '-'}
          </div>
        </div>
      ))}

      {daysInView.map((d, index) => {
        let headerClass = '';
        if (d.isGlobalHoliday) headerClass = 'is-sunday-col';
        else if (d.isGlobalEvent) headerClass = 'is-global-event-col';

        return (
          <React.Fragment key={index}>
            <div
              className={`sticky-left ${headerClass} ${d.isToday ? 'is-today-row' : ''} flex flex-col justify-center items-center ${
                isExporting ? 'px-2' : ''
              }`}
            >
              {!d.isEmpty && (
                <>
                  <span
                    className="font-black"
                    style={{ fontSize: `${(settings.fontDateHeader ? settings.fontDateHeader + 3 : (isExporting ? 18 : 15)) * tableFontScale}px`, lineHeight: 1.1 }}
                  >
                    {d.day}
                  </span>
                  <span
                    className="font-bold opacity-90 text-[10px]"
                    style={{ fontSize: `${(settings.fontDateHeader ? Math.max(9, settings.fontDateHeader - 2) : (isExporting ? 13 : 10)) * tableFontScale}px` }}
                  >
                    {d.weekday}
                  </span>
                </>
              )}
            </div>

            {!d.isEmpty &&
              visibleInspectors.map((ins, idx) => {
                const cellKey = `${d.full}_${ins.name}`;
                const cellTasks = taskMap[cellKey] || [];
                const hasLeave = cellTasks.some((t) => {
                  const jt = String(t.job_type || '').toLowerCase();
                  const eq = String(t.equipment_no || '').toLowerCase();
                  return jt === 'leave' || eq.startsWith('leave_') || eq.includes('ลา');
                });
                const isBlockedForNormalUser = d.isGlobalHoliday || d.isGlobalEvent || hasLeave;

                let cellHolidayClass = '';
                if (d.isGlobalHoliday && cellTasks.length === 0) cellHolidayClass = 'is-holiday-cell';
                else if (d.isGlobalEvent && cellTasks.length === 0 && !hasLeave) cellHolidayClass = 'is-global-event-cell';

                const todayLocalString = getLocalDateString(getThaiTime());
                const isPastDate = d.full < todayLocalString;

                const cellClassName = `grid-cell hover:opacity-90 flex flex-col transition-colors duration-200 ${cellHolidayClass} ${
                  d.isToday ? 'is-today-row' : ''
                } ${isPastDate && !isAdmin ? 'opacity-85' : ''}`;

                return (
                  <div
                    key={idx}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => {
                      if (isPastDate && !isAdmin) {
                        return setAlertMsg(
                          '⚠️ ไม่สามารถย้ายหรือบันทึกคิวตรวจย้อนหลังได้ (ก่อนวันที่ปัจจุบัน)\nเฉพาะสิทธิ์ Admin เท่านั้นที่สามารถลงคิวตรวจ วันลา กิจกรรม หรือวันหยุดย้อนหลังได้'
                        );
                      }
                      handleDrop(e, d.full, ins.name);
                    }}
                    className={cellClassName}
                    onClick={() => {
                      if (!user) return setAlertMsg('กรุณาเข้าสู่ระบบก่อนทำรายการจองคิวตรวจครับ');
                      if (user.role === 'viewer') return setAlertMsg('บัญชีของคุณมีสิทธิ์เข้าชมเท่านั้น ไม่สามารถเพิ่มคิวงานได้');
                      if (!isAdmin && isBlockedForNormalUser) return;

                      if (isPastDate && !isAdmin) {
                        return setAlertMsg(
                          '⚠️ ไม่สามารถลงจองคิวตรวจย้อนหลังได้ (ก่อนวันที่ปัจจุบัน)\nเฉพาะสิทธิ์ Admin เท่านั้นที่สามารถลงคิวตรวจ วันลา กิจกรรม หรือวันหยุดย้อนหลังได้ เพื่อเป็นข้อมูลอัปเดตและบันทึกย้อนหลัง'
                        );
                      }

                      if (isAdmin) {
                        setModal({ type: 'admin_cell_action', data: { date: d.full, inspector_name: ins.name } });
                      } else {
                        setQuickAddType('job');
                        setModal({ type: 'booking', data: { date: d.full, inspector_name: ins.name } });
                      }
                    }}
                  >
                    {d.isGlobalHoliday &&
                      d.globalHolidays.map((gh, ghi) => {
                        const isCard = cellTasks.length > 0;
                        return (
                          <div
                            key={'gh' + ghi}
                            draggable={isAdmin}
                            onDragStart={(e) => handleDragStart(e, gh.id)}
                            onDragEnd={handleDragEnd}
                            className={
                              isCard
                                ? `task-content relative w-full flex items-center justify-center p-1 rounded-md mb-1 ${
                                    isAdmin ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-white/50' : 'cursor-pointer'
                                  }`
                                : `holiday-label-new flex-1 flex items-center justify-center text-center ${
                                    isAdmin ? 'cursor-grab active:cursor-grabbing hover:opacity-80' : 'cursor-pointer'
                                  }`
                            }
                            style={{
                              backgroundColor: isCard ? settings.holidayBg || '#D0021B' : undefined,
                              color: settings.holidayText || '#ffffff',
                              fontSize: `${(settings.fontHoliday || (isExporting ? 14 : 12)) * specialFontScale}px`,
                              whiteSpace: isExporting ? 'normal' : 'inherit',
                              borderRadius: settings.cardRadius !== undefined ? `${settings.cardRadius}px` : undefined,
                              padding: settings.cardPadding !== undefined ? `${settings.cardPadding}px` : undefined,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModal({ type: 'detail', data: gh });
                            }}
                          >
                            {gh.site_name}
                          </div>
                        );
                      })}

                    {d.isGlobalEvent &&
                      !hasLeave &&
                      d.globalEvents.map((ge, gei) => {
                        const isCard = cellTasks.length > 0;
                        let customColor = settings.eventBg || '#22c55e';
                        const match = String(ge.equipment_no).match(/_(#[0-9a-fA-F]{6})/);
                        if (match) customColor = match[1];

                        return (
                          <div
                            key={'ge' + gei}
                            draggable={isAdmin}
                            onDragStart={(e) => handleDragStart(e, ge.id)}
                            onDragEnd={handleDragEnd}
                            className={
                              isCard
                                ? `task-content relative w-full flex items-center justify-center p-1 rounded-md mb-1 ${
                                    isAdmin ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-white/50' : 'cursor-pointer'
                                  }`
                                : `holiday-label-new flex-1 flex items-center justify-center text-center ${
                                    isAdmin ? 'cursor-grab active:cursor-grabbing hover:opacity-80' : 'cursor-pointer'
                                  }`
                            }
                            style={{
                              backgroundColor: isCard ? customColor : undefined,
                              color: settings.eventText || '#ffffff',
                              fontSize: `${(settings.fontActivity || (isExporting ? 14 : 12)) * specialFontScale}px`,
                              whiteSpace: isExporting ? 'normal' : 'inherit',
                              borderRadius: settings.cardRadius !== undefined ? `${settings.cardRadius}px` : undefined,
                              padding: settings.cardPadding !== undefined ? `${settings.cardPadding}px` : undefined,
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModal({ type: 'detail', data: ge });
                            }}
                          >
                            {ge.site_name}
                          </div>
                        );
                      })}

                    {cellTasks.map((task, tIdx) => {
                      const styleObj = getCardStyle(task, settings);
                      const isSingleCard = cellTasks.length === 1;
                      const fullText = !styleObj.isSpecial
                        ? `${task.equipment_no || ''} ${task.unit_no || ''} ${task.site_name || ''}`
                        : `${task.site_name || ''}`;
                      const textLen = fullText.length;

                      let dynamicScale = 1.0;
                      if (textLen <= 6) dynamicScale = 1.6;
                      else if (textLen <= 12) dynamicScale = 1.3;
                      else if (textLen <= 20) dynamicScale = 1.1;
                      else if (textLen > 35) dynamicScale = 0.85;

                      const customMinHeight = settings.cardMinHeight
                        ? isSingleCard
                          ? `${settings.cardMinHeight}px`
                          : `${Math.max(22, Math.round(settings.cardMinHeight * 0.75))}px`
                        : undefined;

                      return (
                        <div
                          key={task.id || tIdx}
                          draggable={isAdmin}
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className={`task-content relative w-full flex items-center justify-center p-1 rounded-md ${
                            isAdmin
                              ? 'cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-black/20 shadow-sm'
                              : 'cursor-pointer'
                          } ${isSingleCard ? 'h-full min-h-[40px]' : 'flex-1 min-h-[26px] border-b border-black/10'} ${
                            isExporting ? '!overflow-visible !py-2 !min-h-[50px]' : 'overflow-hidden'
                          }`}
                          style={{
                            backgroundColor: styleObj.bg,
                            color: styleObj.text,
                            borderRadius: settings.cardRadius !== undefined ? `${settings.cardRadius}px` : undefined,
                            padding: settings.cardPadding !== undefined ? `${settings.cardPadding}px` : undefined,
                            minHeight: customMinHeight,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ type: 'detail', data: task });
                          }}
                        >
                          <div className="w-full flex flex-col justify-center items-center text-center">
                            {styleObj.isLeave ? (
                              <div
                                className="font-black flex items-center justify-center leading-none"
                                style={{
                                  fontSize: `${
                                    (settings.fontLeave
                                      ? (isSingleCard ? settings.fontLeave : Math.max(14, Math.round(settings.fontLeave * 0.7)))
                                      : (isSingleCard ? (isExporting ? 46 : 36) : isExporting ? 32 : 24)) * specialFontScale
                                  }px`,
                                }}
                              >
                                ลา
                              </div>
                            ) : isSingleCard ? (
                              <div className="format-multi-line flex flex-col justify-center items-center w-full !text-center">
                                {!styleObj.isSpecial ? (
                                  <>
                                    <div
                                      className="leading-tight opacity-90 font-bold"
                                      style={{
                                        fontSize: `${(settings.fontCardSub || (isExporting ? 12 : 10)) * dynamicScale * tableFontScale}px`,
                                      }}
                                    >
                                      {task.equipment_no} <span className="opacity-60">/</span> {task.product_line || '-'} <span className="opacity-60">/</span> {task.unit_no}
                                    </div>
                                    <div
                                      className="leading-tight font-black mt-[2px] w-full break-words"
                                      style={{
                                        fontSize: `${(settings.fontCardTitle || (isExporting ? 14 : 11)) * dynamicScale * tableFontScale}px`,
                                        whiteSpace: isExporting ? 'normal' : 'inherit',
                                      }}
                                    >
                                      {task.site_name}
                                    </div>
                                  </>
                                ) : (
                                  <div
                                    className="whitespace-pre-wrap leading-tight font-black w-full break-words"
                                    style={{
                                      fontSize: `${(settings.fontActivity || (isExporting ? 15 : 12)) * dynamicScale * specialFontScale}px`,
                                      whiteSpace: isExporting ? 'normal' : 'pre-wrap',
                                    }}
                                  >
                                    {task.site_name}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                className="format-single-line font-black leading-tight w-full !text-center"
                                style={{
                                  fontSize: `${
                                    (settings.fontCardTitle
                                      ? Math.max(9, settings.fontCardTitle - 1)
                                      : isExporting ? 12 : 10) * dynamicScale * (styleObj.isSpecial ? specialFontScale : tableFontScale)
                                  }px`,
                                  whiteSpace: isExporting ? 'normal' : 'nowrap',
                                  overflow: isExporting ? 'visible' : 'hidden',
                                }}
                              >
                                {!styleObj.isSpecial
                                  ? `${task.equipment_no} / ${task.product_line || '-'} / ${task.site_name}`
                                  : task.site_name}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
          </React.Fragment>
        );
      })}
    </div>
  );
});
