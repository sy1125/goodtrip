"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Heart, Calendar, Clock, Camera, MapPin,
  X, ChevronLeft, ChevronRight, Image as ImageIcon, Trash2,
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
  favorited_at?: string;
}

/* ───── Detail Modal ───── */

function TripDetailModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const days = Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000) + 1;

  const allImages = [
    ...(trip.cover_image ? [{ file_path: trip.cover_image }] : []),
    ...trip.photos,
  ];

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
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50">
            <X size={16} />
          </button>
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
          {allImages.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted mb-3">사진 ({allImages.length})</p>
              <div className="relative h-48 sm:h-64 rounded-xl overflow-hidden bg-gray-100 mb-2">
                <img src={allImages[photoIndex]?.file_path} alt="" className="w-full h-full object-cover" />
                {allImages.length > 1 && (
                  <>
                    <button onClick={() => setPhotoIndex(p => (p - 1 + allImages.length) % allImages.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50">
                      <ChevronLeft size={16} />
                    </button>
                    <button onClick={() => setPhotoIndex(p => (p + 1) % allImages.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50">
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}
                <span className="absolute bottom-2 right-2 px-2 py-0.5 text-xs bg-black/50 text-white rounded-full">
                  {photoIndex + 1} / {allImages.length}
                </span>
              </div>
              {allImages.length > 1 && (
                <div className="flex gap-1.5 overflow-x-auto">
                  {allImages.map((img, i) => (
                    <button key={i} onClick={() => setPhotoIndex(i)}
                      className={`w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border-2 ${i === photoIndex ? "border-primary" : "border-transparent"}`}>
                      <img src={img.file_path} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───── Main Page ───── */

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailTrip, setDetailTrip] = useState<Trip | null>(null);

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/favorites");
      const data = await res.json();
      setFavorites(data);
    } catch (err) {
      console.error("즐겨찾기 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  const handleRemoveFavorite = async (tripId: string) => {
    await fetch("/api/favorites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trip_id: tripId }),
    });
    setFavorites(prev => prev.filter(f => f.id !== tripId));
  };

  const getDays = (s: string, e: string) => Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1;

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">즐겨찾기</h1>
        <p className="text-sm text-muted mt-0.5">
          {favorites.length > 0 ? `${favorites.length}개의 즐겨찾기한 여행` : "좋아하는 여행을 즐겨찾기에 추가해보세요"}
        </p>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && favorites.length === 0 && (
        <div className="bg-card-bg rounded-2xl border border-card-border p-12 text-center">
          <Heart size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="font-bold text-foreground text-lg mb-2">즐겨찾기가 비어있습니다</h2>
          <p className="text-sm text-muted">여행 기록에서 하트를 눌러 즐겨찾기에 추가하세요.</p>
        </div>
      )}

      {/* 즐겨찾기 그리드 */}
      {!loading && favorites.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {favorites.map((trip) => {
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
                  {/* 즐겨찾기 해제 버튼 */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemoveFavorite(trip.id); }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 flex items-center justify-center hover:bg-white shadow-sm"
                  >
                    <Heart size={14} className="text-rose-500 fill-rose-500" />
                  </button>
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
                  {trip.notes && (
                    <p className="text-xs text-muted mt-2 line-clamp-2">{trip.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 상세 모달 */}
      {detailTrip && (
        <TripDetailModal trip={detailTrip} onClose={() => setDetailTrip(null)} />
      )}
    </div>
  );
}
