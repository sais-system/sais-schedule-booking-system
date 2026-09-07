import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../Icons';

export type DocumentTypeKey =
  | 'layout'
  | 'wiring'
  | 'precheck'
  | 'site_cond_1'
  | 'site_cond_2'
  | 'site_cond_3'
  | 'site_cond_4'
  | 'site_cond_5'
  | 'site_cond_6';

interface CameraScannerModalProps {
  initialDocType?: DocumentTypeKey;
  bookingTitle?: string;
  onClose: () => void;
  onSave: (docKey: DocumentTypeKey, imageUrl: string) => void;
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  initialDocType = 'layout',
  bookingTitle = '',
  onClose,
  onSave,
}) => {
  const [selectedDocType, setSelectedDocType] = useState<DocumentTypeKey>(initialDocType);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(true);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera stream safely
  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start camera stream - strictly rear camera (environment)
  const startCamera = async () => {
    stopStream();
    setIsStartingCamera(true);
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : {};
      setHasTorch(Boolean(capabilities?.torch));

      setIsStartingCamera(false);
    } catch (err: any) {
      console.warn('Rear camera start error:', err);
      setIsStartingCamera(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('กรุณาอนุญาตให้เข้าถึงกล้อง (Permission Denied) หรือใช้ปุ่มเลือกไฟล์รูปภาพแทน');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('ไม่พบอุปกรณ์กล้องหลังบนเครื่องนี้ สามารถเลือกไฟล์รูปภาพจากเครื่องแทนได้ครับ');
      } else {
        setCameraError('ไม่สามารถเริ่มการทำงานของกล้องหลังได้: ' + (err.message || 'โปรดเลือกไฟล์ภาพ'));
      }
    }
  };

  // Initialize camera on mount
  useEffect(() => {
    if (!capturedImage) {
      startCamera();
    }
    return () => {
      stopStream();
    };
  }, [capturedImage]);

  // Capture high-quality photo from video stream
  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // High quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedImage(dataUrl);
    stopStream();
  };

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCapturedImage(event.target.result as string);
        stopStream();
      }
    };
    reader.readAsDataURL(file);
  };

  // Toggle flashlight
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: !torchOn }],
        });
        setTorchOn(!torchOn);
      } catch (e) {
        console.warn('Failed to toggle torch', e);
      }
    }
  };

  // Retake photo
  const handleRetake = () => {
    setCapturedImage(null);
  };

  // Confirm and Save
  const handleConfirmSave = () => {
    if (!capturedImage) return;
    onSave(selectedDocType, capturedImage);
    onClose();
  };

  const docTypeOptions: { id: DocumentTypeKey; label: string; group: string }[] = [
    { id: 'layout', label: '📑 เอกสาร Layout (จำเป็น)', group: 'เอกสารหลัก' },
    { id: 'wiring', label: '⚡ เอกสาร Wiring (จำเป็น)', group: 'เอกสารหลัก' },
    { id: 'precheck', label: '📋 เอกสาร Pre-check (จำเป็น)', group: 'เอกสารหลัก' },
    { id: 'site_cond_1', label: '📷 1. หน้าตู้คอนโทรล', group: 'สภาพหน้างาน' },
    { id: 'site_cond_2', label: '📷 2. บนหลังคาลิฟต์', group: 'สภาพหน้างาน' },
    { id: 'site_cond_3', label: '📷 3. ด้านบนปล่อง', group: 'สภาพหน้างาน' },
    { id: 'site_cond_4', label: '📷 4. ก้นบ่อลิฟต์', group: 'สภาพหน้างาน' },
    { id: 'site_cond_5', label: '📷 5. ภายในตู้ลิฟต์', group: 'สภาพหน้างาน' },
    { id: 'site_cond_6', label: '📷 6. หน้าชั้นและรอบวงกบ', group: 'สภาพหน้างาน' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-fade">
      <div className="w-full max-w-lg bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-slate-700">
        {/* Header */}
        <div className="px-4 py-3 bg-slate-800/90 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-600/30 text-blue-400 rounded-xl">
              <Icons.Camera size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                ถ่ายรูป/สแกนด้วยกล้องหลัง (Rear Camera HD)
              </h3>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                {bookingTitle || 'แนบรูปภาพเอกสารเข้าสู่ระบบ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        {/* Document Category Selector */}
        <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-700/50 flex items-center gap-2">
          <label className="text-xs font-bold text-slate-300 whitespace-nowrap">แนบเข้าหมวด:</label>
          <select
            value={selectedDocType}
            onChange={(e) => setSelectedDocType(e.target.value as DocumentTypeKey)}
            className="flex-1 text-xs bg-slate-900 border border-slate-700 text-white p-2 rounded-xl outline-none font-bold focus:border-blue-500"
          >
            {docTypeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Camera Viewport / Image Preview */}
        <div className="relative flex-1 bg-black flex items-center justify-center min-h-[300px] max-h-[55vh] overflow-hidden">
          {capturedImage ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 relative">
              <img
                src={capturedImage}
                alt="Captured Document"
                className="max-h-[50vh] max-w-full object-contain rounded-2xl border border-slate-700 shadow-lg"
              />
              <div className="absolute top-5 right-5 bg-emerald-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                <Icons.Check /> ถ่ายภาพแล้ว
              </div>
            </div>
          ) : cameraError ? (
            <div className="p-6 text-center space-y-3 max-w-sm">
              <div className="w-12 h-12 rounded-full bg-red-900/40 text-red-400 flex items-center justify-center mx-auto">
                <Icons.Alert />
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-white border border-slate-600"
                >
                  ลองเปิดกล้องหลังอีกครั้ง
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-1.5"
                >
                  <Icons.Upload /> เลือกไฟล์รูปภาพจากเครื่อง
                </button>
              </div>
            </div>
          ) : (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Frame Overlay */}
              <div className="absolute inset-6 pointer-events-none border-2 border-blue-400/70 rounded-2xl flex flex-col justify-between p-3 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                <div className="flex justify-between items-start">
                  <div className="w-5 h-5 border-t-4 border-l-4 border-blue-400 rounded-tl-md"></div>
                  <div className="w-5 h-5 border-t-4 border-r-4 border-blue-400 rounded-tr-md"></div>
                </div>
                <div className="text-center">
                  <span className="bg-slate-900/80 text-blue-200 text-[10px] font-bold px-3 py-1 rounded-full border border-blue-400/40 shadow-sm inline-block">
                    จัดวางเอกสารให้อยู่ในกรอบนี้ (กล้องหลัง HD)
                  </span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="w-5 h-5 border-b-4 border-l-4 border-blue-400 rounded-bl-md"></div>
                  <div className="w-5 h-5 border-b-4 border-r-4 border-blue-400 rounded-br-md"></div>
                </div>
              </div>

              {/* Top Controls on Video */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`p-2 rounded-xl text-xs font-bold backdrop-blur-md transition-all ${
                      torchOn ? 'bg-amber-500 text-white' : 'bg-black/40 text-slate-300'
                    }`}
                  >
                    แฟลช {torchOn ? 'ON' : 'OFF'}
                  </button>
                )}
                <span className="px-2.5 py-1 rounded-xl bg-black/60 text-slate-200 text-[11px] font-bold border border-white/20 backdrop-blur-md">
                  📷 กล้องหลัง
                </span>
              </div>

              {isStartingCamera && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-2 z-20">
                  <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-xs text-slate-300 font-bold">กำลังเปิดกล้องหลัง...</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hidden File Input for Gallery / Local Upload with rear capture default */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Bottom Actions */}
        <div className="p-4 bg-slate-800 border-t border-slate-700 flex items-center justify-between gap-3">
          {capturedImage ? (
            <>
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Icons.RefreshCw size={14} /> ถ่ายใหม่
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-md transition-colors"
              >
                <Icons.Check /> ยืนยันแนบเอกสารนี้
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="py-3 px-3.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Icons.Upload /> เลือกไฟล์
              </button>

              <button
                type="button"
                onClick={handleCapture}
                disabled={Boolean(cameraError) || isStartingCamera}
                className={`flex-1 py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                  cameraError || isStartingCamera
                    ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                }`}
              >
                <Icons.Camera size={18} />
                กดถ่ายภาพเอกสาร
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
