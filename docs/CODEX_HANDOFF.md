# Codex handoff — NIC Operations ERP

Cập nhật gần nhất: 2026-07-21

File này giúp Codex tiếp tục công việc trên máy hoặc task mới mà không cần người dùng mô tả lại. Hãy cập nhật file sau mỗi thay đổi đáng kể; chỉ ghi trạng thái có thể kiểm chứng từ repository.

## Tóm tắt hiện tại

Repository đang ở giai đoạn scaffold/prototype, chưa phải ERP production hoàn chỉnh. Phần chạy được hiện nay tập trung vào giao diện AI Copilot tiếng Việt, request draft có thể chỉnh sửa và policy chứng minh AI không thể submit thay người dùng.

Kiến trúc mục tiêu là web ERP dạng modular monolith dùng Supabase PostgreSQL làm nguồn dữ liệu chính. AI Copilot hỗ trợ hiểu ngôn ngữ, Hybrid RAG và tạo draft; authentication, authorization và submit chính thức thuộc backend/database.

## Đã có trong repository

- Prototype UI: `app/components/ConciergeWorkspace.tsx`.
- Entry/layout và style: `app/page.tsx`, `app/layout.tsx`, `app/globals.css`.
- Domain guardrail mẫu: `lib/request-policy.ts`.
- Unit test policy: `tests/request-policy.test.mjs`.
- Server-render test: `tests/rendered-html.test.mjs`.
- Schema Drizzle: `db/schema.ts`; kết nối database: `db/index.ts`.
- Migration Supabase ban đầu: `supabase/migrations/202607200001_initial.sql`.
- Worker entry: `worker/index.ts`.
- Bộ tài liệu yêu cầu, kiến trúc, workflow, RAG, security và vận hành trong `docs/`.
- Cấu hình hosting: `.openai/hosting.json`.

## Chưa hoàn thiện

- ERP shell, navigation và dashboard theo role.
- Supabase Auth và protected routes.
- RBAC/ABAC, organization scope và RLS được kiểm thử end-to-end.
- Các domain Facility, Asset, Event, Booking, Service Request và Workflow.
- API/service layer cho draft, confirm và submit transaction.
- Tích hợp OpenAI runtime, ingestion/retrieval Hybrid RAG và citation thật.
- Audit runtime, observability, rate limiting và deployment production.

## Quyết định đã chốt

- ERP là sản phẩm lõi; chatbot không thay thế ERP.
- Người dùng phải xác nhận phiên bản draft hiện tại trước khi submit.
- AI không có tool submit và không giữ service-role key.
- Quyền hiệu lực là giao của role, phòng ban, organization scope và quan hệ với bản ghi.
- Giai đoạn đầu dùng modular monolith và PostgreSQL FTS + pgvector, chưa tách vector database riêng.
- Client state không phải bằng chứng authorization; backend/RLS luôn kiểm tra lại.

Chi tiết và lý do nằm trong `docs/solution-overview.md`, `docs/architecture.md`, `docs/request-workflow.md` và `docs/data-security.md`.

## Hướng tiếp theo đề xuất

Ưu tiên theo thứ tự:

1. Thiết lập Supabase Auth và server-side session.
2. Xây permission model tối thiểu cùng RLS test cho tenant/user isolation.
3. Tạo API/application service cho vòng đời draft → confirm → submit bằng transaction và idempotency key.
4. Nối prototype UI vào dữ liệu thật.
5. Sau khi trust boundary ổn định, tích hợp OpenAI tool allowlist và Hybrid RAG có citation.
6. Mở rộng ERP shell và các phân hệ nghiệp vụ theo `docs/erp-product-model.md`.

Không bắt đầu bằng việc cho AI ghi trực tiếp request chính thức hoặc dùng service-role key ở client.

## Kiểm tra chuẩn

```bash
npm ci
npm run lint
npm test
npm audit --omit=dev
```

Máy mới cần tạo `.env.local` từ `.env.example`; không sao chép secret vào Git hoặc file handoff.

## Nhật ký bàn giao

### 2026-07-21 - Hoàn thành P2 danh mục vận hành từ Kanban #6–#11

