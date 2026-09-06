import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../Icons';
import { Language, translations } from '../../i18n';

interface MapPickerModalProps {
  initialLat?: number;
  initialLng?: number;
  initialLink?: string;
  initialSiteName?: string;
  lang?: Language;
  onClose: () => void;
  onConfirm: (data: { latitude: number; longitude: number; mapLink: string; addressDetail: string }) => void;
}

// Preset landmarks across Thailand
const PRESET_PLACES = [
  { name: 'อาคาร ซีพี ทาวเวอร์ 3 พญาไท', nameEn: 'CP Tower 3 Phayathai', lat: 13.7584, lng: 100.5349 },
  { name: 'สยามพารากอน กรุงเทพฯ', nameEn: 'Siam Paragon Bangkok', lat: 13.746, lng: 100.535 },
  { name: 'ไอคอนสยาม เจริญนคร', nameEn: 'ICONSIAM Charoen Nakhon', lat: 13.7267, lng: 100.5105 },
  { name: 'เมกาบางนา สมุทรปราการ', nameEn: 'Mega Bangna Samut Prakan', lat: 13.6467, lng: 100.6806 },
  { name: 'เซ็นทรัลเวิลด์ ราชประสงค์', nameEn: 'CentralWorld Ratchaprasong', lat: 13.7465, lng: 100.5393 },
  { name: 'นิคมฯ อมตะซิตี้ ชลบุรี', nameEn: 'Amata City Industrial Estate Chonburi', lat: 13.4357, lng: 101.0022 },
  { name: 'นิคมฯ มาบตาพุด ระยอง', nameEn: 'Map Ta Phut Industrial Estate Rayong', lat: 12.7167, lng: 101.1667 },
  { name: 'สนามบินสุวรรณภูมิ', nameEn: 'Suvarnabhumi Airport', lat: 13.69, lng: 100.7501 },
  { name: 'สนามบินดอนเมือง', nameEn: 'Don Mueang Airport', lat: 13.9126, lng: 100.6067 },
  { name: 'เซ็นทรัลเฟสติวัล เชียงใหม่', nameEn: 'Central Chiang Mai', lat: 18.8065, lng: 99.0183 },
];

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
  initialLat,
  initialLng,
  initialLink,
  initialSiteName,
  lang = 'th',
  onClose,
  onConfirm,
}) => {
  const t = translations[lang];

  // Try to parse coordinates from initialLink if lat/lng not explicitly provided
  let defaultLat = 13.7563; // Bangkok Center
  let defaultLng = 100.5018;

  if (initialLat && initialLng) {
    defaultLat = initialLat;
    defaultLng = initialLng;
  } else if (initialLink) {
    const coordMatch = initialLink.match(/(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    if (coordMatch) {
      defaultLat = parseFloat(coordMatch[1]);
      defaultLng = parseFloat(coordMatch[2]);
    }
  }

  const [lat, setLat] = useState<number>(defaultLat);
  const [lng, setLng] = useState<number>(defaultLng);
  const [zoom, setZoom] = useState<number>(14);
  const [searchQuery, setSearchQuery] = useState(initialSiteName || '');
  const [isLocating, setIsLocating] = useState(false);
  const [addressDesc, setAddressDesc] = useState('');
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [copiedLink, setCopiedLink] = useState(false);

  // Map interaction container ref
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Generate Google Maps direct links
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
  const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;

  // Handle click on the map canvas to drop pin
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = mapContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Calculate normalized offset from center (-0.5 to 0.5)
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const normX = (clickX / rect.width) - 0.5;
    const normY = (clickY / rect.height) - 0.5;

    // Convert screen displacement to lat/long shift based on current zoom level
    const latSpan = 180 / Math.pow(2, zoom - 2);
    const lngSpan = 360 / Math.pow(2, zoom - 2);

    const newLat = lat - (normY * (latSpan * 0.4));
    const newLng = lng + (normX * (lngSpan * 0.4));

    setLat(parseFloat(newLat.toFixed(6)));
    setLng(parseFloat(newLng.toFixed(6)));
  };

  // Get current GPS location
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert(lang === 'th' ? 'อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง GPS' : 'Geolocation is not supported by your device');
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const currentLat = parseFloat(position.coords.latitude.toFixed(6));
        const currentLng = parseFloat(position.coords.longitude.toFixed(6));
        setLat(currentLat);
        setLng(currentLng);
        setZoom(16);
        setAddressDesc(lang === 'th' ? 'ตำแหน่ง GPS ปัจจุบันของคุณ' : 'Your current GPS location');
      },
      (error) => {
        setIsLocating(false);
        alert(
          lang === 'th'
            ? 'ไม่สามารถดึงตำแหน่ง GPS ได้ กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์'
            : 'Unable to retrieve GPS location. Please allow location permissions.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Search places or coordinate strings
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    // Check if query is coordinates "13.7563, 100.5018"
    const coordMatch = searchQuery.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (coordMatch) {
      setLat(parseFloat(parseFloat(coordMatch[1]).toFixed(6)));
      setLng(parseFloat(parseFloat(coordMatch[2]).toFixed(6)));
      setZoom(15);
      return;
    }

    // Check preset landmarks
    const foundPreset = PRESET_PLACES.find(
      (p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (foundPreset) {
      setLat(foundPreset.lat);
      setLng(foundPreset.lng);
      setZoom(15);
      setAddressDesc(lang === 'th' ? foundPreset.name : foundPreset.nameEn);
    } else {
      // Default to slight offset or inform user
      setAddressDesc(searchQuery);
    }
  };

  const handleSelectPreset = (preset: (typeof PRESET_PLACES)[0]) => {
    setLat(preset.lat);
    setLng(preset.lng);
    setZoom(15);
    setSearchQuery(lang === 'th' ? preset.name : preset.nameEn);
    setAddressDesc(lang === 'th' ? preset.name : preset.nameEn);
  };

  const handleConfirm = () => {
    onConfirm({
      latitude: lat,
      longitude: lng,
      mapLink: googleMapsSearchUrl,
      addressDetail: addressDesc || searchQuery || `${lat}, ${lng}`,
    });
    onClose();
  };

  // Copy link
  const handleCopyLink = () => {
    navigator.clipboard.writeText(googleMapsSearchUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
              <Icons.MapPin size={18} />
            </div>
            <div>
              <h3 className="text-sm md:text-base font-bold leading-tight flex items-center gap-1.5">
                {t.mapModalTitle}
              </h3>
              <p className="text-[11px] text-blue-100/90">{t.mapModalSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <Icons.X />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3 custom-scrollbar">
          {/* Search bar & GPS */}
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchPlacePlaceholder}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-800"
              />
              <span className="absolute left-3 top-2.5 text-slate-400">
                <Icons.Search />
              </span>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-sm"
            >
              {t.search}
            </button>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              disabled={isLocating}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
              title={t.useGpsLocation}
            >
              <Icons.Navigation size={14} className={isLocating ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{isLocating ? t.gpsLocating : t.useGpsLocation}</span>
            </button>
          </form>

          {/* Quick Preset Places */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500">{t.presetLocations}</span>
            <div className="flex flex-wrap gap-1.5 max-h-16 overflow-y-auto py-0.5">
              {PRESET_PLACES.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="text-[10px] px-2.5 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 border border-slate-200 rounded-lg text-slate-700 transition-colors font-medium"
                >
                  📍 {lang === 'th' ? p.name : p.nameEn}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Map Visual Stage */}
          <div className="relative rounded-xl border border-slate-200 overflow-hidden shadow-inner bg-slate-100 select-none">
            {/* Map Frame / Tile Canvas */}
            <div
              ref={mapContainerRef}
              onClick={handleMapClick}
              className="w-full h-64 md:h-72 cursor-crosshair relative overflow-hidden bg-slate-200"
              style={{
                backgroundImage:
                  mapType === 'satellite'
                    ? `radial-gradient(#334155 1px, transparent 1px), radial-gradient(#1e293b 1px, #0f172a 1px)`
                    : `radial-gradient(#94a3b8 1px, transparent 1px), radial-gradient(#cbd5e1 1px, #f1f5f9 1px)`,
                backgroundSize: '20px 20px',
                backgroundPosition: '0 0, 10px 10px',
              }}
            >
              {/* Simulated Map Roads & Geographical Grids */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M 60 0 L 0 0 0 60" fill="none" stroke={mapType === 'satellite' ? '#475569' : '#cbd5e1'} strokeWidth="1" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
                {/* Simulated Expressway / Main Road Vector Lines */}
                <path d="M 0 120 Q 150 180 320 140 T 640 160" fill="none" stroke="#fbbf24" strokeWidth="6" opacity="0.7" />
                <path d="M 120 0 Q 180 150 200 300" fill="none" stroke="#60a5fa" strokeWidth="5" opacity="0.6" />
                <path d="M 0 240 Q 240 220 640 260" fill="none" stroke="#f87171" strokeWidth="4" opacity="0.5" />
              </svg>

              {/* Pin Marker (Centered relative to coordinates) */}
              <div
                className="absolute transform -translate-x-1/2 -translate-y-full transition-all duration-200 pointer-events-none"
                style={{ left: '50%', top: '50%' }}
              >
                <div className="relative flex flex-col items-center">
                  <div className="px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded shadow-md whitespace-nowrap mb-1 animate-bounce">
                    📍 {searchQuery || (lang === 'th' ? 'ตำแหน่งที่ปักหมุด' : 'Pinned Location')}
                  </div>
                  <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg border-2 border-white ring-4 ring-red-300/50">
                    <Icons.MapPin size={18} />
                  </div>
                  <div className="w-2 h-2 bg-red-700 rounded-full mt-[-2px] shadow"></div>
                </div>
              </div>

              {/* Hint badge at top of map */}
              <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 shadow-sm pointer-events-none flex items-center gap-1">
                <Icons.Compass size={12} className="text-blue-600" />
                {lang === 'th' ? 'คลิกบนแผนที่เพื่อย้ายหมุด' : 'Click anywhere on map to reposition pin'}
              </div>

              {/* Map controls */}
              <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoom((z) => Math.min(18, z + 1));
                  }}
                  className="w-7 h-7 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow border border-slate-200 font-bold flex items-center justify-center text-sm"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setZoom((z) => Math.max(8, z - 1));
                  }}
                  className="w-7 h-7 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow border border-slate-200 font-bold flex items-center justify-center text-sm"
                  title="Zoom Out"
                >
                  -
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMapType((m) => (m === 'standard' ? 'satellite' : 'standard'));
                  }}
                  className="w-7 h-7 bg-white hover:bg-slate-50 text-slate-700 rounded-lg shadow border border-slate-200 font-bold flex items-center justify-center text-[10px]"
                  title="Toggle Map Style"
                >
                  {mapType === 'standard' ? '🛰️' : '🗺️'}
                </button>
              </div>

              {/* Bottom coordinate bar overlay */}
              <div className="absolute bottom-2 inset-x-2 bg-white/95 backdrop-blur-sm p-2 rounded-xl border border-slate-200 shadow-md flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-mono font-bold text-slate-800 text-[11px]">
                    Lat: {lat.toFixed(6)}, Lng: {lng.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={googleMapsNavUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg border border-blue-200 flex items-center gap-1 transition-colors"
                  >
                    <Icons.Navigation size={11} /> {t.testMapNav}
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Coordinate manual fine-tuning inputs */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                {lang === 'th' ? 'พิกัดละติจูด (Latitude)' : 'Latitude'}
              </label>
              <input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(parseFloat(parseFloat(e.target.value).toFixed(6)) || 0)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 text-xs outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 block mb-1">
                {lang === 'th' ? 'พิกัดลองจิจูด (Longitude)' : 'Longitude'}
              </label>
              <input
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => setLng(parseFloat(parseFloat(e.target.value).toFixed(6)) || 0)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-800 text-xs outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* Generated Google Maps Link preview */}
          <div className="flex items-center gap-2 bg-blue-50/70 p-2.5 rounded-xl border border-blue-100 text-xs">
            <span className="text-blue-600 shrink-0">
              <Icons.MapPin size={16} />
            </span>
            <input
              type="text"
              readOnly
              value={googleMapsSearchUrl}
              className="w-full bg-transparent font-mono text-[11px] text-blue-900 select-all outline-none truncate"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1 bg-white hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg border border-blue-200 shrink-0 flex items-center gap-1 transition-colors"
            >
              <Icons.Copy size={12} /> {copiedLink ? t.copied : t.copy}
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <Icons.Check /> {t.confirmPin}
          </button>
        </div>
      </div>
    </div>
  );
};
