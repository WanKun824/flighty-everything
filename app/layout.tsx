import type { Metadata } from "next";
import "./globals.css";
import "./stream-ui.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://manyou-travel-ui-demo.zvcdg28tfj.chatgpt.site"),
  title: "ORBIT｜让地球播放你的旅程",
  description: "在真实地球上规划路线、播放交通动画、记录旅程，并与旅行者分享故事。",
  openGraph: {
    title: "ORBIT｜Journeys in Motion",
    description: "真实地点、行程动画、旅行分享与社区故事。",
    type: "website",
    locale: "zh_CN",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "ORBIT 地球行程" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "ORBIT｜Journeys in Motion",
    description: "让地球播放你的旅程。",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hans"><body>{children}</body></html>;
}
