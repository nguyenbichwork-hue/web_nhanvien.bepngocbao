-- ============================================================================
-- K-HR · Sprint 1 — Dữ liệu nền (seed): tập đoàn + 5 pháp nhân + danh mục + RBAC
-- Idempotent: chạy lại không nhân đôi (on conflict do nothing).
-- ============================================================================

-- 1. Tập đoàn
insert into groups (code, name, short_name) values
  ('KGROUP', 'Tập đoàn K-Group', 'K-Group')
on conflict (code) do nothing;

-- 2. Năm pháp nhân (PN01–PN05). Vùng lương tối thiểu I–IV.
insert into legal_entities (group_id, code, name, legal_name, tax_code, region, is_active)
select g.id, v.code, v.name, v.legal_name, v.tax_code, v.region, true
from groups g
cross join (values
  ('PN01', 'Công ty K-Homes',        'Công ty CP K-Homes',           '0100000001', 1),
  ('PN02', 'Công ty K-Build',        'Công ty CP K-Build',           '0100000002', 1),
  ('PN03', 'Công ty K-Services',     'Công ty TNHH K-Services',      '0100000003', 2),
  ('PN04', 'Công ty K-Trading',      'Công ty CP K-Trading',         '0100000004', 1),
  ('PN05', 'Công ty K-Invest',       'Công ty TNHH K-Invest',        '0100000005', 1)
) as v(code, name, legal_name, tax_code, region)
where g.code = 'KGROUP'
on conflict (group_id, code) do nothing;

-- 3. Chức danh dùng chung toàn tập đoàn
insert into job_titles (group_id, code, name, job_level)
select g.id, v.code, v.name, v.lvl
from groups g
cross join (values
  ('CEO',  'Tổng giám đốc',        5),
  ('DIR',  'Giám đốc',             4),
  ('MGR',  'Trưởng phòng',         3),
  ('LEAD', 'Trưởng nhóm',          2),
  ('SPEC', 'Chuyên viên',          1),
  ('STAFF','Nhân viên',            1)
) as v(code, name, lvl)
where g.code = 'KGROUP'
on conflict (group_id, code) do nothing;

-- 4. Quyền (permission) theo module.action
insert into permissions (code, module, action, description) values
  ('org.read',         'org',         'read',    'Xem cơ cấu tổ chức'),
  ('org.manage',       'org',         'manage',  'Quản lý pháp nhân, phòng ban, chức danh'),
  ('system.rbac',      'system',      'manage',  'Quản lý vai trò & phân quyền'),
  ('employee.read',    'employee',    'read',    'Xem hồ sơ nhân viên'),
  ('employee.create',  'employee',    'create',  'Thêm nhân viên'),
  ('employee.update',  'employee',    'update',  'Sửa hồ sơ nhân viên'),
  ('employee.delete',  'employee',    'delete',  'Xoá nhân viên'),
  ('schedule.read',    'schedule',    'read',    'Xem lịch làm việc'),
  ('schedule.manage',  'schedule',    'manage',  'Xếp & sửa lịch làm việc'),
  ('leave.read',       'leave',       'read',    'Xem nghỉ phép'),
  ('leave.request',    'leave',       'create',  'Tạo đơn nghỉ phép'),
  ('leave.approve',    'leave',       'approve', 'Duyệt đơn nghỉ phép'),
  ('payroll.read',     'payroll',     'read',    'Xem bảng lương'),
  ('payroll.manage',   'payroll',     'manage',  'Tính & chốt lương'),
  ('report.read',      'report',      'read',    'Xem báo cáo'),
  ('report.export',    'report',      'export',  'Xuất báo cáo')
on conflict (code) do nothing;

-- 5. Vai trò lõi
insert into roles (code, name, description, is_system) values
  ('ADMIN', 'Quản trị hệ thống', 'Toàn quyền hệ thống, cấu hình & phân quyền',        true),
  ('HRG',   'HR Tập đoàn',       'Nhân sự cấp tập đoàn — xem/sửa mọi pháp nhân',       true),
  ('HR',    'HR Pháp nhân',      'Nhân sự trong phạm vi một pháp nhân',                true),
  ('MSS',   'Quản lý trực tiếp', 'Trưởng đơn vị — xếp lịch, duyệt đơn, xem nhân sự phòng ban', true),
  ('ESS',   'Nhân viên',         'Tự phục vụ — xem lịch & gửi đơn của bản thân',       true)
on conflict (code) do nothing;

-- 6. Gán quyền cho vai trò
--   ADMIN: tất cả
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p
where r.code = 'ADMIN'
on conflict do nothing;

--   HRG: tất cả trừ system.rbac (cấu hình quyền là việc của ADMIN)
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p on p.code <> 'system.rbac'
where r.code = 'HRG'
on conflict do nothing;

--   HR: như HRG nhưng không quản lý tổ chức (org.manage)
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p
  on p.code not in ('system.rbac','org.manage')
where r.code = 'HR'
on conflict do nothing;

--   MSS: đọc nhân sự/lịch làm việc/nghỉ phép/báo cáo + xếp lịch + duyệt nghỉ phép
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p
  on p.code in ('org.read','employee.read','schedule.read','schedule.manage',
                'leave.read','leave.approve','report.read')
where r.code = 'MSS'
on conflict do nothing;

--   ESS: tự xem lịch + gửi đơn nghỉ phép
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p
  on p.code in ('employee.read','schedule.read','leave.read','leave.request')
where r.code = 'ESS'
on conflict do nothing;
