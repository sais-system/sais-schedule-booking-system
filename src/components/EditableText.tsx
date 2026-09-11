import React, { useState, useEffect, useContext, createContext, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icons } from './Icons';

export interface LiveEditContextType {
  customTexts: Record<string, string>;
  isAdmin: boolean;
  isLiveEdit: boolean;
  onSaveText: (idOrOriginal: string, newText: string) => void;
  onResetText?: (idOrOriginal: string) => void;
  onToggleLiveEdit?: () => void;
  onOpenUniversalModal?: () => void;
  openEditor?: (item: { id?: string; defaultText: string; multiline?: boolean; label?: string; isPlaceholder?: boolean }) => void;
}

export const LiveEditContext = createContext<LiveEditContextType>({
  customTexts: {},
  isAdmin: false,
  isLiveEdit: false,
  onSaveText: () => {},
});

export const useLiveEdit = () => useContext(LiveEditContext);

/**
 * Helper hook to retrieve custom text with fallback
 */
export function useLiveText(defaultText: string = '', id?: string): string {
  const { customTexts } = useContext(LiveEditContext);
  const safeDefault = typeof defaultText === 'string' ? defaultText : (defaultText != null ? String(defaultText) : '');
  if (!customTexts) return safeDefault;
  if (id && customTexts[id] !== undefined) return customTexts[id];
  if (customTexts[safeDefault] !== undefined) return customTexts[safeDefault];
  const trimmed = safeDefault.trim();
  if (trimmed && customTexts[trimmed] !== undefined) return customTexts[trimmed];
  return safeDefault;
}

interface EditableTarget {
  id?: string;
  defaultText: string;
  currentText: string;
  multiline?: boolean;
  label?: string;
  isPlaceholder?: boolean;
  targetElement?: HTMLElement;
}

/**
 * Global Live Text Engine
 * 1. Synchronizes all visible DOM text nodes and input placeholders with customTexts
 * 2. Provides interactive click-to-edit and pencil indicators across the entire website
 * 3. Provides a floating Live Edit Bar with mode switcher (Edit vs Navigate)
 */
