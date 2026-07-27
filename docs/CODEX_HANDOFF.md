# Codex handoff — NIC Operations ERP

Cập nhật gần nhất: 2026-07-21

File này giúp Codex tiếp tục công việc trên máy hoặc task mới mà không cần người dùng mô tả lại. Hãy cập nhật file sau mỗi thay đổi đáng kể; chỉ ghi trạng thái có thể kiểm chứng từ repository.

## Tóm tắt hiện tại

Repository là working MVP/prototype, chưa phải ERP production hoàn chỉnh. Các luồng P0–P3 đã có backend authorization, audit và database invariant; Copilot tiếng Việt truy xuất kho tri thức có version/citation nhưng vẫn chỉ chuẩn bị và không thể submit thay người dùng.

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

- Cấu hình IdP/MFA, secret, lịch cron, backup/restore và kiểm định production.
- Adapter production cho badge printer, access controller, provider channel và telemetry exporter.
- Supplier self-service và bằng chứng hiện trường/attachment đầy đủ.
- Hybrid/vector retrieval, ingestion editorial workflow và evaluation set cho Copilot.
- RLS/Supabase production được kiểm thử end-to-end trong môi trường triển khai thật.

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

### 2026-07-27 - Chuyển production sang Supabase/PostgreSQL và deploy VM

- Thêm PostgreSQL runtime adapter có transaction batch, placeholder conversion
  và camelCase alias compatibility; production dùng schema biệt lập `nic_app`.
- Sinh và áp migration PostgreSQL từ 14 migration D1: 72 bảng cùng trigger bảo vệ
  anti-overlap, immutable cost, QR replay, PO approval và receipt quantity.
- Chuyển attachment production sang bucket Supabase Storage private
  `nic-attachments`; upload/download/delete chỉ dùng service-role key server-side.
- Thêm script migration, storage bootstrap, pooler detection và production smoke
  test; fixture database/storage được cleanup tự động.
- Deploy VM `157.245.58.32`: Node 22 + systemd `nic-erp`, Nginx HTTPS
  `nic.thanhnt2k.app`, release versioned tại
  `/opt/nic-erp/releases/20260727-postgres-patched`.
- VM dùng Supabase transaction pooler IPv4 region `ap-southeast-2`; endpoint
  direct IPv6 không route được từ VM.
- Vá production dependency lên Next `16.2.12` và PostCSS `8.5.18`.
- Kiểm tra: lint đạt; 65 unit/integration + rendered HTML đạt; production build
  đạt; `npm audit --omit=dev` đạt 0 vulnerability cả local và VM; HTTPS smoke
  đạt home 200, login 200, draft list 200, draft create 201, Secure cookie và
  private Storage upload/download/delete; systemd active/enabled, journal không
  có warning.
- Bước tiếp theo: cấu hình malware scanner thật và cron secret/schedule, bật
  backup/restore drill cho PostgreSQL/Storage, thay tài khoản demo bằng IdP/MFA
  production trước khi mở cho người dùng thật.

### 2026-07-26 - Chạy nguyên bản Cloudflare build trên VM demo

- Thêm `wrangler.vm.jsonc` để chạy `dist/server/index.js` cùng assets, D1 và R2
  local trên VM qua Wrangler thay vì `vinext start` không hỗ trợ
  `cloudflare:workers`.
- Compatibility date của runtime VM được ghim ở `2026-05-22`, là ngày mới nhất
  mà workerd đi kèm Wrangler hiện tại trên VM hỗ trợ.
- Thêm `npm run db:vm:migrate` và `npm run start:vm`; state bền vững nằm trong
  `.wrangler/state` và cần được sao lưu.
- Đây là lựa chọn đơn giản cho site demo không có người dùng; production có tải
  thật vẫn nên dùng Cloudflare managed runtime.

### 2026-07-26 - Sửa đăng nhập sau reverse proxy trên VM

- Sửa kiểm tra same-origin để chấp nhận origin public khai báo bằng `APP_ORIGIN`
  và origin chuẩn từ `Forwarded`/`X-Forwarded-Proto` + `X-Forwarded-Host`; vẫn
  từ chối origin thiếu, sai protocol hoặc chứa path/query.
