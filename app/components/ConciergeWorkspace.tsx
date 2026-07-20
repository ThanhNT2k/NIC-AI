"use client";

import { FormEvent, useEffect, useState } from "react";

type User = { id: string; email: string; fullName: string; organization: string; role: string };
type Service = { code: string; type: string; title: string; copy: string; action: string };

const services: Service[] = [
  { code: "01", type: "space_booking", title: "Đặt phòng & không gian", copy: "Tìm phòng phù hợp và gửi yêu cầu đặt chỗ.", action: "Tìm không gian" },
  { code: "02", type: "support", title: "Yêu cầu hỗ trợ", copy: "Báo sự cố, yêu cầu thiết bị hoặc dịch vụ tại NIC.", action: "Tạo yêu cầu" },
  { code: "03", type: "event_registration", title: "Đăng ký sự kiện", copy: "Chuẩn bị thông tin cho sự kiện và khách tham dự.", action: "Bắt đầu đăng ký" },
  { code: "04", type: "access_card", title: "Thẻ & quyền ra vào", copy: "Đăng ký thẻ mới, gia hạn hoặc báo mất thẻ.", action: "Quản lý thẻ" },
];

const requests = [
  { id: "REQ-0712", title: "Hỗ trợ thiết bị cho workshop", status: "Đang xử lý", meta: "Cập nhật 12 phút trước", step: 2 },
  { id: "BKG-0685", title: "Phòng họp 3.2", status: "Đã xác nhận", meta: "29/07/2026, 09:00", step: 3 },
  { id: "REQ-0709", title: "Cấp thẻ cho thành viên mới", status: "Cần bổ sung", meta: "Phản hồi trước 17:00 hôm nay", step: 1 },
];

