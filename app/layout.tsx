import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NIC Operations ERP",
  description: "Hệ thống quản trị vận hành, cơ sở vật chất, sự kiện và dịch vụ doanh nghiệp tại NIC.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
