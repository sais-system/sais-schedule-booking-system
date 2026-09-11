import React, { useState, useRef } from 'react';
import { Booking, User } from '../../types';
import { Icons } from '../Icons';
import { CameraScannerModal, DocumentTypeKey } from './CameraScannerModal';
import { useTranslation } from '../../i18n';
import { getThaiTime, getLocalDateString } from '../../mockData';

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const PRODUCT_COLORS: Record<string, string> = {
  'ES1': 'bg-blue-500',
  '3300': 'bg-blue-400',
  '5500': 'bg-emerald-500',
  'ES5/ES5.1': 'bg-purple-500',
  'S-villas': 'bg-amber-500',
  'ES2': 'bg-pink-500',
  'ES3': 'bg-indigo-500',
  'MOR-R': 'bg-rose-500',
  'MOD-T': 'bg-orange-500',
  'S7R4': 'bg-cyan-500',
  'Flex7': 'bg-teal-600',
  'ESC/MW': 'bg-fuchsia-500',
  'อื่นๆโปรดระบุ': 'bg-slate-500',
};

interface DetailModalProps {
  booking: Booking;
  isAdmin: boolean;
  user: User | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancelBooking?: () => void;
  onReactivateBooking?: () => void;
  onViewFile: (url: string) => void;
  onUpdateBooking?: (updated: Booking) => void;
  onOpenOilTracking?: (equipmentNo?: string) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  booking,
  isAdmin,
  user,
  onClose,
  onEdit,
  onDelete,
  onCancelBooking,
  onReactivateBooking,
  onViewFile,
  onUpdateBooking,
  onOpenOilTracking,
}) => {
  const { t, lang } = useTranslation();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTargetDoc, setScannerTargetDoc] = useState<DocumentTypeKey>('layout');
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetKey, setUploadTargetKey] = useState<DocumentTypeKey>('layout');

  const [copiedLink, setCopiedLink] = useState(false);

  // SAIS Inspection Result Management for Admin & Inspector (only for past dates)
  const todayStr = getLocalDateString(getThaiTime());
  const isPastJob = Boolean(booking.date && booking.date < todayStr);
  const canSetInspectionResult = Boolean((isAdmin || user?.role === 'inspector') && isPastJob);
  const [selectedResult, setSelectedResult] = useState<string>(
    booking.inspection_result || booking.sais_status || ''
  );
  const [isUpdatingResult, setIsUpdatingResult] = useState(false);

  const handleSaveResult = (newResult: string) => {
    setSelectedResult(newResult);
    if (onUpdateBooking) {
      setIsUpdatingResult(true);
      onUpdateBooking({
        ...booking,
        inspection_result: newResult,
        sais_status: newResult,
      });
      setTimeout(() => setIsUpdatingResult(false), 800);
    }
  };

  // Generate shareable direct link to this specific job
  const jobShareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?bookingId=${booking.id}`
    : `https://sais.app/?bookingId=${booking.id}`;

  const handleCopyJobLink = () => {
    navigator.clipboard.writeText(jobShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isSpecial =
    String(booking.job_type).includes('leave') ||
    String(booking.job_type).includes('event') ||
    String(booking.job_type).includes('holiday');

  const isInspector =
    user?.role === 'inspector' &&
    String(booking.inspector_name).toLowerCase() === String(user.inspector_mapped_name || user.username).toLowerCase();

  const canManage =
    isAdmin ||
    user?.username === booking.created_by ||
    isInspector;

  const canUploadDocs = isAdmin || isInspector || user?.username === booking.created_by;

  const condLabels: { key: keyof Booking; label: string; docKey: DocumentTypeKey }[] = [
    { key: 'site_cond_1', label: '1. หน้าตู้คอนโทรล', docKey: 'site_cond_1' },
    { key: 'site_cond_2', label: '2. บนหลังคาลิฟต์', docKey: 'site_cond_2' },
    { key: 'site_cond_3', label: '3. ด้านบนปล่อง', docKey: 'site_cond_3' },
    { key: 'site_cond_4', label: '4. ก้นบ่อลิฟต์', docKey: 'site_cond_4' },
    { key: 'site_cond_5', label: '5. ภายในตู้ลิฟต์', docKey: 'site_cond_5' },
    { key: 'site_cond_6', label: '6. หน้าชั้นและรอบวงกบประตูนอก', docKey: 'site_cond_6' },
  ];

  // Handle scanned or uploaded document image
  const handleSaveScannedDocument = (docKey: DocumentTypeKey, imageUrl: string, filename?: string) => {
    if (!onUpdateBooking) return;

    let updated: Booking = { ...booking };

    if (docKey === 'layout') {
      updated.layout_img = imageUrl;
      updated.layout_doc = 'true';
      if (filename) updated.layout_filename = filename;
      if (!updated.layout_status) updated.layout_status = 'pending';
    } else if (docKey === 'wiring') {
      updated.wiring_img = imageUrl;
      updated.wiring_doc = 'true';
      if (filename) updated.wiring_filename = filename;
      if (!updated.wiring_status) updated.wiring_status = 'pending';
    } else if (docKey === 'precheck') {
      updated.precheck_img = imageUrl;
      updated.precheck_doc = 'true';
      if (filename) updated.precheck_filename = filename;
      if (!updated.precheck_status) updated.precheck_status = 'pending';
    } else {
      // Site conditions
      const currentVal = (updated as any)[docKey] as string | undefined;
      (updated as any)[docKey] = currentVal ? `${currentVal},${imageUrl}` : imageUrl;
    }

    onUpdateBooking(updated);
    setUploadToast(`แนบเอกสาร ${docKey.toUpperCase()} สำเร็จแล้ว`);
    setTimeout(() => setUploadToast(null), 3000);
  };

  // Open camera scanner for a specific document
  const openScannerFor = (docKey: DocumentTypeKey) => {
    setScannerTargetDoc(docKey);
    setScannerOpen(true);
  };

  // Trigger file upload for a specific document
  const triggerFileInput = (docKey: DocumentTypeKey) => {
    setUploadTargetKey(docKey);
    fileInputRef.current?.click();
  };

  // Handle direct file input selection (PDF and Images)
  const handleDirectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadToast(`กำลังประมวลผลไฟล์ ${file.name}...`);

    try {
      const dataUrl = await readFileAsDataUrl(file);
      handleSaveScannedDocument(uploadTargetKey, dataUrl, file.name);
    } catch (err) {
      setUploadToast('อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      setTimeout(() => setUploadToast(null), 3000);
    }

    e.target.value = '';
  };

  return (
    <>
      <div className="modal-card w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl shadow-2xl relative max-h-[92dvh] flex flex-col overflow-hidden animate-pop">
        {/* Sticky Header with title & close button */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-20 rounded-t-2xl sm:rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Icons.FileText />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 leading-tight">รายละเอียดงานตรวจ</h3>
              <span className="text-[11px] text-slate-400 font-mono">ID: {booking.id}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors cursor-pointer"
            title="ปิดหน้าต่าง"
          >
            <Icons.X size={18} />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={handleDirectFileChange}
        />

        {/* Upload Toast */}
        {uploadToast && (
          <div className="absolute top-16 left-4 right-4 bg-emerald-600 text-white text-xs font-bold py-2 px-3 rounded-xl shadow-lg flex items-center gap-1.5 animate-pop z-50">
            <Icons.Check /> {uploadToast}
          </div>
        )}

        {/* Scrollable Container with momentum scrolling and ample bottom padding for mobile */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6 pb-36 sm:pb-12 space-y-4 text-sm text-slate-700 custom-scrollbar -webkit-overflow-scrolling-touch"
          style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
        >
          {booking.status === 'cancelled' && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-300 rounded-2xl flex items-center justify-between gap-2 text-xs animate-fade-in">
              <div className="flex items-center gap-2 text-rose-800 font-bold">
                <Icons.AlertCircle className="text-rose-600 shrink-0" size={16} />
                <span>คิวตรวจนี้ถูกยกเลิกแล้ว (ระบบบันทึกเก็บประวัติไว้)</span>
              </div>
              <span className="bg-rose-200/80 text-rose-900 text-[10px] font-black px-2 py-0.5 rounded-md shrink-0">
                CANCELLED
              </span>
            </div>
          )}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 grid grid-cols-2 gap-2">
            <div>
              <span className="text-slate-400 text-[10px] block font-bold">วันที่ตรวจ</span>
              <span className="font-black text-slate-800 text-sm">{booking.date || '-'}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block font-bold">ผู้ตรวจ</span>
              <span className="font-black text-blue-600 text-sm">
                {booking.inspector_name === 'SYSTEM_HOLIDAY' || booking.inspector_name === 'SYSTEM_EVENT'
                  ? 'ทุกคนในบริษัท'
                  : booking.inspector_name || '-'}
              </span>
            </div>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] block font-bold uppercase">หัวข้อ / โครงการ</span>
            <span className="font-bold text-slate-900 text-base leading-snug">{booking.site_name || '-'}</span>
          </div>

          {!isSpecial && (
            <>
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Equipment No.</span>
                  <span className="font-bold text-slate-800">{booking.equipment_no || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">Unit No.</span>
                  <span className="font-bold text-slate-800">{booking.unit_no || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">ประเภทงาน</span>
                  <span className="font-bold text-slate-800">{booking.job_type || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">พื้นที่</span>
                  <span className="font-bold text-slate-800">{booking.area || '-'}</span>
                </div>
              </div>

              {/* SAIS Inspection Result - Only for Admin / Inspector for past jobs */}
              {canSetInspectionResult && (
                <div className="p-3.5 rounded-2xl border border-indigo-200 bg-indigo-50/70 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                      <Icons.FileText size={16} className="text-indigo-600" />
                      <span>ผลการตรวจ SAIS (Inspection Result)</span>
                    </label>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      ตรวจแล้วเมื่อ {booking.date}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={selectedResult}
                      onChange={(e) => handleSaveResult(e.target.value)}
                      className="flex-1 text-xs p-2.5 rounded-xl border border-slate-300 font-bold text-slate-800 bg-white focus:border-indigo-500 outline-none"
                    >
                      <option value="">-- ยังไม่ระบุผล / รอผลตรวจ (Pending) --</option>
                      <option value="Passed with Completed">Passed with Completed (ผ่านสมบูรณ์)</option>
                      <option value="pass with OIL">pass with OIL (ผ่านโดยมีรายการแก้ไข OIL)</option>
                      <option value="Failed">Failed (ไม่ผ่านการตรวจ)</option>
                      <option value="ยกเลิก">ยกเลิก (Cancelled)</option>
                    </select>
                    {isUpdatingResult && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <Icons.Check size={12} /> บันทึกแล้ว
                      </span>
                    )}
                  </div>

                  {/* File Inspection Result - Restricted to Admin & Inspector */}
                  <div className="pt-2 border-t border-indigo-200/60">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1">
                        <Icons.FileCheck size={14} className="text-indigo-600" />
                        ไฟล์ผลการตรวจ SAIS
                      </span>
                      {booking.sais_result_file && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 font-bold px-2 py-0.5 rounded-full">
                          มีไฟล์แนบแล้ว
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {booking.sais_result_file ? (
                        <button
                          type="button"
                          onClick={() => onViewFile(booking.sais_result_file!)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                        >
                          <Icons.Eye size={13} />
                          ดูไฟล์ผลการตรวจ ({booking.sais_result_filename || 'SAIS-Report'})
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">ยังไม่มีไฟล์ผลการตรวจ</span>
                      )}

                      <label className="cursor-pointer px-3 py-1.5 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors">
                        <Icons.Upload size={13} />
                        {booking.sais_result_file ? 'เปลี่ยนไฟล์' : 'แนบไฟล์ผลตรวจ (PDF/รูป)'}
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const dataUrl = await readFileAsDataUrl(file);
                              if (onUpdateBooking) {
                                onUpdateBooking({
                                  ...booking,
                                  sais_result_file: dataUrl,
                                  sais_result_filename: file.name,
                                });
                                setUploadToast(`อัปโหลดไฟล์ผลการตรวจ ${file.name} สำเร็จ`);
                                setTimeout(() => setUploadToast(null), 3000);
                              }
                            } catch (err) {
                              setUploadToast('อัปโหลดไฟล์ไม่สำเร็จ');
                              setTimeout(() => setUploadToast(null), 3000);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>
                    <div className="text-[10px] text-indigo-700/80 mt-1">
                      🔒 สิทธิ์การเข้าถึง: เฉพาะผู้ดูแลระบบ (Admin) และผู้ตรวจเท่านั้นที่สามารถดูหรือแนบไฟล์ผลการตรวจนี้ได้
                    </div>
                  </div>

                  {selectedResult.toLowerCase().includes('oil') && (
                    <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-900">
                      <span className="text-[11px] font-bold">⚠️ งานนี้มีรายการ OIL ที่ต้องติดตามใน Tracking OIL</span>
                      {onOpenOilTracking && (
                        <button
                          type="button"
                          onClick={() => onOpenOilTracking(booking.equipment_no)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-black shrink-0 transition-colors cursor-pointer"
                        >
                          เปิด Tracking OIL
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* SAIS Status / Inspection Result display for regular users (Only for past jobs) */}
              {!canSetInspectionResult && isPastJob && (booking.inspection_result || booking.sais_status) && (
                <div
                  className={`p-3 rounded-2xl border flex flex-col gap-2 text-xs font-bold ${
                    (booking.inspection_result || booking.sais_status || '').toLowerCase().includes('oil')
                      ? 'bg-amber-50 border-amber-300 text-amber-900'
                      : (booking.inspection_result || booking.sais_status || '').toLowerCase().includes('pass')
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icons.FileText size={16} />
                      <div>
                        <span className="text-[10px] opacity-75 block">ผลการตรวจ (SAIS Status)</span>
                        <span className="font-black text-sm">{booking.inspection_result || booking.sais_status}</span>
                      </div>
                    </div>
                    <span className="text-[10px] opacity-75">ตรวจแล้วเมื่อ {booking.date}</span>
                  </div>
                  <div className="text-[10px] font-normal opacity-85 pt-1 border-t border-current/20">
                    🔒 สิทธิ์การเข้าถึงไฟล์ผลการตรวจ: เฉพาะผู้ดูแลระบบ (Admin) และ ผู้ตรวจ เท่านั้น
                  </div>
                </div>
              )}

              {(booking.technician_name || booking.tel) && (
                <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-200 text-xs space-y-1.5">
                  {booking.technician_name && (
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-800 font-bold">ช่างที่หน้างาน</span>
                      <span className="text-emerald-950 font-black">{booking.technician_name}</span>
                    </div>
                  )}
                  {booking.tel && (
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-800 font-bold">เบอร์ติดต่อหน้างาน</span>
                      <a href={`tel:${booking.tel}`} className="text-emerald-700 font-black hover:underline">
                        {booking.tel}
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div>
                <span className="text-slate-400 text-[10px] block mb-1 font-bold">Product Line</span>
                <span
                  className={`font-bold text-white text-xs px-3 py-1 rounded-lg inline-block shadow-sm ${
                    PRODUCT_COLORS[booking.product_line || ''] || 'bg-slate-600'
                  }`}
                >
                  {booking.product_line || 'ไม่ระบุ'}
                </span>
              </div>

              {/* DOCUMENT SCANNER & ATTACHMENTS (FEATURE 1) */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Icons.FileCheck /> เอกสารประกอบการตรวจ
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      สแกนด้วยกล้องหน้าหรืออัปโหลดรูปภาพเอกสาร
                    </span>
                  </div>

                  {canUploadDocs && (
                    <button
                      type="button"
                      onClick={() => openScannerFor('layout')}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Icons.Camera size={15} /> สแกนเอกสารกล้องหน้า
                    </button>
                  )}
                </div>

                {/* 3 Main Documents: Layout, Wiring, Precheck */}
                <div className="space-y-2.5">
                  {(['layout', 'wiring', 'precheck'] as const).map((docKey) => {
                    const fileUrl = booking[`${docKey}_img` as keyof Booking] as string | undefined;
                    const fileName = booking[`${docKey}_filename` as keyof Booking] as string | undefined;
                    const rawStatus = booking[`${docKey}_status` as keyof Booking] as string | undefined;
                    const rawDocFlag = String(booking[`${docKey}_doc` as keyof Booking]);

                    // Determine verification status
                    const isVerified = rawStatus === 'verified' || rawDocFlag === 'verified';
                    const hasFile = Boolean(fileUrl) || rawDocFlag === 'true';

                    const docTitles: Record<string, string> = {
                      layout: 'Layout Document (จำเป็น)',
                      wiring: 'Wiring Document (จำเป็น)',
                      precheck: 'Pre-check Document (จำเป็น)',
                    };

                    const handleToggleVerify = () => {
                      if (!isAdmin || !onUpdateBooking) return;
                      const nextVerified = !isVerified;
                      const updated: Booking = {
                        ...booking,
                        [`${docKey}_status`]: nextVerified ? 'verified' : 'pending',
                        [`${docKey}_doc`]: nextVerified ? 'verified' : (hasFile ? 'true' : 'false'),
                      };
                      onUpdateBooking(updated);
                      setUploadToast(`ปรับสถานะเอกสาร ${docKey.toUpperCase()} เป็น: ${nextVerified ? 'ตรวจสอบแล้ว' : 'รอตรวจสอบ'}`);
                      setTimeout(() => setUploadToast(null), 2500);
                    };

                    return (
                      <div
                        key={docKey}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          isVerified
                            ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                            : hasFile
                            ? 'bg-amber-50/60 border-amber-300 shadow-2xs'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-800">
                                {docTitles[docKey]}
                              </span>
                            </div>

                            {/* Status label: รอตรวจสอบ vs ตรวจสอบแล้ว */}
                            <div className="flex items-center gap-2 mt-1">
                              {hasFile ? (
                                isVerified ? (
                                  <span className="text-[11px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs">
                                    ✓ ตรวจสอบแล้ว
                                  </span>
                                ) : (
                                  <span className="text-[11px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 shadow-2xs animate-pulse">
                                    ⏳ รอตรวจสอบ
                                  </span>
                                )
                              ) : (
                                <span className="text-[10px] text-red-500 font-bold">
                                  ❌ ยังไม่ได้แนบไฟล์
                                </span>
                              )}

                              {fileName && (
                                <span className="text-[10px] text-slate-600 font-medium truncate max-w-[160px]" title={fileName}>
                                  📎 {fileName}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {fileUrl && (
                              <button
                                type="button"
                                onClick={() => onViewFile(fileUrl)}
                                className="text-[11px] bg-white text-blue-600 border border-blue-300 font-bold px-2.5 py-1.5 rounded-xl hover:bg-blue-50 shadow-2xs flex items-center gap-1"
                              >
                                <Icons.Eye size={12} /> ดูเอกสาร
                              </button>
                            )}

                            {/* Admin Document Verification Button */}
                            {isAdmin && hasFile && (
                              <button
                                type="button"
                                onClick={handleToggleVerify}
                                className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl shadow-2xs transition-colors flex items-center gap-1 ${
                                  isVerified
                                    ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                                title="กดเพื่อสลับสถานะ ตรวจสอบแล้ว / รอตรวจสอบ"
                              >
                                <Icons.CheckCircle size={12} />
                                {isVerified ? 'ตรวจสอบแล้ว' : 'ยืนยันตรวจผ่าน'}
                              </button>
                            )}

                            {canUploadDocs && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openScannerFor(docKey)}
                                  className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1.5 rounded-xl shadow-xs flex items-center gap-1"
                                  title="สแกนด้วยกล้องหน้า"
                                >
                                  <Icons.Camera size={12} />
                                  สแกน
                                </button>
                                <button
                                  type="button"
                                  onClick={() => triggerFileInput(docKey)}
                                  className="text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2.5 py-1.5 rounded-xl"
                                  title="อัปโหลดไฟล์ PDF หรือรูปภาพใหม่"
                                >
                                  <Icons.Upload size={12} /> แนบไฟล์
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Site Conditions Photos */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex justify-between items-center mb-2.5">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Icons.Image /> รูปภาพสภาพหน้างาน 6 จุด
                  </h4>
                  {canUploadDocs && (
                    <button
                      type="button"
                      onClick={() => openScannerFor('site_cond_1')}
                      className="text-[11px] text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 flex items-center gap-1"
                    >
                      <Icons.Camera size={13} /> ถ่ายสภาพหน้างาน
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {condLabels.map((cond) => {
                    const urls = booking[cond.key];
                    const count = urls ? urls.split(',').filter(Boolean).length : 0;

                    return (
                      <div
                        key={cond.key}
                        className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-1.5"
                      >
                        <div>
                          <span className="text-[10px] font-bold text-slate-700 block truncate leading-tight">
                            {cond.label}
                          </span>
                          <span className="text-[9px] text-slate-400 block mt-0.5">
                            {count > 0 ? `${count} รูปภาพ` : 'ยังไม่มีรูป'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 pt-1 border-t border-slate-200/60">
                          {count > 0 && (
                            <button
                              type="button"
                              onClick={() => onViewFile(urls!.split(',')[0])}
                              className="text-[9px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded-md font-bold hover:bg-indigo-100 flex-1 text-center"
                            >
                              ดูรูป
                            </button>
                          )}
                          {canUploadDocs && (
                            <button
                              type="button"
                              onClick={() => openScannerFor(cond.docKey)}
                              className="text-[9px] bg-slate-800 hover:bg-slate-900 text-white px-2 py-1 rounded-md font-bold flex-1 flex items-center justify-center gap-0.5"
                            >
                              <Icons.Camera size={11} /> ถ่าย
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* JOB DIRECT LINK & SHARING (Optimized & Clean) */}
              <div className="pt-3 border-t border-slate-200">
                <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-3.5 rounded-2xl shadow-md border border-slate-700">
                  <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Icons.Check size={16} />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold leading-tight flex items-center gap-1.5">
                          {lang === 'th' ? 'ลิงก์ตรงและข้อมูลงาน' : 'Job Direct Link & Quick Actions'}
                        </h4>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          ID: <span className="text-blue-300">{booking.id}</span>
                        </span>
                      </div>
                    </div>

                    <span className="text-[10px] bg-blue-500/20 text-blue-300 font-bold px-2 py-0.5 rounded-md border border-blue-400/30">
                      Cloud Synced
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[11px] text-slate-300 leading-snug">
                      {lang === 'th'
                        ? 'คัดลอกลิงก์ตรงของคิวงานนี้เพื่อส่งต่อให้ผู้ตรวจหรือทีมงานเปิดดูรายละเอียดได้ทันที'
                        : 'Copy the direct URL of this job to quickly share with inspectors or site team.'}
                    </p>

                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={handleCopyJobLink}
                        className="flex-1 sm:flex-initial text-xs px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-1.5 transition-all active:scale-95"
                      >
                        <Icons.Copy size={13} /> {copiedLink ? t.copied : t.copyJobLink}
                      </button>

                      {booking.tel && (
                        <a
                          href={`tel:${booking.tel}`}
                          className="text-xs px-3 py-2 bg-white/10 hover:bg-white/20 text-slate-200 font-bold rounded-xl border border-white/10 flex items-center justify-center gap-1.5 transition-colors shrink-0"
                          title="โทรหาเบอร์หน้างาน"
                        >
                          <Icons.Phone size={13} className="text-emerald-400" /> โทร
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* GOOGLE MAPS PIN & DIRECT NAVIGATION (FEATURE 2) */}
              {(booking.map_link || (booking.latitude && booking.longitude)) && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Icons.MapPin className="text-red-500" /> ตำแหน่งและการนำทาง Google Maps
                    </h4>
                    {booking.latitude && booking.longitude && (
                      <span className="text-[10px] font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        {booking.latitude.toFixed(4)}, {booking.longitude.toFixed(4)}
                      </span>
                    )}
                  </div>

                  {booking.address_detail && (
                    <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      📍 {booking.address_detail}
                    </p>
                  )}

                  <a
                    href={
                      booking.latitude && booking.longitude
                        ? `https://www.google.com/maps/dir/?api=1&destination=${booking.latitude},${booking.longitude}`
                        : booking.map_link && booking.map_link.startsWith('http')
                        ? booking.map_link
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(booking.map_link || booking.site_name)}`
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    <Icons.Navigation size={15} /> {t.navGoogleMaps}
                  </a>
                </div>
              )}
            </>
          )}

          {/* Action buttons inside the scrollable container so they are 100% accessible on mobile */}
          {canManage && (
            <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col gap-2 pb-6">
              {booking.status === 'cancelled' ? (
                <>
                  {onReactivateBooking && (
                    <button
                      onClick={onReactivateBooking}
                      className="w-full py-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl border border-emerald-200 flex items-center justify-center gap-2 text-xs transition-colors shadow-2xs"
                    >
                      <Icons.RefreshCw size={15} /> กู้คืนคิวตรวจกลับมาใช้งาน (Reactivate)
                    </button>
                  )}
                  <button
                    onClick={onEdit}
                    className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-2 text-xs transition-colors"
                  >
                    <Icons.Edit size={14} /> แก้ไขข้อมูลรายการนี้
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onEdit}
                    className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-200 flex items-center justify-center gap-2 text-xs transition-colors"
                  >
                    <Icons.Edit size={14} /> แก้ไขข้อมูลรายการนี้
                  </button>
                  {onCancelBooking && (
                    <button
                      onClick={onCancelBooking}
                      className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded-xl border border-amber-300 flex items-center justify-center gap-2 text-xs transition-colors"
                    >
                      <Icons.AlertCircle size={15} /> ยกเลิกคิวตรวจ (เก็บประวัติไซต์งานไว้)
                    </button>
                  )}
                </>
              )}

              <button
                onClick={onDelete}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl border border-rose-200 flex items-center justify-center gap-2 text-xs transition-colors mt-1"
              >
                <Icons.Trash size={14} /> ลบรายการนี้ออกจากระบบ (ลบถาวร ไม่เก็บประวัติ)
              </button>
              <p className="text-[10px] text-slate-400 text-center leading-tight">
                * ยกเลิกคิวตรวจ จะคงรายการไว้ในตารางและบันทึกประวัติ ส่วนลบรายการจะลบข้อมูลออกถาวร
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Camera Scanner Modal */}
      {scannerOpen && (
        <CameraScannerModal
          initialDocType={scannerTargetDoc}
          bookingTitle={booking.site_name || booking.equipment_no}
          onClose={() => setScannerOpen(false)}
          onSave={handleSaveScannedDocument}
        />
      )}

    </>
  );
};
