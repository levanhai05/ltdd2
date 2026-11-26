# school-backend

Backend REST API (Node.js + Express 5) cho **school-app**. Dữ liệu và đăng nhập vẫn nằm trên **Supabase**
(PostgreSQL + Auth); server này đứng giữa app và Supabase, giữ `service_role key` và tự kiểm tra quyền.

```
App Expo  ──(Bearer access_token)──▶  school-backend  ──(service_role)──▶  Supabase (DB + Auth)
                                            ▲
ESP32  ──────────(x-device-key)─────────────┘
```

## 1. Cài đặt

1. Chạy trên Supabase SQL Editor theo thứ tự: `schema.sql` → `seed.sql` → **`sql/001_missing_tables.sql`**
   (bổ sung `bus_rides`, `emergency_contacts`, `patrol_checkpoints`, cột `notices.audience/class_id`).
2. `cp .env.example .env` rồi điền `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   (Supabase > Project Settings > API).
3. `npm install` rồi `npm run dev` (cần Node 20+). Kiểm tra: `GET http://localhost:4000/health`.

> `SUPABASE_SERVICE_ROLE_KEY` chỉ để ở server. Đừng đưa vào `.env` của app Expo và đừng commit lên git.

## 2. Xác thực

- `POST /api/auth/login {username, password}` → `{session:{access_token, refresh_token,...}, profile}`
- Mọi API khác gửi header `Authorization: Bearer <access_token>`.
- Nếu app vẫn đăng nhập bằng `supabase.auth` như hiện nay thì token đó dùng được luôn, không cần đổi màn Login.
- Tài khoản bị khóa (`profiles.active = false`) bị chặn ngay ở API (có cache tối đa 10 giây) và bị ban trên Supabase Auth.

## 3. Danh sách API

| Nhóm | Endpoint | Quyền |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh`, `GET /auth/me`, `POST /auth/change-password` | — / đã đăng nhập |
| Admin | `GET /admin/users`, `POST /admin/users`, `PATCH /admin/users/:id/active`, `POST /admin/users/:id/reset-password` | admin |
| | `GET /admin/summary`, `GET /admin/stats/attendance`, `GET /admin/logs`, `PATCH /admin/emergency-contacts/:id` | admin |
| Thông báo | `GET /notices`, `GET /notices/sent`, `POST /notices`, `POST /notices/read` | đã đăng nhập (gửi: admin, teacher) |
| Tin nhắn | `GET /messages/contacts`, `GET /messages/with/:userId`, `POST /messages` | parent, teacher |
| Phụ huynh | `GET /parent/student`, `schedule`, `grades`, `attendance`, `homework`, `fees`, `leaves`, `bus` | parent |
| | `PUT /parent/homework/:id`, `POST /parent/fees/:id/pay`, `POST /parent/leaves`, `PUT /parent/bus/ride` | parent |
| Giáo viên | `GET /teacher/teaching`, `GET /teacher/classes/:classId/roster`, `PUT .../attendance`, `GET .../grades` | teacher |
| | `POST/PATCH/DELETE /teacher/grades`, `GET/POST/PATCH/DELETE /teacher/homework`, `GET /teacher/homework/:id/submissions` | teacher |
| | `GET /teacher/leaves`, `PATCH /teacher/leaves/:id` (chỉ GVCN) | teacher |
| Bảo vệ | `GET/POST /guard/visitors`, `PATCH /guard/visitors/:id/checkout`, `GET/POST/PATCH /guard/incidents` | guard, admin |
| | `GET /guard/patrol/checkpoints`, `GET /guard/patrol/logs`, `POST /guard/patrol`, `GET /guard/emergency-contacts` | guard, admin |
| Thiết bị | `GET /devices`, `PATCH /devices/:id`, `POST /devices/turn-off` | đọc: mọi vai trò; ghi: guard, admin |
| IoT (ESP32) | `GET /iot/state`, `POST /iot/state` (header `x-device-key`) | thiết bị |

Lỗi trả về dạng `{ "error": "thông báo", "details": ... }` với mã HTTP tương ứng (400, 401, 403, 404, 409...).

## 4. Nối app Expo vào backend

Thêm vào `.env` của app: `EXPO_PUBLIC_API_URL=http://<IP máy chạy server>:4000`
(máy ảo Android dùng `http://10.0.2.2:4000`; điện thoại thật dùng IP LAN của máy tính).

`src/lib/api.js`:

```js
import { supabase } from './supabase';

export async function api(path, { method = 'GET', body } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error || `Lỗi ${res.status}`);
  return json;
}
```

Ví dụ thay trong `AdminCreate.js`:

```js
// trước: unwrap(await supabase.rpc('admin_create_user', {...}))
const r = await api('/admin/users', {
  method: 'POST',
  body: { role, full_name: name.trim(), phone: phone.trim() || null,
          student_code: role === 'parent' ? code.trim() || null : null },
});
```

Nên chuyển dần từng màn hình, bắt đầu từ các màn dùng RPC (`AdminCreate`, `AdminAccounts`, `AdminHome`, `TeacherAnnounce`)
vì đó là chỗ đang thiếu backend thật.

## 5. Lưu ý

- Server dùng `service_role` nên **bỏ qua RLS**: quyền được kiểm tra trong code (`requireRole`, `getStudentOf`,
  `teacherScope`...). Khi thêm route mới, luôn lọc theo người dùng hiện tại.
- Tin nhắn realtime: app vẫn có thể subscribe bảng `messages` / `devices` qua Supabase Realtime (RLS đã cho phép).
- Trigger `log_device_change` ghi nhật ký với `actor_id` rỗng khi thiết bị được đổi qua server (vì `auth.uid()` là null).
- Thanh toán học phí hiện chỉ đánh dấu "đã đóng"; khi tích hợp cổng thanh toán nên xử lý bằng webhook của cổng.
- Chưa có: push notification, upload file/ảnh, quên mật khẩu tự phục vụ (hiện admin cấp lại mật khẩu).
- Chưa có test tự động. Code đã được kiểm tra cú pháp nhưng **chưa chạy thử với Supabase thật**.
