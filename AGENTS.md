# Hướng dẫn làm việc cho Codex

File này là ngữ cảnh bền vững của repository. Khi mở project trên máy mới hoặc bắt đầu task mới, hãy đọc file này trước, sau đó đọc `docs/CODEX_HANDOFF.md` và các tài liệu được liên kết trong đó. Không yêu cầu người dùng mô tả lại những thông tin đã có trong repository.

## Mục tiêu sản phẩm

NIC Operations ERP là web ERP hỗ trợ quản trị tổ chức, cơ sở vật chất, tài sản, sự kiện, booking, service request, workflow và báo cáo. AI Copilot là một phân hệ hỗ trợ hỏi đáp, tra cứu tri thức và chuẩn bị request draft; AI không được tự submit hoặc phê duyệt nghiệp vụ.

Nguyên tắc bất biến: **ERP quản trị; AI chuẩn bị; người dùng quyết định; backend thực thi**.

## Thứ tự đọc ngữ cảnh

1. `docs/CODEX_HANDOFF.md` — trạng thái hiện tại, việc đang làm và bước tiếp theo.
2. `README.md` — phạm vi scaffold và cách chạy.
3. `docs/README.md` — mục lục tài liệu kỹ thuật.
4. Chỉ đọc tài liệu chuyên đề liên quan trực tiếp đến task; không suy đoán trái với quyết định đã ghi.

## Stack và lệnh chuẩn

- Node.js `>=22.13.0`, npm, TypeScript, React 19, Next.js 16 API compatibility qua Vinext/Vite, Tailwind CSS 4.
- Supabase PostgreSQL/Auth, Drizzle ORM; OpenAI SDK cho phần AI trong tương lai.
- Cài dependency: `npm ci`.
- Chạy local: `npm run dev` tại `http://localhost:3000`.
- Kiểm tra nhanh: `npm run lint` và `npm run test:unit`.
- Kiểm tra đầy đủ trước bàn giao: `npm test`.
- Sinh migration Drizzle: `npm run db:generate`.

Không commit `.env` hoặc secret. Tạo cấu hình máy mới từ `.env.example`; service-role key và OpenAI API key chỉ được dùng ở server runtime.

## Guardrail bắt buộc

- AI chỉ được dùng các capability tương đương `search_knowledge`, `check_availability`, `create_request_draft`; không thêm `submit_request` vào toolset AI.
- Submit phải xác thực actor từ session/token, kiểm tra ownership, trạng thái draft và `confirmed_version === version` ở backend/database.
- Mọi lần sửa draft phải tăng version và vô hiệu hóa xác nhận cũ.
- Authorization phải được thực thi ở backend và RLS; ẩn UI không phải authorization.
- Không đưa secret hoặc dữ liệu vượt quyền vào prompt, log hay client bundle.
- Thay đổi trạng thái quan trọng phải có audit trail; submit cần idempotency và transaction an toàn.
- Không làm yếu test/guardrail để khiến build xanh.

## Quy ước thay đổi

- Ưu tiên thay đổi nhỏ, có phạm vi rõ và giữ nguyên hành vi ngoài yêu cầu.
- Tôn trọng modular-monolith và ranh giới UI → application/domain → persistence trong `docs/architecture.md`.
- Khi thay đổi schema hoặc workflow, cập nhật migration, type/validation, policy, test và tài liệu liên quan cùng nhau.
- Không chỉnh file sinh tự động hoặc output build nếu có thể sửa source tương ứng.
- Giữ giao diện và nội dung người dùng bằng tiếng Việt, trừ khi yêu cầu sản phẩm nói khác.
- Trước khi sửa, kiểm tra `git status`; không ghi đè thay đổi không liên quan của người dùng.

## Bàn giao giữa máy/task

Cuối mỗi task có thay đổi đáng kể, cập nhật `docs/CODEX_HANDOFF.md`:

- chuyển mục đã hoàn tất sang “Đã hoàn thành”;
- ghi các file hoặc quyết định quan trọng;
- ghi kiểm tra đã chạy và kết quả;
- nêu bước tiếp theo cụ thể cùng blocker còn tồn tại;
- không ghi secret, token hoặc dữ liệu cá nhân.

Nếu handoff mâu thuẫn với code/test hiện tại, ưu tiên code và test đã được kiểm chứng, sau đó sửa handoff trong cùng task.
