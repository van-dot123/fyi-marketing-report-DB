import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FYI Vietnam Marketing Dashboard",
  description: "Marketing performance reporting across SNS, GA4, and Meta Ads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