- Bổ sung cấu hình mẫu và `docs/vm-deployment.md` cho HTTPS termination qua
  Nginx. Production `nic.thanhnt2k.app` cần đặt
  `APP_ORIGIN=https://nic.thanhnt2k.app`, chuyển tiếp đúng header và restart app.
- Bổ sung regression assertion trong auth security test. `npm.cmd run lint` và
  `npm.cmd run test:unit` đạt (65 test).

### 2026-07-22 - Vá advisory libvips/sharp production dependency

- `npm audit --omit=dev` phát hiện `sharp@0.34.5` qua Next/Miniflare chịu các advisory libvips; không dùng `npm audit fix --force` vì npm đề xuất hạ Next xuống 14.
- Thêm npm override `sharp@0.35.3`, cập nhật lockfile; Next giữ nguyên `16.2.6`, cả Next và Miniflare dedupe về bản sharp đã vá.
- Kiểm tra: `npm audit --omit=dev` đạt `0 vulnerabilities`; `npm.cmd run lint` đạt; `npm.cmd test` đạt 65 unit/integration test, production build và rendered HTML test.

### 2026-07-21 - Attachment quarantine và malware scanner adapter

- Upload attachment chuyển sang fail-closed: metadata bắt đầu `quarantined`, API trả HTTP 202, uploader thấy trạng thái đang quét và download tiếp tục chỉ cho `validated`.
- Thêm scanner adapter HTTPS server-only với timeout 15 giây và contract verdict `clean|infected`; cron `/api/cron/attachment-scan` claim idempotent, tối đa 5 lần thử, audit/notification kết quả, xóa object nhiễm và tạo incident/alert khi hết retry.
- Thêm migration D1 `0013_attachment_quarantine.sql` và Supabase `202607210015_attachment_quarantine.sql`; cả local và staging đã áp thành công, migration Supabase local/remote đồng bộ đến `202607210015`, JWT/RLS isolation vẫn đạt.
- Tài liệu cấu hình/activation gate: `docs/attachment-malware-scanning.md`. Scanner credential thật chưa được cấu hình; khi thiếu/lỗi scanner, file luôn ở quarantine, không có fallback tự coi là sạch.
- Kiểm tra: `npm.cmd run lint` và 65 unit/integration test đạt. Bước tiếp theo: chọn/cấu hình scanner production, chạy EICAR staging và nối incident vào telemetry; sau đó tự động hóa browser E2E trong CI.

### 2026-07-21 - Supabase staging JWT/RLS isolation

- Xác nhận migration staging đồng bộ đến `202607210013`, sau đó dry-run và áp `202607210014_operational_request_scope.sql` để tách tenant customer-admin khỏi operational team NIC theo `target_department`.
- Thêm `scripts/test-supabase-rls.mjs`: tạo bốn Auth identity tạm, ba organization, request/comment/attachment fixture, đăng nhập bằng JWT thật và cleanup trong `finally`; request API có timeout 20 giây để fail-fast.
- Kiểm thử staging đạt hai lần và cleanup thành công: hai customer cô lập tenant; Facility đọc đúng queue Facility xuyên organization; Event không đọc queue Facility; attachment quarantined bị ẩn; authenticated direct write bị chặn; anon không đọc được request. Migration local/remote đồng bộ đến `202607210014`.
- Thêm workflow thủ công `Supabase staging RLS` dùng GitHub Environment `staging`, không log secret và không chạy trên pull request fork. Metadata `supabase/.temp` được Git ignore.
- Tài liệu vận hành: `docs/supabase-staging.md`. Bước tiếp theo: tích hợp malware scanner/quarantine production, sau đó tự động hóa browser E2E trong CI và hoàn thiện OIDC/monitoring/backup-restore gate.

### 2026-07-21 - Browser E2E customer ↔ Facility ↔ notification ↔ attachment

