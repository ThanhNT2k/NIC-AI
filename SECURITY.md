# Chính sách bảo mật

## Phiên bản được hỗ trợ

Repository hiện duy trì nhánh `main`. Các bản triển khai production chỉ được hỗ
trợ khi được tạo từ commit đã qua CI trên nhánh này.

## Báo cáo lỗ hổng

Không tạo public issue cho lỗ hổng chưa được công bố. Hãy dùng chức năng
**Report a vulnerability** trong phần Security Advisories của repository:

<https://github.com/ThanhNT2k/NIC-AI/security/advisories/new>

Khi báo cáo, vui lòng cung cấp:

- thành phần và phiên bản/commit bị ảnh hưởng;
- điều kiện và các bước tái hiện tối thiểu;
- tác động bảo mật dự kiến;
- bằng chứng khái niệm đã loại bỏ secret và dữ liệu cá nhân;
- biện pháp giảm thiểu tạm thời nếu có.

Không gửi credential, token production, dữ liệu cá nhân hoặc dữ liệu vượt quyền.

## Quy trình phản hồi

Maintainer sẽ cố gắng xác nhận đã nhận báo cáo trong 3 ngày làm việc, đánh giá
mức độ trong 7 ngày làm việc và phối hợp thời điểm công bố sau khi có bản vá hoặc
biện pháp giảm thiểu. Thời gian thực tế phụ thuộc mức độ và khả năng tái hiện.

## Nguyên tắc xử lý

- Không làm yếu authorization, RLS, audit hoặc guardrail AI để sửa cảnh báo.
- AI không được cấp khả năng submit hay phê duyệt nghiệp vụ.
- Bản vá bảo mật phải có regression test phù hợp.
- Secret bị lộ phải được thu hồi và xoay vòng; xóa khỏi Git không đủ.
