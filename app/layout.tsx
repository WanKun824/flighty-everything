import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://manyou-travel-ui-demo.zvcdg28tfj.chatgpt.site"),
  title: "flighty Everything — Your flights, beautifully tracked",
  description: "Track flights, airports, friends, weather and personal aviation stats on a live globe.",
  openGraph: {
    title: "flighty Everything",
    description: "Flights, airports, weather and your aviation passport on one live globe.",
    type: "website",
    locale: "en_US",
    images: [{ url: "/og.png", width: 1672, height: 941, alt: "flighty Everything live flight globe" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "flighty Everything",
    description: "Flights, airports, weather and your aviation passport on one live globe.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
