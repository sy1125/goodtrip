"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Search, SlidersHorizontal, Calendar, Clock, Camera,
  MapPin, Plus, X, Upload, Edit3, Trash2,
  ChevronLeft, ChevronRight, Image as ImageIcon,
  ArrowUpDown, Loader2,
} from "lucide-react";

/* ───── Types ───── */

interface Photo {
  id: number;
  file_path: string;
  caption: string | null;
}

interface Trip {
  id: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  notes: string | null;
  photos: Photo[];
}

interface GeoSuggestion {
  display_name: string;
  lat: number;
  lng: number;
  city: string;
  country: string;
}

/* ───── Autocomplete Input ───── */

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
      if (query.length < 2) { setSuggestions([]); return; }
      setSearching(true);
      try {
        const q = extraQuery ? `${query}, ${extraQuery}` : query;
        const res = await fetch(`/api/geocode/search?q=${encodeURIComponent(q)}&type=${searchType}`);
        const data: GeoSuggestion[] = await res.json();
        setSuggestions(data);
      } catch { setSuggestions([]); }
      finally { setSearching(false); }
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

  const handleSelect = (s: GeoSuggestion) => {
    if (searchType === "country") {
      onChange(s.country || s.display_name.split(",").pop()?.trim() || s.display_name);
    } else {
      onChange(s.city || s.display_name.split(",")[0]?.trim() || value);
    }
    setShowSuggestions(false);
    setSuggestions([]);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-medium text-muted block mb-1.5">{label} {required && "*"}</label>
      <div className="relative">
        <input type="text" value={value} onChange={handleChange}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-8 text-sm border border-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none">
          {searching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        </div>
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-card-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button key={i} type="button" onClick={() => handleSelect(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start gap-2">
              <MapPin size={12} className="text-primary mt-0.5 flex-shrink-0" />
              <span className="text-foreground line-clamp-1">{s.display_name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ───── Trip Form Modal ───── */

function TripFormModal({ trip, onClose, onSaved }: { trip: Trip | null; onClose: () => void; onSaved: () => void }) {
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
    setImageFiles(prev => [...prev, ...files]);
    setImagePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const handleRemoveImage = (index: number) => {
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    const existingCount = trip?.cover_image ? 1 + (trip.photos?.length || 0) : (trip?.photos?.length || 0);
    if (index >= existingCount) {
      setImageFiles(prev => prev.filter((_, i) => i !== (index - existingCount)));
    }
  };

  const handleSubmit = async () => {
    if (!city || !country || !startDate || !endDate) { alert("도시, 국가, 시작일, 종료일은 필수입니다."); return; }
    setSaving(true);
    try {
      const uploadedPaths: string[] = [];
      for (const file of imageFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: formData });
        const data = await res.json();
        uploadedPaths.push(data.path);
      }

      const existingCount = trip?.cover_image ? 1 + (trip.photos?.length || 0) : (trip?.photos?.length || 0);
      const existingPaths = trip?.cover_image ? [trip.cover_image, ...(trip.photos?.map(p => p.file_path) || [])] : (trip?.photos?.map(p => p.file_path) || []);

      const allPaths: string[] = [];
      let newIdx = 0;
      for (let i = 0; i < imagePreviews.length; i++) {
        if (i < existingCount && existingPaths.includes(imagePreviews[i])) {
          allPaths.push(imagePreviews[i]);
        } else {
          if (newIdx < uploadedPaths.length) { allPaths.push(uploadedPaths[newIdx]); newIdx++; }
        }
      }

      const body = {
        city, country, start_date: startDate, end_date: endDate,
        cover_image: allPaths[0] || null, notes: notes || null,
        photo_paths: allPaths.slice(1),
      };

      if (trip) {
        await fetch(`/api/trips/${trip.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      } else {
        await fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      }
      onSaved();
      onClose();
    } catch { alert("저장에 실패했습니다."); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-card-border">
          <h2 className="text-lg font-bold text-foreground">{trip ? "여행 수정" : "새 여행 기록"}</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* 이미지 */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">
              사진 <span className="text-gray-400 font-normal">(첫 번째 = 커버)</span>
            </label>
            {imagePreviews.length > 0 ? (
              <div className="space-y-2">
                <div className="relative h-36 rounded-xl overflow-hidden bg-gray-100">
                  <img src={imagePreviews[0]} alt="" className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-semibold bg-primary text-white rounded-full">커버</span>
                  <button type="button" onClick={() => handleRemoveImage(0)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500"><X size={12} /></button>
                </div>
                {imagePreviews.length > 1 && (
                  <div className="flex gap-2 flex-wrap">
                    {imagePreviews.slice(1).map((src, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden bg-gray-100">
                        <img src={src} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => handleRemoveImage(i + 1)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-red-500"><X size={10} /></button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="flex items-center justify-center gap-1.5 py-2 border border-dashed border-gray-300 rounded-xl text-xs text-gray-400 hover:text-gray-600 hover:border-gray-400 cursor-pointer">
                  <Plus size={14} /> 사진 추가
                  <input type="file" accept="image/*" multiple onChange={handleImagesChange} className="hidden" />
                </label>
              </div>
            ) : (
              <label className="h-36 rounded-xl bg-gray-100 border border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:text-gray-600 hover:border-gray-400">
                <Upload size={24} />
                <p className="text-xs mt-1">클릭하여 사진 업로드</p>
                <input type="file" accept="image/*" multiple onChange={handleImagesChange} className="hidden" />
              </label>
            )}
          </div>

          <AutocompleteInput value={country} onChange={setCountry} placeholder="예: 일본, 프랑스" label="국가" required searchType="country" />
          <AutocompleteInput value={city} onChange={setCity} placeholder="예: 도쿄, 파리" label="도시" required searchType="city" extraQuery={country} />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted block mb-1.5">시작일 *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted block mb-1.5">종료일 *</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1.5">메모</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-card-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="여행에 대한 메모..." />
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-card-border">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-muted bg-gray-100 rounded-xl hover:bg-gray-200">취소</button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark disabled:opacity-50">
            {saving ? "저장 중..." : trip ? "수정" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───── Trip Detail Modal ───── */

function TripDetailModal({ trip, onClose, onEdit, onRefresh }: { trip: Trip; onClose: () => void; onEdit: () => void; onRefresh: () => void }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const days = Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000) + 1;

  const handleDeletePhoto = async (photoId: number) => {
    if (!confirm("이 사진을 삭제하시겠습니까?")) return;
    await fetch(`/api/trips/${trip.id}/photos?photoId=${photoId}`, { method: "DELETE" });
    onRefresh();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="relative h-56 bg-gray-100">
          {trip.cover_image ? (
            <img src={trip.cover_image} alt={trip.city} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={64} /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50"><X size={16} /></button>
          <div className="absolute bottom-4 left-6">
            <h2 className="text-2xl font-bold text-white">{trip.city}</h2>
            <p className="text-white/70 text-sm">{trip.country}</p>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {trip.start_date} — {trip.end_date}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> {days}일</span>
          </div>
          {trip.notes && (
            <div>
              <p className="text-xs font-medium text-muted mb-1">메모</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{trip.notes}</p>
            </div>
          )}
          {/* 사진 */}
          {trip.photos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted mb-3">사진 ({trip.photos.length})</p>
              <div className="relative h-48 sm:h-64 rounded-xl overflow-hidden bg-gray-100 mb-2">
                <img src={trip.photos[photoIndex]?.file_path} alt="" className="w-full h-full object-cover" />
                <button onClick={() => handleDeletePhoto(trip.photos[photoIndex].id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-red-500"><Trash2 size={12} /></button>
                {trip.photos.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIndex(p => (p - 1 + trip.photos.length) % trip.photos.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50"><ChevronLeft size={16} /></button>
                    <button onClick={() => setPhotoIndex(p => (p + 1) % trip.photos.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50"><ChevronRight size={16} /></button>
                  </>
                )}
                <span className="absolute bottom-2 right-2 px-2 py-0.5 text-xs bg-black/50 text-white rounded-full">{photoIndex + 1} / {trip.photos.length}</span>
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
          )}
          <button onClick={onEdit}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-foreground bg-gray-100 rounded-xl hover:bg-gray-200">
            <Edit3 size={14} /> 여행 수정
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───── Main Page ───── */

type ViewMode = "grid" | "list";
type SortField = "start_date" | "city" | "country";
type SortOrder = "DESC" | "ASC";

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("start_date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("DESC");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(0);
  const limit = 12;

  // Modals
  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [detailTrip, setDetailTrip] = useState<Trip | null>(null);

  const [showFilters, setShowFilters] = useState(false);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(page * limit),
        sort: sortField,
        order: sortOrder,
        search,
      });
      const res = await fetch(`/api/trips?${params}`);
      const data = await res.json();
      setTrips(data.items || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error("로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [page, sortField, sortOrder, search]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const handleDelete = async (id: string) => {
    if (!confirm("이 여행 기록을 삭제하시겠습니까?")) return;
    await fetch(`/api/trips/${id}`, { method: "DELETE" });
    loadTrips();
  };

  const refreshDetail = async () => {
    if (!detailTrip) return;
    const res = await fetch(`/api/trips/${detailTrip.id}`);
    const updated = await res.json();
    setDetailTrip(updated);
    loadTrips();
  };

  const totalPages = Math.ceil(total / limit);
  const getDays = (s: string, e: string) => Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1;

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">여행 기록</h1>
          <p className="text-sm text-muted mt-0.5">총 {total}개의 여행</p>
        </div>
        <button onClick={() => { setEditingTrip(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark self-start sm:self-auto">
          <Plus size={15} /> 새 여행
        </button>
      </div>

      {/* 검색 & 필터 바 */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="도시, 국가, 메모로 검색..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-card-border rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border rounded-xl transition-colors ${showFilters ? "border-primary bg-primary/5 text-primary" : "border-card-border text-muted hover:border-gray-400"}`}>
            <SlidersHorizontal size={14} /> 필터
          </button>
          <button onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm border border-card-border rounded-xl text-muted hover:border-gray-400">
            {viewMode === "grid" ? "목록" : "그리드"}
          </button>
        </div>
      </div>

      {/* 필터 패널 */}
      {showFilters && (
        <div className="bg-card-bg border border-card-border rounded-xl p-4 flex flex-wrap gap-4 items-end">
          <div>
            <label className="text-xs font-medium text-muted block mb-1">정렬 기준</label>
            <select value={sortField} onChange={(e) => { setSortField(e.target.value as SortField); setPage(0); }}
              className="px-3 py-2 text-sm border border-card-border rounded-lg bg-white">
              <option value="start_date">날짜</option>
              <option value="city">도시</option>
              <option value="country">국가</option>
            </select>
          </div>
          <button onClick={() => { setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC"); setPage(0); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-card-border rounded-lg text-muted hover:text-foreground">
            <ArrowUpDown size={14} /> {sortOrder === "DESC" ? "최신순" : "오래된순"}
          </button>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && trips.length === 0 && (
        <div className="bg-card-bg rounded-2xl border border-card-border p-12 text-center">
          <MapPin size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="font-bold text-foreground text-lg mb-2">
            {search ? "검색 결과가 없습니다" : "아직 여행 기록이 없습니다"}
          </h2>
          <p className="text-sm text-muted mb-4">
            {search ? "다른 검색어를 시도해보세요" : "첫 번째 여행을 기록해보세요!"}
          </p>
          {!search && (
            <button onClick={() => { setEditingTrip(null); setShowForm(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark">
              <Plus size={15} /> 새 여행
            </button>
          )}
        </div>
      )}

      {/* 그리드 뷰 */}
      {!loading && trips.length > 0 && viewMode === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip) => {
            const days = getDays(trip.start_date, trip.end_date);
            return (
              <div key={trip.id} onClick={() => setDetailTrip(trip)}
                className="group cursor-pointer bg-card-bg rounded-2xl border border-card-border overflow-hidden hover:shadow-lg transition-all">
                <div className="relative h-44 overflow-hidden bg-gray-100">
                  {trip.cover_image ? (
                    <img src={trip.cover_image} alt={trip.city} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={48} /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-white font-bold text-lg leading-tight">{trip.city}</h3>
                    <p className="text-white/70 text-xs">{trip.country}</p>
                  </div>
                  <div className="absolute top-3 left-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.stopPropagation(); setEditingTrip(trip); setShowForm(true); }}
                      className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"><Edit3 size={12} className="text-gray-700" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(trip.id); }}
                      className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white"><Trash2 size={12} className="text-red-500" /></button>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1"><Calendar size={12} />{trip.start_date}</span>
                      <span className="flex items-center gap-1"><Clock size={12} />{days}일</span>
                    </div>
                    {trip.photos.length > 0 && (
                      <span className="flex items-center gap-1"><Camera size={11} /> {trip.photos.length}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 리스트 뷰 */}
      {!loading && trips.length > 0 && viewMode === "list" && (
        <div className="bg-card-bg rounded-2xl border border-card-border divide-y divide-card-border">
          {trips.map((trip) => {
            const days = getDays(trip.start_date, trip.end_date);
            return (
              <div key={trip.id} onClick={() => setDetailTrip(trip)}
                className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors group">
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {trip.cover_image ? (
                    <img src={trip.cover_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={20} /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">{trip.city}</h3>
                    <span className="text-xs text-muted">{trip.country}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted mt-1">
                    <span className="flex items-center gap-1"><Calendar size={11} /> {trip.start_date} — {trip.end_date}</span>
                    <span className="flex items-center gap-1"><Clock size={11} /> {days}일</span>
                    {trip.photos.length > 0 && <span className="flex items-center gap-1"><Camera size={11} /> {trip.photos.length}</span>}
                  </div>
                  {trip.notes && <p className="text-xs text-muted mt-1 truncate">{trip.notes}</p>}
                </div>
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => { e.stopPropagation(); setEditingTrip(trip); setShowForm(true); }}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-gray-200"><Edit3 size={13} className="text-gray-600" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(trip.id); }}
                    className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center hover:bg-red-50"><Trash2 size={13} className="text-red-500" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="w-9 h-9 rounded-lg border border-card-border flex items-center justify-center text-muted hover:text-foreground disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)}
              className={`w-9 h-9 rounded-lg text-sm font-medium ${i === page ? "bg-primary text-white" : "border border-card-border text-muted hover:text-foreground"}`}>
              {i + 1}
            </button>
          )).slice(Math.max(0, page - 2), page + 3)}
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="w-9 h-9 rounded-lg border border-card-border flex items-center justify-center text-muted hover:text-foreground disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* 모달 */}
      {showForm && (
        <TripFormModal trip={editingTrip} onClose={() => { setShowForm(false); setEditingTrip(null); }} onSaved={loadTrips} />
      )}
      {detailTrip && (
        <TripDetailModal trip={detailTrip} onClose={() => setDetailTrip(null)}
          onEdit={() => { setDetailTrip(null); setEditingTrip(detailTrip); setShowForm(true); }}
          onRefresh={refreshDetail} />
      )}
    </div>
  );
}
