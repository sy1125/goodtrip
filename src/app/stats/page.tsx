"use client";

import { useState, useEffect } from "react";
import {
  Plane, MapPin, Flag, Camera, Clock, Calendar,
  TrendingUp, Globe2, BarChart3,
} from "lucide-react";

/* ───── Types ───── */

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
}

interface YearlyData {
  year: string;
  trips: number;
}

/* ───── Chart Components ───── */

function MonthlyBarChart({ data }: { data: { month: number; trips: number }[] }) {
  const months = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const maxTrips = Math.max(...data.map(m => m.trips), 1);

  return (
    <div className="flex items-end gap-2 h-40">
      {data.map((m, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          {m.trips > 0 && (
            <span className="text-[10px] font-semibold text-primary">{m.trips}</span>
          )}
          <div
            className={`w-full rounded-t-md transition-all ${m.trips > 0 ? "bg-gradient-to-t from-primary to-primary-light" : "bg-gray-100"}`}
            style={{ height: `${Math.max((m.trips / maxTrips) * 100, 6)}%` }}
          />
          <span className="text-[10px] text-muted">{months[i]}</span>
        </div>
      ))}
    </div>
  );
}

function CountryBarChart({ countries }: { countries: { country: string; visits: number }[] }) {
  const maxVisits = Math.max(...countries.map(c => c.visits), 1);

  return (
    <div className="space-y-2.5">
      {countries.map((c) => (
        <div key={c.country} className="flex items-center gap-3">
          <span className="text-sm text-foreground w-24 truncate font-medium">{c.country}</span>
          <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full flex items-center justify-end pr-2"
              style={{ width: `${Math.max((c.visits / maxVisits) * 100, 12)}%` }}
            >
              <span className="text-[10px] font-bold text-white">{c.visits}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function YearlyChart({ data }: { data: YearlyData[] }) {
  const maxTrips = Math.max(...data.map(d => d.trips), 1);

  return (
    <div className="flex items-end gap-3 h-32">
      {data.map((d) => (
        <div key={d.year} className="flex-1 flex flex-col items-center gap-1">
          {d.trips > 0 && (
            <span className="text-xs font-semibold text-accent">{d.trips}</span>
          )}
          <div
            className={`w-full rounded-t-md ${d.trips > 0 ? "bg-gradient-to-t from-accent to-accent-light" : "bg-gray-100"}`}
            style={{ height: `${Math.max((d.trips / maxTrips) * 100, 8)}%` }}
          />
          <span className="text-[10px] text-muted">{d.year.slice(2)}</span>
        </div>
      ))}
    </div>
  );
}

/* ───── Main Page ───── */

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [yearlyData, setYearlyData] = useState<YearlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/stats");
        const data: Stats = await res.json();
        setStats(data);

        // 연도별 통계 계산
        const yearMap: Record<string, number> = {};
        for (const t of data.timeline) {
          const y = t.start_date.slice(0, 4);
          yearMap[y] = (yearMap[y] || 0) + 1;
        }
        // API에서 전체 데이터를 가져오기 위해 trips API도 호출
        const tripsRes = await fetch("/api/trips?limit=500&sort=start_date&order=ASC");
        const tripsData = await tripsRes.json();
        const fullYearMap: Record<string, number> = {};
        for (const t of (tripsData.items || [])) {
          const y = (t.start_date as string).slice(0, 4);
          fullYearMap[y] = (fullYearMap[y] || 0) + 1;
        }
        const years = Object.keys(fullYearMap).sort();
        setYearlyData(years.map(y => ({ year: y, trips: fullYearMap[y] })));
      } catch (err) {
        console.error("통계 로드 실패:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  // 추가 계산
  const longestTrip = stats.timeline.reduce<{ city: string; country: string; days: number } | null>((max, t) =>
    !max || t.days > max.days ? { city: t.city, country: t.country, days: t.days } : max, null);

  const mostVisitedCountry = stats.countries.length > 0 ? stats.countries.reduce((a, b) => a.visits > b.visits ? a : b) : null;
  const mostVisitedMonth = stats.monthlyTrips.reduce((a, b) => a.trips > b.trips ? a : b);
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">통계</h1>
        <p className="text-sm text-muted mt-0.5">나의 여행 데이터 한눈에 보기</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "총 여행", value: stats.totalTrips, icon: Plane, color: "bg-primary/10 text-primary" },
          { label: "방문 국가", value: stats.totalCountries, icon: Flag, color: "bg-accent/10 text-accent" },
          { label: "방문 도시", value: stats.totalCities, icon: MapPin, color: "bg-violet-100 text-violet-600" },
          { label: "총 여행일", value: stats.totalDays, icon: Calendar, color: "bg-emerald-100 text-emerald-600" },
          { label: "평균 일수", value: stats.avgDays, icon: Clock, color: "bg-sky-100 text-sky-600" },
          { label: "총 사진", value: stats.totalPhotos, icon: Camera, color: "bg-rose-100 text-rose-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card-bg rounded-2xl border border-card-border p-4">
            <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center mb-2`}>
              <s.icon size={18} />
            </div>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-[11px] text-muted mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* 하이라이트 카드 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {longestTrip && (
          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5">
            <p className="text-xs font-medium text-primary mb-1">가장 긴 여행</p>
            <p className="text-lg font-bold text-foreground">{longestTrip.city}, {longestTrip.country}</p>
            <p className="text-sm text-muted">{longestTrip.days}일</p>
          </div>
        )}
        {mostVisitedCountry && (
          <div className="bg-gradient-to-br from-accent/5 to-accent/10 rounded-2xl border border-accent/20 p-5">
            <p className="text-xs font-medium text-accent mb-1">가장 많이 방문한 국가</p>
            <p className="text-lg font-bold text-foreground">{mostVisitedCountry.country}</p>
            <p className="text-sm text-muted">{mostVisitedCountry.visits}회 방문</p>
          </div>
        )}
        {mostVisitedMonth.trips > 0 && (
          <div className="bg-gradient-to-br from-violet-50 to-violet-100 rounded-2xl border border-violet-200 p-5">
            <p className="text-xs font-medium text-violet-600 mb-1">여행을 가장 많이 간 달</p>
            <p className="text-lg font-bold text-foreground">{monthNames[mostVisitedMonth.month - 1]}</p>
            <p className="text-sm text-muted">{mostVisitedMonth.trips}회</p>
          </div>
        )}
      </div>

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 월별 여행 */}
        <div className="bg-card-bg rounded-2xl border border-card-border p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-foreground">월별 여행 횟수</h2>
            <span className="flex items-center gap-1 text-xs text-muted">
              <TrendingUp size={12} /> {new Date().getFullYear()}년
            </span>
          </div>
          <MonthlyBarChart data={stats.monthlyTrips} />
        </div>

        {/* 연도별 여행 */}
        <div className="bg-card-bg rounded-2xl border border-card-border p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-foreground">연도별 여행 횟수</h2>
            <span className="flex items-center gap-1 text-xs text-muted">
              <BarChart3 size={12} /> 전체
            </span>
          </div>
          {yearlyData.length > 0 ? (
            <YearlyChart data={yearlyData} />
          ) : (
            <p className="text-sm text-muted text-center py-8">데이터가 없습니다</p>
          )}
        </div>
      </div>

      {/* 국가별 방문 횟수 */}
      <div className="bg-card-bg rounded-2xl border border-card-border p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">국가별 방문 횟수</h2>
          <span className="flex items-center gap-1 text-xs text-muted">
            <Globe2 size={12} /> {stats.totalCountries}개국
          </span>
        </div>
        {stats.countries.length > 0 ? (
          <CountryBarChart countries={stats.countries} />
        ) : (
          <p className="text-sm text-muted text-center py-8">데이터가 없습니다</p>
        )}
      </div>

      {/* 최근 여행 기록 */}
      <div className="bg-card-bg rounded-2xl border border-card-border p-5">
        <h2 className="font-semibold text-foreground mb-4">최근 여행</h2>
        {stats.timeline.length > 0 ? (
          <div className="space-y-3">
            {stats.timeline.map((t, i) => (
              <div key={t.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-muted">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{t.city}, {t.country}</p>
                  <p className="text-[11px] text-muted">{t.start_date} — {t.end_date}</p>
                </div>
                <span className="text-xs font-semibold text-muted bg-gray-100 px-2 py-0.5 rounded-full">
                  {t.days}일
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted text-center py-8">아직 여행 기록이 없습니다</p>
        )}
      </div>
    </div>
  );
}
