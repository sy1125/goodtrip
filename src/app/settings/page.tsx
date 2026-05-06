"use client";

import { useState, useEffect } from "react";
import {
  Database, Trash2, Download, Upload, HardDrive,
  AlertTriangle, CheckCircle, Info,
} from "lucide-react";

/* ───── Types ───── */

interface DbInfo {
  totalTrips: number;
  totalPhotos: number;
  totalFavorites: number;
  totalUpcoming: number;
  dbSize: string;
}

/* ───── Main Page ───── */

export default function SettingsPage() {
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadDbInfo();
  }, []);

  const loadDbInfo = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings/info");
      const data = await res.json();
      setDbInfo(data);
    } catch {
      console.error("설정 정보 로드 실패");
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = async (format: "json" | "excel") => {
    try {
      const res = await fetch(`/api/settings/export?format=${format}`);
      if (format === "excel") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `goodtrip-backup-${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `goodtrip-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      showMessage("success", "데이터를 성공적으로 내보냈습니다.");
    } catch {
      showMessage("error", "내보내기에 실패했습니다.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ext = file.name.split(".").pop()?.toLowerCase();

      let res: Response;
      if (ext === "xlsx" || ext === "xls") {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/settings/import", { method: "POST", body: formData });
      } else {
        const text = await file.text();
        const data = JSON.parse(text);
        res = await fetch("/api/settings/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
      }

      if (res.ok) {
        const result = await res.json();
        showMessage("success", `데이터를 성공적으로 가져왔습니다. (${result.imported || 0}건)`);
        loadDbInfo();
      } else {
        showMessage("error", "가져오기에 실패했습니다. 파일 형식을 확인해주세요.");
      }
    } catch {
      showMessage("error", "잘못된 파일 형식입니다.");
    }
    e.target.value = "";
  };

  const handleDownloadTemplate = (format: "json" | "excel") => {
    const a = document.createElement("a");
    a.href = `/api/settings/template?format=${format}`;
    a.click();
  };

  const handleResetData = async () => {
    if (!confirm("정말로 모든 데이터를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) return;
    if (!confirm("마지막으로 확인합니다. 모든 여행 기록, 사진, 즐겨찾기가 삭제됩니다.")) return;

    try {
      const res = await fetch("/api/settings/reset", { method: "POST" });
      if (res.ok) {
        showMessage("success", "모든 데이터가 삭제되었습니다.");
        loadDbInfo();
      } else {
        showMessage("error", "데이터 삭제에 실패했습니다.");
      }
    } catch {
      showMessage("error", "오류가 발생했습니다.");
    }
  };

  const handleClearCoordCache = async () => {
    if (!confirm("좌표 캐시를 초기화하시겠습니까?\n다음 조회 시 자동으로 다시 검색됩니다.")) return;

    try {
      const res = await fetch("/api/settings/clear-coords", { method: "POST" });
      if (res.ok) {
        showMessage("success", "좌표 캐시가 초기화되었습니다.");
      } else {
        showMessage("error", "초기화에 실패했습니다.");
      }
    } catch {
      showMessage("error", "오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">설정</h1>
        <p className="text-sm text-muted mt-0.5">데이터 관리 및 앱 설정</p>
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm ${
          message.type === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-700" : "bg-red-50 border border-red-200 text-red-700"
        }`}>
          {message.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {message.text}
        </div>
      )}

      {/* 데이터베이스 정보 */}
      <div className="bg-card-bg rounded-2xl border border-card-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database size={18} className="text-primary" />
          <h2 className="font-semibold text-foreground">데이터베이스 정보</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : dbInfo && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">{dbInfo.totalTrips}</p>
              <p className="text-[11px] text-muted">여행 기록</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">{dbInfo.totalPhotos}</p>
              <p className="text-[11px] text-muted">사진</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">{dbInfo.totalFavorites}</p>
              <p className="text-[11px] text-muted">즐겨찾기</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-foreground">{dbInfo.dbSize}</p>
              <p className="text-[11px] text-muted">DB 크기</p>
            </div>
          </div>
        )}
      </div>

      {/* 데이터 백업 & 복원 */}
      <div className="bg-card-bg rounded-2xl border border-card-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive size={18} className="text-primary" />
          <h2 className="font-semibold text-foreground">데이터 백업 & 복원</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-foreground">데이터 내보내기</p>
              <p className="text-xs text-muted">모든 여행 데이터를 파일로 저장합니다.</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleExport("json")}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5">
                <Download size={14} /> JSON
              </button>
              <button onClick={() => handleExport("excel")}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-emerald-600 border border-emerald-300 rounded-lg hover:bg-emerald-50">
                <Download size={14} /> Excel
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-foreground">데이터 가져오기</p>
              <p className="text-xs text-muted">JSON 또는 Excel(.xlsx) 파일에서 데이터를 복원합니다.</p>
            </div>
            <label className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary border border-primary/30 rounded-lg hover:bg-primary/5 cursor-pointer">
              <Upload size={14} /> 파일 선택
              <input type="file" accept=".json,.xlsx,.xls" onChange={handleImport} className="hidden" />
            </label>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">데이터 양식 다운로드</p>
                <p className="text-xs text-muted">가져오기용 샘플 양식을 다운로드합니다.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleDownloadTemplate("json")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted border border-card-border rounded-lg hover:bg-gray-100">
                  <Download size={12} /> JSON 양식
                </button>
                <button onClick={() => handleDownloadTemplate("excel")}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted border border-card-border rounded-lg hover:bg-gray-100">
                  <Download size={12} /> Excel 양식
                </button>
              </div>
            </div>
            <div className="mt-3 p-3 bg-white rounded-lg border border-card-border">
              <p className="text-xs font-medium text-muted mb-2">필수 컬럼 (여행기록 시트)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-primary/5 text-primary font-medium px-2 py-1 rounded">city (도시)</div>
                <div className="bg-primary/5 text-primary font-medium px-2 py-1 rounded">country (국가)</div>
                <div className="bg-primary/5 text-primary font-medium px-2 py-1 rounded">start_date (시작일)</div>
                <div className="bg-primary/5 text-primary font-medium px-2 py-1 rounded">end_date (종료일)</div>
              </div>
              <p className="text-xs text-muted mt-2">선택 컬럼: notes, cover_image, created_at, photos, favorites, upcoming, coords</p>
              <p className="text-[11px] text-muted mt-1">* 날짜 형식: YYYY-MM-DD (예: 2024-03-01)</p>
              <p className="text-[11px] text-muted">* 양식 파일에 필수/전체 컬럼 예시가 포함되어 있습니다.</p>
            </div>
          </div>
        </div>
      </div>

      {/* 캐시 관리 */}
      <div className="bg-card-bg rounded-2xl border border-card-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info size={18} className="text-muted" />
          <h2 className="font-semibold text-foreground">캐시 관리</h2>
        </div>
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-foreground">좌표 캐시 초기화</p>
            <p className="text-xs text-muted">도시 좌표 캐시를 삭제합니다. 지도에서 자동 재검색됩니다.</p>
          </div>
          <button onClick={handleClearCoordCache}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted border border-card-border rounded-lg hover:bg-gray-100">
            <Trash2 size={14} /> 초기화
          </button>
        </div>
      </div>

      {/* 위험 영역 */}
      <div className="bg-card-bg rounded-2xl border border-red-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle size={18} className="text-red-500" />
          <h2 className="font-semibold text-red-600">위험 영역</h2>
        </div>
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
          <div>
            <p className="text-sm font-medium text-red-700">모든 데이터 삭제</p>
            <p className="text-xs text-red-500">여행 기록, 사진, 즐겨찾기 등 모든 데이터가 영구 삭제됩니다.</p>
          </div>
          <button onClick={handleResetData}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600">
            <Trash2 size={14} /> 전체 삭제
          </button>
        </div>
      </div>

    </div>
  );
}
