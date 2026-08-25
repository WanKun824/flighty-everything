import type { Metadata } from "next";
import "./globals.css";
import "./journey-theme.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    "https://manyou-travel-ui-demo.zvcdg28tfj.chatgpt.site",
  ),
  title: "flighty Everything — 飞机、火车、汽车与轮船旅行规划",
  description:
    "在网页与 iOS 上统一规划飞机、火车、汽车和轮船行程，并通过实时地图查看完整路线。",
  openGraph: {
    title: "flighty Everything",
    description: "飞机、火车、汽车与轮船，一张地图规划全部旅程。",
    type: "website",
    locale: "zh_CN",
    images: [
      {
        url: "/og.png",
        width: 1672,
        height: 941,
        alt: "flighty Everything 多交通旅行地图",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "flighty Everything",
    description: "飞机、火车、汽车与轮船，一张地图规划全部旅程。",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hans" data-appearance="system" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#05070a" />
      </head>
      <body>{children}</body>
    </html>
  );
}
