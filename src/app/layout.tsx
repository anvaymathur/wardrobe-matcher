import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/app/_components/SiteHeader";
import { BottomNav } from "@/app/_components/BottomNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wardrobe Matcher",
  description: "Catalog your clothes and track which items pair well together.",
  appleWebApp: { capable: true, title: "Wardrobe", statusBarStyle: "default" },
  icons: { apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#111827",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden" suppressHydrationWarning>
        <SiteHeader />
        <main className="flex-1 pb-24 pt-[env(safe-area-inset-top)] sm:pb-0 sm:pt-0">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
