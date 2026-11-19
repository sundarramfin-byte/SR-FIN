import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { audit, nextCounter, pad } from "./lib";

const round2 = (n: number) => Math.round(n * 100) / 100;

const fields = {
  date: v.string(),
  month: v.string(),
  channel: v.optional(v.string()),
  bankName: v.optional(v.string()),
  payoutBankDetails: v.optional(v.string()),
  dsaName: v.optional(v.string()),
  contactNo: v.optional(v.string()),
  email: v.optional(v.string()),
  dsaCode: v.optional(v.string()),
  clusterName: v.optional(v.string()),
  region: v.optional(v.string()),
  toEntity: v.string(),
  toAddress: v.optional(v.string()),
  loanFileId: v.optional(v.id("loanFiles")),
  borrower: v.string(),
  product: v.string(),
  disbursalDate: v.optional(v.string()),
  disbursalAmount: v.number(),
  payoutPercent: v.number(),
  insuranceAmount: v.number(),
  insurancePayout: v.number(),
  gstMode: v.union(v.literal("NIL"), v.literal("CGST_SGST"), v.literal("IGST")),
  // optional manual overrides of the calculated amounts
  payoutAmount: v.optional(v.number()),
  totalPayout: v.optional(v.number()),
  gstAmount: v.optional(v.number()),
  tdsAmount: v.optional(v.number()),
  netAmount: v.optional(v.number()),
};

/** Payout maths: payout = disbursal x %, GST 18% (9+9 or IGST), TDS 5% on payout, net = payout + GST - TDS. */
function compute(a: {
  disbursalAmount: number;
  payoutPercent: number;
  insurancePayout: number;
  gstMode: "NIL" | "CGST_SGST" | "IGST";
  payoutAmount?: number;
  totalPayout?: number;
  gstAmount?: number;
  tdsAmount?: number;
  netAmount?: number;
}) {
  // each figure is calculated from the one above it unless it was typed in manually
  const payoutAmount = a.payoutAmount ?? round2((a.disbursalAmount * a.payoutPercent) / 100);
  const totalPayout = a.totalPayout ?? round2(payoutAmount + a.insurancePayout);
  const gstAmount = a.gstAmount ?? (a.gstMode === "NIL" ? 0 : round2(totalPayout * 0.18));
  const tdsAmount = a.tdsAmount ?? round2(totalPayout * 0.05);
  const netAmount = a.netAmount ?? round2(totalPayout + gstAmount - tdsAmount);
  return { payoutAmount, totalPayout, gstAmount, tdsAmount, netAmount };
}

function check(a: { borrower: string; toEntity: string; disbursalAmount: number; payoutPercent: number }) {
  if (!a.borrower.trim()) throw new Error("Borrower is required");
  if (!a.toEntity.trim()) throw new Error("Bank / aggregator is required");
  if (a.disbursalAmount < 0) throw new Error("Disbursal amount cannot be negative");
  if (a.payoutPercent < 0 || a.payoutPercent > 100) throw new Error("Payout % must be between 0 and 100");
}

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query("bankInvoices").withIndex("by_seq").order("desc").take(300),
});

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    check(args);
    const seq = await nextCounter(ctx, "bankInvoice");
    const invoiceNo = `BI-${pad(seq, 4)}`;
    const id = await ctx.db.insert("bankInvoices", {
      ...args,
      ...compute(args),
      invoiceNo,
      invoiceSeq: seq,
      status: "Raised",
    });
    await audit(ctx, "create", "bankInvoice", id, invoiceNo);
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("bankInvoices"), ...fields },
  handler: async (ctx, { id, ...args }) => {
    check(args);
    await ctx.db.patch(id, { ...args, ...compute(args) });
    await audit(ctx, "update", "bankInvoice", id, "");
  },
});

export const setStatus = mutation({
  args: { id: v.id("bankInvoices"), status: v.union(v.literal("Raised"), v.literal("Received")) },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status });
    await audit(ctx, "status", "bankInvoice", id, status);
  },
});
