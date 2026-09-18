import type { Metadata, Viewport } from "next";
import { Lora, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/hooks/use-auth";
import ReactQueryProvider from "@/lib/providers/react-query-provider";

const lora = Lora({
  subsets: ["latin", "vietnamese"],
  variable: "--font-lora",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-plex",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cashflow Pro — Quản Lý Thu Chi Thông Minh",
  description:
    "Quản lý thu chi cho hộ kinh doanh nhỏ: nhập giao dịch nhanh, AI phân tích dòng tiền, báo cáo tức thì.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cashflow Pro",
  },
  openGraph: {
    title: "Cashflow Pro — Quản Lý Thu Chi",
    description: "Ứng dụng quản lý thu chi thông minh cho hộ kinh doanh",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf6ec",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className={`${lora.variable} ${plexSans.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:rounded-xl focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-paper"
        >
          Bỏ qua đến nội dung chính
        </a>
        <ReactQueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
