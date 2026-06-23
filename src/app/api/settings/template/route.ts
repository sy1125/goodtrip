import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

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
    end_date: "2024-06-18",
    cover_image: "/uploads/paris-cover.jpg",
    notes: "파리-리옹 여행. 에펠탑, 루브르, 리옹 구시가지 방문",
    created_at: "2024-06-19T09:00:00.000Z",
  },
];

const fullTripDestinations = [
  { trip_id: "trip-001", city: "도쿄", country: "일본", order_num: 0, start_date: "2024-03-01", end_date: "2024-03-05" },
  { trip_id: "trip-002", city: "파리", country: "프랑스", order_num: 0, start_date: "2024-06-10", end_date: "2024-06-14" },
  { trip_id: "trip-002", city: "리옹", country: "프랑스", order_num: 1, start_date: "2024-06-15", end_date: "2024-06-18" },
];

const fullPhotos = [
  { id: 1, trip_id: "trip-001", file_path: "/uploads/tokyo-1.jpg", caption: "우에노 공원 벚꽃", created_at: "2024-03-06T10:00:00.000Z" },
  { id: 2, trip_id: "trip-001", file_path: "/uploads/tokyo-2.jpg", caption: "시부야 스크램블", created_at: "2024-03-06T10:01:00.000Z" },
  { id: 3, trip_id: "trip-002", file_path: "/uploads/paris-1.jpg", caption: "에펠탑 야경", created_at: "2024-06-19T09:00:00.000Z" },
];

const fullFavorites = [
  { trip_id: "trip-001", created_at: "2024-03-07T00:00:00.000Z" },
];

const fullUpcoming = [
  { id: "upcoming-001", city: "뉴욕", country: "미국", start_date: "2025-09-01", end_date: "2025-09-12", notes: "미국-일본-한국 여행", created_at: "2025-01-01T00:00:00.000Z" },
];

const fullUpcomingDestinations = [
  { trip_id: "upcoming-001", city: "뉴욕", country: "미국", order_num: 0, start_date: "2025-09-01", end_date: "2025-09-04" },
  { trip_id: "upcoming-001", city: "도쿄", country: "일본", order_num: 1, start_date: "2025-09-05", end_date: "2025-09-08" },
  { trip_id: "upcoming-001", city: "서울", country: "대한민국", order_num: 2, start_date: "2025-09-09", end_date: "2025-09-12" },
];

const fullCoords = [
  { city: "도쿄", country: "일본", lat: 35.6762, lng: 139.6503 },
  { city: "파리", country: "프랑스", lat: 48.8566, lng: 2.3522 },
  { city: "리옹", country: "프랑스", lat: 45.7640, lng: 4.8357 },
];

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const format = searchParams.get("format") || "excel";

  if (format === "json") {
    const template = {
      version: "2.0",
      _설명: "trips 배열은 필수입니다. tripDestinations에 각 여행의 목적지를 여러 개 지정할 수 있습니다. 나머지(photos, favorites, upcoming, coords)는 선택입니다.",
      trips: fullTrips,
      tripDestinations: fullTripDestinations,
      photos: fullPhotos,
      favorites: fullFavorites,
      upcoming: fullUpcoming,
      upcomingDestinations: fullUpcomingDestinations,
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

  const wsTrips = XLSX.utils.json_to_sheet(fullTrips);
  wsTrips["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 30 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsTrips, "여행기록");

  const wsDests = XLSX.utils.json_to_sheet(fullTripDestinations);
  wsDests["!cols"] = [{ wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsDests, "여행목적지");

  const wsPhotos = XLSX.utils.json_to_sheet(fullPhotos);
  wsPhotos["!cols"] = [{ wch: 6 }, { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsPhotos, "사진");

  const wsFav = XLSX.utils.json_to_sheet(fullFavorites);
  wsFav["!cols"] = [{ wch: 12 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsFav, "즐겨찾기");

  const wsUpcoming = XLSX.utils.json_to_sheet(fullUpcoming);
  wsUpcoming["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 26 }];
  XLSX.utils.book_append_sheet(wb, wsUpcoming, "예정된여행");

  const wsUpDests = XLSX.utils.json_to_sheet(fullUpcomingDestinations);
  wsUpDests["!cols"] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, wsUpDests, "예정여행목적지");

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
