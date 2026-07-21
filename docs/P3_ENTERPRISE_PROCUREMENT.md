# P3 Procurement và nền tảng enterprise

P3 hoàn thiện hai năng lực: procure-to-pay tối thiểu tại `/portal/procurement` và nền tảng production gồm OIDC SSO/MFA, PostgreSQL RLS, observability, incident và data retention.

## Procurement

API `/api/procurement` yêu cầu session, CSRF, rate limit, capability backend và organization scope.

- Contract có số hợp đồng, version, provider, thời hạn, currency, ceiling và line snapshot.
- PO liên kết đúng một work order hoặc event; `Idempotency-Key` duy nhất trong organization.
- Tổng line dùng số nguyên minor currency unit. PO vượt `po_approval_threshold_minor` chuyển `pending_approval`; maker không được tự duyệt.
- `po_issue` chỉ chạy từ trạng thái `approved`; database trigger chặn bypass API.
- Receipt ghi số lượng theo PO line; API và trigger không cho tổng thực nhận vượt số đặt.
- Invoice chỉ nhận PO đã có receipt. Three-way match so sánh PO price, accepted receipt quantity và invoice theo tolerance basis point.
- Sai lệch tạo `procurement_exceptions`, `operational_incidents`, correlation/trace và trỏ tới runbook.
- Invoice matched tạo actual cost snapshot trên work order hoặc event budget line.

Capability:

- Facility/Event manager: `procurement:manage`, `procurement:receive`, `procurement:read`.
- Facility staff: nhận hàng và đọc.
- Finance manager: duyệt PO, tạo/match invoice, đọc audit/report.
- System admin: toàn bộ capability P3; maker-checker vẫn áp dụng.
- Auditor: chỉ đọc.

## Enterprise SSO và MFA

Luồng `/api/auth/enterprise/start` → `/api/auth/enterprise/callback` dùng OIDC Authorization Code, PKCE S256, state một lần và nonce. Callback kiểm tra discovery issuer HTTPS, chữ ký RS256 theo JWKS, issuer, audience, expiry, nonce, email verified và allowed domain.

Vai trò đặc quyền `system_admin`, `finance_manager`, `facility_manager`, `event_manager` bắt buộc có MFA claim (`mfa`, OTP, FIDO/WebAuthn hoặc hardware key). Production có thể đặt `ENTERPRISE_AUTH_REQUIRED=1` để vô hiệu password login cho tài khoản nội bộ. Tài khoản phải được provision trước; `OIDC_AUTO_PROVISION=1` chỉ nên dùng cho customer member đã được phê duyệt.

Biến môi trường server-only:

- `OIDC_ISSUER`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`.
- `OIDC_ALLOWED_DOMAIN`, `OIDC_AUTO_PROVISION`, `ENTERPRISE_AUTH_REQUIRED`.
- `RETENTION_CRON_SECRET`.

Không đưa các giá trị này vào client, log, Git hoặc audit metadata.

## PostgreSQL RLS

`supabase/migrations/202607210009_p3_enterprise.sql` tạo organization/profile/membership, provider scope và procurement production tables. Mọi bảng procurement bật và `FORCE ROW LEVEL SECURITY`.

- Tenant access lấy từ membership table do backend quản trị, không lấy `raw_user_meta_data`.
- Provider chỉ đọc document gắn đúng provider membership.
- Invoice/match/exception chỉ cho Finance/System Admin/Auditor thuộc organization hoặc provider liên quan ở bề mặt phù hợp.
- Client role không được insert/update/delete chứng từ; write đi qua backend transaction.
- Observability, incident, retention và audit không cấp quyền ghi client.

## Observability và retention

P3 trả `x-correlation-id`, `traceparent`, lưu structured event và redaction theo key nhạy cảm. Exception procurement và retention failure tạo incident có dedupe key cùng runbook.

`POST /api/cron/retention` mặc định dry-run. Body `{ "dryRun": false }` mới thực thi sau khi Bearer secret hợp lệ. Job:

- đọc policy theo data class;
- đếm candidate và bỏ qua entity có legal hold active;
- archive metadata visitor QR đã loại token hash trước khi xóa;
- ghi job result và audit;
- tạo critical incident nếu thất bại.

Runbook: `docs/runbooks/procurement-exception.md` và `docs/runbooks/retention-failure.md`.

## Kiểm thử

- Unit: tiền/rounding, approval threshold, maker-checker, receipt limit, three-way tolerance, MFA claim, redirect safety, log redaction và retention cutoff.
- SQLite integration: migration P3, issue guard, receipt trigger, idempotency, account lifecycle, legal hold và correlation.
- Static security: OIDC PKCE/nonce/signature/MFA, backend capabilities và PostgreSQL RLS/revoke.
