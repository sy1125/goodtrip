"use client";

import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, MapPin, PlaneTakeoff, X, Calendar, Clock, Camera, Image as ImageIcon } from "lucide-react";

interface Trip {
  id: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  upcoming?: boolean;
  notes?: string | null;
  photos?: { id: number; file_path: string; caption: string | null }[];
}

const DAY_NAMES = ["일", "월", "화", "수", "목", "금", "토"];
const TRIP_COLORS = [
  "bg-primary/20 text-primary border-primary/30",
  "bg-accent/20 text-accent border-accent/30",
  "bg-emerald-100 text-emerald-700 border-emerald-300",
  "bg-violet-100 text-violet-700 border-violet-300",
  "bg-rose-100 text-rose-700 border-rose-300",
  "bg-sky-100 text-sky-700 border-sky-300",
  "bg-amber-100 text-amber-700 border-amber-300",
  "bg-lime-100 text-lime-700 border-lime-300",
];

const UPCOMING_COLOR = "bg-orange-100 text-orange-700 border-orange-300 border-dashed";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function formatDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function isDateInRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
}

function TripDetailModal({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const days = Math.ceil(
    (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86400000
  ) + 1;

  const photos = trip.photos || [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* 커버 */}
        <div className="relative h-48 bg-gray-100">
          {trip.cover_image ? (
            <img src={trip.cover_image} alt={trip.city} className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center ${trip.upcoming ? "bg-orange-50" : ""}`}>
              {trip.upcoming ? (
                <PlaneTakeoff size={48} className="text-orange-300" />
              ) : (
                <ImageIcon size={48} className="text-gray-300" />
              )}
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center hover:bg-black/50">
            <X size={16} />
          </button>
          <div className="absolute bottom-4 left-5">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white">{trip.city}</h2>
              {trip.upcoming && (
                <span className="text-[10px] font-semibold text-orange-200 bg-orange-500/40 px-2 py-0.5 rounded-full backdrop-blur-sm">예정된 여행</span>
              )}
            </div>
            <p className="text-white/70 text-sm">{trip.country}</p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* 여행 정보 */}
          <div className="flex flex-wrap gap-4 text-sm text-muted">
            <span className="flex items-center gap-1.5"><Calendar size={14} /> {trip.start_date} — {trip.end_date}</span>
            <span className="flex items-center gap-1.5"><Clock size={14} /> {days}일</span>
            {photos.length > 0 && (
              <span className="flex items-center gap-1.5"><Camera size={14} /> {photos.length}장</span>
            )}
          </div>

          {/* 메모 */}
          {trip.notes && (
            <div>
              <p className="text-xs font-medium text-muted mb-1">메모</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{trip.notes}</p>
            </div>
          )}

          {/* 사진 */}
          {photos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted mb-2">사진</p>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) => (
                  <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                    <img src={photo.file_path} alt={photo.caption || ""} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [modalTrip, setModalTrip] = useState<Trip | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadTrips = useCallback(async () => {
    try {
      const [tripsRes, upcomingRes] = await Promise.all([
        fetch("/api/trips?limit=500&sort=start_date&order=ASC").then((r) => r.json()),
        fetch("/api/upcoming").then((r) => r.json()),
      ]);
      const pastTrips: Trip[] = (tripsRes.items || []).map((t: Trip) => ({ ...t, upcoming: false }));
      const upcomingTrips: Trip[] = (upcomingRes || []).map((t: Trip) => ({ ...t, upcoming: true, cover_image: null }));
      setTrips([...pastTrips, ...upcomingTrips]);
    } catch (err) {
      console.error("여행 데이터 로드 실패:", err);
    }
  }, []);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const prevMonth = () => {
    if (month === 0) { setYear(year - 1); setMonth(11); }
    else setMonth(month - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setYear(year + 1); setMonth(0); }
    else setMonth(month + 1);
  };

  const goToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  // 각 여행에 색상 인덱스 부여
  const tripColorMap = new Map<string, string>();
  let colorIdx = 0;
  trips.forEach((trip) => {
    if (trip.upcoming) {
      tripColorMap.set(trip.id, UPCOMING_COLOR);
    } else {
      tripColorMap.set(trip.id, TRIP_COLORS[colorIdx % TRIP_COLORS.length]);
      colorIdx++;
    }
  });

  // 해당 날짜에 걸치는 여행 목록
  const getTripsForDate = (dateStr: string) => {
    return trips.filter((t) => isDateInRange(dateStr, t.start_date, t.end_date));
  };

  // 선택된 날짜의 여행
  const selectedTrips = selectedDate ? getTripsForDate(selectedDate) : [];

  const handleTripClick = async (trip: Trip) => {
    if (trip.upcoming) {
      setModalTrip(trip);
      return;
    }
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`);
      const detail = await res.json();
      setModalTrip({ ...detail, upcoming: false });
    } catch {
      setModalTrip(trip);
    } finally {
      setLoadingDetail(false);
    }
  };

  // 달력 셀 생성
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <p className="text-sm text-muted">여행 일정을 한눈에</p>
        <h1 className="text-2xl font-bold text-foreground mt-0.5">캘린더</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* 캘린더 */}
        <div className="flex-1 bg-card-bg rounded-2xl border border-card-border p-4 sm:p-6">
          {/* 월 네비게이션 */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-foreground">
                {year}년 {month + 1}월
              </h2>
              <button onClick={goToday} className="px-2.5 py-1 text-xs font-medium text-primary bg-primary/10 rounded-lg hover:bg-primary/20 transition-colors">
                오늘
              </button>
            </div>
            <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* 요일 헤더 */}
          <div className="grid grid-cols-7 mb-2">
            {DAY_NAMES.map((d, i) => (
              <div key={d} className={`text-center text-xs font-semibold py-2 ${i === 0 ? "text-rose-400" : i === 6 ? "text-blue-400" : "text-muted"}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 날짜 그리드 */}
          <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-xl overflow-hidden">
            {cells.map((day, i) => {
              if (day === null) {
                return <div key={`empty-${i}`} className="bg-white min-h-[72px] sm:min-h-[90px]" />;
              }

              const dateStr = formatDate(year, month, day);
              const dayTrips = getTripsForDate(dateStr);
              const isToday = dateStr === todayStr;
              const isSelected = dateStr === selectedDate;
              const dayOfWeek = (firstDay + day - 1) % 7;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  className={`bg-white min-h-[72px] sm:min-h-[90px] p-1.5 text-left flex flex-col transition-colors hover:bg-gray-50 ${isSelected ? "ring-2 ring-primary ring-inset" : ""}`}
                >
                  <span className={`inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full
                    ${isToday ? "bg-primary text-white" : dayOfWeek === 0 ? "text-rose-400" : dayOfWeek === 6 ? "text-blue-400" : "text-foreground"}`}>
                    {day}
                  </span>
                  <div className="mt-1 space-y-0.5 w-full overflow-hidden">
                    {dayTrips.slice(0, 2).map((trip) => (
                      <div
                        key={trip.id}
                        className={`text-[10px] leading-tight font-medium px-1.5 py-0.5 rounded border truncate ${tripColorMap.get(trip.id)}`}
                      >
                        {trip.city}
                      </div>
                    ))}
                    {dayTrips.length > 2 && (
                      <p className="text-[10px] text-muted pl-1">+{dayTrips.length - 2}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 사이드 패널 - 선택된 날짜 정보 */}
        <div className="lg:w-72 xl:w-80 shrink-0">
          <div className="bg-card-bg rounded-2xl border border-card-border p-5 sticky top-8">
            {selectedDate ? (
              <>
                <h3 className="font-semibold text-foreground mb-3">
                  {selectedDate.replace(/-/g, ". ")}
                </h3>
                {selectedTrips.length > 0 ? (
                  <div className="space-y-3">
                    {selectedTrips.map((trip) => (
                      <button
                        key={trip.id}
                        onClick={() => handleTripClick(trip)}
                        className="flex gap-3 items-start w-full text-left rounded-xl p-2 -m-2 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ${trip.upcoming ? "bg-orange-100" : "bg-gray-100"}`}>
                          {trip.cover_image ? (
                            <img src={trip.cover_image} alt={trip.city} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                              {trip.upcoming ? <PlaneTakeoff size={16} className="text-orange-400" /> : <MapPin size={16} />}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-foreground">{trip.city}</p>
                            {trip.upcoming && (
                              <span className="text-[10px] font-medium text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">예정</span>
                            )}
                          </div>
                          <p className="text-xs text-muted">{trip.country}</p>
                          <p className="text-[10px] text-muted mt-0.5">
                            {trip.start_date} ~ {trip.end_date}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">이 날짜에 여행 기록이 없습니다.</p>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <p className="text-sm text-muted">날짜를 선택하면<br />여행 정보를 볼 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 로딩 */}
      {loadingDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* 상세 모달 */}
      {modalTrip && !loadingDetail && (
        <TripDetailModal trip={modalTrip} onClose={() => setModalTrip(null)} />
      )}
    </div>
  );
}
