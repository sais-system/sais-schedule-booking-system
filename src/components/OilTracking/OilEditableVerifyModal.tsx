import React, { useState } from 'react';
import { OilTrackingRecord, OilItem, OilSource, OilItemStatus, Inspector, User, OilVersionHistory } from '../../types';
import { Icons } from '../Icons';
import { calculateSlaDueDate } from '../../utils/oilSlaHelper';

interface OilEditableVerifyModalProps {
  initialData: {
    equipmentNo: string;
    siteName: string;
    inspectorName: string;
    supervisor?: string;
    inspectionDate: string;
    items: OilItem[];
    installerFilename?: string;
    customerFilename?: string;
    existingRecordId?: string;
    bookingId?: string;
    version?: string;
    version_history?: OilVersionHistory[];
  };
  inspectors: Inspector[];
  currentUser: User | null;
  onClose: () => void;
  onSaveToFirebase: (record: OilTrackingRecord) => Promise<void>;
}

export const OilEditableVerifyModal: React.FC<OilEditableVerifyModalProps> = ({
  initialData,
  inspectors,
  currentUser,
  onClose,
  onSaveToFirebase,
}) => {
  const [equipmentNo, setEquipmentNo] = useState(initialData.equipmentNo || '');
  const [siteName, setSiteName] = useState(initialData.siteName || '');
  const [inspectorName, setInspectorName] = useState(initialData.inspectorName || '');
  const [supervisor, setSupervisor] = useState(initialData.supervisor || '');
  const [inspectionDate, setInspectionDate] = useState(initialData.inspectionDate || '');
  const [status, setStatus] = useState<OilTrackingRecord['status']>(
    initialData.items.length > 0 ? 'OIL Recorded' : 'Waiting for PDF'
  );
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<OilItem[]>(initialData.items || []);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showHeaderInfo, setShowHeaderInfo] = useState(false);

  // Stats calculation
  const installerCount = items.filter((i) => i.source === 'Installer').length;
  const customerCount = items.filter((i) => i.source === 'Customer').length;
  const triangleCount = items.filter((i) => i.item_type === 'triangle').length;
  const squareCount = items.filter((i) => i.item_type !== 'triangle').length;

  const handleUpdateItem = (index: number, field: keyof OilItem, value: any) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleToggleSource = (index: number) => {
    setItems((prev) => {
      const copy = [...prev];
      const nextSource: OilSource = copy[index].source === 'Installer' ? 'Customer' : 'Installer';
      const defaultResponsible = nextSource === 'Installer' ? 'Installer / Schindler' : 'Customer (ลูกค้า)';
      copy[index] = { ...copy[index], source: nextSource, responsible: defaultResponsible };
      return copy;
    });
  };

  const handleDeleteItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    const newItem: OilItem = {
      id: `oil_item_${Date.now()}_${items.length + 1}`,
      uid: `Item-${items.length + 1}`,
      item_type: 'square',
      source: 'Installer',
      description: '',
      status: 'Open',
      responsible: 'Installer / Schindler',
      created_at: new Date().toISOString(),
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleConfirmSave = async () => {
    if (!equipmentNo.trim()) {
      setSaveError('กรุณากรอก Equipment No. (Commission Number)');
      return;
    }
    if (!siteName.trim()) {
      setSaveError('กรุณากรอก Elevator Location (Site Name)');
      return;
    }

    setSaveError(null);
    setIsSaving(true);

    try {
      const cleanEq = equipmentNo.trim().replace(/[^\w\u0E00-\u0E7F]/g, '_');
      const cleanDate = inspectionDate.replace(/[^\d]/g, '');
      const recordId =
        initialData.existingRecordId ||
        `oil_${cleanEq}_${cleanDate || Date.now()}`;

      const cleanedItems: OilItem[] = items.map((it, idx) => {
        const finalType = it.item_type || 'square';
        const slaDays = it.sla_days || (finalType === 'triangle' ? 7 : 28);
        const firstInspDate = it.first_inspection_date || inspectionDate.trim() || new Date().toLocaleDateString('th-TH');
        const slaDueDate = it.sla_due_date || calculateSlaDueDate(firstInspDate, slaDays);

        return {
          id: it.id || `oil_item_${Date.now()}_${idx + 1}`,
          uid: it.uid?.trim() || `Item-${idx + 1}`,
          item_type: finalType,
          sla_days: slaDays,
          sla_due_date: slaDueDate,
          first_inspection_date: firstInspDate,
          source: it.source || 'Installer',
          title: it.title?.trim() || '',
          description: it.description?.trim() || '',
          status: it.status || 'Open',
          responsible: it.responsible?.trim() || (it.source === 'Customer' ? 'Customer (ลูกค้า)' : 'Installer / Schindler'),
          created_at: it.created_at || new Date().toISOString(),
          notes: it.notes?.trim() || '',
          fix_photos: it.fix_photos || [],
          fix_notes: it.fix_notes || '',
          fix_updated_at: it.fix_updated_at,
          fix_submitted_by: it.fix_submitted_by,
        };
      });

      const finalRecord: OilTrackingRecord = {
        id: recordId,
        equipment_no: equipmentNo.trim(),
        site_name: siteName.trim(),
        inspector_name: inspectorName.trim() || 'Unassigned',
        supervisor: supervisor.trim(),
        inspection_date: inspectionDate.trim() || new Date().toLocaleDateString('th-TH'),
        status: cleanedItems.length > 0 ? (status === 'Waiting for PDF' ? 'OIL Recorded' : status) : 'Waiting for PDF',
        items: cleanedItems,
        booking_id: initialData.bookingId || '',
        installer_filename: initialData.installerFilename || '',
        customer_filename: initialData.customerFilename || '',
        version: typeof initialData.version === 'number' ? initialData.version : 0,
        version_history: initialData.version_history || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: currentUser?.full_name || currentUser?.username || 'System',
        source: initialData.existingRecordId ? 'auto' : 'manual',
        notes: notes.trim() || '',
      };

      await onSaveToFirebase(finalRecord);
    } catch (err: any) {
      console.error('Error saving oil record:', err);
      setSaveError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกลง Firebase');
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-start sm:items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94dvh] my-auto">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white px-4 py-3 sm:px-5 sm:py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <Icons.FileCheck size={18} />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight truncate">
                ตรวจสอบและแก้ไขข้อมูลก่อนบันทึก (OIL Verification)
              </h2>
              {initialData.version && (
                <span className="px-2.5 py-0.5 bg-purple-500/30 text-purple-200 border border-purple-400/40 text-[11px] font-black rounded-full shrink-0">
                  {initialData.version}
                </span>
              )}
              <span className="hidden sm:inline-block px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold rounded-full shrink-0">
                สำคัญ: ตรวจทาน
              </span>
              {/* Exclamation info button */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowHeaderInfo(!showHeaderInfo)}
                  className="w-5 h-5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] flex items-center justify-center shadow-xs transition-transform hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                  title="คลิกเพื่อดูคำอธิบาย"
                >
                  !
                </button>
                {showHeaderInfo && (
                  <div className="absolute top-7 left-0 sm:left-auto sm:right-0 z-50 w-72 sm:w-80 bg-slate-900 text-slate-200 text-xs p-3 rounded-2xl shadow-xl border border-slate-700 animate-pop">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-1.5">
                      <span className="font-bold text-amber-400 flex items-center gap-1">
                        <span>ℹ️</span> คำแนะนำการตรวจทาน
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowHeaderInfo(false)}
                        className="text-slate-400 hover:text-white text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      ข้อมูลที่สกัดจากไฟล์ PDF Open Item List (Installer & Customer) ท่านสามารถพิมพ์แก้ไขได้ทุกช่องก่อนกดยืนยันบันทึก
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-2"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6 bg-slate-50">
          {saveError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
              <Icons.AlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Section 1: Header / General Information */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600"></span>
                1. ข้อมูลทั่วไปของงานตรวจ (General Details)
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                {initialData.installerFilename && (
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 truncate max-w-[160px]">
                    📄 {initialData.installerFilename}
                  </span>
                )}
                {initialData.customerFilename && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg border border-purple-100 truncate max-w-[160px]">
                    📄 {initialData.customerFilename}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
              {/* Commission number / Equipment No */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Equipment No. (Commission number) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={equipmentNo}
                  onChange={(e) => setEquipmentNo(e.target.value)}
                  placeholder="เช่น 0020114816 หรือ 20114816"
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-hidden"
                />
              </div>

              {/* Elevator location / Site Name */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Site Name (Elevator location) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="เช่น SERMMIT TOWER (L15) (PL2)"
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-hidden"
                />
              </div>

              {/* SAIS Inspector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ชื่อผู้ตรวจ (SAIS Inspector)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inspectorName}
                    onChange={(e) => setInspectorName(e.target.value)}
                    placeholder="เช่น CHOOMUANG CHOOSAK"
                    className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-hidden"
                    list="inspectors-list"
                  />
                  <datalist id="inspectors-list">
                    {inspectors.map((ins) => (
                      <option key={ins.name} value={ins.name} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Supervisor */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  ผู้รับผิดชอบ / Supervisor
                </label>
                <input
                  type="text"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  placeholder="เช่น ช่างติดตั้ง / Supervisor"
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-hidden"
                />
              </div>

              {/* Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  วันที่ตรวจ (Date: DD/MM/YYYY)
                </label>
                <input
                  type="text"
                  value={inspectionDate}
                  onChange={(e) => setInspectionDate(e.target.value)}
                  placeholder="เช่น 07/09/2026"
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  สถานะการติดตาม (OIL Status)
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-red-500 outline-hidden cursor-pointer"
                >
                  <option value="OIL Recorded">OIL Recorded (บันทึกรายการปัญหาแล้ว)</option>
                  <option value="In Progress">In Progress (อยู่ระหว่างแก้ไข)</option>
                  <option value="Waiting for PDF">รออัพโหลดPDFเพื่อดึงรายการOIL</option>
                  <option value="Completed">Completed (แก้ไขครบถ้วน ปิดรายการ)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  บันทึกเพิ่มเติม / หมายเหตุงาน
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="บันทึกข้อความภายใน เช่น ทีมช่างกำลังดำเนินการเข้าแก้ไข..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-red-500 outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Merged OIL Items Editable Table */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  2. รายการปัญหา Open Item List ที่รวมทั้ง 2 ไฟล์ (Editable Table)
                </h3>
                <p className="text-[11px] text-slate-400">
                  ระบบรวมข้อความหลัง 'Annotations Comment' จากไฟล์ Installer และ Customer ให้แล้ว สามารถคลิกพิมพ์แก้ไขหรือเพิ่มแถวได้ทันที
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-300 rounded-xl text-xs font-bold flex items-center gap-1">
                  <span>△</span>
                  <span>สามเหลี่ยม: {triangleCount}</span>
                </span>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1">
                  <span>□</span>
                  <span>สี่เหลี่ยม: {squareCount}</span>
                </span>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold">
                  Installer: {installerCount}
                </span>
                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-bold">
                  Customer: {customerCount}
                </span>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer transition-all"
                >
                  <Icons.Plus size={14} />
                  <span>เพิ่มแถวปัญหา</span>
                </button>
              </div>
            </div>

            {items.length === 0 ? (
              <div className="py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 space-y-2">
                <Icons.FileText size={28} className="mx-auto text-slate-400" />
                <p className="text-xs font-bold text-slate-600">ยังไม่มีรายการปัญหาที่ตรวจพบ</p>
                <p className="text-[11px] text-slate-400">
                  ท่านสามารถกดปุ่ม "เพิ่มแถวปัญหา" ด้านบนเพื่อเพิ่มรายการด้วยตนเองได้
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto custom-scrollbar border border-slate-200 rounded-xl shadow-inner">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 w-28 text-center">สัญลักษณ์</th>
                      <th className="py-2.5 px-3 w-28">หัวข้อ / UID</th>
                      <th className="py-2.5 px-3 min-w-[320px] sm:min-w-[420px]">รายละเอียดปัญหา (Annotations Comment)</th>
                      <th className="py-2.5 px-3 w-28 text-center">แหล่งที่มา</th>
                      <th className="py-2.5 px-3 w-36">ผู้รับผิดชอบ</th>
                      <th className="py-2.5 px-3 w-32">สถานะข้อ</th>
                      <th className="py-2.5 px-3 w-12 text-center">ลบ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {items.map((item, index) => (
                      <tr key={item.id || index} className="hover:bg-slate-50 transition-colors">
                        {/* Index */}
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">
                          {index + 1}
                        </td>

                        {/* Triangle vs Square Toggle */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateItem(
                                index,
                                'item_type',
                                item.item_type === 'triangle' ? 'square' : 'triangle'
                              )
                            }
                            title="คลิกเพื่อสลับระหว่างข้อสามเหลี่ยม (△) และข้อสี่เหลี่ยม (□)"
                            className={`px-2 py-1 rounded-lg text-xs font-black border transition-all cursor-pointer whitespace-nowrap ${
                              item.item_type === 'triangle'
                                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                            }`}
                          >
                            {item.item_type === 'triangle' ? '△ สามเหลี่ยม' : '□ สี่เหลี่ยม'}
                          </button>
                        </td>

                        {/* UID input */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.uid}
                            onChange={(e) => handleUpdateItem(index, 'uid', e.target.value)}
                            placeholder="เช่น 2.14.1.b"
                            className="w-full px-2 py-1 text-xs font-mono font-bold bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-red-500 outline-hidden"
                          />
                        </td>

                        {/* Description Textarea (Enlarged for mobile & multi-line reading/editing) */}
                        <td className="py-2.5 px-3">
                          <textarea
                            value={item.description}
                            onChange={(e) => handleUpdateItem(index, 'description', e.target.value)}
                            placeholder="ระบุข้อความรายละเอียดปัญหา (Annotations Comment)..."
                            rows={3}
                            className="w-full min-h-[90px] px-3 py-2 text-xs sm:text-sm text-slate-800 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:border-red-500 focus:ring-2 focus:ring-red-500/20 outline-hidden leading-relaxed custom-scrollbar resize-y shadow-2xs font-medium"
                          />
                        </td>

                        {/* Source Toggle Button (Positioned next to description box) */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSource(index)}
                            title="คลิกเพื่อสลับแหล่งที่มา (Installer <-> Customer)"
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black border transition-all cursor-pointer whitespace-nowrap shadow-2xs ${
                              item.source === 'Installer'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            }`}
                          >
                            {item.source === 'Installer' ? '🔧 Installer' : '🏢 Customer'}
                          </button>
                        </td>

                        {/* Responsible party */}
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={item.responsible || ''}
                            onChange={(e) => handleUpdateItem(index, 'responsible', e.target.value)}
                            placeholder="ผู้รับผิดชอบ..."
                            className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:border-red-500 outline-hidden"
                          />
                        </td>

                        {/* Item Status */}
                        <td className="py-2.5 px-3">
                          <select
                            value={item.status}
                            onChange={(e) => handleUpdateItem(index, 'status', e.target.value as OilItemStatus)}
                            className={`w-full px-2 py-1 text-xs font-bold rounded-lg border outline-hidden cursor-pointer ${
                              item.status === 'Open'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : item.status === 'In Progress'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <option value="Open">รอแก้ไข (Open)</option>
                            <option value="In Progress">กำลังทำ (In Progress)</option>
                            <option value="Fixed">แก้ไขแล้ว (Fixed)</option>
                            <option value="Verified">ตรวจซ้ำผ่าน (Verified)</option>
                          </select>
                        </td>

                        {/* Delete Action */}
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(index)}
                            className="w-7 h-7 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center mx-auto transition-colors cursor-pointer"
                            title="ลบแถวนี้"
                          >
                            <Icons.Trash />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer / Action Bar */}
        <div className="bg-white border-t border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              พร้อมบันทึก: <b>{items.length}</b> รายการ (Installer <b>{installerCount}</b>, Customer <b>{customerCount}</b>)
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirmSave}
              disabled={isSaving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black shadow-md shadow-red-900/30 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Icons.Loader className="animate-spin" size={16} />
                  <span>กำลังบันทึกลง Firebase...</span>
                </>
              ) : (
                <>
                  <Icons.Check size={16} />
                  <span>ยืนยันและบันทึกลง Firebase</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
