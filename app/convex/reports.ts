import { v } from "convex/values";
import { query } from "./_generated/server";

/** Day Book – generated from receipts (credit) and vouchers (debit). */
export const dayBook = query({
  args: { from: v.string(), to: v.string() },
  handler: async (ctx, { from, to }) => {
    const settings = await ctx.db.query("settings").first();
    const base = settings?.openingBalance ?? 0;

    const before = {
      r: await ctx.db.query("receipts").withIndex("by_date", (q) => q.lt("date", from)).collect(),
      v: await ctx.db.query("vouchers").withIndex("by_date", (q) => q.lt("date", from)).collect(),
    };
    const opening =
      base +
      before.r.filter((r) => !r.cancelled).reduce((s, r) => s + r.total, 0) -
      before.v.filter((r) => !r.cancelled).reduce((s, r) => s + r.total, 0);

    const receipts = await ctx.db
      .query("receipts")
      .withIndex("by_date", (q) => q.gte("date", from).lte("date", to))
      .collect();
    const vouchers = await ctx.db
      .query("vouchers")
      .withIndex("by_date", (q) => q.gte("date", from).lte("date", to))
      .collect();

    const entries = [
      ...receipts
        .filter((r) => !r.cancelled)
        .map((r) => ({ date: r.date, ref: r.receiptNo, credit: r.total, debit: 0, seq: r._creationTime })),
      ...vouchers
        .filter((r) => !r.cancelled)
        .map((r) => ({ date: r.date, ref: r.voucherNo, credit: 0, debit: r.total, seq: r._creationTime })),
    ].sort((a, b) => (a.date === b.date ? a.seq - b.seq : a.date < b.date ? -1 : 1));

    let balance = opening;
    const rows = entries.map((e) => {
      balance += e.credit - e.debit;
      return { date: e.date, ref: e.ref, credit: e.credit, debit: e.debit, balance };
    });
    return {
      opening,
      closing: balance,
      totalCredit: rows.reduce((s, r) => s + r.credit, 0),
      totalDebit: rows.reduce((s, r) => s + r.debit, 0),
      rows,
    };
  },
});

const MONTH_KEYS = (fyStart: number) => {
  const keys: string[] = [];
  for (let m = 4; m <= 12; m++) keys.push(`${fyStart}-${String(m).padStart(2, "0")}`);
  for (let m = 1; m <= 3; m++) keys.push(`${fyStart + 1}-${String(m).padStart(2, "0")}`);
  return keys;
};

/** Yearly report for a financial year (Apr–Mar): payout by bank + customer receipts. */
export const yearly = query({
  args: { fyStart: v.number() },
  handler: async (ctx, { fyStart }) => {
    const keys = MONTH_KEYS(fyStart);
    const rows = new Map<string, number[]>();
    const bump = (name: string, idx: number, amt: number) => {
      if (!rows.has(name)) rows.set(name, Array(12).fill(0));
      rows.get(name)![idx] += amt;
    };
    const bis = await ctx.db.query("bankInvoices").collect();
    for (const b of bis) {
      const i = keys.indexOf(b.month);
      if (i >= 0) bump(b.toEntity, i, b.totalPayout);
    }
    const rec = await ctx.db
      .query("receipts")
      .withIndex("by_date", (q) => q.gte("date", `${fyStart}-04-01`).lte("date", `${fyStart + 1}-03-31`))
      .collect();
    for (const r of rec) {
      if (r.cancelled) continue;
      bump("CUSTOMER Payment", keys.indexOf(r.date.slice(0, 7)), r.total);
    }
    const out = [...rows.entries()].map(([name, months]) => ({
      name,
      months,
      total: months.reduce((s, x) => s + x, 0),
    }));
    const totals = Array(12)
      .fill(0)
      .map((_, i) => out.reduce((s, r) => s + r.months[i], 0));
    return { keys, rows: out, totals, grand: totals.reduce((s, x) => s + x, 0) };
  },
});

/**
 * Dashboard figures. With no range every figure is all-time (as before) except
 * "receipts", which is the current month. With a range, counts/sums are limited to it:
 * customers & loan files by creation time, sanction/disbursement by their own dates,
 * payouts by invoice date, receipts by receipt date. Cash balance is always current.
 */
export const dashboard = query({
  args: {
    fromDate: v.optional(v.string()), // YYYY-MM-DD inclusive
    toDate: v.optional(v.string()),
    fromMs: v.optional(v.number()),
    toMs: v.optional(v.number()),
  },
  handler: async (ctx, { fromDate, toDate, fromMs, toMs }) => {
    const ranged = fromDate !== undefined && toDate !== undefined && fromMs !== undefined && toMs !== undefined;
    const inMs = (t: number) => !ranged || (t >= fromMs! && t <= toMs!);
    const inDate = (d?: string) => !ranged || (!!d && d >= fromDate! && d <= toDate!);

    const customers = (await ctx.db.query("customers").collect()).filter((c) => inMs(c._creationTime));
    const loans = (await ctx.db.query("loanFiles").collect()).filter((l) => inMs(l._creationTime));
    const allLoans = await ctx.db.query("loanFiles").collect();
    const bis = (await ctx.db.query("bankInvoices").collect()).filter((b) => inDate(b.date));
    const receipts = await ctx.db.query("receipts").collect();
    const vouchers = await ctx.db.query("vouchers").collect();
    const settings = await ctx.db.query("settings").first();
    const live = receipts.filter((r) => !r.cancelled);
    const liveV = vouchers.filter((r) => !r.cancelled);
    const month = new Date().toISOString().slice(0, 7);

    const byStatus: Record<string, number> = {};
    for (const c of customers) byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    const byBank: Record<string, number> = {};
    for (const l of loans) {
      const k = l.bankName ?? "Unassigned";
      byBank[k] = (byBank[k] ?? 0) + 1;
    }
    return {
      customers: customers.length,
      loanFiles: loans.length,
      sanctioned: allLoans.filter((l) => inDate(l.sanctionDate)).reduce((s, l) => s + (l.sanctionAmount ?? 0), 0),
      disbursed: allLoans.filter((l) => inDate(l.disbursementDate)).reduce((s, l) => s + (l.disbursementAmount ?? 0), 0),
      pendingPayout: bis.filter((b) => b.status === "Raised").reduce((s, b) => s + b.netAmount, 0),
      receiptsThisMonth: live
        .filter((r) => (ranged ? inDate(r.date) : r.date.startsWith(month)))
        .reduce((s, r) => s + r.total, 0),
      cashBalance:
        (settings?.openingBalance ?? 0) +
        live.reduce((s, r) => s + r.total, 0) -
        liveV.reduce((s, r) => s + r.total, 0),
      byStatus,
      byBank,
    };
  },
});
