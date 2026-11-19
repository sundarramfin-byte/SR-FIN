import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { audit, customerStatus, customerType, nextCounter, pad, strMap } from "./lib";

const formFields = {
  name: v.string(),
  cell: v.string(),
  customerType,
  referredBy: v.optional(v.string()),
  remarks: v.optional(v.string()),
  applicant: v.optional(strMap),
  currentAddress: v.optional(strMap),
  permanentAddress: v.optional(strMap),
  employment: v.optional(strMap),
  company: v.optional(strMap),
  nriOffice: v.optional(strMap),
  property: v.optional(strMap),
  coApplicants: v.optional(v.array(strMap)),
  directors: v.optional(v.array(strMap)),
  references: v.optional(v.array(strMap)),
  officeDetails: v.optional(strMap),
  coEmployment: v.optional(strMap),
  loanRequirement: v.optional(strMap),
  existingLoans: v.optional(v.array(strMap)),
};

function validate(a: { name: string; cell: string }) {
  if (!a.name.trim()) throw new Error("Customer name is required");
  if (a.cell && !/^\d{10}$/.test(a.cell.replace(/\s/g, ""))) {
    throw new Error("Cell number must be 10 digits");
  }
}

export const list = query({
  args: { search: v.optional(v.string()), customerType: v.optional(customerType) },
  handler: async (ctx, { search, customerType }) => {
    const all = await ctx.db.query("customers").withIndex("by_srSeq").order("desc").take(500);

    let rows = all;
    if (search && search.trim()) {
      const raw = search.trim().toLowerCase();
      const norm = raw.replace(/[\s\-_.]/g, "");

      rows = all.filter((c) => {
        const nameRaw = (c.name ?? "").toLowerCase();
        const nameNorm = nameRaw.replace(/[\s\-_.]/g, "");
        const srRaw = (c.srNo ?? "").toLowerCase();
        const srNorm = srRaw.replace(/[\s\-_.]/g, "");
        const cellRaw = (c.cell ?? "").replace(/\D/g, "");

        // 1. Name match (case-insensitive & space-normalized: e.g. "arunkumar" matches "Arun Kumar")
        if (nameRaw.includes(raw) || nameNorm.includes(norm)) return true;
        // 2. SR number match: e.g. "0005", "sr5", "sr no 0005"
        if (srRaw.includes(raw) || srNorm.includes(norm)) return true;
        // 3. Cell / phone number match
        if (cellRaw.includes(norm) || (c.cell ?? "").includes(raw)) return true;
        // 4. Token match for multi-word queries
        const tokens = raw.split(/\s+/).filter(Boolean);
        if (tokens.length > 1 && tokens.every((t) => nameRaw.includes(t))) return true;

        return false;
      });
    }

    if (customerType) rows = rows.filter((r) => r.customerType === customerType);
    return rows.map((c) => ({
      _id: c._id,
      srNo: c.srNo,
      name: c.name,
      cell: c.cell,
      customerType: c.customerType,
      status: c.status,
      referredBy: c.referredBy,
      remarks: c.remarks,
    }));
  },
});

export const get = query({
  args: { id: v.id("customers") },
  handler: async (ctx, { id }) => {
    const customer = await ctx.db.get(id);
    if (!customer) return null;
    const loanFiles = await ctx.db
      .query("loanFiles")
      .withIndex("by_customer", (q) => q.eq("customerId", id))
      .collect();
    return { customer, loanFiles };
  },
});

export const findByCell = query({
  args: { cell: v.string() },
  handler: async (ctx, { cell }) => {
    if (cell.length < 10) return [];
    const rows = await ctx.db
      .query("customers")
      .withIndex("by_cell", (q) => q.eq("cell", cell))
      .take(5);
    return rows.map((r) => ({ _id: r._id, srNo: r.srNo, name: r.name }));
  },
});

export const create = mutation({
  args: formFields,
  handler: async (ctx, args) => {
    validate(args);
    const seq = await nextCounter(ctx, "customer");
    const srNo = `S R. NO ${pad(seq, 4)}`;
    const id = await ctx.db.insert("customers", {
      ...args,
      srNo,
      srSeq: seq,
      status: "Enquiry",
    });
    await audit(ctx, "create", "customer", id, `${srNo} ${args.name}`);
    return id;
  },
});

export const submitApplication = mutation({
  args: formFields,
  handler: async (ctx, args) => {
    validate(args);
    const seq = await nextCounter(ctx, "customer");
    const srNo = `S R. NO ${pad(seq, 4)}`;
    const id = await ctx.db.insert("customers", {
      ...args,
      srNo,
      srSeq: seq,
      status: "Enquiry",
    });
    await audit(ctx, "client_apply", "customer", id, `${srNo} ${args.name} (Online Submission)`);
    return { id, srNo };
  },
});

export const update = mutation({
  args: { id: v.id("customers"), ...formFields },
  handler: async (ctx, { id, ...rest }) => {
    validate(rest);
    await ctx.db.patch(id, rest);
    await audit(ctx, "update", "customer", id, rest.name);
  },
});

export const setStatus = mutation({
  args: { id: v.id("customers"), status: customerStatus },
  handler: async (ctx, { id, status }) => {
    await ctx.db.patch(id, { status });
    await audit(ctx, "status", "customer", id, status);
  },
});
