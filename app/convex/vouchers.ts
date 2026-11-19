import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { audit, nextCounter, pad, paymentLines, sumLines } from "./lib";

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query("vouchers").withIndex("by_seq").order("desc").take(300),
});

export const create = mutation({
  args: {
    date: v.string(),
    payee: v.string(),
    cell: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    lines: paymentLines,
  },
  handler: async (ctx, args) => {
    if (!args.payee.trim()) throw new Error("Payee is required");
    const lines = args.lines.filter((l) => l.amount || l.particulars);
    if (lines.length === 0) throw new Error("Add at least one line");
    for (const l of lines) {
      if (!l.particulars.trim()) throw new Error("Every line needs particulars");
      if (!(l.amount > 0)) throw new Error("Amounts must be greater than zero");
    }
    const seq = await nextCounter(ctx, "voucher");
    const voucherNo = `V-${pad(seq)}`;
    const id = await ctx.db.insert("vouchers", {
      ...args,
      lines,
      voucherNo,
      voucherSeq: seq,
      total: sumLines(lines),
      cancelled: false,
    });
    await audit(ctx, "create", "voucher", id, voucherNo);
    return id;
  },
});

export const cancel = mutation({
  args: { id: v.id("vouchers") },
  handler: async (ctx, { id }) => {
    const r = await ctx.db.get(id);
    if (!r) throw new Error("Voucher not found");
    await ctx.db.patch(id, { cancelled: true });
    await audit(ctx, "cancel", "voucher", id, r.voucherNo);
  },
});
