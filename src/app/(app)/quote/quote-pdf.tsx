"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import {
  Document, Page, Text, View, StyleSheet, Font, pdf, Image,
} from "@react-pdf/renderer";

// Font Việt (Roboto) — /fonts/* resolve theo origin trình duyệt khi sinh PDF client-side.
Font.register({
  family: "Roboto",
  fonts: [
    { src: "/fonts/Roboto-Regular.ttf" },
    { src: "/fonts/Roboto-Bold.ttf", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]); // không tự ngắt từ tiếng Việt

const MAROON = "#9e1b32";
const CREAM = "#fbf5ee";
const INK = "#2b2724";
const GRAY = "#6e655c";
const LINE = "#e6ddcf";

const vnd = (n: number) => (n || 0).toLocaleString("vi-VN") + "₫";

export type PdfLine = { name: string; sku?: string; qty: number; unitPrice: number; amount: number };
export type PdfProposalTier = {
  key: string; label: string; role: string;
  items: { name: string; price: number }[]; total: number; recommended: boolean;
};
export type QuotePdfData = {
  code: string;
  dateLabel: string;
  validLabel: string;
  advisor: string;
  shop: { name: string; tagline: string; address: string; phone: string; email: string; web: string };
  customer: { salutation: string; name: string; phone?: string; address?: string; email?: string };
  lines: PdfLine[];
  subtotal: number;
  discount: number;
  vat: number;
  total: number;
  totalWords: string;
  terms: string[];
  commitments: { title: string; desc: string }[];
  proposal?: { recommended: string; tiers: PdfProposalTier[] };
};

const s = StyleSheet.create({
  page: { fontFamily: "Roboto", fontSize: 9, color: INK, paddingTop: 28, paddingBottom: 44, paddingHorizontal: 34, lineHeight: 1.45 },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  logo: { width: 38, height: 38, marginRight: 10 },
  shopName: { fontSize: 16, fontWeight: 700, color: MAROON },
  tagline: { fontSize: 8, color: GRAY, marginTop: 1 },
  shopInfo: { fontSize: 7.5, color: GRAY, marginTop: 3, lineHeight: 1.5 },
  docTitle: { fontSize: 14, fontWeight: 700, color: MAROON, textAlign: "right", letterSpacing: 1 },
  docMeta: { fontSize: 8, color: GRAY, textAlign: "right", marginTop: 3, lineHeight: 1.6 },
  custBox: { borderTopWidth: 2, borderTopColor: MAROON, borderBottomWidth: 0.6, borderBottomColor: LINE, paddingVertical: 8, marginVertical: 12 },
  custLabel: { fontSize: 7.5, color: GRAY, textTransform: "uppercase" },
  custName: { fontSize: 11, fontWeight: 700, marginTop: 1 },
  custSub: { fontSize: 8, color: GRAY, marginTop: 1 },
  th: { flexDirection: "row", backgroundColor: MAROON, color: "#fff", fontSize: 8, fontWeight: 700, paddingVertical: 5, paddingHorizontal: 5 },
  tr: { flexDirection: "row", borderBottomWidth: 0.6, borderBottomColor: LINE, paddingVertical: 5, paddingHorizontal: 5 },
  cIdx: { width: 18 }, cName: { flex: 1 }, cQty: { width: 32, textAlign: "right" },
  cPrice: { width: 78, textAlign: "right" }, cAmt: { width: 84, textAlign: "right" },
  sku: { fontSize: 7, color: GRAY },
  totBox: { marginTop: 12, marginLeft: "auto", width: 240 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  totFinal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 2, borderTopColor: MAROON, marginTop: 4, paddingTop: 5 },
  totFinalV: { fontSize: 13, fontWeight: 700, color: MAROON },
  words: { fontSize: 8, textAlign: "right", marginTop: 3, color: GRAY },
  secTitle: { fontSize: 10, fontWeight: 700, color: MAROON, marginTop: 16, marginBottom: 5 },
  termItem: { fontSize: 8, color: INK, marginBottom: 2 },
  commitGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
  commitCard: { width: "48%", marginRight: "2%", marginBottom: 6, borderWidth: 0.6, borderColor: LINE, borderRadius: 4, padding: 7, backgroundColor: CREAM },
  commitTitle: { fontSize: 8, fontWeight: 700, color: MAROON },
  commitDesc: { fontSize: 7.2, color: GRAY, marginTop: 2 },
  // proposal
  planHead: { flexDirection: "row" },
  planHeadCell: { flex: 1, padding: 6, backgroundColor: MAROON, alignItems: "center", borderLeftWidth: 0.6, borderLeftColor: "#ffffff44" },
  planHeadRec: { backgroundColor: "#7a1424" },
  planLabel: { color: "#fff", fontSize: 9, fontWeight: 700, textAlign: "center" },
  planRole: { color: "#f0d9b0", fontSize: 6.8, marginTop: 1, textAlign: "center" },
  planBody: { flexDirection: "row" },
  planCol: { flex: 1, borderLeftWidth: 0.6, borderLeftColor: LINE, borderBottomWidth: 0.6, borderBottomColor: LINE, padding: 6, minHeight: 70 },
  planItem: { fontSize: 7.4, marginBottom: 2 },
  planTotal: { fontSize: 11, fontWeight: 700, color: MAROON, marginTop: 6 },
  recTag: { fontSize: 6.5, color: "#fff", backgroundColor: MAROON, alignSelf: "flex-start", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2, marginBottom: 3 },
  signRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 26 },
  signCol: { width: "45%", alignItems: "center" },
  signTitle: { fontSize: 8.5, fontWeight: 700 },
  signSub: { fontSize: 7, color: GRAY },
  footer: { position: "absolute", bottom: 18, left: 34, right: 34, borderTopWidth: 0.6, borderTopColor: LINE, paddingTop: 5, fontSize: 7, color: GRAY, textAlign: "center" },
});

function QuoteDoc({ d }: { d: QuotePdfData }) {
  return (
    <Document title={`Báo giá ${d.code} — ${d.shop.name}`}>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headRow}>
          <View style={{ flexDirection: "row", maxWidth: 320 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="/logo.png" style={s.logo} />
            <View>
              <Text style={s.shopName}>{d.shop.name}</Text>
              <Text style={s.tagline}>{d.shop.tagline}</Text>
              <Text style={s.shopInfo}>{d.shop.address}</Text>
              <Text style={s.shopInfo}>{d.shop.phone} · {d.shop.email} · {d.shop.web}</Text>
            </View>
          </View>
          <View>
            <Text style={s.docTitle}>PHIẾU BÁO GIÁ</Text>
            <Text style={s.docMeta}>{d.code}</Text>
            <Text style={s.docMeta}>Ngày lập: {d.dateLabel}</Text>
            <Text style={s.docMeta}>Hiệu lực đến: {d.validLabel}</Text>
          </View>
        </View>

        {/* Khách hàng */}
        <View style={s.custBox}>
          <Text style={s.custLabel}>Kính gửi {d.customer.salutation}</Text>
          <Text style={s.custName}>{d.customer.name || "Quý khách"}</Text>
          {(d.customer.phone || d.customer.email) && (
            <Text style={s.custSub}>{[d.customer.phone, d.customer.email].filter(Boolean).join(" · ")}</Text>
          )}
          {d.customer.address && <Text style={s.custSub}>{d.customer.address}</Text>}
          {d.advisor && <Text style={s.custSub}>Tư vấn viên: {d.advisor}</Text>}
        </View>

        {/* Bảng 3 phương án (nếu có) */}
        {d.proposal ? (
          <View>
            <Text style={s.secTitle}>Các phương án đề xuất (Good / Better / Best)</Text>
            <View style={s.planHead}>
              {d.proposal.tiers.map((t) => (
                <View key={t.key} style={[s.planHeadCell, t.recommended ? s.planHeadRec : {}]}>
                  <Text style={s.planLabel}>{t.label}</Text>
                  <Text style={s.planRole}>{t.role}</Text>
                </View>
              ))}
            </View>
            <View style={s.planBody}>
              {d.proposal.tiers.map((t) => (
                <View key={t.key} style={s.planCol}>
                  {t.recommended && <Text style={s.recTag}>KHUYẾN NGHỊ</Text>}
                  {t.items.map((it, i) => (
                    <Text key={i} style={s.planItem}>• {it.name} — {vnd(it.price)}</Text>
                  ))}
                  <Text style={s.planTotal}>{vnd(t.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View>
            {/* Bảng dòng hàng 1 phương án */}
            <View style={s.th}>
              <Text style={s.cIdx}>#</Text>
              <Text style={s.cName}>Hạng mục</Text>
              <Text style={s.cQty}>SL</Text>
              <Text style={s.cPrice}>Đơn giá</Text>
              <Text style={s.cAmt}>Thành tiền</Text>
            </View>
            {d.lines.map((l, i) => (
              <View key={i} style={s.tr}>
                <Text style={s.cIdx}>{i + 1}</Text>
                <View style={s.cName}>
                  <Text>{l.name}</Text>
                  {l.sku ? <Text style={s.sku}>SKU {l.sku}</Text> : null}
                </View>
                <Text style={s.cQty}>{l.qty}</Text>
                <Text style={s.cPrice}>{vnd(l.unitPrice)}</Text>
                <Text style={s.cAmt}>{vnd(l.amount)}</Text>
              </View>
            ))}
            <View style={s.totBox}>
              <View style={s.totRow}><Text style={{ color: GRAY }}>Tạm tính</Text><Text>{vnd(d.subtotal)}</Text></View>
              {d.discount > 0 && <View style={s.totRow}><Text style={{ color: GRAY }}>Chiết khấu</Text><Text>− {vnd(d.discount)}</Text></View>}
              <View style={s.totRow}><Text style={{ color: GRAY }}>Trong đó VAT 8%</Text><Text>{vnd(d.vat)}</Text></View>
              <View style={s.totFinal}><Text style={{ fontWeight: 700 }}>Thành tiền (đã gồm VAT)</Text><Text style={s.totFinalV}>{vnd(d.total)}</Text></View>
              <Text style={s.words}>Bằng chữ: {d.totalWords}</Text>
            </View>
          </View>
        )}

        {/* Điều khoản */}
        <Text style={s.secTitle}>Điều khoản & chính sách</Text>
        {d.terms.map((t, i) => <Text key={i} style={s.termItem}>• {t}</Text>)}

        {/* Cam kết */}
        <Text style={s.secTitle}>Cam kết của {d.shop.name}</Text>
        <View style={s.commitGrid}>
          {d.commitments.map((c, i) => (
            <View key={i} style={s.commitCard}>
              <Text style={s.commitTitle}>✓ {c.title}</Text>
              <Text style={s.commitDesc}>{c.desc}</Text>
            </View>
          ))}
        </View>

        {/* Chữ ký */}
        <View style={s.signRow}>
          <View style={s.signCol}><Text style={s.signTitle}>KHÁCH HÀNG</Text><Text style={s.signSub}>(Ký, ghi rõ họ tên)</Text></View>
          <View style={s.signCol}><Text style={s.signTitle}>NGƯỜI LẬP BÁO GIÁ</Text><Text style={s.signSub}>{d.advisor || d.shop.name}</Text></View>
        </View>

        <Text style={s.footer} fixed>{d.shop.name} · {d.shop.address} · {d.shop.phone} — Cảm ơn Quý khách đã tin tưởng!</Text>
      </Page>
    </Document>
  );
}

export function QuotePdfButton({ data }: { data: QuotePdfData }) {
  const [busy, setBusy] = useState(false);
  async function download() {
    setBusy(true);
    try {
      const blob = await pdf(<QuoteDoc d={data} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `BaoGia_${data.code}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e) {
      alert("Lỗi tạo PDF: " + String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <button type="button" className="btn" onClick={download} disabled={busy} style={{ width: "100%" }}>
      <Icon name="download" /> {busy ? "Đang tạo PDF…" : "Tải PDF báo giá"}
    </button>
  );
}
