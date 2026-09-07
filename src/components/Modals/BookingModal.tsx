import React, { useState } from 'react';
import { Booking, Inspector, User } from '../../types';
import { Icons } from '../Icons';
import { CameraScannerModal, DocumentTypeKey } from './CameraScannerModal';
import { MapPickerModal } from './MapPickerModal';
import { useTranslation } from '../../i18n';
import { processDriveUpload } from '../../utils/googleDrive';
import { getThaiTime, getLocalDateString } from '../../mockData';

const PRODUCT_COLORS: Record<string, string> = {
  'ES1': 'bg-blue-500',
  '3300': 'bg-blue-400',
  '5500': 'bg-emerald-500',
  'ES5/ES5.1': 'bg-purple-500',
  'S-villas': 'bg-amber-500',
  'ES2': 'bg-pink-500',
  'ES3': 'bg-indigo-500',
  'MOR-R': 'bg-rose-500',
  'MOD-T': 'bg-orange-500',
  'S7R4': 'bg-cyan-500',
  'Flex7': 'bg-teal-600',
  'ESC/MW': 'bg-fuchsia-500',
  'อื่นๆโปรดระบุ': 'bg-slate-500',
};

interface BookingModalProps {
  data: any;
  inspectors: Inspector[];
  isAdmin: boolean;
  user: User | null;
  onClose: () => void;
  onSubmit: (formData: Partial<Booking>, keepOpen?: boolean) => void;
  onViewFile: (url: string) => void;
  setAlertMsg: (msg: string | null) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  data,
  inspectors,
  isAdmin,
  user,
  onClose,
  onSubmit,
  onViewFile,
  setAlertMsg,
}) => {
  const { t, lang } = useTranslation();
  const isEditing = Boolean(data?.id);
  const [productLine, setProductLine] = useState(data?.product_line || 'ES1');
  const [customProductLine, setCustomProductLine] = useState('');
  const [jobType, setJobType] = useState(data?.job_type || 'New');
  const [area, setArea] = useState(
    data?.area?.startsWith('ต่างจังหวัด') || (data?.area && data.area !== 'กรุงเทพและปริมณฑล')
      ? 'other'
      : data?.area || 'กรุงเทพและปริมณฑล'
  );
  const [customArea, setCustomArea] = useState(
    data?.area && data.area !== 'กรุงเทพและปริมณฑล' ? data.area : ''
  );
  const [equipmentNo, setEquipmentNo] = useState(data?.equipment_no || '');
  const [unitNo, setUnitNo] = useState(data?.unit_no || '');
  const [siteName, setSiteName] = useState(data?.site_name || '');
  const [tel, setTel] = useState(data?.tel || '');
  const [technicianName, setTechnicianName] = useState(data?.technician_name || '');
  const [mapLink, setMapLink] = useState(data?.map_link || '');
  const [latitude, setLatitude] = useState<number | undefined>(data?.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(data?.longitude);
  const [addressDetail, setAddressDetail] = useState<string>(data?.address_detail || '');
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const [targetDate, setTargetDate] = useState(data?.date || '');
  const [targetInspector, setTargetInspector] = useState(
    data?.inspector_name || (inspectors[0]?.name || '')
  );

  // Document URLs and metadata
  const [docUrls, setDocUrls] = useState({
    layout: data?.layout_img || '',
    wiring: data?.wiring_img || '',
    precheck: data?.precheck_img || '',
    site_cond_1: data?.site_cond_1 || '',
    site_cond_2: data?.site_cond_2 || '',
    site_cond_3: data?.site_cond_3 || '',
    site_cond_4: data?.site_cond_4 || '',
    site_cond_5: data?.site_cond_5 || '',
    site_cond_6: data?.site_cond_6 || '',
  });

  const [docNames, setDocNames] = useState<Record<string, string>>({
    layout: data?.layout_filename || (data?.layout_img ? 'Layout_Doc' : ''),
    wiring: data?.wiring_filename || (data?.wiring_img ? 'Wiring_Doc' : ''),
    precheck: data?.precheck_filename || (data?.precheck_img ? 'Precheck_Doc' : ''),
  });

  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [showHelp, setShowHelp] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTargetDoc, setScannerTargetDoc] = useState<DocumentTypeKey>('layout');

  // Check completeness of required documents
  const hasLayout = Boolean(docUrls.layout);
  const hasWiring = Boolean(docUrls.wiring);
  const hasPrecheck = Boolean(docUrls.precheck);
  const hasAllRequiredDocs = hasLayout && hasWiring && hasPrecheck;

  const missingDocs: string[] = [];
  if (!hasLayout) missingDocs.push('Layout');
  if (!hasWiring) missingDocs.push('Wiring');
  if (!hasPrecheck) missingDocs.push('Pre-check');

  // Direct file upload to Google Drive cloud format (supporting PDF and Images)
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    docKey: keyof typeof docUrls,
    isMultiple = false
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading((prev) => ({ ...prev, [docKey]: true }));

    try {
      const uploadPromises: Promise<{ url: string; name: string }>[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        uploadPromises.push(
          processDriveUpload(file, `Job_${equipmentNo || siteName || 'Docs'}`).then((res) => ({
            url: res.url,
            name: file.name,
          }))
        );
      }

      const results = await Promise.all(uploadPromises);
      setUploading((prev) => ({ ...prev, [docKey]: false }));

      if (isMultiple) {
        setDocUrls((prev) => ({
          ...prev,
          [docKey]: prev[docKey] ? `${prev[docKey]},${results.map((r) => r.url).join(',')}` : results.map((r) => r.url).join(','),
        }));
      } else {
        setDocUrls((prev) => ({ ...prev, [docKey]: results[0].url }));
        setDocNames((prev) => ({ ...prev, [docKey]: results[0].name }));
      }
    } catch (err) {
      setUploading((prev) => ({ ...prev, [docKey]: false }));
      setAlertMsg('เกิดข้อผิดพลาดในการอัปโหลดเอกสาร กรุณาลองใหม่อีกครั้ง');
    }
  };

  // Handle saving image from CameraScannerModal
  const handleSaveScannedDocument = (docKey: DocumentTypeKey, imageUrl: string) => {
    if (
      docKey === 'site_cond_1' ||
      docKey === 'site_cond_2' ||
      docKey === 'site_cond_3' ||
      docKey === 'site_cond_4' ||
      docKey === 'site_cond_5' ||
      docKey === 'site_cond_6'
    ) {
      setDocUrls((prev) => ({
        ...prev,
        [docKey]: prev[docKey] ? `${prev[docKey]},${imageUrl}` : imageUrl,
      }));
    } else {
      setDocUrls((prev) => ({ ...prev, [docKey]: imageUrl }));
      setDocNames((prev) => ({ ...prev, [docKey]: `Scanned_${docKey}_${new Date().toLocaleDateString('th-TH')}.jpg` }));
    }
  };

  const openScanner = (docKey: DocumentTypeKey) => {
    setScannerTargetDoc(docKey);
    setScannerOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalProductLine = productLine === 'อื่นๆโปรดระบุ' ? customProductLine.trim() : productLine;
    const finalArea = area === 'other' ? customArea.trim() : area;

    if (!finalProductLine) {
      setAlertMsg('กรุณาเลือกหรือระบุ Product Line');
      return;
    }
    if (!jobType) {
      setAlertMsg('กรุณาเลือกประเภทงาน');
      return;
    }
    if (!finalArea) {
      setAlertMsg('กรุณาระบุพื้นที่');
      return;
    }
    if (!equipmentNo) {
      setAlertMsg('กรุณากรอก Equipment No.');
      return;
    }
    if (!siteName) {
      setAlertMsg('กรุณาระบุชื่อโครงการ');
      return;
    }
    if (!isAdmin && (!tel || tel.length < 9)) {
      setAlertMsg('กรุณากรอกเบอร์ติดต่อ 10 หลัก');
      return;
    }

    const todayStr = getLocalDateString(getThaiTime());
    if (!isAdmin && targetDate < todayStr) {
      setAlertMsg(
        '⚠️ ไม่สามารถลงจองคิวตรวจย้อนหลังได้ (ก่อนวันที่ปัจจุบัน)\nเฉพาะสิทธิ์ผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถลงคิวตรวจย้อนหลัง เพื่อเป็นข้อมูลอัปเดตและบันทึกย้อนหลังได้ครับ'
      );
      return;
    }

    // STRICT REQUIREMENT: All required documents must be uploaded completely to book!
    if (!hasAllRequiredDocs) {
      setAlertMsg(
        `⚠️ เงื่อนไขการจองคิวงาน: จะต้องอัปโหลดเอกสารให้ครบทั้ง 3 รายการก่อน จึงจะสามารถจองคิวตรวจได้ครับ\n(ยังขาด: ${missingDocs.join(', ')})`
      );
      return;
    }

    const payload: Partial<Booking> = {
      ...data,
      date: targetDate,
      inspector_name: targetInspector,
      product_line: finalProductLine,
      job_type: jobType,
      area: finalArea,
      equipment_no: equipmentNo,
      unit_no: unitNo,
      site_name: siteName,
      tel,
      technician_name: technicianName.trim(),
      map_link: mapLink,
      latitude,
      longitude,
      address_detail: addressDetail,
      layout_img: docUrls.layout,
      wiring_img: docUrls.wiring,
      precheck_img: docUrls.precheck,
      layout_filename: docNames.layout,
      wiring_filename: docNames.wiring,
      precheck_filename: docNames.precheck,
      layout_status: data?.layout_status || (docUrls.layout ? 'pending' : undefined),
      wiring_status: data?.wiring_status || (docUrls.wiring ? 'pending' : undefined),
      precheck_status: data?.precheck_status || (docUrls.precheck ? 'pending' : undefined),
      site_cond_1: docUrls.site_cond_1,
      site_cond_2: docUrls.site_cond_2,
      site_cond_3: docUrls.site_cond_3,
      site_cond_4: docUrls.site_cond_4,
      site_cond_5: docUrls.site_cond_5,
      site_cond_6: docUrls.site_cond_6,
      layout_doc: docUrls.layout ? 'true' : 'false',
      wiring_doc: docUrls.wiring ? 'true' : 'false',
      precheck_doc: docUrls.precheck ? 'true' : 'false',
      status: 'active',
    };

    onSubmit(payload);
  };

  const condLabels: { id: keyof typeof docUrls; label: string; docKey: DocumentTypeKey }[] = [
    { id: 'site_cond_1', label: '1. หน้าตู้คอนโทรล', docKey: 'site_cond_1' },
    { id: 'site_cond_2', label: '2. บนหลังคาลิฟต์', docKey: 'site_cond_2' },
    { id: 'site_cond_3', label: '3. ด้านบนปล่อง', docKey: 'site_cond_3' },
    { id: 'site_cond_4', label: '4. ก้นบ่อลิฟต์', docKey: 'site_cond_4' },
    { id: 'site_cond_5', label: '5. ภายในตู้ลิฟต์', docKey: 'site_cond_5' },
    { id: 'site_cond_6', label: '6. หน้าชั้นและรอบวงกบประตูนอก', docKey: 'site_cond_6' },
  ];

  return (
    <>
      <div className="modal-card w-full max-w-[480px] animate-pop flex flex-col max-h-[90vh] bg-white rounded-3xl overflow-hidden shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 bg-slate-100 hover:bg-slate-200 text-slate-500 p-2 rounded-full z-40 transition-colors"
        >
          <Icons.X />
        </button>

        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center pr-14 shrink-0">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Icons.FileCheck />
            {isEditing ? 'แก้ไขคิวงานตรวจ' : 'จองคิวงานตรวจ SAIS'}
          </h3>
          <button
            type="button"
            onClick={() => setShowHelp(!showHelp)}
            className="text-xs bg-blue-50 text-blue-600 font-bold px-2.5 py-1 rounded-full border border-blue-200 flex items-center gap-1 shadow-sm"
          >
            <Icons.HelpCircle /> วิธีใช้งาน
          </button>
        </div>

        {showHelp ? (
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar space-y-4 -webkit-overflow-scrolling-touch">
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
              <h4 className="font-bold text-blue-900 text-sm mb-2">📌 เงื่อนไขการจองคิวงาน</h4>
              <ul className="list-disc pl-4 space-y-1.5 text-xs text-blue-800 leading-relaxed">
                <li>กรุณาเลือก Product Line ให้ตรงกับรุ่นอุปกรณ์ที่ติดตั้ง</li>
                <li>
                  <b>เงื่อนไขสำคัญ:</b> ผู้จองจะต้องแนบเอกสาร <b>Layout</b>, <b>Wiring</b> และ{' '}
                  <b>Pre-check</b> ให้ครบถ้วนทั้ง 3 รายการ จึงจะสามารถกดยืนยันการจองคิวงานตรวจได้
                </li>
                <li>สามารถใช้ปุ่ม <b>"สแกนกล้องหลัง HD"</b> เพื่อถ่ายรูปเอกสารและอัปโหลดขึ้นระบบได้ทันที</li>
                <li>สามารถใส่พิกัดหรือลิงก์ Google Maps เพื่อให้ผู้ตรวจนำทางได้ทันที</li>
              </ul>
            </div>
            <button
              type="button"
              onClick={() => setShowHelp(false)}
              className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl text-sm shadow-md"
            >
              กลับสู่แบบฟอร์ม
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 custom-scrollbar -webkit-overflow-scrolling-touch pb-10">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Mandatory Documents Checklist Warning Banner */}
              <div
                className={`p-3.5 rounded-2xl border transition-all ${
                  hasAllRequiredDocs
                    ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900'
                    : 'bg-amber-50/80 border-amber-300 text-amber-950'
                }`}
              >
                <div className="flex items-center justify-between font-bold text-xs mb-1.5">
                  <span className="flex items-center gap-1.5">
                    {hasAllRequiredDocs ? <Icons.Check /> : <Icons.Alert />}
                    เงื่อนไขเอกสารบังคับ (3 รายการ)
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      hasAllRequiredDocs
                        ? 'bg-emerald-200 text-emerald-800'
                        : 'bg-amber-200 text-amber-800'
                    }`}
                  >
                    {hasAllRequiredDocs ? 'เอกสารครบแล้ว 3/3' : `ยังไม่ครบ (ขาด ${missingDocs.length})`}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold">
                  <div
                    className={`p-1.5 rounded-lg border text-center ${
                      hasLayout
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-800'
                        : 'bg-white border-amber-200 text-amber-700'
                    }`}
                  >
                    Layout: {hasLayout ? '✅ ครบ' : '❌ ขาด'}
                  </div>
                  <div
                    className={`p-1.5 rounded-lg border text-center ${
                      hasWiring
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-800'
                        : 'bg-white border-amber-200 text-amber-700'
                    }`}
                  >
                    Wiring: {hasWiring ? '✅ ครบ' : '❌ ขาด'}
                  </div>
                  <div
                    className={`p-1.5 rounded-lg border text-center ${
                      hasPrecheck
                        ? 'bg-emerald-100/70 border-emerald-300 text-emerald-800'
                        : 'bg-white border-amber-200 text-amber-700'
                    }`}
                  >
                    Pre-check: {hasPrecheck ? '✅ ครบ' : '❌ ขาด'}
                  </div>
                </div>

                {!hasAllRequiredDocs && (
                  <p className="text-[10px] text-amber-700 mt-1.5 font-medium">
                    * ต้องอัปโหลดเอกสารทั้ง 3 รายการข้างต้นให้ครบ จึงจะสามารถกดบันทึกการจองได้
                  </p>
                )}
              </div>

              {/* Inspector and Date Selector */}
              {isAdmin ? (
                <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-200/80 space-y-2">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Icons.Shield /> วันที่ตรวจและผู้ตรวจ (Admin Control)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-amber-800 block mb-1">วันที่ตรวจ</label>
                      <input
                        type="date"
                        value={targetDate}
                        onChange={(e) => setTargetDate(e.target.value)}
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-amber-200 bg-white font-bold text-blue-600"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-amber-800 block mb-1">ผู้ตรวจ</label>
                      <select
                        value={targetInspector}
                        onChange={(e) => setTargetInspector(e.target.value)}
                        required
                        className="w-full text-xs p-2.5 rounded-lg border border-amber-200 bg-white font-bold text-slate-700"
                      >
                        {inspectors.map((ins) => (
                          <option key={ins.name} value={ins.name}>
                            {ins.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px]">วันที่ตรวจ</span>
                    <span className="font-bold text-slate-800">{targetDate || '-'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">ผู้ตรวจ</span>
                    <span className="font-bold text-blue-600">{targetInspector || '-'}</span>
                  </div>
                </div>
              )}

              {/* Product Line & Job Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Product Line <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={productLine}
                    onChange={(e) => setProductLine(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 outline-none focus:border-blue-400"
                  >
                    {Object.keys(PRODUCT_COLORS).map((key) => (
                      <option key={key} value={key}>
                        {key}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    ประเภทงาน <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 outline-none focus:border-blue-400"
                  >
                    <option value="New">New (ติดตั้งใหม่)</option>
                    <option value="MOD">MOD (ปรับปรุง)</option>
                    <option value="Re-ins temporary power supply">Re-ins temporary</option>
                    <option value="Re-ins builder lift">Re-ins builder lift</option>
                  </select>
                </div>
              </div>

              {productLine === 'อื่นๆโปรดระบุ' && (
                <div>
                  <input
                    type="text"
                    placeholder="ระบุ Product Line อื่นๆ..."
                    value={customProductLine}
                    onChange={(e) => setCustomProductLine(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-yellow-300 bg-yellow-50 font-bold outline-none"
                  />
                </div>
              )}

              {/* Area */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  พื้นที่ <span className="text-red-500">*</span>
                </label>
                <select
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 bg-white font-bold text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="กรุงเทพและปริมณฑล">กรุงเทพและปริมณฑล</option>
                  <option value="other">ต่างจังหวัด (โปรดระบุ)</option>
                </select>
              </div>

              {area === 'other' && (
                <div>
                  <input
                    type="text"
                    placeholder="ระบุจังหวัด / อำเภอ เช่น เชียงใหม่, ภูเก็ต, ขอนแก่น..."
                    value={customArea}
                    onChange={(e) => setCustomArea(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-pink-300 bg-pink-50 font-bold outline-none"
                  />
                </div>
              )}

              {/* Eq No. & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    Equipment No. <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 11732041"
                    value={equipmentNo}
                    onChange={(e) => setEquipmentNo(e.target.value)}
                    required
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none font-bold text-slate-800 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">Unit No.</label>
                  <input
                    type="text"
                    placeholder="เช่น L1, ESC-01"
                    value={unitNo}
                    onChange={(e) => setUnitNo(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none font-bold text-slate-800 focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Site Name */}
              <div>
                <label className="text-xs font-bold text-slate-700 mb-1 block">
                  ชื่อโครงการ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="เช่น อาคาร ซีพี ทาวเวอร์ 3 พญาไท"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  required
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none font-bold text-slate-800 focus:border-blue-400"
                />
              </div>

              {/* Technician, Tel & Google Maps Location Pinning */}
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      ช่างที่หน้างาน
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น ช่างสมหมาย, ช่างวิชัย"
                      value={technicianName}
                      onChange={(e) => setTechnicianName(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none font-bold text-slate-800 focus:border-blue-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1 block">
                      {t.siteTel} {!isAdmin && <span className="text-red-500">*</span>}
                    </label>
                    <input
                      type="tel"
                      placeholder="08XXXXXXXX"
                      maxLength={10}
                      value={tel}
                      onChange={(e) => setTel(e.target.value.replace(/[^0-9]/g, ''))}
                      required={!isAdmin}
                      className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none font-bold text-slate-800 focus:border-blue-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 mb-1 block">
                    {t.googleMapLink}
                  </label>
                  <input
                    type="text"
                    placeholder="ใส่ชื่อสถานที่ หรือ URL พิกัด Google Maps"
                    value={mapLink}
                    onChange={(e) => setMapLink(e.target.value)}
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-300 outline-none text-slate-800 focus:border-blue-400 font-mono text-[11px]"
                  />
                </div>

                {/* Google Maps Pinning Action & Status Card */}
                <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-200/80">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                        <Icons.MapPin className="text-red-500" /> {t.pinOnMap}
                      </span>
                      <span className="text-[10px] text-blue-700/80 block">
                        {t.pinOnMapHint}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setMapPickerOpen(true)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0"
                    >
                      <Icons.MapPin size={14} />
                      {latitude && longitude ? 'แก้ไขตำแหน่งหมุด' : 'เปิดแผนที่เพื่อปักหมุด'}
                    </button>
                  </div>

                  {/* Pinned Coordinates Preview & Direct Navigation Link */}
                  {(latitude && longitude) || mapLink ? (
                    <div className="bg-white p-2 rounded-lg border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                        <div className="overflow-hidden">
                          <span className="font-mono font-bold text-slate-800 text-[11px] block truncate">
                            {latitude && longitude
                              ? `พิกัด GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                              : mapLink}
                          </span>
                          {addressDetail && (
                            <span className="text-[10px] text-slate-500 block truncate">
                              {addressDetail}
                            </span>
                          )}
                        </div>
                      </div>

                      <a
                        href={
                          latitude && longitude
                            ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
                            : mapLink.startsWith('http')
                            ? mapLink
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapLink)}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold rounded-md flex items-center justify-center gap-1 shrink-0 transition-colors"
                      >
                        <Icons.Navigation size={11} /> {t.testMapNav}
                      </a>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 italic">
                      ยังไม่ได้ปักหมุดพิกัด (สามารถกดปุ่มเพื่อปักหมุดบนแผนที่จำลอง หรือค้นหาสถานที่ได้ทันที)
                    </div>
                  )}
                </div>
              </div>

              {/* Document Uploads with Camera Scanner (Layout, Wiring, Precheck) */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Icons.Upload /> อัปโหลดเอกสารบังคับ (ต้องครบ 3 อย่าง){' '}
                    <span className="text-red-500">*</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => openScanner('layout')}
                    className="text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-2.5 py-1 rounded-lg shadow-2xs flex items-center gap-1"
                  >
                    <Icons.Camera size={13} /> สแกนเอกสาร
                  </button>
                </div>

                {(['layout', 'wiring', 'precheck'] as const).map((doc) => {
                  const currentUrl = docUrls[doc];
                  const docLabels: Record<string, string> = {
                    layout: 'Layout Document',
                    wiring: 'Wiring Document',
                    precheck: 'Pre-check Document',
                  };

                  return (
                    <div
                      key={doc}
                      className={`p-3 rounded-xl border transition-all ${
                        currentUrl
                          ? 'bg-emerald-50/60 border-emerald-300 shadow-2xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-800">
                              {docLabels[doc]} <span className="text-red-500">*</span>
                            </span>
                            {currentUrl && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                                Google Drive
                              </span>
                            )}
                          </div>
                          {currentUrl ? (
                            <div className="mt-0.5">
                              <span className="text-[10px] text-emerald-700 font-bold block truncate" title={docNames[doc] || 'ไฟล์แนบ'}>
                                📄 {docNames[doc] || 'เอกสารถูกอัปโหลดแล้ว'}
                              </span>
                              <span className="text-[9px] text-slate-500 font-medium block">
                                (สถานะ: รอตรวจสอบ)
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-amber-600 font-bold block mt-0.5">
                              ❌ ยังไม่ได้แนบไฟล์ (รองรับ PDF, JPG, PNG)
                            </span>
                          )}
                        </div>

                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {currentUrl && (
                              <button
                                type="button"
                                onClick={() => onViewFile(currentUrl)}
                                className="text-[10px] text-blue-600 bg-white px-2.5 py-1.5 rounded-lg border border-blue-200 font-bold hover:bg-blue-50 shadow-2xs"
                              >
                                ดูไฟล์
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openScanner(doc)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-2.5 py-1.5 rounded-lg font-bold flex items-center gap-1 shadow-2xs"
                              title="ถ่ายรูป / สแกนเอกสาร"
                            >
                              <Icons.Camera size={12} /> ถ่ายรูป
                            </button>

                            <label className="bg-slate-800 hover:bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg font-bold cursor-pointer transition-colors shadow-2xs flex items-center gap-1">
                              <Icons.Upload size={12} /> {uploading[doc] ? 'รอ...' : 'แนบไฟล์'}
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                className="hidden"
                                onChange={(e) => handleFileUpload(e, doc)}
                              />
                            </label>
                          </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Site Conditions Photos */}
              <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-3">
                <div className="flex justify-between items-center border-b border-indigo-100 pb-2">
                  <h4 className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Icons.Image /> รูปภาพสภาพหน้างาน (Site Conditions)
                  </h4>
                  <button
                    type="button"
                    onClick={() => openScanner('site_cond_1')}
                    className="text-[10px] bg-indigo-600 text-white px-2.5 py-1 rounded-lg font-bold flex items-center gap-1"
                  >
                    <Icons.Camera size={12} /> ถ่ายรูป
                  </button>
                </div>

                {condLabels.map((cond) => {
                  const currentCondUrls = docUrls[cond.id];
                  const count = currentCondUrls ? currentCondUrls.split(',').filter(Boolean).length : 0;
                  return (
                    <div
                      key={cond.id}
                      className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-indigo-100 shadow-sm"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-[11px] font-bold text-slate-700 block truncate">
                          {cond.label}
                        </span>
                        {count > 0 && (
                          <span className="text-[10px] text-indigo-600 font-bold block">
                            {count} รูปภาพ
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {count > 0 && (
                          <button
                            type="button"
                            onClick={() => onViewFile(currentCondUrls.split(',')[0])}
                            className="text-[10px] text-indigo-700 bg-indigo-50 px-2 py-1.5 rounded-lg border border-indigo-200 font-bold"
                          >
                            ดูรูป
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openScanner(cond.docKey)}
                          className="bg-indigo-700 text-white text-[10px] px-2 py-1.5 rounded-lg font-bold flex items-center gap-0.5"
                        >
                          <Icons.Camera size={11} /> กล้อง
                        </button>
                        <label className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] px-2 py-1.5 rounded-lg font-bold cursor-pointer transition-colors shadow-sm whitespace-nowrap">
                          + แนบ
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => handleFileUpload(e, cond.id, true)}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Submit Button with Validation status */}
              <button
                type="submit"
                className={`w-full py-3.5 font-bold rounded-xl shadow-md active:scale-98 transition-all text-sm flex items-center justify-center gap-2 ${
                  hasAllRequiredDocs
                    ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                    : 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer'
                }`}
              >
                <Icons.Check />
                {isEditing
                  ? 'บันทึกการแก้ไขคิวงาน'
                  : hasAllRequiredDocs
                  ? 'ยืนยันการจองคิวตรวจ (เอกสารครบถ้วน)'
                  : `กรุณาแนบเอกสารให้ครบทั้ง 3 รายการก่อนจอง (ขาด ${missingDocs.join(', ')})`}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Camera Scanner Modal inside Booking */}
      {scannerOpen && (
        <CameraScannerModal
          initialDocType={scannerTargetDoc}
          bookingTitle={siteName || equipmentNo || 'เอกสารจองคิวตรวจ'}
          onClose={() => setScannerOpen(false)}
          onSave={handleSaveScannedDocument}
        />
      )}

      {/* Google Maps Location Pinning Modal */}
      {mapPickerOpen && (
        <MapPickerModal
          initialLat={latitude}
          initialLng={longitude}
          initialLink={mapLink}
          initialSiteName={siteName}
          lang={lang}
          onClose={() => setMapPickerOpen(false)}
          onConfirm={(result) => {
            setLatitude(result.latitude);
            setLongitude(result.longitude);
            setMapLink(result.mapLink);
            setAddressDetail(result.addressDetail);
          }}
        />
      )}
    </>
  );
};
