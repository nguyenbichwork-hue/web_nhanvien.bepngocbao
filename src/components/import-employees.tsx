"use client";

import { useActionState } from "react";
import { Icon } from "@/components/icon";
import { importEmployeesAction, type ImportResult } from "@/lib/org/actions";

export function ImportEmployees() {
  const [state, action, pending] = useActionState<ImportResult | null, FormData>(
    importEmployeesAction,
    null,
  );

  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <div className="card-h"><h3>Nhập từ tệp Excel</h3></div>
      <form action={action}>
        <div className="field">
          <label>Chọn tệp Excel (.xlsx)</label>
          <input
            type="file"
            name="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            required
          />
        </div>
        <button type="submit" className="btn primary" disabled={pending}>
          <Icon name="userplus" /> {pending ? "Đang nhập…" : "Nhập nhân viên"}
        </button>
      </form>

      {state && (
        <div style={{ marginTop: 16 }}>
          <div className="flex gap" style={{ flexWrap: "wrap" }}>
            <span className="badge b-green">Tạo mới: {state.created}</span>
            {state.failed > 0 && <span className="badge b-rose">Lỗi: {state.failed}</span>}
          </div>
          {state.errors.length > 0 && (
            <ul className="small" style={{ color: "var(--c-rose)", lineHeight: 1.8, paddingLeft: 18, marginTop: 10 }}>
              {state.errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
