import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const fields = {
  companyName: v.string(),
  address: v.string(),
  cin: v.string(),
  pan: v.string(),
  gst: v.string(),
  directorName: v.string(),
  phone: v.string(),
  email: v.string(),
  bankName: v.string(),
  bankBranch: v.string(),
  bankAccountNo: v.string(),
  bankIfsc: v.string(),
  bankAccountType: v.string(),
  declaration: v.string(),
  openingBalance: v.number(),
  eSignature: v.optional(v.string()),
  eSignEnabled: v.optional(v.boolean()),
};

export const get = query({
  args: {},
  handler: async (ctx) => (await ctx.db.query("settings").first()) ?? null,
});

export const save = mutation({
  args: fields,
  handler: async (ctx, args) => {
    const row = await ctx.db.query("settings").first();
    if (row) await ctx.db.patch(row._id, args);
    else await ctx.db.insert("settings", args);
  },
});
