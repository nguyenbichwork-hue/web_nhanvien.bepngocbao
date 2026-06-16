"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createTask, updateTask, deleteTask } from "@/lib/bnb/store";
import type { TaskCategory, TaskPriority, TaskStatus } from "@/lib/bnb/types";

const s = (fd: FormData, k: string) => (fd.get(k)?.toString() || "").trim();

function bump() {
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function createTaskAction(fd: FormData) {
  const sess = await requirePermission("task.manage");
  const title = s(fd, "title");
  if (!title) return;
  const type = (s(fd, "type") || "task") as "task" | "incident";
  await createTask({
    title,
    detail: s(fd, "detail") || undefined,
    type,
    category: (s(fd, "category") || "ops") as TaskCategory,
    status: "open",
    priority: (s(fd, "priority") || "normal") as TaskPriority,
    assigneeId: s(fd, "assigneeId") || undefined,
    createdById: sess.employee?.id,
    dueAt: s(fd, "dueAt") || undefined,
  });
  bump();
}

export async function setTaskStatusAction(fd: FormData) {
  await requirePermission("task.manage");
  const id = s(fd, "id");
  const status = s(fd, "status") as TaskStatus;
  if (!id || !status) return;
  await updateTask(id, {
    status,
    doneAt: status === "done" ? new Date().toISOString() : undefined,
  });
  bump();
}

export async function deleteTaskAction(fd: FormData) {
  await requirePermission("task.manage");
  const id = s(fd, "id");
  if (!id) return;
  await deleteTask(id);
  bump();
}
