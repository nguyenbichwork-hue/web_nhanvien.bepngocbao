import { Icon } from "./icon";

export function Placeholder({
  crumb,
  title,
  desc,
  sprint,
}: {
  crumb: string;
  title: string;
  desc: string;
  sprint: string;
}) {
  return (
    <div className="view-in">
      <div className="crumbs">
        Trang chủ <Icon name="chev" /> {crumb}
      </div>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p>{desc}</p>
        </div>
      </div>
      <div
        className="card"
        style={{
          textAlign: "center",
          padding: "60px 28px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          className="ic"
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "var(--c-indigo-soft)",
            color: "var(--c-indigo)",
            display: "grid",
            placeItems: "center",
          }}
        >
          <Icon name="settings" />
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Sắp ra mắt</h3>
        <p className="muted" style={{ maxWidth: 460 }}>
          Màn hình này nằm trong lộ trình <b>{sprint}</b>. Giao diện đã có trong
          bản prototype K-HR; phần kết nối dữ liệu sẽ được xây dựng ở sprint tương ứng.
        </p>
        <span className="badge b-indigo">{sprint}</span>
      </div>
    </div>
  );
}
