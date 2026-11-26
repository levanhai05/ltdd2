-- =====================================================================
-- SEED DATA - chạy SAU schema.sql
-- Mật khẩu mọi tài khoản demo: 123456
-- Đăng nhập: email = <username>@school.local  (vd ph001@school.local)
-- =====================================================================
create extension if not exists pgcrypto;

-- ---------- 1. Tài khoản (auth.users + profiles) ----------
do $$
declare
  r record; uid uuid;
begin
  for r in select * from (values
    ('admin', 'Quản trị viên',   'admin',   '0900000001'),
    ('ph001', 'Nguyễn Minh An',  'parent',  '0900000002'),
    ('ph002', 'Trần Bảo Châu',   'parent',  '0900000003'),
    ('gv001', 'Lê Thị Hoa',      'teacher', '0900000004'),   -- GVCN
    ('gv002', 'Phạm Văn Nam',    'teacher', '0900000005'),   -- Toán
    ('gv003', 'Võ Thu Hà',       'teacher', '0900000006'),   -- Ngữ văn
    ('gv004', 'Đặng Quốc Bảo',   'teacher', '0900000007'),   -- Tiếng Anh
    ('gv005', 'Hoàng Minh Tuấn', 'teacher', '0900000008'),   -- Vật lý
    ('gv006', 'Bùi Ngọc Lan',    'teacher', '0900000009'),   -- Tin học
    ('bv001', 'Trần Văn Bảo',    'guard',   '0900000010')
  ) as v(username, full_name, role, phone)
  loop
    uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change, email_change_token_new)
    values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      r.username || '@school.local', crypt('123456', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), uid, uid::text,
      jsonb_build_object('sub', uid::text, 'email', r.username || '@school.local'),
      'email', now(), now(), now());
    insert into profiles (id, username, full_name, role, phone, active)
    values (uid, r.username, r.full_name, r.role::user_role, r.phone, r.username <> 'ph002');
  end loop;
end $$;

-- ---------- 2. Lớp, môn ----------
insert into classes (name, homeroom_id) values
  ('10A1', null), ('10A2', (select id from profiles where username = 'gv001')),
  ('10A3', null), ('11A1', null), ('11A2', null), ('12A1', null);

insert into subjects (name) values ('Toán học'), ('Ngữ văn'), ('Tiếng Anh'), ('Vật lý'), ('Tin học');

-- ---------- 3. Xe đưa đón ----------
insert into bus_routes (name, plate, driver, phone) values ('Tuyến 3', '51B-123.45', 'Nguyễn Văn Tài', '0911222333');
insert into bus_stops (route_id, name, seq, am_time, pm_time) values
  (1, 'Trạm Ngã tư A',   1, '06:20', '17:20'),
  (1, 'Trạm Chợ B',      2, '06:32', '17:05'),
  (1, 'Trạm Công viên C',3, '06:45', '16:50'),
  (1, 'Trường THPT Demo',4, '07:00', '16:30');
insert into bus_trips (route_id, trip, state, status, note) values
  (1, 'am', 'done', 'Chuyến sáng đã hoàn thành', 'Xe đã đến trường lúc 06:58'),
  (1, 'pm', 'next', 'Chuyến chiều chưa khởi hành', 'Xe rời trường lúc 16:30');

-- ---------- 4. Học sinh (HS001 gắn tài khoản ph001, HS002 gắn ph002) ----------
insert into students (code, full_name, class_id, account_id, bus_route_id, bus_stop_id) values
  ('HS001', 'Nguyễn Minh An',  2, (select id from profiles where username = 'ph001'), 1, 2),
  ('HS002', 'Trần Bảo Châu',   2, (select id from profiles where username = 'ph002'), 1, 3);
insert into students (code, full_name, class_id)
select 'HS' || lpad(i::text, 3, '0'), 'Học sinh ' || i, 2 from generate_series(3, 8) i;

