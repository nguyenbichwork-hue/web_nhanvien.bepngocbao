// BNB · Chuẩn hoá BÁO GIÁ KHÁCH (port từ web tư vấn thietkebep.bepngocbao.vn).
// Triết lý: KHÔNG gửi bảng giá trần trụi — gửi báo giá có thương hiệu, điều khoản
// minh bạch và cam kết, để khách thấy giá trị chứ không chỉ con số.
// File CLIENT-SAFE (chỉ hằng số + hàm thuần); fmtVnd lấy từ util (không vòng lặp).
import { fmtVnd } from "./util";
import type { QuoteLine } from "./types";

/* ---------- Thông tin showroom (nguồn: web tư vấn BNB) ---------- */
export const SHOP_NAME = "Bếp Ngọc Bảo";
export const SHOP_TAGLINE = "Mua bếp đúng ngay lần đầu";
export const SHOP_ADDRESS = "62 Bạch Đằng, Phường Bình Thạnh, TP. Hồ Chí Minh";
export const SHOP_PHONE = "0867 450 198";
export const SHOP_EMAIL = "op.dept@peaki.vn";
export const SHOP_WEB = "bepngocbao.vn";

/* ---------- Điều khoản chuẩn ---------- */
export const VAT_RATE = 0.08;          // giá đã GỒM VAT 8%
export const QUOTE_VALIDITY_DAYS = 15; // hiệu lực 15 ngày

/** Phần VAT 8% nằm TRONG tổng (giá đã gồm VAT) — tách ra để minh bạch. */
export function vatInclusiveBreakdown(total: number): { preTax: number; vat: number } {
  const preTax = Math.round(total / (1 + VAT_RATE));
  return { preTax, vat: total - preTax };
}

/** Danh xưng theo giới tính: nam→Anh, nữ→Chị, còn lại→Anh/Chị. */
export function salutation(gender?: "nam" | "nu" | string | null): string {
  return gender === "nam" ? "Anh" : gender === "nu" ? "Chị" : "Anh/Chị";
}

/** Hiệu lực báo giá = ngày tạo + 15 ngày (nếu chưa set validUntil). */
export function validUntilFrom(createdAtIso: string, validUntil?: string): string {
  if (validUntil) return validUntil;
  const d = new Date(createdAtIso);
  d.setDate(d.getDate() + QUOTE_VALIDITY_DAYS);
  return d.toISOString();
}

/* ---------- 4 cam kết BNB (mẫu báo giá lẻ) ---------- */
export const BNB_COMMITMENTS: { title: string; desc: string }[] = [
  { title: "Tư vấn sai — BNB chịu trách nhiệm", desc: "Sản phẩm không vừa kích thước hoặc không đúng nhu cầu đã ghi nhận: BNB đổi miễn phí và chịu chi phí lắp lại." },
  { title: "Khảo sát & lắp đặt tận nơi", desc: "Kỹ thuật BNB đo thực tế trước khi lắp, đảm bảo không lỗi kích thước, lắp đúng kỹ thuật." },
  { title: "Đồng hành sau bán · phản hồi 24 giờ", desc: "Hàng chính hãng, hỗ trợ làm việc với hãng khi bảo hành. Có vấn đề — phản hồi trong 24 giờ." },
  { title: "Báo giá minh bạch, hiệu lực 15 ngày", desc: "Giá đã gồm VAT 8%, không phí ẩn. Có giá trị 15 ngày để Anh/Chị thoải mái cân nhắc." },
];

/* ---------- Vì sao cùng loại sản phẩm lại chênh giá (rút gọn) ---------- */
export const PRICE_FACTORS: { factor: string; why: string }[] = [
  { factor: "Linh kiện cốt lõi", why: "Mặt kính, mâm từ, bo mạch, IGBT — quyết định độ ổn định & độ bền, không nhìn thấy bằng mắt." },
  { factor: "Khả năng điều nhiệt", why: "Bếp tốt giữ nhiệt nhỏ ổn định khi kho/ninh/hầm; bếp rẻ hay bật-tắt ngắt quãng." },
  { factor: "Tính năng an toàn", why: "Khóa trẻ em, tự ngắt quá nhiệt, nhận diện nồi — quan trọng với nhà có trẻ nhỏ/người lớn tuổi." },
  { factor: "Dịch vụ sau bán", why: "Bảo hành chính hãng, sẵn linh kiện, tốc độ xử lý sự cố — quyết định sự yên tâm 5–10 năm." },
];

