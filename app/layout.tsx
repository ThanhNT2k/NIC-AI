import type { Metadata } from "next";
import "./globals.css";
import "./p2.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://nic-service-hub.ntt-121020.chatgpt.site"),
  title: "NIC Operations ERP",
  description: "Hệ thống quản trị vận hành, cơ sở vật chất, sự kiện và dịch vụ doanh nghiệp tại NIC.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "NIC Operations ERP",
    description: "Vận hành tin cậy. Dữ liệu có kiểm soát.",
    images: [{ url: "/og.png", width: 1732, height: 908, alt: "NIC Operations ERP" }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}</body></html>;
}
