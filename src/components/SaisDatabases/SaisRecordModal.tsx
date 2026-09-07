import React, { useState } from 'react';
import {
  SaisRecord,
  PRODUCT_LINES,
  TYPES,
  CONDITIONS,
  SAIS_STATUSES,
  DEFAULT_INSPECTORS,
  STANDARD_UNITS,
  formatDateForInput,
  parseRemarkHistory,
} from './types';
import { Icons } from '../Icons';
import { User } from '../../types';

interface SaisRecordModalProps {
  record?: SaisRecord | null;
  mode: 'add' | 'edit' | 'view';
  currentUser: User | null;
  inspectorsList: string[];
  onClose: () => void;
  onSave: (record: SaisRecord) => void;
  onDelete?: (id: string) => void;
  onSwitchToEdit?: () => void;
}

export const SaisRecordModal: React.FC<SaisRecordModalProps> = ({
  record,
  mode,
  currentUser,
  inspectorsList,
  onClose,
  onSave,
  onDelete,
  onSwitchToEdit,
}) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const isAdd = mode === 'add';

  const [formData, setFormData] = useState<Partial<SaisRecord>>({
    id: record?.id || `sais_${Date.now()}`,
    equipmentNo: record?.equipmentNo || '',
    inspectionDate: record?.inspectionDate ? formatDateForInput(record.inspectionDate) : formatDateForInput(new Date().toISOString()),
    generatedDate: record?.generatedDate ? formatDateForInput(record.generatedDate) : '',
    generatedInSystem: record?.generatedInSystem || 'YES',
    inspectorName: record?.inspectorName || inspectorsList[0] || DEFAULT_INSPECTORS[0],
    productLine: record?.productLine || 'ES1',
    type: record?.type || 'NI',
    jobSite: record?.jobSite || '',
    unit: record?.unit || 'L1',
    condition: record?.condition || 'Final',
    preCheck: record?.preCheck || 'OK',
    buzzer: record?.buzzer || 'YES',
    saisStatus: record?.saisStatus || 'Passed with Completed',
  });

  const [newComment, setNewComment] = useState('');
  const remarkList = parseRemarkHistory(record?.remark);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.equipmentNo?.trim() || !formData.jobSite?.trim()) {
      alert('กรุณากรอก Equipment No. และ Job Site ให้ครบถ้วน');
      return;
    }

    let finalRemark = record?.remark || '';
    if (newComment.trim()) {
      const now = new Date();
      const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const newEntry = {
        text: newComment.trim(),
        date: timeStr,
        author: currentUser?.full_name || currentUser?.username || 'User',
      };
      const updatedHistory = [...remarkList, newEntry];
      finalRemark = JSON.stringify(updatedHistory);
    }

    onSave({
      id: formData.id || `sais_${Date.now()}`,
      equipmentNo: formData.equipmentNo.trim(),
      inspectionDate: formData.inspectionDate || formatDateForInput(new Date().toISOString()),
      generatedDate: formData.generatedDate || '',
      generatedInSystem: formData.generatedInSystem || 'YES',
      inspectorName: formData.inspectorName || inspectorsList[0] || DEFAULT_INSPECTORS[0],
      productLine: formData.productLine || 'ES1',
      type: formData.type || 'NI',
      jobSite: formData.jobSite.trim(),
      unit: formData.unit || 'L1',
      condition: formData.condition || 'Final',
      preCheck: formData.preCheck || 'OK',
      buzzer: formData.buzzer || 'YES',
      remark: finalRemark,
      saisStatus: formData.saisStatus || 'Passed with Completed',
      bookingRef: record?.bookingRef,
    });
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-600 flex items-center justify-center font-bold text-white shadow-xs">
              <Icons.Database size={16} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-tight">
                {isAdd ? 'เพิ่มรายการ SAIS ใหม่' : isEdit ? 'แก้ไขข้อมูล SAIS' : 'รายละเอียดงานตรวจ (SAIS Record)'}
              </h3>
              <span className="text-[10px] text-slate-400">
                {isView ? `Equipment No: ${formData.equipmentNo || '-'}` : 'ฐานข้อมูลงานตรวจและสถานะ SAIS'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isView && onSwitchToEdit && (
              <button
                type="button"
                onClick={onSwitchToEdit}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl flex items-center gap-1 transition-all"
              >
                <Icons.Edit size={13} /> แก้ไข
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
          {/* Main Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Equipment No. *</label>
              {isView ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900">
                  {formData.equipmentNo || '-'}
                </div>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="เช่น 12345678"
                  value={formData.equipmentNo}
                  onChange={(e) => setFormData({ ...formData, equipmentNo: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                />
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Job Site Name *</label>
              {isView ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 truncate">
                  {formData.jobSite || '-'}
                </div>
              ) : (
                <input
                  type="text"
                  required
                  placeholder="ชื่อโครงการ / สถานที่ติดตั้ง"
                  value={formData.jobSite}
                  onChange={(e) => setFormData({ ...formData, jobSite: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                />
              )}
            </div>
          </div>

          {/* Dates & System Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Inspection Date</label>
              {isView ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-blue-600">
                  {formData.inspectionDate || '-'}
                </div>
              ) : (
                <input
                  type="date"
                  value={formData.inspectionDate}
                  onChange={(e) => setFormData({ ...formData, inspectionDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                />
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Generated Date</label>
              {isView ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700">
                  {formData.generatedDate || '-'}
                </div>
              ) : (
                <input
                  type="date"
                  value={formData.generatedDate}
                  onChange={(e) => setFormData({ ...formData, generatedDate: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-red-500"
                />
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Generated In System</label>
              {isView ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                  {formData.generatedInSystem || '-'}
                </div>
              ) : (
                <select
                  value={formData.generatedInSystem}
                  onChange={(e) => setFormData({ ...formData, generatedInSystem: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="YES">YES</option>
                  <option value="-">-</option>
                </select>
              )}
            </div>
          </div>

          {/* Inspector, Product Line, Type, Unit */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Inspector Name</label>
              {isView ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                  {formData.inspectorName}
                </div>
              ) : (
                <select
                  value={formData.inspectorName}
                  onChange={(e) => setFormData({ ...formData, inspectorName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                >
                  {inspectorsList.map((ins) => (
                    <option key={ins} value={ins}>
                      {ins}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Product Line</label>
              {isView ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                  {formData.productLine}
                </div>
              ) : (
                <select
                  value={formData.productLine}
                  onChange={(e) => setFormData({ ...formData, productLine: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                >
                  {PRODUCT_LINES.map((pl) => (
                    <option key={pl} value={pl}>
                      {pl}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Type</label>
              {isView ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                  {formData.type}
                </div>
              ) : (
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                >
                  {TYPES.map((tp) => (
                    <option key={tp} value={tp}>
                      {tp}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Unit, Condition, Pre Check, Buzzer */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Unit</label>
              {isView ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                  {formData.unit || 'L1'}
                </div>
              ) : (
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="เช่น L1, PL1"
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                />
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Condition</label>
              {isView ? (
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                  {formData.condition}
                </div>
              ) : (
                <select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                >
                  {CONDITIONS.map((cd) => (
                    <option key={cd} value={cd}>
                      {cd}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Pre Check</label>
              {isView ? (
                <div
                  className={`p-2.5 rounded-xl text-xs font-black text-center ${
                    formData.preCheck === 'OK' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {formData.preCheck || '-'}
                </div>
              ) : (
                <select
                  value={formData.preCheck}
                  onChange={(e) => setFormData({ ...formData, preCheck: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="OK">OK</option>
                  <option value="NO">NO</option>
                  <option value="-">-</option>
                </select>
              )}
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-600 block mb-1">Buzzer</label>
              {isView ? (
                <div
                  className={`p-2.5 rounded-xl text-xs font-black text-center ${
                    formData.buzzer === 'YES' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {formData.buzzer || '-'}
                </div>
              ) : (
                <select
                  value={formData.buzzer}
                  onChange={(e) => setFormData({ ...formData, buzzer: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="YES">YES</option>
                  <option value="NO">NO</option>
                  <option value="N/A">N/A</option>
                  <option value="-">-</option>
                </select>
              )}
            </div>
          </div>

          {/* SAIS Status */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 block mb-1">SAIS Status</label>
            {isView ? (
              <div
                className={`p-3 rounded-2xl text-xs font-black flex items-center gap-2 border ${
                  formData.saisStatus?.includes('Completed')
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : formData.saisStatus?.includes('OIL')
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : formData.saisStatus?.includes('Failed')
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-slate-100 text-slate-800 border-slate-300'
                }`}
              >
                <Icons.Target size={16} />
                <span>{formData.saisStatus}</span>
              </div>
            ) : (
              <select
                value={formData.saisStatus}
                onChange={(e) => setFormData({ ...formData, saisStatus: e.target.value })}
                className="w-full p-2.5 border border-slate-300 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-red-500"
              >
                {SAIS_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Remark History & New Comment */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <label className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
              <Icons.MessageSquare size={14} /> ประวัติหมายเหตุ & บันทึก (Remark History)
            </label>

            {remarkList.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar p-2.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                {remarkList.map((item, idx) => (
                  <div key={idx} className="bg-white p-2 rounded-xl border border-slate-100 shadow-2xs space-y-0.5">
                    <div className="flex justify-between text-[10px] text-slate-400">
                      <span className="font-bold text-slate-600">{item.author}</span>
                      <span>{item.date}</span>
                    </div>
                    <p className="text-slate-800 font-medium whitespace-pre-wrap">{item.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 italic p-2 bg-slate-50 rounded-xl">ยังไม่มีหมายเหตุ</div>
            )}

            {!isView && (
              <div className="space-y-1 mt-2">
                <input
                  type="text"
                  placeholder="พิมพ์ความคิดเห็นหรือหมายเหตุเพิ่มเติม..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            {isEdit && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการนี้?')) {
                    onDelete(formData.id || '');
                  }
                }}
                className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Icons.Trash size={14} /> ลบรายการ
              </button>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                {isView ? 'ปิดหน้าต่าง' : 'ยกเลิก'}
              </button>
              {!isView && (
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Icons.Check size={14} /> บันทึกข้อมูล
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
