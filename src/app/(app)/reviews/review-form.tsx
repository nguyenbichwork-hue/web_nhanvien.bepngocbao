"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import { SearchSelect } from "@/components/search-select";
import { REVIEW_CHANNEL_LABEL, REVIEW_CHANNELS, type ReviewChannel } from "@/lib/bnb/types";
import { createReviewAction } from "./actions";

export function ReviewForm({ customers }: { customers: { id: string; name: string }[] }) {
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");

  return (
    <form action={createReviewAction} style={{ display: "grid", gap: 12, marginTop: 14 }}>
      <input type="hidden" name="customerId" value={customerId} />
      <div className="grid-k g-2">
        <div className="field" style={{ margin: 0 }}>
          <label>Chọn khách (Khách 360)</label>
          <SearchSelect
            options={customers.map((c) => ({ value: c.id, label: c.name }))}
            value={customerId}
            onChange={(v) => {
              setCustomerId(v);
              const c = customers.find((x) => x.id === v);
              if (c) setCustomerName(c.name);
            }}
            placeholder="Gõ tên khách hàng…"
          />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Khách hàng *</label>
          <input
            name="customerName"
            required
            placeholder="Tên khách hàng"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label>Kênh</label>
        <select name="channel" defaultValue="google">
          {REVIEW_CHANNELS.map((ch: ReviewChannel) => (
            <option key={ch} value={ch}>{REVIEW_CHANNEL_LABEL[ch]}</option>
          ))}
        </select>
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label>Số sao</label>
        <select name="rating" defaultValue="5">
          {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} sao</option>)}
        </select>
      </div>
      <div className="field" style={{ margin: 0 }}>
        <label>Nội dung</label>
        <textarea name="content" placeholder="Nội dung đánh giá của khách..." />
      </div>
      <button type="submit" className="btn primary"><Icon name="plus" /> Thêm đánh giá</button>
    </form>
  );
}
