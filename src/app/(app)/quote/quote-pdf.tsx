"use client";

import { useState } from "react";
import { Icon } from "@/components/icon";
import {
  Document, Page, Text, View, StyleSheet, Font, pdf, Image,
} from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

// Font Việt (Roboto) — /fonts/* resolve theo origin trình duyệt khi sinh PDF client-side.
Font.register({
  family: "Roboto",
  fonts: [
    { src: "/fonts/Roboto-Regular.ttf" },
    { src: "/fonts/Roboto-Bold.ttf", fontWeight: 700 },
  ],
});
Font.registerHyphenationCallback((w) => [w]); // không tự ngắt từ tiếng Việt

const MAROON = "#7a1b29";
const MAROON_DARK = "#5c121d";
const CREAM = "#f7efe0";
const GOLD = "#b8923a";
const INK = "#2b2724";
const GRAY = "#6e655c";
const LINE = "#e6ddcf";

const vnd = (n: number) => (n || 0).toLocaleString("vi-VN") + " ₫";

export type PdfLine = { name: string; sku?: string; qty: number; unitPrice: number; amount: number; image?: string };
export type PdfProposalTier = {
  key: string; label: string; role: string;
  items: { name: string; price: number; image?: string }[]; total: number; recommended: boolean;
};
export type QuotePdfData = {
  code: string;
  dateLabel: string;
  validLabel: string;
  advisor: string;
  salutation?: string;
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
  page: {
    fontFamily: "Roboto",
    fontSize: 9,
    color: INK,
    paddingTop: 30,
    paddingBottom: 46,
    paddingHorizontal: 34,
    lineHeight: 1.35,
  },

  /* header */
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  logo: { width: 40, height: 40, marginRight: 10 },
  shopName: { fontSize: 16, fontWeight: 700, color: MAROON },
  tagline: { fontSize: 7.5, color: GRAY, marginTop: 2, fontStyle: "italic" },
  shopInfo: { fontSize: 7.5, color: GRAY, marginTop: 3, lineHeight: 1.5 },
  titleBox: { backgroundColor: CREAM, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 3, width: 188 },
  titleBig: { fontSize: 13, fontWeight: 700, color: MAROON, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.5 },
  titleMeta: { fontSize: 8, color: INK, textAlign: "center", marginTop: 4 },

  /* greeting callout */
  callout: { backgroundColor: CREAM, padding: 10, borderRadius: 3, marginBottom: 12 },
  calloutText: { fontSize: 8.5, color: INK, marginBottom: 3 },

  /* section bar */
  sectionBar: {
    flexDirection: "row", alignItems: "center", backgroundColor: MAROON,
    paddingVertical: 6, paddingHorizontal: 10, marginTop: 6, marginBottom: 8, borderRadius: 2,
  },
  sectionTag: {
    backgroundColor: MAROON_DARK, color: "#e7c4ca", fontSize: 7.5, fontWeight: 700,
    paddingVertical: 2, paddingHorizontal: 6, borderRadius: 2, marginRight: 8,
  },
  sectionTitle: { color: "#fff", fontSize: 11, fontWeight: 700 },

  intro: { fontSize: 8, color: GRAY, marginBottom: 8 },

  subHead: {
    fontSize: 9.5, fontWeight: 700, color: MAROON, marginTop: 6, marginBottom: 5,
    paddingBottom: 3, borderBottomWidth: 1.2, borderBottomColor: GOLD,
  },

  /* cost formula */
  formula: { textAlign: "center", fontSize: 12, fontWeight: 700, color: MAROON, marginVertical: 8 },

  /* 3-col table (Hạng mục | Khi nào | Ghi chú) */
  t3Head: { flexDirection: "row", backgroundColor: MAROON, borderRadius: 2 },
  t3HeadCell: { color: "#fff", fontSize: 8.5, fontWeight: 700, paddingVertical: 5, paddingHorizontal: 7, textAlign: "center" },
  t3Wrap: { borderWidth: 0.8, borderColor: LINE, borderTopWidth: 0 },
  t3Row: { flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: LINE },
  t3c1: { width: 170, fontSize: 8.5, fontWeight: 700, color: MAROON, paddingVertical: 5, paddingHorizontal: 7, backgroundColor: "#fbf7ef" },
  t3c2: { width: 80, paddingVertical: 5, paddingHorizontal: 7, fontSize: 8.3, fontWeight: 700, color: MAROON, textAlign: "center", justifyContent: "center" },
  t3c3: { flex: 1, paddingVertical: 5, paddingHorizontal: 7, fontSize: 7.8, color: GRAY },

  /* line-item table */
  th: { flexDirection: "row", backgroundColor: MAROON, color: "#fff", fontSize: 8, fontWeight: 700, paddingVertical: 6, paddingHorizontal: 5, borderRadius: 2 },
  tr: { flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: LINE, paddingVertical: 5, paddingHorizontal: 5, alignItems: "center" },
  cIdx: { width: 18 },
  cName: { flex: 1, flexDirection: "row", alignItems: "center" },
  cThumb: { width: 30, height: 30, marginRight: 6, objectFit: "contain", borderWidth: 0.5, borderColor: LINE, borderRadius: 2 },
  cQty: { width: 32, textAlign: "right" },
  cPrice: { width: 78, textAlign: "right" },
  cAmt: { width: 84, textAlign: "right" },
  sku: { fontSize: 7, color: GRAY },

  totBox: { marginTop: 12, marginLeft: "auto", width: 250 },
  totRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2.5 },
  totFinal: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 2, borderTopColor: MAROON, marginTop: 4, paddingTop: 5 },
  totFinalV: { fontSize: 13, fontWeight: 700, color: MAROON },
  words: { fontSize: 8, textAlign: "right", marginTop: 3, color: GRAY, fontStyle: "italic" },

  /* terms */
  termItem: { fontSize: 8.3, color: INK, marginBottom: 3, flexDirection: "row" },
  termBullet: { width: 12, color: GOLD, fontWeight: 700 },
  termText: { flex: 1 },

  /* combo / proposal 3 gói */
  pkgWrap: { borderWidth: 0.8, borderColor: LINE, borderRadius: 2, marginTop: 4 },
  pkgHead: { flexDirection: "row", backgroundColor: MAROON },
  pkgHeadCell: { flex: 1, paddingVertical: 6, paddingHorizontal: 5, alignItems: "center", justifyContent: "center", borderLeftWidth: 0.6, borderLeftColor: "#ffffff33" },
  pkgHeadCellRec: { backgroundColor: MAROON_DARK },
  pkgHeadName: { color: "#fff", fontSize: 8.5, fontWeight: 700, textAlign: "center" },
  pkgHeadRole: { color: "#f0d9b0", fontSize: 6.8, textAlign: "center", marginTop: 1 },
  pkgBody: { flexDirection: "row" },
  pkgCol: { flex: 1, borderLeftWidth: 0.6, borderLeftColor: LINE, padding: 6, minHeight: 80 },
  pkgColRec: { backgroundColor: CREAM },
  pkgRecTag: { fontSize: 6.5, color: "#fff", backgroundColor: MAROON, alignSelf: "flex-start", paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2, marginBottom: 4 },
  pkgItemRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  pkgItemThumb: { width: 18, height: 18, marginRight: 4, objectFit: "contain", borderRadius: 1.5 },
  pkgItem: { fontSize: 7.4, flex: 1 },
  pkgTotalRow: { flexDirection: "row", backgroundColor: MAROON, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  pkgTotalCell: { flex: 1, paddingVertical: 6, paddingHorizontal: 5, alignItems: "center", borderLeftWidth: 0.6, borderLeftColor: "#ffffff33" },
  pkgTotalCellRec: { backgroundColor: MAROON_DARK },
  pkgTotalText: { fontSize: 9.5, fontWeight: 700, color: "#fff" },

  /* commitments */
  commitBar: { backgroundColor: MAROON, paddingVertical: 7, alignItems: "center", borderRadius: 2, marginBottom: 8, marginTop: 6 },
  commitBarText: { color: "#fff", fontSize: 10, fontWeight: 700 },
  commitItem: { marginBottom: 8, paddingBottom: 7, borderBottomWidth: 0.6, borderBottomColor: LINE },
  commitNo: { fontSize: 8, fontWeight: 700, color: GOLD },
  commitTitle: { fontSize: 9.5, fontWeight: 700, color: MAROON, marginBottom: 2 },
  commitText: { fontSize: 8.3, color: INK },

  /* signatures */
  sigRow: { flexDirection: "row", justifyContent: "space-around", marginTop: 22 },
  sigBox: { width: "42%", alignItems: "center" },
  sigTitle: { fontSize: 9.5, fontWeight: 700, color: MAROON },
  sigSub: { fontSize: 7.5, color: GRAY, marginBottom: 46 },
  sigLine: { borderTopWidth: 0.8, borderTopColor: INK, width: "90%" },
  thankYou: { textAlign: "center", fontSize: 8.5, color: GRAY, marginTop: 22 },

  /* footer — fixed + absolute riêng lẻ, lặp mỗi trang */
  footerRule: { position: "absolute", bottom: 44, left: 34, right: 34, borderTopWidth: 1, borderTopColor: MAROON },
  footerAbs: { position: "absolute", left: 34, right: 34, textAlign: "center" },
  footerName: { fontSize: 7.5, color: INK },
  footerLine: { fontSize: 7, color: GRAY, lineHeight: 1.5 },
});

