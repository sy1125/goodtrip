"use client";

import { useEffect, useRef, MutableRefObject } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

interface LeafletMapProps {
  trips: TripLocation[];
  selectedTripId: string | null;
  onMarkerClick: (trip: TripLocation) => void;
  flyToRef: MutableRefObject<((lat: number, lng: number, zoom?: number) => void) | undefined>;
}

export default function LeafletMap({ trips, selectedTripId, onMarkerClick, flyToRef }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());

  // 지도 초기화
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [20, 15],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      zoomControl: false,
    });

    // 깔끔한 타일 레이어 (CartoDB Voyager)
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    // 줌 컨트롤 우측 상단
    L.control.zoom({ position: "topright" }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // flyTo 함수 노출
  useEffect(() => {
    flyToRef.current = (lat: number, lng: number, zoom = 6) => {
      mapRef.current?.flyTo([lat, lng], zoom, { duration: 1.2 });
    };
  }, [flyToRef]);

  // 마커 렌더링
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // 기존 마커 제거
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    trips.forEach((trip) => {
      if (trip.lat === null || trip.lng === null) return;

      const isSelected = trip.id === selectedTripId;

      const marker = L.circleMarker([trip.lat, trip.lng], {
        radius: isSelected ? 9 : 6,
        fillColor: "#0d9488",
        color: isSelected ? "#0f766e" : "#ffffff",
        weight: isSelected ? 3 : 2,
        opacity: 1,
        fillOpacity: 0.9,
      });

      // 도시명 툴팁
      marker.bindTooltip(trip.city, {
        permanent: false,
        direction: "top",
        offset: [0, -8],
        className: "leaflet-tooltip-custom",
      });

      marker.on("click", () => {
        onMarkerClick(trip);
      });

      marker.addTo(map);
      markersRef.current.set(trip.id, marker);
    });
  }, [trips, selectedTripId, onMarkerClick]);

  return (
    <>
      <style>{`
        .leaflet-tooltip-custom {
          background: #1c1917;
          color: #fff;
          border: none;
          border-radius: 6px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }
        .leaflet-tooltip-custom::before {
          border-top-color: #1c1917;
        }
      `}</style>
      <div ref={containerRef} style={{ width: "100%", height: "500px" }} />
    </>
  );
}
