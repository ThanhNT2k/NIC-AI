# NIC Operations ERP

Web ERP hỗ trợ vận hành doanh nghiệp tại NIC, gồm quản lý tổ chức, cơ sở vật chất, tài sản, sự kiện, booking, service request, workflow và báo cáo. AI Copilot là một tính năng hỗ trợ hiểu ngôn ngữ, tra cứu tri thức và tạo bản nháp; chỉ backend mới có quyền ghi nhận yêu cầu sau khi người dùng xác nhận rõ ràng trên giao diện.

## Phạm vi hiện tại

- Prototype hiện tại mới là giao diện AI Copilot tiếng Việt và form request có thể chỉnh sửa; chưa phải ERP shell hoàn chỉnh.
- Bước xác nhận độc lập trước khi gửi.
- Domain policy làm mất hiệu lực xác nhận khi draft bị sửa.
- Migration Supabase gồm request draft, knowledge chunks, pgvector, full-text index, audit log và RLS.
- Unit test chứng minh AI không có `submit_request` và không thể bỏ qua xác nhận.
- CI chạy audit production, lint, unit test, build và server-render test.

## Chạy local

```bash
npm ci
copy .env.example .env.local
npm run dev
```

Mở `http://localhost:3000`.

## Kiểm thử

```bash
npm run lint
npm test
npm audit --omit=dev
```

## Cấu hình Supabase

1. Tạo Supabase project hoặc khởi chạy Supabase CLI local.
2. Áp dụng migration trong `supabase/migrations`.
3. Điền URL và publishable key vào `.env.local`.
4. Chỉ đặt `SUPABASE_SERVICE_ROLE_KEY` ở backend; không dùng biến này trong client.

## Guardrail nghiệp vụ

AI chỉ được cấp các tool `search_knowledge`, `check_availability` và `create_request_draft`. Endpoint submit phải xác minh user, ownership, trạng thái draft và `confirmed_version === version` trước khi tạo request chính thức.

## Tài liệu kỹ thuật

Xem [docs/README.md](./docs/README.md) để đọc phương án giải quyết bài toán, kiến trúc mục tiêu, luồng request/API, thiết kế Hybrid RAG, RLS/audit và kế hoạch kiểm thử–vận hành.

Khi tiếp tục bằng Codex trên máy hoặc task mới, Codex phải đọc [AGENTS.md](./AGENTS.md) và [docs/CODEX_HANDOFF.md](./docs/CODEX_HANDOFF.md) trước để khôi phục quy ước, trạng thái hiện tại và bước tiếp theo mà không cần mô tả lại project.
