# P1 — Độ tin cậy vận hành

Lát cắt backend cho các issue Kanban #1–#5 được triển khai trong migration `drizzle/0007_p1_operational_reliability.sql`.

## Work order operation

- `operation_templates` và `operation_template_tasks` lưu checklist có thứ tự, kỹ năng, thời lượng và vật tư yêu cầu.
- Khi tạo work order, task của template active được snapshot sang `work_order_tasks`.
- `PATCH /api/work-orders/:id/tasks` cập nhật task; task bắt buộc không được bỏ qua.
- Yêu cầu đóng tạo `work_order_close_approvals`; `POST /api/work-orders/:id/close` yêu cầu Facility Manager khác người yêu cầu quyết định.

## SLA và escalation

- `business_calendars`, holiday và hàm `addBusinessMinutes` hỗ trợ giờ làm việc, ngày nghỉ, timezone.
- SLA pause/resume lưu lý do, actor và kéo các mốc theo thời gian pause qua `POST /api/operations/p1`.
- `POST /api/cron/sla` dùng `SLA_CRON_SECRET`, sinh warning/failure idempotent và đánh dấu provider response quá hạn.
- `GET /api/operations/p1` cung cấp job log, deadline và approval queue theo capability.

## Resource và provider

- Resource profile có work calendar, location, skill/certificate và hạn hiệu lực.
- Backend chỉ book resource đủ kỹ năng; trigger SQLite chặn confirmed window giao nhau kể cả concurrent write.
- Provider membership giới hạn assignment được phản hồi. Accept/reject/accept-with-change tăng version, lưu response history và đưa accept-with-change về trạng thái chờ NIC.

## IAM

- Access review có deadline, evidence và retain/revoke; revoke vô hiệu membership và session hiện có.
- Role/SLA/master-data change đi qua `configuration_changes`; database và API đều chặn maker tự duyệt.
- Mọi transition quan trọng được ghi vào `audit_logs`.

## Cấu hình vận hành

- Đặt `SLA_CRON_SECRET` ở server runtime và cấu hình scheduler gọi `/api/cron/sla`.
- Calendar, template, resource skill, provider membership và tài khoản demo quản trị/provider được seed trong migration `0007`; quản trị viên có thể tạo version template và access review tại `/portal/reliability`.
- Work order tự tạo SLA instance và provider assignment; cảnh báo in-app được sinh idempotent. Scheduler hạ tầng gọi cron bằng secret runtime.
- Tài khoản demo bổ sung: `admin@demo.nic.vn` và `provider@demo.nic.vn`, dùng mật khẩu demo hiện có.
