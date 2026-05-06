import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

// 필수 컬럼만 작성된 예시
const minimalTrips = [
  { city: "도쿄", country: "일본", start_date: "2024-03-01", end_date: "2024-03-05" },
  { city: "파리", country: "프랑스", start_date: "2024-06-10", end_date: "2024-06-15" },
];

// 전체 컬럼(선택 포함) 작성된 예시
const fullTrips = [
  {
    id: "trip-001",
    city: "도쿄",
    country: "일본",
    start_date: "2024-03-01",
    end_date: "2024-03-05",
    cover_image: "/uploads/tokyo-cover.jpg",
    notes: "벚꽃 시즌에 방문. 우에노 공원이 최고였다.",
    created_at: "2024-03-06T10:00:00.000Z",
  },
  {
    id: "trip-002",
    city: "파리",
    country: "프랑스",
    start_date: "2024-06-10",
    end_date: "2024-06-15",
    cover_image: "/uploads/paris-cover.jpg",
    notes: "에펠탑, 루브르 박물관 방문",
    created_at: "2024-06-16T09:00:00.000Z",
  },
];

const fullPhotos = [
  { id: 1, trip_id: "trip-001", file_path: "/uploads/tokyo-1.jpg", caption: "우에노 공원 벚꽃", created_at: "2024-03-06T10:00:00.000Z" },
  { id: 2, trip_id: "trip-001", file_path: "/uploads/tokyo-2.jpg", caption: "시부야 스크램블", created_at: "2024-03-06T10:01:00.000Z" },
  { id: 3, trip_id: "trip-002", file_path: "/uploads/paris-1.jpg", caption: "에펠탑 야경", created_at: "2024-06-16T09:00:00.000Z" },
];

const fullFavorites = [
  { trip_id: "trip-001", created_at: "2024-03-07T00:00:00.000Z" },
];

const fullUpcoming = [
  { id: "upcoming-001", city: "바르셀로나", country: "스페인", start_date: "2025-09-01", end_date: "2025-09-07", notes: "사그라다 파밀리아 방문 예정", created_at: "2025-01-01T00:00:00.000Z" },
];

const fullCoords = [
  { city: "도쿄", country: "일본", lat: 35.6762, lng: 139.6503 },
  { city: "파리", country: "프랑스", lat: 48.8566, lng: 2.3522 },
];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const format = searchParams.get("format") || "excel";

  if (format === "json") {
    const template = {
      version: "1.0",
      _설명: "trips 배열은 필수입니다. 나머지(photos, favorites, upcoming, coords)는 선택입니다.",
      trips_필수컬럼_예시: minimalTrips,
      trips: fullTrips,
      photos: fullPhotos,
      favorites: fullFavorites,
      upcoming: fullUpcoming,
      coords: fullCoords,
    };
    const blob = JSON.stringify(template, null, 2);
    return new NextResponse(blob, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="goodtrip-template.json"`,
      },
    });
  }

  // Excel template
  const wb = XLSX.utils.book_new();

  // Sheet 1: 필수 컬럼만
  const wsMinimal = XLSX.utils.json_to_sheet(minimalTrips);
  wsMinimal["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsMinimal, "여행기록(필수)");

  // Sheet 2: 전체 컬럼
  const wsFull = XLSX.utils.json_to_sheet(fullTrips);
  wsFull["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsFull, "여행기록(전체)");

  // Sheet 3: 사진
  const wsPhotos = XLSX.utils.json_to_sheet(fullPhotos);
  wsPhotos["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsPhotos, "사진");

  // Sheet 4: 즐겨찾기
  const wsFav = XLSX.utils.json_to_sheet(fullFavorites);
  wsFav["!cols"] = [{ wch: 12 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsFav, "즐겨찾기");

  // Sheet 5: 예정된 여행
  const wsUpcoming = XLSX.utils.json_to_sheet(fullUpcoming);
  wsUpcoming["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsUpcoming, "예정된여행");

  // Sheet 6: 좌표
  const wsCoords = XLSX.utils.json_to_sheet(fullCoords);
  wsCoords["!cols"] = [{ wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsCoords, "좌표캐시");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="goodtrip-template.xlsx"`,
    },
  });
}
