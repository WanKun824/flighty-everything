import type { Metadata } from "next";
import "./globals.css";
import "./journey-theme.css";
import "./journey-refinement.css";

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
    <html lang="zh-Hans" data-appearance="system" data-theme="light" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#eef4fb" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var key="flighty-everything:appearance:v1";var saved=localStorage.getItem(key);var mode=saved==="light"||saved==="dark"||saved==="system"?saved:"system";var resolved=mode==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):mode;var root=document.documentElement;root.dataset.appearance=mode;root.dataset.theme=resolved;root.style.colorScheme=resolved;}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
