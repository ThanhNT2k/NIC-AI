import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const vietnam = Be_Vietnam_Pro({ variable: "--font-vietnam", subsets: ["latin", "vietnamese"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "NIC Operations ERP",
  description: "Hệ thống quản trị vận hành, cơ sở vật chất, sự kiện và dịch vụ doanh nghiệp tại NIC.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body className={vietnam.variable}>{children}</body></html>;
}
