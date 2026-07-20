"use client";

import { ComponentProps, FormEvent, useEffect, useState } from "react";
import NextImage from "next/image";

type User = { id: string; email: string; fullName: string; organization: string; role: string };
type Service = { code: string; type: string; title: string; copy: string; action: string };
type Draft = { id: string; version: number; confirmedVersion: number | null; status: string };
type ApiPayload = { error?: string; user?: User; draft?: Draft; request?: { id: string } };
type ServiceField = { name: string; label: string; type?: "text" | "date" | "time" | "number" | "tel"; placeholder?: string; min?: string; options?: string[] };
type ServiceForm = { eyebrow: string; detailsLabel: string; detailsPlaceholder: string; fields: ServiceField[] };

function Image(props: ComponentProps<typeof NextImage>) {
  return <NextImage {...props} unoptimized />;
}

const services: Service[] = [
  { code: "01", type: "space_booking", title: "Đặt phòng & không gian", copy: "Tìm phòng phù hợp và gửi yêu cầu đặt chỗ.", action: "Tìm không gian" },
  { code: "02", type: "support", title: "Yêu cầu hỗ trợ", copy: "Báo sự cố, yêu cầu thiết bị hoặc dịch vụ tại NIC.", action: "Tạo yêu cầu" },
  { code: "03", type: "event_registration", title: "Đăng ký sự kiện", copy: "Chuẩn bị thông tin cho sự kiện và khách tham dự.", action: "Bắt đầu đăng ký" },
  { code: "04", type: "access_card", title: "Thẻ & quyền ra vào", copy: "Đăng ký thẻ mới, gia hạn hoặc báo mất thẻ.", action: "Quản lý thẻ" },
];

const serviceForms: Record<string, ServiceForm> = {
  space_booking: {
    eyebrow: "ĐĂNG KÝ KHÔNG GIAN",
    detailsLabel: "Mục đích sử dụng",
    detailsPlaceholder: "Mô tả hoạt động, cách bố trí hoặc thiết bị cần chuẩn bị",
    fields: [
      { name: "date", label: "Ngày sử dụng", type: "date" },
      { name: "startTime", label: "Giờ bắt đầu", type: "time" },
      { name: "endTime", label: "Giờ kết thúc", type: "time" },
      { name: "attendees", label: "Số người dự kiến", type: "number", min: "1", placeholder: "Ví dụ: 20" },
      { name: "space", label: "Không gian mong muốn", options: ["Phòng họp", "Phòng hội thảo", "Không gian sự kiện", "Không gian làm việc chung"] },
    ],
  },
  support: {
    eyebrow: "YÊU CẦU HỖ TRỢ",
    detailsLabel: "Nội dung cần hỗ trợ",
    detailsPlaceholder: "Mô tả hiện trạng, ảnh hưởng và kết quả bạn mong muốn",
    fields: [
      { name: "category", label: "Nhóm hỗ trợ", options: ["Công nghệ thông tin", "Thiết bị & kỹ thuật", "Vệ sinh & tiện ích", "Hành chính", "Khác"] },
      { name: "priority", label: "Mức độ ưu tiên", options: ["Thông thường", "Cần xử lý trong ngày", "Khẩn cấp"] },
      { name: "location", label: "Vị trí cần hỗ trợ", placeholder: "Tòa nhà, tầng, phòng" },
      { name: "desiredTime", label: "Thời gian mong muốn", type: "date" },
    ],
  },
  event_registration: {
    eyebrow: "ĐĂNG KÝ SỰ KIỆN",
    detailsLabel: "Thông tin bổ sung",
    detailsPlaceholder: "Nhu cầu hỗ trợ, yêu cầu tiếp cận hoặc ghi chú cho ban tổ chức",
    fields: [
      { name: "eventName", label: "Tên sự kiện", placeholder: "Sự kiện bạn muốn đăng ký" },
      { name: "eventDate", label: "Ngày tham dự", type: "date" },
      { name: "participants", label: "Số người tham dự", type: "number", min: "1", placeholder: "Ví dụ: 2" },
      { name: "role", label: "Vai trò tham dự", options: ["Khách tham dự", "Diễn giả", "Đối tác", "Đơn vị trưng bày"] },
    ],
  },
  access_card: {
    eyebrow: "ĐĂNG KÝ THẺ RA VÀO",
    detailsLabel: "Lý do đăng ký",
    detailsPlaceholder: "Mô tả nhu cầu cấp mới, gia hạn, thay đổi quyền hoặc báo mất thẻ",
    fields: [
      { name: "requestType", label: "Loại yêu cầu", options: ["Cấp thẻ mới", "Gia hạn thẻ", "Thay đổi quyền ra vào", "Báo mất / cấp lại"] },
      { name: "holderName", label: "Họ tên người sử dụng", placeholder: "Họ và tên trên thẻ" },
      { name: "phone", label: "Số điện thoại liên hệ", type: "tel", placeholder: "Ví dụ: 0912 345 678" },
      { name: "effectiveDate", label: "Ngày bắt đầu sử dụng", type: "date" },
    ],
  },
};

