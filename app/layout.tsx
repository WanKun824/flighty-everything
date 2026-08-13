import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://manyou-travel-ui-demo.zvcdg28tfj.chatgpt.site"),
  title: "漫游｜地球仪旅行与朋友",
  description: "在真实地球仪上规划机场、车站、港口与景点，让飞机、汽车、火车和轮船沿行程出发。",
  openGraph: {
    title: "漫游｜把行程放到地球仪上",
    description: "真实地点、行程动画、3D 交通工具与旅行分享。",
    type: "website",
    locale: "zh_CN",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "漫游地球仪行程与四种交通工具" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "漫游｜把行程放到地球仪上",
    description: "真实地点、行程动画、3D 交通工具与旅行分享。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hans"><body>{children}</body></html>;
}
