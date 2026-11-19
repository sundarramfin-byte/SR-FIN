import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { audit, nextCounter, pad, paymentLines, sumLines } from "./lib";

function check<T extends { particulars: string; amount: number }>(lines: T[]): T[] {
  const used = lines.filter((l) => l.amount || l.particulars);
  if (used.length === 0) throw new Error("Add at least one payment line");
  for (const l of used) {
    if (!l.particulars.trim()) throw new Error("Every line needs particulars");
    if (!(l.amount > 0)) throw new Error("Amounts must be greater than zero");
  }
  return used;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("receipts").withIndex("by_seq").order("desc").take(300);
    return Promise.all(
      rows.map(async (r) => {
        const c = await ctx.db.get(r.customerId);
        return { ...r, customerName: c?.name ?? "?", cell: c?.cell ?? "", srNo: c?.srNo ?? "" };
      }),
    );
  },
});

export const create = mutation({
  args: {
    date: v.string(),
    customerId: v.id("customers"),
    invoiceId: v.optional(v.id("invoices")),
    lines: paymentLines,
  },
  handler: async (ctx, args) => {
    const lines = check(args.lines);
    const seq = await nextCounter(ctx, "receipt");
    const receiptNo = `R-${pad(seq)}`;
    const id = await ctx.db.insert("receipts", {
      ...args,
      lines,
      receiptNo,
      receiptSeq: seq,
      total: sumLines(lines),
      cancelled: false,
    });
    await audit(ctx, "create", "receipt", id, receiptNo);
    return id;
  },
});

/** Financial documents are never deleted – they are cancelled and keep their number. */
export const cancel = mutation({
  args: { id: v.id("receipts") },
  handler: async (ctx, { id }) => {
    const r = await ctx.db.get(id);
    if (!r) throw new Error("Receipt not found");
    await ctx.db.patch(id, { cancelled: true });
    await audit(ctx, "cancel", "receipt", id, r.receiptNo);
  },
});
