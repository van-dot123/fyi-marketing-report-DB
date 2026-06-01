import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import PageTitle from "@/components/PageTitle";
import DateRangePicker, { DateRangeProvider } from "@/components/DateRangePicker";

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
      <body className="antialiased">
        <DateRangeProvider>
          <div className="flex h-screen overflow-hidden bg-slate-50">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
              <header className="flex items-center justify-between border-b border-slate-200 bg-white px-8 py-5">
                <PageTitle />
                <DateRangePicker />
              </header>
              <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
            </div>
          </div>
        </DateRangeProvider>
      </body>
    </html>
  );
}
