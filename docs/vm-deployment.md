# Triển khai trên VM qua reverse proxy

Ứng dụng kiểm tra `Origin` cho đăng nhập và mọi thao tác ghi để chống CSRF. Khi
Nginx/Caddy kết thúc HTTPS rồi chuyển tiếp HTTP vào ứng dụng, cần khai báo origin
public và chuyển tiếp đúng protocol/host.

## Biến môi trường

Đặt tại server runtime:

```dotenv
NODE_ENV=production
APP_ORIGIN=https://nic.thanhnt2k.app
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
