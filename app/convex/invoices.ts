import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { audit, nextCounter, pad, sumLines } from "./lib";

const lineV = v.object({
  group: v.string(),
  particulars: v.string(),
  basis: v.optional(v.string()),
  amount: v.number(),
  mode: v.optional(v.string()),
  paidDate: v.optional(v.string()),
});

const fields = {
  date: v.string(),
  customerId: v.id("customers"),
  loanFileId: v.optional(v.id("loanFiles")),
  propertyType: v.optional(v.string()),
  landCost: v.number(),
  constructionCost: v.number(),
  sanctionAmount: v.number(),
  lines: v.array(lineV),
};

function check(lines: { particulars: string; amount: number }[]) {
  if (lines.length === 0) throw new Error("Add at least one charge line");
  for (const l of lines) {
    if (!l.particulars.trim()) throw new Error("Every line needs particulars");
    if (l.amount < 0) throw new Error("Amounts cannot be negative");
  }
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const invoices = await ctx.db.query("invoices").withIndex("by_seq").order("desc").take(300);
    return Promise.all(
      invoices.map(async (inv) => {
        const customer = await ctx.db.get(inv.customerId);
        const receipts = await ctx.db
          .query("receipts")
          .withIndex("by_customer", (q) => q.eq("customerId", inv.customerId))
          .collect();
        const paid = receipts
          .filter((r) => !r.cancelled && r.invoiceId === inv._id)
          .reduce((s, r) => s + r.total, 0);
        return {
          ...inv,
          customerName: customer?.name ?? "?",
          srNo: customer?.srNo ?? "",
          paid,
          balance: inv.total - paid,
        };
      }),
    );
  },
});

export const get = query({
  args: { id: v.id("invoices") },
  handler: async (ctx, { id }) => {
    const invoice = await ctx.db.get(id);
    if (!invoice) return null;
    const customer = await ctx.db.get(invoice.customerId);
    return { invoice, customer };
  },
});

export const create = mutation({
  args: fields,
  handler: async (ctx, args) => {
    check(args.lines);
    const seq = await nextCounter(ctx, "invoice");
    const invoiceNo = `R${pad(seq)}`;
    const id = await ctx.db.insert("invoices", {
      ...args,
      invoiceNo,
      invoiceSeq: seq,
      status: "Draft",
      total: sumLines(args.lines),
    });
    await audit(ctx, "create", "invoice", id, invoiceNo);
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("invoices"), ...fields },
  handler: async (ctx, { id, ...args }) => {
    const inv = await ctx.db.get(id);
    if (!inv) throw new Error("Invoice not found");
    if (inv.status !== "Draft") throw new Error("Issued invoices are locked. Cancel and re-create instead.");
    check(args.lines);
    await ctx.db.patch(id, { ...args, total: sumLines(args.lines) });
    await audit(ctx, "update", "invoice", id, inv.invoiceNo);
  },
});

export const setStatus = mutation({
  args: {
    id: v.id("invoices"),
    status: v.union(v.literal("Draft"), v.literal("Issued"), v.literal("Paid"), v.literal("Cancelled")),
  },
  handler: async (ctx, { id, status }) => {
    const inv = await ctx.db.get(id);
    if (!inv) throw new Error("Invoice not found");
    await ctx.db.patch(id, { status });
    await audit(ctx, "status", "invoice", id, `${inv.invoiceNo} → ${status}`);
  },
});
