import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";

/** Atomically-incremented, never-reused number series (SR no, invoice no, ...). */
export async function nextCounter(ctx: MutationCtx, name: string): Promise<number> {
  const row = await ctx.db
    .query("counters")
    .withIndex("by_name", (q) => q.eq("name", name))
    .unique();
  if (!row) {
    await ctx.db.insert("counters", { name, value: 1 });
    return 1;
  }
  const value = row.value + 1;
  await ctx.db.patch(row._id, { value });
  return value;
}

export async function audit(
  ctx: MutationCtx,
  action: string,
  entity: string,
  entityId: string,
  summary: string,
) {
  await ctx.db.insert("auditLogs", { action, entity, entityId, summary });
}

export const pad = (n: number, width = 5) => String(n).padStart(width, "0");

export const strMap = v.record(v.string(), v.string());

export const customerType = v.union(
  v.literal("Salaried"),
  v.literal("Self Employed"),
  v.literal("NRI"),
);

export const customerStatus = v.union(
  v.literal("Enquiry"),
  v.literal("Login"),
  v.literal("Sanctioned"),
  v.literal("Disbursed"),
  v.literal("Cancelled"),
);

export const paymentLines = v.array(
  v.object({
    method: v.string(),
    reference: v.optional(v.string()),
    particulars: v.string(),
    amount: v.number(),
  }),
);

export const sumLines = (lines: { amount: number }[]) =>
  Math.round(lines.reduce((s, l) => s + (l.amount || 0), 0) * 100) / 100;
