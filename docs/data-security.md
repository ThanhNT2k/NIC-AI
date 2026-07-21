# Dữ liệu, RLS và audit

## 1. Mô hình dữ liệu mục tiêu

Migration hiện tại đã có `request_drafts`, `service_requests`, `request_comments`, `knowledge_chunks` và `audit_logs`. Trước production cần bổ sung ít nhất:

- `request_status_events`: lịch sử chuyển trạng thái.
- `knowledge_documents`: metadata cấp tài liệu và versioning.
- Cấu trúc tenant/membership nếu NIC phục vụ nhiều đơn vị có vùng dữ liệu riêng.
- Idempotency records cho thao tác submit.

## 2. RLS

RLS là defense-in-depth, không thay thế authorization tại service layer.

- User chỉ đọc/tạo/sửa draft của mình.
- Policy update draft MUST ngăn đổi `owner_id` và ngăn cập nhật draft đã submit.
- User chỉ đọc request của mình; operator chỉ đọc phạm vi được phân công.
- Knowledge được lọc theo access scope và tenant.
- Client không có quyền insert/update/delete audit log.
- Các bảng mới MUST bật RLS trước khi cấp quyền.

`service_requests` và `request_comments` dùng RLS bắt buộc theo owner, organization, assigned user và operational team. Quyền ghi trực tiếp của role `anon`/`authenticated` bị thu hồi; mutation phải đi qua backend sau khi kiểm tra capability, CSRF, trạng thái và ghi audit.

Migration hiện tại cho phép update với `with check owner_id = auth.uid()` nhưng enforcement version/confirmation vẫn cần transaction/function phía server. Cần có integration tests chạy với JWT của ít nhất hai user để chứng minh không rò rỉ chéo.

## 3. Audit log

Các event tối thiểu:

- `draft.created`, `draft.updated`, `draft.confirmed`.
- `request.submitted`, `request.status_changed`, `request.cancelled`.
- `knowledge.created`, `knowledge.published`, `knowledge.retired`.
- Thay đổi role/quyền và các lần authorization bị từ chối đáng chú ý.

Mỗi event SHOULD có actor, action, entity, timestamp, request/correlation ID, source, phiên bản trước/sau ở dạng redacted và lý do nếu là thao tác vận hành. Audit phải append-only; retention và quyền đọc cần được quy định riêng.

## 4. Bảo vệ dữ liệu

- TLS khi truyền; encryption at rest theo nền tảng Supabase.
- Service-role key chỉ ở backend, không có prefix public và không bundle vào client.
- Áp dụng data minimization cho thông tin khách, dietary needs và ghi chú tự do.
- Không lưu secret, token hoặc prompt nguyên bản chứa PII trong audit.
- Thiết lập retention, export và xóa dữ liệu theo chính sách pháp lý/vận hành.
- Backup và diễn tập restore; backup chưa được kiểm thử restore không được coi là phương án phục hồi hoàn chỉnh.

## 5. Threats chính

| Threat | Kiểm soát |
|---|---|
| User sửa request của người khác | Auth + ownership check + RLS + tests hai user |
| Bypass xác nhận bằng API trực tiếp | Server kiểm tra confirmed version trong transaction |
| Double submit/race | Row lock/version check + idempotency key |
| Prompt injection từ knowledge | Tách instruction/data, tool allowlist, sanitize và evaluation |
| Rò rỉ service key | Server-only env, secret scanning, rotate key |
| Audit bị sửa/xóa | Revoke client writes, append-only backend path, restricted admin access |
| XSS từ nội dung AI/knowledge | Render text an toàn, sanitize allowlist, CSP |

## 6. Security gate trước production

- Code review tập trung auth, RLS, service-role usage và server/client boundary.
- Dependency audit và secret scanning trong CI.
- Automated authorization/RLS/integration tests.
- Threat-model review cho mọi route/tool mới có side effect.
- Kiểm thử rate limit, malformed input, replay/idempotency và logging redaction.
