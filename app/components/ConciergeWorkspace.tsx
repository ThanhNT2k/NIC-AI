"use client";

import { ComponentProps, FormEvent, useEffect, useState } from "react";
import NextImage from "next/image";
import { PortalHeader } from "./PortalHeader";

type User = { id: string; email: string; fullName: string; organization: string; role: string; departmentCode?: string | null; capabilities?: string[] };
type Service = { code: string; type: string; title: string; copy: string; action: string };
type Draft = { id: string; version: number; confirmedVersion: number | null; status: string };
type ApiPayload = { error?: string; user?: User; draft?: Draft; request?: { id: string } };
type PortalView = "home" | "requests" | "bookings" | "help";
type PortalRequest = { id:string;title:string;status:string;createdAt:number;updatedAt:number|null };
type PortalBooking = { id:string;title:string;startsAt:number;endsAt:number;spaceName:string;status:string };
type ChatMessage = { role: "user" | "assistant"; text: string; sources?: string[]; suggestedService?: string };
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

const roleLabels: Record<string, string> = {
  tenant_member: "Thành viên khách hàng", customer_member: "Thành viên khách hàng", tenant_admin: "Quản trị doanh nghiệp", customer_admin: "Quản trị doanh nghiệp",
  service_desk: "Service Desk", facility_staff: "Nhân viên Facility", facility_manager: "Quản lý Facility", event_staff: "Nhân viên Event", event_manager: "Quản lý Event", security_staff: "An ninh & khách", system_admin: "Quản trị hệ thống", auditor: "Kiểm toán viên",
};

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

const requestStatusLabels:Record<string,string>={submitted:"Đã tiếp nhận",triaged:"Đã phân loại",in_progress:"Đang xử lý",waiting_customer:"Cần bổ sung",resolved:"Đã hoàn tất",cancelled:"Đã hủy"};
const requestSteps:Record<string,number>={submitted:1,triaged:1,in_progress:2,waiting_customer:2,resolved:3,cancelled:3};

function csrfHeaders(extra: Record<string, string> = {}) {
  const token = document.cookie.split(";").map(value => value.trim()).find(value => value.startsWith("nic_csrf="))?.slice("nic_csrf=".length) ?? "";
  return { ...extra, "X-CSRF-Token": decodeURIComponent(token) };
}

async function readApiPayload(response: Response): Promise<ApiPayload> {
  const body = await response.text();
  if (!body) return {};
  try { return JSON.parse(body) as ApiPayload; } catch { return {}; }
}

function PortalSection({ view, user, onCopilot }: { view: Exclude<PortalView, "home">; user: User; onCopilot: () => void }) {
  const content = {
    requests: { eyebrow: "THEO DÕI DỊCH VỤ", title: "Yêu cầu của tôi", copy: "Xem trạng thái, phản hồi và các bước cần hoàn tất cho mọi yêu cầu đã gửi." },
    bookings: { eyebrow: "KHÔNG GIAN NIC", title: "Lịch & đặt chỗ", copy: "Khám phá không gian phù hợp và chuẩn bị yêu cầu đặt chỗ theo lịch của bạn." },
    help: { eyebrow: "TRI THỨC VẬN HÀNH", title: "Trung tâm trợ giúp", copy: "Tìm quy trình, chính sách và câu trả lời được kiểm chứng trước khi tạo yêu cầu." },
  }[view];
  return <main className="portal-shell"><PortalHeader active={view} user={user}/><section className="portal-page"><header className="portal-page-heading"><span>{content.eyebrow}</span><h1>{content.title}</h1><p>{content.copy}</p></header>{view === "requests" && null}{view === "bookings" && <div className="space-catalog">{[
    ["Phòng hội thảo 2.1", "80 người", "Trống từ 13:30", "Màn hình LED · Âm thanh"],
    ["Phòng họp 3.2", "12 người", "Trống từ 15:00", "Họp trực tuyến · Bảng viết"],
    ["Innovation Hall", "250 người", "Còn 2 khung giờ", "Sự kiện · Trưng bày"],
  ].map(([name, capacity, availability, equipment]) => <article key={name}><span className="availability-dot">CÓ THỂ ĐẶT</span><h2>{name}</h2><p>{capacity} · {equipment}</p><strong>{availability}</strong><a href="/portal">Chuẩn bị yêu cầu đặt chỗ</a></article>)}</div>}{view === "help" && <div className="help-layout"><section className="knowledge-list">{[
    ["Đặt phòng và không gian", "Điều kiện, thời hạn và quy trình xác nhận đặt chỗ."],
    ["Đăng ký khách và thẻ ra vào", "Hướng dẫn cung cấp thông tin và thời gian xử lý."],
    ["Hỗ trợ kỹ thuật tại sự kiện", "Danh mục thiết bị và đầu mối hỗ trợ vận hành."],
    ["Quy định sử dụng cơ sở vật chất", "Trách nhiệm của đơn vị đăng ký và người sử dụng."],
  ].map(([title, copy], index) => <article key={title}><span>0{index + 1}</span><div><h2>{title}</h2><p>{copy}</p></div><button>Đọc hướng dẫn</button></article>)}</section><aside className="help-copilot"><span>AI COPILOT</span><h2>Chưa tìm thấy câu trả lời?</h2><p>Hỏi NIC Copilot để tìm đúng hướng dẫn hoặc chuẩn bị bản nháp dịch vụ.</p><button onClick={onCopilot}>Bắt đầu trao đổi</button></aside></div>}</section></main>;
}

