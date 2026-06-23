"use client";

import { useState, useEffect } from "react";
import {
  Plane, Plus, X, Edit3, Trash2, Calendar, MapPin,
  FileText, AlertTriangle,
} from "lucide-react";

/* ───── Types ───── */

interface Destination {
  city: string;
  country: string;
  start_date?: string;
  end_date?: string;
}

interface UpcomingTrip {
  id: string;
  city: string;
  country: string;
  destinations: Destination[];
  start_date: string;
  end_date: string;
  notes: string | null;
  created_at: string;
}

/* ───── Helpers ───── */

function getDestinations(trip: UpcomingTrip): Destination[] {
  if (trip.destinations && trip.destinations.length > 0) {
    return trip.destinations;
  }
  // Fallback for legacy data that only has city/country
  return [{ city: trip.city, country: trip.country }];
}

function formatCities(dests: Destination[]): string {
  return dests.map((d) => d.city).join(" → ");
}

function formatCountries(dests: Destination[]): string {
  return [...new Set(dests.map((d) => d.country))].join(", ");
}

/* ───── Main Page ───── */

export default function UpcomingPage() {
  const [trips, setTrips] = useState<UpcomingTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<UpcomingTrip | null>(null);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/upcoming");
      const data = await res.json();
      setTrips(data);
    } catch {
      console.error("Failed to load upcoming trips");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 여행 계획을 삭제하시겠습니까?")) return;
    await fetch(`/api/upcoming/${id}`, { method: "DELETE" });
    setTrips((prev) => prev.filter((t) => t.id !== id));
  };

  const handleEdit = (trip: UpcomingTrip) => {
    setEditTarget(trip);
    setModalOpen(true);
  };

  const handleAdd = () => {
    setEditTarget(null);
    setModalOpen(true);
  };

  const handleSaved = () => {
    setModalOpen(false);
    setEditTarget(null);
    loadTrips();
  };

  const getDaysUntil = (startDate: string) => {
    const diff = Math.ceil((new Date(startDate).getTime() - Date.now()) / 86400000);
    return diff;
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
  };

  const getDuration = (start: string, end: string) => {
    const diff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400000);
    return diff;
  };

  // Separate into upcoming and past
  const now = new Date();
  const upcomingTrips = trips.filter((t) => new Date(t.start_date) >= now);
  const pastTrips = trips.filter((t) => new Date(t.start_date) < now);

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">예정된 여행</h1>
          <p className="text-sm text-muted mt-0.5">다가오는 여행 계획을 관리합니다</p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} /> 새 여행 계획
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20">
          <Plane size={48} className="mx-auto text-muted/30 mb-4" />
          <p className="text-muted text-sm">아직 예정된 여행이 없습니다.</p>
          <p className="text-muted/60 text-xs mt-1">새 여행 계획을 추가해보세요.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcomingTrips.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide">다가오는 여행</h2>
              <div className="grid gap-4">
                {upcomingTrips.map((trip) => {
                  const daysUntil = getDaysUntil(trip.start_date);
                  const duration = getDuration(trip.start_date, trip.end_date);
                  const dests = getDestinations(trip);
                  return (
                    <div
                      key={trip.id}
                      className="bg-card-bg rounded-2xl border border-card-border p-5 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          {/* D-day badge */}
                          <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-primary to-accent flex flex-col items-center justify-center text-white">
                            <span className="text-[10px] font-medium opacity-80">D-</span>
                            <span className="text-xl font-bold -mt-0.5">{daysUntil}</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-foreground">
                              {formatCities(dests)}
                            </h3>
                            <p className="text-xs text-muted">
                              {formatCountries(dests)}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-sm text-muted">
                              <span className="flex items-center gap-1">
                                <Calendar size={13} />
                                {formatDate(trip.start_date)} — {formatDate(trip.end_date)}
                              </span>
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                                {duration}박 {duration + 1}일
                              </span>
                            </div>
                            {dests.length > 1 && dests.some(d => d.start_date) && (
                              <div className="mt-2 space-y-1">
                                {dests.map((d, i) => (
                                  <div key={i} className="flex items-center gap-2 text-xs text-muted">
                                    <span className="w-4 text-center text-[10px] font-semibold text-primary">{i + 1}</span>
                                    <span className="font-medium text-foreground">{d.city}</span>
                                    {d.start_date && d.end_date && (
                                      <span className="text-[10px]">{d.start_date} ~ {d.end_date}</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            {trip.notes && (
                              <p className="text-sm text-muted mt-2 flex items-start gap-1.5">
                                <FileText size={13} className="mt-0.5 flex-shrink-0" />
                                {trip.notes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEdit(trip)}
                            className="p-2 text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => handleDelete(trip.id)}
                            className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past (expired) upcoming trips */}
          {pastTrips.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle size={13} />
                지난 여행 계획
              </h2>
              <p className="text-xs text-muted">출발일이 지난 계획입니다. 여행을 다녀오셨다면 여행 기록에 추가하고 삭제해주세요.</p>
              <div className="grid gap-3">
                {pastTrips.map((trip) => {
                  const duration = getDuration(trip.start_date, trip.end_date);
                  const dests = getDestinations(trip);
                  return (
                    <div
                      key={trip.id}
                      className="bg-card-bg rounded-2xl border border-card-border p-4 opacity-60"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MapPin size={16} className="text-muted" />
                          <div>
                            <h3 className="text-sm font-semibold text-foreground">
                              {formatCities(dests)}
                            </h3>
                            <p className="text-xs text-muted">
                              {formatCountries(dests)} | {formatDate(trip.start_date)} — {formatDate(trip.end_date)} ({duration}박 {duration + 1}일)
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(trip.id)}
                          className="p-2 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <TripFormModal
          trip={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

/* ───── Form Modal ───── */

function TripFormModal({
  trip,
  onClose,
  onSaved,
}: {
  trip: UpcomingTrip | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const initialDestinations: Destination[] =
    trip && trip.destinations && trip.destinations.length > 0
      ? trip.destinations
      : trip
        ? [{ city: trip.city, country: trip.country }]
        : [{ city: "", country: "" }];

  const [destinations, setDestinations] = useState<Destination[]>(initialDestinations);
  const startDate = destinations.reduce((min, d) => {
    if (!d.start_date) return min;
    return !min || d.start_date < min ? d.start_date : min;
  }, "" as string);
  const endDate = destinations.reduce((max, d) => {
    if (!d.end_date) return max;
    return !max || d.end_date > max ? d.end_date : max;
  }, "" as string);
  const [notes, setNotes] = useState(trip?.notes || "");
  const [saving, setSaving] = useState(false);

  const updateDestination = (index: number, field: keyof Destination, value: string) => {
    setDestinations((prev) =>
      prev.map((d, i) => (i === index ? { ...d, [field]: value } : d))
    );
  };

  const addDestination = () => {
    setDestinations((prev) => [...prev, { city: "", country: "" }]);
  };

  const removeDestination = (index: number) => {
    setDestinations((prev) => prev.filter((_, i) => i !== index));
  };

  const allDestinationsValid = destinations.every((d) => d.city.trim() && d.country.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allDestinationsValid || !startDate || !endDate) return;

    setSaving(true);
    try {
      const body = { destinations, start_date: startDate, end_date: endDate, notes };

      if (trip) {
        await fetch(`/api/upcoming/${trip.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      } else {
        await fetch("/api/upcoming", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }
      onSaved();
    } catch {
      alert("각 목적지의 날짜는 필수입니다");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-md mx-4 p-6 shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-foreground">
            {trip ? "여행 계획 수정" : "새 여행 계획"}
          </h2>
          <button onClick={onClose} className="p-1.5 text-muted hover:text-foreground rounded-lg">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Destinations */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted">목적지 *</label>
              <button
                type="button"
                onClick={addDestination}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Plus size={13} />
                목적지 추가
              </button>
            </div>
            <div className="space-y-2">
              {destinations.map((dest, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <span className="text-xs text-muted font-medium w-5 text-center flex-shrink-0 mt-2.5">
                    {index + 1}
                  </span>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={dest.country}
                        onChange={(e) => updateDestination(index, "country", e.target.value)}
                        placeholder="국가"
                        className="flex-1 px-3 py-2.5 border border-card-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        required
                      />
                      <input
                        type="text"
                        value={dest.city}
                        onChange={(e) => updateDestination(index, "city", e.target.value)}
                        placeholder="도시"
                        className="flex-1 px-3 py-2.5 border border-card-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={dest.start_date || ""}
                        onChange={(e) => updateDestination(index, "start_date", e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <input
                        type="date"
                        value={dest.end_date || ""}
                        onChange={(e) => updateDestination(index, "end_date", e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-card-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                  {destinations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDestination(index)}
                      className="p-1.5 text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 mt-2"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Route preview */}
            {destinations.length > 1 && destinations.some((d) => d.city.trim()) && (
              <p className="text-xs text-primary mt-2 flex items-center gap-1">
                <MapPin size={12} />
                여행 경로: {destinations.filter((d) => d.city.trim()).map((d) => d.city).join(" → ")}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted mb-1 block">메모</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="여행 계획에 대한 메모를 남겨보세요"
              rows={3}
              className="w-full px-3 py-2.5 border border-card-border rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={saving || !allDestinationsValid || !startDate || !endDate}
            className="w-full py-2.5 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? "저장 중..." : trip ? "수정하기" : "추가하기"}
          </button>
        </form>
      </div>
    </div>
  );
}
