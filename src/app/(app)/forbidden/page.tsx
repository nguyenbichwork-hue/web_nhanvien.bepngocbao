import Link from "next/link";
import { Icon } from "@/components/icon";

export default function ForbiddenPage() {
  return (
    <div className="view-in">
      <div className="card" style={{ maxWidth: 520, margin: "8vh auto", textAlign: "center", padding: 40 }}>
        <div
          className="ic"
          style={{ width: 56, height: 56, margin: "0 auto 18px", color: "var(--rose, #ef4444)" }}
        >
          <Icon name="shield" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Không có quyền truy cập</h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          Tài khoản của bạn không được cấp quyền vào mục này. Nếu cần, hãy liên hệ quản trị viên hệ thống.
        </p>
        <Link href="/dashboard" className="btn primary" style={{ justifyContent: "center" }}>
          <Icon name="grid" /> Về trang chủ
        </Link>
      </div>
    </div>
  );
}