- Kiểm thử trực tiếp trên browser local bằng request Facility thật: customer upload fixture TXT, thấy metadata và audit timeline, sau đó gửi comment.
- Facility đăng nhập ở scope `assigned_team`, nhận đúng unread notification, mở đúng deep-link request, xem và tải được attachment qua endpoint riêng tư, rồi phản hồi customer.
- Customer đăng nhập lại và nhận đúng notification phản hồi từ Facility. Browser console không có warning/error trong toàn bộ hành trình.
- Thêm `docs/browser-e2e.md` mô tả tiền điều kiện, kịch bản tái kiểm thử và kết quả mong đợi; fixture vô hại nằm tại `tests/fixtures/request-attachment-e2e.txt`.
- Chưa chạy Supabase RLS integration bằng hai JWT khác tenant vì repository chưa có Supabase staging runtime/project config hoặc test identity phù hợp. Bước tiếp theo: cấu hình staging an toàn và tự động hóa RLS isolation test; song song nối malware scanner/quarantine production.

### 2026-07-21 - Attachment riêng tư cho trao đổi request

- Thêm migration D1 `0012_request_attachments.sql` và Supabase `202607210013_request_attachments.sql`; metadata liên kết request/uploader, giới hạn 8 MB, lưu SHA-256 và chỉ lộ bản ghi `validated` theo scope RLS của request cha.
- Bật R2 binding riêng `ATTACHMENTS`; object không public. Upload/download đi qua API session, CSRF, rate limit, request scope và audit; download dùng `private, no-store`, `nosniff` và CSP sandbox.
- UI “Yêu cầu của tôi” hiển thị, tải lên và tải xuống attachment trong chi tiết request. Chỉ nhận PDF/PNG/JPEG/TXT; backend đối chiếu MIME/magic bytes, chặn executable, active PDF và mẫu EICAR; nếu ghi metadata/audit lỗi thì xóa bù object R2.
- Migration D1 local áp dụng thành công; `npm.cmd run lint` và `npm.cmd test` đạt 61 unit/integration test, production build và rendered HTML test. Production vẫn cần malware scanner chuyên dụng/quarantine trước khi mở rộng loại tệp hoặc coi kiểm tra chữ ký là antivirus đầy đủ.
- Bước tiếp theo: browser E2E customer ↔ operator ↔ notification ↔ attachment; áp các migration Supabase trên staging và chạy isolation test với hai JWT khác tenant.

### 2026-07-21 - Hội tụ Supabase RLS cho request và trao đổi

- Thêm migration PostgreSQL `202607210012_request_collaboration.sql` cho `service_requests` và `request_comments`, liên kết với `request_drafts`, `auth.users` và `organizations`; bổ sung unique idempotency theo owner cùng index owner/team/comment timeline.
- Đồng bộ role `service_desk` vào constraint membership Supabase và thêm hàm scope đọc theo owner, assigned user, organization admin hoặc đúng operational team.
- Bật và ép buộc RLS cho cả hai bảng; comment kế thừa scope từ request cha. Thu hồi `insert/update/delete` trực tiếp của `anon` và `authenticated` để mọi mutation chính thức tiếp tục đi qua backend authorization, CSRF, validation và audit.
- Cập nhật tài liệu data security và regression test bảo vệ RLS, tenant/team scope và client-write revocation.
- Kiểm tra: `npm.cmd run lint` đạt; `npm.cmd test` đạt 58 unit/integration test, production build và rendered HTML test.
- Chưa chạy JWT/RLS integration trên Supabase project thật vì repository không chứa local Supabase runtime/credential. Bước tiếp theo: áp migration trên staging và kiểm thử hai JWT khác tenant; sau đó thêm attachment storage có content-type/size/malware validation và browser E2E customer ↔ operator ↔ notification.

### 2026-07-21 - Sprint cộng tác và vòng đời “Yêu cầu của tôi”

