-- ============================================================================
-- K-HR · Sprint 1 — Schema Tổ chức (đa pháp nhân) + Phân quyền (RBAC)
-- Postgres / Supabase. Nguồn chân lý của mô hình dữ liệu giai đoạn này.
--
-- Cây tổ chức:  group (tập đoàn) → legal_entity (pháp nhân) → department (phòng ban, dạng cây) → employee
-- Mỗi nhân viên / phòng ban / hợp đồng gắn legal_entity_id để tách dữ liệu theo pháp nhân (pháp lý).
-- Danh mục dùng chung toàn nhóm: job_title (chức danh), role (vai trò), permission (quyền).
-- ============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- 1. TẬP ĐOÀN (group) — đơn vị quản lý chung cao nhất
-- ----------------------------------------------------------------------------
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,            -- VD: KGROUP
  name        text not null,                   -- Tên tập đoàn
  short_name  text,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. PHÁP NHÂN (legal_entity) — mỗi công ty trên giấy tờ (MST, BHXH... riêng)
-- ----------------------------------------------------------------------------
create table if not exists legal_entities (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references groups(id) on delete restrict,
  code         text not null,                  -- VD: PN01
  name         text not null,                  -- Tên hiển thị
  legal_name   text,                           -- Tên pháp lý đầy đủ
  tax_code     text,                           -- Mã số thuế (MST)
  bhxh_code    text,                           -- Mã đơn vị BHXH
  region       smallint check (region between 1 and 4), -- Vùng lương tối thiểu I–IV
  address      text,
  phone        text,
  email        text,
  director     text,                           -- Người đại diện pháp luật
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (group_id, code)
);

-- ----------------------------------------------------------------------------
-- 3. PHÒNG BAN (department) — cây phân cấp trong một pháp nhân
-- ----------------------------------------------------------------------------
create table if not exists departments (
  id               uuid primary key default gen_random_uuid(),
  legal_entity_id  uuid not null references legal_entities(id) on delete cascade,
  parent_id        uuid references departments(id) on delete set null,
  code             text not null,
  name             text not null,
  -- manager_employee_id gắn sau khi có dữ liệu nhân viên (FK thêm ở cuối file)
  manager_employee_id uuid,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  unique (legal_entity_id, code)
);
create index if not exists idx_departments_entity on departments(legal_entity_id);
create index if not exists idx_departments_parent on departments(parent_id);

-- ----------------------------------------------------------------------------
-- 4. CHỨC DANH (job_title) — danh mục dùng chung toàn tập đoàn
-- ----------------------------------------------------------------------------
create table if not exists job_titles (
  id          uuid primary key default gen_random_uuid(),
  group_id    uuid not null references groups(id) on delete cascade,
  code        text not null,
  name        text not null,
  job_level   smallint,                        -- Cấp bậc: 1 NV … 5 BLĐ
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  unique (group_id, code)
);

-- ----------------------------------------------------------------------------
-- 5. NHÂN VIÊN (employee) — bản rút gọn ở Sprint 1 (Core HR đầy đủ ở Sprint 2)
-- ----------------------------------------------------------------------------
create table if not exists employees (
  id               uuid primary key default gen_random_uuid(),
  legal_entity_id  uuid not null references legal_entities(id) on delete restrict,
  department_id    uuid references departments(id) on delete set null,
  job_title_id     uuid references job_titles(id) on delete set null,
  code             text not null,              -- Mã nhân viên
  full_name        text not null,
  email            text,
  status           text not null default 'active'
                     check (status in ('active','probation','inactive','left')),
  created_at       timestamptz not null default now(),
  unique (legal_entity_id, code)
);
create index if not exists idx_employees_entity on employees(legal_entity_id);
create index if not exists idx_employees_dept on employees(department_id);

-- FK department.manager → employee (thêm sau khi cả 2 bảng đã tồn tại)
alter table departments
  add constraint fk_departments_manager
  foreign key (manager_employee_id) references employees(id) on delete set null;

-- ----------------------------------------------------------------------------
-- 6. PHÂN QUYỀN (RBAC): permission · role · role_permission · app_user · assignment
-- ----------------------------------------------------------------------------

-- Quyền hạt nhân, mã dạng "module.action" (VD: employee.read, leave.approve)
create table if not exists permissions (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  module      text not null,                   -- employee | schedule | leave | payroll | org | system ...
  action      text not null,                   -- read | create | update | delete | approve | export ...
  description text
);

-- Vai trò (dùng chung toàn tập đoàn)
create table if not exists roles (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,            -- ADMIN | HRG | HR | MSS | ESS ...
  name        text not null,
  description text,
  is_system   boolean not null default false,  -- true = vai trò lõi, không cho xoá
  created_at  timestamptz not null default now()
);

create table if not exists role_permissions (
  role_id       uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

-- Tài khoản đăng nhập — id trùng auth.users.id của Supabase Auth
create table if not exists app_users (
  id          uuid primary key,                -- = auth.users.id
  employee_id uuid references employees(id) on delete set null,
  email       text not null,
  full_name   text,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Gán vai trò cho người dùng kèm PHẠM VI (scope) dữ liệu được phép
--   GROUP      : toàn tập đoàn (mọi pháp nhân)
--   ENTITY     : 1 pháp nhân (scope_entity_id)
--   DEPARTMENT : 1 phòng ban (scope_department_id)
--   SELF       : chỉ dữ liệu cá nhân
create table if not exists user_role_assignments (
  id                  uuid primary key default gen_random_uuid(),
  app_user_id         uuid not null references app_users(id) on delete cascade,
  role_id             uuid not null references roles(id) on delete cascade,
  scope_type          text not null default 'SELF'
                        check (scope_type in ('GROUP','ENTITY','DEPARTMENT','SELF')),
  scope_entity_id     uuid references legal_entities(id) on delete cascade,
  scope_department_id uuid references departments(id) on delete cascade,
  created_at          timestamptz not null default now(),
  -- Phạm vi phải khớp loại: ENTITY cần entity_id, DEPARTMENT cần department_id
  check (
    (scope_type = 'ENTITY'     and scope_entity_id is not null) or
    (scope_type = 'DEPARTMENT' and scope_department_id is not null) or
    (scope_type in ('GROUP','SELF'))
  )
);
create index if not exists idx_ura_user on user_role_assignments(app_user_id);

-- ----------------------------------------------------------------------------
-- 7. RLS (Row Level Security)
-- Bật sẵn để buộc truy cập qua chính sách. Ở giai đoạn này dùng chính sách tạm
-- "authenticated được đọc"; sẽ siết theo scope pháp nhân khi gắn dữ liệu thật.
-- ----------------------------------------------------------------------------
alter table groups            enable row level security;
alter table legal_entities    enable row level security;
alter table departments       enable row level security;
alter table job_titles        enable row level security;
alter table employees         enable row level security;
alter table permissions       enable row level security;
alter table roles             enable row level security;
alter table role_permissions  enable row level security;
alter table app_users         enable row level security;
alter table user_role_assignments enable row level security;

-- TODO(Sprint sau): thay chính sách tạm bằng kiểm tra theo user_role_assignments
-- (lọc legal_entity_id theo scope của người dùng). Hiện cho phép user đã đăng nhập đọc.
do $$
declare t text;
begin
  foreach t in array array[
    'groups','legal_entities','departments','job_titles','employees',
    'permissions','roles','role_permissions','app_users','user_role_assignments'
  ] loop
    execute format(
      'create policy %I on %I for select to authenticated using (true);',
      t || '_read_auth', t
    );
  end loop;
end $$;