- Thêm migration `0008` cho asset hierarchy/warranty/owner, preventive maintenance, snapshot chi phí work order, event template/checklist/budget, visitor QR/badge/access controller, master data effective-date và analytics.
- Thêm `/portal/portfolio`, API `/api/operations/p2` và cron `/api/cron/p2`; mọi write action dùng session, CSRF, capability backend, rate limit và audit.
- Preventive maintenance sinh work order idempotent theo plan/kỳ hạn; chi phí được backend tính bằng số nguyên và database chặn sửa snapshot.
- Event tạo từ template versioned, task kiểm tra dependency và budget dùng maker-checker. QR chỉ lưu hash, chống replay; offline hold không cấp access.
- Master data không hard delete, có owner/version/effective date và maker-checker. Analytics công bố timezone, thời điểm refresh, filter, SLA/MTTR/provider/cost, data quality và drill-down có quyền.
- Tài liệu endpoint, mô hình dữ liệu và vận hành: `docs/P2_OPERATIONAL_PORTFOLIO.md`.
- Đã áp migration local; đăng nhập Facility, API/trang P2 đều trả 200 với dữ liệu seed; `npm run lint` và `npm test` đạt 35 unit/integration test + 1 rendered HTML, production build thành công.
- Việc tiếp theo: cấu hình `P2_CRON_SECRET` và lịch cron production; kết nối printer/access controller thật; theo dõi data-quality và hiệu chỉnh catalog/KPI bằng dữ liệu vận hành.

### 2026-07-21 - Hoàn thành P1 độ tin cậy vận hành từ Kanban #1–#5

- Thêm migration `0007` cho operation template/task, phê duyệt đóng work order, business calendar/SLA event, resource skill/calendar, provider response version, access review và maker-checker.
- Work order snapshot task từ template active; task bắt buộc chặn đóng. Đóng lệnh chuyển sang approval và cấm người yêu cầu tự phê duyệt.
- Resource booking kiểm tra skill/certificate còn hạn và dùng database trigger chống trùng. Provider chỉ phản hồi assignment thuộc membership, có accept/reject/accept-with-change và response history.
- Thêm SLA pause/resume có audit, cron sweep dùng `SLA_CRON_SECRET`, idempotency key cho warning/failure và xử lý provider response quá hạn.
- Access review retain/revoke lưu evidence; revoke membership đồng thời thu hồi session. Cấu hình role/SLA/master data áp dụng segregation of duties ở API và database.
- Thêm `/portal/reliability` cho Facility Manager, Provider và System Admin: theo dõi SLA/job log/notification, pause-resume, acknowledgment/confirmation, resource skills, template version và access review.
- Work order tự sinh task/SLA/provider assignment; cron tạo notification in-app idempotent và escalation access review quá hạn. Migration seed lịch NIC, template, resource skill cùng tài khoản demo admin/provider.
- Tài liệu endpoint và cấu hình vận hành: `docs/P1_OPERATIONAL_RELIABILITY.md`.
- Đã áp migration local, chạy `npm run lint` và `npm test`: 30 unit/integration test + rendered HTML đạt, build thành công.
- Việc tiếp theo: cấu hình `SLA_CRON_SECRET` và lịch gọi cron trên môi trường triển khai; theo dõi dữ liệu production để tinh chỉnh ngưỡng SLA.

### 2026-07-21 - MVP điều phối visitor, provider, catering và event logistics

- Thêm `service_providers`, `visitor_registrations`, `event_service_orders` và liên kết provider trên maintenance work order qua migration `0005`; migration `0006` thêm tài khoản demo Event/Security.
- Thêm `/portal/coordination` và `/api/coordination`: khách hàng đăng ký visitor, tea break/hậu cần; Security duyệt/check-in/check-out; Event team điều phối, chọn provider, xác nhận và hoàn tất.
- Visitor có mã badge duy nhất; event service có gói catering, số suất, ghi chú logistics và lifecycle; mọi write action dùng session, CSRF, rate limit và audit.
- Mở capability mới theo vai trò cho visitor, event service và provider; maintenance work order nhận provider đã được kiểm tra trạng thái/năng lực.
- Đã áp migration local, chạy `npm run lint` và `npm test`: 26 test đạt, build thành công.
- Việc tiếp theo: QR/badge printing và access zone; provider portal/acceptance; SLA notification/escalation; menu/pricing và equipment checklist chi tiết.

### 2026-07-21 - Chuyển NIC Copilot sang Gemini 2.5 Flash

