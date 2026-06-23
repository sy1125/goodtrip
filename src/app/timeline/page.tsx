"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar, Clock, MapPin, Camera, ChevronDown, ChevronUp,
  Image as ImageIcon, Plane, X, ChevronLeft, ChevronRight, Trash2,
} from "lucide-react";

/* ───── Types ───── */

interface Photo {
  id: number;
  file_path: string;
  caption: string | null;
}

interface Destination {
  city: string;
  country: string;
  start_date?: string;
  end_date?: string;
}

interface Trip {
  id: string;
  city: string;
  country: string;
  destinations: Destination[];
  start_date: string;
  end_date: string;
  cover_image: string | null;
  notes: string | null;
  photos: Photo[];
}

/* ───── Helpers ───── */

const getDays = (s: string, e: string) =>
  Math.ceil((new Date(e).getTime() - new Date(s).getTime()) / 86400000) + 1;

function tripLabel(trip: Trip): { cities: string; countries: string } {
  const dests = trip.destinations || [];
  if (dests.length === 0) {
    return { cities: trip.city || "", countries: trip.country || "" };
  }
  const cities = [...new Set(dests.map(d => d.city))].join(", ");
  const countries = [...new Set(dests.map(d => d.country))].join(", ");
  return { cities, countries };
}

const dotColors = [
  "bg-primary", "bg-accent", "bg-emerald-500", "bg-violet-500",
  "bg-rose-500", "bg-sky-500", "bg-amber-500", "bg-indigo-500",
];

const lineColors = [
  "from-primary/40", "from-accent/40", "from-emerald-500/40", "from-violet-500/40",
  "from-rose-500/40", "from-sky-500/40", "from-amber-500/40", "from-indigo-500/40",
];

function groupByYear(trips: Trip[]): Record<string, Trip[]> {
  const groups: Record<string, Trip[]> = {};
  for (const trip of trips) {
    const year = trip.start_date.slice(0, 4);
    if (!groups[year]) groups[year] = [];
    groups[year].push(trip);
  }
  return groups;
}

/* ───── Trip Detail Modal ───── */

function TripDetailModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const days = getDays(trip.start_date, trip.end_date);

  const allImages = [
    ...(trip.cover_image ? [{ file_path: trip.cover_image }] : []),
    ...trip.photos,
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* 커버 */}
        <div className="relative h-56 bg-gray-100">
          {trip.cover_image ? (
            <img src={trip.cover_image} alt={tripLabel(trip).cities} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon size={64} /></div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50">
            <X size={16} />
          </button>
          <div className="absolute bottom-4 left-6">
            <h2 className="text-2xl font-bold text-white">{tripLabel(trip).cities}</h2>
            <p className="text-white/70 text-sm">{tripLabel(trip).countries}</p>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* 여행 정보 */}
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {trip.start_date} — {trip.end_date}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> {days}일</span>
            {trip.photos.length > 0 && (
              <span className="flex items-center gap-1.5"><Camera size={14} /> {trip.photos.length}장</span>
            )}
          </div>

          {/* 여행 일정 */}
          {trip.destinations && trip.destinations.length > 1 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted">여행 일정</p>
              {trip.destinations.map((d, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted">
                  <span className="w-4 text-center text-[10px] font-semibold text-primary">{i + 1}</span>
                  <span className="font-medium text-foreground">{d.city}</span>
                  <span className="text-muted">{d.country}</span>
                  {d.start_date && d.end_date && (
                    <span className="ml-auto text-[10px]">{d.start_date} ~ {d.end_date}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 메모 */}
          {trip.notes && (
            <div>
              <p className="text-xs font-medium text-muted mb-1">메모</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{trip.notes}</p>
            </div>
          )}

          {/* 사진 갤러리 */}
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

/* ───── Timeline Card ───── */

function TimelineCard({ trip, index, isLeft, onClick }: { trip: Trip; index: number; isLeft: boolean; onClick: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const days = getDays(trip.start_date, trip.end_date);
  const colorIdx = index % dotColors.length;

  return (
    <div className={`relative flex ${isLeft ? "lg:flex-row-reverse" : ""} gap-4 lg:gap-8`}>
      {/* 도트 & 라인 (모바일에서는 왼쪽 고정) */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={`w-4 h-4 rounded-full ${dotColors[colorIdx]} ring-4 ring-white shadow-sm z-10`} />
        <div className={`w-0.5 flex-1 bg-gradient-to-b ${lineColors[colorIdx]} to-transparent`} />
      </div>

      {/* 카드 */}
      <div className="flex-1 pb-8 lg:pb-12">
        <div onClick={onClick} className="bg-card-bg rounded-2xl border border-card-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
          {/* 커버 이미지 */}
          {trip.cover_image && (
            <div className="relative h-36 sm:h-44 overflow-hidden">
              <img src={trip.cover_image} alt={tripLabel(trip).cities} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <h3 className="text-white font-bold text-lg">{tripLabel(trip).cities}</h3>
                <p className="text-white/70 text-xs">{tripLabel(trip).countries}</p>
              </div>
            </div>
          )}

          <div className="p-4">
            {/* 커버가 없을 때 제목 표시 */}
            {!trip.cover_image && (
              <div className="mb-3">
                <h3 className="font-bold text-foreground text-lg">{tripLabel(trip).cities}</h3>
                <p className="text-xs text-muted">{tripLabel(trip).countries}</p>
              </div>
            )}

            {/* 날짜 정보 */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="flex items-center gap-1">
                <Calendar size={12} /> {trip.start_date} — {trip.end_date}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} /> {days}일
              </span>
              {trip.photos.length > 0 && (
                <span className="flex items-center gap-1">
                  <Camera size={12} /> {trip.photos.length}장
                </span>
              )}
            </div>

            {/* 메모 (접기/펼치기) */}
            {trip.notes && (
              <div className="mt-3">
                <p className={`text-sm text-foreground leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
                  {trip.notes}
                </p>
                {trip.notes.length > 80 && (
                  <button onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-0.5 mt-1 text-xs text-primary hover:text-primary-dark font-medium">
                    {expanded ? <><ChevronUp size={12} /> 접기</> : <><ChevronDown size={12} /> 더보기</>}
                  </button>
                )}
              </div>
            )}

            {/* 사진 미리보기 */}
            {trip.photos.length > 0 && (
              <div className="flex gap-1.5 mt-3 overflow-x-auto">
                {trip.photos.slice(0, 5).map((photo) => (
                  <div key={photo.id} className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                    <img src={photo.file_path} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
                {trip.photos.length > 5 && (
                  <div className="w-14 h-14 rounded-lg flex-shrink-0 bg-gray-100 flex items-center justify-center text-xs text-muted font-medium">
                    +{trip.photos.length - 5}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───── Main Page ───── */

export default function TimelinePage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");
  const [detailTrip, setDetailTrip] = useState<Trip | null>(null);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/trips?limit=200&sort=start_date&order=${sortOrder}`);
      const data = await res.json();
      setTrips(data.items || []);
    } catch (err) {
      console.error("타임라인 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, [sortOrder]);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const grouped = groupByYear(trips);
  const years = Object.keys(grouped).sort((a, b) =>
    sortOrder === "DESC" ? Number(b) - Number(a) : Number(a) - Number(b)
  );

  // 통계
  const totalDays = trips.reduce((sum, t) => sum + getDays(t.start_date, t.end_date), 0);
  const totalCountries = new Set(trips.flatMap(t => (t.destinations || []).map(d => d.country))).size;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">타임라인</h1>
          <p className="text-sm text-muted mt-0.5">
            {trips.length}개의 여행 · {totalCountries}개국 · 총 {totalDays}일
          </p>
        </div>
        <button
          onClick={() => setSortOrder(sortOrder === "DESC" ? "ASC" : "DESC")}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-card-border rounded-xl text-muted hover:text-foreground hover:border-gray-400 self-start sm:self-auto"
        >
          <Calendar size={14} />
          {sortOrder === "DESC" ? "최신순" : "오래된순"}
        </button>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && trips.length === 0 && (
        <div className="bg-card-bg rounded-2xl border border-card-border p-12 text-center">
          <Plane size={48} className="mx-auto text-gray-300 -rotate-45 mb-4" />
          <h2 className="font-bold text-foreground text-lg mb-2">아직 여행 기록이 없습니다</h2>
          <p className="text-sm text-muted">여행을 기록하면 타임라인에 표시됩니다.</p>
        </div>
      )}

      {/* 타임라인 */}
      {!loading && years.map((year) => (
        <div key={year}>
          {/* 연도 배지 */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-2 px-4 py-2 bg-card-bg border border-card-border rounded-full shadow-sm">
              <Calendar size={14} className="text-primary" />
              <span className="font-bold text-foreground">{year}</span>
              <span className="text-xs text-muted">{grouped[year].length}개 여행</span>
            </div>
            <div className="flex-1 h-px bg-card-border" />
          </div>

          {/* 타임라인 아이템 */}
          <div className="ml-2 lg:ml-0">
            {grouped[year].map((trip, i) => (
              <TimelineCard
                key={trip.id}
                trip={trip}
                index={i}
                isLeft={i % 2 === 1}
                onClick={() => setDetailTrip(trip)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* 상세 모달 */}
      {detailTrip && (
        <TripDetailModal trip={detailTrip} onClose={() => setDetailTrip(null)} />
      )}
    </div>
  );
}
