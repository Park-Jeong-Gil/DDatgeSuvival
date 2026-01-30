import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DDatge Survival",
  description: "Top-down survival growth game - eat or be eaten!",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
