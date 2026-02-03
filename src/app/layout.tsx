import type { Metadata } from "next";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: "DDatge Survival",
  description: "survival growth game - eat or be eaten!",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "DDatge Survival",
    description: "survival growth game - eat or be eaten!",
    images: [
      {
        url: "/thumb.jpg",
        width: 1200,
        height: 630,
        alt: "DDatge Survival",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DDatge Survival",
    description: "survival growth game - eat or be eaten!",
    images: ["/thumb.jpg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="m-0 p-0">
      <body className="m-0 p-0">{children}</body>
      <Analytics />
    </html>
  );
}
