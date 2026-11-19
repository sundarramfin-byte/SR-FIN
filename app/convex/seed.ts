import { mutation } from "./_generated/server";

const PRODUCTS =
  "Home Loan (New & Old), Mortgage Loan, Plot Loan, Foreign Edu Loan, Auction Property Purchase Loan, Business Loan, Recovery Prop Sales (DRT)";

// [name, sundarRamCode, thawaCode]  (spelling corrected from the Excel sheet)
const BANKS: [string, string?, string?][] = [
  ["Bank of Baroda", "CHE - DSA 000545"],
  ["Federal Bank", "DSA - 7467"],
  ["Kotak Mahindra Bank", "DSA - 471079"],
  ["Piramal Housing Finance Ltd", "PO42277A7M"],
  ["Godrej Finance", "DSA REGMAA 9250"],
  ["Thawa Financial Service Pvt Ltd", undefined, "728"],
  ["Central Bank of India"],
  ["State Bank of India"],
  ["Punjab National Bank", "HLRLC3778287"],
  ["Union Bank of India", "P11706"],
  ["Karnataka Bank Ltd"],
  ["Karur Vysya Bank"],
  ["Equitas", "IBC 25015"],
  ["Aditya Housing Finance", "DAA202056546"],
  ["Tata Capital"],
  ["Bajaj Finance", undefined, "214738"],
  ["GIC Housing Finance Ltd", "TAM/SL/034"],
  ["LIC Housing Finance Ltd", undefined, "DSAZ059113510"],
  ["Repco Housing Finance Ltd"],
  ["ICICI Housing Finance", undefined, "367656"],
  ["Aadhar Housing Finance Ltd", undefined, "DSA10005934"],
  ["Mahindra Home Finance Ltd"],
  ["Axis Bank", undefined, "AFLR 4376"],
  ["DCB Bank", undefined, "VEN37047"],
  ["IDBI Bank", undefined, "DSA THAWAAF"],
  ["ANDRO MEDA"],
];

const CHARGES = [
  "Sale Deed Expenses", "Stamp paper", "CD Charge", "Computer Charges", "Scan Charges", "Fees Charges",
  "Construction Cost", "MOTD Stamp paper Charges", "MOTD Fees Charges", "Legal Fees", "Valuer Fees",
  "Stamp paper GST Charges", "Document Writer Charges", "Sub-Registrar office Expenses", "Service Charges",
];

const EXPENSES: [string, string?][] = [
  ["Auditor Fees"], ["Service charges"], ["Credit card"],
  ["Loan Repayment - Bank", "Loan Repayment"], ["Loan Repayment - Interest", "Loan Repayment"],
  ["Loan Repayment - EMI", "Loan Repayment"],
  ["Legal Fees"], ["Valuer Fees"], ["Xerox"], ["Stationeries"], ["Facility Charges"],
  ["Court Expenses - Advocate", "Court Expenses"],
  ["Sale Deed Expenses"], ["Stamp paper"], ["Construction Cost"], ["Construction Fees Charges"],
  ["MOTD Fees Charges"], ["Bank Manager Charges"], ["Stamp paper GST Charges"],
  ["Sub-Registrar office Expenses"],
  ["Petrol (Two wheeler)", "Vehicle"], ["Two wheeler Insurance", "Vehicle"], ["Car Insurance", "Vehicle"],
  ["Two wheeler Service Charges", "Vehicle"], ["Car Service Charges", "Vehicle"],
  ["Train Fare", "Travelling"], ["Bus Fare", "Travelling"], ["Metro Fare / Pass", "Travelling"],
  ["Rapido Fare", "Travelling"], ["Air Ticket", "Travelling"],
  ["Hotel / Lodge", "Hotel Expenses"], ["Driver Charges", "Hotel Expenses"],
  ["Tea", "Food"], ["Coffee", "Food"], ["Lunch", "Food"], ["Tiffin", "Food"],
];

/** Idempotent: run with `npx convex run seed:run`. */
export const run = mutation({
  args: {},
  handler: async (ctx) => {
    if (!(await ctx.db.query("settings").first())) {
      await ctx.db.insert("settings", {
        companyName: "SUNDAR RAM FIN CONSULTANCY [P] LTD",
        address:
          "No: 3, 1st Floor, Vivekanandar Street, Srinivasa Nagar, Ram Nagar [North], Madipakkam, Chennai - 600091",
        cin: "U66190TN2023PTC160827",
        pan: "ABKCS9433P",
        gst: "NIL",
        directorName: "B.S. KANNAN",
        phone: "8056148198, 9790896475",
        email: "bskannan1966@gmail.com",
        bankName: "FEDERAL BANK",
        bankBranch: "MADIPAKKAM",
        bankAccountNo: "",
        bankIfsc: "FDRL0002328",
        bankAccountType: "CURRENT",
        declaration:
          "I have paid the above-mentioned amount to the above bank account for the purpose of payment of expenses to be incurred at the bank, Sub-Registrar office expenses, Document writer office, Sale deed charges, MOTD charges, Construction charges, Legal fees, Valuer fees & Facility charges on my behalf.",
        openingBalance: 0,
      });
    }
    let banks = 0;
    for (const [name, sr, thawa] of BANKS) {
      const exists = await ctx.db.query("banks").withIndex("by_name", (q) => q.eq("name", name)).first();
      if (exists) continue;
      await ctx.db.insert("banks", {
        name,
        sundarRamCode: sr,
        thawaCode: thawa,
        products: name === "Bank of Baroda" ? PRODUCTS : undefined,
        active: true,
      });
      banks++;
    }
    let heads = 0;
    if (!(await ctx.db.query("expenseHeads").first())) {
      for (const name of CHARGES) await ctx.db.insert("expenseHeads", { name, kind: "charge" });
      for (const [name, group] of EXPENSES) await ctx.db.insert("expenseHeads", { name, group, kind: "expense" });
      heads = CHARGES.length + EXPENSES.length;
    }
    return { banksAdded: banks, expenseHeadsAdded: heads };
  },
});