- Thay OpenAI Responses API bằng Gemini GenerateContent API; model mặc định là `gemini-2.5-flash`.
- Đổi cấu hình server runtime sang `GEMINI_API_KEY` và `GEMINI_MODEL`; giữ structured output, hội thoại tám lượt gần nhất và fallback local.
- Gỡ dependency OpenAI không còn sử dụng và cập nhật README/cấu hình mẫu.
- Đã chạy `npm run lint` và `npm test`: 23 test đạt, build thành công.
- Việc triển khai cần cấu hình `GEMINI_API_KEY` trên môi trường production; không ghi khóa vào repository.

### 2026-07-21 - Dashboard vận hành, booking chống trùng và maintenance work order

- Thêm `/portal/operations` cho Service Desk/Facility với KPI, bộ lọc hàng đợi, phân công, cập nhật trạng thái; Facility có thêm lịch không gian và danh sách work order.
- Thêm API dashboard, assignment/status theo capability và target department; mọi write action dùng session + CSRF + rate limit và ghi `audit_logs`.
- Thêm `spaces`, `bookings`, `maintenance_work_orders` trong migration `0004`; booking được tạo bằng `INSERT ... SELECT ... WHERE NOT EXISTS` để chặn khoảng thời gian giao nhau trên D1.
- Work order liên kết request Facility, có priority, lịch, assignee, resolution và state machine; partial unique index ngăn nhiều work order active cho cùng request.
- Thêm tài khoản demo `desk@demo.nic.vn` và `facility@demo.nic.vn`, cùng mật khẩu demo hiện có; login role vận hành route thẳng tới dashboard.
- Đã áp migration local, chạy `npm run lint` và `npm test`: 23 test đạt, build thành công. HTTP local xác nhận đăng nhập Facility 200 và dashboard trả đúng department; browser tích hợp không kết nối được localhost nên chưa có screenshot QA tự động.
- Việc tiếp theo: SLA/notification/escalation, provider directory và technician calendar; sau đó visitor QR/check-in.

### 2026-07-21 - Mở rộng README theo chuẩn hồ sơ dự án

- Viết lại `README.md` thành tài liệu tổng quan đầy đủ gồm bài toán, giải pháp, phạm vi sản phẩm, ma trận đáp ứng đề bài, phân quyền, kiến trúc, dữ liệu, AI Copilot, cài đặt local, kiểm thử, triển khai, bảo mật, giới hạn và roadmap.
- Ma trận yêu cầu phân biệt rõ `Đã có`, `Một phần` và `Chưa có`; không mô tả các module booking availability, work order, provider coordination, visitor QR/check-in hay RAG thật như đã hoàn thành.
- Bổ sung sơ đồ Mermaid cho kiến trúc, request routing và vòng đời request; liên kết đến demo private, tài liệu kỹ thuật và các migration hiện có.
- Baseline kiểm thử được ghi đúng theo lần kiểm chứng gần nhất: 17 test đạt; thay đổi này chỉ tác động tài liệu, không thay đổi runtime.
- Việc tiếp theo: triển khai P1 booking availability/anti-overlap hoặc hàng đợi vận hành theo phòng ban, rồi cập nhật lại ma trận yêu cầu và bằng chứng đánh giá.

### 2026-07-21 - ERP capability model, request routing và typography dễ đọc

- Tăng body copy và control text từ mức 8–11px lên chuẩn 12–14px tại portal, form, bảng yêu cầu và Copilot; giữ headline và responsive hiện có.
- Thêm `departments`, `organization_memberships` và các trường routing/assignment/visibility trên `service_requests`.
- Role mới: customer member/admin, service desk, facility staff/manager, event staff/manager, security staff, system admin và auditor.
- Backend dùng capability grants kết hợp organization, target department, ownership và assignment; UI role label không phải bằng chứng authorization.
- Request tự định tuyến: booking → Facility, hỗ trợ → Service Desk, sự kiện → Event, thẻ/khách → Security.
- Customer member chỉ đọc request của mình; customer admin đọc phạm vi doanh nghiệp; operator đọc hàng đợi target department.
- Demo account được migrate thành `customer_admin` của Innovate Vietnam; UI hiển thị role và phạm vi khả năng của tài khoản.
- Đã áp migration local, chạy `npm run lint` và `npm test`: 17 test đạt, build thành công.
- Việc tiếp theo: thêm API cập nhật trạng thái/assignment cho đội vận hành và dashboard Service Desk/Facility; tiếp đó xây booking/work order thật.

