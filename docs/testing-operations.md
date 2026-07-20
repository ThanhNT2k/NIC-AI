# Kiểm thử, CI/CD và vận hành

## 1. Test pyramid

### Unit tests

- Domain policy: ownership, version, confirmation invalidation, state transition.
- Schema validation và mapping AI structured output.
- Hybrid ranking/merge với fixture ổn định.
- Redaction và audit metadata.

### Integration tests

- API với Supabase local/test project.
- RLS bằng hai user và các role operator/admin.
- Submit transaction, rollback, version conflict và idempotency.
- Search RPC với access scope và tài liệu hết hiệu lực.

### End-to-end tests

- Login → hội thoại → draft → sửa → xác nhận → submit.
- Sửa sau xác nhận buộc xác nhận lại.
- Không thể submit draft của user khác hoặc draft chưa xác nhận.
- Citation mở đúng tài liệu nguồn.
- Availability thay đổi tạo conflict, không âm thầm submit.

### AI evaluation

- Intent/schema accuracy, clarify behavior, groundedness và citation.
- Prompt injection và dữ liệu không có đáp án.
- Regression suite chạy khi thay model/prompt/retrieval.

## 2. CI hiện tại

Workflow hiện có chạy:

```text
npm ci
npm audit --omit=dev
npm run lint
npm test
```

`npm test` hiện chạy unit policy, build và server-render test. Đây là baseline tốt nhưng chưa chứng minh RLS, API transaction hay AI grounding.

## 3. CI mục tiêu

Thêm các gate theo thứ tự:

1. Format/typecheck/lint.
2. Unit tests và coverage threshold cho domain/security policy.
3. Supabase migration lint/reset trên database tạm.
4. Integration/RLS tests.
5. Build và E2E smoke test.
6. Dependency audit, secret scan và SAST phù hợp.
7. AI evaluation cho thay đổi liên quan prompt/RAG.

Không deploy nếu migration hoặc authorization tests thất bại.

## 4. Môi trường và release

- Tách `development`, `staging`, `production` với project/database và secret riêng.
- Migration là forward-only, được review và thử trên staging snapshot không chứa PII thật.
- Deploy theo thứ tự tương thích: database → backend → frontend.
- Feature flag cho AI model, retrieval strategy và tool mới.
- Có rollback application; database change phá vỡ tương thích cần kế hoạch expand/migrate/contract.

## 5. Observability

- Structured log với correlation ID, actor pseudonymous ID, route, latency, status và error code.
- Metrics: request success/error, submit conflict, tool latency/error, retrieval no-result, token/cost và queue/processing time.
- Tracing từ browser request qua backend, AI tool và database mà không ghi payload nhạy cảm.
- Alert theo SLO, không alert riêng từng lỗi lẻ không hành động được.

SLO ban đầu nên được chốt bằng dữ liệu thực tế. Ví dụ theo dõi availability API, p95 latency không gồm thời gian người dùng, và tỷ lệ submit thành công với request hợp lệ.

## 6. Runbook tối thiểu

- AI provider lỗi: tắt hội thoại bằng feature flag, giữ form thủ công hoạt động.
- Retrieval lỗi: không bịa câu trả lời; hiển thị trạng thái không thể tra cứu.
- Supabase lỗi: chặn submit, không lưu tạm request chính thức ở client.
- Key bị lộ: revoke/rotate, kiểm tra logs, redeploy và lập incident record.
- Migration lỗi: dừng rollout, dùng kế hoạch rollback/forward fix đã kiểm thử.

## 7. Definition of Done cho feature

- Acceptance criteria và threat cases được ghi rõ.
- Có unit/integration test tương xứng với rủi ro.
- Authorization và audit được kiểm tra nếu có side effect.
- UI có loading, error, empty và conflict states.
- Không lộ secret/PII trong bundle hoặc log.
- Tài liệu kiến trúc/API được cập nhật.
- CI pass và có bằng chứng kiểm thử staging trước production.