function CopilotDrawer({ open, onClose, onSelectService }: { open: boolean; onClose: () => void; onSelectService: (type: string) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", text: "Chào bạn. Tôi có thể tìm hướng dẫn, kiểm tra thông tin sẵn có hoặc giúp chuẩn bị form dịch vụ. Tôi không thể tự gửi yêu cầu thay bạn." }]);
  const [pending, setPending] = useState(false);
  async function send(text: string) {
    const query = text.trim();
    if (!query || pending) return;
    const history = messages.slice(-8).map(({ role, text: turnText }) => ({ role, text: turnText }));
    setMessages(current => [...current, { role: "user", text: query }]);
    setPending(true);
    try {
      const response = await fetch("/api/copilot", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: query, history }) });
      const data = await response.json() as { answer?: string; sources?: string[]; suggestedService?: string };
      setMessages(current => [...current, { role: "assistant", text: data.answer ?? "Tôi chưa thể xử lý câu hỏi này.", sources: data.sources, suggestedService: data.suggestedService }]);
    } catch {
      setMessages(current => [...current, { role: "assistant", text: "Kết nối đang gián đoạn. Bạn vui lòng thử lại." }]);
    } finally { setPending(false); }
  }
  return <><div className={`copilot-overlay ${open ? "open" : ""}`} onClick={onClose} aria-hidden={!open} /><aside className={`copilot-drawer ${open ? "open" : ""}`} aria-label="NIC AI Copilot" aria-hidden={!open}><div className="copilot-heading"><div><span>AI</span><div><strong>NIC Copilot</strong><small>Tra cứu và chuẩn bị, không tự gửi</small></div></div><button onClick={onClose} aria-label="Đóng Copilot">×</button></div><div className="copilot-thread" aria-live="polite">{messages.map((message, index) => <article key={index} className={`chat-bubble ${message.role}`}><strong>{message.role === "assistant" ? "NIC Copilot" : "Bạn"}</strong><p>{message.text}</p>{message.sources?.length ? <div className="chat-sources">{message.sources.map(source => <span key={source}>{source}</span>)}</div> : null}{message.suggestedService ? <button onClick={() => onSelectService(message.suggestedService!)}>Mở form để kiểm tra</button> : null}</article>)}{pending && <div className="chat-typing">NIC Copilot đang tìm thông tin...</div>}</div><div className="copilot-prompts">{["Phòng nào phù hợp cho 20 người?", "Quy trình đăng ký khách ra sao?", "Tôi cần hỗ trợ thiết bị"].map(prompt => <button key={prompt} onClick={() => send(prompt)}>{prompt}</button>)}</div><form className="copilot-composer" onSubmit={event => { event.preventDefault(); const input = new FormData(event.currentTarget).get("message")?.toString() ?? ""; void send(input); event.currentTarget.reset(); }}><label htmlFor="copilot-input">Bạn cần hỗ trợ gì?</label><div><input id="copilot-input" name="message" required placeholder="Nhập câu hỏi hoặc yêu cầu" /><button type="submit" disabled={pending}>Gửi</button></div></form></aside></>;
}

