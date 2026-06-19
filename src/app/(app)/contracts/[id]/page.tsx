import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/icon";
import { PageHero } from "@/components/page-hero";
import { updateContractAction } from "@/lib/org/actions";
import { getContract, getEmployee } from "@/lib/org/store";
import { CONTRACT_TYPE_LABEL, type ContractType } from "@/lib/org/types";
import { requirePermission } from "@/lib/auth/session";
import { canSeeEmployee } from "@/lib/auth/scope";

export default async function ContractEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requirePermission("contract.manage");
  const { id } = await params;
  const c = await getContract(id);
  if (!c) notFound();
  if (!(await canSeeEmployee(session, c.employeeId))) redirect("/forbidden");
  const emp = await getEmployee(c.employeeId);

  return (
    <div>
      <PageHero
        icon="doc"
        title={c.code}
        subtitle="Cập nhật hợp đồng lao động"
        crumb={[["Trang chủ", "/dashboard"], ["Nhân sự"], ["Hợp đồng", "/contracts"], [c.code]]}
        actions={
          <>
            <span className="badge b-indigo">{emp?.fullName ?? "—"}</span>
            <Link href="/contracts" className="iconbtn" title="Quay lại"><Icon name="chevleft" /></Link>
          </>
        }
      />

      <div className="card" style={{ maxWidth: 820 }}>
        <form action={updateContractAction}>
          <input type="hidden" name="id" value={c.id} />
          <input type="hidden" name="employeeId" value={c.employeeId} />
          <div className="grid-k g-2" style={{ gap: 14 }}>
            <div className="field">
              <label>Số hợp đồng *</label>
              <input name="code" required defaultValue={c.code} />
            </div>
            <div className="field">
              <label>Loại HĐ</label>
              <select name="type" defaultValue={c.type}>
                {(Object.keys(CONTRACT_TYPE_LABEL) as ContractType[]).map((t) => (
                  <option key={t} value={t}>{CONTRACT_TYPE_LABEL[t]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Ngày bắt đầu *</label>
              <input type="date" name="startDate" required defaultValue={c.startDate} />
            </div>
            <div className="field">
              <label>Ngày kết thúc <span className="muted small">(bỏ trống nếu vô thời hạn)</span></label>
              <input type="date" name="endDate" defaultValue={c.endDate ?? ""} />
            </div>
            <div className="field">
              <label>Ngày ký</label>
              <input type="date" name="signedDate" defaultValue={c.signedDate ?? ""} />
            </div>
            <div className="field">
              <label>Lương cơ bản</label>
              <input type="number" name="baseSalary" min="0" step="100000" defaultValue={c.baseSalary ?? ""} />
            </div>
            <div className="field">
              <label>Phụ cấp</label>
              <input type="number" name="allowance" min="0" step="100000" defaultValue={c.allowance ?? ""} />
            </div>
          </div>
          <div className="field">
            <label>Ghi chú</label>
            <input name="note" defaultValue={c.note ?? ""} />
          </div>
          <div className="flex gap">
            <button type="submit" className="btn primary"><Icon name="check" /> Lưu</button>
            <Link href="/contracts" className="btn">Huỷ</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
