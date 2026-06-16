-- 0003_schedule.sql — Lịch làm việc (work schedule / roster)
-- Công ty KHÔNG chấm công (không check-in). Đây là lịch để THEO DÕI ai làm ngày nào:
-- nền là lịch hành chính cố định, chỉ lưu NGOẠI LỆ (override) theo ngày.
-- Mirror tầng in-memory web/src/lib/org/{types,store}.ts.

-- Ca làm việc — danh mục dùng chung toàn tập đoàn.
create table if not exists work_shifts (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,            -- HC | SANG | CHIEU | TOI
  name        text not null,                   -- Hành chính
  start_time  time not null,                   -- 09:00
  end_time    time not null,                   -- 18:00
  break_start time,                            -- 12:00
  break_end   time,                            -- 13:30
  work_hours  numeric(4,2) not null default 8, -- giờ làm thực (đã trừ nghỉ trưa)
  is_active   boolean not null default true
);

-- Cấu hình lịch hành chính nền (một dòng dùng chung; có thể mở rộng theo pháp nhân sau).
create table if not exists schedule_config (
  id               int primary key default 1,
  working_weekdays int[] not null default '{1,2,3,4,5}', -- 1=T2 … 7=CN
  default_shift_id uuid references work_shifts(id),
  constraint schedule_config_singleton check (id = 1)
);

-- Loại ngày trên lịch.
do $$ begin
  create type schedule_kind as enum ('work','off','holiday','wfh','business','makeup');
exception when duplicate_object then null; end $$;

-- Ngoại lệ lịch theo ngày của từng nhân viên (override lịch nền).
create table if not exists schedule_entries (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  entry_date  date not null,
  kind        schedule_kind not null,
  shift_id    uuid references work_shifts(id),   -- áp dụng khi kind in (work, wfh, makeup)
  note        text,
  unique (employee_id, entry_date)
);
create index if not exists idx_schedule_entries_emp_date on schedule_entries (employee_id, entry_date);

-- Bật RLS + policy tạm (authenticated đọc); siết theo phạm vi RBAC ở bước nối Auth.
alter table work_shifts      enable row level security;
alter table schedule_config  enable row level security;
alter table schedule_entries enable row level security;
do $$ begin
  create policy schedule_read_shifts  on work_shifts      for select to authenticated using (true);
  create policy schedule_read_config  on schedule_config  for select to authenticated using (true);
  create policy schedule_read_entries on schedule_entries for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- Seed ca + cấu hình nền (T2–T6, ca Hành chính 09:00–18:00 nghỉ trưa 12:00–13:30 = 7.5h).
insert into work_shifts (code, name, start_time, end_time, break_start, break_end, work_hours, is_active) values
  ('HC',    'Hành chính', '09:00', '18:00', '12:00', '13:30', 7.5, true),
  ('SANG',  'Ca sáng',    '08:00', '12:00', null,    null,    4.0, true),
  ('CHIEU', 'Ca chiều',   '13:30', '18:00', null,    null,    4.5, true),
  ('TOI',   'Ca tối',     '18:00', '22:00', null,    null,    4.0, false)
on conflict (code) do nothing;

insert into schedule_config (id, working_weekdays, default_shift_id)
select 1, '{1,2,3,4,5}', s.id from work_shifts s where s.code = 'HC'
on conflict (id) do nothing;
