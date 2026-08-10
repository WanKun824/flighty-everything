import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "漫游 — 旅行、地图与朋友",
  description: "发现真实旅程，规划路线，与朋友一起出发。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hans"><body>{children}</body></html>;
}