export function ConciergeWorkspace({ view = "home" }: { view?: PortalView }) {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [draftError, setDraftError] = useState(false);
  const [draftPending, setDraftPending] = useState(false);
  const [activeDraft, setActiveDraft] = useState<Draft | null>(null);
  const [recentRequests,setRecentRequests]=useState<PortalRequest[]>([]);
  const [upcomingBookings,setUpcomingBookings]=useState<PortalBooking[]>([]);
  const [homeDataLoading,setHomeDataLoading]=useState(true);
  const [homeDataError,setHomeDataError]=useState("");

  useEffect(() => { fetch("/api/auth/session").then(async response => { if (response.ok) setUser((await response.json()).user); }).finally(() => setAuthChecked(true)); }, []);
  useEffect(() => { if (authChecked && !user) window.location.replace("/auth"); }, [authChecked, user]);
  useEffect(()=>{if(!user||view!=="home")return;let mounted=true;Promise.all([fetch("/api/requests",{headers:{Accept:"application/json"}}),fetch("/api/bookings",{headers:{Accept:"application/json"}})]).then(async([requestResponse,bookingResponse])=>{if(requestResponse.status===401||bookingResponse.status===401){location.href="/auth";return;}const[requestData,bookingData]=await Promise.all([requestResponse.json(),bookingResponse.json()]) as [{requests?:PortalRequest[]},{bookings?:PortalBooking[]}];if(!requestResponse.ok||!bookingResponse.ok)throw new Error("HOME_DATA_FAILED");if(!mounted)return;const now=Math.floor(Date.now()/1000);setRecentRequests((requestData.requests??[]).slice(0,3));setUpcomingBookings((bookingData.bookings??[]).filter(item=>item.status==="confirmed"&&item.endsAt>=now).sort((left,right)=>left.startsAt-right.startsAt));setHomeDataError("");}).catch(()=>{if(mounted)setHomeDataError("Chưa thể tải hoạt động mới nhất. Vui lòng thử lại sau.");}).finally(()=>{if(mounted)setHomeDataLoading(false);});return()=>{mounted=false;};},[user,view]);
  if (!authChecked) return <main className="auth-loading" aria-label="Đang kiểm tra phiên đăng nhập"><span>NIC</span><p>Đang chuẩn bị không gian của bạn...</p></main>;
  if (!user) return <main className="auth-loading"><span>NIC</span><p>Đang chuyển đến trang đăng nhập...</p></main>;

  async function revokeAllSessions() { if (!window.confirm("Đăng xuất tài khoản này trên tất cả thiết bị?")) return; await fetch("/api/auth/revoke-all", { method: "POST", headers: csrfHeaders() }); setUser(null); }
  async function createDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selectedService) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const registration = serviceForms[selectedService.type];
    const structuredDetails = registration.fields.map(field => `${field.label}: ${String(form.get(field.name) ?? "").trim()}`);
    structuredDetails.push(`${registration.detailsLabel}: ${String(form.get("details") ?? "").trim()}`);
    setDraftPending(true); setDraftError(false); setDraftMessage("");
    try {
      const response = await fetch("/api/service-drafts", { method: "POST", headers: csrfHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ serviceType: selectedService.type, title: form.get("title"), details: structuredDetails.join("\n") }) });
      const data = await readApiPayload(response);
      if (!response.ok || !data.draft) { setDraftError(true); setDraftMessage(data.error ?? "Không thể lưu bản nháp. Vui lòng thử lại."); return; }
      formElement.reset();
      setActiveDraft(data.draft); setDraftMessage("Đã lưu bản nháp. Hãy kiểm tra thông tin và xác nhận phiên bản hiện tại.");
    } catch {
      setDraftError(true); setDraftMessage("Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.");
    } finally { setDraftPending(false); }
  }
  async function confirmDraft() {
    if (!activeDraft) return; const response = await fetch(`/api/service-drafts/${activeDraft.id}/confirm`, { method: "POST", headers: csrfHeaders({ "Content-Type": "application/json" }), body: JSON.stringify({ version: activeDraft.version }) }); const data = await response.json();
    if (!response.ok) return setDraftMessage("Bản nháp đã thay đổi. Vui lòng mở lại và kiểm tra phiên bản mới nhất."); setActiveDraft(data.draft); setDraftMessage("Đã xác nhận phiên bản hiện tại. Bạn có thể gửi yêu cầu chính thức.");
  }
  async function submitDraft() {
    if (!activeDraft) return; const response = await fetch(`/api/service-drafts/${activeDraft.id}/submit`, { method: "POST", headers: csrfHeaders({ "Idempotency-Key": crypto.randomUUID() + crypto.randomUUID() }) }); const data = await response.json();
    if (!response.ok) return setDraftMessage("Chưa thể gửi. Bản nháp phải được xác nhận đúng phiên bản hiện tại."); setActiveDraft({ ...activeDraft, status: "submitted" }); setDraftMessage(`Đã gửi yêu cầu ${data.request.id}.`);
  }
  if (view !== "home") return <><PortalSection view={view} user={user} onCopilot={() => setCopilotOpen(true)} /><CopilotDrawer open={copilotOpen} onClose={() => setCopilotOpen(false)} onSelectService={() => { window.location.href = "/portal"; }} /></>;
  return <main className="portal-shell">
    <a className="skip-link" href="#main-content">Đi đến nội dung chính</a>
    <PortalHeader active="home" user={user}/>
    <section id="main-content" className="portal-content">
      <section className="welcome-grid">
        <div className="welcome-copy"><p className="date-label">{new Intl.DateTimeFormat("vi-VN",{weekday:"long",day:"numeric",month:"long"}).format(new Date())}</p><h1>Chào buổi sáng, {user.fullName.split(" ").slice(-1)[0]}.</h1><p>Bạn cần NIC hỗ trợ việc gì hôm nay?</p><label className="service-search"><span aria-hidden="true">⌕</span><input aria-label="Tìm dịch vụ hoặc hướng dẫn" placeholder="Tìm dịch vụ, không gian hoặc hướng dẫn..." /><kbd>Ctrl K</kbd></label></div>
        {upcomingBookings[0]?<aside className="next-event"><div className="event-date"><strong>{new Date(upcomingBookings[0].startsAt*1000).getDate()}</strong><span>THÁNG {new Date(upcomingBookings[0].startsAt*1000).getMonth()+1}</span></div><div><span className="event-label">Lịch sắp tới</span><h2>{upcomingBookings[0].title}</h2><p>{new Date(upcomingBookings[0].startsAt*1000).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})} - {new Date(upcomingBookings[0].endsAt*1000).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}, {upcomingBookings[0].spaceName}</p></div><a href="/portal/bookings" aria-label={`Mở lịch ${upcomingBookings[0].title}`}>→</a></aside>:<aside className="next-event empty"><div><span className="event-label">Lịch sắp tới</span><h2>{homeDataLoading?"Đang tải lịch...":"Chưa có lịch đã xác nhận"}</h2><p>Kiểm tra không gian khả dụng và tạo booking mới.</p></div><a href="/portal/bookings">Mở lịch</a></aside>}
      </section>
      <section className="customer-scope" aria-label="Quyền của tài khoản"><div><span>PHẠM VI TÀI KHOẢN</span><strong>{roleLabels[user.role] ?? user.role}</strong></div><p>Bạn có thể tạo yêu cầu, đặt không gian, đăng ký khách và theo dõi dữ liệu thuộc phạm vi {user.role.includes("admin") ? "doanh nghiệp" : "cá nhân"}. Mỗi yêu cầu sẽ được chuyển đến đúng đội vận hành NIC.</p><a href="/portal/requests">Xem yêu cầu được phép truy cập</a></section>
      <section className="services-section" aria-labelledby="services-title"><div className="section-heading"><div><h2 id="services-title">Dịch vụ thường dùng</h2><p>Bắt đầu nhanh với các tác vụ phổ biến tại NIC.</p></div><button>Xem tất cả dịch vụ</button></div><div className="service-grid">{services.map(service => <article className="service-card" key={service.code}><span className="service-code">{service.code}</span><div><h3>{service.title}</h3><p>{service.copy}</p></div><button onClick={() => { setSelectedService(service); setDraftMessage(""); setActiveDraft(null); }}>{service.action}<span aria-hidden="true">→</span></button></article>)}</div></section>
      <div className="activity-grid">
        <section className="requests-panel" aria-labelledby="requests-title"><div className="section-heading"><div><h2 id="requests-title">Yêu cầu gần đây</h2><p>Theo dõi tiến độ những việc bạn đã gửi.</p></div><a href="/portal/requests">Xem tất cả</a></div>{homeDataError?<p className="portal-inline-state" role="alert">{homeDataError}</p>:homeDataLoading?<div className="portal-inline-state" aria-busy="true">Đang tải yêu cầu...</div>:recentRequests.length===0?<div className="portal-inline-state"><strong>Chưa có yêu cầu chính thức.</strong><a href="#services-title">Bắt đầu từ một dịch vụ</a></div>:<div className="request-list">{recentRequests.map(request=>{const step=requestSteps[request.status]??1;return <article className="request-item" key={request.id}><div className="request-main"><span>{request.id}</span><strong>{request.title}</strong><small>Cập nhật {new Date((request.updatedAt??request.createdAt)*1000).toLocaleString("vi-VN")}</small></div><div className="request-progress" aria-label={`Tiến độ ${step} trên 3 bước`}>{[1,2,3].map(value=><i key={value} className={value<=step?"done":""}/>)}</div><b className={`request-status step-${step}`}>{requestStatusLabels[request.status]??request.status}</b><a className="request-open" href="/portal/requests" aria-label={`Mở ${request.title}`}>→</a></article>;})}</div>}</section>
        <aside className="help-panel"><span className="ai-mark">AI</span><div><h2>Hỏi NIC Copilot</h2><p>Tìm chính sách, kiểm tra thông tin hoặc chuẩn bị một bản nháp yêu cầu.</p></div><div className="prompt-list"><button>Phòng nào còn trống chiều nay?</button><button>Quy trình đăng ký khách ra sao?</button></div><button className="primary-action" onClick={() => setCopilotOpen(true)}>Bắt đầu trao đổi <span aria-hidden="true">→</span></button><small>Copilot chỉ chuẩn bị. Bạn luôn là người kiểm tra và quyết định gửi.</small></aside>
      </div>
      <footer className="scope-note"><span>i</span><p>Bạn đang sử dụng dịch vụ trong phạm vi <strong>{user.organization} tại NIC Hòa Lạc</strong>.</p><button onClick={revokeAllSessions}>Đăng xuất mọi thiết bị</button></footer>
    </section>
    <CopilotDrawer open={copilotOpen} onClose={() => setCopilotOpen(false)} onSelectService={type => { const service = services.find(item => item.type === type); if (service) { setSelectedService(service); setActiveDraft(null); setDraftMessage(""); } }} />
    {selectedService && <div className="service-modal-layer" role="presentation" onMouseDown={event => { if (!draftPending && event.target === event.currentTarget) setSelectedService(null); }}><section className="service-modal" role="dialog" aria-modal="true" aria-labelledby="service-modal-title" aria-busy={draftPending}><header><div><span>{activeDraft ? `BẢN NHÁP V${activeDraft.version}` : serviceForms[selectedService.type].eyebrow}</span><h2 id="service-modal-title">{selectedService.title}</h2></div><button disabled={draftPending} onClick={() => setSelectedService(null)} aria-label="Đóng biểu mẫu">×</button></header><p>{selectedService.copy} Thông tin chỉ được gửi sau khi bạn xác nhận đúng phiên bản hiện tại.</p>{!activeDraft ? <form onSubmit={createDraft}><label>Tiêu đề<input name="title" required minLength={3} maxLength={120} placeholder="Tóm tắt nhu cầu của bạn" /></label><ServiceRegistrationFields service={selectedService} />{draftMessage && <p className={`form-message ${draftError ? "error" : ""}`} role={draftError ? "alert" : "status"}>{draftMessage}</p>}<div className="service-form-actions"><button type="button" disabled={draftPending} onClick={() => setSelectedService(null)}>Để sau</button><button type="submit" disabled={draftPending}>{draftPending ? "Đang lưu..." : "Tiếp tục xác nhận"}</button></div></form> : <div className="draft-review"><div><span>Trạng thái</span><strong>{activeDraft.status === "submitted" ? "Đã gửi" : activeDraft.confirmedVersion === activeDraft.version ? "Đã xác nhận" : "Chờ xác nhận"}</strong></div>{draftMessage && <p className="form-message" role="status">{draftMessage}</p>}<div className="draft-actions"><button onClick={() => setSelectedService(null)}>Đóng</button>{activeDraft.status !== "submitted" && activeDraft.confirmedVersion !== activeDraft.version && <button onClick={confirmDraft}>Tôi đã kiểm tra, xác nhận</button>}{activeDraft.status !== "submitted" && activeDraft.confirmedVersion === activeDraft.version && <button className="submit-request" onClick={submitDraft}>Gửi yêu cầu chính thức</button>}</div></div>}</section></div>}
  </main>;
}

