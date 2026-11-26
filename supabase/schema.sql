-- =====================================================================
-- SCHOOL APP - Lab 2: Database (Supabase / PostgreSQL)
-- Chạy file này TRƯỚC, sau đó chạy seed.sql (Supabase > SQL Editor)
-- =====================================================================

-- ---------- Kiểu enum ----------
create type user_role     as enum ('parent', 'teacher', 'guard', 'admin');  -- parent = HS / Phụ huynh
create type att_status    as enum ('present', 'late', 'absent');
create type leave_status  as enum ('pending', 'approved', 'rejected');
create type notice_tag    as enum ('school', 'cls', 'urgent');
create type grade_kind    as enum ('oral', 'm15', 'p1', 'mid', 'final');
create type incident_kind as enum ('device', 'security', 'fire', 'other');
create type device_kind   as enum ('light', 'fan', 'ac');
create type log_kind      as enum ('account', 'device', 'system');
create type trip_kind     as enum ('am', 'pm');
create type trip_state    as enum ('next', 'current', 'done');

-- ---------- Tài khoản ----------
-- Đăng nhập bằng Supabase Auth, email = <username>@school.local
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  username   text unique not null,
  full_name  text not null,
  role       user_role not null,
  phone      text,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Trường học ----------
create table classes (
  id          serial primary key,
  name        text unique not null,              -- 10A2
  homeroom_id uuid references profiles(id)       -- GV chủ nhiệm
);

create table subjects (
  id   serial primary key,
  name text unique not null
);

-- Xe đưa đón
create table bus_routes (
  id     serial primary key,
  name   text not null,
  plate  text,
  driver text,
  phone  text
);
create table bus_stops (
  id       serial primary key,
  route_id int not null references bus_routes(id) on delete cascade,
  name     text not null,
  seq      int not null,
  am_time  time,
  pm_time  time
);
create table bus_trips (
  id       serial primary key,
  route_id int not null references bus_routes(id) on delete cascade,
  trip     trip_kind not null,
  state    trip_state not null default 'next',
  status   text,
  note     text,
  unique (route_id, trip)
);

-- Học sinh: mỗi tài khoản HS/PH gắn với 1 học sinh
create table students (
  id          serial primary key,
  code        text unique not null,              -- HS001
  full_name   text not null,
  class_id    int not null references classes(id),
  account_id  uuid unique references profiles(id) on delete set null,
  bus_route_id int references bus_routes(id),
  bus_stop_id  int references bus_stops(id)
);

-- Lịch học / dạy
create table lessons (
  id         serial primary key,
  class_id   int not null references classes(id),
  subject_id int not null references subjects(id),
  teacher_id uuid not null references profiles(id),
  weekday    int not null check (weekday between 2 and 7),   -- 2 = Thứ 2
  period     int not null check (period between 1 and 10),
  start_time time not null,
  room       text
);

-- ---------- Học tập ----------
create table attendance (
  id         serial primary key,
  student_id int not null references students(id) on delete cascade,
  day        date not null,
  status     att_status not null,
  checkin_at time,
  note       text,
  unique (student_id, day)
);

