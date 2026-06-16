// Form hồ sơ nhân viên — dùng chung cho trang Thêm mới và Sửa.
// Server component: nhận server action qua prop `action`.
import Link from "next/link";
import { Icon } from "@/components/icon";
import { ImageUpload } from "@/components/image-upload";
import { VN_BANKS } from "@/lib/org/banks";
import {
  EMPLOYEE_STATUS_LABEL,
  EMPLOYMENT_TYPE_LABEL,
  GENDER_LABEL,
  SCOPE_LABEL,
  type Department,
  type Employee,
  type EmployeeStatus,
  type EmploymentType,
  type Gender,
  type JobTitle,
  type LegalEntity,
  type Role,
  type ScopeType,
} from "@/lib/org/types";

export type ExistingAccount = { email: string; roleName: string; scopeLabel: string };

type Props = {
  action: (fd: FormData) => void | Promise<void>;
  entities: LegalEntity[];
  departments: Department[];
  jobTitles: JobTitle[];
  roles: Role[];
  employee?: Employee; // có → chế độ sửa
  suggestedCode?: string; // mã gợi ý cho chế độ thêm
  existingAccount?: ExistingAccount | null; // tài khoản đã gắn (nếu có)
  /** "self" = nhân viên tự sửa hồ sơ → chỉ hiện thông tin cá nhân, khoá lương/tổ chức/tài khoản. */
  mode?: "full" | "self";
  /** HR đặt lại mật khẩu tạm cho tài khoản đã gắn (chỉ chế độ đầy đủ). */
  resetPasswordAction?: (fd: FormData) => void | Promise<void>;
};

const v = (s?: string | null) => s ?? "";

