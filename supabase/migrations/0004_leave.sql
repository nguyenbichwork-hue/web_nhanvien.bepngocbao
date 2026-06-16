-- 0004_leave.sql — Nghỉ phép (leave management)
-- Workflow duyệt MỘT cấp. Đơn đã duyệt được Lịch làm việc đọc lại để hiển thị
-- (nguồn sự thật là bảng leave_requests; không ghi trùng vào schedule_entries).
-- Mirror tầng in-memory web/src/lib/org/{types,store}.ts.

-- Loại nghỉ phép — danh mục dùng chung toàn tập đoàn (theo BLLĐ 2019).
create table if not exists leave_types (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique,           -- ANNUAL | SICK | UNPAID | MATERNITY | WEDDING | BEREAVEMENT | OTHER
  name          text not null,                  -- Phép năm
  paid          boolean not null default true,  -- doanh nghiệp trả lương
  deducts_quota boolean not null default false, -- trừ vào quỹ phép năm (chỉ ANNUAL)
  badge         text not null default 'b-gray', -- class màu badge
  is_active     boolean not null default true
);

-- Trạng thái đơn nghỉ.
do $$ begin
  create type leave_status as enum ('pending','approved','rejected','cancelled');
exception when duplicate_object then null; end $$;

-- Đơn xin nghỉ phép.
create table if not exists leave_requests (
  id              uuid primary key default gen_random_uuid(),
  employee_id     uuid not null references employees(id) on delete cascade,
  leave_type_id   uuid not null references leave_types(id),
  start_date      date not null,
  end_date        date not null,                 -- = start_date nếu nghỉ 1 ngày
  half_day        boolean not null default false,-- nghỉ nửa ngày (chỉ khi start = end) → 0.5 ngày
  days            numeric(4,1) not null default 0,-- số ngày công đã tính (chỉ ngày làm việc)
  reason          text,
  status          leave_status not null default 'pending',
  created_at      timestamptz not null default now(),
  decided_at      timestamptz,
  decided_by_name text,
  decision_note   text,
  constraint leave_dates_ck check (end_date >= start_date)
);
create index if not exists idx_leave_requests_emp on leave_requests (employee_id, start_date);
create index if not exists idx_leave_requests_status on leave_requests (status);

-- Bật RLS + policy tạm (authenticated đọc); siết theo phạm vi RBAC ở bước nối Auth.
alter table leave_types    enable row level security;
alter table leave_requests enable row level security;
do $$ begin
  create policy leave_read_types    on leave_types    for select to authenticated using (true);
  create policy leave_read_requests on leave_requests for select to authenticated using (true);
exception when duplicate_object then null; end $$;

-- Seed loại nghỉ phép.
insert into leave_types (code, name, paid, deducts_quota, badge) values
  ('ANNUAL',      'Phép năm',          true,  true,  'b-green'),
  ('SICK',        'Nghỉ ốm',           true,  false, 'b-amber'),
  ('UNPAID',      'Nghỉ không lương',  false, false, 'b-gray'),
  ('MATERNITY',   'Thai sản',          true,  false, 'b-rose'),
  ('WEDDING',     'Nghỉ cưới',         true,  false, 'b-indigo'),
  ('BEREAVEMENT', 'Nghỉ tang',         true,  false, 'b-gray'),
  ('OTHER',       'Việc riêng khác',   false, false, 'b-gray')
on conflict (code) do nothing;
