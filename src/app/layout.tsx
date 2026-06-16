import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Bếp Ngọc Bảo · Hệ thống vận hành",
  description: "Hệ thống quản lý bán hàng, CRM, giao–lắp và hậu mãi cho Bếp Ngọc Bảo.",
};

export const viewport: Viewport = {
  themeColor: "#9e1b32",
};

// Chạy trước khi paint để không nháy sáng/tối
const themeScript = `(function(){try{var t=localStorage.getItem('bnb-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={beVietnam.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
