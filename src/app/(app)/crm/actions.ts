"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import {
  createLead, updateLead, setLeadStage, logActivity, createCustomer, getLead, advanceJourney,
} from "@/lib/bnb/store";
import type { LeadSource, LeadStage, ActivityType } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();
const num = (fd: FormData, k: string) => {
  const v = s(fd, k).replace(/[^\d]/g, "");
  return v ? Number(v) : undefined;
};

export async function createLeadAction(fd: FormData) {
  const sess = await requirePermission("lead.manage");
  const name = s(fd, "name");
  const phone = s(fd, "phone");
  if (!name || !phone) return;
  await createLead({
    name,
    phone,
    email: s(fd, "email") || undefined,
    source: (s(fd, "source") || "other") as LeadSource,
    stage: "new",
    need: s(fd, "need") || undefined,
    budget: num(fd, "budget"),
    address: s(fd, "address") || undefined,
    assigneeId: sess.employee?.id,
  });
  revalidatePath("/crm");
  revalidatePath("/dashboard");
}

export async function setStageAction(fd: FormData) {
  const sess = await requirePermission("lead.manage");
  const id = s(fd, "id");
  const stage = s(fd, "stage") as LeadStage;
  if (!id || !stage) return;
  await setLeadStage(id, stage, sess.employee?.id);
  revalidatePath("/crm");
  revalidatePath(`/crm/${id}`);
}

export async function addActivityAction(fd: FormData) {
  const sess = await requirePermission("lead.manage");
  const leadId = s(fd, "leadId");
  const content = s(fd, "content");
  if (!leadId || !content) return;
  await logActivity({
    leadId,
    type: (s(fd, "type") || "note") as ActivityType,
    content,
    byId: sess.employee?.id,
  });
  await updateLead(leadId, { lastContactAt: new Date().toISOString(), nextFollowUpAt: s(fd, "nextFollowUpAt") || undefined });
  revalidatePath(`/crm/${leadId}`);
  revalidatePath("/dashboard");
}

export async function convertToCustomerAction(fd: FormData) {
  await requirePermission("customer.manage");
  const leadId = s(fd, "leadId");
  const lead = await getLead(leadId);
  if (!lead) return;
  const cus = await createCustomer({
    name: lead.name,
    phone: lead.phone,
    email: lead.email,
    address: lead.address,
    source: lead.source,
  });
  await updateLead(leadId, { customerId: cus.id, stage: "won" });
  await logActivity({ leadId, customerId: cus.id, type: "stage", content: `Chuyển thành khách hàng ${cus.code}` });
  // Đẩy hành trình CX của khách này tới bước Decision (nối CRM → Hành trình).
  await advanceJourney({ leadId, customerId: cus.id, phone: lead.phone, name: lead.name }, "decision");
  revalidatePath(`/crm/${leadId}`);
  revalidatePath("/crm");
  revalidatePath("/journey");
}
