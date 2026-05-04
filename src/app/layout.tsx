import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GoodTrip — 나의 여행 기록",
  description: "전 세계 여행 기록을 남기고 다양한 방식으로 볼 수 있는 여행 일지",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background font-sans">
        <Sidebar />
        <main className="lg:ml-64 min-h-screen">
          <div className="p-4 pt-16 lg:p-8 lg:pt-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
