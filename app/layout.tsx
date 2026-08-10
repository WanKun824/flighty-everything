import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "漫游 — 旅行故事地图",
  description: "以地图为中心，规划、播放与分享你的旅程。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans">
      <body>{children}</body>
    </html>
  );
}
