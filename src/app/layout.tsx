import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Opportunity Radar — AI Opportunity Discovery & Review",
  description: "Find hackathons, internships and developer events from across the web and keep them organized in Notion.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#F1F4FA] text-slate-900 antialiased selection:bg-coral-100 selection:text-coral-900">
        {children}
      </body>
    </html>
  );
}
