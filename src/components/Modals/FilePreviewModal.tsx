import React from 'react';
import { Icons } from '../Icons';

interface FilePreviewModalProps {
  url: string;
  title?: string;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ url, title, onClose }) => {
  // Support comma-separated URLs (e.g. site conditions photos)
  const urls = url.split(',').map((u) => u.trim()).filter(Boolean);
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const activeUrl = urls[currentIndex] || url;

  const isPdf = activeUrl.endsWith('.pdf') || activeUrl.includes('application/pdf') || activeUrl.startsWith('data:application/pdf');
  const isGoogleDrive = activeUrl.includes('drive.google.com') || activeUrl.includes('docs.google.com');

  // Convert Google Drive view URL to preview embed if possible
  let embedUrl = activeUrl;
  if (isGoogleDrive) {
    if (activeUrl.includes('/view')) {
      embedUrl = activeUrl.replace(/\/view(\?.*)?$/, '/preview');
    } else if (!activeUrl.includes('/preview')) {
      embedUrl = `${activeUrl}/preview`;
    }
  }

  const handleDownload = () => {
    if (activeUrl.startsWith('data:')) {
      const a = document.createElement('a');
      a.href = activeUrl;
      a.download = `document_${Date.now()}.${isPdf ? 'pdf' : 'jpg'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(activeUrl, '_blank');
    }
  };

  return (
    <div className="backdrop z-[700] p-3 sm:p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden flex flex-col h-[90vh] shadow-2xl animate-pop relative">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex justify-between items-center z-10 flex-shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center shrink-0">
              {isGoogleDrive ? <Icons.Cloud size={16} /> : isPdf ? <Icons.FileText size={16} /> : <Icons.Image size={16} />}
            </div>
            <div className="min-w-0">
              <span className="font-bold text-xs sm:text-sm block truncate">
                {title || (isGoogleDrive ? 'เอกสาร Google Drive' : isPdf ? 'เอกสาร PDF' : 'ภาพถ่ายสภาพหน้างาน')}
              </span>
              {urls.length > 1 && (
                <span className="text-[10px] text-slate-400 block">
                  รูปที่ {currentIndex + 1} จาก {urls.length} รูป
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {urls.length > 1 && (
              <div className="flex items-center gap-1 mr-2 bg-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg text-xs font-bold"
                >
                  ◀ ก่อนหน้า
                </button>
                <button
                  type="button"
                  disabled={currentIndex === urls.length - 1}
                  onClick={() => setCurrentIndex((prev) => Math.min(urls.length - 1, prev + 1))}
                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-30 rounded-lg text-xs font-bold"
                >
                  ถัดไป ▶
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
            >
              <Icons.Download size={13} />
              <span className="hidden sm:inline">เปิด / บันทึก</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"
            >
              <Icons.X size={18} />
            </button>
          </div>
        </div>

        {/* Viewer Body */}
        <div className="flex-1 bg-slate-950/95 flex items-center justify-center p-2 sm:p-4 overflow-hidden relative">
          {isGoogleDrive ? (
            <iframe
              src={embedUrl}
              className="w-full h-full border-0 rounded-2xl bg-white shadow-lg"
              title="Google Drive Document Preview"
              allow="autoplay"
            />
          ) : isPdf ? (
            <iframe
              src={activeUrl}
              className="w-full h-full border-0 rounded-2xl bg-white shadow-lg"
              title="PDF Document Preview"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center overflow-auto p-2">
              <img
                src={activeUrl}
                alt="Document Preview"
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl transition-all"
              />
            </div>
          )}
        </div>

        {/* Multi-thumbnail strip if more than 1 image */}
        {urls.length > 1 && (
          <div className="bg-slate-900 p-2 border-t border-slate-800 flex gap-2 overflow-x-auto shrink-0 justify-center">
            {urls.map((u, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${
                  currentIndex === idx ? 'border-blue-500 scale-105 ring-2 ring-blue-400' : 'border-slate-700 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={u} alt={`thumb-${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
