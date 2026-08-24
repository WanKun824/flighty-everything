import type { Metadata } from "next";
import "./globals.css";
import "./stream-ui.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://manyou-travel-ui-demo.zvcdg28tfj.chatgpt.site"),
  title: "ORBIT｜让整个旅程，在地球上发生",
  description: "把真实地点、时间、天气和交通工具，编排成一段会播放、会分享的地球行程。",
  openGraph: {
    title: "ORBIT｜Journeys in Motion",
    description: "让整个旅程，在地球上发生。",
    type: "website",
    locale: "zh_CN",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "ORBIT 地球行程动画" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ORBIT｜Journeys in Motion",
    description: "让整个旅程，在地球上发生。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hans"><body>{children}</body></html>;
}
