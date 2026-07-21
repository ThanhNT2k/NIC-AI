# Runbook — Retention job failure

## Tín hiệu

- Incident source `retention.job`, severity `critical`.
- `retention_job_runs.status = failed` và error code đã redacted.

## Xử lý

1. Acknowledge incident; giữ nguyên legal holds và không chạy xóa thủ công.
2. Tra correlation ID trong structured events; kiểm tra migration, permission và quota database.
3. Chạy lại với `{ "dryRun": true }`; đối chiếu candidate/held count với policy owner.
4. Nếu archive lỗi, không xóa source. Sửa storage/schema trước khi thực thi lại.
5. Nếu job dừng giữa chừng, dùng archive hash và audit để xác định entity đã xử lý; retry theo idempotent scope.
6. Chỉ chạy `{ "dryRun": false }` sau khi dry-run được Data Owner duyệt.
7. Resolve incident với evidence, số candidate/processed/held và thời điểm job thành công.

## Bảo vệ

- Không log payload, token, email, phone hoặc secret.
- Không bỏ qua legal hold để giảm backlog.
- Escalate Data Protection/System Admin nếu dữ liệu vượt retention hoặc có nguy cơ xóa sai phạm vi.