function ServiceRegistrationFields({ service }: { service: Service }) {
  const form = serviceForms[service.type];
  return <>
    <div className="service-form-grid">
      {form.fields.map(field => <label key={field.name}>{field.label}{field.options
        ? <select name={field.name} required defaultValue=""><option value="" disabled>Chọn một phương án</option>{field.options.map(option => <option key={option}>{option}</option>)}</select>
        : <input name={field.name} type={field.type ?? "text"} required min={field.min} maxLength={field.type === "text" || field.type === "tel" || !field.type ? 120 : undefined} placeholder={field.placeholder} />}</label>)}
    </div>
    <label>{form.detailsLabel}<textarea name="details" required minLength={5} maxLength={1000} placeholder={form.detailsPlaceholder} /></label>
  </>;
}

const requests = [
  { id: "REQ-0712", title: "Hỗ trợ thiết bị cho workshop", status: "Đang xử lý", meta: "Cập nhật 12 phút trước", step: 2 },
  { id: "BKG-0685", title: "Phòng họp 3.2", status: "Đã xác nhận", meta: "29/07/2026, 09:00", step: 3 },
  { id: "REQ-0709", title: "Cấp thẻ cho thành viên mới", status: "Cần bổ sung", meta: "Phản hồi trước 17:00 hôm nay", step: 1 },
];

function csrfHeaders(extra: Record<string, string> = {}) {
  const token = document.cookie.split(";").map(value => value.trim()).find(value => value.startsWith("nic_csrf="))?.slice("nic_csrf=".length) ?? "";
  return { ...extra, "X-CSRF-Token": decodeURIComponent(token) };
}

async function readApiPayload(response: Response): Promise<ApiPayload> {
  const body = await response.text();
  if (!body) return {};
  try { return JSON.parse(body) as ApiPayload; } catch { return {}; }
}

