import React, { useState, useRef } from 'react';
import { OilTrackingRecord, OilItem } from '../../types';
import { Icons } from '../Icons';
import { extractTextFromPdf, parseOilPdfText, mergeOilResults } from '../../utils/pdfOilParser';

interface OilUploadModalProps {
  existingRecord?: OilTrackingRecord | null;
  onClose: () => void;
  onParsedSuccess: (data: {
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
  }) => void;
}

export const OilUploadModal: React.FC<OilUploadModalProps> = ({
  existingRecord,
  onClose,
  onParsedSuccess,
}) => {
  const [installerFile, setInstallerFile] = useState<File | null>(null);
  const [customerFile, setCustomerFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const installerInputRef = useRef<HTMLInputElement | null>(null);
  const customerInputRef = useRef<HTMLInputElement | null>(null);

  // Multi-file drag over handler
  const handleDualDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const rawFiles = Array.from(e.dataTransfer.files) as File[];
    const files = rawFiles.filter((f) =>
      f.name.toLowerCase().endsWith('.pdf')
    );

    if (files.length === 0) {
      setErrorMessage('กรุณาลากไฟล์ที่เป็น .pdf เท่านั้น');
      return;
    }

    setErrorMessage(null);

    // Auto-detect files based on filename keywords
    files.forEach((file: File) => {
      const name = file.name.toLowerCase();
      if (name.includes('customer') || name.includes('cust') || name.includes('ลูกค้า')) {
        setCustomerFile(file);
      } else if (name.includes('installer') || name.includes('inst') || name.includes('schindler') || name.includes('ช่าง')) {
        setInstallerFile(file);
      } else {
        // Assign to first empty slot
        if (!installerFile) {
          setInstallerFile(file);
        } else if (!customerFile) {
          setCustomerFile(file);
        }
      }
    });
  };

  const handleProcessPdfs = async () => {
    if (!installerFile && !customerFile) {
      setErrorMessage('กรุณาเลือกไฟล์ PDF อย่างน้อย 1 ไฟล์ (หรือ 2 ไฟล์พร้อมกัน: Installer และ Customer)');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      let installerResult = null;
      let customerResult = null;

      // 1. Process Installer PDF
      if (installerFile) {
        setProcessStep('กำลังอ่านข้อความจากไฟล์ Installer PDF...');
        const installerText = await extractTextFromPdf(installerFile);
        installerResult = parseOilPdfText(installerText, 'Installer');
      }

      // 2. Process Customer PDF
      if (customerFile) {
        setProcessStep('กำลังอ่านข้อความจากไฟล์ Customer PDF...');
        const customerText = await extractTextFromPdf(customerFile);
        customerResult = parseOilPdfText(customerText, 'Customer');
      }

      setProcessStep('กำลังรวมรายการปัญหา (Merging Problem List)...');

      // 3. Merge both results
      const merged = mergeOilResults(installerResult, customerResult);

      // Pre-fill from existing record if fields were empty
      const finalEquipmentNo = merged.equipmentNo || existingRecord?.equipment_no || '';
      const finalSiteName = merged.siteName || existingRecord?.site_name || '';
      const finalInspector = merged.inspectorName || existingRecord?.inspector_name || '';
      const finalSupervisor = merged.supervisor || existingRecord?.supervisor || '';
      const finalDate = merged.inspectionDate || existingRecord?.inspection_date || '';

      // Release file references from state immediately so memory is freed and no PDF is kept in the system
      const instFilename = installerFile?.name;
      const custFilename = customerFile?.name;
      setInstallerFile(null);
      setCustomerFile(null);

      // Success callback to open Editable Verification Modal!
      onParsedSuccess({
        equipmentNo: finalEquipmentNo,
        siteName: finalSiteName,
        inspectorName: finalInspector,
        supervisor: finalSupervisor,
        inspectionDate: finalDate,
        items: merged.items,
        installerFilename: instFilename,
        customerFilename: custFilename,
        existingRecordId: existingRecord?.id,
        bookingId: existingRecord?.booking_id,
      });
    } catch (err: any) {
      console.error('Error processing PDFs:', err);
      setErrorMessage(err?.message || 'เกิดข้อผิดพลาดในการอ่านไฟล์ PDF โปรดตรวจสอบว่าเป็นไฟล์ PDF ที่ถูกต้อง');
      setIsProcessing(false);
    }
  };

  const handleOpenManualEntry = () => {
    onParsedSuccess({
      equipmentNo: existingRecord?.equipment_no || '',
      siteName: existingRecord?.site_name || '',
      inspectorName: existingRecord?.inspector_name || '',
      supervisor: existingRecord?.supervisor || '',
      inspectionDate: existingRecord?.inspection_date || '',
      items: existingRecord?.items || [],
      existingRecordId: existingRecord?.id,
      bookingId: existingRecord?.booking_id,
    });
  };

  return (
    <div className="fixed inset-0 z-[550] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-red-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/30 border border-red-500/40 flex items-center justify-center text-red-400">
              <Icons.Upload size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                อัปโหลดไฟล์ PDF Open Item List (OIL)
              </h2>
              <p className="text-xs text-slate-400">
                {existingRecord
                  ? `สำหรับงาน Equipment No: ${existingRecord.equipment_no} (${existingRecord.site_name})`
                  : 'อัปโหลดเอกสาร PDF 2 ไฟล์พร้อมกันเพื่อดึงข้อมูลเข้าระบบอัตโนมัติ'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Body */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDualDrop}
          className="p-4 sm:p-6 space-y-4 bg-slate-50"
        >
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs flex items-center gap-2">
              <Icons.AlertCircle size={16} className="shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Prompt banner */}
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-start gap-3">
            <Icons.ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-bold">ระบบประมวลผลสกัดข้อความชั่วคราว (In-Memory Text Extraction Only)</p>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-full border border-emerald-200">ไม่จัดเก็บไฟล์ PDF</span>
              </div>
              <p className="text-blue-700 leading-relaxed text-[11px]">
                เมื่อสกัดข้อความเสร็จสิ้น ระบบจะไม่จัดเก็บไฟล์ PDF ไว้ในเซิร์ฟเวอร์หรือฐานข้อมูล เอาเฉพาะข้อความที่สกัดได้เท่านั้น โดยสกัดเฉพาะข้อความใน <b>Annotations Comment</b> อย่างถูกต้องแม่นยำ ไม่เกินขอบเขต
              </p>
            </div>
          </div>

          {/* Dual Upload Boxes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Box 1: Installer PDF */}
            <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-blue-200 hover:border-blue-400 transition-all flex flex-col items-center text-center relative group">
              <input
                type="file"
                ref={installerInputRef}
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setInstallerFile(e.target.files[0]);
                    setErrorMessage(null);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Icons.FileText size={24} />
              </div>
              <h4 className="text-xs font-black text-slate-800 mb-0.5">
                1. ไฟล์ PDF Installer (Schindler)
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">
                เอกสารรายการปัญหาของทีมติดตั้ง
              </p>

              {installerFile ? (
                <div className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-left">
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold text-blue-900 truncate">
                      {installerFile.name}
                    </p>
                    <p className="text-[10px] text-blue-600">
                      {(installerFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInstallerFile(null)}
                    className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                    title="ยกเลิกไฟล์นี้"
                  >
                    <Icons.X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => installerInputRef.current?.click()}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  เลือกไฟล์ Installer PDF
                </button>
              )}
            </div>

            {/* Box 2: Customer PDF */}
            <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-purple-200 hover:border-purple-400 transition-all flex flex-col items-center text-center relative group">
              <input
                type="file"
                ref={customerInputRef}
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setCustomerFile(e.target.files[0]);
                    setErrorMessage(null);
                  }
                }}
              />
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                <Icons.FileCheck size={24} />
              </div>
              <h4 className="text-xs font-black text-slate-800 mb-0.5">
                2. ไฟล์ PDF Customer (ลูกค้า)
              </h4>
              <p className="text-[11px] text-slate-400 mb-3">
                เอกสารรายการปัญหาของลูกค้า
              </p>

              {customerFile ? (
                <div className="w-full p-2.5 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-left">
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold text-purple-900 truncate">
                      {customerFile.name}
                    </p>
                    <p className="text-[10px] text-purple-600">
                      {(customerFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomerFile(null)}
                    className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                    title="ยกเลิกไฟล์นี้"
                  >
                    <Icons.X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => customerInputRef.current?.click()}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  เลือกไฟล์ Customer PDF
                </button>
              )}
            </div>
          </div>

          {/* Quick Tip for Drag & Drop */}
          <div className="text-center py-2 text-[11px] text-slate-400">
            💡 หรือสามารถลากไฟล์ PDF ทั้ง 2 ไฟล์พร้อมกันมาปล่อยในกล่องนี้ได้เลย
          </div>

          {/* Processing Loading Indicator */}
          {isProcessing && (
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-center animate-pulse">
              <Icons.Loader className="animate-spin mx-auto text-red-400" size={24} />
              <p className="text-xs font-bold">{processStep || 'กำลังประมวลผลไฟล์ PDF...'}</p>
              <p className="text-[10px] text-slate-400">กรุณารอสักครู่ ระบบกำลังสกัดและรวมรายการปัญหา</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleOpenManualEntry}
            disabled={isProcessing}
            className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
          >
            หรือกรอกข้อมูลด้วยตนเอง (Manual Entry)
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleProcessPdfs}
              disabled={isProcessing || (!installerFile && !customerFile)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black shadow-md shadow-red-900/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icons.Check size={16} />
              <span>เริ่มสกัดข้อมูล & เปิดตารางแก้ไข</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