create table grades (
  id         serial primary key,
  student_id int not null references students(id) on delete cascade,
  subject_id int not null references subjects(id),
  kind       grade_kind not null,
  score      numeric(3,1) not null check (score between 0 and 10),
  semester   int not null default 1,
  teacher_id uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table homework (
  id         serial primary key,
  class_id   int not null references classes(id),
  subject_id int not null references subjects(id),
  teacher_id uuid not null references profiles(id),
  title      text not null,
  content    text,
  due_date   date not null,
  created_at timestamptz not null default now()
);
create table homework_submissions (
  homework_id  int not null references homework(id) on delete cascade,
  student_id   int not null references students(id) on delete cascade,
  done         boolean not null default false,
  submitted_at timestamptz,
  primary key (homework_id, student_id)
);

-- ---------- Giao tiếp ----------
create table notices (
  id         serial primary key,
  tag        notice_tag not null,
  title      text not null,
  body       text not null,
  author_id  uuid references profiles(id),
  created_at timestamptz not null default now()
);
create table notice_reads (
  notice_id int  not null references notices(id) on delete cascade,
  user_id   uuid not null references profiles(id) on delete cascade,
  read_at   timestamptz not null default now(),
  primary key (notice_id, user_id)
);

create table messages (
  id          bigserial primary key,
  sender_id   uuid not null references profiles(id) on delete cascade,
  receiver_id uuid not null references profiles(id) on delete cascade,
  body        text not null,
  created_at  timestamptz not null default now()
);
create index on messages (sender_id, receiver_id, created_at);

-- ---------- Phụ huynh ----------
create table fees (
  id         serial primary key,
  student_id int not null references students(id) on delete cascade,
  title      text not null,
  amount     bigint not null check (amount >= 0),
  due_date   date not null,
  paid       boolean not null default false,
  paid_at    date
);

create table leave_requests (
  id         serial primary key,
  student_id int not null references students(id) on delete cascade,
  from_date  date not null,
  days       int not null default 1 check (days > 0),
  reason     text not null,
  note       text,
  status     leave_status not null default 'pending',
  created_at timestamptz not null default now()
);

-- ---------- Bảo vệ + thiết bị IoT (liên kết Lab 1 - ESP32) ----------
create table areas (
  id   text primary key,                          -- r201, lab, yard...
  name text not null
);
create table devices (
  id         serial primary key,
  area_id    text not null references areas(id) on delete cascade,
  kind       device_kind not null,
  is_on      boolean not null default false,
  device_key text unique,                         -- mã thiết bị ESP32 gửi lên
  updated_at timestamptz not null default now(),
  unique (area_id, kind)
);

create table visitors (
  id         serial primary key,
  name       text not null,
  visit_to   text not null,
  reason     text,
  in_at      timestamptz not null default now(),
  out_at     timestamptz,
  guard_id   uuid references profiles(id)
);

create table incidents (
  id         serial primary key,
  kind       incident_kind not null,
  place      text not null,
  description text not null,
  resolved   boolean not null default false,
  guard_id   uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table patrol_logs (
  id         serial primary key,
  guard_id   uuid not null references profiles(id),
  checkpoint text not null,
  checked_at timestamptz not null default now()
);

-- ---------- Nhật ký hệ thống (Admin) ----------
create table activity_logs (
  id         bigserial primary key,
  kind       log_kind not null,
  text       text not null,
  actor_id   uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Trigger: tự ghi nhật ký khi bật/tắt thiết bị
create function log_device_change() returns trigger language plpgsql security definer as $$
begin
  if new.is_on is distinct from old.is_on then
    new.updated_at := now();
    insert into activity_logs(kind, text, actor_id)
    values ('device', (case when new.is_on then 'Bật ' else 'Tắt ' end) || new.kind || ' ' || new.area_id, auth.uid());
  end if;
  return new;
end $$;
create trigger trg_device_change before update on devices
for each row execute function log_device_change();

-- =====================================================================
-- PHÂN QUYỀN (Row Level Security)
-- =====================================================================
create function my_role() returns user_role
language sql stable security definer set search_path = public as
$$ select role from profiles where id = auth.uid() $$;

create function my_student_ids() returns setof int
language sql stable security definer set search_path = public as
$$ select id from students where account_id = auth.uid() $$;

do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','classes','subjects','bus_routes','bus_stops','bus_trips','students','lessons',
    'attendance','grades','homework','homework_submissions','notices','notice_reads','messages',
    'fees','leave_requests','areas','devices','visitors','incidents','patrol_logs','activity_logs'])
  loop execute format('alter table %I enable row level security', t); end loop;
end $$;

-- Dữ liệu dùng chung: mọi người đã đăng nhập được đọc
create policy read_all on classes    for select to authenticated using (true);
create policy read_all on subjects   for select to authenticated using (true);
create policy read_all on bus_routes for select to authenticated using (true);
create policy read_all on bus_stops  for select to authenticated using (true);
create policy read_all on bus_trips  for select to authenticated using (true);
create policy read_all on lessons    for select to authenticated using (true);
create policy read_all on notices    for select to authenticated using (true);
create policy read_all on areas      for select to authenticated using (true);
create policy read_all on devices    for select to authenticated using (true);

-- Tài khoản
create policy profiles_read on profiles for select to authenticated
  using (true);                                                -- cần để hiện tên GV khi nhắn tin
create policy profiles_admin on profiles for all to authenticated
  using (my_role() = 'admin') with check (my_role() = 'admin');

-- Học sinh / dữ liệu gắn với học sinh: PH xem của con, GV + admin xem tất cả
create policy students_read on students for select to authenticated
  using (account_id = auth.uid() or my_role() in ('teacher','admin'));
create policy attendance_read on attendance for select to authenticated
  using (student_id in (select my_student_ids()) or my_role() in ('teacher','admin'));
create policy attendance_teacher on attendance for all to authenticated
  using (my_role() = 'teacher') with check (my_role() = 'teacher');
create policy grades_read on grades for select to authenticated
  using (student_id in (select my_student_ids()) or my_role() in ('teacher','admin'));
create policy grades_teacher on grades for all to authenticated
  using (my_role() = 'teacher') with check (my_role() = 'teacher');
create policy fees_read on fees for select to authenticated
  using (student_id in (select my_student_ids()) or my_role() = 'admin');
create policy fees_pay on fees for update to authenticated
  using (student_id in (select my_student_ids())) with check (student_id in (select my_student_ids()));
create policy leave_read on leave_requests for select to authenticated
  using (student_id in (select my_student_ids()) or my_role() in ('teacher','admin'));
create policy leave_create on leave_requests for insert to authenticated
  with check (student_id in (select my_student_ids()));
create policy leave_review on leave_requests for update to authenticated
  using (my_role() in ('teacher','admin'));

-- Bài tập
create policy homework_read on homework for select to authenticated using (true);
create policy homework_teacher on homework for all to authenticated
  using (my_role() = 'teacher') with check (my_role() = 'teacher');
create policy sub_read on homework_submissions for select to authenticated
  using (student_id in (select my_student_ids()) or my_role() in ('teacher','admin'));
create policy sub_write on homework_submissions for all to authenticated
  using (student_id in (select my_student_ids())) with check (student_id in (select my_student_ids()));

-- Thông báo
create policy notices_admin on notices for all to authenticated
  using (my_role() in ('admin','teacher')) with check (my_role() in ('admin','teacher'));
create policy reads_own on notice_reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Tin nhắn: chỉ người gửi / người nhận
create policy msg_read on messages for select to authenticated
  using (sender_id = auth.uid() or receiver_id = auth.uid());
create policy msg_send on messages for insert to authenticated
  with check (sender_id = auth.uid());

-- Thiết bị: bảo vệ + admin điều khiển
create policy devices_control on devices for update to authenticated
  using (my_role() in ('guard','admin'));

-- Bảo vệ
create policy visitors_guard on visitors for all to authenticated
  using (my_role() in ('guard','admin')) with check (my_role() in ('guard','admin'));
create policy incidents_guard on incidents for all to authenticated
  using (my_role() in ('guard','admin')) with check (my_role() in ('guard','admin'));
create policy patrol_guard on patrol_logs for all to authenticated
  using (my_role() in ('guard','admin')) with check (my_role() in ('guard','admin'));

-- Nhật ký: chỉ admin xem
create policy logs_admin on activity_logs for select to authenticated using (my_role() = 'admin');

-- Realtime cho tin nhắn + thiết bị
alter publication supabase_realtime add table messages, devices;