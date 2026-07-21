# Browser E2E cho cộng tác request

## Phạm vi

Kịch bản này xác minh xuyên vai trò customer → operational team → customer trên dữ liệu local thật, gồm deep-link notification, comment, attachment riêng tư và audit timeline.

## Tiền điều kiện

1. Chạy `npm run dev`; migration D1 và R2 local binding `ATTACHMENTS` phải sẵn sàng.
2. Có request thuộc `target_department = 'facility'` của tài khoản customer demo.
3. Dùng fixture vô hại `tests/fixtures/request-attachment-e2e.txt`; không upload secret hoặc dữ liệu cá nhân.

## Kịch bản chuẩn

1. Đăng nhập `thanh@demo.nic.vn`, mở `/portal/requests` và chi tiết request Facility.
2. Upload fixture TXT; xác minh danh sách có tên file, uploader, kích thước, trạng thái “Đang quét an toàn” và timeline có `request.attachment_quarantined`.
3. Chạy cron scan với scanner staging trả verdict `clean`; xác minh file chuyển sang `validated` và có thể tải.
4. Gửi comment customer; đăng xuất.
5. Đăng nhập `facility@demo.nic.vn`; xác minh unread notification tăng và nội dung comment customer đúng.
6. Mở notification; xác minh URL deep-link đúng request, scope hiển thị là đội phụ trách, attachment có thể tải và comment customer xuất hiện.
7. Gửi comment Facility; đăng xuất.
8. Đăng nhập lại customer; xác minh notification mới chứa comment Facility và mở đúng request.
9. Kiểm tra browser console không có warning/error.

## Kết quả mong đợi

- Customer và Facility chỉ thao tác trong request scope hợp lệ.
- Notification được tạo đúng người nhận và chuyển đúng deep-link.
- Attachment không có public URL; download đi qua endpoint kiểm tra session/scope.
- Comment và upload xuất hiện trong audit timeline.
- Không có lỗi client runtime trong toàn bộ hành trình.

Kịch bản local không thay thế integration test RLS với JWT trên Supabase staging hoặc malware scanner production.
