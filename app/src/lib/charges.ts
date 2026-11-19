export type InvoiceLine = {
  group: string;
  particulars: string;
  basis?: string;
  amount: number;
  mode?: string;
  paidDate?: string;
};

export const GROUPS = ["Sale Deed Expenses", "Construction Cost", "MOTD Charges", "Other Charges"];

const r = (n: number) => Math.round(n);

/**
 * Standard charge template taken from the Excel "Invoice" sheet.
 * Percentages/fixed amounts are only defaults – every line stays editable.
 * (Rates marked "confirm" are open questions for the client.)
 */
export function buildInvoiceLines(p: {
  propertyType?: string;
  landCost: number;
  constructionCost: number;
  sanctionAmount: number;
}): InvoiceLine[] {
  const total = p.landCost + p.constructionCost;
  const old = (p.propertyType ?? "Old") === "Old";
  const mode = "Current / GPay";
  const L = (group: string, particulars: string, amount: number, basis?: string): InvoiceLine => ({
    group,
    particulars,
    amount,
    basis,
    mode,
  });
  const SD = GROUPS[0], CC = GROUPS[1], MO = GROUPS[2], OT = GROUPS[3];
  return [
    L(SD, `Sale Deed (${old ? "Old" : "New"})`, r(total * 0.07), "7% of total cost (confirm rate for New)"),
    L(SD, "Stamp paper", 8000),
    L(SD, "CD Charge", 300),
    L(SD, "Computer Charges", 200),
    L(SD, "Scan Charges", 500),
    L(SD, "Fees Charges", 0, old ? `2% of total cost = ${r(total * 0.02)} (excluded in Excel total – confirm)` : "confirm"),
    L(CC, "Stamp paper", 0, "2% of construction cost, if applicable"),
    L(CC, "Fees Charges", 0, "2% of construction cost, if applicable"),
    L(CC, "CD Charge", 300),
    L(CC, "Computer Charges", 200),
    L(CC, "Scan Charges", 500),
    L(MO, "MOTD Stamp paper Charges", r(p.sanctionAmount * 0.005), "0.5% of sanction amount"),
    L(MO, "MOTD Fees Charges", 8500),
    L(MO, "CD Charge", 200),
    L(MO, "Scan Charges", 500),
    L(OT, "Legal Fees", 6000),
    L(OT, "Valuer Fees", 6000),
    L(OT, "Stamp paper GST Charges", 1440),
    L(OT, "Document Writer Charges", 25000),
    L(OT, "Sub-Registrar office Expenses", 25000),
    L(OT, "Service Charges", r(p.sanctionAmount * 0.02), "2% of sanction amount (1 / 2 / 3 %)"),
  ];
}

export const PAYMENT_METHODS = ["GPay", "PhonePe", "NEFT", "Cash", "Cheque", "Current A/c"];
export const LOAN_TYPES = [
  "Home Loan", "Mortgage Loan", "Plot Loan", "Foreign Education Loan",
  "Auction Property Purchase Loan", "Business Loan", "Recovery Property Sales (DRT)",
];
export const CHANNELS = ["SUNDAR RAM FIN", "THAWA", "ANDRO MEDA"];
export const REFERRERS = ["Broker", "sulaka.com", "Website", "Connector"];
export const STATUSES = ["Enquiry", "Login", "Sanctioned", "Disbursed", "Cancelled"] as const;
