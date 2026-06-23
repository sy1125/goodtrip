"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Calendar, Clock, X, Plus,
  Image as ImageIcon,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";

interface Destination {
  city: string;
  country: string;
  start_date?: string;
  end_date?: string;
}

interface TripLocation {
  id: string;
  city: string;
  country: string;
  start_date: string;
  end_date: string;
  cover_image: string | null;
  notes: string | null;
  lat: number | null;
  lng: number | null;
  destinations?: Destination[];
  trip_id?: string;
}

// Leaflet은 SSR 불가 → dynamic import
const LeafletMap = dynamic(() => import("@/components/LeafletMap"), { ssr: false });

export default function MapPage() {
  const [trips, setTrips] = useState<TripLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<TripLocation | null>(null);
  const flyToRef = useRef<(lat: number, lng: number, zoom?: number) => void>(undefined);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/trips/locations");
      const data = await res.json();
      setTrips(data);
    } catch (err) {
      console.error("위치 데이터 로드 실패:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTrips(); }, [loadTrips]);

  const locatedTrips = useMemo(() => trips.filter((t) => t.lat !== null && t.lng !== null), [trips]);

  const visitedCountries = useMemo(() => {
    const set = new Set(trips.map((t) => t.country));
    return Array.from(set);
  }, [trips]);

  const uniqueCountryCount = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((t) => {
      set.add(t.country);
      if (t.destinations) {
        t.destinations.forEach((d) => set.add(d.country));
      }
    });
    return set.size;
  }, [trips]);

  const getDays = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;

  const handleMarkerClick = (trip: TripLocation) => {
    setSelectedTrip(trip);
  };

  const handleCardClick = (trip: TripLocation) => {
    setSelectedTrip(trip);
    if (trip.lat && trip.lng && flyToRef.current) {
      flyToRef.current(trip.lat, trip.lng, 6);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">세계 지도</h1>
          <p className="text-sm text-muted mt-0.5">
            {uniqueCountryCount}개국 · {locatedTrips.length}개 여행
          </p>
        </div>
        <Link href="/dashboard?new=1"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-primary rounded-xl hover:bg-primary-dark transition-colors self-start sm:self-auto">
          <Plus size={15} /> 새 여행
        </Link>
      </div>

      {/* 지도 */}
      <div className="relative bg-card-bg rounded-2xl border border-card-border overflow-hidden">
        <LeafletMap
          trips={locatedTrips}
          selectedTripId={selectedTrip?.id || null}
          onMarkerClick={handleMarkerClick}
          flyToRef={flyToRef}
        />
      </div>

      {/* 방문 도시 목록 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {locatedTrips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => handleCardClick(trip)}
            className={`flex items-center gap-3 bg-card-bg rounded-xl border p-3 text-left transition-all hover:shadow-md ${
              selectedTrip?.id === trip.id ? "border-primary ring-1 ring-primary/20" : "border-card-border"
            }`}
          >
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              {trip.cover_image ? (
                <img src={trip.cover_image} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ImageIcon size={16} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {trip.destinations && trip.destinations.length > 1
                  ? trip.destinations.map(d => d.city).join(" → ")
                  : trip.city}
              </p>
              <p className="text-xs text-muted">{trip.country}</p>
              <div className="flex items-center gap-2 text-[10px] text-muted mt-0.5">
                <span className="flex items-center gap-0.5"><Calendar size={9} /> {trip.start_date.slice(0, 7)}</span>
                <span className="flex items-center gap-0.5"><Clock size={9} /> {getDays(trip.start_date, trip.end_date)}일</span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* 선택된 여행 상세 팝업 */}
      {selectedTrip && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-sm lg:left-auto lg:translate-x-0 lg:right-8 lg:bottom-8">
          <div className="bg-white rounded-2xl shadow-2xl border border-card-border overflow-hidden">
            {selectedTrip.cover_image && (
              <div className="h-32 overflow-hidden">
                <img src={selectedTrip.cover_image} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-foreground">
                    {selectedTrip.destinations && selectedTrip.destinations.length > 1
                      ? selectedTrip.destinations.map(d => d.city).join(" → ")
                      : selectedTrip.city}
                  </h3>
                  <p className="text-xs text-muted">{selectedTrip.country}</p>
                </div>
                <button onClick={() => setSelectedTrip(null)} className="text-muted hover:text-foreground">
                  <X size={16} />
                </button>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted mt-2">
                <span className="flex items-center gap-1"><Calendar size={11} /> {selectedTrip.start_date} — {selectedTrip.end_date}</span>
                <span className="flex items-center gap-1"><Clock size={11} /> {getDays(selectedTrip.start_date, selectedTrip.end_date)}일</span>
              </div>
              {selectedTrip.destinations && selectedTrip.destinations.length > 1 && selectedTrip.destinations.some(d => d.start_date) && (
                <div className="mt-2 space-y-1">
                  {selectedTrip.destinations.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-muted">
                      <span className="w-4 text-center text-[10px] font-semibold text-primary">{i + 1}</span>
                      <span className="font-medium text-foreground">{d.city}</span>
                      {d.start_date && d.end_date && (
                        <span className="ml-auto text-[10px]">{d.start_date} ~ {d.end_date}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {selectedTrip.notes && (
                <p className="text-xs text-muted mt-2 line-clamp-2">{selectedTrip.notes}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
