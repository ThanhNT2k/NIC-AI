# Phương án giải quyết bài toán ERP và AI Copilot

## 1. Bài toán

NIC cần một hệ thống ERP thống nhất để quản trị tổ chức, cơ sở vật chất, tài sản, sự kiện, booking, service request, workflow và báo cáo. Người làm việc và khách cũng cần một kênh thuận tiện để hỏi thông tin và chuẩn bị yêu cầu. Quy trình hiện tại có thể phân tán, thiếu dữ liệu đầu vào, khó theo dõi và tạo gánh nặng cho bộ phận vận hành.

ERP là lõi nghiệp vụ và nguồn dữ liệu chuẩn. AI Copilot là một capability xuyên suốt các phân hệ nhưng không được tự tạo cam kết vận hành. Ranh giới trách nhiệm cốt lõi là: **ERP quản trị; AI chuẩn bị; người dùng quyết định; backend thực thi**.

## 2. Mục tiêu

- Chuẩn hóa dữ liệu và quy trình vận hành theo các phân hệ ERP.
- Áp dụng phân quyền chặt theo role, phòng ban, tổ chức và quan hệ với bản ghi.
- Rút ngắn thời gian từ nhu cầu ban đầu đến một request đủ thông tin.
- Trả lời dựa trên nguồn tri thức NIC có thể truy vết.
- Giảm request thiếu trường, sai lịch hoặc sai phạm vi dịch vụ.
- Không submit nếu chưa có sự đồng ý rõ ràng của đúng người dùng.
- Tạo lịch sử kiểm toán cho thay đổi, xác nhận và submit.

## 3. Phương án đề xuất

### 3.1 ERP theo domain và workflow

Các phân hệ Organization, Facility, Asset, Event, Booking, Service Request và Workflow quản lý nghiệp vụ bằng schema, state machine và permission rõ ràng. Dashboard, menu và workspace được cá nhân hóa theo role, nhưng quyền luôn được thực thi lại ở backend/database.

### 3.2 Hội thoại có cấu trúc

1. Người dùng mô tả nhu cầu bằng tiếng Việt hoặc tiếng Anh.
2. AI phân loại ý định và trích xuất dữ liệu vào schema draft cố định.
3. Nếu thiếu trường bắt buộc hoặc có mâu thuẫn, AI hỏi làm rõ.
4. AI tra cứu quy định, không gian và dịch vụ qua các tool chỉ đọc.
5. UI hiển thị draft có thể sửa và nguồn tham chiếu.
6. Mọi lần sửa làm mất hiệu lực xác nhận cũ.
7. Người dùng kiểm tra và xác nhận phiên bản hiện tại.
8. Backend xác minh lại toàn bộ điều kiện trước khi submit.

### 3.3 Hybrid RAG

Full-text search phù hợp với tên phòng, mã dịch vụ, thuật ngữ và từ khóa chính xác. Vector search phù hợp với cách diễn đạt tự nhiên và câu hỏi tương đồng ngữ nghĩa. Kết hợp hai kết quả giúp tăng độ bao phủ mà vẫn giữ độ chính xác.

Luồng truy xuất SHOULD gồm lọc quyền truy cập, truy vấn lexical và semantic song song, hợp nhất/xếp hạng lại, sau đó chỉ gửi các đoạn có nguồn và còn hiệu lực vào model.

### 3.4 Human-in-the-loop bắt buộc

Không cấp tool `submit_request` cho AI. Nút xác nhận thuộc UI người dùng; submit endpoint thuộc backend. Xác nhận gắn với `draft_id + version`, không chỉ là một boolean phía client. Nếu payload thay đổi, version tăng và `confirmed_version` bị xóa.

## 4. Các phương án đã cân nhắc

| Phương án | Ưu điểm | Hạn chế | Kết luận |
|---|---|---|---|
| Chỉ form truyền thống | Dễ kiểm soát | Khó dùng, không hỗ trợ tra cứu | Không chọn làm trải nghiệm chính |
| AI tự động submit | Ít thao tác | Rủi ro tạo yêu cầu sai, khó quy trách nhiệm | Loại bỏ |
| Vector DB riêng | Có thể mở rộng độc lập | Tăng hạ tầng và đồng bộ dữ liệu | Chưa cần ở giai đoạn đầu |
| PostgreSQL FTS + pgvector | Một nguồn dữ liệu, dễ phân quyền và vận hành | Cần tuning ranking/index | Chọn |
| Client ghi trực tiếp request chính thức | Đơn giản | Dễ bypass validation và audit | Loại bỏ |
| Backend transaction submit | Kiểm soát tập trung, atomic | Cần xây API/service layer | Chọn |

## 5. Phạm vi MVP và ngoài phạm vi

### MVP production đầu tiên

- Đăng nhập và nhận diện tenant/user.
- Hỏi đáp tri thức có citation.
- Tạo, sửa, xác nhận và submit request event/facility.
- Kiểm tra trường bắt buộc và availability ở mức được nguồn dữ liệu hỗ trợ.
- Danh sách/trạng thái request của người dùng.
- Audit cho draft, confirm, submit và thay đổi trạng thái.

### Ngoài phạm vi ban đầu

- AI tự phê duyệt hoặc tự đặt dịch vụ bên thứ ba.
- Thanh toán tự động.
- Tối ưu lịch/phòng phức tạp theo thời gian thực nếu chưa có nguồn lịch chuẩn.
- Thay thế hoàn toàn nhân sự vận hành.

## 6. Tiêu chí thành công

- 100% request chính thức có actor, draft version đã xác nhận và audit trail.
- Không có đường gọi submit từ toolset của AI.
- RLS test chứng minh người dùng không đọc/sửa draft của người khác.
- Câu trả lời tri thức hiển thị nguồn; nội dung hết hiệu lực không được ưu tiên.
- Tỷ lệ request bị trả lại do thiếu dữ liệu giảm theo baseline vận hành.
