import React, { useState } from 'react';
import { OilMasterUid, User } from '../../types';
import { Icons } from '../Icons';
import { DEFAULT_OIL_MASTER_UIDS, normalizeUid } from '../../utils/oilSlaHelper';

interface OilMasterDataModalProps {
  masterList: OilMasterUid[];
  currentUser: User | null;
  onClose: () => void;
  onSaveItem: (item: OilMasterUid) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onBatchSave: (items: OilMasterUid[]) => Promise<void>;
}

export const OilMasterDataModal: React.FC<OilMasterDataModalProps> = ({
  masterList,
  currentUser,
  onClose,
  onSaveItem,
  onDeleteItem,
  onBatchSave,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'triangle' | 'square'>('ALL');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState<OilMasterUid | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [uidInput, setUidInput] = useState('');
  const [typeInput, setTypeInput] = useState<'triangle' | 'square'>('triangle');
  const [categoryInput, setCategoryInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const triangleCount = masterList.filter((m) => m.item_type === 'triangle').length;
  const squareCount = masterList.filter((m) => m.item_type === 'square').length;

  const handleOpenAdd = () => {
    setEditingItem(null);
    setUidInput('');
    setTypeInput('triangle');
    setCategoryInput('');
    setDescInput('');
    setFormError(null);
    setShowAddForm(true);
  };

  const handleOpenEdit = (item: OilMasterUid) => {
    setEditingItem(item);
    setUidInput(item.uid);
    setTypeInput(item.item_type);
    setCategoryInput(item.category || '');
    setDescInput(item.description || '');
    setFormError(null);
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uidInput.trim()) {
      setFormError('กรุณากรอกเลข UID No.');
      return;
    }

    // Check duplicate if adding new
    const clean = normalizeUid(uidInput);
    if (!editingItem) {
      const exists = masterList.some((m) => normalizeUid(m.uid) === clean);
      if (exists) {
        setFormError(`เลข UID No. "${uidInput.trim()}" มีอยู่ในระบบแล้ว กรุณาแก้ไขรายการเดิมแทน`);
        return;
      }
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const itemToSave: OilMasterUid = {
        id: editingItem?.id || `uid_master_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        uid: uidInput.trim(),
        item_type: typeInput,
        sla_days: typeInput === 'triangle' ? 7 : 28,
        category: categoryInput.trim() || 'ทั่วไป',
        description: descInput.trim(),
        updated_at: new Date().toISOString(),
        updated_by: currentUser?.full_name || currentUser?.username || 'Admin',
      };

      await onSaveItem(itemToSave);
      setShowAddForm(false);
      setEditingItem(null);
    } catch (err: any) {
      setFormError(err?.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (item: OilMasterUid) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบ UID "${item.uid}" จาก Master Data?`)) {
      return;
    }
    try {
      await onDeleteItem(item.id);
    } catch (err) {
      console.error('Failed to delete master UID:', err);
      alert('เกิดข้อผิดพลาดในการลบ UID');
    }
  };

  const handleResetDefaults = async () => {
    if (
      !window.confirm(
        'ต้องการโหลดค่าตั้งต้นมาตรฐาน Schindler SAIS Master Data (12 รายการหลัก) หรือไม่? ข้อมูลที่เพิ่มไว้เดิมจะไม่สูญหาย'
      )
    ) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Merge defaults with any custom items
      const existingUids = new Set(masterList.map((m) => normalizeUid(m.uid)));
      const itemsToAdd = DEFAULT_OIL_MASTER_UIDS.filter(
        (def) => !existingUids.has(normalizeUid(def.uid))
      );

      const merged = [...masterList, ...itemsToAdd];
      await onBatchSave(merged);
      alert(`โหลดค่าเริ่มต้นเรียบร้อยแล้ว (เพิ่ม ${itemsToAdd.length} รายการใหม่)`);
    } catch (err) {
      console.error('Failed to reset defaults:', err);
      alert('เกิดข้อผิดพลาดในการโหลดค่าเริ่มต้น');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter list
  const filteredList = masterList.filter((m) => {
    if (filterType !== 'ALL' && m.item_type !== filterType) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchUid = m.uid?.toLowerCase().includes(q);
      const matchDesc = m.description?.toLowerCase().includes(q);
      const matchCat = m.category?.toLowerCase().includes(q);
      if (!matchUid && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-[700] flex items-start sm:items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-4xl rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94dvh] my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <Icons.Settings size={22} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white truncate">
                  จัดการ UID Master Data (สัญลักษณ์ 🔺/🟥 & SLA)
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-red-600/40 text-red-200 text-[10px] font-bold border border-red-500/30">
                  เฉพาะ Admin
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                กำหนดว่าเลข UID No. ใดเป็น 🔺 (7 วัน) หรือ 🟥 (28 วัน) สำหรับระบบเปรียบเทียบและตั้งเวลา SLA อัตโนมัติ
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

        {/* Quick Stats Banner */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 sm:px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-white border border-slate-200 font-bold text-slate-700">
              รวมทั้งหมด: <b className="text-slate-900">{masterList.length}</b> รายการ
            </span>
            <span className="px-3 py-1 rounded-xl bg-amber-50 border border-amber-300 font-black text-amber-900 flex items-center gap-1.5">
              <span>🔺 สามเหลี่ยม (SLA 7 วัน):</span>
              <b>{triangleCount} ข้อ</b>
            </span>
            <span className="px-3 py-1 rounded-xl bg-red-50 border border-red-300 font-black text-red-900 flex items-center gap-1.5">
              <span>🟥 สี่เหลี่ยม (SLA 28 วัน):</span>
              <b>{squareCount} ข้อ</b>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
              title="เพิ่มชุด UID มาตรฐานของ Schindler SAIS"
            >
              <Icons.RefreshCw size={12} className={isSubmitting ? 'animate-spin' : ''} />
              <span>โหลดค่าเริ่มต้น SAIS</span>
            </button>
            <button
              type="button"
              onClick={handleOpenAdd}
              className="px-3.5 py-1.5 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
            >
              <Icons.Plus size={14} />
              <span>+ เพิ่ม UID ใหม่</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 sm:px-6 border-b border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Icons.Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเลข UID, หมวดหมู่, คำอธิบาย..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-red-500 outline-hidden"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center rounded-xl bg-slate-100 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              ทั้งหมด ({masterList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('triangle')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'triangle' ? 'bg-amber-100 text-amber-950 font-black shadow-xs' : 'text-slate-500'
              }`}
            >
              🔺 สามเหลี่ยม (7 วัน)
            </button>
            <button
              type="button"
              onClick={() => setFilterType('square')}
              className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                filterType === 'square' ? 'bg-red-100 text-red-950 font-black shadow-xs' : 'text-slate-500'
              }`}
            >
              🟥 สี่เหลี่ยม (28 วัน)
            </button>
          </div>
        </div>

        {/* Add / Edit Form Drawer */}
        {showAddForm && (
          <form
            onSubmit={handleSubmit}
            className="p-4 sm:p-5 bg-gradient-to-r from-red-50/70 via-slate-50 to-amber-50/60 border-b border-red-200 space-y-3 shrink-0 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs sm:text-sm font-black text-slate-900 flex items-center gap-2">
                {editingItem ? <Icons.Edit size={16} className="text-blue-600" /> : <Icons.Plus size={16} className="text-red-600" />}
                <span>{editingItem ? `แก้ไข UID: ${editingItem.uid}` : 'เพิ่มเลข UID ใหม่ใน Master Data'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer text-xs"
              >
                ปิดฟอร์ม
              </button>
            </div>

            {formError && (
              <div className="p-2.5 rounded-xl bg-red-100 border border-red-300 text-red-800 text-xs font-bold flex items-center gap-2">
                <Icons.AlertCircle size={14} />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  เลขหัวข้อ (UID No.) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={uidInput}
                  onChange={(e) => setUidInput(e.target.value)}
                  placeholder="เช่น 2.14.1.b หรือ 6.0.6.b"
                  className="w-full px-3 py-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl outline-hidden focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  สัญลักษณ์ & SLA กำหนดเสร็จ <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTypeInput('triangle')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      typeInput === 'triangle'
                        ? 'bg-amber-100 text-amber-950 border-amber-400 shadow-xs ring-2 ring-amber-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>🔺 7 วัน (△)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeInput('square')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      typeInput === 'square'
                        ? 'bg-red-100 text-red-950 border-red-400 shadow-xs ring-2 ring-red-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span>🟥 28 วัน (□)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">หมวดหมู่งาน (Category)</label>
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  placeholder="เช่น บ่อลิฟต์, หลังคาหัวลิฟต์, ห้องเครื่อง"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:border-red-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                คำอธิบายมาตรฐาน / หัวข้อคำถาม (Description)
              </label>
              <textarea
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                placeholder="ระบุชื่อหัวข้อหรือคำอธิบายข้อความเพื่อใช้ในการอ้างอิง..."
                rows={2}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl outline-hidden focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'กำลังบันทึก...' : editingItem ? 'บันทึกการแก้ไข' : 'เพิ่ม UID นี้'}
              </button>
            </div>
          </form>
        )}

        {/* Master Data Table */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 bg-slate-50">
          {filteredList.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <Icons.FileText size={32} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-600">
                {masterList.length === 0 ? 'ยังไม่มีข้อมูลใน Master Data' : 'ไม่พบ UID ที่ตรงกับคำค้นหา'}
              </p>
              <button
                type="button"
                onClick={handleResetDefaults}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                <Icons.RefreshCw size={14} />
                <span>โหลดชุดข้อมูลเริ่มต้นของ Schindler SAIS</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase">
                    <th className="py-3 px-3 sm:px-4 w-36">เลขหัวข้อ (UID)</th>
                    <th className="py-3 px-2 sm:px-3 w-40">สัญลักษณ์ & SLA</th>
                    <th className="py-3 px-2 sm:px-3 hidden sm:table-cell w-36">หมวดหมู่</th>
                    <th className="py-3 px-3 sm:px-4">คำอธิบายข้อตรวจ (Question Description)</th>
                    <th className="py-3 px-3 text-right w-24">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 sm:px-4">
                        <span className="font-mono font-black text-slate-900 bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg text-xs">
                          {item.uid}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 sm:px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black border ${
                            item.item_type === 'triangle'
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-red-100 text-red-900 border-red-300'
                          }`}
                        >
                          <span>{item.item_type === 'triangle' ? '🔺 △' : '🟥 □'}</span>
                          <span>{item.item_type === 'triangle' ? '7 วัน (△)' : '28 วัน (□)'}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-2 sm:px-3 hidden sm:table-cell text-slate-600 font-medium">
                        {item.category || '-'}
                      </td>
                      <td className="py-2.5 px-3 sm:px-4 text-slate-800 leading-relaxed font-normal">
                        {item.description || <span className="text-slate-400 italic">ไม่มีคำอธิบาย</span>}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="แก้ไข UID นี้"
                          >
                            <Icons.Edit size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="ลบ UID นี้"
                          >
                            <Icons.Trash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-white flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-500">
            * สัญลักษณ์ 🔺 (สามเหลี่ยม) บังคับ SLA 7 วัน, 🟥 (สี่เหลี่ยม) บังคับ SLA 28 วัน นับจากวันตรวจ
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
