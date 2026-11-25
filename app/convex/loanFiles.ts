import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { audit } from "./lib";

const fields = {
  customerId: v.id("customers"),
  channel: v.string(),
  bankId: v.optional(v.id("banks")),
  bankName: v.optional(v.string()),
  dsaCode: v.optional(v.string()),
  clusterName: v.optional(v.string()),
  clusterEmail: v.optional(v.string()),
  clusterCell: v.optional(v.string()),
  fileNo: v.optional(v.string()),
  branch: v.optional(v.string()),
  enquiryDate: v.optional(v.string()),
  enquiryAmount: v.optional(v.number()),
  loginDate: v.optional(v.string()),
  sanctionDate: v.optional(v.string()),
  sanctionAmount: v.optional(v.number()),
  disbursementDate: v.optional(v.string()),
  disbursementAmount: v.optional(v.number()),
  landCost: v.optional(v.number()),
  constructionCost: v.optional(v.number()),
  tenureYears: v.optional(v.number()),
  propertyType: v.optional(v.string()),
  loanType: v.optional(v.string()),
  remarks: v.optional(v.string()),
};

type Dates = {
  enquiryDate?: string;
  loginDate?: string;
  sanctionDate?: string;
  disbursementDate?: string;
  sanctionAmount?: number;
  landCost?: number;
  constructionCost?: number;
};

function validate(a: Dates) {
  const seq = [a.enquiryDate, a.loginDate, a.sanctionDate, a.disbursementDate].filter(Boolean) as string[];
  for (let i = 1; i < seq.length; i++) {
    if (seq[i] < seq[i - 1]) {
      throw new Error("Dates must be in order: enquiry ≤ login ≤ sanction ≤ disbursement");
    }
  }
  const total = (a.landCost ?? 0) + (a.constructionCost ?? 0);
  if (a.sanctionAmount && total && a.sanctionAmount > total) {
    throw new Error("Sanction amount cannot exceed total cost");
  }
}

/** Customer stage follows the furthest loan file; a manually cancelled customer is left alone. */
async function syncStatus(ctx: MutationCtx, customerId: Id<"customers">) {
  const c = await ctx.db.get(customerId);
  if (!c || c.status === "Cancelled") return;
  const files = await ctx.db.query("loanFiles").withIndex("by_customer", (q) => q.eq("customerId", customerId)).collect();
  const status = files.some((f) => f.disbursementDate)
    ? "Disbursed"
    : files.some((f) => f.sanctionDate)
      ? "Sanctioned"
      : files.some((f) => f.loginDate)
        ? "Login"
        : "Enquiry";
  if (status !== c.status) await ctx.db.patch(customerId, { status });
}

export const listByCustomer = query({
  args: { customerId: v.id("customers") },
  handler: (ctx, { customerId }) =>
    ctx.db.query("loanFiles").withIndex("by_customer", (q) => q.eq("customerId", customerId)).collect(),
});

/** All loan files with the customer name – for pickers on Invoice / Bank Invoice. */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const files = await ctx.db.query("loanFiles").order("desc").take(500);
    return Promise.all(
      files.map(async (f) => {
        const c = await ctx.db.get(f.customerId);
        return { ...f, customerName: c?.name ?? "?", srNo: c?.srNo ?? "" };
      }),
    );
  },
});

export const save = mutation({
  args: { id: v.optional(v.id("loanFiles")), ...fields },
  handler: async (ctx, { id, ...data }) => {
    validate(data);
    let fileId = id;
    if (id) await ctx.db.patch(id, data);
    else fileId = await ctx.db.insert("loanFiles", data);
    await syncStatus(ctx, data.customerId);
    await audit(ctx, id ? "update" : "create", "loanFile", String(fileId), data.fileNo ?? "");
    return fileId;
  },
});

export const remove = mutation({
  args: { id: v.id("loanFiles") },
  handler: async (ctx, { id }) => {
    const file = await ctx.db.get(id);
    await ctx.db.delete(id);
    if (file) await syncStatus(ctx, file.customerId);
    await audit(ctx, "delete", "loanFile", id, "");
  },
});
