import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Icons } from '../Icons';
import { Language, translations } from '../../i18n';

// Fix Leaflet default icon paths in bundler environments
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface MapPickerModalProps {
  initialLat?: number;
  initialLng?: number;
  initialLink?: string;
  initialSiteName?: string;
  lang?: Language;
  onClose: () => void;
  onConfirm: (data: { latitude: number; longitude: number; mapLink: string; addressDetail: string }) => void;
}

interface SearchResultItem {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
}

// Preset landmarks across Thailand for 1-tap quick pick
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
  { name: 'เซ็นทรัล ภูเก็ต ฟลอเรสต้า', nameEn: 'Central Phuket Floresta', lat: 7.8931, lng: 98.3664 },
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

  // Resolve starting coordinates
  let defaultLat = 13.7563; // Bangkok
  let defaultLng = 100.5018;

  if (initialLat && initialLng && !isNaN(initialLat) && !isNaN(initialLng)) {
    defaultLat = initialLat;
    defaultLng = initialLng;
  } else if (initialLink) {
    const coordMatch = initialLink.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (coordMatch) {
      defaultLat = parseFloat(coordMatch[1]);
      defaultLng = parseFloat(coordMatch[2]);
    }
  }

  const [lat, setLat] = useState<number>(defaultLat);
  const [lng, setLng] = useState<number>(defaultLng);
  const [searchQuery, setSearchQuery] = useState(initialSiteName || '');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [addressDesc, setAddressDesc] = useState(initialSiteName || '');
  const [mapType, setMapType] = useState<'street' | 'satellite'>('street');
  const [copiedLink, setCopiedLink] = useState(false);
  const [showResultsDropdown, setShowResultsDropdown] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Generate Google Maps links
  const googleMapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${lat.toFixed(6)},${lng.toFixed(6)}`;
  const googleMapsNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(6)},${lng.toFixed(6)}`;

  // Tile layer URLs
  const streetTileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  const satelliteTileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [defaultLat, defaultLng],
        zoom: 15,
        zoomControl: false,
      });

      // Add zoom control to top-right
      L.control.zoom({ position: 'topright' }).addTo(map);

      // Create primary tile layer
      const initialLayer = L.tileLayer(streetTileUrl, {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      tileLayerRef.current = initialLayer;

      // Create Draggable Pin Marker
      const marker = L.marker([defaultLat, defaultLng], {
        draggable: true,
      }).addTo(map);
      markerRef.current = marker;

      marker.bindPopup(`<b>📍 ${addressDesc || 'ตำแหน่งที่ปักหมุด'}</b><br>${defaultLat.toFixed(6)}, ${defaultLng.toFixed(6)}`);

      // Update coordinates on marker drag
      marker.on('dragend', () => {
        const position = marker.getLatLng();
        const newLat = parseFloat(position.lat.toFixed(6));
        const newLng = parseFloat(position.lng.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        reverseGeocode(newLat, newLng);
      });

      // Click anywhere on map to reposition pin
      map.on('click', (e: L.LeafletMouseEvent) => {
        const newLat = parseFloat(e.latlng.lat.toFixed(6));
        const newLng = parseFloat(e.latlng.lng.toFixed(6));
        setLat(newLat);
        setLng(newLng);
        marker.setLatLng([newLat, newLng]);
        marker.openPopup();
        reverseGeocode(newLat, newLng);
      });

      mapInstanceRef.current = map;

      // Fix container size on next tick
      setTimeout(() => {
        map.invalidateSize();
      }, 200);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update tile layer when mapType toggles
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;

    mapInstanceRef.current.removeLayer(tileLayerRef.current);
    const newUrl = mapType === 'satellite' ? satelliteTileUrl : streetTileUrl;
    const newAttribution = mapType === 'satellite' ? '&copy; Esri World Imagery' : '&copy; OpenStreetMap contributors';

    const newLayer = L.tileLayer(newUrl, {
      attribution: newAttribution,
      maxZoom: 19,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
  }, [mapType]);

  // Reverse Geocoding via Nominatim API
  const reverseGeocode = async (latitude: number, longitude: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1&accept-language=th,en`,
        { headers: { 'User-Agent': 'SAISBookingSystem/2.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.display_name) {
          const shortName = data.name || data.address?.building || data.address?.road || data.display_name.split(',')[0];
          setAddressDesc(shortName || data.display_name);
          if (markerRef.current) {
            markerRef.current.setPopupContent(`<b>📍 ${shortName || 'ตำแหน่งที่เลือก'}</b><br>${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        }
      }
    } catch {
      // Fallback silently if offline
    }
  };

  // Forward Search with Nominatim Geocoder
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    // Check if query is coordinate format "13.7563, 100.5018"
    const coordMatch = query.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (coordMatch) {
      const cLat = parseFloat(parseFloat(coordMatch[1]).toFixed(6));
      const cLng = parseFloat(parseFloat(coordMatch[2]).toFixed(6));
      updateMapPosition(cLat, cLng, query, 16);
      setShowResultsDropdown(false);
      return;
    }

    // Check preset landmarks first
    const preset = PRESET_PLACES.find(
      (p) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.nameEn.toLowerCase().includes(query.toLowerCase())
    );
    if (preset) {
      updateMapPosition(preset.lat, preset.lng, lang === 'th' ? preset.name : preset.nameEn, 16);
    }

    // Search online via OpenStreetMap Nominatim
    setIsSearching(true);
    setShowResultsDropdown(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query
        )}&countrycodes=th&limit=7&accept-language=th,en`,
        { headers: { 'User-Agent': 'SAISBookingSystem/2.0' } }
      );
      if (res.ok) {
        const data: SearchResultItem[] = await res.json();
        setSearchResults(data);
        if (data.length > 0) {
          const first = data[0];
          const fLat = parseFloat(parseFloat(first.lat).toFixed(6));
          const fLng = parseFloat(parseFloat(first.lon).toFixed(6));
          updateMapPosition(fLat, fLng, first.display_name.split(',')[0], 16);
        }
      }
    } catch {
      // ignore
    } finally {
      setIsSearching(false);
    }
  };

  // Helper to fly to coordinates & update marker
  const updateMapPosition = (newLat: number, newLng: number, title?: string, zoomLevel = 16) => {
    setLat(newLat);
    setLng(newLng);
    if (title) setAddressDesc(title);

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([newLat, newLng], zoomLevel, {
        duration: 1.2,
      });
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([newLat, newLng]);
      markerRef.current.setPopupContent(`<b>📍 ${title || 'ตำแหน่งที่เลือก'}</b><br>${newLat.toFixed(6)}, ${newLng.toFixed(6)}`);
      markerRef.current.openPopup();
    }
  };

  // Pick suggestion from dropdown
  const handleSelectResult = (item: SearchResultItem) => {
    const itemLat = parseFloat(parseFloat(item.lat).toFixed(6));
    const itemLng = parseFloat(parseFloat(item.lon).toFixed(6));
    const title = item.display_name.split(',')[0];
    setSearchQuery(title);
    updateMapPosition(itemLat, itemLng, title, 16);
    setShowResultsDropdown(false);
  };

  // Pick Preset Landmark
  const handleSelectPreset = (p: typeof PRESET_PLACES[0]) => {
    setSearchQuery(lang === 'th' ? p.name : p.nameEn);
    updateMapPosition(p.lat, p.lng, lang === 'th' ? p.name : p.nameEn, 16);
    setShowResultsDropdown(false);
  };

  // Current GPS Location
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
        updateMapPosition(currentLat, currentLng, lang === 'th' ? 'ตำแหน่ง GPS ปัจจุบันของคุณ' : 'Your current GPS location', 17);
        reverseGeocode(currentLat, currentLng);
      },
      () => {
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

  const handleConfirm = () => {
    onConfirm({
      latitude: lat,
      longitude: lng,
      mapLink: googleMapsSearchUrl,
      addressDetail: addressDesc || searchQuery || `${lat}, ${lng}`,
    });
    onClose();
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(googleMapsSearchUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Modal Header */}
        <div className="px-4 sm:px-5 py-3 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center text-white shrink-0">
              <Icons.MapPin size={18} />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold leading-tight flex items-center gap-1.5">
                {t.mapModalTitle}
                <span className="text-[10px] bg-emerald-400 text-slate-900 font-black px-1.5 py-0.2 rounded-full uppercase">
                  GPS Pro
                </span>
              </h3>
              <p className="text-[11px] text-blue-100/90 hidden sm:block">{t.mapModalSubtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Icons.X />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-3 sm:p-4 overflow-y-auto space-y-3 custom-scrollbar flex-1">
          {/* Search bar & GPS Action */}
          <div className="relative">
            <form onSubmit={handleSearch} className="flex gap-1.5 sm:gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setShowResultsDropdown(true);
                  }}
                  placeholder={lang === 'th' ? 'พิมพ์ค้นหาชื่อสถานที่, โครงการ, อาคาร, โรงพยาบาล หรือพิกัด...' : t.searchPlacePlaceholder}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl outline-none focus:border-blue-500 font-medium text-slate-800 shadow-2xs"
                />
                <span className="absolute left-3 top-2.5 text-slate-400">
                  <Icons.Search />
                </span>
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors shrink-0 shadow-sm flex items-center gap-1"
              >
                {isSearching ? <Icons.Loader size={14} /> : <Icons.Search size={14} />}
                <span className="hidden sm:inline">{t.search}</span>
              </button>

              <button
                type="button"
                onClick={handleGetCurrentLocation}
                disabled={isLocating}
                className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
                title={t.useGpsLocation}
              >
                <Icons.Navigation size={14} className={isLocating ? 'animate-spin text-emerald-600' : 'text-emerald-600'} />
                <span className="hidden sm:inline">{isLocating ? t.gpsLocating : t.useGpsLocation}</span>
              </button>
            </form>

            {/* Autocomplete Search Results Dropdown */}
            {showResultsDropdown && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-48 overflow-y-auto custom-scrollbar p-1">
                <div className="p-1.5 text-[10px] font-bold text-slate-400 border-b border-slate-100 flex items-center justify-between">
                  <span>ผลการค้นหาสถานที่ ({searchResults.length} แห่ง)</span>
                  <button
                    type="button"
                    onClick={() => setShowResultsDropdown(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ปิด
                  </button>
                </div>
                {searchResults.map((item) => (
                  <button
                    key={item.place_id}
                    type="button"
                    onClick={() => handleSelectResult(item)}
                    className="w-full text-left p-2 hover:bg-blue-50 rounded-xl transition-colors text-xs text-slate-800 flex items-start gap-2 border-b border-slate-50 last:border-0"
                  >
                    <Icons.MapPin size={14} className="text-red-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{item.display_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Preset Places */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <span>📍 สถานที่ยอดนิยม (แตะเพื่อไปทันที):</span>
            </span>
            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto py-0.5">
              {PRESET_PLACES.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 rounded-lg text-slate-700 transition-colors font-medium whitespace-nowrap"
                >
                  {lang === 'th' ? p.name : p.nameEn}
                </button>
              ))}
            </div>
          </div>

          {/* Real Leaflet Map Container */}
          <div className="relative rounded-2xl border-2 border-slate-300 overflow-hidden shadow-sm bg-slate-100">
            {/* Map Canvas */}
            <div
              ref={mapContainerRef}
              className="w-full h-64 sm:h-80 md:h-96 z-0"
              style={{ minHeight: '260px' }}
            />

            {/* Instruction Banner at Top */}
            <div className="absolute top-2 left-2 z-[400] bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-xl border border-slate-200 text-[10px] font-bold text-slate-800 shadow-sm pointer-events-none flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              {lang === 'th' ? 'จิ้มหรือลากหมุดบนแผนที่จริงเพื่อเลือกตำแหน่งที่แม่นยำ' : 'Click or drag pin to position'}
            </div>

            {/* Map Style Switcher (Street vs Satellite) */}
            <div className="absolute top-2 right-12 z-[400] flex gap-1">
              <button
                type="button"
                onClick={() => setMapType('street')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold shadow transition-colors border ${
                  mapType === 'street'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                🗺️ แผนที่ถนน
              </button>
              <button
                type="button"
                onClick={() => setMapType('satellite')}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold shadow transition-colors border ${
                  mapType === 'satellite'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
                }`}
              >
                🛰️ ดาวเทียม
              </button>
            </div>

            {/* Bottom Floating Coordinate Bar */}
            <div className="absolute bottom-2 inset-x-2 z-[400] bg-white/95 backdrop-blur-sm p-2 sm:p-2.5 rounded-xl border border-slate-200 shadow-md flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 overflow-hidden pr-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                <div className="overflow-hidden">
                  <span className="font-mono font-bold text-slate-800 text-[11px] block truncate">
                    GPS: {lat.toFixed(6)}, {lng.toFixed(6)}
                  </span>
                  {addressDesc && (
                    <span className="text-[10px] text-slate-500 block truncate">
                      {addressDesc}
                    </span>
                  )}
                </div>
              </div>

              <a
                href={googleMapsNavUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold rounded-lg border border-blue-200 flex items-center gap-1 shrink-0 transition-colors shadow-2xs"
              >
                <Icons.Navigation size={12} /> {t.testMapNav}
              </a>
            </div>
          </div>

          {/* Manual Coordinate Inputs */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 bg-slate-50 p-2.5 sm:p-3 rounded-2xl border border-slate-200 text-xs">
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                {lang === 'th' ? 'ละติจูด (Latitude):' : 'Latitude:'}
              </label>
              <input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => {
                  const val = parseFloat(parseFloat(e.target.value).toFixed(6)) || 0;
                  setLat(val);
                  if (mapInstanceRef.current && markerRef.current) {
                    markerRef.current.setLatLng([val, lng]);
                    mapInstanceRef.current.panTo([val, lng]);
                  }
                }}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 text-xs outline-none focus:border-blue-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-600 block mb-1">
                {lang === 'th' ? 'ลองจิจูด (Longitude):' : 'Longitude:'}
              </label>
              <input
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => {
                  const val = parseFloat(parseFloat(e.target.value).toFixed(6)) || 0;
                  setLng(val);
                  if (mapInstanceRef.current && markerRef.current) {
                    markerRef.current.setLatLng([lat, val]);
                    mapInstanceRef.current.panTo([lat, val]);
                  }
                }}
                className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-800 text-xs outline-none focus:border-blue-400"
              />
            </div>
          </div>

          {/* Google Maps Link & Copy Button */}
          <div className="flex items-center gap-2 bg-blue-50/70 p-2 sm:p-2.5 rounded-2xl border border-blue-100 text-xs">
            <span className="text-blue-600 shrink-0">
              <Icons.MapPin size={16} />
            </span>
            <input
              type="text"
              readOnly
              value={googleMapsSearchUrl}
              className="flex-1 bg-white border border-blue-200 text-slate-600 rounded-lg px-2 py-1 text-[11px] font-mono outline-none select-all"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-bold rounded-lg text-[10px] shrink-0 transition-colors shadow-2xs"
            >
              {copiedLink ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์'}
            </button>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
          >
            <Icons.Check />
            {lang === 'th' ? 'ยืนยันปักหมุดตำแหน่งนี้' : 'Confirm Location Pin'}
          </button>
        </div>
      </div>
    </div>
  );
};