export function ConciergeWorkspace() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(true);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Trang chủ");
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null);

  useEffect(() => { fetch("/api/auth/session").then(async response => { if (response.ok) setUser((await response.json()).user); }).finally(() => setAuthChecked(true)); }, []);
  if (!authChecked) return <main className="auth-loading" aria-label="Đang kiểm tra phiên đăng nhập"><span>NIC</span><p>Đang chuẩn bị không gian của bạn...</p></main>;
  if (!user) return <AuthScreen onAuthenticated={setUser} />;

  async function logout() { await fetch("/api/auth/logout", { method: "POST", headers: csrfHeaders() }); setUser(null); }
  async function revokeAllSessions() { if (!window.confirm("Đăng xuất tài khoản này trên tất cả thiết bị?")) return; await fetch("/api/auth/revoke-all", { method: "POST", headers: csrfHeaders() }); setUser(null); }
  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedService) return;
    const form = new FormData(event.currentTarget);
    const registration = serviceForms[selectedService.type];
    const structuredDetails = registration.fields.map(field => `${field.label}: ${String(form.get(field.name) ?? "").trim()}`);
    structuredDetails.push(`${registration.detailsLabel}: ${String(form.get("details") ?? "").trim()}`);
    const response = await fetch("/api/service-drafts", { method: "POST", headers: csrfHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ serviceType: selectedService.type, title: form.get("title"), details: structuredDetails.join("\n") }) });
    const data = await response.json();
    if (!response.ok) return setDraftMessage(data.error ?? "Không thể lưu bản nháp.");
    setActiveDraft(data.draft); setDraftMessage("Đã lưu bản nháp. Hãy kiểm tra thông tin và xác nhận phiên bản hiện tại.");
    event.currentTarget.reset();
  }
  async function confirmDraft() {
    if (!activeDraft) return; const response = await fetch(`/api/service-drafts/${activeDraft.id}/confirm`, { method: "POST", headers: csrfHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ version: activeDraft.version }) }); const data = await response.json();
    if (!response.ok) return setDraftMessage("Bản nháp đã thay đổi. Vui lòng mở lại và kiểm tra phiên bản mới nhất."); setActiveDraft(data.draft); setDraftMessage("Đã xác nhận phiên bản hiện tại. Bạn có thể gửi yêu cầu chính thức.");
  }
  async function submitDraft() {
    if (!activeDraft) return; const response = await fetch(`/api/service-drafts/${activeDraft.id}/submit`, { method: "POST", headers: csrfHeaders({ "Idempotency-Key": crypto.randomUUID() + crypto.randomUUID() }) }); const data = await response.json();
    if (!response.ok) return setDraftMessage("Chưa thể gửi. Bản nháp phải được xác nhận đúng phiên bản hiện tại."); setActiveDraft({ ...activeDraft, status: "submitted" }); setDraftMessage(`Đã gửi yêu cầu ${data.request.id}.`);
  }
  return <main className="portal-shell">
    <a className="skip-link" href="#main-content">Đi đến nội dung chính</a>
    <header className="portal-header">
      <a className="brand-lockup" href="#main-content" aria-label="NIC Service Hub, trang chủ"><Image src="/nic-logo.png" alt="Vietnam National Innovation Center" width={142} height={54} priority /><span><strong>Service Hub</strong><small>Dịch vụ tại NIC</small></span></a>
      <nav className="portal-nav" aria-label="Điều hướng chính">{["Trang chủ", "Yêu cầu của tôi", "Lịch & đặt chỗ", "Trung tâm trợ giúp"].map(item => <button key={item} className={activeNav === item ? "active" : ""} onClick={() => setActiveNav(item)}>{item}</button>)}</nav>
      <div className="header-actions"><button className="notification-button" aria-label="Thông báo, có 2 thông báo mới">2</button><button className="profile-button" onClick={logout} title="Đăng xuất"><span>{user.fullName.split(" ").slice(-1)[0].slice(0,2).toUpperCase()}</span><span><strong>{user.fullName}</strong><small>{user.organization}</small></span></button></div>
    </header>
    <section id="main-content" className="portal-content">
      <section className="welcome-grid">
        <div className="welcome-copy"><p className="date-label">Thứ Hai, 20 tháng 7</p><h1>Chào buổi sáng, {user.fullName.split(" ").slice(-1)[0]}.</h1><p>Bạn cần NIC hỗ trợ việc gì hôm nay?</p><label className="service-search"><span aria-hidden="true">⌕</span><input aria-label="Tìm dịch vụ hoặc hướng dẫn" placeholder="Tìm dịch vụ, không gian hoặc hướng dẫn..." /><kbd>Ctrl K</kbd></label></div>
        <aside className="next-event"><div className="event-date"><strong>25</strong><span>THÁNG 7</span></div><div><span className="event-label">Lịch sắp tới</span><h2>Workshop đổi mới sáng tạo</h2><p>14:00 - 16:30, Phòng hội thảo 2.1</p></div><button aria-label="Xem chi tiết Workshop đổi mới sáng tạo">→</button></aside>
      </section>
      <section className="services-section" aria-labelledby="services-title"><div className="section-heading"><div><h2 id="services-title">Dịch vụ thường dùng</h2><p>Bắt đầu nhanh với các tác vụ phổ biến tại NIC.</p></div><button>Xem tất cả dịch vụ</button></div><div className="service-grid">{services.map(service => <article className="service-card" key={service.code}><span className="service-code">{service.code}</span><div><h3>{service.title}</h3><p>{service.copy}</p></div><button onClick={() => { setSelectedService(service); setDraftMessage(""); setActiveDraft(null); }}>{service.action}<span aria-hidden="true">→</span></button></article>)}</div></section>
      <div className="activity-grid">
        <section className="requests-panel" aria-labelledby="requests-title"><div className="section-heading"><div><h2 id="requests-title">Yêu cầu gần đây</h2><p>Theo dõi tiến độ những việc bạn đã gửi.</p></div><button>Xem tất cả</button></div><div className="request-list">{requests.map(request => <article className="request-item" key={request.id}><div className="request-main"><span>{request.id}</span><strong>{request.title}</strong><small>{request.meta}</small></div><div className="request-progress" aria-label={`Tiến độ ${request.step} trên 3 bước`}>{[1,2,3].map(step => <i key={step} className={step <= request.step ? "done" : ""} />)}</div><b className={`request-status step-${request.step}`}>{request.status}</b><button aria-label={`Mở ${request.title}`}>→</button></article>)}</div></section>
        <aside className="help-panel"><span className="ai-mark">AI</span><div><h2>Hỏi NIC Copilot</h2><p>Tìm chính sách, kiểm tra thông tin hoặc chuẩn bị một bản nháp yêu cầu.</p></div><div className="prompt-list"><button>Phòng nào còn trống chiều nay?</button><button>Quy trình đăng ký khách ra sao?</button></div><button className="primary-action" onClick={() => setCopilotOpen(true)}>Bắt đầu trao đổi <span aria-hidden="true">→</span></button><small>Copilot chỉ chuẩn bị. Bạn luôn là người kiểm tra và quyết định gửi.</small></aside>
      </div>
      <footer className="scope-note"><span>i</span><p>Bạn đang sử dụng dịch vụ trong phạm vi <strong>{user.organization} tại NIC Hòa Lạc</strong>.</p><button onClick={revokeAllSessions}>Đăng xuất mọi thiết bị</button></footer>
    </section>
    <div className={`copilot-overlay ${copilotOpen ? "open" : ""}`} onClick={() => setCopilotOpen(false)} aria-hidden={!copilotOpen} />
    <aside className={`copilot-drawer ${copilotOpen ? "open" : ""}`} aria-label="NIC AI Copilot" aria-hidden={!copilotOpen}><div className="copilot-heading"><div><span>AI</span><div><strong>NIC Copilot</strong><small>Hỗ trợ theo quyền của bạn</small></div></div><button onClick={() => setCopilotOpen(false)} aria-label="Đóng Copilot">×</button></div><div className="copilot-message"><strong>NIC Copilot</strong><p>Tôi có thể tìm hướng dẫn, kiểm tra thông tin hoặc tạo bản nháp. Tôi không thể tự phê duyệt hay gửi yêu cầu.</p></div><div className="copilot-prompts"><button>Kiểm tra phòng trống</button><button>Tìm quy trình liên quan</button><button>Tạo bản nháp yêu cầu</button></div><form className="copilot-composer" onSubmit={event => event.preventDefault()}><label htmlFor="copilot-input">Bạn cần hỗ trợ gì?</label><div><input id="copilot-input" placeholder="Nhập câu hỏi hoặc yêu cầu" /><button type="submit">Gửi</button></div></form></aside>
    {selectedService && <div className="service-modal-layer" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedService(null); }}><section className="service-modal" role="dialog" aria-modal="true" aria-labelledby="service-modal-title"><header><div><span>{activeDraft ? `BẢN NHÁP V${activeDraft.version}` : serviceForms[selectedService.type].eyebrow}</span><h2 id="service-modal-title">{selectedService.title}</h2></div><button onClick={() => setSelectedService(null)} aria-label="Đóng biểu mẫu">×</button></header><p>{selectedService.copy} Thông tin chỉ được gửi sau khi bạn xác nhận đúng phiên bản hiện tại.</p>{!activeDraft ? <form onSubmit={createDraft}><label>Tiêu đề<input name="title" required minLength={3} maxLength={120} placeholder="Tóm tắt nhu cầu của bạn" /></label><ServiceRegistrationFields service={selectedService} />{draftMessage && <p className="form-message" role="status">{draftMessage}</p>}<div><button type="button" onClick={() => setSelectedService(null)}>Để sau</button><button type="submit">Tiếp tục xác nhận</button></div></form> : <div className="draft-review"><div><span>Trạng thái</span><strong>{activeDraft.status === "submitted" ? "Đã gửi" : activeDraft.confirmedVersion === activeDraft.version ? "Đã xác nhận" : "Chờ xác nhận"}</strong></div>{draftMessage && <p className="form-message" role="status">{draftMessage}</p>}<div className="draft-actions"><button onClick={() => setSelectedService(null)}>Đóng</button>{activeDraft.status !== "submitted" && activeDraft.confirmedVersion !== activeDraft.version && <button onClick={confirmDraft}>Tôi đã kiểm tra, xác nhận</button>}{activeDraft.status !== "submitted" && activeDraft.confirmedVersion === activeDraft.version && <button className="submit-request" onClick={submitDraft}>Gửi yêu cầu chính thức</button>}</div></div>}</section></div>}
  </main>;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<"login" | "register">("login"); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setError(""); try { const form = new FormData(event.currentTarget); const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); const data = await readApiPayload(response); if (!response.ok) return setError(data.error ?? "Không thể tiếp tục."); if (!data.user) return setError("Phản hồi từ máy chủ chưa đầy đủ. Vui lòng thử lại."); onAuthenticated(data.user); } catch { setError("Không thể kết nối máy chủ. Vui lòng thử lại."); } finally { setPending(false); } }
  return <main className="auth-shell"><section className="auth-story"><a className="brand-lockup" href="#"><Image src="/nic-logo.png" alt="Vietnam National Innovation Center" width={170} height={65} priority /><span><strong>Service Hub</strong><small>Dịch vụ tại NIC</small></span></a><div><span className="auth-eyebrow">CỔNG DỊCH VỤ NIC</span><h1>Kết nối nguồn lực. Thúc đẩy đổi mới.</h1><p>Đặt không gian, gửi yêu cầu hỗ trợ, đăng ký sự kiện và theo dõi tiến độ tại Trung tâm Đổi mới sáng tạo Quốc gia.</p></div><small>Vietnam National Innovation Center</small></section><section className="auth-panel"><div className="auth-card"><div><span>{mode === "login" ? "CHÀO MỪNG TRỞ LẠI" : "TẠO TÀI KHOẢN"}</span><h2>{mode === "login" ? "Đăng nhập" : "Bắt đầu với NIC"}</h2><p>{mode === "login" ? "Sử dụng tài khoản được cấp để tiếp tục." : "Tạo tài khoản thành viên doanh nghiệp."}</p></div><form onSubmit={submit}>{mode === "register" && <><label>Họ và tên<input name="fullName" required autoComplete="name" /></label><label>Doanh nghiệp<input name="organization" required autoComplete="organization" /></label></>}<label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Mật khẩu<input name="password" type="password" required minLength={10} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" disabled={pending}>{pending ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button></form>{mode === "login" && <aside className="demo-account"><strong>Tài khoản kiểm thử</strong><span>thanh@demo.nic.vn</span><span>Mật khẩu: Demo@12345</span></aside>}<button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}</button></div></section></main>;
}
