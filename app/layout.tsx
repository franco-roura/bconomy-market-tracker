import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Bconomy Market Tracker",
    template: "%s | Bconomy Market Tracker",
  },
  description:
    "Track real-time market prices in the Bconomy marketplace. Get insights into price history, volume, and market performance.",
  keywords: [
    "bconomy market",
    "bconomy price charts",
    "bconomy price history",
    "bconomy item prices",
  ],
  authors: [{ name: "Bconomy Market Tracker" }],
  creator: "Bconomy Market Tracker",
  publisher: "Bconomy Market Tracker",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    title: "Bconomy Market Tracker",
    description: "Track real-time market prices in the Bconomy marketplace.",
    siteName: "Bconomy Market Tracker",
    images: [
      {
        url: "/og-image.png",
        width: 225,
        height: 225,
        alt: "Bconomy Market Tracker - Real-time market price tracking and analysis",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bconomy Market Tracker",
    description:
      "Track real-time market prices, analyze trends, and monitor item statistics in the Bconomy marketplace.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "games",
  classification: "game market tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
