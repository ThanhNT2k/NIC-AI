# Tài liệu kỹ thuật — NIC Operations ERP

Thư mục này mô tả phương án giải quyết bài toán, kiến trúc mục tiêu và các yêu cầu kỹ thuật để phát triển hệ thống từ MVP hiện tại thành sản phẩm có thể vận hành.

## Danh mục

1. [Codex handoff — trạng thái và bước tiếp theo](./CODEX_HANDOFF.md)
2. [Mô hình sản phẩm ERP](./erp-product-model.md)
3. [Tài khoản, phòng ban và phân quyền](./identity-access-control.md)
4. [Layout theo role](./role-based-layouts.md)
5. [Phương án giải quyết bài toán](./solution-overview.md)
6. [Kiến trúc hệ thống](./architecture.md)
7. [Luồng request và API](./request-workflow.md)
8. [AI Copilot và Hybrid RAG](./ai-rag.md)
9. [Dữ liệu, RLS và audit](./data-security.md)
10. [Kiểm thử, CI/CD và vận hành](./testing-operations.md)
11. [P1 — Độ tin cậy vận hành](./P1_OPERATIONAL_RELIABILITY.md)
12. [P2 — Danh mục vận hành](./P2_OPERATIONAL_PORTFOLIO.md)

## Trạng thái tài liệu

- **Đã có trong MVP:** ERP shell theo role, session và capability backend, request/booking/work order, visitor/event/provider, độ tin cậy P1, danh mục vận hành P2, audit, migration D1, unit/integration test và CI.
- **Chưa hoàn thiện:** cấu hình secret và lịch cron production, connector thiết bị/controller thật, supplier portal đầy đủ, Hybrid RAG có citation, observability/backup/MFA và kiểm định production.
- Nội dung ghi **MUST** là yêu cầu bắt buộc trước production; **SHOULD** là khuyến nghị.

## Quyết định nền tảng

- Sản phẩm là web ERP; AI Copilot/chatbot chỉ là một phân hệ hỗ trợ.
- Kiến trúc nghiệp vụ theo modular monolith trong giai đoạn đầu.
- Supabase PostgreSQL là nguồn dữ liệu chính.
- Tra cứu tri thức dùng PostgreSQL full-text search kết hợp pgvector.
- AI chỉ hiểu ngôn ngữ, hỏi làm rõ, tra cứu và tạo/chỉnh sửa draft.
- Người dùng phải duyệt rõ ràng trên UI; AI không có quyền submit.
- Backend chỉ submit sau authentication, authorization và validation.
- Mọi thao tác quan trọng cần audit log; dữ liệu người dùng được bảo vệ bằng RLS.
- Quyền hiệu lực là giao của role, phòng ban, phạm vi tổ chức và quan hệ với bản ghi.
