import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Navbar } from "~/components/navbar";
import { SettingsProvider } from "~/components/settings-provider";
import { ThemeProvider } from "./theme-provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider>
          <SettingsProvider>
            <Navbar />
            {children}
          </SettingsProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
