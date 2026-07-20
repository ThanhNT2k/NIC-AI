# Layout theo role

## 1. Nguyên tắc chung

Sau đăng nhập, mọi user dùng chung ERP shell nhưng nhận navigation, dashboard, quick action và data scope khác nhau. Không nên duy trì nhiều ứng dụng frontend tách biệt nếu cùng một domain; dùng cấu hình capability-driven để giảm sai lệch.

```text
┌─────────────────────────────────────────────────────────────┐
│ Top bar: Organization | Global search | Copilot | Alerts | User │
├──────────────┬──────────────────────────────────────────────┤
│ Role-aware   │ Breadcrumb / page actions                   │
│ navigation   ├──────────────────────────────────────────────┤
│              │ Dashboard hoặc workspace theo role           │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

AI Copilot mở ở side panel/drawer hoặc command bar. Copilot không thay thế navigation chính.

## 2. Cơ chế chọn layout

1. Server xác thực session.
2. Server tải membership, active organization, role assignments và capabilities.
3. Chọn landing page theo role ưu tiên hoặc preference đã lưu.
4. Tạo menu từ capabilities, không từ chuỗi role hard-code.
5. Mọi page/API tiếp tục authorization độc lập.

Nếu user có nhiều role hoặc nhiều organization, top bar cung cấp context switcher. Đổi context phải tải lại permission/data scope và tạo audit event nếu chuyển sang privileged context.

## 3. Layout Ban lãnh đạo

**Landing page:** Executive Dashboard.

- KPI toàn NIC: occupancy, số sự kiện, SLA, backlog, asset downtime.
- Biểu đồ xu hướng và cảnh báo vượt ngưỡng.
- Danh sách vấn đề cần quyết định/phê duyệt.
- Navigation: Dashboard, Reports, Approvals, Organizations, Facilities, Events.
- Quick actions: xem báo cáo, duyệt item; không mặc định tạo/sửa dữ liệu vận hành.

## 4. Layout Trưởng phòng

**Landing page:** Department Operations.

- Workload của phòng, SLA, công việc quá hạn và lịch hôm nay.
- Approval queue thuộc scope.
- Năng lực/nhân sự và phân công.
- Navigation phụ thuộc phòng ban, kèm Requests, Tasks, Reports, Knowledge.
- Quick actions: phân công, phê duyệt, escalation, tạo báo cáo.

## 5. Layout Facility Manager/Staff

**Manager landing:** Facility Control Center.

- Bản đồ/cây site–building–floor–space.
- Trạng thái phòng, tài sản, maintenance và booking liên quan.
- Work order queue, SLA và lịch bảo trì.
- Navigation: Spaces, Assets, Maintenance, Bookings, Facility Requests, Reports.

**Staff landing:** My Work Queue.

- Công việc được giao, ưu tiên, SLA countdown và checklists.
- Mobile-friendly actions: nhận việc, cập nhật, thêm bằng chứng, hoàn thành.
- Không hiển thị báo cáo quản trị hoặc cấu hình ngoài scope.

## 6. Layout Event Manager/Staff

**Manager landing:** Event Operations.

- Calendar sự kiện/booking, xung đột và trạng thái chuẩn bị.
- Approval queue, resource gaps và upcoming milestones.
- Navigation: Events, Calendar, Bookings, Guests, Services, Event Requests, Reports.

**Staff landing:** Today’s Events.

- Timeline hôm nay, checklist, nhiệm vụ và thông tin khách cần thiết.
- Chỉ hiển thị event được phân công hoặc scope phòng ban.

## 7. Layout Service Desk

**Landing page:** Request Triage Queue.

- Inbox request mới, chưa phân loại, sắp vi phạm SLA và bị trả lại.
- Bộ lọc theo loại, độ ưu tiên, đơn vị xử lý và trạng thái.
- Navigation: Requests, Assignment Board, SLA Monitor, Organizations, Knowledge.
- Quick actions: phân loại, gán đơn vị, yêu cầu bổ sung, escalation.

## 8. Layout Tenant Admin/Member

**Tenant admin landing:** Organization Portal.

- Request/booking của doanh nghiệp, sự kiện sắp tới và thành viên.
- Navigation: Overview, My Organization, Members, Requests, Bookings, Events, Knowledge.
- Quick actions: mời thành viên, tạo draft request/booking.

**Tenant member landing:** My Workspace.

- Request của tôi, booking/sự kiện liên quan và notification.
- Navigation: Home, My Requests, My Bookings, Events, Knowledge.
- Không có màn hình quản lý membership nếu thiếu permission.

## 9. Layout Admin/Security/Auditor

### System/Security Admin

- Landing: System Health hoặc Access Management tùy capability.
- Navigation: Users, Organizations, Roles, Permissions, Sessions, Integrations, Configuration, Security Events.
- Màn hình nghiệp vụ không xuất hiện mặc định.
- Hành động đặc quyền yêu cầu re-authentication/MFA khi phù hợp.

### Auditor

- Landing: Compliance Dashboard.
- Navigation: Audit Explorer, Access Reviews, Data Exports, Policy Reports.
- UI read-only, export có watermark/audit và giới hạn scope.

## 10. Copilot theo role

| Role | Copilot được hỗ trợ | Copilot không được làm |
|---|---|---|
| Executive | Tóm tắt KPI, tìm nguyên nhân từ dữ liệu được phép | Sửa dữ liệu hoặc phê duyệt tự động |
| Manager | Tóm tắt workload, tạo draft phân công/phê duyệt | Tự giao việc hoặc phê duyệt |
| Staff | Tìm SOP, tóm tắt nhiệm vụ, tạo draft cập nhật | Xem dữ liệu ngoài assignment |
| Service Desk | Phân loại đề xuất, tìm routing/SOP | Tự gửi/gán request |
| Tenant | Hỏi chính sách, tạo draft request/booking | Truy cập dữ liệu tenant khác |
| Admin | Giải thích cấu hình/quyền ở mức được phép | Tự cấp role hoặc mở break-glass |
| Auditor | Tóm tắt audit evidence | Thay đổi bản ghi hoặc policy |

## 11. Trạng thái UI bắt buộc

- `403 Forbidden`: giải thích thiếu quyền, không rò rỉ sự tồn tại/nội dung bản ghi.
- Empty state theo role, không mời user thực hiện hành động họ không có quyền.
- Read-only state rõ ràng khi user được xem nhưng không được sửa.
- Context badge luôn cho biết organization/department hiện hành.
- Impersonation/break-glass banner nổi bật, có countdown và nút thoát.
- Action bị từ chối ở backend phải được xử lý đúng kể cả khi UI từng hiển thị nút.