const GlobalLiveTextEngine: React.FC<{
  customTexts: Record<string, string>;
  isAdmin: boolean;
  isLiveEdit: boolean;
  onSaveText: (idOrOriginal: string, newText: string) => void;
  onResetText?: (idOrOriginal: string) => void;
  onToggleLiveEdit?: () => void;
  onOpenUniversalModal?: () => void;
}> = ({
  customTexts,
  isAdmin,
  isLiveEdit,
  onSaveText,
  onResetText,
  onToggleLiveEdit,
  onOpenUniversalModal,
}) => {
  const [activeEditor, setActiveEditor] = useState<EditableTarget | null>(null);
  const [editText, setEditText] = useState<string>('');
  const [editMode, setEditMode] = useState<'inspect' | 'navigate'>('inspect'); // inspect = click any text to edit, navigate = normal clicks
  const [hoveredInfo, setHoveredInfo] = useState<{
    rect: DOMRect;
    text: string;
    isPlaceholder: boolean;
  } | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const customTextsRef = useRef<Record<string, string>>(customTexts);
  customTextsRef.current = customTexts;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // --- 1. DOM TEXT & PLACEHOLDER SYNCHRONIZATION ENGINE ---
  useEffect(() => {
    const texts = customTexts || {};
    const textKeys = Object.keys(texts);
    if (textKeys.length === 0) return;

    // Fast lookup map (both raw and trimmed)
    const lookup = new Map<string, string>();
    for (const [k, v] of Object.entries(texts)) {
      if (v !== undefined && v !== null) {
        const val = String(v);
        const key = String(k);
        lookup.set(key, val);
        const trimmed = key.trim();
        if (trimmed) {
          lookup.set(trimmed, val);
        }
      }
    }

    const processElement = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const textNode = node as Text;
        const text = textNode.nodeValue || '';
        const trimmed = typeof text === 'string' ? text.trim() : '';
        if (!trimmed) return;

        // Skip script, style, SVG, code, pre, or Live Edit portal
        const parent = textNode.parentElement;
        if (!parent) return;
        const tag = parent.tagName.toLowerCase();
        if (
          tag === 'script' ||
          tag === 'style' ||
          tag === 'svg' ||
          tag === 'canvas' ||
          tag === 'code' ||
          tag === 'pre' ||
          parent.closest('[data-no-live-edit]') ||
          parent.closest('#live-edit-portal') ||
          parent.classList.contains('live-edit-ui')
        ) {
          return;
        }

        // Store original text if not yet set
        const anyNode = textNode as any;
        if (anyNode.__origText === undefined) {
          anyNode.__origText = text;
        }
        const original = anyNode.__origText != null ? String(anyNode.__origText) : '';
        const originalTrimmed = original.trim();

        // Check if override exists for original text
        if (lookup.has(original) || lookup.has(originalTrimmed)) {
          const replacement = lookup.get(original) || lookup.get(originalTrimmed)!;
          if (textNode.nodeValue !== replacement) {
            textNode.nodeValue = replacement;
          }
        } else if (textNode.nodeValue !== original) {
          // Revert back to original if override was deleted
          textNode.nodeValue = original;
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tag = el.tagName.toLowerCase();

        if (
          el.closest('[data-no-live-edit]') ||
          el.closest('#live-edit-portal') ||
          el.classList.contains('live-edit-ui')
        ) {
          return;
        }

        // Input & Textarea Placeholders
        if (tag === 'input' || tag === 'textarea') {
          const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
          const currentPlaceholder = inputEl.getAttribute('placeholder');
          if (currentPlaceholder) {
            let orig = inputEl.getAttribute('data-orig-placeholder');
            if (!orig) {
              orig = currentPlaceholder;
              inputEl.setAttribute('data-orig-placeholder', orig);
            }
            const origTrimmed = orig ? String(orig).trim() : '';
            if (lookup.has(orig) || (origTrimmed && lookup.has(origTrimmed))) {
              const replacement = lookup.get(orig) || lookup.get(origTrimmed)!;
              if (inputEl.placeholder !== replacement) {
                inputEl.placeholder = replacement;
              }
            } else if (inputEl.placeholder !== orig) {
              inputEl.placeholder = orig;
            }
          }
        }

        // Process children
        const childNodes = el.childNodes;
        for (let i = 0; i < childNodes.length; i++) {
          processElement(childNodes[i]);
        }
      }
    };

    const runSync = () => {
      if (typeof document !== 'undefined' && document.body) {
        processElement(document.body);
      }
    };

    runSync();

    // Observe DOM mutations to auto-apply custom texts on dynamic renders and modals
    const observer = new MutationObserver((mutations) => {
      let shouldSync = false;
      for (const mut of mutations) {
        if (mut.type === 'childList') {
          for (let i = 0; i < mut.addedNodes.length; i++) {
            const added = mut.addedNodes[i];
            if (
              added.nodeType === Node.ELEMENT_NODE &&
              (added as HTMLElement).closest &&
              ((added as HTMLElement).closest('#live-edit-portal') ||
                (added as HTMLElement).closest('[data-no-live-edit]'))
            ) {
              continue;
            }
            shouldSync = true;
            break;
          }
        } else if (mut.type === 'characterData') {
          const target = mut.target;
          const anyNode = target as any;
          if (anyNode.__origText && lookup.has(anyNode.__origText)) {
            const expected = lookup.get(anyNode.__origText);
            if (target.nodeValue !== expected) {
              shouldSync = true;
            }
          }
        }
        if (shouldSync) break;
      }

      if (shouldSync) {
        runSync();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
    };
  }, [customTexts]);

  // --- 2. INTERACTIVE LIVE EDIT INSPECTION & CLICK LISTENER ---
  const handleElementHover = useCallback((e: MouseEvent) => {
    if (!isLiveEdit || !isAdmin) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (
      target.closest('#live-edit-portal') ||
      target.closest('[data-no-live-edit]') ||
      target.classList.contains('live-edit-ui')
    ) {
      setHoveredInfo(null);
      hoveredElementRef.current = null;
      return;
    }

    // Check if input/textarea with placeholder
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      const inputEl = target as HTMLInputElement | HTMLTextAreaElement;
      const ph = inputEl.getAttribute('data-orig-placeholder') || inputEl.placeholder;
      if (ph) {
        hoveredElementRef.current = target;
        setHoveredInfo({
          rect: target.getBoundingClientRect(),
          text: ph,
          isPlaceholder: true,
        });
        return;
      }
    }

    // Check text inside element
    const directText = Array.from(target.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.nodeValue || '')
      .join('')
      .trim();

    const fullText = (target.textContent || '').trim();
    const candidateText = directText || (fullText.length < 120 ? fullText : '');

    if (candidateText && candidateText.length > 0) {
      hoveredElementRef.current = target;
      setHoveredInfo({
        rect: target.getBoundingClientRect(),
        text: candidateText,
        isPlaceholder: false,
      });
    } else {
      setHoveredInfo(null);
      hoveredElementRef.current = null;
    }
  }, [isLiveEdit, isAdmin]);

  const handleElementClickCapture = useCallback((e: MouseEvent) => {
    if (!isLiveEdit || !isAdmin) return;
    const target = e.target as HTMLElement | null;
    if (!target) return;

    if (
      target.closest('#live-edit-portal') ||
      target.closest('[data-no-live-edit]') ||
      target.classList.contains('live-edit-ui')
    ) {
      return;
    }

    // If in 'inspect' mode, click intercepts to edit
    if (editMode === 'inspect') {
      const tag = target.tagName.toLowerCase();
      let defaultText = '';
      let isPlaceholder = false;
      let label = 'ข้อความบนหน้าเว็บ';

      if (tag === 'input' || tag === 'textarea') {
        const inputEl = target as HTMLInputElement | HTMLTextAreaElement;
        const ph = inputEl.getAttribute('data-orig-placeholder') || inputEl.placeholder;
        if (ph) {
          defaultText = ph;
          isPlaceholder = true;
          label = `ตัวอย่างในช่องกรอก (${tag.toUpperCase()} Placeholder)`;
        }
      }

      if (!defaultText) {
        const directText = Array.from(target.childNodes)
          .filter((n) => n.nodeType === Node.TEXT_NODE)
          .map((n) => n.nodeValue || '')
          .join('')
          .trim();
        defaultText = directText || (target.textContent || '').trim();
        if (tag.startsWith('h')) label = `หัวข้อ (${tag.toUpperCase()})`;
        else if (tag === 'button') label = 'ปุ่มกด (Button)';
        else if (tag === 'label') label = 'ป้ายกำกับ (Label)';
        else if (tag === 'span') label = 'ข้อความ (Span)';
        else if (tag === 'p') label = 'ย่อหน้า (Paragraph)';
      }

      if (defaultText) {
        e.preventDefault();
        e.stopPropagation();

        const currentVal = customTextsRef.current[defaultText] || defaultText;
        setActiveEditor({
          defaultText,
          currentText: currentVal,
          multiline: defaultText.length > 50 || defaultText.includes('\n'),
          label,
          isPlaceholder,
          targetElement: target,
        });
        setEditText(currentVal);
      }
    }
  }, [isLiveEdit, isAdmin, editMode]);

  useEffect(() => {
    if (!isLiveEdit || !isAdmin) {
      setHoveredInfo(null);
      return;
    }

    window.addEventListener('mouseover', handleElementHover, true);
    window.addEventListener('click', handleElementClickCapture, true);

    return () => {
      window.removeEventListener('mouseover', handleElementHover, true);
      window.removeEventListener('click', handleElementClickCapture, true);
    };
  }, [isLiveEdit, isAdmin, handleElementHover, handleElementClickCapture]);

  const handleSaveEdit = () => {
    if (!activeEditor) return;
    const key = activeEditor.id || activeEditor.defaultText;
    onSaveText(key, editText);
    showToast(`บันทึกข้อความ "${editText.slice(0, 25)}${editText.length > 25 ? '...' : ''}" เรียบร้อยแล้ว`);
    setActiveEditor(null);
  };

  const handleResetEdit = () => {
    if (!activeEditor) return;
    const key = activeEditor.id || activeEditor.defaultText;
    if (onResetText) {
      onResetText(key);
    } else {
      onSaveText(key, activeEditor.defaultText);
    }
    showToast(`คืนค่าเริ่มต้นข้อความ "${activeEditor.defaultText.slice(0, 25)}" เรียบร้อยแล้ว`);
    setActiveEditor(null);
  };

  if (!isAdmin) return null;

  const totalCustomCount = Object.keys(customTexts || {}).length;

  return (
    <div id="live-edit-portal" data-no-live-edit="true">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1500] pointer-events-none animate-pop">
          <div className="bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl border border-amber-400/40 text-xs font-bold flex items-center gap-2 backdrop-blur-md">
            <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black">
              ✓
            </span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Hover Highlighter Overlay */}
      {isLiveEdit && hoveredInfo && editMode === 'inspect' && !activeEditor && (
        <div
          className="fixed pointer-events-none z-[1200] transition-all duration-75 border-2 border-dashed border-amber-500 bg-amber-400/15 rounded-lg shadow-sm"
          style={{
            top: `${hoveredInfo.rect.top - 2}px`,
            left: `${hoveredInfo.rect.left - 2}px`,
            width: `${hoveredInfo.rect.width + 4}px`,
            height: `${hoveredInfo.rect.height + 4}px`,
          }}
        >
          <div className="absolute -top-7 left-0 bg-amber-500 text-slate-950 px-2 py-0.5 rounded-md text-[10px] font-black shadow-md flex items-center gap-1 whitespace-nowrap">
            <Icons.Edit size={10} />
            <span>
              {hoveredInfo.isPlaceholder ? 'คลิกแก้ไขตัวอย่าง Placeholder' : 'คลิกแก้ไขข้อความนี้'}
            </span>
          </div>
        </div>
      )}

      {/* Floating Bottom Live Edit Control Bar */}
      {isLiveEdit && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[1300] w-[95%] max-w-xl animate-pop">
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-2.5 sm:p-3 rounded-2xl shadow-2xl border border-amber-400/50 flex flex-wrap items-center justify-between gap-2">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black animate-pulse shadow-xs">
                <Icons.Edit size={16} />
              </div>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-amber-300">
                    โหมดปากกา Live Text Edit
                  </span>
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-bold border border-amber-400/30">
                    {totalCustomCount} รายการที่แก้ไข
                  </span>
                </div>
                <p className="text-[10px] text-slate-300">
                  {editMode === 'inspect'
                    ? '🎯 ชี้แล้วคลิกข้อความใดๆ หรือช่องกรอก เพื่อแก้คำได้ทันที'
                    : '👆 โหมดนำทาง: คลิกเมนู/ปุ่มเพื่อเปิดหน้าต่างตามปกติ'}
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 ml-auto">
              {/* Mode switcher: Inspect vs Navigate */}
              <div className="bg-slate-800 p-0.5 rounded-xl border border-slate-700 flex items-center text-xs">
                <button
                  type="button"
                  onClick={() => setEditMode('inspect')}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                    editMode === 'inspect'
                      ? 'bg-amber-400 text-slate-950 shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="ชี้และคลิกเพื่อแก้ไขข้อความ"
                >
                  <Icons.Edit size={12} />
                  <span>คลิกแก้คำ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEditMode('navigate')}
                  className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 transition-all ${
                    editMode === 'navigate'
                      ? 'bg-blue-500 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="คลิกเปลี่ยนหน้า/เปิดเมนูปกติ"
                >
                  <Icons.Compass size={12} />
                  <span>คลิกปกติ</span>
                </button>
              </div>

              {/* Open Universal Text Modal */}
              {onOpenUniversalModal && (
                <button
                  type="button"
                  onClick={onOpenUniversalModal}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs border border-amber-400/30 transition-all flex items-center gap-1"
                  title="เปิดคลังข้อความทั้งหมด"
                >
                  <Icons.List size={13} />
                  <span className="hidden sm:inline">คลังข้อความ</span>
                </button>
              )}

              {/* Close Live Edit Button */}
              {onToggleLiveEdit && (
                <button
                  type="button"
                  onClick={onToggleLiveEdit}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-900/40 text-slate-300 hover:text-rose-300 border border-slate-700 transition-colors"
                  title="ปิดโหมดปากกาแก้ไขข้อความ"
                >
                  <Icons.X size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Text Edit Dialog Modal */}
      {activeEditor && (
        <div
          className="fixed inset-0 z-[1400] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
          onClick={() => setActiveEditor(null)}
        >
          <div
            className="bg-white rounded-3xl p-5 w-full max-w-lg shadow-2xl border border-slate-200 animate-pop text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center shadow-md">
                  <Icons.Edit size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    แก้ไขข้อความสด (Live Text Edit)
                  </h4>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium mt-0.5">
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                      {activeEditor.label || (activeEditor.isPlaceholder ? 'Placeholder' : 'ข้อความบนหน้าเว็บ')}
                    </span>
                    {activeEditor.id && (
                      <code className="text-[10px] text-slate-400 font-mono">[{activeEditor.id}]</code>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveEditor(null)}
                className="p-1.5 rounded-full text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <Icons.X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-3.5">
              {/* Original Text */}
              <div>
                <label className="text-[11px] font-bold text-slate-500 block mb-1">
                  ข้อความเริ่มต้นบนเว็บ (Default Text):
                </label>
                <div className="text-xs p-2.5 rounded-xl bg-slate-50 text-slate-700 border border-slate-200 select-all font-mono break-words max-h-28 overflow-y-auto">
                  {activeEditor.defaultText}
                </div>
              </div>

              {/* Custom Input */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-amber-900">
                    ข้อความใหม่ที่ต้องการให้แสดงผล (Custom Display Text):
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {editText.length} ตัวอักษร
                  </span>
                </div>

                {activeEditor.multiline ? (
                  <textarea
                    rows={3}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border-2 border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all font-medium text-slate-900 bg-amber-50/20 shadow-inner"
                    placeholder="พิมพ์ข้อความใหม่ที่ต้องการแสดงผลบนหน้าเว็บ..."
                    autoFocus
                  />
                ) : (
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full text-xs p-3 rounded-xl border-2 border-amber-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-100 outline-none transition-all font-medium text-slate-900 bg-amber-50/20 shadow-inner"
                    placeholder="พิมพ์ข้อความใหม่ที่ต้องการแสดงผลบนหน้าเว็บ..."
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSaveEdit();
                      }
                    }}
                  />
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  * ข้อความจะถูกบันทึกและแสดงผลทันทีโดยไม่ต้องเขียนโค้ดใหม่ และไม่มีผลกระทบต่อการทำงานของระบบ
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetEdit}
                className="text-xs font-bold text-slate-500 hover:text-rose-600 px-3 py-2 rounded-xl hover:bg-rose-50 transition-colors flex items-center gap-1"
                title="คืนค่าเป็นข้อความเริ่มต้น"
              >
                <Icons.RotateCcw size={13} />
                <span>คืนค่าเริ่มต้น</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveEditor(null)}
                  className="text-xs font-bold px-3.5 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="text-xs font-black px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <Icons.Check size={15} />
                  <span>บันทึกข้อความ</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface EditableTextProps {
  id?: string;
  defaultText?: string;
  customTexts?: Record<string, string>;
  isAdmin?: boolean;
  isLiveEdit?: boolean;
  onSaveText?: (id: string, newText: string) => void;
  className?: string;
  tag?: 'span' | 'div' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'label';
  multiline?: boolean;
  children?: React.ReactNode;
}

/**
 * Enhanced EditableText component
 * Wraps explicit elements to support inline pencil icon and direct click editing
 */
export const EditableText: React.FC<EditableTextProps> = ({
  id,
  defaultText = '',
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

  const safeDefault = typeof defaultText === 'string' ? defaultText : (defaultText != null ? String(defaultText) : (id || ''));
  const trimmed = safeDefault.trim();

  // Resolution order: id -> safeDefault -> trimmed -> safeDefault
  const currentText =
    (id && actualCustomTexts?.[id] !== undefined)
      ? actualCustomTexts[id]
      : (safeDefault && actualCustomTexts?.[safeDefault] !== undefined)
      ? actualCustomTexts[safeDefault]
      : (trimmed && actualCustomTexts?.[trimmed] !== undefined)
      ? actualCustomTexts[trimmed]
      : safeDefault;

  const [editText, setEditText] = useState(currentText);

  // Sync editText if currentText changes
  useEffect(() => {
    setEditText(currentText);
  }, [currentText]);

  const handleSave = () => {
    const key = id || safeDefault;
    if (actualOnSaveText) {
      actualOnSaveText(key, editText);
    }
    setIsOpen(false);
  };

  const handleReset = () => {
    const key = id || safeDefault;
    setEditText(safeDefault);
    if (actualOnSaveText) {
      actualOnSaveText(key, safeDefault);
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
          actualIsLiveEdit
            ? 'ring-1 ring-amber-400/90 bg-amber-400/15 hover:bg-amber-400/25'
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
          className="inline-flex items-center justify-center w-4 h-4 rounded bg-amber-500 text-slate-950 hover:bg-amber-600 transition-colors shadow-2xs shrink-0 cursor-pointer font-black"
          title={`แก้ไขข้อความ [${id || defaultText}]`}
        >
          <Icons.Edit size={10} />
        </span>
      </Tag>

      {/* Quick Edit Popup Dialog via portal to body */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[1450] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <div
              className="bg-white rounded-3xl p-5 w-full max-w-md shadow-2xl border border-slate-200 animate-pop text-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                    <Icons.Edit size={16} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">
                      แก้ไขข้อความบนหน้าเว็บ (Live Text Edit)
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      รหัส/ข้อความ: <span className="text-amber-600 font-bold">{id || defaultText}</span>
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
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSave();
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs font-bold text-slate-500 hover:text-rose-600 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors"
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
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5"
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

export const LiveEditProvider: React.FC<{
  value: LiveEditContextType;
  children: React.ReactNode;
}> = ({ value, children }) => {
  return (
    <LiveEditContext.Provider value={value}>
      {children}
      <GlobalLiveTextEngine
        customTexts={value.customTexts || {}}
        isAdmin={value.isAdmin}
        isLiveEdit={value.isLiveEdit}
        onSaveText={value.onSaveText}
        onResetText={value.onResetText}
        onToggleLiveEdit={value.onToggleLiveEdit}
        onOpenUniversalModal={value.onOpenUniversalModal}
      />
    </LiveEditContext.Provider>
  );
};
