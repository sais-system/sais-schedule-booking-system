import React, { useState, useRef } from 'react';
import { Booking, User } from '../../types';
import { Icons } from '../Icons';
import { CameraScannerModal, DocumentTypeKey } from './CameraScannerModal';
import { useTranslation } from '../../i18n';
import { processDriveUpload } from '../../utils/googleDrive';

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
  onViewFile: (url: string) => void;
  onUpdateBooking?: (updated: Booking) => void;
}

export const DetailModal: React.FC<DetailModalProps> = ({
  booking,
  isAdmin,
  user,
  onClose,
  onEdit,
  onDelete,
  onViewFile,
  onUpdateBooking,
}) => {
  const { t, lang } = useTranslation();
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTargetDoc, setScannerTargetDoc] = useState<DocumentTypeKey>('layout');
  const [uploadToast, setUploadToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetKey, setUploadTargetKey] = useState<DocumentTypeKey>('layout');
  const [gdriveInputTarget, setGdriveInputTarget] = useState<DocumentTypeKey | null>(null);
  const [gdriveUrlInput, setGdriveUrlInput] = useState('');

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
    setUploadToast(`อัปโหลดเอกสาร ${docKey.toUpperCase()} ขึ้น Google Drive สำเร็จ`);
    setTimeout(() => setUploadToast(null), 3000);
  };

  const openScannerFor = (docKey: DocumentTypeKey) => {
    setScannerTargetDoc(docKey);
    setScannerOpen(true);
  };

  const triggerFileInput = (docKey: DocumentTypeKey) => {
    setUploadTargetKey(docKey);
    fileInputRef.current?.click();
  };

  const handleDirectFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadToast(`กำลังอัปโหลดไฟล์ ${file.name} ไปยัง Google Drive...`);

    try {
      const driveRes = await processDriveUpload(file, `Job_${booking.equipment_no || booking.site_name || 'Docs'}`);
      handleSaveScannedDocument(uploadTargetKey, driveRes.url, file.name);
    } catch (err) {
      setUploadToast('อัปโหลดไฟล์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      setTimeout(() => setUploadToast(null), 3000);
    }

    e.target.value = '';
  };

  return (
    <>
      <div className="modal-card w-full max-w-lg animate-pop bg-white rounded-3xl shadow-2xl relative flex flex-col max-h-[92vh] overflow-hidden">
        
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
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-emerald-600 text-white text-xs font-bold py-2.5 px-3 rounded-xl shadow-lg flex items-center justify-center gap-1.5 animate-pop z-50">
            <Icons.Check /> {uploadToast}
          </div>
        )}

        {/* Header - FIXED TOP */}
        <div className="p-5 border-b border-slate-100 bg-white flex-shrink-0 relative z-20">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors"
          >
            <Icons.X />
          </button>

          <div className="flex items-center gap-2 pr-10">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Icons.FileText />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800 leading-tight">รายละเอียดงานตรวจ</h3>
              <span className="text-[11px] text-slate-400">ID: {booking.id}</span>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar flex-1 relative bg-white">
          <div className="space-y-4 text-sm text-slate-700">
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

                {booking.tel && (
                  <div className="flex items-center justify-between bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 text-xs">
                    <span className="text-emerald-800 font-bold">เบอร์ติดต่อหน้างาน</span>
                    <a href={`tel:${booking.tel}`} className="text-emerald-700 font-black hover:underline">
                      {booking.tel}
                    </a>
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
                                {fileUrl && (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                    <Icons.Cloud size={10} /> Google Drive
                                  </span>
                                )}
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
                                    onClick={() => {
                                      setGdriveInputTarget(docKey);
                                      setGdriveUrlInput(fileUrl?.startsWith('http') && !fileUrl.startsWith('data:') ? fileUrl : '');
                                    }}
                                    className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2 py-1.5 rounded-xl shadow-xs flex items-center gap-1"
                                    title="ผูกลิงก์ Google Drive (15GB)"
                                  >
                                    <Icons.Cloud size={12} />
                                    Drive
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => openScannerFor(docKey)}
                                    className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2 py-1.5 rounded-xl shadow-xs flex items-center gap-1"
                                    title="สแกนด้วยกล้องหน้า"
                                  >
                                    <Icons.Camera size={12} />
                                    สแกน
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => triggerFileInput(docKey)}
                                    className="text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-2 py-1.5 rounded-xl"
                                    title="อัปโหลดไฟล์ PDF หรือรูปภาพใหม่"
                                  >
                                    <Icons.Upload size={12} />
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
          </div>
        </div>

        {/* Footer - FIXED BOTTOM */}
        {canManage && (
          <div className="p-5 border-t border-slate-100 bg-slate-50 flex flex-col gap-2 flex-shrink-0 z-20">
            <button
              onClick={onEdit}
              className="w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl border border-blue-200 flex items-center justify-center gap-2 text-xs transition-colors"
            >
              <Icons.Edit /> แก้ไขข้อมูลรายการนี้
            </button>
            <button
              onClick={onDelete}
              className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 flex items-center justify-center gap-2 text-xs transition-colors"
            >
              <Icons.Trash /> ลบรายการนี้ออกจากระบบ
            </button>
          </div>
        )}
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

      {/* Google Drive Link Input Dialog */}
      {gdriveInputTarget && (
        <div className="backdrop z-[800] p-4 flex items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-200 animate-pop space-y-3.5">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Icons.Cloud className="text-emerald-600" size={16} /> ผูกลิงก์ Google Drive (15GB)
              </h4>
              <button
                type="button"
                onClick={() => setGdriveInputTarget(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <Icons.X size={16} />
              </button>
            </div>

            <p className="text-[11px] text-slate-600 leading-relaxed">
              วางลิงก์เอกสารจาก Google Drive หรือแชร์โฟลเดอร์สำหรับเอกสารนี้ เพื่อประหยัดพื้นที่จัดเก็บและเปิดดูเอกสาร PDF ความละเอียดสูงได้โดยตรง
            </p>

            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                Google Drive Shared URL:
              </label>
              <input
                type="url"
                value={gdriveUrlInput}
                onChange={(e) => setGdriveUrlInput(e.target.value)}
                placeholder="https://drive.google.com/file/d/... หรือ folder"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setGdriveInputTarget(null)}
                className="flex-1 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-200"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  if (gdriveUrlInput.trim()) {
                    handleSaveScannedDocument(gdriveInputTarget, gdriveUrlInput.trim());
                    setUploadToast('บันทึกลิงก์ Google Drive สำเร็จ');
                    setTimeout(() => setUploadToast(null), 2500);
                  }
                  setGdriveInputTarget(null);
                }}
                className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-xs"
              >
                บันทึกลิงก์
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
