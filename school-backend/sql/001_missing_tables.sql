-- =====================================================================
-- BỔ SUNG SCHEMA: những bảng/cột mà app đang dùng nhưng schema.sql chưa có
-- Chạy SAU schema.sql + seed.sql (Supabase > SQL Editor). Chạy lại nhiều lần vẫn an toàn.
-- =====================================================================

-- ---------- Thông báo: đối tượng nhận + lớp nhận ----------
alter table notices add column if not exists audience text
  check (audience in ('all','hs','ph','gv','bv'));
alter table notices add column if not exists class_id int references classes(id) on delete cascade;
create index if not exists notices_created_idx on notices (created_at desc);

-- ---------- Xe đưa đón: học sinh có đi xe hôm nay không ----------
create table if not exists bus_rides (
  student_id int  not null references students(id) on delete cascade,
  day        date not null,
  trip       trip_kind not null,
  riding     boolean not null default true,
  primary key (student_id, day, trip)
);
alter table bus_rides enable row level security;
drop policy if exists rides_own on bus_rides;
create policy rides_own on bus_rides for all to authenticated
  using (student_id in (select my_student_ids()) or my_role() in ('guard','admin'))
  with check (student_id in (select my_student_ids()));

-- ---------- Bảo vệ ----------
create table if not exists emergency_contacts (
  id    serial primary key,
  name  text not null,
  phone text not null,
  icon  text not null default 'call-outline'      -- tên icon Ionicons
);
create table if not exists patrol_checkpoints (
  id         serial primary key,
  name       text unique not null,
  sort_order int not null default 0
);
alter table emergency_contacts enable row level security;
alter table patrol_checkpoints enable row level security;
drop policy if exists read_all on emergency_contacts;
drop policy if exists read_all on patrol_checkpoints;
create policy read_all on emergency_contacts for select to authenticated using (true);
create policy read_all on patrol_checkpoints for select to authenticated using (true);

-- Dữ liệu mẫu (chỉ chèn khi bảng còn trống) - hãy sửa lại cho đúng thực tế trường bạn
insert into emergency_contacts (name, phone, icon)
select * from (values
  ('Công an',          '113', 'shield-outline'),
  ('Cứu hỏa',          '114', 'flame-outline'),
  ('Cấp cứu',          '115', 'medkit-outline')
) v(name, phone, icon)
where not exists (select 1 from emergency_contacts);

insert into patrol_checkpoints (name, sort_order)
select * from (values
  ('Cổng chính', 1), ('Sân trường', 2), ('Hành lang tầng 1', 3), ('Phòng máy', 4), ('Nhà để xe', 5)
) v(name, sort_order)
where not exists (select 1 from patrol_checkpoints);

-- ---------- Ghi chú ----------
-- Backend Node dùng service_role nên bỏ qua RLS; các policy ở đây và trong schema.sql
-- vẫn là lớp bảo vệ thứ hai nếu app còn gọi thẳng Supabase.
-- Các RPC admin_create_user / admin_set_active / admin_reset_password / admin_send_notice /
-- admin_account_summary / teacher_send_notice không còn cần thiết khi app chuyển sang gọi API.
