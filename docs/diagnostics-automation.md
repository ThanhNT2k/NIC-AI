# Chẩn đoán runtime và tự động hóa nghiệp vụ

## Stack trace có thể hành động

Các lỗi runtime không được trả raw stack trace cho client. Backend chuẩn hóa tối đa 20 frame đang hoạt động tại thời điểm phát sinh lỗi và lưu:

- tên hàm;
- đường dẫn source tương đối trong repository;
- dòng và cột;
- error class/code và thông báo đã redaction;
- correlation ID, trace ID, route, actor hash và thời điểm.

System Admin có capability `platform:manage` và Auditor đọc báo cáo tại `/portal/diagnostics` hoặc `GET /api/diagnostics`. Có thể lọc chính xác theo `correlationId`. Email, bearer value và các trường credential/secret/token/passphrase được redaction; đường dẫn tuyệt đối của máy chạy không được lưu.

Stack trace thể hiện call chain còn hoạt động khi exception được ném, không phải lịch sử đầy đủ của mọi lệnh đã chạy. Khi cần dựng timeline, dùng correlation ID/trace ID để ghép với `observability_events`.

## Luồng tự động hiện có

Khi người dùng đã xác nhận đúng version và submit service draft loại `support`, backend thực hiện trong cùng database batch:

1. tạo official service request;
2. đánh dấu draft đã submit;
3. tạo maintenance work order trạng thái `open` để Facility phân loại;
4. ghi audit event `work_order.auto_created`.

AI không tham gia submit và không có capability submit. Việc tự động hóa chỉ chạy sau khi backend đã xác thực session, ownership, CSRF, idempotency và `confirmed_version === version`.

Các bảng `access_controller_events` và `badge_print_jobs` là durable outbox cho thiết bị ngoài. Adapter production cho máy in badge, access controller, provider channel và telemetry exporter cần được cấu hình bằng secret server-side riêng; chưa được giả lập là đã kết nối khi chưa có thiết bị/credential thật.

## Vận hành

- Migration D1: `drizzle/0010_diagnostics_and_retrieval.sql`.
- Kho tri thức: chỉ document `status='active'`; citation gồm title, version và source URI.
- Không ghi secret hoặc dữ liệu cá nhân vào stack/message.
- Diagnostic UI là dữ liệu đặc quyền; ẩn menu không thay thế authorization backend.
