# Tài khoản, phòng ban và phân quyền

## 1. Mô hình authorization

Hệ thống dùng kết hợp:

- **RBAC:** role xác định tập hành động có thể thực hiện.
- **Department scope:** phòng ban xác định vùng dữ liệu nghiệp vụ.
- **Organization scope:** giới hạn dữ liệu trong NIC, doanh nghiệp/tenant hoặc đơn vị liên quan.
- **Relationship-based rules:** owner, assignee, approver hoặc participant quyết định quyền trên từng bản ghi.
- **RLS:** thực thi cách ly dữ liệu ở PostgreSQL như lớp phòng vệ cuối.

Quyền hiệu lực:

```text
effective permission
= allowed action by role
∩ allowed organization scope
∩ allowed department scope
∩ record relationship/policy
∩ current record state
```

Frontend chỉ dùng quyền để điều chỉnh trải nghiệm. Backend và database vẫn phải kiểm tra lại mọi request.

## 2. Loại tài khoản

| Loại | Phạm vi mặc định | Ghi chú |
|---|---|---|
| Internal NIC | Một hoặc nhiều phòng ban NIC | Có thể giữ role nghiệp vụ hoặc quản trị |
| Tenant member | Doanh nghiệp đang hoạt động tại NIC | Không được thấy dữ liệu tenant khác |
| External requester | Các request/sự kiện được mời hoặc tự tạo | Quyền tối thiểu, có thể có thời hạn |
| Service account | Một integration xác định | Không đăng nhập UI; key rotation và scope hẹp |

Tài khoản không được dùng chung. Mỗi assignment role có `valid_from`, `valid_to`, người cấp quyền và lý do.

## 3. Role chuẩn

| Role | Mục đích |
|---|---|
| `system_admin` | Quản trị kỹ thuật, cấu hình và tài khoản; không mặc định được xem nội dung nghiệp vụ nhạy cảm |
| `security_admin` | Role, permission, access review, session và security events |
| `executive` | Dashboard tổng hợp và báo cáo toàn NIC, chủ yếu read-only |
| `department_manager` | Quản lý dữ liệu, nhân sự và phê duyệt trong phòng ban được giao |
| `facility_manager` | Quản lý cơ sở, không gian, tài sản và bảo trì |
| `facility_staff` | Xử lý công việc facility được giao |
| `event_manager` | Quản lý sự kiện, booking và dịch vụ sự kiện |
| `event_staff` | Xử lý sự kiện/checklist được giao |
| `service_desk` | Tiếp nhận, phân loại và điều phối request |
| `knowledge_manager` | Soạn, review và xuất bản tri thức trong scope |
| `auditor` | Đọc audit/compliance theo phạm vi, không sửa nghiệp vụ |
| `tenant_admin` | Quản lý thành viên và request của một doanh nghiệp tenant |
| `tenant_member` | Tạo và theo dõi request/booking của mình hoặc scope được chia sẻ |
| `external_user` | Truy cập tối thiểu vào bản ghi được mời/cấp quyền |

Một người có thể có nhiều role. Không tạo role theo chức danh cá nhân nếu có thể biểu diễn bằng role + scope.

## 4. Ma trận quyền theo phân hệ

Ký hiệu: `M` quản trị; `W` tạo/sửa/xử lý; `A` phê duyệt; `R` đọc; `O` chỉ bản ghi của mình/được giao; `–` không truy cập.

| Role | Org/CRM | Facility/Asset | Event/Booking | Requests/Tasks | Reports | Knowledge | IAM | Audit |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| system_admin | R* | R* | R* | R* | – | – | M | R security |
| security_admin | – | – | – | – | – | – | M | R security |
| executive | R | R | R | R | R | R | – | R summary |
| department_manager | R scope | W/A scope | W/A scope | W/A scope | R scope | R | – | R scope |
| facility_manager | R limited | M | R bookings | W/A facility | R facility | R | – | R facility |
| facility_staff | R limited | W scope | R assigned | W/O | O | R | – | – |
| event_manager | R limited | R availability | M | W/A event | R event | R | – | R event |
| event_staff | R limited | R availability | W scope | W/O | O | R | – | – |
| service_desk | R limited | R availability | R summary | W assign | R service | R | – | R request events |
| knowledge_manager | – | R reference | R reference | R reference | – | M scope | – | R knowledge |
| auditor | R audit scope | R audit scope | R audit scope | R audit scope | R compliance | R published | R assignments | R |
| tenant_admin | M own tenant | R public | W own tenant | W own tenant | R own tenant | R published | M tenant members | R own tenant |
| tenant_member | R own tenant | R public | O | O | O | R published | – | – |
| external_user | – | R public | O/invited | O | – | R public | – | – |

