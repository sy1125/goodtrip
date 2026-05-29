"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe2,
  Map,
  Camera,
  CalendarDays,
  CalendarRange,
  BarChart3,
  BookOpen,
  Heart,
  Settings,
  Menu,
  X,
  ChevronRight,
  Plane,
  PlaneTakeoff,
} from "lucide-react";

const navItems = [
  { icon: Globe2, label: "홈", href: "/" },
  { icon: Map, label: "세계 지도", href: "/map" },
  { icon: BookOpen, label: "여행 기록", href: "/trips" },
  { icon: Camera, label: "갤러리", href: "/gallery" },
  { icon: CalendarRange, label: "캘린더", href: "/calendar" },
  { icon: CalendarDays, label: "타임라인", href: "/timeline" },
  { icon: BarChart3, label: "통계", href: "/stats" },
  { icon: PlaneTakeoff, label: "예정된 여행", href: "/upcoming" },
  { icon: Heart, label: "즐겨찾기", href: "/favorites" },
  { icon: Settings, label: "설정", href: "/settings" },
];

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 lg:hidden w-10 h-10 flex items-center justify-center rounded-xl bg-sidebar-bg text-white shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-sidebar-bg flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-6 h-16 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Plane size={16} className="text-white -rotate-45" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              GoodTrip
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden text-sidebar-text hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/10 text-white"
                    : "text-sidebar-text hover:bg-white/5 hover:text-white"
                }`}
              >
                <item.icon size={18} />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <ChevronRight size={14} className="text-white/40" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Travel Quote */}
        <div className="px-5 py-4 border-t border-white/10">
          <p className="text-xs text-sidebar-text italic leading-relaxed">
            &quot;세상은 한 권의 책이다. 여행하지 않는 자는 그 책의 한 페이지만 읽는 것이다.&quot;
          </p>
          <p className="text-[10px] text-sidebar-text/60 mt-1">— 성 아우구스티누스</p>
        </div>
      </aside>
    </>
  );
}
