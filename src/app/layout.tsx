import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import { BugReportButton } from "~/components/bug-report-button";
import { Navbar } from "~/components/navbar";
import { PostHogIdentify } from "~/components/posthog-identify";
import { SettingsProvider } from "~/components/settings-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "AlgoPath",
  description: "AI-powered hints and tools for competitive programmers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${geistMono.variable} font-sans`}>
        <SettingsProvider>
          <Navbar />
          {children}
          <BugReportButton />
        </SettingsProvider>
        <PostHogIdentify />
        <Analytics />
      </body>
    </html>
  );
}