-- ---------- 5. Thời khóa biểu lớp 10A2 (Thứ 2 -> Thứ 7) ----------
insert into lessons (class_id, subject_id, teacher_id, weekday, period, start_time, room)
select 2, sub.id, (select id from profiles where username = sub.gv), d.wd, p.period, p.t, p.room
from generate_series(2, 7) as d(wd)
cross join (values
  (1, 'Ngữ văn',  'gv003', time '07:00', '201'),
  (2, 'Toán học', 'gv002', time '07:50', '201'),
  (3, 'Tiếng Anh','gv004', time '08:45', 'Lab 2'),
  (4, 'Vật lý',   'gv005', time '09:35', 'Lab 1'),
  (5, 'Tin học',  'gv006', time '10:25', 'Phòng máy 3')
) as p(period, sname, gv, t, room)
join subjects s2 on s2.name = p.sname
join lateral (select s2.id as id, p.gv as gv) sub on true;

-- ---------- 6. Điểm danh 8 ngày gần nhất (HS001) ----------
insert into attendance (student_id, day, status, checkin_at, note) values
  (1, current_date - 1, 'present', '06:52', null),
  (1, current_date - 2, 'present', '06:48', null),
  (1, current_date - 3, 'late',    '07:12', null),
  (1, current_date - 4, 'present', '06:55', null),
  (1, current_date - 5, 'present', '06:50', null),
  (1, current_date - 6, 'absent',  null,    'Nghỉ có phép'),
  (1, current_date - 7, 'present', '06:47', null),
  (1, current_date - 8, 'present', '06:53', null);

-- ---------- 7. Điểm số HS001 ----------
insert into grades (student_id, subject_id, kind, score, semester, teacher_id)
select 1, s.id, k.kind::grade_kind, k.score, 1, (select id from profiles where username = s.gv)
from (values
  ('Toán học', 'gv002', 'oral', 9.0), ('Toán học', 'gv002', 'm15', 8.5), ('Toán học', 'gv002', 'mid', 8.0),
  ('Ngữ văn', 'gv003', 'oral', 8.0), ('Ngữ văn', 'gv003', 'm15', 7.5), ('Ngữ văn', 'gv003', 'mid', 7.8),
  ('Tiếng Anh','gv004', 'oral', 9.0), ('Tiếng Anh','gv004', 'm15', 9.0), ('Tiếng Anh','gv004', 'mid', 9.0),
  ('Vật lý', 'gv005', 'oral', 8.0), ('Vật lý', 'gv005', 'm15', 8.0), ('Vật lý', 'gv005', 'mid', 8.0),
  ('Tin học', 'gv006', 'oral', 9.5), ('Tin học', 'gv006', 'm15', 9.5), ('Tin học', 'gv006', 'mid', 9.5)
) as k(subject, gv, kind, score)
join (select id, name, (case name when 'Toán học' then 'gv002' when 'Ngữ văn' then 'gv003'
       when 'Tiếng Anh' then 'gv004' when 'Vật lý' then 'gv005' else 'gv006' end) as gv from subjects) s
  on s.name = k.subject;

-- ---------- 8. Bài tập ----------
insert into homework (class_id, subject_id, teacher_id, title, content, due_date) values
  (2, 1, (select id from profiles where username='gv002'), 'Bài tập chương 3', 'Làm bài 1-10 trang 45',  current_date + 1),
  (2, 2, (select id from profiles where username='gv003'), 'Soạn bài "Tắt đèn"', 'Soạn theo câu hỏi SGK', current_date + 2),
  (2, 3, (select id from profiles where username='gv004'), 'Làm Unit 5 Workbook', null,                  current_date + 3),
  (2, 4, (select id from profiles where username='gv005'), 'Báo cáo thí nghiệm Bài 7', null,             current_date + 6),
  (2, 5, (select id from profiles where username='gv006'), 'Bài thực hành Excel', null,                  current_date - 2);
insert into homework_submissions (homework_id, student_id, done, submitted_at)
select h.id, 1, h.id >= 4, case when h.id >= 4 then now() end from homework h;

