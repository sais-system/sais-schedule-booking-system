import React, { useState } from 'react';
import { OilTrackingRecord, OilItem, OilItemStatus, User } from '../../types';
import { Icons } from '../Icons';
import { getSlaStatus, calculateSlaDueDate } from '../../utils/oilSlaHelper';
import { OilFixUploadModal } from './OilFixUploadModal';

interface OilDetailModalProps {
  record: OilTrackingRecord;
  currentUser?: User | null;
  onClose: () => void;
  onUpdateRecord: (updated: OilTrackingRecord) => Promise<void>;
  onEditHeader: () => void;
  onUploadNewPdf: () => void;
}

export const OilDetailModal: React.FC<OilDetailModalProps> = ({
  record,
  currentUser = null,
  onClose,
  onUpdateRecord,
  onEditHeader,
  onUploadNewPdf,
}) => {
  const [items, setItems] = useState<OilItem[]>(record.items || []);
  const [filterSource, setFilterSource] = useState<'ALL' | 'Installer' | 'Customer'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | OilItemStatus>('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [selectedFixItem, setSelectedFixItem] = useState<OilItem | null>(null);
  const [newUid, setNewUid] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSource, setNewSource] = useState<'Installer' | 'Customer'>('Installer');
  const [newResp, setNewResp] = useState('Installer / Schindler');
  const [newItemType, setNewItemType] = useState<'triangle' | 'square'>('square');

  const installerCount = items.filter((i) => i.source === 'Installer').length;
  const customerCount = items.filter((i) => i.source === 'Customer').length;
  const fixedCount = items.filter((i) => i.status === 'Fixed' || i.status === 'Verified' || i.status === 'Closed in SAP').length;
  const openCount = items.filter((i) => i.status === 'Open' || i.status === 'In Progress' || i.status === 'Request Close').length;

  const handleToggleItemStatus = async (itemId: string) => {
    const updatedItems = items.map((it) => {
      if (it.id === itemId) {
        let nextStatus: OilItemStatus = 'Open';
        if (it.status === 'Open') nextStatus = 'In Progress';
        else if (it.status === 'In Progress') nextStatus = 'Request Close';
        else if (it.status === 'Request Close') nextStatus = 'Fixed';
        else if (it.status === 'Fixed') nextStatus = 'Verified';
        else if (it.status === 'Verified') nextStatus = 'Open';
        else if (it.status === 'Closed in SAP') nextStatus = 'Verified';
        return { ...it, status: nextStatus };
      }
      return it;
    });

    setItems(updatedItems);
    await syncRecord(updatedItems);
  };

  const handleSaveFix = async (photos: string[], notes: string, status: OilItemStatus) => {
    if (!selectedFixItem) return;

    const updatedItems = items.map((it) => {
      if (it.id === selectedFixItem.id) {
        return {
          ...it,
          fix_photos: photos,
          fix_notes: notes,
          status,
          fix_updated_at: new Date().toISOString(),
          fix_submitted_by: currentUser?.full_name || currentUser?.username || 'User',
        };
      }
      return it;
    });

    setItems(updatedItems);
    await syncRecord(updatedItems);
    setSelectedFixItem(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการปัญหานี้?')) return;
    const updatedItems = items.filter((it) => it.id !== itemId);
    setItems(updatedItems);
    await syncRecord(updatedItems);
  };

  const handleAddNewItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc.trim()) return;

    const slaDays = newItemType === 'triangle' ? 7 : 28;
    const baseDate = record.inspection_date || new Date().toLocaleDateString('th-TH');
    const dueDate = calculateSlaDueDate(baseDate, slaDays);

    const newItem: OilItem = {
      id: `oil_item_${Date.now()}_${items.length + 1}`,
      uid: newUid.trim() || `Item-${items.length + 1}`,
      item_type: newItemType,
      sla_days: slaDays,
      first_inspection_date: baseDate,
      sla_due_date: dueDate,
      source: newSource,
      description: newDesc.trim(),
      status: 'Open',
      responsible: newResp.trim(),
      created_at: new Date().toISOString(),
    };

    const updatedItems = [...items, newItem];
    setItems(updatedItems);
    setShowAddItem(false);
    setNewUid('');
    setNewDesc('');
    await syncRecord(updatedItems);
  };

  const syncRecord = async (newItems: OilItem[]) => {
    setIsSaving(true);
    try {
      // If all items fixed/verified, suggest or set status
      let nextRecordStatus = record.status;
      if (newItems.length > 0 && newItems.every((i) => i.status === 'Fixed' || i.status === 'Verified')) {
        nextRecordStatus = 'Completed';
      } else if (newItems.length > 0 && nextRecordStatus === 'Waiting for PDF') {
        nextRecordStatus = 'OIL Recorded';
      }

      const updatedRecord: OilTrackingRecord = {
        ...record,
        items: newItems,
        status: nextRecordStatus,
        updated_at: new Date().toISOString(),
      };
      await onUpdateRecord(updatedRecord);
    } catch (err) {
      console.error('Error updating items:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtering
  const filteredItems = items.filter((it) => {
    if (filterSource !== 'ALL' && it.source !== filterSource) return false;
    if (filterStatus !== 'ALL' && it.status !== filterStatus) return false;
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase();
      const matchUid = it.uid?.toLowerCase().includes(q);
      const matchDesc = it.description?.toLowerCase().includes(q);
      const matchResp = it.responsible?.toLowerCase().includes(q);
      if (!matchUid && !matchDesc && !matchResp) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[550] flex items-start sm:items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-5xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94dvh] my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400">
              <Icons.FileText size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  รายละเอียด OIL: Equipment No. {record.equipment_no}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-purple-500/30 text-purple-200 border border-purple-400/40">
                  {record.version || 'V.0'}
                </span>
                {record.version_history && record.version_history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowVersionHistory(!showVersionHistory)}
                    className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Icons.History size={10} />
                    <span>ประวัติ ({record.version_history.length})</span>
                  </button>
                )}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                    record.status === 'Waiting for PDF'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : record.status === 'Completed'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  }`}
                >
                  {record.status === 'Waiting for PDF' ? 'รออัพโหลดPDFเพื่อดึงรายการOIL' : record.status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {record.site_name} | วันที่ตรวจ: {record.inspection_date || '-'} | ผู้ตรวจ: {record.inspector_name || '-'}
                {record.supervisor ? ` | Supervisor: ${record.supervisor}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="พิมพ์รายงาน"
            >
              <Icons.Download size={16} />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            >
              <Icons.X size={16} />
            </button>
          </div>
        </div>

        {/* Version History Collapsible Panel */}
        {showVersionHistory && record.version_history && record.version_history.length > 0 && (
          <div className="bg-purple-900 text-white p-4 border-b border-purple-800 shrink-0 animate-fade-in">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-black text-purple-200 flex items-center gap-1.5">
                <Icons.History size={14} />
                <span>ประวัติ Version Control (การเปรียบเทียบไฟล์ตรวจ V.0 ➔ V.1 ...)</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowVersionHistory(false)}
                className="text-purple-300 hover:text-white text-xs cursor-pointer"
              >
                ✕ ปิด
              </button>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {record.version_history.map((vh, vIdx) => (
                <div
                  key={vIdx}
                  className="bg-purple-950/60 p-2.5 rounded-xl border border-purple-800/80 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-purple-500 text-white rounded-md font-black text-[11px]">
                      {vh.version}
                    </span>
                    <span className="text-purple-200 text-[11px]">
                      อัปโหลด: {new Date(vh.uploaded_at).toLocaleString('th-TH')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px]">
                    <span className="text-purple-300">รวม {vh.items_count} ข้อ</span>
                    <span className="text-emerald-300 font-bold">Closed in SAP: {vh.closed_in_sap_count}</span>
                    <span className="text-blue-300 font-bold">ใหม่: {vh.new_items_count}</span>
                    <span className="text-amber-300 font-bold">คงเดิม (นับต่อ): {vh.retained_items_count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Summary Cards */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
            <p className="text-[10px] font-bold text-slate-400">ปัญหาทั้งหมด</p>
            <p className="text-base font-black text-slate-800">{items.length} ข้อ</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-blue-200">
            <p className="text-[10px] font-bold text-blue-500">Installer (Schindler)</p>
            <p className="text-base font-black text-blue-700">{installerCount} ข้อ</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-purple-200">
            <p className="text-[10px] font-bold text-purple-500">Customer (ลูกค้า)</p>
            <p className="text-base font-black text-purple-700">{customerCount} ข้อ</p>
          </div>
          <div className="bg-white p-2.5 rounded-xl border border-emerald-200">
            <p className="text-[10px] font-bold text-emerald-500">แก้ไขแล้ว (Fixed)</p>
            <p className="text-base font-black text-emerald-700">{fixedCount} / {items.length} ข้อ</p>
          </div>
        </div>

        {/* PDF & Google Drive Source Files Card */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-6 py-2.5 shrink-0 flex flex-wrap items-center justify-between gap-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <Icons.FileText size={15} className="text-red-500" />
              <span>เอกสารต้นฉบับ PDF:</span>
            </span>

            {/* Installer PDF View Button */}
            {record.installer_filename ? (
              <a
                href={record.installer_pdf_url || `https://drive.google.com/drive/search?q=${encodeURIComponent(record.installer_filename)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all active:scale-95"
                title={`เปิดไฟล์ PDF Installer: ${record.installer_filename}`}
              >
                <span>🔧 ดู PDF Installer</span>
                <Icons.ExternalLink size={12} />
              </a>
            ) : (
              <span className="text-[11px] text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-lg">ไม่มี PDF Installer</span>
            )}

            {/* Customer PDF View Button */}
            {record.customer_filename ? (
              <a
                href={record.customer_pdf_url || `https://drive.google.com/drive/search?q=${encodeURIComponent(record.customer_filename)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all active:scale-95"
                title={`เปิดไฟล์ PDF Customer: ${record.customer_filename}`}
              >
                <span>🏢 ดู PDF Customer</span>
                <Icons.ExternalLink size={12} />
              </a>
            ) : (
              <span className="text-[11px] text-slate-400 bg-slate-200/60 px-2 py-0.5 rounded-lg">ไม่มี PDF Customer</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://drive.google.com/drive/search?q=${encodeURIComponent(record.equipment_no || record.site_name || '')}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold shadow-2xs transition-all active:scale-95"
              title="ค้นหาเอกสารทั้งหมดใน Google Drive"
            >
              <Icons.Cloud size={14} className="text-emerald-600" />
              <span>เปิด Google Drive</span>
              <Icons.ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Filter & Toolbar */}
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 max-w-xs">
              <Icons.Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="ค้นหารายละเอียด UID, ปัญหา..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-red-500 outline-hidden"
              />
            </div>

            {/* Filter by Source */}
            <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs">
              <button
                onClick={() => setFilterSource('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterSource === 'ALL' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500'
                }`}
              >
                ทั้งหมด
              </button>
              <button
                onClick={() => setFilterSource('Installer')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterSource === 'Installer' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                Installer ({installerCount})
              </button>
              <button
                onClick={() => setFilterSource('Customer')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  filterSource === 'Customer' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                Customer ({customerCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddItem(!showAddItem)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Icons.Plus size={14} />
              <span>เพิ่มปัญหาใหม่</span>
            </button>
            <button
              onClick={onUploadNewPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
            >
              <Icons.Upload size={14} />
              <span>อัปโหลด PDF เพิ่ม</span>
            </button>
            <button
              onClick={onEditHeader}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
            >
              <Icons.Edit size={14} />
              <span>แก้ไขตารางรวม</span>
            </button>
          </div>
        </div>

        {/* Add Item Inline Drawer */}
        {showAddItem && (
          <form
            onSubmit={handleAddNewItem}
            className="p-4 bg-red-50/60 border-b border-red-200 space-y-3 shrink-0"
          >
            <h4 className="text-xs font-black text-red-900 flex items-center gap-2">
              <Icons.Plus size={14} />
              เพิ่มรายการปัญหาใหม่
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">เลขหัวข้อ (UID)</label>
                <input
                  type="text"
                  value={newUid}
                  onChange={(e) => setNewUid(e.target.value)}
                  placeholder="เช่น 2.14.1.b"
                  className="w-full px-2.5 py-1.5 text-xs font-mono font-bold bg-white border border-slate-300 rounded-lg outline-hidden focus:border-red-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">ประเภทสัญลักษณ์ / SLA</label>
                <select
                  value={newItemType}
                  onChange={(e) => setNewItemType(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 text-xs font-bold bg-white border border-slate-300 rounded-lg outline-hidden focus:border-red-500"
                >
                  <option value="triangle">🔺 สามเหลี่ยม (SLA 7 วัน)</option>
                  <option value="square">🟥 สี่เหลี่ยม (SLA 28 วัน)</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">ผู้รับผิดชอบ</label>
                <input
                  type="text"
                  value={newResp}
                  onChange={(e) => setNewResp(e.target.value)}
                  placeholder="เช่น ทีมช่างติดตั้ง หรือ ลูกค้า"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-hidden focus:border-red-500"
                />
              </div>
            </div>

            {/* Enlarged Text Box with Source Field Adjacent */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-start">
              <div className="sm:col-span-9">
                <label className="block text-[10px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>รายละเอียดปัญหา (Annotations Comment) <span className="text-red-500">*</span></span>
                  <span className="text-[10px] text-slate-400 font-normal">รองรับข้อความยาวและการพิมพ์บนมือถือ</span>
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="ระบุรายละเอียดปัญหาที่ต้องแก้ไข..."
                  rows={4}
                  className="w-full min-h-[110px] sm:min-h-[90px] px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-xl outline-hidden focus:border-red-500 focus:ring-2 focus:ring-red-500/20 resize-y leading-relaxed text-slate-800 font-medium shadow-2xs"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-700 mb-1">แหล่งที่มา</label>
                <select
                  value={newSource}
                  onChange={(e) => {
                    const src = e.target.value as any;
                    setNewSource(src);
                    setNewResp(src === 'Installer' ? 'Installer / Schindler' : 'Customer (ลูกค้า)');
                  }}
                  className={`w-full px-3 py-2.5 text-xs sm:text-sm font-bold border rounded-xl outline-hidden cursor-pointer shadow-2xs ${
                    newSource === 'Installer'
                      ? 'bg-blue-50 text-blue-800 border-blue-300'
                      : 'bg-purple-50 text-purple-800 border-purple-300'
                  }`}
                >
                  <option value="Installer">🔧 Installer (Schindler)</option>
                  <option value="Customer">🏢 Customer (ลูกค้า)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">กำหนดต้นทางข้อผิดพลาด</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddItem(false)}
                className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-xs cursor-pointer"
              >
                บันทึกรายการ
              </button>
            </div>
          </form>
        )}

        {/* Items List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-3 bg-slate-50">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <Icons.FileText size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">
                {items.length === 0
                  ? 'ยังไม่มีรายการปัญหาในงานนี้ (สถานะ: รออัพโหลดPDFเพื่อดึงรายการOIL)'
                  : 'ไม่พบรายการที่ตรงกับเงื่อนไขการค้นหา'}
              </p>
              {items.length === 0 && (
                <button
                  onClick={onUploadNewPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  <Icons.Upload size={14} />
                  <span>อัปโหลดไฟล์ PDF 2 ไฟล์เดี๋ยวนี้</span>
                </button>
              )}
            </div>
          ) : (
              filteredItems.map((item, index) => {
                const slaInfo = getSlaStatus(item, record.inspection_date);
                const isTriangle = item.item_type === 'triangle' || item.sla_days === 7;

                return (
                  <div
                    key={item.id || index}
                    className={`bg-white p-4 rounded-2xl border transition-all space-y-3 ${
                      (slaInfo.status === 'OVERDUE' || slaInfo.isOverdue) && item.status !== 'Closed in SAP' && item.status !== 'Verified' && item.status !== 'Fixed'
                        ? 'border-red-300 bg-red-50/20 shadow-xs ring-1 ring-red-200'
                        : 'border-slate-200 hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Source */}
                        <span
                          className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black border ${
                            item.source === 'Installer'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {item.source === 'Installer' ? '🔧 Installer (Schindler)' : '🏢 Customer (ลูกค้า)'}
                        </span>

                        {/* UID */}
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[10px] font-mono font-bold">
                          UID: {item.uid}
                        </span>

                        {/* Symbol & SLA Days */}
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-black border flex items-center gap-1 ${
                            isTriangle
                              ? 'bg-orange-50 text-orange-700 border-orange-200'
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}
                        >
                          <span>{isTriangle ? '🔺' : '🟥'}</span>
                          <span>{isTriangle ? '7 วัน' : '28 วัน'}</span>
                        </span>

                        {/* SLA Countdown Badge */}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border ${slaInfo.badgeClass}`}>
                          {slaInfo.label}
                        </span>

                        {item.responsible && (
                          <span className="text-[11px] text-slate-500">
                            ผู้รับผิดชอบ: <b>{item.responsible}</b>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Action: Attach fix photos */}
                        <button
                          type="button"
                          onClick={() => setSelectedFixItem(item)}
                          className="px-2.5 py-1 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 transition-colors cursor-pointer flex items-center gap-1.5"
                          title="แนบรูปถ่ายหน้างานและขอปิดรายการ"
                        >
                          <Icons.Camera size={13} className="text-slate-600" />
                          <span>แนบรูปแก้ไข</span>
                          {item.fix_photos && item.fix_photos.length > 0 && (
                            <span className="w-4 h-4 rounded-full bg-red-600 text-white text-[9px] flex items-center justify-center font-bold">
                              {item.fix_photos.length}
                            </span>
                          )}
                        </button>

                        {/* Status Toggle Badge */}
                        <button
                          type="button"
                          onClick={() => handleToggleItemStatus(item.id)}
                          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                            item.status === 'Fixed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : item.status === 'Verified'
                              ? 'bg-teal-50 text-teal-700 border-teal-300 hover:bg-teal-100'
                              : item.status === 'Closed in SAP'
                              ? 'bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100'
                              : item.status === 'Request Close'
                              ? 'bg-amber-100 text-amber-900 border-amber-400 hover:bg-amber-200'
                              : item.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                              : 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                          }`}
                        >
                          {item.status === 'Fixed' || item.status === 'Verified' || item.status === 'Closed in SAP' ? (
                            <Icons.CheckCircle size={14} className="text-emerald-600" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                          )}
                          <span>
                            {item.status === 'Open'
                              ? 'รอแก้ไข (Open)'
                              : item.status === 'In Progress'
                              ? 'กำลังทำ (In Progress)'
                              : item.status === 'Request Close'
                              ? 'ขอปิดงาน (Request Close)'
                              : item.status === 'Fixed'
                              ? 'แก้ไขแล้ว (Fixed)'
                              : item.status === 'Closed in SAP'
                              ? 'ปิดใน SAP แล้ว'
                              : 'ตรวจซ้ำผ่าน (Verified)'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-slate-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                          title="ลบข้อนี้"
                        >
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>

                    {/* Problem Description */}
                    <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-100 text-xs text-slate-800 leading-relaxed font-medium">
                      {item.description}
                    </div>

                    {/* Fix Photos & Fix Notes preview if any */}
                    {(item.fix_notes || (item.fix_photos && item.fix_photos.length > 0)) && (
                      <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2 text-xs">
                        <div className="flex items-center justify-between text-emerald-900 font-bold text-[11px]">
                          <span className="flex items-center gap-1.5">
                            <Icons.CheckCircle size={13} className="text-emerald-600" />
                            <span>หลักฐานการแก้ไขหน้างาน</span>
                          </span>
                          {item.fix_submitted_by && (
                            <span className="text-emerald-700 font-normal text-[10px]">
                              โดย: {item.fix_submitted_by} {item.fix_updated_at ? `(${new Date(item.fix_updated_at).toLocaleDateString('th-TH')})` : ''}
                            </span>
                          )}
                        </div>
                        {item.fix_notes && (
                          <p className="text-slate-700 text-xs bg-white/80 p-2 rounded-lg border border-emerald-100">
                            {item.fix_notes}
                          </p>
                        )}
                        {item.fix_photos && item.fix_photos.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {item.fix_photos.map((photoUrl, pIdx) => (
                              <img
                                key={pIdx}
                                src={photoUrl}
                                alt={`หลักฐาน ${pIdx + 1}`}
                                className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs hover:scale-105 transition-transform cursor-pointer"
                                onClick={() => setSelectedFixItem(item)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Inspection & SLA timeline info */}
                    <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>ตรวจครั้งแรก: {item.first_inspection_date || record.inspection_date || '-'}</span>
                      <span>กำหนดเสร็จตาม SLA: {item.sla_due_date || '-'}</span>
                    </div>
                  </div>
                );
              })
            )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-400">
            อัปเดตล่าสุด: {record.updated_at ? new Date(record.updated_at).toLocaleString('th-TH') : '-'}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Fix Upload Modal */}
      {selectedFixItem && (
        <OilFixUploadModal
          item={selectedFixItem}
          record={record}
          currentUser={currentUser}
          onClose={() => setSelectedFixItem(null)}
          onSaveFix={handleSaveFix}
        />
      )}
    </div>
  );
};