`R*` của `system_admin` chỉ dành cho hỗ trợ kỹ thuật có lý do, thời hạn và audit; không phải quyền mặc định để duyệt toàn bộ nội dung.

## 5. Phân vùng thông tin theo phòng ban

| Phòng ban/nhóm | Được truy cập | Không mặc định được truy cập |
|---|---|---|
| Ban lãnh đạo | KPI tổng hợp, capacity, SLA, trạng thái chương trình | Ghi chú cá nhân, secret, nội dung không cần cho quyết định |
| Cơ sở vật chất | Space, asset, booking liên quan, maintenance, request facility | CRM nhạy cảm, nội dung sự kiện không liên quan, IAM admin |
| Sự kiện | Event, attendee cần thiết, booking, dịch vụ, checklist | Chi tiết bảo trì không liên quan, security logs, tenant khác |
| Service Desk | Thông tin tối thiểu để phân loại/điều phối request | Dữ liệu chuyên môn nhạy cảm ngoài ticket |
| CSKH/Organization | Hồ sơ tổ chức, liên hệ, request tổng quan theo nhiệm vụ | Security logs, maintenance kỹ thuật chi tiết |
| Knowledge | Tài liệu nguồn và workflow xuất bản trong scope | Dữ liệu request/khách hàng không cần thiết |
| IT/Security | Identity, role, session, cấu hình, security events | Nội dung nghiệp vụ mặc định; break-glass mới được truy cập |
| Kiểm soát nội bộ | Audit và snapshot cần cho kiểm tra | Quyền sửa hoặc phê duyệt nghiệp vụ |
| Tenant | Người dùng và dữ liệu của chính tenant | Mọi dữ liệu tenant khác hoặc nội bộ NIC |

Các trường nhạy cảm như thông tin định danh khách, dietary/accessibility notes và security incident cần field-level masking hoặc view chuyên dụng, không chỉ kiểm soát theo bảng.

## 6. Separation of duties

- Người tạo request không tự phê duyệt nếu workflow yêu cầu approval.
- Người cấp role đặc quyền không tự phê duyệt access review của chính mình.
- Auditor chỉ đọc, không chỉnh sửa dữ liệu được kiểm toán.
- System admin không mặc nhiên có quyền nghiệp vụ executive.
- Knowledge author và publisher SHOULD là hai người với chính sách quan trọng.
- Break-glass access có thời hạn ngắn, yêu cầu lý do và tạo cảnh báo/audit.

## 7. Lifecycle tài khoản

1. Provision từ nguồn danh tính được phê duyệt hoặc lời mời có thời hạn.
2. Gán organization, department, role và scope; manager/security phê duyệt role đặc quyền.
3. MFA bắt buộc cho internal privileged roles; SHOULD áp dụng cho toàn bộ internal users.
4. Review quyền định kỳ và khi thay đổi vị trí/phòng ban.
5. Thu hồi session/quyền ngay khi offboarding; giữ audit theo retention policy.

## 8. Yêu cầu triển khai và kiểm thử

- Permission dùng mã hành động như `event.read`, `event.manage`, `request.approve`, không hard-code theo tên role trong component.
- JWT chỉ chứa claim ổn định/tối thiểu; quyền nhạy cảm SHOULD được resolve server-side để tránh token cũ.
- Mọi route, server action, database RPC và Copilot tool đều khai báo permission cần thiết.
- Automated tests phải bao phủ allow/deny giữa ít nhất hai tenant, hai phòng ban và các role đặc quyền.
- Ẩn menu không phải authorization test.