/* ---------- primitives ---------- */

function Footer({ d }: { d: QuotePdfData }) {
  return (
    <>
      <View style={s.footerRule} fixed />
      <Text style={[s.footerAbs, s.footerName, { bottom: 28 }]} fixed>
        {`${d.shop.name}   ·   ${d.shop.address}`}
      </Text>
      <Text style={[s.footerAbs, s.footerLine, { bottom: 19 }]} fixed>
        {`Hotline: ${d.shop.phone}   ·   Website: ${d.shop.web}   ·   Cảm ơn Quý khách`}
      </Text>
      <Text
        style={[s.footerAbs, s.footerLine, { bottom: 10 }]}
        fixed
        render={({ pageNumber, totalPages }) => `Trang ${pageNumber} / ${totalPages}`}
      />
    </>
  );
}

function SectionBar({ tag, title }: { tag: string; title: string }) {
  return (
    <View style={s.sectionBar}>
      <Text style={s.sectionTag}>{tag}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

/* ảnh sản phẩm an toàn: chỉ render khi có URL http(s). */
function Thumb({ src, style }: { src?: string; style: Style }) {
  const url = (src || "").trim();
  if (!url || !/^https?:\/\//i.test(url)) return null;
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image src={url} style={style} />;
}

/* ---------- main document ---------- */

function QuoteDoc({ d }: { d: QuotePdfData }) {
  const sal = d.salutation || d.customer.salutation || "Anh/Chị";
  const xungName = d.customer.name ? `${sal} ${d.customer.name}` : sal;

  return (
    <Document title={`Báo giá ${d.code} — ${d.shop.name}`} author={d.shop.name}>
      {/* ===== TRANG 1: Header + Phần 01 (chi phí) + Phần 02 (chi tiết) ===== */}
      <Page size="A4" style={s.page} wrap>
        {/* Footer đặt đầu (absolute) để `fixed` lặp đúng mọi trang vật lý */}
        <Footer d={d} />

        {/* HEADER */}
        <View style={s.headerRow}>
          <View style={{ flexDirection: "row", maxWidth: 330 }}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src="/logo.png" style={s.logo} />
            <View>
              <Text style={s.shopName}>{d.shop.name}</Text>
              <Text style={s.tagline}>{d.shop.tagline}</Text>
              <Text style={s.shopInfo}>{d.shop.address}</Text>
              <Text style={s.shopInfo}>{d.shop.phone} · {d.shop.email} · {d.shop.web}</Text>
            </View>
          </View>
          <View style={s.titleBox}>
            <Text style={s.titleBig}>Phiếu báo giá</Text>
            <Text style={s.titleMeta}>Số: {d.code}</Text>
            <Text style={s.titleMeta}>Ngày lập: {d.dateLabel}</Text>
            <Text style={s.titleMeta}>Hiệu lực đến: {d.validLabel}</Text>
          </View>
        </View>

        {/* GREETING */}
        <View style={s.callout}>
          <Text style={s.calloutText}>Kính gửi {xungName},</Text>
          <Text style={s.calloutText}>
            {d.shop.name} xin gửi báo giá chi tiết cho gia đình. Báo giá minh bạch theo tổng chi phí
            (không chỉ giá tem), đã gồm VAT và không có phí ẩn — {sal} có thể yên tâm đối chiếu trước
            khi quyết định.
          </Text>
          <Text style={s.calloutText}>Bên em cảm ơn {xungName} đã dành thời gian cho {d.shop.name}.</Text>
        </View>

        {/* ===== PHẦN 01 — Phân tích chi phí ===== */}
        <SectionBar tag="Phần 01" title="Phân tích chi phí (không chỉ giá tem)" />
        <Text style={s.intro}>
          Mua thiết bị bếp không chỉ là giá niêm yết. Để {xungName} so sánh chính xác giữa các nơi,
          {" "}{d.shop.name} minh bạch theo công thức:
        </Text>
        <Text style={s.formula}>MUA + LẮP + DÙNG + BẢO TRÌ</Text>

        <View style={s.t3Head}>
          <Text style={[s.t3HeadCell, { width: 170, textAlign: "left" }]}>Hạng mục chi phí</Text>
          <Text style={[s.t3HeadCell, { width: 80 }]}>Khi nào</Text>
          <Text style={[s.t3HeadCell, { flex: 1 }]}>Ghi chú minh bạch</Text>
        </View>
        <View style={s.t3Wrap}>
          {[
            ["Giá thiết bị (chi tiết bên dưới)", "Khi mua", "Đã gồm Thuế GTGT (VAT) — không có phí ẩn"],
            ["Khảo sát & lắp đặt", "Khi mua", "BNB hỗ trợ trong khu vực"],
            ["Chỉnh sửa tủ bếp / khoét đá", "Nếu cần", "Báo riêng — chỉ phát sinh khi kích thước chưa khớp"],
            ["Phụ kiện đi kèm (ống xả, dây cấp...)", "Khi mua", "Báo riêng nếu cần"],
            ["Vận hành (điện, nước, chất tẩy...)", "Hằng tháng", "Tham khảo tùy thiết bị"],
            ["Bảo trì định kỳ", "Mỗi 6–12 tháng", "BNB nhắc & bảo trì ưu đãi cho khách BNB"],
            ["Bảo hành lỗi NSX", "Khi cần", "Theo chính sách hãng (Bosch 3 năm, hãng khác 1–2 năm)"],
          ].map((r, i, arr) => (
            <View key={i} style={i === arr.length - 1 ? [s.t3Row, { borderBottomWidth: 0 }] : s.t3Row}>
              <Text style={s.t3c1}>{r[0]}</Text>
              <Text style={s.t3c2}>{r[1]}</Text>
              <Text style={s.t3c3}>{r[2]}</Text>
            </View>
          ))}
        </View>

        {/* ===== PHẦN 02 — Chi tiết báo giá ===== */}
        <SectionBar tag="Phần 02" title="Chi tiết báo giá" />
        {d.proposal ? (
          <>
            <Text style={s.intro}>
              {d.shop.name} đề xuất {d.proposal.tiers.length} phương án để {xungName} so sánh đúng giá
              trị tổng thể. Phương án {d.shop.name} khuyến nghị được đánh dấu nổi bật:
            </Text>
            <View style={s.pkgWrap}>
              <View style={s.pkgHead}>
                {d.proposal.tiers.map((t) => (
                  <View key={t.key} style={t.recommended ? [s.pkgHeadCell, s.pkgHeadCellRec] : s.pkgHeadCell}>
                    <Text style={s.pkgHeadName}>{t.label}</Text>
                    <Text style={s.pkgHeadRole}>{t.recommended ? "★ BNB khuyến nghị" : t.role}</Text>
                  </View>
                ))}
              </View>
              <View style={s.pkgBody}>
                {d.proposal.tiers.map((t) => (
                  <View key={t.key} style={t.recommended ? [s.pkgCol, s.pkgColRec] : s.pkgCol}>
                    {t.recommended && <Text style={s.pkgRecTag}>KHUYẾN NGHỊ</Text>}
                    {t.items.map((it, i) => (
                      <View key={i} style={s.pkgItemRow}>
                        <Thumb src={it.image} style={s.pkgItemThumb} />
                        <Text style={s.pkgItem}>{it.name} — {vnd(it.price)}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
              <View style={s.pkgTotalRow}>
                {d.proposal.tiers.map((t) => (
                  <View key={t.key} style={t.recommended ? [s.pkgTotalCell, s.pkgTotalCellRec] : s.pkgTotalCell}>
                    <Text style={s.pkgTotalText}>{vnd(t.total)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={s.th}>
              <Text style={s.cIdx}>#</Text>
              <Text style={s.cName}>Hạng mục</Text>
              <Text style={s.cQty}>SL</Text>
              <Text style={s.cPrice}>Đơn giá</Text>
              <Text style={s.cAmt}>Thành tiền</Text>
            </View>
            {d.lines.map((l, i) => (
              <View key={i} style={s.tr} wrap={false}>
                <Text style={s.cIdx}>{i + 1}</Text>
                <View style={s.cName}>
                  <Thumb src={l.image} style={s.cThumb} />
                  <View style={{ flex: 1 }}>
                    <Text>{l.name}</Text>
                    {l.sku ? <Text style={s.sku}>SKU {l.sku}</Text> : null}
                  </View>
                </View>
                <Text style={s.cQty}>{l.qty}</Text>
                <Text style={s.cPrice}>{vnd(l.unitPrice)}</Text>
                <Text style={s.cAmt}>{vnd(l.amount)}</Text>
              </View>
            ))}
            <View style={s.totBox} wrap={false}>
              <View style={s.totRow}><Text style={{ color: GRAY }}>Tạm tính</Text><Text>{vnd(d.subtotal)}</Text></View>
              {d.discount > 0 && (
                <View style={s.totRow}><Text style={{ color: GRAY }}>Chiết khấu</Text><Text>− {vnd(d.discount)}</Text></View>
              )}
              <View style={s.totRow}><Text style={{ color: GRAY }}>Trong đó VAT 8%</Text><Text>{vnd(d.vat)}</Text></View>
              <View style={s.totFinal}><Text style={{ fontWeight: 700 }}>Thành tiền (đã gồm VAT)</Text><Text style={s.totFinalV}>{vnd(d.total)}</Text></View>
              <Text style={s.words}>Bằng chữ: {d.totalWords}</Text>
            </View>
          </>
        )}
      </Page>

      {/* ===== TRANG 2: Phần 03 — Điều khoản & Cam kết ===== */}
      <Page size="A4" style={s.page} wrap>
        <Footer d={d} />

        <SectionBar tag="Phần 03" title="Điều khoản & Cam kết" />
        <Text style={s.intro}>
          {d.shop.name} cam kết minh bạch điều khoản và đồng hành với {xungName} trước, trong và sau khi mua:
        </Text>

        {d.terms.map((t, i) => (
          <View key={i} style={s.termItem}>
            <Text style={s.termBullet}>•</Text>
            <Text style={s.termText}>{t}</Text>
          </View>
        ))}

        <View style={s.commitBar}>
          <Text style={s.commitBarText}>6 cam kết của {d.shop.name}</Text>
        </View>
        {[
          ["01", "Nếu BNB tư vấn sai, BNB chịu trách nhiệm", "Sản phẩm BNB tư vấn không vừa kích thước hoặc không phù hợp nhu cầu đã ghi nhận → BNB đổi miễn phí và chịu chi phí lắp đặt lại."],
          ["02", "Khảo sát tại nhà & lắp đặt", "BNB cử kỹ thuật đến đo thực tế trước khi lắp, đảm bảo không lỗi kích thước."],
          ["03", "Phản hồi trong 24 giờ", `Có vấn đề sử dụng, ${sal} gọi hotline BNB — bên em phản hồi trong 24 giờ.`],
          ["04", "Đồng hành sau bán hàng", "Bảo hành theo chính sách hãng (Bosch 3 năm, các hãng khác 1–2 năm). BNB hỗ trợ liên hệ hãng + giám sát xử lý."],
          ["05", "Hỗ trợ sử dụng 30 ngày đầu", "Tháng đầu, thao tác chưa quen, BNB hỗ trợ qua Zalo/video call hoặc đến tận nhà nếu cần."],
          ["06", "Báo giá minh bạch, hiệu lực 15 ngày", "Giá đã gồm VAT, không phí ẩn. Báo giá có giá trị 15 ngày."],
        ].map((c, i, arr) => (
          <View key={i} style={i === arr.length - 1 ? [s.commitItem, { borderBottomWidth: 0 }] : s.commitItem} wrap={false}>
            <Text style={s.commitNo}>{c[0]}</Text>
            <Text style={s.commitTitle}>{c[1]}</Text>
            <Text style={s.commitText}>{c[2]}</Text>
          </View>
        ))}

        {/* Chữ ký */}
        <View style={s.sigRow} wrap={false}>
          <View style={s.sigBox}>
            <Text style={s.sigTitle}>KHÁCH HÀNG</Text>
            <Text style={s.sigSub}>(Ký, ghi rõ họ tên)</Text>
            <View style={s.sigLine} />
            <Text style={{ fontSize: 8, marginTop: 3 }}>{d.customer.name || ""}</Text>
          </View>
          <View style={s.sigBox}>
            <Text style={s.sigTitle}>NGƯỜI LẬP BÁO GIÁ</Text>
            <Text style={s.sigSub}>(Ký, ghi rõ họ tên)</Text>
            <View style={s.sigLine} />
            <Text style={{ fontSize: 8, marginTop: 3 }}>{d.advisor || d.shop.name}</Text>
          </View>
        </View>
        <Text style={s.thankYou}>
          Cảm ơn {xungName} đã tin tưởng {d.shop.name}. Bên em mong được đồng hành cùng căn bếp của
          gia đình {sal} trong nhiều năm tới.
        </Text>
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
