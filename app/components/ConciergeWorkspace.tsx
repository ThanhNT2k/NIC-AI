"use client";

import { useMemo, useState } from "react";

type Role = "executive" | "facility" | "event" | "tenant";

type RoleView = {
  label: string;
  position: string;
  greeting: string;
  description: string;
  navigation: string[];
  metrics: { label: string; value: string; delta: string; tone?: "warning" }[];
  queueTitle: string;
  queue: { title: string; meta: string; status: string; owner: string }[];
};

const views: Record<Role, RoleView> = {
  executive: {
    label: "Ban lãnh đạo",
    position: "Giám đốc vận hành",
    greeting: "Tổng quan vận hành NIC",
    description: "Theo dõi công suất, SLA và các quyết định cần xử lý trong hôm nay.",
    navigation: ["Tổng quan", "Phê duyệt", "Báo cáo", "Doanh nghiệp", "Cơ sở", "Sự kiện"],
    metrics: [
      { label: "Công suất không gian", value: "74%", delta: "+6% so với tuần trước" },
      { label: "Sự kiện tuần này", value: "18", delta: "4 sự kiện cần phối hợp" },
      { label: "Yêu cầu trong SLA", value: "91%", delta: "Mục tiêu nội bộ 95%", tone: "warning" },
      { label: "Việc cần phê duyệt", value: "07", delta: "2 việc ưu tiên cao", tone: "warning" },
    ],
    queueTitle: "Quyết định cần xử lý",
    queue: [
      { title: "Phê duyệt kế hoạch Vietnam Innovation Forum", meta: "Sự kiện • 25/07/2026", status: "Ưu tiên cao", owner: "Phòng Sự kiện" },
      { title: "Điều chỉnh ngân sách bảo trì hệ thống HVAC", meta: "Cơ sở vật chất • Tòa nhà A", status: "Chờ duyệt", owner: "Nguyễn Minh Anh" },
      { title: "Gia hạn quyền truy cập nhà cung cấp An Phát", meta: "Quản trị • Hết hạn sau 2 ngày", status: "Cần xem xét", owner: "IT Security" },
    ],
  },
  facility: {
    label: "Cơ sở vật chất",
    position: "Facility Manager",
    greeting: "Trung tâm điều phối cơ sở",
    description: "Kiểm soát không gian, tài sản, bảo trì và hàng đợi công việc của đội ngũ.",
    navigation: ["Tổng quan", "Không gian", "Tài sản", "Bảo trì", "Booking", "Yêu cầu", "Báo cáo"],
    metrics: [
      { label: "Không gian sẵn sàng", value: "42/48", delta: "3 phòng đang được sử dụng" },
      { label: "Work order đang mở", value: "16", delta: "5 việc đến hạn hôm nay" },
      { label: "Tài sản cần bảo trì", value: "09", delta: "2 hạng mục quá hạn", tone: "warning" },
      { label: "SLA xử lý", value: "94%", delta: "+3% trong 30 ngày" },
    ],
    queueTitle: "Hàng đợi cơ sở vật chất",
    queue: [
      { title: "Kiểm tra điều hòa phòng hội thảo 2.1", meta: "REQ-2026-0718 • Còn 01:42 SLA", status: "Đang xử lý", owner: "Trần Quốc Huy" },
      { title: "Chuẩn bị thiết bị cho workshop AI", meta: "EVT-2026-0251 • 25/07, 14:00", status: "Đã phân công", owner: "Đội AV" },
      { title: "Bảo trì định kỳ máy phát điện", meta: "MNT-2026-0088 • Tòa nhà B", status: "Đến hạn", owner: "Lê Hải Nam" },
    ],
  },
  event: {
    label: "Sự kiện",
    position: "Event Manager",
    greeting: "Điều hành sự kiện",
    description: "Theo dõi lịch, nguồn lực, xung đột booking và các mốc chuẩn bị quan trọng.",
    navigation: ["Tổng quan", "Sự kiện", "Lịch", "Booking", "Khách mời", "Dịch vụ", "Yêu cầu"],
    metrics: [
      { label: "Sự kiện sắp tới", value: "12", delta: "Trong 14 ngày tiếp theo" },
      { label: "Booking đã xác nhận", value: "28", delta: "6 booking hôm nay" },
      { label: "Xung đột cần xử lý", value: "03", delta: "1 xung đột ưu tiên cao", tone: "warning" },
      { label: "Checklist hoàn tất", value: "86%", delta: "18 mục chưa hoàn thành" },
    ],
    queueTitle: "Sự kiện cần chú ý",
    queue: [
      { title: "Workshop đổi mới sáng tạo", meta: "25/07, 14:00 • 30 khách", status: "Đang chuẩn bị", owner: "Phạm Thu Hà" },
      { title: "Vietnam Innovation Forum", meta: "28/07, 08:30 • 240 khách", status: "Chờ phê duyệt", owner: "Nguyễn Thùy Linh" },
      { title: "Đón đoàn doanh nghiệp Nhật Bản", meta: "29/07, 10:00 • 18 khách", status: "Thiếu thông tin", owner: "Trần Anh Tuấn" },
    ],
  },
  tenant: {
    label: "Doanh nghiệp tại NIC",
    position: "Tenant Admin",
    greeting: "Không gian doanh nghiệp",
    description: "Quản lý thành viên, booking và các yêu cầu vận hành của doanh nghiệp bạn.",
    navigation: ["Trang chủ", "Doanh nghiệp", "Thành viên", "Yêu cầu", "Booking", "Sự kiện", "Tri thức"],
    metrics: [
      { label: "Yêu cầu đang mở", value: "05", delta: "2 yêu cầu đang được xử lý" },
      { label: "Booking sắp tới", value: "04", delta: "Booking gần nhất vào 25/07" },
      { label: "Thành viên hoạt động", value: "18", delta: "2 lời mời đang chờ" },
      { label: "Việc cần bổ sung", value: "02", delta: "Cần phản hồi trước 17:00", tone: "warning" },
    ],
    queueTitle: "Yêu cầu của doanh nghiệp",
    queue: [
      { title: "Workshop đổi mới sáng tạo", meta: "REQ-2026-0712 • Cập nhật 12 phút trước", status: "Đang xử lý", owner: "NIC Event Team" },
      { title: "Cấp thẻ ra vào cho thành viên mới", meta: "REQ-2026-0709 • 3 thành viên", status: "Cần bổ sung", owner: "Nguyễn Thanh" },
      { title: "Đăng ký sử dụng phòng họp 3.2", meta: "REQ-2026-0685 • 29/07, 09:00", status: "Đã xác nhận", owner: "Facility Desk" },
    ],
  },
};

