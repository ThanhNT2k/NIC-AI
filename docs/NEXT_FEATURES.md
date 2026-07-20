# Tính năng đề xuất tiếp theo

## P0 - Hoàn thiện trust boundary

1. Luồng draft, confirm và submit bằng transaction, version check và idempotency key.
2. RBAC/ABAC theo organization, department và quan hệ với bản ghi; kiểm thử cách ly ít nhất hai tenant.
3. Chuyển authentication production sang Supabase Auth hoặc nhà cung cấp danh tính được phê duyệt; MFA cho tài khoản nội bộ đặc quyền.
4. Audit append-only cho đăng nhập, thay đổi draft, confirm, submit và thay đổi quyền.
5. Rate limit phân tán, CSRF protection cho write action và cơ chế thu hồi toàn bộ session.

## P1 - Hoàn thiện bốn dịch vụ end-user

1. Đặt phòng: danh mục không gian, kiểm tra sức chứa, tiện ích, availability và chống booking trùng.
2. Hỗ trợ: phân loại, mức ưu tiên, file bằng chứng, trao đổi, SLA và timeline trạng thái.
3. Sự kiện: thông tin chương trình, khách, dịch vụ, checklist, phê duyệt và liên kết booking.
4. Thẻ ra vào: danh sách thành viên, thời hạn, khu vực truy cập, quy trình duyệt và thu hồi.
5. Trang “Yêu cầu của tôi” lấy dữ liệu thật, có tìm kiếm, lọc, chi tiết và hủy theo policy.

## P2 - Nâng trải nghiệm và vận hành

1. Notification trong ứng dụng và email với preference, retry và audit.
2. Knowledge base có version, effective date, access scope và citation.
3. NIC Copilot dùng allowlist `search_knowledge`, `check_availability`, `create_request_draft`; không có submit tool.
4. Dashboard xử lý dành riêng cho Service Desk, Facility và Event team, tách khỏi portal end-user theo capability.
5. Observability, structured logging, backup/restore, data retention, accessibility audit và kiểm thử E2E.

## Tiêu chí MVP nên đạt

- Người dùng chỉ đọc và sửa dữ liệu thuộc scope của mình.
- Mọi request chính thức phải đi qua draft hiện tại, xác nhận rõ ràng và submit backend.
- Booking không thể trùng tài nguyên trong cùng thời gian.
- Thay đổi trạng thái và quyền đều truy vết được.
- AI không thể tự gửi, phê duyệt hoặc truy cập dữ liệu ngoài quyền người dùng.
