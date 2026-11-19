import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: (ctx) => ctx.db.query("expenseHeads").collect(),
});

export const add = mutation({
  args: { name: v.string(), group: v.optional(v.string()), kind: v.union(v.literal("expense"), v.literal("charge")) },
  handler: async (ctx, args) => {
    if (!args.name.trim()) throw new Error("Name is required");
    return ctx.db.insert("expenseHeads", args);
  },
});

export const remove = mutation({
  args: { id: v.id("expenseHeads") },
  handler: (ctx, { id }) => ctx.db.delete(id),
});