/* ---------- Điều khoản hiển thị trên báo giá ---------- */
export const QUOTE_TERMS: string[] = [
  "Giá đã bao gồm VAT 8% và lắp đặt tiêu chuẩn tại nhà.",
  "Hàng chính hãng 100%, đủ tem phụ · hoá đơn · phiếu bảo hành.",
  "Bảo hành theo chính sách từng hãng; BNB hỗ trợ làm việc với hãng.",
  "Khảo sát & đo đạc thực tế trước khi lắp để đảm bảo vừa kích thước.",
  `Báo giá có hiệu lực ${QUOTE_VALIDITY_DAYS} ngày kể từ ngày lập.`,
];

/* ---------- Số tiền sang chữ tiếng Việt ---------- */
const DIGITS = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
function readThree(n: number, full: boolean): string {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const donVi = n % 10;
  let s = "";
  if (full || tram > 0) s += DIGITS[tram] + " trăm";
  if (chuc === 0) {
    if (donVi > 0 && (full || tram > 0)) s += " lẻ " + DIGITS[donVi];
    else if (donVi > 0) s += DIGITS[donVi];
  } else if (chuc === 1) {
    s += " mười";
    if (donVi === 5) s += " lăm";
    else if (donVi > 0) s += " " + DIGITS[donVi];
  } else {
    s += " " + DIGITS[chuc] + " mươi";
    if (donVi === 1) s += " mốt";
    else if (donVi === 5) s += " lăm";
    else if (donVi > 0) s += " " + DIGITS[donVi];
  }
  return s.trim();
}
/** 1234000 → "Một triệu hai trăm ba mươi bốn nghìn đồng". */
export function numberToVietnameseWords(amount: number): string {
  if (!amount || amount <= 0) return "Không đồng";
  const n = Math.round(amount);
  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const units = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];
  let out = "";
  for (let i = groups.length - 1; i >= 0; i--) {
    const g = groups[i];
    if (g === 0) continue;
    out += " " + readThree(g, i < groups.length - 1) + units[i];
  }
  out = out.trim() + " đồng";
  return out.charAt(0).toUpperCase() + out.slice(1);
}

/* ---------- Tin Zalo gửi khách (không gửi bảng giá trần trụi) ---------- */
export function quoteZaloText(args: {
  code: string;
  customerName?: string;
  gender?: "nam" | "nu" | string | null;
  lines: QuoteLine[];
  total: number;
  proposal?: { recommended: string; tiers: { key: string; label: string; role: string; total: number }[] };
}): string {
  const sal = salutation(args.gender);
  const greet = args.customerName ? `Kính gửi ${sal} ${args.customerName},` : `Kính gửi ${sal},`;
  const footer = [
    "",
    "• Giá gồm VAT 8% & lắp đặt · Hàng chính hãng 100% · Bảo hành theo hãng",
    `• Báo giá hiệu lực ${QUOTE_VALIDITY_DAYS} ngày · BNB khảo sát & lắp tận nơi, đồng hành sau bán`,
    "",
    `Cảm ơn ${sal} 🌿 ${SHOP_NAME} — ${SHOP_PHONE}`,
  ];

  // Báo giá 3 phương án → gửi 3 gói (không gửi bảng giá trần trụi).
  if (args.proposal && args.proposal.tiers.length) {
    const rec = args.proposal.tiers.find((t) => t.key === args.proposal!.recommended);
    const rows = args.proposal.tiers.map(
      (t, i) => `${i + 1}. ${t.label} — ${t.role} (${fmtVnd(t.total)})`,
    );
    return [
      greet,
      `Dựa trên nhu cầu, ${SHOP_NAME} đề xuất 3 phương án (báo giá ${args.code}):`,
      "",
      ...rows,
      "",
      `👉 Khuyến nghị của BNB: ${rec?.label ?? ""}`,
      "File báo giá chi tiết (sản phẩm · cam kết · điều khoản) em gửi kèm ạ.",
      ...footer,
    ].join("\n");
  }

  const rows = args.lines.map(
    (l, i) => `${i + 1}. ${l.name}${l.sku ? ` [${l.sku}]` : ""} — SL ${l.qty} × ${fmtVnd(l.unitPrice)}`,
  );
  return [
    greet,
    `${SHOP_NAME} xin gửi báo giá ${args.code}:`,
    "",
    ...rows,
    "",
    `💰 TỔNG (đã gồm VAT 8%): ${fmtVnd(args.total)}`,
    `Bằng chữ: ${numberToVietnameseWords(args.total)}`,
    ...footer,
  ].join("\n");
}