export function EmployeeForm({
  action,
  entities,
  departments,
  jobTitles,
  roles,
  employee,
  suggestedCode,
  existingAccount,
  mode = "full",
  resetPasswordAction,
}: Props) {
  const isEdit = !!employee;
  const self = mode === "self"; // nhân viên tự phục vụ
  const activeJobTitles = jobTitles.filter((j) => j.isActive || j.id === employee?.jobTitleId);

  return (
    <form action={action}>
      {isEdit && <input type="hidden" name="id" value={employee!.id} />}

      {/* Thông tin cơ bản */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <h3>Thông tin cơ bản</h3>
        </div>
        <div className="grid-k g-3">
          <div className="field">
            <label>Mã nhân viên *</label>
            <input
              name="code"
              required
              defaultValue={employee?.code ?? suggestedCode ?? ""}
              readOnly={isEdit}
              disabled={self}
              placeholder="NV0001"
            />
          </div>
          <div className="field">
            <label>Họ và tên *</label>
            <input name="fullName" required defaultValue={v(employee?.fullName)} disabled={self} placeholder="Nguyễn Văn A" />
          </div>
          <div className="field">
            <label>Giới tính</label>
            <select name="gender" defaultValue={employee?.gender ?? ""}>
              <option value="">—</option>
              {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
                <option key={g} value={g}>
                  {GENDER_LABEL[g]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Ngày sinh</label>
            <input type="date" name="dateOfBirth" defaultValue={v(employee?.dateOfBirth)} />
          </div>
          <div className="field">
            <label>Điện thoại</label>
            <input name="phone" defaultValue={v(employee?.phone)} placeholder="09xxxxxxxx" />
          </div>
          <div className="field">
            <label>Email công việc</label>
            <input type="email" name="email" defaultValue={v(employee?.email)} disabled={self} placeholder="a.nguyen@k-group.vn" />
          </div>
          <div className="field">
            <label>Email cá nhân</label>
            <input type="email" name="personalEmail" defaultValue={v(employee?.personalEmail)} />
          </div>
          <div className="field">
            <label>Số CCCD/CMND</label>
            <input name="nationalId" defaultValue={v(employee?.nationalId)} />
          </div>
          <div className="field">
            <label>Ngày cấp CCCD</label>
            <input type="date" name="nationalIdDate" defaultValue={v(employee?.nationalIdDate)} />
          </div>
          <div className="field">
            <label>Nơi cấp CCCD</label>
            <input name="nationalIdPlace" defaultValue={v(employee?.nationalIdPlace)} />
          </div>
        </div>
        <div className="field">
          <label>Nơi ở hiện tại</label>
          <input name="address" defaultValue={v(employee?.address)} />
        </div>
      </div>

      {/* Ảnh hồ sơ & giấy tờ */}
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <div>
            <h3>Ảnh hồ sơ &amp; giấy tờ</h3>
            <div className="sub">Ảnh được nén tự động trước khi lưu. Định dạng JPG/PNG.</div>
          </div>
        </div>
        <div className="grid-k g-3" style={{ gap: 18, alignItems: "start" }}>
          <ImageUpload
            name="photoUrl"
            label="Ảnh chân dung"
            defaultValue={employee?.photoUrl}
            variant="portrait"
          />
          <ImageUpload
            name="idCardFrontUrl"
            label="CCCD mặt trước"
            defaultValue={employee?.idCardFrontUrl}
            variant="card"
          />
          <ImageUpload
            name="idCardBackUrl"
            label="CCCD mặt sau"
            defaultValue={employee?.idCardBackUrl}
            variant="card"
          />
        </div>
      </div>

      {/* Tài khoản nhận lương — nhân viên tự cập nhật (chế độ self; chế độ đầy đủ nằm ở thẻ Lương) */}
      {self && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div className="card-h">
            <div>
              <h3>Tài khoản nhận lương</h3>
              <div className="sub">Số tài khoản & ngân hàng nhận lương của bạn.</div>
            </div>
          </div>
          <div className="grid-k g-2">
            <div className="field">
              <label>Số tài khoản ngân hàng</label>
              <input name="bankAccount" defaultValue={v(employee?.bankAccount)} />
            </div>
            <div className="field">
              <label>Ngân hàng</label>
              <input name="bankName" list="vn-banks" defaultValue={v(employee?.bankName)} placeholder="Gõ để tìm ngân hàng…" autoComplete="off" />
              <datalist id="vn-banks">
                {VN_BANKS.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>
          </div>
        </div>
      )}

      {/* Tổ chức & công việc */}
      {!self && (
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <h3>Tổ chức & công việc</h3>
        </div>
        <div className="grid-k g-3">
          <div className="field">
            <label>Pháp nhân *</label>
            <select name="legalEntityId" required defaultValue={employee?.legalEntityId ?? entities[0]?.id ?? ""}>
              {entities.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.code} · {e.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Phòng ban</label>
            <select name="departmentId" defaultValue={employee?.departmentId ?? ""}>
              <option value="">—</option>
              {entities.map((e) => {
                const deps = departments.filter((d) => d.legalEntityId === e.id);
                if (!deps.length) return null;
                return (
                  <optgroup key={e.id} label={`${e.code} · ${e.name}`}>
                    {deps.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </optgroup>
                );
              })}
            </select>
          </div>
          <div className="field">
            <label>Chức danh</label>
            <select name="jobTitleId" defaultValue={employee?.jobTitleId ?? ""}>
              <option value="">—</option>
              {activeJobTitles.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Trạng thái *</label>
            <select name="status" defaultValue={employee?.status ?? "active"}>
              {(Object.keys(EMPLOYEE_STATUS_LABEL) as EmployeeStatus[]).map((s) => (
                <option key={s} value={s}>
                  {EMPLOYEE_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Loại hình lao động</label>
            <select name="employmentType" defaultValue={employee?.employmentType ?? ""}>
              <option value="">—</option>
              {(Object.keys(EMPLOYMENT_TYPE_LABEL) as EmploymentType[]).map((t) => (
                <option key={t} value={t}>
                  {EMPLOYMENT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Ngày vào làm</label>
            <input type="date" name="joinDate" defaultValue={v(employee?.joinDate)} />
          </div>
          <div className="field">
            <label>Ngày hết thử việc</label>
            <input type="date" name="probationEndDate" defaultValue={v(employee?.probationEndDate)} />
          </div>
          <div className="field">
            <label>Ngày nghỉ việc</label>
            <input type="date" name="leaveDate" defaultValue={v(employee?.leaveDate)} />
          </div>
        </div>
      </div>
      )}

      {/* Lương · thuế · bảo hiểm */}
      {!self && (
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <h3>Lương · thuế · bảo hiểm</h3>
        </div>
        <div className="grid-k g-4">
          <div className="field">
            <label>Lương cơ bản (VND/tháng)</label>
            <input type="number" name="baseSalary" min="0" step="100000" defaultValue={employee?.baseSalary ?? ""} placeholder="20000000" />
          </div>
          <div className="field">
            <label>Phụ cấp (VND/tháng)</label>
            <input type="number" name="allowance" min="0" step="100000" defaultValue={employee?.allowance ?? ""} placeholder="2000000" />
          </div>
          <div className="field">
            <label>Lương đóng BHXH</label>
            <input type="number" name="insuranceSalary" min="0" step="100000" defaultValue={employee?.insuranceSalary ?? ""} placeholder="mặc định = lương cơ bản" />
          </div>
          <div className="field">
            <label>Số người phụ thuộc</label>
            <input type="number" name="dependents" min="0" step="1" defaultValue={employee?.dependents ?? ""} placeholder="0" />
          </div>
        </div>
        <div className="grid-k g-3">
          <div className="field">
            <label>Mã số thuế cá nhân</label>
            <input name="taxCode" defaultValue={v(employee?.taxCode)} />
          </div>
          <div className="field">
            <label>Số sổ BHXH</label>
            <input name="socialInsuranceNo" defaultValue={v(employee?.socialInsuranceNo)} />
          </div>
          <div className="field">
            <label>Số tài khoản ngân hàng</label>
            <input name="bankAccount" defaultValue={v(employee?.bankAccount)} />
          </div>
          <div className="field">
            <label>Ngân hàng</label>
            <input name="bankName" list="vn-banks" defaultValue={v(employee?.bankName)} placeholder="Gõ để tìm ngân hàng…" autoComplete="off" />
            <datalist id="vn-banks">
              {VN_BANKS.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>
        </div>
        <div className="field">
          <label>Ghi chú</label>
          <textarea name="note" defaultValue={v(employee?.note)} />
        </div>
      </div>
      )}

      {/* Tài khoản đăng nhập */}
      {!self && (
      <div className="card" style={{ marginBottom: 18 }}>
        <div className="card-h">
          <div>
            <h3>Tài khoản đăng nhập</h3>
            <div className="sub">Cho phép nhân viên này vào hệ thống với vai trò &amp; phạm vi tương ứng.</div>
          </div>
          {existingAccount && <span className="badge b-green">Đã có tài khoản</span>}
        </div>

        {existingAccount ? (
          <>
          <div className="grid-k g-3">
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Email đăng nhập</label>
              <input value={existingAccount.email || "—"} disabled />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Vai trò</label>
              <input value={existingAccount.roleName} disabled />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Phạm vi</label>
              <input value={existingAccount.scopeLabel} disabled />
            </div>
          </div>
          {/* HR đặt lại mật khẩu tạm → buộc NV đổi ở lần đăng nhập kế tiếp */}
          {resetPasswordAction && isEdit && (
            <form action={resetPasswordAction} style={{ marginTop: 14 }}>
              <input type="hidden" name="employeeId" value={employee!.id} />
              <p className="muted small" style={{ marginBottom: 10 }}>
                Đặt lại mật khẩu tạm (<code>123456</code>) rồi gửi cho nhân viên qua Zalo/Gmail. Nhân viên sẽ phải đổi mật khẩu ở lần đăng nhập kế tiếp.
              </p>
              <button type="submit" className="btn"><Icon name="key" /> Đặt lại mật khẩu</button>
            </form>
          )}
          </>
        ) : (
          <>
            <label className="flex aic" style={{ gap: 8, marginBottom: 14, fontSize: 13.5, fontWeight: 600 }}>
              <input type="checkbox" name="createAccount" value="1" style={{ width: 18, height: 18 }} />
              Cấp tài khoản đăng nhập cho nhân viên này
            </label>
            <div className="grid-k g-4">
              <div className="field">
                <label>Email đăng nhập</label>
                <input
                  type="email"
                  name="accountEmail"
                  defaultValue={v(employee?.email)}
                  placeholder="dùng email công việc nếu để trống"
                />
              </div>
              <div className="field">
                <label>Vai trò</label>
                <select name="accountRoleId" defaultValue="">
                  <option value="">— Chọn vai trò —</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} · {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Phạm vi dữ liệu</label>
                <select name="accountScopeType" defaultValue="SELF">
                  {(Object.keys(SCOPE_LABEL) as ScopeType[]).map((s) => (
                    <option key={s} value={s}>
                      {SCOPE_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Pháp nhân (nếu phạm vi = 1 pháp nhân)</label>
                <select name="accountScopeEntityId" defaultValue={employee?.legalEntityId ?? ""}>
                  <option value="">(theo pháp nhân của NV)</option>
                  {entities.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.code} · {e.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="muted small" style={{ marginTop: 4 }}>
              Mật khẩu &amp; đăng nhập thật sẽ kích hoạt khi nối Supabase Auth. Hiện chỉ tạo liên kết tài khoản trong hệ thống.
            </p>
          </>
        )}
      </div>
      )}

      <div className="flex gap">
        <button type="submit" className="btn primary">
          <Icon name="check" /> {self ? "Lưu hồ sơ" : isEdit ? "Lưu thay đổi" : "Tạo nhân viên"}
        </button>
        <Link href={self ? "/account" : isEdit ? `/employees/${employee!.id}` : "/employees"} className="btn">
          Huỷ
        </Link>
      </div>
    </form>
  );
}
