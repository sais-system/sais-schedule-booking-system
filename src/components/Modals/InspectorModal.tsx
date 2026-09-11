import React, { useState } from 'react';
import { Inspector, STANDARD_PRODUCT_LINES } from '../../types';
import { Icons } from '../Icons';

const ALL_PRODUCT_LINES = STANDARD_PRODUCT_LINES;

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

  const [customLineInput, setCustomLineInput] = useState('');

  // Combined product lines list including standard lines and any existing/new custom ones
  const availableLines = Array.from(new Set([...ALL_PRODUCT_LINES, ...selectedCerts]));

  const toggleCert = (pl: string) => {
    setSelectedCerts((prev) =>
      prev.includes(pl) ? prev.filter((p) => p !== pl) : [...prev, pl]
    );
  };

  const handleAddCustomLine = () => {
    const val = customLineInput.trim();
    if (!val) return;
    if (!selectedCerts.includes(val)) {
      setSelectedCerts((prev) => [...prev, val]);
    }
    setCustomLineInput('');
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

        <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-100 space-y-2.5">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-bold text-indigo-950">กำหนดสิทธิ์รับงาน (Product Line)</label>
              <span className="text-[10px] bg-indigo-200/80 text-indigo-800 font-bold px-1.5 py-0.2 rounded-full">
                เลือก {selectedCerts.length} รุ่น
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (selectedCerts.length === availableLines.length) setSelectedCerts([]);
                else setSelectedCerts([...availableLines]);
              }}
              className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
            >
              {selectedCerts.length === availableLines.length ? 'ล้างทั้งหมด' : 'เลือกทั้งหมด'}
            </button>
          </div>

          <p className="text-[10px] text-indigo-600 leading-tight">
            ผู้ตรวจจะสามารถรับงานตรวจได้เฉพาะรุ่นที่ติ๊กเลือกไว้เท่านั้น (มีผลต่อตัวเลือก Product Line ในหน้าจองงาน)
          </p>

          <div className="grid grid-cols-2 gap-2 pt-1 max-h-52 overflow-y-auto custom-scrollbar pr-1">
            {availableLines.map((pl) => {
              const checked = selectedCerts.includes(pl);
              return (
                <label
                  key={pl}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                    checked
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-200'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleCert(pl)}
                    className="w-3.5 h-3.5 accent-indigo-600 rounded cursor-pointer"
                  />
                  <span className="truncate">{pl}</span>
                </label>
              );
            })}
          </div>

          {/* Quick custom product line add */}
          <div className="pt-1 flex items-center gap-1.5">
            <input
              type="text"
              value={customLineInput}
              onChange={(e) => setCustomLineInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomLine();
                }
              }}
              placeholder="+ พิมพ์รุ่นอื่น เช่น 7000, Schindler Ahead"
              className="flex-1 text-[11px] p-2 rounded-xl border border-indigo-200 bg-white placeholder-slate-400 font-medium outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={handleAddCustomLine}
              className="px-2.5 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-xs font-bold rounded-xl transition-colors shrink-0"
            >
              + เพิ่มรุ่น
            </button>
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