const schedule = [
  { time: "08:30", title: "Họp điều phối vận hành", place: "Phòng 2.3", type: "Nội bộ" },
  { time: "10:00", title: "Đón đoàn TechX Vietnam", place: "Sảnh Innovation", type: "Tiếp khách" },
  { time: "14:00", title: "Workshop đổi mới sáng tạo", place: "Hội thảo 2.1", type: "Sự kiện" },
  { time: "16:30", title: "Kiểm tra an toàn cuối ngày", place: "Tòa nhà A", type: "Cơ sở" },
];

export function ConciergeWorkspace() {
  const [role, setRole] = useState<Role>("executive");
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [activeNav, setActiveNav] = useState("Tổng quan");
  const view = views[role];
  const initials = useMemo(() => (role === "tenant" ? "NT" : "MA"), [role]);

  function changeRole(nextRole: Role) {
    setRole(nextRole);
    setActiveNav(views[nextRole].navigation[0]);
  }

  return (
    <main className="erp-shell">
      <a className="skip-link" href="#main-content">Đi đến nội dung chính</a>
      <aside className="erp-sidebar" aria-label="Điều hướng ERP">
        <div className="brand-lockup">
          <span className="brand-mark">NIC</span>
          <span><strong>Operations</strong><small>Enterprise Resource Planning</small></span>
        </div>

        <div className="context-block">
          <span>Không gian làm việc</span>
          <strong>NIC Hòa Lạc</strong>
          <small>{view.label}</small>
        </div>

        <nav className="erp-nav" aria-label="Phân hệ được cấp quyền">
          <span className="nav-heading">Phân hệ</span>
          {view.navigation.map((item, index) => (
            <button key={item} className={activeNav === item ? "active" : ""} onClick={() => setActiveNav(item)}>
              <span className="nav-glyph" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              {item}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <button className="help-button"><span aria-hidden="true">?</span>Trung tâm hỗ trợ</button>
          <div className="identity-card">
            <span className="avatar">{initials}</span>
            <span><strong>{role === "tenant" ? "Nguyễn Thanh" : "Minh Anh"}</strong><small>{view.position}</small></span>
            <button aria-label="Mở menu tài khoản">•••</button>
          </div>
        </div>
      </aside>

      <section className="erp-main" id="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>NIC Operations</span><b>/</b><strong>{activeNav}</strong></div>
          <div className="top-actions">
            <label className="global-search"><span aria-hidden="true">⌕</span><input aria-label="Tìm kiếm toàn hệ thống" placeholder="Tìm kiếm trong phạm vi được cấp quyền" /></label>
            <button className="icon-button" aria-label="Thông báo"><span aria-hidden="true">!</span><i>3</i></button>
            <button className="copilot-button" onClick={() => setCopilotOpen(true)}><span aria-hidden="true">AI</span>Copilot</button>
          </div>
        </header>

        <div className="dashboard">
          <section className="dashboard-intro">
            <div>
              <p className="date-copy">Thứ Hai, 20 tháng 7 năm 2026</p>
              <h1>{view.greeting}</h1>
              <p>{view.description}</p>
            </div>
            <label className="role-switcher">
              <span>Xem layout theo vai trò</span>
              <select value={role} onChange={(event) => changeRole(event.target.value as Role)}>
                <option value="executive">Ban lãnh đạo</option>
                <option value="facility">Facility Manager</option>
                <option value="event">Event Manager</option>
                <option value="tenant">Tenant Admin</option>
              </select>
              <small>Mô phỏng UI, không thay thế authorization backend</small>
            </label>
          </section>

          <section className="metrics-grid" aria-label="Chỉ số vận hành">
            {view.metrics.map((metric) => (
              <article className="metric" key={metric.label}>
                <span>{metric.label}</span>
                <strong>{metric.value}</strong>
                <small className={metric.tone === "warning" ? "warning" : ""}>{metric.delta}</small>
              </article>
            ))}
          </section>

          <div className="operations-grid">
            <section className="work-panel">
              <div className="panel-heading"><div><h2>{view.queueTitle}</h2><p>Dữ liệu được giới hạn theo role và phạm vi hiện tại.</p></div><button>Xem tất cả</button></div>
              <div className="queue-table" role="table" aria-label={view.queueTitle}>
                <div className="queue-row queue-header" role="row"><span>Nội dung</span><span>Phụ trách</span><span>Trạng thái</span><span /></div>
                {view.queue.map((item) => (
                  <div className="queue-row" role="row" key={item.title}>
                    <span><strong>{item.title}</strong><small>{item.meta}</small></span>
                    <span>{item.owner}</span>
                    <span><b className="status-badge">{item.status}</b></span>
                    <button aria-label={`Mở ${item.title}`}>Mở</button>
                  </div>
                ))}
              </div>
            </section>

            <aside className="schedule-panel">
              <div className="panel-heading"><div><h2>Lịch vận hành hôm nay</h2><p>4 hoạt động đã được xác nhận.</p></div><button aria-label="Mở lịch đầy đủ">Lịch</button></div>
              <div className="schedule-list">
                {schedule.map((item) => <article key={`${item.time}-${item.title}`}><time>{item.time}</time><span><strong>{item.title}</strong><small>{item.place} / {item.type}</small></span></article>)}
              </div>
              <button className="secondary-action">Tạo lịch công việc</button>
            </aside>
          </div>

          <section className="access-notice">
            <span className="notice-mark" aria-hidden="true">i</span>
            <div><strong>Phạm vi truy cập đang hoạt động</strong><p>Bạn đang xem dữ liệu thuộc {view.label} tại NIC Hòa Lạc. Mọi thao tác quan trọng được ghi audit.</p></div>
            <button>Xem quyền của tôi</button>
          </section>
        </div>
      </section>

      <div className={`copilot-overlay ${copilotOpen ? "open" : ""}`} onClick={() => setCopilotOpen(false)} aria-hidden={!copilotOpen} />
      <aside className={`copilot-drawer ${copilotOpen ? "open" : ""}`} aria-label="NIC AI Copilot" aria-hidden={!copilotOpen}>
        <div className="copilot-heading"><div><span>AI</span><div><strong>NIC Copilot</strong><small>Hỗ trợ theo quyền của bạn</small></div></div><button onClick={() => setCopilotOpen(false)} aria-label="Đóng Copilot">×</button></div>
        <div className="copilot-context"><strong>Ngữ cảnh hiện tại</strong><span>{view.label} / {activeNav}</span></div>
        <div className="copilot-message"><strong>NIC Copilot</strong><p>Tôi có thể tóm tắt dữ liệu đang hiển thị, tìm quy trình hoặc tạo bản nháp. Tôi không thể tự phê duyệt hay gửi yêu cầu.</p></div>
        <div className="copilot-prompts"><button>Tóm tắt việc ưu tiên</button><button>Tìm quy trình liên quan</button><button>Tạo bản nháp yêu cầu</button></div>
        <form className="copilot-composer" onSubmit={(event) => event.preventDefault()}><label htmlFor="copilot-input">Trao đổi với Copilot</label><div><input id="copilot-input" placeholder="Nhập câu hỏi hoặc yêu cầu" /><button type="submit">Gửi</button></div></form>
      </aside>
    </main>
  );
}
