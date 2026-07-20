import Image from "next/image";
import Link from "next/link";

export function PublicHome() {
  return <main className="public-home">
    <header className="public-header"><Link href="/" className="public-brand"><Image src="/nic-logo.png" alt="Trung tâm Đổi mới sáng tạo Quốc gia" width={156} height={60} priority unoptimized /><span><strong>Service Hub</strong><small>Cổng dịch vụ thành viên NIC</small></span></Link><nav aria-label="Điều hướng trang chủ"><a href="#services">Dịch vụ</a><a href="#how-it-works">Cách hoạt động</a><a href="#support">Hỗ trợ</a></nav><div><a className="public-login" href="/auth">Đăng nhập</a><a className="public-register" href="/auth?mode=register">Đăng ký</a></div></header>
    <section className="public-hero"><div className="public-hero-copy"><span>HỆ SINH THÁI ĐỔI MỚI SÁNG TẠO QUỐC GIA</span><h1>Mọi dịch vụ NIC.<br />Một điểm kết nối.</h1><p>Đặt không gian, đăng ký sự kiện, yêu cầu hỗ trợ và theo dõi tiến độ trong một trải nghiệm dành riêng cho cộng đồng đổi mới sáng tạo.</p><div><a href="/auth?mode=register">Bắt đầu sử dụng</a><a href="#services">Khám phá dịch vụ</a></div><small>NIC Copilot hỗ trợ tìm hiểu và chuẩn bị. Bạn luôn là người xác nhận và quyết định gửi.</small></div><div className="public-hero-visual"><Image src="/nic-banner.jpg" alt="Không gian Trung tâm Đổi mới sáng tạo Quốc gia" fill priority unoptimized /><div><span>NIC HÒA LẠC</span><strong>Không gian kết nối<br />công nghệ và con người</strong></div></div></section>
    <section id="services" className="public-services"><header><span>DỊCH VỤ THÀNH VIÊN</span><h2>Từ nhu cầu đến kết quả,<br />trong một quy trình rõ ràng.</h2></header><div>{[
      ["01", "Không gian & phòng họp", "Tìm và chuẩn bị yêu cầu đặt phòng phù hợp với quy mô hoạt động."],
      ["02", "Hỗ trợ vận hành", "Gửi nhu cầu kỹ thuật, thiết bị và tiện ích đến đúng bộ phận."],
      ["03", "Sự kiện & cộng đồng", "Đăng ký tham dự và quản lý thông tin sự kiện tại NIC."],
      ["04", "Thẻ & quyền ra vào", "Đăng ký cấp mới, gia hạn hoặc thay đổi quyền sử dụng thẻ."],
    ].map(([code, title, copy]) => <article key={code}><span>{code}</span><h3>{title}</h3><p>{copy}</p><a href="/auth?mode=register">Đăng ký dịch vụ →</a></article>)}</div></section>
    <section id="how-it-works" className="public-process"><div><span>QUY TRÌNH MINH BẠCH</span><h2>Ba bước để NIC hỗ trợ đúng nhu cầu.</h2></div><ol><li><strong>01</strong><div><h3>Chọn dịch vụ</h3><p>Chọn đúng nhóm nghiệp vụ và điền biểu mẫu được thiết kế riêng.</p></div></li><li><strong>02</strong><div><h3>Kiểm tra & xác nhận</h3><p>Xem lại bản nháp; NIC Copilot có thể giúp làm rõ thông tin.</p></div></li><li><strong>03</strong><div><h3>Theo dõi tiến độ</h3><p>Nhận trạng thái và phản hồi trong cổng dịch vụ cá nhân.</p></div></li></ol></section>
    <section id="support" className="public-cta"><span>NIC SERVICE HUB</span><h2>Sẵn sàng kết nối với hệ sinh thái NIC?</h2><p>Tạo tài khoản thành viên để bắt đầu sử dụng dịch vụ.</p><a href="/auth?mode=register">Đăng ký ngay</a></section>
    <footer className="public-footer"><span>Vietnam National Innovation Center</span><span>© 2026 NIC Service Hub</span></footer>
  </main>;
}
