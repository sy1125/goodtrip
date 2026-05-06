"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Camera, MapPin, Calendar, X, ChevronLeft, ChevronRight,
  Image as ImageIcon, Filter,
} from "lucide-react";

/* ───── Types ───── */

interface GalleryPhoto {
  id?: number;
  file_path: string;
  caption: string | null;
  created_at?: string;
  trip_id: string;
  city: string;
  country: string;
  start_date: string;
  cover_image?: string;
}

/* ───── Lightbox ───── */

function Lightbox({
  photos,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  photos: GalleryPhoto[];
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const photo = photos[index];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center" onClick={onClose}>
      <div className="relative w-full h-full flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        {/* 닫기 */}
        <button onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
          <X size={20} />
        </button>

        {/* 이전 */}
        {photos.length > 1 && (
          <button onClick={onPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <ChevronLeft size={24} />
          </button>
        )}

        {/* 이미지 */}
        <img
          src={photo.file_path}
          alt={photo.city}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
          onClick={onClose}
        />

        {/* 다음 */}
        {photos.length > 1 && (
          <button onClick={onNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20">
            <ChevronRight size={24} />
          </button>
        )}

        {/* 정보 */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm rounded-xl px-5 py-3 text-center">
          <p className="text-white font-semibold">{photo.city}, {photo.country}</p>
          <p className="text-white/60 text-xs mt-0.5 flex items-center justify-center gap-2">
            <span className="flex items-center gap-1"><Calendar size={10} /> {photo.start_date}</span>
            <span>{index + 1} / {photos.length}</span>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ───── Main Page ───── */

export default function GalleryPage() {
  const [allPhotos, setAllPhotos] = useState<GalleryPhoto[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const loadPhotos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCountry) params.set("country", selectedCountry);
      params.set("limit", "200");

      const res = await fetch(`/api/gallery?${params}`);
      const data = await res.json();

      // Merge cover photos and trip photos, deduplicate by file_path
      const seen = new Set<string>();
      const merged: GalleryPhoto[] = [];

      for (const p of data.coverPhotos || []) {
        if (p.file_path && !seen.has(p.file_path as string)) {
          seen.add(p.file_path as string);
          merged.push(p as GalleryPhoto);
        }
      }
      for (const p of data.photos || []) {
        if (p.file_path && !seen.has(p.file_path as string)) {
          seen.add(p.file_path as string);
          merged.push(p as GalleryPhoto);
        }
      }

      setAllPhotos(merged);
      setCountries(data.countries || []);
    } catch (err) {
      console.error("갤러리 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedCountry]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const openLightbox = (index: number) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);
  const prevPhoto = () => setLightboxIndex((i) => i !== null ? (i - 1 + allPhotos.length) % allPhotos.length : null);
  const nextPhoto = () => setLightboxIndex((i) => i !== null ? (i + 1) % allPhotos.length : null);

  // Group photos by trip (city + country + start_date)
  const groupedByTrip = allPhotos.reduce<Record<string, GalleryPhoto[]>>((acc, photo) => {
    const key = `${photo.trip_id}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(photo);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">갤러리</h1>
          <p className="text-sm text-muted mt-0.5">총 {allPhotos.length}장의 사진</p>
        </div>
      </div>

      {/* 필터 */}
      {countries.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-muted" />
          <button
            onClick={() => setSelectedCountry("")}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              !selectedCountry ? "bg-primary text-white" : "bg-gray-100 text-muted hover:bg-gray-200"
            }`}
          >
            전체
          </button>
          {countries.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCountry(c)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                selectedCountry === c ? "bg-primary text-white" : "bg-gray-100 text-muted hover:bg-gray-200"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && allPhotos.length === 0 && (
        <div className="bg-card-bg rounded-2xl border border-card-border p-12 text-center">
          <Camera size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="font-bold text-foreground text-lg mb-2">아직 사진이 없습니다</h2>
          <p className="text-sm text-muted">여행을 기록하고 사진을 업로드해보세요!</p>
        </div>
      )}

      {/* 여행별 그룹 갤러리 */}
      {!loading && allPhotos.length > 0 && (
        <div className="space-y-8">
          {Object.entries(groupedByTrip).map(([tripId, photos]) => {
            const first = photos[0];
            return (
              <div key={tripId}>
                {/* 여행 제목 */}
                <div className="flex items-center gap-2 mb-3">
                  <MapPin size={14} className="text-primary" />
                  <h2 className="font-semibold text-foreground">{first.city}, {first.country}</h2>
                  <span className="text-xs text-muted flex items-center gap-1">
                    <Calendar size={10} /> {first.start_date}
                  </span>
                  <span className="text-xs text-muted">· {photos.length}장</span>
                </div>

                {/* 사진 그리드 — Masonry 스타일 */}
                <div className="grid grid-cols-5 gap-2">
                  {photos.map((photo, i) => {
                    const globalIndex = allPhotos.findIndex(p => p.file_path === photo.file_path);
                    return (
                      <div
                        key={photo.file_path + i}
                        onClick={() => openLightbox(globalIndex)}
                        className="relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer group"
                        style={{ aspectRatio: "1" }}
                      >
                        <img
                          src={photo.file_path}
                          alt={photo.city}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 라이트박스 */}
      {lightboxIndex !== null && (
        <Lightbox
          photos={allPhotos}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={prevPhoto}
          onNext={nextPhoto}
        />
      )}
    </div>
  );
}
