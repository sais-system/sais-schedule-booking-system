import React, { useState, useContext, createContext } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';

export interface LiveEditContextType {
  customTexts: Record<string, string>;
  isAdmin: boolean;
  isLiveEdit: boolean;
  onSaveText: (id: string, newText: string) => void;
}

export const LiveEditContext = createContext<LiveEditContextType>({
  customTexts: {},
  isAdmin: false,
  isLiveEdit: false,
  onSaveText: () => {},
});

export const useLiveEdit = () => useContext(LiveEditContext);

export const LiveEditProvider: React.FC<{
  value: LiveEditContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return <LiveEditContext.Provider value={value}>{children}</LiveEditContext.Provider>;
};

interface EditableTextProps {
  id: string;
  defaultText: string;
  customTexts?: Record<string, string>;
  isAdmin?: boolean;
  isLiveEdit?: boolean;
  onSaveText?: (id: string, newText: string) => void;
  className?: string;
  tag?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'label';
  multiline?: boolean;
  children?: React.ReactNode;
}

export const EditableText: React.FC<EditableTextProps> = ({
  id,
  defaultText,
  customTexts,
  isAdmin,
  isLiveEdit,
  onSaveText,
  className = '',
  tag = 'span',
  multiline = false,
  children,
}) => {
  const context = useContext(LiveEditContext);
  const actualIsAdmin = isAdmin !== undefined ? isAdmin : context.isAdmin;
  const actualIsLiveEdit = isLiveEdit !== undefined ? isLiveEdit : context.isLiveEdit;
  const actualCustomTexts = customTexts !== undefined ? customTexts : context.customTexts;
  const actualOnSaveText = onSaveText || context.onSaveText;

  const [isOpen, setIsOpen] = useState(false);
  const currentText = actualCustomTexts?.[id] !== undefined ? actualCustomTexts[id] : defaultText;
  const [editText, setEditText] = useState(currentText);

  const handleSave = () => {
    if (actualOnSaveText) {
      actualOnSaveText(id, editText);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    setEditText(defaultText);
    if (actualOnSaveText) {
      actualOnSaveText(id, defaultText);
    }
    setIsOpen(false);
  };

  const Tag = tag as any;

  if (!actualIsAdmin || !actualIsLiveEdit) {
    return (
      <Tag className={className}>
        {children || currentText}
      </Tag>
    );
  }

  return (
    <>
      <Tag
        className={`relative group inline-flex items-center gap-1 cursor-pointer transition-all rounded px-0.5 ${className} ${
          isLiveEdit
            ? 'ring-1 ring-amber-400/80 bg-amber-400/10 hover:bg-amber-400/20'
            : ''
        }`}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          setEditText(currentText);
          setIsOpen(true);
        }}
        title="คลิกเพื่อแก้ไขข้อความนี้ (สิทธิ์ Admin)"
      >
        <span>{children || currentText}</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            setEditText(currentText);
            setIsOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setEditText(currentText);
              setIsOpen(true);
            }
          }}
          className="inline-flex items-center justify-center w-4 h-4 rounded bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-2xs shrink-0 cursor-pointer"
          title={`แก้ไขข้อความ [${id}]`}
        >
          <Icons.Edit size={10} />
        </span>
      </Tag>

      {/* Quick Edit Popup Dialog via portal to body */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <div
              className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-200 animate-pop"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                    <Icons.Edit size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      แก้ไขข้อความบนหน้าเว็บ (Live Text Edit)
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      รหัสข้อความ: <span className="text-amber-600 font-bold">{id}</span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
                >
                  <Icons.X size={16} />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    ข้อความเริ่มต้น (Default):
                  </label>
                  <div className="text-xs p-2 rounded-xl bg-slate-50 text-slate-500 border border-slate-200 select-all font-mono">
                    {defaultText}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-800 block mb-1">
                    ข้อความที่ต้องการให้แสดง (Custom Text):
                  </label>
                  {multiline ? (
                    <textarea
                      rows={3}
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all font-medium"
                      placeholder="พิมพ์ข้อความใหม่ที่ต้องการให้แสดงผล..."
                    />
                  ) : (
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-amber-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all font-medium"
                      placeholder="พิมพ์ข้อความใหม่ที่ต้องการให้แสดงผล..."
                      autoFocus
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-slate-500 hover:text-red-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
                  title="ล้างค่าที่แก้ไข และใช้ข้อความเริ่มต้น"
                >
                  ↺ คืนค่าเริ่มต้น
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                  >
                    <Icons.Check size={14} /> บันทึกข้อความ
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
