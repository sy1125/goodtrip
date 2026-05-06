"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from "react-simple-maps";
import {
  Calendar, Clock, X, ZoomIn, ZoomOut, RotateCcw,
  Image as ImageIcon,
} from "lucide-react";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

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
}

export default function MapPage() {
  const [trips, setTrips] = useState<TripLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<TripLocation | null>(null);
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([15, 20]);

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

  // 방문 국가 목록 (중복 제거)
  const visitedCountries = useMemo(() => {
    const set = new Set(trips.map((t) => t.country));
    return Array.from(set);
  }, [trips]);

  const getDays = (start: string, end: string) =>
    Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1;

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.5, 8));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.5, 1));
  const handleReset = () => { setZoom(1); setCenter([15, 20]); };

  const handleMarkerClick = (trip: TripLocation) => {
    setSelectedTrip(trip);
    if (trip.lat && trip.lng) {
      setCenter([trip.lng, trip.lat]);
      setZoom(4);
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
            {visitedCountries.length}개국 · {locatedTrips.length}개 도시 방문
          </p>
        </div>
      </div>

      {/* 지도 */}
      <div className="relative bg-card-bg rounded-2xl border border-card-border overflow-hidden">
        {/* 줌 컨트롤 */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1">
          <button onClick={handleZoomIn}
            className="w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 text-foreground">
            <ZoomIn size={16} />
          </button>
          <button onClick={handleZoomOut}
            className="w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 text-foreground">
            <ZoomOut size={16} />
          </button>
          <button onClick={handleReset}
            className="w-9 h-9 bg-white rounded-lg shadow-md flex items-center justify-center hover:bg-gray-50 text-foreground">
            <RotateCcw size={14} />
          </button>
        </div>

        {/* 범례 */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm px-3 py-2 flex items-center gap-4 text-xs text-muted">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            방문한 도시
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-2 rounded-sm bg-primary/20 border border-primary/30" />
            방문한 국가
          </div>
        </div>

        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 140, center: [0, 20] }}
          style={{ width: "100%", height: "auto", aspectRatio: "2/1" }}
        >
          <ZoomableGroup zoom={zoom} center={center} onMoveEnd={({ coordinates, zoom: z }) => { setCenter(coordinates as [number, number]); setZoom(z); }}>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const countryName = geo.properties.name;
                  const isVisited = visitedCountries.some(
                    (vc) => vc === countryName || countryName?.includes(vc) || vc?.includes(countryName)
                  );
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={isVisited ? "#0d948833" : "#f5f5f4"}
                      stroke="#d6d3d1"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: isVisited ? "#0d948855" : "#e7e5e4", outline: "none" },
                        pressed: { outline: "none" },
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* 마커 */}
            {locatedTrips.map((trip) => (
              <Marker
                key={trip.id}
                coordinates={[trip.lng!, trip.lat!]}
                onClick={() => handleMarkerClick(trip)}
              >
                <circle
                  r={4 / Math.sqrt(zoom)}
                  fill="#0d9488"
                  stroke="#fff"
                  strokeWidth={1.5 / zoom}
                  className="cursor-pointer hover:fill-[#0f766e]"
                />
                {zoom >= 3 && (
                  <text
                    textAnchor="middle"
                    y={-8 / Math.sqrt(zoom)}
                    style={{
                      fontSize: `${10 / Math.sqrt(zoom)}px`,
                      fill: "#1c1917",
                      fontWeight: 600,
                      pointerEvents: "none",
                    }}
                  >
                    {trip.city}
                  </text>
                )}
              </Marker>
            ))}
          </ZoomableGroup>
        </ComposableMap>
      </div>

      {/* 방문 도시 목록 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {locatedTrips.map((trip) => (
          <button
            key={trip.id}
            onClick={() => handleMarkerClick(trip)}
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
              <p className="text-sm font-semibold text-foreground truncate">{trip.city}</p>
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
                  <h3 className="font-bold text-foreground">{selectedTrip.city}</h3>
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
