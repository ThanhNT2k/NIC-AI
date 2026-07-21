# P2 Operational Portfolio

P2 mở rộng NIC Operations ERP từ độ tin cậy vận hành sang quản trị vòng đời tài sản, chi phí, sự kiện, visitor access, master data và KPI. Giao diện điều hành nằm tại `/portal/portfolio`; API hợp nhất nằm tại `/api/operations/p2`.

## Quyền và phạm vi

- `facility_manager`: quản trị asset/maintenance plan, cost và analytics.
- `facility_staff`: ghi estimate/actual cost cho work order trong phạm vi vận hành.
- `event_manager`: quản trị event template, checklist, budget approval và analytics.
- `security_staff`: phát QR, kiosk check-in, badge print/reprint, access grant/revoke và offline hold.
- `system_admin`: quản trị toàn bộ P2 và master data maker-checker.
- `auditor`: analytics và drill-down chỉ đọc.

Mọi write action yêu cầu session, CSRF, distributed rate limit, capability backend và audit log. UI không phải bằng chứng authorization.

## Asset và preventive maintenance

- Asset lưu organization, parent/child, location, category, serial/model, provider, warranty và owner.
- Maintenance plan lưu recurrence, lead time, booking window, operation template và kỳ đến hạn tiếp theo.
- `maintenance_generate` dùng khóa `planId:dueAt`; unique index trên run bảo đảm retry không sinh trùng work order.
- Work order sinh từ plan liên kết ngược asset/plan; `maintenance_plan_runs` là lịch sử bảo trì kiểm chứng được.
- `POST /api/cron/p2` quét booking window, tự sinh work order và gửi notification idempotent cho lịch bảo trì/bảo hành.

Cron yêu cầu `Authorization: Bearer <P2_CRON_SECRET>`.

## Chi phí work order

Mỗi dòng có `labor | material | service`, `estimate | actual`, quantity theo milli-unit, unit price theo minor currency unit, thuế/giảm giá theo basis point và currency ISO 4217. Backend tính subtotal, discount, tax và total bằng integer/BigInt; client không gửi total. Trigger database làm snapshot giá và công thức bất biến sau khi tạo.

## Event template, dependency và budget

- Template versioned theo event type/scale, có task dependency/due offset và line item menu/equipment/service.
- Tạo event từ template snapshot toàn bộ checklist và pricing.
- Task bị chặn ở backend nếu dependency bắt buộc chưa hoàn thành.
- Estimate vượt `budget_threshold_minor` sinh approval pending; người tạo không thể tự duyệt nhờ kiểm tra API và database constraint.

## Visitor kiosk, QR, badge và controller

- QR raw chỉ trả một lần; database chỉ lưu SHA-256 hash, expiry và redemption actor/time.
- Check-in xác minh server-side, từ chối QR hết hạn/replay, kích hoạt access grant và queue controller event.
- Check-out thu hồi grant và queue revoke event.
- Badge job snapshot đúng visitor, organization, host, visit time, badge code và zone trong `render_payload`.
- Reprint bắt buộc reason/actor/audit.
- Khi thiết bị/controller offline, `offline_hold` chỉ tạo manual review và tuyệt đối không cấp quyền tự động.

## Master data governance

`master_data_records` quản trị owner, version, draft/approved/inactive/rejected, effective from/to, reason, maker và checker cho asset category, cost catalog, provider, access zone và event catalog. Bản ghi chưa duyệt/hết hiệu lực không xuất hiện với người dùng nghiệp vụ. Không có hard-delete API; database chặn xóa cứng bản ghi ngoài draft.

## Analytics

Dashboard định nghĩa timezone `Asia/Ho_Chi_Minh`, `refreshedAt`, filter time/organization/provider/service/location và drill-down có authorization. KPI gồm SLA attainment, MTTR, provider response/on-time/acceptance và estimate/actual cost. Data-quality counters đi kèm mỗi snapshot.

## Kiểm thử

- Policy test: currency rounding, recurrence/idempotency, dependency, effective date, approval threshold, SLA và MTTR formula.
- SQLite integration: chạy toàn bộ migration; kiểm tra cost snapshot immutable, QR anti-replay, maker-checker và bảng P2.
- `npm test`: unit/integration, production build và rendered HTML.
