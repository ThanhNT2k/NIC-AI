# Runbook — Procurement three-way match exception

## Tín hiệu

- Incident source `procurement.three_way_match`.
- Correlation ID trong response/header và `observability_events`.
- Invoice ở trạng thái `exception`; exception được gán `finance_manager`.

## Xử lý

1. Acknowledge incident; không đổi tolerance để làm mất exception hiện tại.
2. Dùng correlation ID lấy PO, accepted receipt, invoice và match payload trong phạm vi organization.
3. Xác minh đơn giá, số lượng nhận, receipt bị damaged/rejected, contract version và currency.
4. Nếu invoice sai: yêu cầu provider phát hành credit note/invoice mới; giữ bản cũ và audit.
5. Nếu receipt sai: reverse bằng workflow được phê duyệt rồi ghi receipt điều chỉnh; không sửa dòng đã post.
6. Nếu PO sai: tạo PO version/change order mới; không ghi đè snapshot đã phát hành.
7. Chỉ resolve exception khi evidence được đính kèm và Finance checker khác maker xác nhận.

## Escalation

- Critical khi vượt ngưỡng tài chính nội bộ, có dấu hiệu duplicate/fraud hoặc ảnh hưởng thanh toán đã phát hành.
- Thông báo Finance owner, Procurement owner và System Admin; bảo toàn audit/correlation và đặt legal hold nếu điều tra.
