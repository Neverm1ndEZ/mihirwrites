import type { Metadata } from "next";
import { Lora, DM_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import Navbar from "@/components/Navbar";
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL_MAIN || "http://localhost:3000" || "http://localhost:8080"
  ),
  title: {
    default: "Mihir Writes",
    template: "Mihir Writes | %s",
  },
  description: "Personal blog by Mihir — thoughts on something, nothing, and everything in between.",
  keywords: ["blog", "personal", "something", "nothing", "everything"],
  authors: [{ name: "Mihir" }],
  creator: "Mihir",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL_MAIN,
    siteName: "Mihir Writes",
    title: "Mihir Writes",
    description:
      "Personal blog by Mihir — thoughts on something, nothing, and everything in between.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mihir Writes",
    description:
      "Personal blog by Mihir — thoughts on something, nothing, and everything in between.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${lora.variable} ${dmSans.variable}`}>
        <ThemeProvider>
          <Navbar />
          <main>{children}</main>
          <Analytics />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
