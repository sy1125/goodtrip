"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plane, MapPin, Flag, Calendar, Camera, Clock,
  TrendingUp, Plus, X, Upload,
  Trash2, Edit3, ChevronLeft, ChevronRight, Image as ImageIcon,
  Search, Loader2, Heart,
} from "lucide-react";

/* ───── Types ───── */

interface Trip {
  id: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  notes: string | null;
  photos: { id: number; file_path: string; caption: string | null }[];
}

interface UpcomingTrip {
  id: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  notes: string | null;
}

interface Stats {
  totalTrips: number;
  totalCountries: number;
  totalCities: number;
  totalPhotos: number;
  totalDays: number;
  avgDays: number;
  countries: { country: string; visits: number; last_visit: string }[];
  monthlyTrips: { month: number; trips: number }[];
  timeline: { id: string; city: string; country: string; start_date: string; end_date: string; days: number }[];
  upcoming: UpcomingTrip[];
}

const timelineDotColors = [
  "bg-primary", "bg-accent", "bg-emerald-500", "bg-violet-500",
  "bg-rose-500", "bg-sky-500", "bg-amber-500", "bg-lime-500",
];

/* ───── Autocomplete Input ───── */

interface GeoSuggestion {
  display_name: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
}

function AutocompleteInput({
  value,
  onChange,
  placeholder,
  label,
  required,
  searchType,
  extraQuery,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  required?: boolean;
  searchType: "country" | "city";
  extraQuery?: string;
}) {
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        return;
      }
      setSearching(true);
      try {
        const q = extraQuery ? `${query}, ${extraQuery}` : query;
        const res = await fetch(
          `/api/geocode/search?q=${encodeURIComponent(q)}&type=${searchType}`
        );
        const data: GeoSuggestion[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    },
    [searchType, extraQuery]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchSuggestions(val), 400);
    setShowSuggestions(true);
  };

  const handleSelect = (suggestion: GeoSuggestion) => {
    if (searchType === "country") {
      onChange(suggestion.country || suggestion.display_name.split(",").pop()?.trim() || suggestion.display_name);
    } else {
      const cityName = suggestion.city || suggestion.display_name.split(",")[0]?.trim() || value;
      onChange(cityName);
    }
    setShowSuggestions(false);
    setSuggestions([]);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-medium text-muted block mb-1.5">
        {label} {required && "*"}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 text-sm border border-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </div>
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-card-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start gap-2"
            >
              <MapPin size={12} className="text-primary mt-0.5 flex-shrink-0" />
              <span className="text-foreground line-clamp-1">{s.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Components ───── */

function TripCard({ trip, onEdit, onDelete, isFavorite, onToggleFavorite }: { trip: Trip; onEdit: () => void; onDelete: () => void; isFavorite: boolean; onToggleFavorite: () => void }) {
  const days = Math.ceil(
    (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000
  ) + 1;

  return (
    <div className="group bg-card-bg rounded-2xl border border-card-border overflow-hidden hover:shadow-lg transition-all">
      <div className="relative h-44 sm:h-48 overflow-hidden bg-gray-100">
        {trip.cover_image ? (
          <img src={trip.cover_image} alt={trip.city} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <ImageIcon size={48} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-white font-bold text-lg leading-tight">{trip.city}</h3>
          <p className="text-white/70 text-xs">{trip.country}</p>
        </div>
        <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white">
            <Edit3 size={12} className="text-gray-700" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white">
            <Trash2 size={12} className="text-red-500" />
          </button>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white shadow-sm">
          <Heart size={12} className={isFavorite ? "text-rose-500 fill-rose-500" : "text-gray-400"} />
        </button>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><Calendar size={12} />{trip.start_date} — {trip.end_date.slice(5)}</span>
            <span className="flex items-center gap-1"><Clock size={12} />{days}일</span>
          </div>
          {trip.photos.length > 0 && (
            <span className="flex items-center gap-1">
              <Camera size={11} /> {trip.photos.length}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({ data }: { data: { month: number; trips: number }[] }) {
  const months = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  const maxTrips = Math.max(...data.map((m) => m.trips), 1);
  return (
    <div className="flex items-end gap-1.5 h-24">
      {data.map((m, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`w-full rounded-t transition-all ${m.trips > 0 ? "bg-gradient-to-t from-primary to-primary-light" : "bg-gray-100"}`}
            style={{ height: `${Math.max((m.trips / maxTrips) * 100, 8)}%` }}
          />
          <span className="text-[10px] text-muted">{months[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ───── Trip Form Modal ───── */

function TripFormModal({
  trip,
  onClose,
  onSaved,
}: {
  trip: Trip | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [city, setCity] = useState(trip?.city || "");
  const [country, setCountry] = useState(trip?.country || "");
  const [startDate, setStartDate] = useState(trip?.start_date || "");
  const [endDate, setEndDate] = useState(trip?.end_date || "");
  const [notes, setNotes] = useState(trip?.notes || "");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>(
    trip?.cover_image ? [trip.cover_image, ...(trip.photos?.map(p => p.file_path) || [])] : (trip?.photos?.map(p => p.file_path) || [])
  );
  const [saving, setSaving] = useState(false);

  const handleImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
  };

  const handleRemoveImage = (index: number) => {
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    // 기존 이미지(서버에 있는)와 새로 추가한 파일을 구분
    const existingCount = trip?.cover_image
      ? 1 + (trip.photos?.length || 0)
      : (trip?.photos?.length || 0);
    if (index >= existingCount) {
      const fileIndex = index - existingCount;
      setImageFiles((prev) => prev.filter((_, i) => i !== fileIndex));
    }
  };

  const handleSubmit = async () => {
    if (!city || !country || !startDate || !endDate) {
      alert("도시, 국가, 시작일, 종료일은 필수입니다.");
      return;
    }
    setSaving(true);

    try {
      // 1. 새 파일들 업로드
      const uploadedPaths: string[] = [];
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        const uploadData = await uploadRes.json();
        uploadedPaths.push(uploadData.path);
      }

      // 2. 최종 이미지 목록 구성 (미리보기 순서 기준, 서버 경로로 매핑)
      const existingCount = trip?.cover_image
        ? 1 + (trip.photos?.length || 0)
        : (trip?.photos?.length || 0);
      const existingPaths = trip?.cover_image
        ? [trip.cover_image, ...(trip.photos?.map(p => p.file_path) || [])]
        : (trip?.photos?.map(p => p.file_path) || []);

      const allPaths: string[] = [];
      let newFileIdx = 0;
      for (let i = 0; i < imagePreviews.length; i++) {
        if (i < existingCount && existingPaths.includes(imagePreviews[i])) {
          allPaths.push(imagePreviews[i]);
        } else {
          if (newFileIdx < uploadedPaths.length) {
            allPaths.push(uploadedPaths[newFileIdx]);
            newFileIdx++;
          }
        }
      }

      const coverPath = allPaths.length > 0 ? allPaths[0] : null;
      const photoPaths = allPaths.slice(1);

      // 3. 여행 저장 (좌표는 서버에서 자동 geocoding)
      const body = {
        city, country, start_date: startDate, end_date: endDate,
        cover_image: coverPath, notes: notes || null,
        photo_paths: photoPaths,
      };

      if (trip) {
        await fetch(`/api/trips/${trip.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/trips", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      onSaved();
      onClose();
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <h2 className="text-lg font-bold text-foreground">{trip ? "여행 수정" : "새 여행 기록"}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* 이미지 */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              사진 <span className="text-gray-400 font-normal">(첫 번째 사진이 커버 이미지가 됩니다)</span>
            </label>
            {imagePreviews.length > 0 ? (
              <div className="space-y-2">
                {/* 커버 미리보기 */}
                <div className="relative h-36 rounded-xl overflow-hidden bg-gray-100">
                  <img src={imagePreviews[0]} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold bg-primary text-white rounded-full">커버</span>
                  <button type="button" onClick={() => handleRemoveImage(0)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500">
                    <X size={12} />
                  </button>
                </div>
                {/* 나머지 사진 썸네일 */}
                {imagePreviews.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {imagePreviews.slice(1).map((src, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleRemoveImage(i + 1)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500">
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* 추가 업로드 */}
                <label className="flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-300 rounded-xl text-xs text-gray-400 hover:text-gray-600 hover:border-gray-400 cursor-pointer transition-colors">
                  <Plus size={14} /> 사진 추가
                  <input type="file" accept="image/*" multiple onChange={handleImagesChange} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="relative h-36 rounded-xl overflow-hidden bg-gray-100 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:text-gray-600 hover:border-gray-400 transition-colors">
                <Upload size={24} />
                <p className="text-xs mt-1">클릭하여 사진 업로드</p>
                <p className="text-[10px] mt-0.5">여러 장 선택 가능</p>
                <input type="file" accept="image/*" multiple onChange={handleImagesChange} className="hidden" />
              </label>
            )}
          </div>

          <AutocompleteInput
            value={country}
            onChange={setCountry}
            placeholder="예: 일본, 프랑스, 미국"
            label="국가"
            required
            searchType="country"
          />

          <AutocompleteInput
            value={city}
            onChange={setCity}
            placeholder="예: 도쿄, 파리, 뉴욕"
            label="도시"
            required
            searchType="city"
            extraQuery={country}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1.5">시작일 *</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1.5">종료일 *</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">메모</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="여행에 대한 메모..." />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-card-border">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-muted bg-gray-100 rounded-xl hover:bg-gray-200">
            취소
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark disabled:opacity-50">
            {saving ? "저장 중..." : trip ? "수정" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───── Photo Upload Modal ───── */

function PhotoUploadModal({
  tripId,
  onClose,
  onUploaded,
}: {
  tripId: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("trip_id", tripId);
        await fetch("/api/upload", { method: "POST", body: formData });
      }
      onUploaded();
      onClose();
    } catch {
      alert("업로드에 실패했습니다.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <h2 className="text-lg font-bold text-foreground">사진 업로드</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="p-6">
          <input type="file" accept="image/*" multiple
            onChange={(e) => setFiles(Array.from(e.target.files || []))}
            className="w-full text-sm" />
          {files.length > 0 && (
            <p className="text-xs text-muted mt-2">{files.length}개 파일 선택됨</p>
          )}
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-card-border">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-muted bg-gray-100 rounded-xl hover:bg-gray-200">
            취소
          </button>
          <button onClick={handleUpload} disabled={uploading || files.length === 0}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark disabled:opacity-50">
            {uploading ? "업로드 중..." : "업로드"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───── Trip Detail Modal ───── */

function TripDetailModal({
  trip,
  onClose,
  onEdit,
  onRefresh,
}: {
  trip: Trip;
  onClose: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const days = Math.ceil(
    (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000
  ) + 1;

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm("이 사진을 삭제하시겠습니까?")) return;
    await fetch(`/api/trips/${trip.id}/photos?photoId=${photoId}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* 커버 */}
        <div className="relative h-56 bg-gray-100">
          {trip.cover_image ? (
            <img src={trip.cover_image} alt={trip.city} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300">
              <ImageIcon size={64} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50">
            <X size={16} />
          </button>
          <div className="absolute bottom-4 left-6">
            <h2 className="text-2xl font-bold text-white">{trip.city}</h2>
            <p className="text-white/70 text-sm">{trip.country}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* 여행 정보 */}
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {trip.start_date} — {trip.end_date}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> {days}일</span>
          </div>

          {/* 메모 */}
          {trip.notes && (
            <div>
              <p className="text-xs font-medium text-muted mb-1">메모</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{trip.notes}</p>
            </div>
          )}

          {/* 사진 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-muted">사진 ({trip.photos.length})</p>
              <button onClick={() => setShowPhotoUpload(true)}
                className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-dark">
                <Plus size={12} /> 사진 추가
              </button>
            </div>
            {trip.photos.length > 0 ? (
              <div>
                <div className="relative h-48 sm:h-64 rounded-xl overflow-hidden bg-gray-100 mb-2">
                  <img src={trip.photos[photoIndex]?.file_path} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => handleDeletePhoto(trip.photos[photoIndex].id)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-red-500">
                    <Trash2 size={12} />
                  </button>
                  {trip.photos.length > 1 && (
                    <>
                      <button onClick={() => setPhotoIndex((p) => (p - 1 + trip.photos.length) % trip.photos.length)}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50">
                        <ChevronLeft size={16} />
                      </button>
                      <button onClick={() => setPhotoIndex((p) => (p + 1) % trip.photos.length)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50">
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                  <span className="absolute bottom-2 right-2 px-2 py-0.5 text-xs bg-black/50 text-white rounded-full">
                    {photoIndex + 1} / {trip.photos.length}
                  </span>
                </div>
                <div className="flex gap-1.5 overflow-x-auto">
                  {trip.photos.map((photo, i) => (
                    <button key={photo.id} onClick={() => setPhotoIndex(i)}
                      className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 ${i === photoIndex ? "border-primary" : "border-transparent"}`}>
                      <img src={photo.file_path} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-400 text-sm">
                아직 사진이 없습니다
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={onEdit}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-foreground bg-gray-100 rounded-xl hover:bg-gray-200">
              <Edit3 size={14} /> 여행 수정
            </button>
          </div>
        </div>
      </div>

      {showPhotoUpload && (
        <PhotoUploadModal tripId={trip.id} onClose={() => setShowPhotoUpload(false)} onUploaded={onRefresh} />
      )}
    </div>
  );
}

/* ───── Main Page ───── */

export default function Home() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());

  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [detailTrip, setDetailTrip] = useState<Trip | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, tripsRes, favRes] = await Promise.all([
        fetch("/api/stats").then((r) => r.json()),
        fetch("/api/trips?limit=50").then((r) => r.json()),
        fetch("/api/favorites").then((r) => r.json()),
      ]);
      setStats(statsRes);
      setTrips(tripsRes.items || []);
      setFavoriteIds(new Set((favRes || []).map((f: { id: string }) => f.id)));
    } catch (err) {
      console.error("데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: string) => {
    if (!confirm("이 여행 기록을 삭제하시겠습니까?")) return;
    await fetch(`/api/trips/${id}`, { method: "DELETE" });
    loadData();
  };

  const handleToggleFavorite = async (tripId: string) => {
    const isFav = favoriteIds.has(tripId);
    if (isFav) {
      await fetch("/api/favorites", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trip_id: tripId }) });
      setFavoriteIds(prev => { const n = new Set(prev); n.delete(tripId); return n; });
    } else {
      await fetch("/api/favorites", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trip_id: tripId }) });
      setFavoriteIds(prev => new Set(prev).add(tripId));
    }
  };

  const handleTripClick = (trip: Trip) => {
    setDetailTrip(trip);
  };

  const refreshDetail = async () => {
    if (!detailTrip) return;
    const res = await fetch(`/api/trips/${detailTrip.id}`);
    const updated = await res.json();
    setDetailTrip(updated);
    loadData();
  };

  if (loading && !stats) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const upcoming = stats?.upcoming?.[0];
  const daysUntil = upcoming
    ? Math.ceil((new Date(upcoming.start_date).getTime() - Date.now()) / 86400000)
    : 0;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-sm text-muted">다시 오신 것을 환영합니다</p>
          <h1 className="text-2xl font-bold text-foreground mt-0.5">나의 여행 일지</h1>
        </div>
        <button onClick={() => { setEditingTrip(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors self-start sm:self-auto">
          <Plus size={15} /> 새 여행
        </button>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "방문 국가", value: stats?.totalCountries || 0, icon: Flag, color: "bg-primary/10 text-primary" },
          { label: "방문 도시", value: stats?.totalCities || 0, icon: MapPin, color: "bg-accent/10 text-accent" },
          { label: "총 여행", value: stats?.totalTrips || 0, icon: Plane, color: "bg-violet-100 text-violet-600" },
          { label: "사진", value: stats?.totalPhotos || 0, icon: Camera, color: "bg-rose-100 text-rose-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card-bg rounded-2xl border border-card-border p-4 sm:p-5">
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 다음 여행 배너 */}
      {upcoming && daysUntil > 0 && (
        <div className="relative bg-gradient-to-r from-primary-dark via-primary to-primary-light rounded-2xl p-5 sm:p-6 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 opacity-10">
            <Plane size={160} className="-rotate-45" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70 mb-1">다음 여행</p>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <div>
              <h2 className="text-xl font-bold">{upcoming.city}, {upcoming.country}</h2>
              <p className="text-white/70 text-sm">{upcoming.start_date} — {upcoming.end_date}</p>
            </div>
            <div className="flex items-center gap-4 sm:ml-auto">
              <div className="px-3 py-1.5 bg-white/20 rounded-lg backdrop-blur-sm text-center">
                <p className="text-lg font-bold">{daysUntil}</p>
                <p className="text-[10px] text-white/70">일 남음</p>
              </div>
              {upcoming.notes && <p className="text-sm text-white/80 max-w-xs">{upcoming.notes}</p>}
            </div>
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {trips.length === 0 && !loading && (
        <div className="bg-card-bg rounded-2xl border border-card-border p-12 text-center">
          <Plane size={48} className="mx-auto text-gray-300 -rotate-45 mb-4" />
          <h2 className="font-bold text-foreground text-lg mb-2">아직 여행 기록이 없습니다</h2>
          <p className="text-sm text-muted mb-4">첫 번째 여행을 기록해보세요!</p>
          <button onClick={() => { setEditingTrip(null); setShowForm(true); }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark">
            <Plus size={15} /> 새 여행
          </button>
        </div>
      )}

      {/* 최근 여행 */}
      {trips.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-foreground">최근 여행</h2>
            <span className="text-xs text-muted">{trips.length}개의 여행</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((trip) => (
              <div key={trip.id} onClick={() => handleTripClick(trip)} className="cursor-pointer">
                <TripCard
                  trip={trip}
                  onEdit={() => { setEditingTrip(trip); setShowForm(true); }}
                  onDelete={() => handleDelete(trip.id)}
                  isFavorite={favoriteIds.has(trip.id)}
                  onToggleFavorite={() => handleToggleFavorite(trip.id)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 하단 영역 */}
      {stats && stats.totalTrips > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 방��� 국가 */}
          <div className="bg-card-bg rounded-2xl border border-card-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">방문 국가</h2>
              <span className="text-xs text-muted">{stats.totalCountries}개국</span>
            </div>
            <div className="space-y-2.5">
              {stats.countries.map((c) => (
                <div key={c.country} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{c.country}</p>
                    <p className="text-[10px] text-muted">최근: {c.last_visit}</p>
                  </div>
                  <span className="text-xs font-semibold text-muted bg-gray-100 px-2 py-0.5 rounded-full">
                    {c.visits}회
                  </span>
                </div>
              ))}
              {stats.countries.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">데이터가 없습니다</p>
              )}
            </div>
          </div>

          {/* 여행 빈도 */}
          <div className="bg-card-bg rounded-2xl border border-card-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">여행 빈도</h2>
              <span className="flex items-center gap-1 text-xs text-success font-medium">
                <TrendingUp size={12} /> {new Date().getFullYear()}년
              </span>
            </div>
            <MiniBarChart data={stats.monthlyTrips} />
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-card-border">
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{stats.totalTrips}</p>
                <p className="text-[10px] text-muted">총 여행</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{stats.totalDays}</p>
                <p className="text-[10px] text-muted">총 일수</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{stats.avgDays}</p>
                <p className="text-[10px] text-muted">평균 일수</p>
              </div>
            </div>
          </div>

          {/* 타임라인 */}
          <div className="bg-card-bg rounded-2xl border border-card-border p-5">
            <h2 className="font-semibold text-foreground mb-4">타임라인</h2>
            <div className="space-y-4">
              {stats.timeline.map((t, i) => (
                <div key={t.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-2.5 h-2.5 rounded-full ${timelineDotColors[i % timelineDotColors.length]} mt-1`} />
                    {i < stats.timeline.length - 1 && <div className="w-px flex-1 bg-card-border mt-1" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-[10px] font-semibold text-muted uppercase tracking-wide">
                      {t.start_date.slice(0, 7)}
                    </p>
                    <p className="text-sm text-foreground mt-0.5">
                      {t.city}, {t.country} — {t.days}일
                    </p>
                  </div>
                </div>
              ))}
              {stats.timeline.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">아직 여행 기록이 없습니다</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 모달 */}
      {showForm && (
        <TripFormModal
          trip={editingTrip}
          onClose={() => { setShowForm(false); setEditingTrip(null); }}
          onSaved={loadData}
        />
      )}

      {detailTrip && (
        <TripDetailModal
          trip={detailTrip}
          onClose={() => setDetailTrip(null)}
          onEdit={() => { setDetailTrip(null); setEditingTrip(detailTrip); setShowForm(true); }}
          onRefresh={refreshDetail}
        />
      )}
    </div>
  );
}
