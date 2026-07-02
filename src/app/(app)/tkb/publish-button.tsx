"use client";
// Nút "Xuất bản" — gom nháp thành snapshot cho web thietkebep.
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { publishTkbAction } from "./actions";

export function PublishButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="flex aic" style={{ gap: 10 }}>
      <button
        className="btn btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setMsg(null);
            const r = await publishTkbAction();
            setMsg(r.ok ? `Đã xuất bản phiên bản ${r.version}` : `Lỗi: ${r.error}`);
            router.refresh();
          })
        }
      >
        {pending ? "Đang xuất bản…" : "Xuất bản lên web"}
      </button>
      {msg ? <span className="small muted">{msg}</span> : null}
    </div>
  );
}
