// Khung skeleton dùng cho loading.tsx — hiện ngay khi điều hướng (Next streaming)
// trong lúc Server Component fetch dữ liệu, giảm cảm giác "đơ/trắng trang".
export function PageSkeleton({
  kpis = 4,
  chart = true,
  rows = 6,
}: {
  kpis?: number;
  chart?: boolean;
  rows?: number;
}) {
  return (
    <div className="view-in" aria-busy="true" aria-label="Đang tải">
      <div className="skel skel-hero" />
      {kpis > 0 && (
        <div className="grid-k g-4" style={{ gridTemplateColumns: `repeat(${Math.min(kpis, 4)},1fr)` }}>
          {Array.from({ length: kpis }).map((_, i) => (
            <div className="card" key={i}>
              <div className="skel" style={{ width: 50, height: 50, borderRadius: 15, marginBottom: 16 }} />
              <div className="skel skel-line w60" style={{ height: 24 }} />
              <div className="skel skel-line w40" />
            </div>
          ))}
        </div>
      )}
      {chart && (
        <div className="grid-k g-2 mt">
          <div className="card"><div className="skel skel-line w40" /><div className="skel" style={{ height: 240, marginTop: 12 }} /></div>
          <div className="card"><div className="skel skel-line w40" /><div className="skel" style={{ height: 240, marginTop: 12 }} /></div>
        </div>
      )}
      <div className="card mt">
        <div className="skel skel-line w30" style={{ height: 18, marginBottom: 16 }} />
        {Array.from({ length: rows }).map((_, i) => (
          <div className="skel skel-row" key={i} />
        ))}
      </div>
    </div>
  );
}
