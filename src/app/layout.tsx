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
    <html lang="ko" className="m-0 p-0">
      <body className="m-0 p-0">{children}</body>
    </html>
  );
}
