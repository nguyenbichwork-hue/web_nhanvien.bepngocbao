import { requirePermission } from "@/lib/auth/session";
import { PageHero } from "@/components/page-hero";
import { listReferrals, listCxJourneys } from "@/lib/bnb/store";
import { employeeNameMap } from "@/lib/bnb/names";
import { ReferralBoard } from "./referral-board";

export const dynamic = "force-dynamic";

export default async function ReferralPage() {
  await requirePermission("lead.read");
  const [referrals, journeys, names] = await Promise.all([
    listReferrals(), listCxJourneys(), employeeNameMap(),
  ]);
  const owners = Object.entries(names).map(([id, name]) => ({ id, name }));

  // Khách "sẵn sàng giới thiệu" trong Hành trình CX nhưng CHƯA có lượt referral nào
  // → gợi ý mời tham gia chương trình (đóng vòng North Star: % khách giới thiệu).
  const refKey = (phone?: string, name?: string) =>
    (phone || "").trim() || (name || "").trim().toLowerCase();
  const referredKeys = new Set(referrals.map((r) => refKey(r.referrerPhone, r.referrerName)));
  const candidates = journeys
    .filter((j) => j.readyReferral || ["handover", "first7days", "review", "referral"].includes(j.stage))
    .filter((j) => !referredKeys.has(refKey(j.phone, j.name)))
    .map((j) => ({ id: j.id, name: j.name, phone: j.phone, ownerId: j.ownerId, customerId: j.customerId }))
    .slice(0, 24);

  return (
    <div>
      <PageHero
        icon="award"
        title="Chương trình giới thiệu (Referral)"
        subtitle="Khách hài lòng giới thiệu người mới → theo dõi liên hệ · báo giá · ra đơn · tri ân — đóng vòng North Star “% khách sẵn sàng giới thiệu”."
        crumb={[["Trang chủ", "/dashboard"], ["Bán hàng"], ["Giới thiệu"]]}
      />
      <ReferralBoard
        referrals={referrals}
        owners={owners}
        candidates={candidates}
        journeyReadyCount={journeys.filter((j) => j.readyReferral || ["handover", "first7days", "review", "referral"].includes(j.stage)).length}
      />
    </div>
  );
}
