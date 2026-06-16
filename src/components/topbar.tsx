import { Icon } from "./icon";
import { ThemeToggle } from "./theme-toggle";

export function Topbar({
  name = "Khách",
  role = "Nhân sự",
  initials = "K",
  notif = 0,
}: {
  name?: string;
  role?: string;
  initials?: string;
  notif?: number;
}) {
  return (
    <header className="topbar">
      <div className="search">
        <Icon name="search" />
        <input placeholder="Tìm nhân viên, đơn từ, báo cáo..." />
      </div>
      <div style={{ flex: 1 }} />
      <ThemeToggle />
      <a className="iconbtn" href="/notifications" title="Thông báo" aria-label="Thông báo" style={{ position: "relative" }}>
        <Icon name="bell" />
        {notif > 0 && (
          <span style={{ position: "absolute", top: 2, right: 2, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "var(--c-rose, #ef4444)", color: "#fff", fontSize: 10, fontWeight: 700, display: "grid", placeItems: "center", lineHeight: 1 }}>
            {notif > 9 ? "9+" : notif}
          </span>
        )}
      </a>
      <a className="me" href="/account" title="Tài khoản của tôi">
        <div className="avatar">{initials}</div>
        <div>
          <div className="nm">{name}</div>
          <div className="rl">{role}</div>
        </div>
      </a>
      <a className="iconbtn" href="/auth/signout" title="Đăng xuất" aria-label="Đăng xuất">
        <Icon name="logout" />
      </a>
    </header>
  );
}