-- ---------- 9. Thông báo ----------
insert into notices (tag, title, body, author_id) values
  ('school', 'Lịch họp phụ huynh học kỳ I',  'Nhà trường tổ chức họp phụ huynh học kỳ I vào 08:00 thứ Bảy tuần sau tại hội trường.', (select id from profiles where username='admin')),
  ('urgent', 'Nhắc nộp học phí học kỳ I',     'Vui lòng hoàn thành học phí học kỳ I trước ngày 30/11. Chi tiết xem mục Học phí.',     (select id from profiles where username='admin')),
  ('cls',    'Nhắc nộp bài tập Toán',          'Cả lớp nộp bài tập chương 3 đúng hạn. Em nào chưa hoàn thành liên hệ giáo viên.',      (select id from profiles where username='gv002')),
  ('school', 'Lịch kiểm tra giữa kỳ',          'Kỳ kiểm tra giữa kỳ diễn ra theo lịch tại bảng tin của trường.',                        (select id from profiles where username='admin'));

-- ---------- 10. Tin nhắn mẫu ----------
insert into messages (sender_id, receiver_id, body, created_at)
select t.id, (select id from profiles where username='ph001'),
       'Chào em, em cần thầy/cô hỗ trợ gì không?', now() - interval '2 hours'
from profiles t where t.role = 'teacher';

-- ---------- 11. Học phí + xin nghỉ ----------
insert into fees (student_id, title, amount, due_date, paid, paid_at) values
  (1, 'Học phí học kỳ I',     4500000, current_date + 4,  false, null),
  (1, 'Bán trú tháng 11',     1200000, current_date - 1,  false, null),
  (1, 'Xe đưa đón tháng 11',   600000, current_date - 1,  true,  current_date - 24),
  (1, 'Đồng phục',             850000, current_date - 80, true,  current_date - 82);
insert into leave_requests (student_id, from_date, days, reason, status) values
  (1, current_date - 6, 1, 'Ốm', 'approved');

-- ---------- 12. Khu vực + thiết bị IoT ----------
insert into areas (id, name) values
  ('r201', 'Phòng 201'), ('r202', 'Phòng 202'), ('lab', 'Phòng máy Tin học'),
  ('hall', 'Hành lang tầng 1'), ('yard', 'Sân trường');
insert into devices (area_id, kind, is_on, device_key) values
  ('r201','light',true,'esp32-r201-light'), ('r201','fan',true,'esp32-r201-fan'), ('r201','ac',false,'esp32-r201-ac'),
  ('r202','light',true,'esp32-r202-light'), ('r202','fan',true,'esp32-r202-fan'), ('r202','ac',true,'esp32-r202-ac'),
  ('lab','light',true,'esp32-lab-light'),   ('lab','fan',false,'esp32-lab-fan'),   ('lab','ac',true,'esp32-lab-ac'),
  ('hall','light',true,'esp32-hall-light'), ('yard','light',true,'esp32-yard-light');

-- ---------- 13. Bảo vệ ----------
insert into visitors (name, visit_to, reason, in_at, out_at, guard_id)
select v.n, v.t, v.r, current_date + v.i, case when v.o is null then null else current_date + v.o end,
       (select id from profiles where username='bv001')
from (values
  ('Lê Văn Khách',   'Văn phòng',   'Liên hệ công việc', time '07:45', null::time),
  ('Phụ huynh em An','GVCN 10A2',   'Gặp giáo viên',     time '08:10', time '08:50'),
  ('Nhà cung cấp',   'Căng tin',    'Giao hàng',         time '09:05', null)
) as v(n, t, r, i, o);

insert into incidents (kind, place, description, resolved, guard_id) values
  ('device', 'Phòng 202', 'Quạt trần kêu to khi chạy.', false, (select id from profiles where username='bv001'));

insert into patrol_logs (guard_id, checkpoint, checked_at)
select (select id from profiles where username='bv001'), c, now() - (i || ' minutes')::interval
from unnest(array['Cổng chính','Sân trường','Dãy A','Dãy B']) with ordinality as x(c, i);

-- ---------- 14. Nhật ký ----------
insert into activity_logs (kind, text, actor_id) values
  ('account', 'Cấp tài khoản ph002',             (select id from profiles where username='admin')),
  ('account', 'Khóa tài khoản ph002',            (select id from profiles where username='admin')),
  ('device',  'Tắt tất cả đèn hành lang tầng 1', (select id from profiles where username='bv001')),
  ('system',  'Gửi thông báo "Lịch họp phụ huynh"', (select id from profiles where username='admin')),
  ('system',  'Sao lưu dữ liệu tự động',         null);