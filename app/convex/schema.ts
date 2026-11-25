import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Free-form string maps keep the long application forms flexible
// (the form layout itself is driven by field config in src/lib/formConfig.ts).
const strMap = v.record(v.string(), v.string());

export default defineSchema({
  users: defineTable({
    email: v.string(),
    salt: v.string(),
    passwordHash: v.string(),
  }).index("by_email", ["email"]),

  sessions: defineTable({
    token: v.string(),
    userId: v.id("users"),
  }).index("by_token", ["token"]),

  settings: defineTable({
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
  }),

  counters: defineTable({ name: v.string(), value: v.number() }).index("by_name", ["name"]),

  banks: defineTable({
    name: v.string(),
    sundarRamCode: v.optional(v.string()),
    thawaCode: v.optional(v.string()),
    drtCode: v.optional(v.string()),
    andromedaCode: v.optional(v.string()),
    products: v.optional(v.string()),
    payoutPercent: v.optional(v.number()),
    active: v.boolean(),
  }).index("by_name", ["name"]),

  expenseHeads: defineTable({
    name: v.string(),
    group: v.optional(v.string()),
    kind: v.union(v.literal("expense"), v.literal("charge")),
  }),

  customers: defineTable({
    srNo: v.string(),
    srSeq: v.number(),
    name: v.string(),
    cell: v.string(),
    customerType: v.union(v.literal("Salaried"), v.literal("Self Employed"), v.literal("NRI")),
    status: v.union(
      v.literal("Enquiry"),
      v.literal("Login"),
      v.literal("Sanctioned"),
      v.literal("Disbursed"),
      v.literal("Cancelled"),
    ),
    referredBy: v.optional(v.string()),
    remarks: v.optional(v.string()),
    // sections of the application form
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
  })
    .index("by_srSeq", ["srSeq"])
    .index("by_cell", ["cell"])
    .searchIndex("search_name", { searchField: "name" }),

  loanFiles: defineTable({
    customerId: v.id("customers"),
    channel: v.string(), // SUNDAR RAM FIN | THAWA | ANDRO MEDA
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
  }).index("by_customer", ["customerId"]),

  invoices: defineTable({
    invoiceNo: v.string(),
    invoiceSeq: v.number(),
    date: v.string(),
    customerId: v.id("customers"),
    loanFileId: v.optional(v.id("loanFiles")),
    status: v.union(v.literal("Draft"), v.literal("Issued"), v.literal("Paid"), v.literal("Cancelled")),
    propertyType: v.optional(v.string()),
    landCost: v.number(),
    constructionCost: v.number(),
    sanctionAmount: v.number(),
    lines: v.array(
      v.object({
        group: v.string(),
        particulars: v.string(),
        basis: v.optional(v.string()),
        amount: v.number(),
        mode: v.optional(v.string()),
        paidDate: v.optional(v.string()),
      }),
    ),
    total: v.number(),
  })
    .index("by_customer", ["customerId"])
    .index("by_seq", ["invoiceSeq"]),

  bankInvoices: defineTable({
    invoiceNo: v.string(),
    invoiceSeq: v.number(),
    date: v.string(),
    month: v.string(), // YYYY-MM business month
    channel: v.optional(v.string()), // "Direct Bank" | "THAWA" | "ANDRO MEDA"
    bankName: v.optional(v.string()), // Lended bank
    payoutBankDetails: v.optional(v.string()),
    dsaName: v.optional(v.string()),
    contactNo: v.optional(v.string()),
    email: v.optional(v.string()),
    dsaCode: v.optional(v.string()),
    clusterName: v.optional(v.string()),
    region: v.optional(v.string()),
    toEntity: v.string(), // bank / aggregator name
    toAddress: v.optional(v.string()),
    loanFileId: v.optional(v.id("loanFiles")),
    borrower: v.string(),
    product: v.string(),
    disbursalDate: v.optional(v.string()),
    disbursalAmount: v.number(),
    payoutPercent: v.number(),
    payoutAmount: v.number(),
    insuranceAmount: v.number(),
    insurancePayout: v.number(),
    totalPayout: v.number(),
    gstMode: v.union(v.literal("NIL"), v.literal("CGST_SGST"), v.literal("IGST")),
    gstAmount: v.number(),
    tdsAmount: v.number(),
    netAmount: v.number(),
    status: v.union(v.literal("Raised"), v.literal("Received")),
  }).index("by_seq", ["invoiceSeq"]),

  receipts: defineTable({
    receiptNo: v.string(),
    receiptSeq: v.number(),
    date: v.string(),
    customerId: v.id("customers"),
    invoiceId: v.optional(v.id("invoices")),
    lines: v.array(
      v.object({
        method: v.string(),
        reference: v.optional(v.string()),
        particulars: v.string(),
        amount: v.number(),
      }),
    ),
    total: v.number(),
    cancelled: v.boolean(),
  })
    .index("by_customer", ["customerId"])
    .index("by_date", ["date"])
    .index("by_seq", ["receiptSeq"]),

  vouchers: defineTable({
    voucherNo: v.string(),
    voucherSeq: v.number(),
    date: v.string(),
    payee: v.string(),
    cell: v.optional(v.string()),
    customerId: v.optional(v.id("customers")),
    lines: v.array(
      v.object({
        method: v.string(),
        reference: v.optional(v.string()),
        particulars: v.string(),
        amount: v.number(),
      }),
    ),
    total: v.number(),
    cancelled: v.boolean(),
  })
    .index("by_date", ["date"])
    .index("by_seq", ["voucherSeq"]),

  auditLogs: defineTable({
    action: v.string(),
    entity: v.string(),
    entityId: v.string(),
    summary: v.string(),
  }),
});