export function ConciergeWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(true);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Trang chủ");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [draftMessage, setDraftMessage] = useState("");

  useEffect(() => { fetch("/api/auth/session").then(async response => { if (response.ok) setUser((await response.json()).user); }).finally(() => setAuthChecked(true)); }, []);
  if (!authChecked) return <main className="auth-loading" aria-label="Đang kiểm tra phiên đăng nhập"><span>NIC</span><p>Đang chuẩn bị không gian của bạn...</p></main>;
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); setUser(null); }
  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedService) return;
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/service-drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ serviceType: selectedService.type, title: form.get("title"), details: form.get("details") }) });
    const data = await response.json();
    if (!response.ok) return setDraftMessage(data.error ?? "Không thể lưu bản nháp.");
    setDraftMessage("Đã lưu bản nháp. Bạn có thể kiểm tra lại trước khi xác nhận và gửi.");
    event.currentTarget.reset();
  }
  return <main className="portal-shell">
    <a className="skip-link" href="#main-content">Đi đến nội dung chính</a>
    <header className="portal-header">
      <a className="brand-lockup" href="#main-content" aria-label="NIC Service Hub, trang chủ"><span className="brand-mark">NIC</span><span><strong>Service Hub</strong><small>Dịch vụ tại NIC</small></span></a>
      <nav className="portal-nav" aria-label="Điều hướng chính">{["Trang chủ", "Yêu cầu của tôi", "Lịch & đặt chỗ", "Trung tâm trợ giúp"].map(item => <button key={item} className={activeNav === item ? "active" : ""} onClick={() => setActiveNav(item)}>{item}</button>)}</nav>
      <div className="header-actions"><button className="notification-button" aria-label="Thông báo, có 2 thông báo mới">2</button><button className="profile-button" onClick={logout} title="Đăng xuất"><span>{user.fullName.split(" ").slice(-1)[0].slice(0,2).toUpperCase()}</span><span><strong>{user.fullName}</strong><small>{user.organization}</small></span></button></div>
    </header>
    <section id="main-content" className="portal-content">
      <section className="welcome-grid">
        <div className="welcome-copy"><p className="date-label">Thứ Hai, 20 tháng 7</p><h1>Chào buổi sáng, {user.fullName.split(" ").slice(-1)[0]}.</h1><p>Bạn cần NIC hỗ trợ việc gì hôm nay?</p><label className="service-search"><span aria-hidden="true">⌕</span><input aria-label="Tìm dịch vụ hoặc hướng dẫn" placeholder="Tìm dịch vụ, không gian hoặc hướng dẫn..." /><kbd>Ctrl K</kbd></label></div>
        <aside className="next-event"><div className="event-date"><strong>25</strong><span>THÁNG 7</span></div><div><span className="event-label">Lịch sắp tới</span><h2>Workshop đổi mới sáng tạo</h2><p>14:00 - 16:30, Phòng hội thảo 2.1</p></div><button aria-label="Xem chi tiết Workshop đổi mới sáng tạo">→</button></aside>
      </section>
      <section className="services-section" aria-labelledby="services-title"><div className="section-heading"><div><h2 id="services-title">Dịch vụ thường dùng</h2><p>Bắt đầu nhanh với các tác vụ phổ biến tại NIC.</p></div><button>Xem tất cả dịch vụ</button></div><div className="service-grid">{services.map(service => <article className="service-card" key={service.code}><span className="service-code">{service.code}</span><div><h3>{service.title}</h3><p>{service.copy}</p></div><button onClick={() => { setSelectedService(service); setDraftMessage(""); }}>{service.action}<span aria-hidden="true">→</span></button></article>)}</div></section>
      <div className="activity-grid">
        <section className="requests-panel" aria-labelledby="requests-title"><div className="section-heading"><div><h2 id="requests-title">Yêu cầu gần đây</h2><p>Theo dõi tiến độ những việc bạn đã gửi.</p></div><button>Xem tất cả</button></div><div className="request-list">{requests.map(request => <article className="request-item" key={request.id}><div className="request-main"><span>{request.id}</span><strong>{request.title}</strong><small>{request.meta}</small></div><div className="request-progress" aria-label={`Tiến độ ${request.step} trên 3 bước`}>{[1,2,3].map(step => <i key={step} className={step <= request.step ? "done" : ""} />)}</div><b className={`request-status step-${request.step}`}>{request.status}</b><button aria-label={`Mở ${request.title}`}>→</button></article>)}</div></section>
        <aside className="help-panel"><span className="ai-mark">AI</span><div><h2>Hỏi NIC Copilot</h2><p>Tìm chính sách, kiểm tra thông tin hoặc chuẩn bị một bản nháp yêu cầu.</p></div><div className="prompt-list"><button>Phòng nào còn trống chiều nay?</button><button>Quy trình đăng ký khách ra sao?</button></div><button className="primary-action" onClick={() => setCopilotOpen(true)}>Bắt đầu trao đổi <span aria-hidden="true">→</span></button><small>Copilot chỉ chuẩn bị. Bạn luôn là người kiểm tra và quyết định gửi.</small></aside>
      </div>
      <footer className="scope-note"><span>i</span><p>Bạn đang sử dụng dịch vụ trong phạm vi <strong>Innovate Vietnam tại NIC Hòa Lạc</strong>.</p><button>Xem quyền của tôi</button></footer>
    </section>
    <div className={`copilot-overlay ${copilotOpen ? "open" : ""}`} onClick={() => setCopilotOpen(false)} aria-hidden={!copilotOpen} />
    <aside className={`copilot-drawer ${copilotOpen ? "open" : ""}`} aria-label="NIC AI Copilot" aria-hidden={!copilotOpen}><div className="copilot-heading"><div><span>AI</span><div><strong>NIC Copilot</strong><small>Hỗ trợ theo quyền của bạn</small></div></div><button onClick={() => setCopilotOpen(false)} aria-label="Đóng Copilot">×</button></div><div className="copilot-message"><strong>NIC Copilot</strong><p>Tôi có thể tìm hướng dẫn, kiểm tra thông tin hoặc tạo bản nháp. Tôi không thể tự phê duyệt hay gửi yêu cầu.</p></div><div className="copilot-prompts"><button>Kiểm tra phòng trống</button><button>Tìm quy trình liên quan</button><button>Tạo bản nháp yêu cầu</button></div><form className="copilot-composer" onSubmit={event => event.preventDefault()}><label htmlFor="copilot-input">Bạn cần hỗ trợ gì?</label><div><input id="copilot-input" placeholder="Nhập câu hỏi hoặc yêu cầu" /><button type="submit">Gửi</button></div></form></aside>
    {selectedService && <div className="service-modal-layer" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedService(null); }}><section className="service-modal" role="dialog" aria-modal="true" aria-labelledby="service-modal-title"><header><div><span>BẢN NHÁP DỊCH VỤ</span><h2 id="service-modal-title">{selectedService.title}</h2></div><button onClick={() => setSelectedService(null)} aria-label="Đóng biểu mẫu">×</button></header><p>{selectedService.copy} Thông tin chỉ được lưu ở trạng thái bản nháp.</p><form onSubmit={createDraft}><label>Tiêu đề<input name="title" required minLength={3} maxLength={120} placeholder="Tóm tắt nhu cầu của bạn" /></label><label>Thông tin chi tiết<textarea name="details" required minLength={5} maxLength={2000} placeholder="Thời gian, địa điểm, số lượng hoặc thông tin cần hỗ trợ" /></label>{draftMessage && <p className="form-message" role="status">{draftMessage}</p>}<div><button type="button" onClick={() => setSelectedService(null)}>Để sau</button><button type="submit">Lưu bản nháp</button></div></form></section></div>}
  </main>;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login"); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setError(""); const form = new FormData(event.currentTarget); const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); const data = await response.json(); setPending(false); if (!response.ok) return setError(data.error ?? "Không thể tiếp tục."); onAuthenticated(data.user); }
  return <main className="auth-shell"><section className="auth-story"><a className="brand-lockup" href="#"><span className="brand-mark">NIC</span><span><strong>Service Hub</strong><small>Dịch vụ tại NIC</small></span></a><div><span className="auth-eyebrow">MỘT ĐIỂM ĐẾN</span><h1>Mọi dịch vụ tại NIC, trong một không gian.</h1><p>Đặt phòng, gửi yêu cầu hỗ trợ, đăng ký sự kiện và theo dõi tiến độ của bạn.</p></div><small>NIC Operations ERP</small></section><section className="auth-panel"><div className="auth-card"><div><span>{mode === "login" ? "CHÀO MỪNG TRỞ LẠI" : "TẠO TÀI KHOẢN"}</span><h2>{mode === "login" ? "Đăng nhập" : "Bắt đầu với NIC"}</h2><p>{mode === "login" ? "Sử dụng tài khoản được cấp để tiếp tục." : "Tạo tài khoản thành viên doanh nghiệp."}</p></div><form onSubmit={submit}>{mode === "register" && <><label>Họ và tên<input name="fullName" required autoComplete="name" /></label><label>Doanh nghiệp<input name="organization" required autoComplete="organization" /></label></>}<label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Mật khẩu<input name="password" type="password" required minLength={10} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" disabled={pending}>{pending ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button></form>{mode === "login" && <aside className="demo-account"><strong>Tài khoản kiểm thử</strong><span>thanh@demo.nic.vn</span><span>Mật khẩu: Demo@12345</span></aside>}<button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}</button></div></section></main>;
}
