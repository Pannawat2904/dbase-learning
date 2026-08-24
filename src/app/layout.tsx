import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://dbase-learning.vercel.app'),
  title: "DBASE Learning AI | ระบบการเรียนรู้อัจฉริยะ",
  description: "ระบบการเรียนรู้อัจฉริยะสำหรับรายวิชาโปรแกรมฐานข้อมูล DBASE Learning AI",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }
    ],
  },
  openGraph: {
    title: "DBASE Learning AI | ระบบการเรียนรู้อัจฉริยะ",
    description: "ระบบการเรียนรู้อัจฉริยะสำหรับรายวิชาโปรแกรมฐานข้อมูล DBASE Learning AI",
    url: 'https://dbase-learning.vercel.app',
    siteName: 'DBASE Learning AI',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'DBASE Learning AI'
      }
    ],
    locale: 'th_TH',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "DBASE Learning AI | ระบบการเรียนรู้อัจฉริยะ",
    description: "ระบบการเรียนรู้อัจฉริยะสำหรับรายวิชาโปรแกรมฐานข้อมูล DBASE Learning AI",
    images: ['/og-image.png'],
  }
};

import { ConfirmDialogContainer } from "@/components/ui/ConfirmDialog";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="antialiased bg-slate-50 dark:bg-slate-900">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
          <ConfirmDialogContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}
