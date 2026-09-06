import React, { useState } from 'react';
import { Inspector } from '../../types';
import { Icons } from '../Icons';

const ALL_PRODUCT_LINES = [
  'ES1',
  '3300',
  '5500',
  'ES5/ES5.1',
  'S-villas',
  'ES2',
  'ES3',
  'MOR-R',
  'MOD-T',
  'S7R4',
  'Flex7',
  'ESC/MW',
];

interface InspectorModalProps {
  inspector?: Inspector | null;
  onClose: () => void;
  onSave: (name: string, productLines: string, oldName?: string) => void;
  setAlertMsg: (msg: string | null) => void;
}

export const InspectorModal: React.FC<InspectorModalProps> = ({
  inspector,
  onClose,
  onSave,
  setAlertMsg,
}) => {
  const isEditing = Boolean(inspector);
  const [name, setName] = useState(inspector?.name || '');
  const [selectedCerts, setSelectedCerts] = useState<string[]>(() => {
    if (!inspector?.product_lines) return ['ES1', '3300', 'S-villas'];
    return inspector.product_lines.split(',').map((s) => s.trim()).filter(Boolean);
  });

  const toggleCert = (pl: string) => {
    setSelectedCerts((prev) =>
      prev.includes(pl) ? prev.filter((p) => p !== pl) : [...prev, pl]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setAlertMsg('กรุณากรอกชื่อผู้ตรวจ');
      return;
    }
    const linesStr = selectedCerts.join(', ');
    onSave(name.trim(), linesStr, inspector?.name);
  };

  return (
    <div className="modal-card p-6 w-full max-w-md bg-white rounded-3xl shadow-2xl animate-pop relative">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full transition-colors"
      >
        <Icons.X />
      </button>

      <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-3">
        <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
          {isEditing ? <Icons.Edit /> : <Icons.UserPlus />}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800 leading-tight">
            {isEditing ? 'แก้ไขข้อมูลผู้ตรวจ' : 'เพิ่มผู้ตรวจใหม่'}
          </h3>
          <span className="text-[11px] text-slate-400">กำหนดใบรับรอง Certificate ประจำตัว</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold text-slate-700 mb-1 block">
            ชื่อผู้ตรวจ <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="เช่น สมศักดิ์ หรือ รหัสประจำตัว"
            className="w-full text-xs p-3 rounded-xl border border-slate-300 font-bold bg-slate-50 focus:bg-white outline-none focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-indigo-950">กำหนดสิทธิ์รับงาน (Product Line)</label>
            <button
              type="button"
              onClick={() => {
                if (selectedCerts.length === ALL_PRODUCT_LINES.length) setSelectedCerts([]);
                else setSelectedCerts([...ALL_PRODUCT_LINES]);
              }}
              className="text-[10px] text-indigo-600 font-bold hover:underline"
            >
              {selectedCerts.length === ALL_PRODUCT_LINES.length ? 'ล้างทั้งหมด' : 'เลือกทั้งหมด'}
            </button>
          </div>

          <p className="text-[10px] text-indigo-600 leading-tight">
            ผู้ตรวจจะสามารถรับงานตรวจได้เฉพาะรุ่นลิฟต์/บันไดเลื่อนที่ติ๊กเลือกไว้เท่านั้น
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
            {ALL_PRODUCT_LINES.map((pl) => {
              const checked = selectedCerts.includes(pl);
              return (
                <label
                  key={pl}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    checked
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCert(pl)}
                    className="w-3.5 h-3.5 accent-white rounded cursor-pointer"
                  />
                  <span className="truncate">{pl}</span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs transition-colors"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="flex-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5"
          >
            <Icons.Check /> {isEditing ? 'บันทึกการแก้ไข' : 'ยืนยันเพิ่มผู้ตรวจ'}
          </button>
        </div>
      </form>
    </div>
  );
};