### 2026-07-21 - Hiểu ngôn ngữ tự nhiên và ngữ cảnh cho NIC Copilot

- Thay nhận diện regex đơn lẻ bằng hai tầng: OpenAI Responses API cho hiểu ngôn ngữ tự nhiên và bộ phân loại tiếng Việt local làm fallback.
- Client gửi tối đa 8 lượt hội thoại gần nhất; Copilot hiểu tham chiếu theo ngữ cảnh thay vì xử lý từng câu độc lập.
- OpenAI trả Structured Outputs theo JSON schema giới hạn `answer`, `sources` và một trong bốn `suggestedService`; prompt cấm tuyên bố đã submit/phê duyệt.
- Model mặc định `gpt-5.6-sol`, có thể đổi bằng `OPENAI_MODEL`; khóa `OPENAI_API_KEY` chỉ đọc tại server runtime.
- Khi chưa cấu hình khóa, fallback bỏ dấu, tổng hợp ngữ cảnh gần và chấm điểm cụm ý định để vẫn hiểu nhiều cách diễn đạt phổ biến.
- Đã chạy `npm run lint` và `npm test`: 15 test đạt, build thành công.
- Blocker triển khai AI đầy đủ: Sites production chưa có `OPENAI_API_KEY`; cần cấu hình secret runtime để bật tầng mô hình ngôn ngữ.

### 2026-07-20 - Trang chủ công khai, portal routes và Copilot hội thoại

- Route `/` trở thành trang chủ công khai mang nhận diện NIC, giới thiệu dịch vụ và quy trình sử dụng.
- Nút Đăng nhập và Đăng ký mới chuyển đến `/auth`; sau xác thực thành công người dùng được đưa vào `/portal`.
- Thêm các trang điều hướng thật: `/portal/requests`, `/portal/bookings`, `/portal/help`; mọi trang portal kiểm tra session và chuyển người chưa đăng nhập về `/auth`.
- Trang Yêu cầu hiển thị danh sách/trạng thái; trang Đặt chỗ giới thiệu danh mục không gian và availability mẫu; trang Trợ giúp có thư viện hướng dẫn và lối vào Copilot.
- NIC Copilot hỗ trợ hội thoại nhiều lượt, prompt gợi ý, nguồn tham chiếu và mở đúng form dịch vụ để người dùng kiểm tra.
- Endpoint `/api/copilot` yêu cầu session và chỉ trả lời/đề xuất form; không có capability submit hoặc ghi trực tiếp request.
- Việc tiếp theo: thay availability mẫu bằng schema booking và transaction chống trùng; sau đó nối Copilot vào retrieval có citation thật.

### 2026-07-20 - Form đăng ký chuyên biệt cho dịch vụ thường dùng

- Bốn dịch vụ thường dùng đều mở form đăng ký riêng thay vì chỉ dùng một ô mô tả chung.
- Đặt không gian thu thập ngày, giờ bắt đầu/kết thúc, số người và loại không gian; hỗ trợ thu thập nhóm, mức ưu tiên, vị trí và thời gian mong muốn.
- Đăng ký sự kiện thu thập tên/ngày sự kiện, số người và vai trò; thẻ ra vào thu thập loại yêu cầu, người sử dụng, liên hệ và ngày hiệu lực.
- Dữ liệu có cấu trúc được tổng hợp vào chi tiết bản nháp và giữ nguyên guardrail xác nhận đúng version trước khi submit.
- Form có bố cục hai cột trên desktop, một cột và thanh hành động cố định trên mobile; có validation bắt buộc và giới hạn độ dài.
- Đã chạy `npm run lint` và `npm test`: 13 test đạt, build thành công.
- Việc tiếp theo: tách schema nghiệp vụ cho booking để kiểm tra availability và chống trùng thời gian ở database thay vì chỉ lưu trong chi tiết bản nháp.

### 2026-07-20 - Ổn định môi trường local cho font, ảnh và đăng nhập

