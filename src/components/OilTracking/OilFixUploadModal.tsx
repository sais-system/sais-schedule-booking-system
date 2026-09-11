import React, { useState, useRef } from 'react';
import { OilItem, OilTrackingRecord, User } from '../../types';
import { Icons } from '../Icons';
import { getSlaStatus } from '../../utils/oilSlaHelper';

interface OilFixUploadModalProps {
  record: OilTrackingRecord;
  item: OilItem;
  currentUser: User | null;
  onClose: () => void;
  onSubmitFix: (updatedItem: OilItem, isRequestClose: boolean) => Promise<void>;
}

export const OilFixUploadModal: React.FC<OilFixUploadModalProps> = ({
  record,
  item,
  currentUser,
  onClose,
  onSubmitFix,
}) => {
  const [fixNotes, setFixNotes] = useState(item.fix_notes || item.notes || '');
  const [fixPhotos, setFixPhotos] = useState<string[]>(item.fix_photos || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sla = getSlaStatus(item, record.inspection_date);
  const isSupervisorOrFitter =
    currentUser?.role === 'supervisor' ||
    currentUser?.role === 'fitter' ||
    currentUser?.role === 'admin';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Convert to base64 images
    Array.from(files).forEach((file: File) => {
      if (!file.type.startsWith('image/')) {
        setErrorMsg('กรุณาเลือกไฟล์รูปภาพเท่านั้น (JPG, PNG)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('ขนาดรูปภาพต้องไม่เกิน 5MB ต่อรูป');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFixPhotos((prev) => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setFixPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (requestClose: boolean) => {
    if (requestClose && fixPhotos.length === 0 && !fixNotes.trim()) {
      setErrorMsg('กรุณาแนบรูปถ่ายการแก้ไข หรือระบุรายละเอียดงานก่อนกด "ขอปิดรายการ"');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const now = new Date().toISOString();
      const updatedItem: OilItem = {
        ...item,
        fix_photos: fixPhotos,
        fix_notes: fixNotes.trim(),
        fix_updated_at: now,
        fix_submitted_by: currentUser?.full_name || currentUser?.username || 'Technician',
        notes: fixNotes.trim() || item.notes,
        status: requestClose ? 'Request Close' : item.status === 'Closed' ? 'Closed' : 'In Progress',
      };

      await onSubmitFix(updatedItem, requestClose);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[750] flex items-start sm:items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94dvh] my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Icons.Camera size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white truncate">
                  แนบรูปแก้ไข & ดำเนินการ (UID: {item.uid})
                </h2>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black border ${sla.badgeClass}`}>
                  {sla.label}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                ลิฟต์ {record.equipment_no} • {record.site_name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors shrink-0 ml-2"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-4 bg-slate-50">
          {/* Finding detail card */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono font-black text-slate-900 text-xs">
                  UID: {item.uid}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black border ${
                    item.item_type === 'triangle'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : 'bg-red-100 text-red-900 border-red-300'
                  }`}
                >
                  {item.item_type === 'triangle' ? '🔺 สามเหลี่ยม (7 วัน)' : '🟥 สี่เหลี่ยม (28 วัน)'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                  ที่มา: {item.source}
                </span>
              </div>
              <span className="text-xs font-bold text-slate-500">
                วันตรวจ: {item.first_inspection_date || record.inspection_date || '-'}
              </span>
            </div>

            {item.title && <p className="text-xs font-bold text-slate-800">{item.title}</p>}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
              {item.description || 'ไม่มีรายละเอียดข้อบกพร่อง'}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-100 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
              <Icons.AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Fix Action Notes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700">
              รายละเอียดการแก้ไขหน้างาน (Action Notes)
            </label>
            <textarea
              value={fixNotes}
              onChange={(e) => setFixNotes(e.target.value)}
              placeholder="ระบุสิ่งที่ได้ดำเนินการแก้ไข เช่น เปลี่ยนอะไหล่, ปรับตั้งลิมิตสวิตช์, ร้อยท่อสายไฟเรียบร้อยแล้ว..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:border-amber-500 shadow-2xs font-medium"
            />
          </div>

          {/* Fix Photos Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">
                รูปถ่ายยืนยันการแก้ไขหน้างาน (Fix Photos) ({fixPhotos.length} รูป)
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-2xs"
              >
                <Icons.Camera size={14} />
                <span>+ แนบรูปถ่าย</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {fixPhotos.length === 0 ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-amber-400 bg-white hover:bg-amber-50/40 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
              >
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                  <Icons.Camera size={24} />
                </div>
                <p className="text-xs font-bold text-slate-700">คลิกที่นี่เพื่อถ่ายภาพหรืออัปโหลดรูปหลักฐานการแก้ไข</p>
                <p className="text-[11px] text-slate-400">รองรับไฟล์ JPG, PNG ขนาดไม่เกิน 5MB</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {fixPhotos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="relative group aspect-4/3 rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs"
                  >
                    <img
                      src={photo}
                      alt={`Fix proof ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-700 text-white flex items-center justify-center cursor-pointer shadow-md transition-colors"
                      title="ลบรูปนี้"
                    >
                      <Icons.Trash size={13} />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <span className="text-[10px] text-white font-medium">รูปที่ {idx + 1}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current status info */}
          {item.fix_submitted_by && (
            <div className="p-3 rounded-xl bg-slate-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>
                บันทึกการแก้ไขล่าสุดโดย: <b>{item.fix_submitted_by}</b>
              </span>
              <span>
                {item.fix_updated_at ? new Date(item.fix_updated_at).toLocaleString('th-TH') : ''}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 sm:p-5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
          >
            ยกเลิก
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(false)}
              className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors"
            >
              บันทึกฉบับร่าง
            </button>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleSave(true)}
              className="px-5 py-2 text-xs font-black text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
            >
              <Icons.CheckCircle size={15} />
              <span>ขอปิดรายการ (Request Close)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
