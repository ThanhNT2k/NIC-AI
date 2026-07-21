# Supabase staging và kiểm thử RLS

## Trạng thái đã kiểm chứng

Project staging đã áp migration đến `202607210014_operational_request_scope.sql`. Script `npm run test:rls:staging` tạo identity và dữ liệu ngẫu nhiên, chạy bằng JWT thật rồi cleanup trong `finally`.

Ma trận hiện có:

- Customer A/B chỉ đọc request, comment và attachment `validated` của tenant mình.
- Facility thuộc organization vận hành NIC đọc request có `target_department = 'facility'` xuyên tenant.
- Event Manager không đọc được queue Facility.
- Attachment `quarantined` không xuất hiện.
- Direct write từ role `authenticated` bị từ chối.
- Role `anon` không đọc được request.

## Chạy thủ công

Đặt giá trị thật trong `.env` bị Git ignore:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Sau đó:

```bash
npm run test:rls:staging
```

Không log token/key. Secret/service-role chỉ dùng để tạo và cleanup fixture; mọi assertion RLS dùng publishable key cùng session JWT của từng test identity.

## Chạy trong CI

Workflow `Supabase staging RLS` chỉ chạy thủ công và gắn GitHub Environment `staging`. Cấu hình ba environment secret:

- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_PUBLISHABLE_KEY`
- `STAGING_SUPABASE_SERVICE_ROLE_KEY`

Nên bật required reviewer cho environment staging. Không cấp các secret này cho pull request từ fork.

## Guardrail vận hành

- Chỉ link CLI tới staging trước khi `db push`.
- Luôn chạy `supabase db push --dry-run` và `supabase migration list`.
- Không chạy `db reset --linked` trên production.
- Không dùng service-role client để kết luận RLS đạt; key này bypass RLS.
- Object attachment thật vẫn ở R2 riêng tư; Supabase hiện kiểm thử metadata/RLS.