- Thay `next/font` bằng Be Vietnam Pro tự phục vụ từ `public/fonts`, không còn sinh URL `file:///D:/...` trong HTML/CSS.
- Logo NIC dùng ảnh tĩnh trực tiếp, tránh lỗi 400 từ bộ tối ưu ảnh trong Vinext.
- Màn hình xác thực xử lý an toàn cả phản hồi lỗi rỗng/không phải JSON, không còn phát sinh `Unexpected end of JSON input`.
- Thêm cấu hình Wrangler local và tự áp toàn bộ D1 migration trước `npm run dev`; tài khoản demo đăng nhập thành công với HTTP 200.
- Đã chạy `npm run lint`, `npm test`, kiểm tra font/logo HTTP 200 và đăng nhập demo HTTP 200.
- Việc tiếp theo: triển khai P1 booking gồm danh mục không gian, kiểm tra availability và chống trùng thời gian ở database/backend.

### 2026-07-20 - Hoàn thiện lớp bảo vệ P0 cho thao tác ghi

- Mỗi session có CSRF token riêng; backend kiểm tra Origin, header, cookie và hash trong session cho mọi write action đã có.
- Rate limit dùng bảng D1 chung cho login, register, tạo/sửa/xác nhận draft và submit request.
- Thêm endpoint và UI thu hồi mọi session của tài khoản, kèm audit event.
- Migration bổ sung `sessions.csrf_hash` tương thích session cũ và bảng `rate_limits`.
- Thêm test SQLite áp dụng toàn bộ migration để chứng minh request của hai user thuộc hai organization không bị lẫn và idempotency index tồn tại.
- Việc tiếp theo: P1 booking với space catalog, availability và chống trùng thời gian; tiếp tục hoàn chỉnh audit đăng nhập/thay đổi quyền.

### 2026-07-20 - Đồng bộ nhận diện NIC và hoàn thiện submit guardrail

- Đối chiếu `nic.gov.vn`, dùng logo/ảnh kiến trúc NIC công khai, bảng màu xanh chàm và cam đỏ của thương hiệu.
- Thêm sửa draft có optimistic version, tự vô hiệu hóa xác nhận cũ.
- Thêm confirm đúng version và submit bằng D1 batch với ownership, confirmation và idempotency key.
- Thêm `service_requests`, `audit_logs`, API danh sách request theo owner + organization và migration tương ứng.
- Việc tiếp theo theo P0: CSRF token, rate limit phân tán, revoke-all-sessions và test tích hợp D1 giữa hai tenant; sau đó triển khai availability/anti-overlap cho booking.

### 2026-07-20 - Auth D1 và bản nháp dịch vụ end-user

- Thêm đăng nhập, đăng ký, đăng xuất và kiểm tra session bằng cookie HttpOnly.
- Password dùng PBKDF2-SHA256, salt ngẫu nhiên và 210.000 vòng; session token chỉ lưu dạng SHA-256.
- Thêm tài khoản seed `thanh@demo.nic.vn` để kiểm thử; mật khẩu demo được hiển thị trên màn hình đăng nhập, không lưu rõ trong DB.
- Bốn dịch vụ thường dùng đã mở biểu mẫu và lưu `service_drafts` theo owner lấy từ session.
- Thêm khóa tạm 15 phút sau 5 lần đăng nhập sai và test kiểm tra guardrail lưu mật khẩu/session.
- Thêm `docs/NEXT_FEATURES.md` với backlog P0-P2 và tiêu chí MVP.
- Việc tiếp theo: làm draft confirm/submit transaction, RBAC/RLS và dữ liệu nghiệp vụ thật cho booking/request.

### 2026-07-20 - Chuyển prototype sang giao diện end-user

- Thay dashboard quản lý đa vai trò bằng NIC Service Hub dành cho thành viên doanh nghiệp.
- Luồng chính gồm tìm dịch vụ, thao tác nhanh, yêu cầu gần đây, lịch sắp tới và NIC Copilot.
- Giữ guardrail: Copilot chỉ tìm thông tin và chuẩn bị bản nháp, không tự phê duyệt hoặc gửi yêu cầu.
- Cập nhật server-render test theo nội dung trang end-user mới.
- Việc tiếp theo: kết nối action vào route và dữ liệu thật sau khi authentication, permission model và API draft ổn định.

### 2026-07-20 — Tạo bộ nhớ repository cho Codex

- Thêm `AGENTS.md` làm hướng dẫn tự nạp cho mọi task trong repository.
- Thêm file handoff này để lưu trạng thái, quyết định và bước tiếp theo.
- Chưa thay đổi source hoặc hành vi runtime.
- Việc tiếp theo: chọn một mục trong “Hướng tiếp theo đề xuất”, triển khai và cập nhật lại handoff.
