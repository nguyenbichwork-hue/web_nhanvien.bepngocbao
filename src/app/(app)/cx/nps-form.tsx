"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { SearchSelect } from "@/components/search-select";
import { NPS_CHANNEL_LABEL, type NpsChannel } from "@/lib/bnb/types";
import { recordNpsAction } from "./actions";

/** Form ghi nhận NPS — chọn khách để gắn customerId (vào Khách 360 + North Star). */
export function NpsForm({ customers }: { customers: { id: string; name: string }[] }) {
  const [customerId, setCustomerId] = useState("");
  const [name, setName] = useState("");

  return (
    <form action={recordNpsAction} style={{ display: "grid", gap: 12 }}>
      <div className="field" style={{ margin: 0 }}>
        <label>Chọn khách (gắn hồ sơ 360 &amp; North Star)</label>
        <SearchSelect
          options={customers.map((c) => ({ value: c.id, label: c.name }))}
          value={customerId}
          onChange={(v) => { setCustomerId(v); const c = customers.find((x) => x.id === v); if (c) setName(c.name); }}
          placeholder="Gõ tên khách đã có hồ sơ…"
        />
      </div>
      <input type="hidden" name="customerId" value={customerId} />
      <div className="field" style={{ margin: 0 }}>
        <label>Tên khách *</label>
        <input name="customerName" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Tự điền khi chọn khách, hoặc gõ tay" />
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label>Điểm (0–10) *</label>
        <select name="score" defaultValue="10" required>
          {Array.from({ length: 11 }, (_, i) => 10 - i).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label>Kênh</label>
        <select name="channel" defaultValue="zalo">
          {(Object.keys(NPS_CHANNEL_LABEL) as NpsChannel[]).map((c) => <option key={c} value={c}>{NPS_CHANNEL_LABEL[c]}</option>)}
        </select>
      </div>
      <div className="field" style={{ margin: 0 }}><label>Nhận xét</label><textarea name="comment" placeholder="Ý kiến của khách..." /></div>
      <p className="small muted" style={{ margin: 0 }}>Điểm ≥ 9 (khuyến nghị) sẽ tự bật “sẵn sàng giới thiệu” cho khách trên Hành trình CX.</p>
      <button type="submit" className="btn primary"><Icon name="plus" /> Ghi nhận</button>
    </form>
  );
}
