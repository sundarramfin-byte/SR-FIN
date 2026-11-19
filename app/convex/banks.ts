import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { audit } from "./lib";

const fields = {
  name: v.string(),
  sundarRamCode: v.optional(v.string()),
  thawaCode: v.optional(v.string()),
  drtCode: v.optional(v.string()),
  andromedaCode: v.optional(v.string()),
  products: v.optional(v.string()),
  payoutPercent: v.optional(v.number()),
  active: v.boolean(),
};

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query("banks").withIndex("by_name").collect(),
});

export const save = mutation({
  args: { id: v.optional(v.id("banks")), ...fields },
  handler: async (ctx, { id, ...data }) => {
    if (!data.name.trim()) throw new Error("Bank name is required");
    if (data.payoutPercent !== undefined && (data.payoutPercent < 0 || data.payoutPercent > 100)) {
      throw new Error("Payout % must be between 0 and 100");
    }
    const bankId = id ?? (await ctx.db.insert("banks", data));
    if (id) await ctx.db.patch(id, data);
    await audit(ctx, id ? "update" : "create", "bank", bankId, data.name);
    return bankId;
  },
});