export function AuthScreen({ onAuthenticated, initialMode = "login" }: { onAuthenticated: (user: User) => void; initialMode?: "login" | "register" }) {
  const [mode, setMode] = useState<"login" | "register">(initialMode); const [error, setError] = useState(()=>{if(typeof location==="undefined")return "";const code=new URLSearchParams(location.search).get("enterpriseError");return code?(code==="MFA_REQUIRED"?"Tài khoản đặc quyền phải hoàn tất MFA tại nhà cung cấp danh tính.":"Đăng nhập enterprise không thành công. Vui lòng liên hệ quản trị viên."):""}); const [pending, setPending] = useState(false); const [enterpriseEnabled,setEnterpriseEnabled]=useState(false);
  useEffect(()=>{fetch("/api/auth/enterprise/config").then(response=>response.json()).then(value=>setEnterpriseEnabled(Boolean(value.enabled))).catch(()=>undefined)},[]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setPending(true); setError(""); try { const form = new FormData(event.currentTarget); const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form)) }); const data = await readApiPayload(response); if (data.enterpriseLogin) { location.href=data.enterpriseLogin; return; } if (!response.ok) return setError(data.error ?? "Không thể tiếp tục."); if (!data.user) return setError("Phản hồi từ máy chủ chưa đầy đủ. Vui lòng thử lại."); onAuthenticated(data.user); } catch { setError("Không thể kết nối máy chủ. Vui lòng thử lại."); } finally { setPending(false); } }
  return <main className="auth-shell"><section className="auth-story"><a className="brand-lockup" href="#"><Image src="/nic-logo.png" alt="Vietnam National Innovation Center" width={170} height={65} priority /><span><strong>Service Hub</strong><small>Dịch vụ tại NIC</small></span></a><div><span className="auth-eyebrow">CỔNG DỊCH VỤ NIC</span><h1>Kết nối nguồn lực. Thúc đẩy đổi mới.</h1><p>Đặt không gian, gửi yêu cầu hỗ trợ, đăng ký sự kiện và theo dõi tiến độ tại Trung tâm Đổi mới sáng tạo Quốc gia.</p></div><small>Vietnam National Innovation Center</small></section><section className="auth-panel"><div className="auth-card"><div><span>{mode === "login" ? "CHÀO MỪNG TRỞ LẠI" : "TẠO TÀI KHOẢN"}</span><h2>{mode === "login" ? "Đăng nhập" : "Bắt đầu với NIC"}</h2><p>{mode === "login" ? "Sử dụng tài khoản được cấp để tiếp tục." : "Tạo tài khoản thành viên doanh nghiệp."}</p></div>{mode==="login"&&enterpriseEnabled&&<a className="enterprise-login" href="/api/auth/enterprise/start">Đăng nhập Enterprise SSO / MFA</a>}<form onSubmit={submit}>{mode === "register" && <><label>Họ và tên<input name="fullName" required autoComplete="name" /></label><label>Doanh nghiệp<input name="organization" required autoComplete="organization" /></label></>}<label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Mật khẩu<input name="password" type="password" required minLength={10} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>{error && <p className="auth-error" role="alert">{error}</p>}<button className="auth-submit" disabled={pending}>{pending ? "Đang xử lý..." : mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}</button></form>{mode === "login" && <aside className="demo-account"><strong>Tài khoản kiểm thử local</strong><span>thanh@demo.nic.vn</span><span>Mật khẩu: Demo@12345</span></aside>}<button className="auth-switch" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>{mode === "login" ? "Chưa có tài khoản? Đăng ký" : "Đã có tài khoản? Đăng nhập"}</button></div></section></main>;
}
