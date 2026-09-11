import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/hooks/use-auth";
import ReactQueryProvider from "@/lib/providers/react-query-provider";

const inter = Inter({ subsets: ["latin", "vietnamese"] });

export const metadata: Metadata = {
  title: "AI Quản Lý Thu Chi — Thông Minh Hơn Mỗi Ngày",
  description:
    "Quản lý thu chi cho hộ kinh doanh nhỏ: chụp ảnh hóa đơn, AI tự phân loại, báo cáo dòng tiền tức thì.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Thu Chi AI",
  },
  openGraph: {
    title: "AI Quản Lý Thu Chi",
    description: "Ứng dụng quản lý thu chi thông minh cho hộ kinh doanh",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" className="dark">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={inter.className}>
        <ReactQueryProvider>
          <AuthProvider>{children}</AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
