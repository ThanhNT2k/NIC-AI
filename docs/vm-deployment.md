# Triển khai trên VM qua reverse proxy

Ứng dụng kiểm tra `Origin` cho đăng nhập và mọi thao tác ghi để chống CSRF. Khi
Nginx/Caddy kết thúc HTTPS rồi chuyển tiếp HTTP vào ứng dụng, cần khai báo origin
public và chuyển tiếp đúng protocol/host.

## Kiến trúc production hiện tại

- Vinext production server chạy bằng Node.js 22 qua systemd.
- Nginx kết thúc HTTPS và proxy tới `127.0.0.1:3000`.
- Nghiệp vụ lưu trong Supabase PostgreSQL, schema riêng `nic_app`.
- Attachment lưu trong bucket Supabase Storage private `nic-attachments`.
- D1/R2 local chỉ còn là chế độ development/legacy, không dùng trên VM production.

## Biến môi trường

Đặt tại server runtime:

```dotenv
NODE_ENV=production
APP_ORIGIN=https://nic.thanhnt2k.app
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
SUPABASE_ATTACHMENT_BUCKET=nic-attachments
```

`APP_ORIGIN` chỉ nhận một origin `http(s)://host[:port]`, không kèm path, query
hoặc fragment.

## Nginx

Trong `location` chuyển tiếp tới ứng dụng:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP $remote_addr;
```

Sau khi đổi env hoặc cấu hình proxy, restart process ứng dụng và reload Nginx.
Kiểm tra response của `POST /api/auth/login`: lỗi cấu hình origin trả
`{"error":"INVALID_ORIGIN"}` với HTTP 403.

`DATABASE_URL` trên VM phải dùng Supabase transaction pooler có IPv4. VM hiện
dùng pooler `aws-0-ap-southeast-2.pooler.supabase.com:6543`; endpoint direct
của project chỉ có IPv6 và VM không route được.

## Migration và Storage

```bash
npm run db:postgres:generate
npm run db:postgres:migrate
npm run storage:supabase:ensure
```

Migration sinh schema `nic_app` biệt lập để không xung đột schema `public` cũ.
Bucket attachment phải luôn private; ứng dụng chỉ truy cập bằng service-role key
ở server runtime.

## Build và service

```bash
npm ci
npm run build
sudo systemctl restart nic-erp
sudo systemctl status nic-erp
```

Service file nguồn nằm tại `deploy/nic-erp.service`; Nginx config nằm tại
`deploy/nginx-nic.thanhnt2k.app.conf`. Release được giải nén theo phiên bản dưới
`/opt/nic-erp/releases/`, và `/opt/nic-erp/current` trỏ tới release đang chạy.
Rollback bằng cách đổi symlink `current` về release trước, restart `nic-erp` và
chạy smoke test.

## Kiểm tra sau deploy

```bash
npm run smoke:production
npm audit --omit=dev
systemctl is-active nic-erp
journalctl -u nic-erp --since "10 minutes ago" -p warning
```

Smoke test yêu cầu `SMOKE_ORIGIN`, `SMOKE_EMAIL`, `SMOKE_PASSWORD`; fixture
PostgreSQL và Storage được xóa trong `finally`.
