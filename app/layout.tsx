import type { Metadata } from "next";
import "./globals.css";
import "./journey-theme.css";

const appearanceScript = `(()=>{try{const k="flighty-everything:appearance:v1";const v=localStorage.getItem(k);const m=v==="light"||v==="dark"||v==="system"?v:"system";const r=m==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):m;document.documentElement.dataset.appearance=m;document.documentElement.dataset.theme=r;document.documentElement.style.colorScheme=r}catch{document.documentElement.dataset.appearance="system";document.documentElement.dataset.theme="dark"}})()`;

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
    <html lang="zh-Hans" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#05070a" />
        <script dangerouslySetInnerHTML={{ __html: appearanceScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