- Thêm migration D1 `0011_request_collaboration.sql` và schema `request_comments`, liên kết comment với request/actor bằng foreign key và index theo request-thời gian.
- Thêm `/api/requests/:id`: đọc chi tiết, comment và audit timeline theo owner/organization/assigned-team; write action yêu cầu session + CSRF + rate limit, ghi audit và phát notification theo từng người nhận.
- Customer chỉ tự hủy request ở `submitted` hoặc `triaged`; backend kiểm tra owner, organization và current status. Request đã hủy không nhận comment mới.
- `/portal/requests` có tìm kiếm, lọc, deep-link `?request=…`, chi tiết thật, trao đổi hai chiều, timeline và nút hủy theo permission backend trả về.
- Notification request mở đúng bản ghi; hỗ trợ đánh dấu từng mục đã đọc và đánh dấu tất cả, luôn giới hạn bằng `recipient_id` và có audit.
- Chưa thêm attachment vì repository chưa có storage adapter bền vững; không dùng dữ liệu giả. Chuỗi migration Supabase hiện chưa có `service_requests`, vì vậy chưa tạo migration comment phụ thuộc sai; cần hội tụ schema D1/Supabase trước production.
- Kiểm tra: migration D1 local áp dụng thành công; `npm run lint` đạt; `npm test` đạt 57 unit/integration test, production build và rendered HTML test. Wrangler chỉ cảnh báo không ghi được debug log ngoài workspace, migration vẫn hoàn tất.
- Bước tiếp theo: hội tụ schema và RLS Supabase cho request/comment, thêm storage attachment có malware/content validation, rồi bổ sung browser E2E cho customer ↔ operator ↔ notification.

### 2026-07-21 - Dữ liệu thật và header dùng chung cho portal

- Trang chủ `/portal` tải yêu cầu gần đây từ `/api/requests` và lịch sắp tới từ `/api/bookings`; đã loại bỏ các mã yêu cầu, phòng và workshop minh họa khỏi dashboard.
- Thêm `PortalHeader` làm header xác thực dùng chung cho toàn bộ route `/portal`, với cùng logo, navigation, trạng thái active, danh tính tài khoản và menu phiên đăng nhập.
- Thêm `/api/notifications`: chỉ đọc thông báo có `recipient_id` là người dùng hiện tại; thao tác đánh dấu tất cả đã đọc yêu cầu CSRF, giới hạn theo owner và ghi audit.
- Nút thông báo mở popover có loading/empty/list state; mỗi mục điều hướng đến phân hệ liên quan. Lịch và yêu cầu trên trang chủ đều có liên kết truy cập trang đầy đủ.
- Kiểm tra: `npm run lint` đạt; `npm test` đạt 54 unit/integration test, production build và rendered HTML test. Browser local chưa chạy được do chính sách trình duyệt hiện tại chặn `http://localhost:3000`, không phải lỗi ứng dụng.

### 2026-07-21 - Sửa lỗi tải và submit trang điều phối

- Sửa `/portal/coordination` trả HTTP 500 khi render lần đầu: component trả loading shell trước khi truy cập danh sách trên dữ liệu API chưa tải.
- Giữ tham chiếu form trước `await`, reset sau khi tạo thành công và xử lý an toàn lỗi HTTP/JSON/network cho cả thao tác tạo và cập nhật điều phối.
- Thêm regression test bảo vệ null-guard và vòng đời form bất đồng bộ.
- Kiểm thử trực tiếp trên browser local: trang tải đủ hai form và hai danh sách; tạo đăng ký khách thành công, form được reset, danh sách cập nhật và console không có error.
- Kiểm tra: `/portal/coordination` trả HTTP 200; `npm run lint` đạt; `npm test` đạt 53 unit/integration test, production build và rendered HTML test.

### 2026-07-21 - Nối trang yêu cầu vào dữ liệu và chức năng thật

- Thay danh sách minh họa trong `/portal/requests` bằng `RequestsPortal`, tải dữ liệu từ `/api/requests` theo scope `own`, `organization` hoặc `assigned_team` do backend quyết định.
- Bổ sung bộ lọc tất cả/đang xử lý/cần bổ sung/đã hoàn tất, làm mới, loading/error/empty state và modal chi tiết có nội dung đã gửi, dịch vụ, đội xử lý, thời gian, doanh nghiệp và người phụ trách.
- Mở rộng response đọc request với `details`, `organization`, `updatedAt`; các câu SQL tenant/owner scope giữ nguyên. Customer portal không có PATCH hoặc capability cập nhật trạng thái; nghiệp vụ vận hành tiếp tục ở `/portal/operations`.
- Thêm responsive stylesheet riêng `app/requests.css` và regression test chứng minh trang dùng API thật, có chi tiết và không mở quyền cập nhật.
- Kiểm tra: `npm run lint` đạt; `npm test` đạt 52 unit/integration test, production build và rendered HTML test. Chưa tái kiểm thử trực quan sau thay đổi do browser plugin runtime bị thiếu khỏi cache trong lượt này.

### 2026-07-21 - Sửa layout và submit form dịch vụ

- Sửa xung đột specificity khiến `.service-form-grid` bị `display:flex` và ép bốn trường trên cùng một hàng; form dùng grid 2 cột desktop, 1 cột dưới 620px, control có `min-width:0` và chiều cao nhất quán.
- Sửa `createDraft` không đọc `event.currentTarget` sau `await`; giữ tham chiếu form trước request, reset trước khi chuyển sang màn hình review và xử lý response/network error an toàn.
- Thêm trạng thái `Đang lưu...`, vô hiệu hóa thao tác đóng/submit trong lúc request và hiển thị lỗi inline có `role=alert`.
- Kiểm thử browser local: desktop không còn chồng trường; viewport 390px có `overlaps: []`, không tràn ngang; lưu draft thành công tới `BẢN NHÁP V1`, console không có error.
- Kiểm tra tự động: `npm run lint` đạt; `npm test` đạt 52 unit/integration test, production build và rendered HTML test.

### 2026-07-21 - Chẩn đoán stack trace, retrieval và tự động triage

- Loại bỏ taxonomy `pwd/password` gây GitGuardian false positive; session auth method dùng `local/federated`, migration `0010` chuyển tương thích dữ liệu `oidc` cũ.
- Thêm `diagnostic_reports`, parser stack trace có redaction, protected API/UI `/portal/diagnostics`; báo cáo hiển thị hàm, source file tương đối, dòng và cột cùng correlation/trace ID.
- Copilot truy xuất `knowledge_documents` active có version, citation bị giới hạn theo tập đã retrieve và kiểm tra sức chứa không gian từ database.
- Submit draft `support` tự tạo maintenance work order triage và audit trong cùng database batch, chỉ sau mọi guardrail xác nhận/ownership/idempotency.
- Cập nhật `README.md`, `docs/diagnostics-automation.md`; các connector thiết bị/provider thật vẫn cần credential và hạ tầng production.
- Kiểm tra: migration D1 local áp dụng thành công; `npm run lint` đạt; `npm test` đạt 52 unit/integration test, production build và rendered HTML test.
- Bước tiếp theo: nối adapter production/telemetry exporter, bổ sung hybrid vector retrieval và bộ đánh giá citation; không đưa secret vào repository.

### 2026-07-21 - Hoàn thành P3 procurement và nền tảng enterprise từ Kanban #12–#13

- Thêm migration D1 `0009` cho contract, PO/approval, goods receipt, supplier invoice, three-way match, exception, OIDC login attempt, account lifecycle, observability, incident, retention và legal hold.
- Thêm `/portal/procurement` cùng `/api/procurement`; mọi write action dùng session, CSRF, rate limit, capability, organization scope, idempotency và audit. PO áp dụng maker-checker; receipt chặn vượt số lượng; invoice match theo tolerance và tự tạo exception/incident khi lệch.
- Thêm OIDC Authorization Code + PKCE S256, state/nonce một lần, kiểm chữ ký JWKS/issuer/audience/expiry, allowed domain và MFA bắt buộc cho vai trò đặc quyền; password login nội bộ có thể tắt bằng `ENTERPRISE_AUTH_REQUIRED=1`.
- Thêm migration PostgreSQL production `202607210009_p3_enterprise.sql` với `FORCE ROW LEVEL SECURITY`, tenant/provider policy và revoke client writes.
- Thêm structured observability với correlation/trace, redaction secret/PII, retention cron dry-run mặc định, legal hold, archive metadata an toàn và runbook cho procurement exception/retention failure.
- Tài liệu triển khai và vận hành: `docs/P3_ENTERPRISE_PROCUREMENT.md`, `docs/runbooks/procurement-exception.md`, `docs/runbooks/retention-failure.md`.
- Đã áp migration local; đăng nhập Facility và API procurement trả 200 với 2 provider; `npm run lint`, `npm test` đạt 47 unit/integration test + 1 rendered HTML, production build thành công.
- Việc tiếp theo: cấu hình OIDC và `RETENTION_CRON_SECRET` trên production, nối alert/export telemetry với hệ thống giám sát thật, chạy retention dry-run được phê duyệt trước lần xóa đầu tiên.

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
