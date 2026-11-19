# SR Fin – Implementation Prompt

> Paste everything below the line into your AI coding tool (or hand it to the dev team) to start the build.
> Source analysed: `data sheet final.xls` (10 sheets). Sections marked **CONFIRM** are open questions for the client.

---

## 1. ROLE & GOAL

You are a senior full-stack engineer. Build a professional, secure, multi-user **Loan Consultancy Management Software** for **SUNDAR RAM FIN CONSULTANCY [P] LTD** (DSA / loan facilitation firm, Madipakkam, Chennai; CIN U66190TN2023PTC160827). It replaces an Excel workbook in which staff type customer, invoice, receipt, voucher and payout data by hand. Every Excel sheet becomes its own **tab/module** in the app, all sharing one database, so a customer is entered once and flows automatically into invoices, receipts, reports and bank payout invoices.

## 2. TECH STACK (recommended)

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite, React Router, TanStack Table/Query, React Hook Form + Zod, Tailwind CSS |
| Backend | Node.js + Express (or NestJS) + TypeScript, Prisma ORM |
| Database | PostgreSQL (SQLite acceptable for a single-PC install) |
| Auth | Email + password, hashed (argon2/bcrypt), JWT/session, roles: **Admin, Staff, Accountant (read-only reports)** |
| PDF | Server-side HTML→PDF (Puppeteer) so printed Invoice/Receipt/Voucher match the Excel layouts with logo |
| Import/Export | `xlsx` library: import old data, export every table/report to Excel & PDF |
| Extras | Audit log (who changed what/when), daily DB backup, file uploads for KYC documents |

## 3. UI THEME (from client palette)

```
--c-primary-dark : #235347   /* sidebar, headers, primary buttons, table headers */
--c-primary-mid  : #8EB69B   /* hover, borders, secondary buttons, active tab underline, badges */
--c-primary-light: #DAF1DE   /* page background, card tint, zebra rows, input focus ring bg */
--c-white        : #FFFFFF   /* cards, forms, printed documents */
--c-text         : #0F2A24   /* body text (darkened #235347 for contrast) */
--c-danger       : #B42318   /* delete / validation errors */
--c-warning      : #B54708   /* pending / cancelled */
```
- Left sidebar in `#235347` with white text; active item has a `#8EB69B` left-bar and `#DAF1DE` text tint.
- Top bar: company logo + name, global customer search, user menu.
- Cards with 12px radius, soft shadow; rounded corners echo the curved swatches in the palette image.
- Font: Montserrat (matches palette screenshot) for headings, Inter for tables/forms.
- All text/background pairs must meet WCAG AA (white on `#235347` passes; do **not** put `#8EB69B` text on `#DAF1DE`).
- Desktop-first, responsive down to tablet. Indian formats everywhere: `₹ 1,05,00,000` (lakh/crore grouping), dates `DD/MM/YYYY`.

## 4. NAVIGATION – ONE TAB PER EXCEL SHEET

| # | Tab (app) | Source sheet | Purpose |
|---|---|---|---|
| 1 | Dashboard | *(new)* | KPIs: files this month, sanctioned/disbursed totals, pending payouts, cash balance, recent activity |
| 2 | Customer Code List | `Customer Code list` | Master list: S.No, SR No, customer name, cell, referrer, remarks/status |
| 3 | Customer Data Sheet | `CUSTOMER DATA SHEET 1` | Full application for **Salaried / NRI** customers |
| 4 | Self Employed | `Self Employed` | Full application for companies / self-employed customers |
| 5 | Invoice | `Invoice` | Customer fee invoice (detailed + summary + bank details + declaration) |
| 6 | Bank Invoice | `Bank Invoice` | Monthly payout invoice raised on the bank / aggregator (DSA vs Thawa) |
| 7 | Bank / DSA Codes | `bank cde Details` | Lender master with DSA code per channel |
| 8 | Receipt | `RECEIPT` | Money received from a customer |
| 9 | Voucher | `VOUCHER` | Money paid out (expenses, refunds) |
| 10 | Day Book | `DAY BOOK` | Daily/monthly ledger of receipts (credit) & vouchers (debit) with running balance |
| 11 | Yearly Report | `YEARLY REPORT` | Month-wise payout/collection summary per financial year |
| 12 | Settings | *(new)* | Company profile/logo, charge templates, dropdown values, numbering series, users & roles |

Tabs open in a persistent tab strip (browser-style) so staff can keep several customers/documents open.

## 5. DATA MODEL

**Company** (singleton): name, address, CIN, PAN, GST (nil allowed), logo, director name (B.S. Kannan), bank accounts (bank, branch, type, A/c no, IFSC) used on invoice footers.

**Customer** — `sr_no` (auto: `S R. NO 0001`, sequential, unique, immutable), `customer_type` (Salaried | Self Employed | NRI), `status` (Enquiry → Login → Sanctioned → Disbursed | Cancelled), `remarks`, `referred_by` (Broker | sulaka.com | Website | Connector), created/updated by.

**LoanFile** (a customer may have many) — customer_id, `dsa_id/channel` (SUNDAR RAM FIN | ANDRO MEDA | THAWA), `bank_id`, `dsa_code` (auto-filled from Bank×Channel), cluster name/email/cell, `file_no / reference_no`, branch, enquiry date & amount, login date, sanction date & amount, disbursement date & amount, land cost, construction cost, **total cost (computed = land + construction)**, tenure (years), property type (New | Old), loan type (Home Loan, Mortgage, Plot, Foreign Edu, Auction Property Purchase, Business, Recovery Property Sales/DRT), remarks (Sanctioned | Cancelled).

**Applicant / Person** (reused for applicant, co-applicants, directors) — name, father, mother, DOB, **age (computed)**, qualification, marital status, spouse/husband name, personal & official email, contact no, alternate no, role (Applicant | Co-applicant n | Director n).

**Address** — type (Current | Permanent | Office | NRI Office | Property), door no, villa/flat, street, village/town, taluk, district, PIN, landmark, proof type (MSME/GST/Aadhaar/…), years at residence, total years in city, rent/own.

**Employment** — office name, address, years in current job, total experience (Salaried/NRI).

**Company profile** (Self Employed) — company name, type (Pvt | Proprietorship | Partnership/Para), incorporation date, **years in business (computed)**, no. of directors, key person name/cell, directors 1…n (dynamic list, not fixed 1 & 1a).

**Reference** — up to 2 friends per customer: name, phone, address, email.

**Property** — address, owner name, door no, square feet, survey/TSLR no (old & new), village, taluk, district.

**Lender (Bank)** — name, product list, DSA codes per channel (SUNDAR RAM FIN / THAWA / ANDRO MEDA / DRT), payout % per product.

**Invoice** — invoice_no (`R00001` series), date, loan_file_id, status (Draft | Issued | Paid | Cancelled), property type, snapshot of land/construction/total/sanction, **InvoiceLine[]** (group: Sale Deed | Construction | MOTD | Other; particulars; basis/formula note; amount; mode of payment; paid date), group subtotals, grand total, bank details block, self-declaration text, signatory.

**BankInvoice** — running invoice no, date, business month, from-entity (DSA) , to-entity (bank/aggregator + address), loan_file_id/borrower, product, disbursal date & amount, payout %, payout amount, insurance disbursal & insurance payout, DSA payout total, CGST 9% / SGST 9% / IGST 18% (or NIL), TDS 5%, **net amount**, amount in words, PAN, GST no, receiving bank account.

**Receipt** — receipt_no (`R-00001`), date, customer_id (+cell auto), lines[] (payment method: GPay | PhonePe | NEFT | Cash | Cheque; reference no; particulars; amount), total, signatures.

**Voucher** — voucher_no (`V-00001`), date, payee/customer (+cell), lines[] (method, reference, **expense head from master list**, amount), total, signatures.

**ExpenseHead** (master for Voucher particulars) — seeded from sheet: Auditor Fees, Service charges, Credit card, Loan Repayment (Bank / Interest / EMI), Legal Fees, Valuer Fees, Xerox, Stationeries, Facility Charges, Court Expenses (advocate), Sale Deed Expenses, Stamp paper, Construction Cost/Fees, MOTD Fees, Bank Manager Charges, Stamp paper GST, Sub-Registrar office Expenses, Petrol, Two-wheeler/Car insurance & service, Travelling (Train, Bus, Metro, Rapido, Air), Hotel/Lodging, Driver, Food (Tea, Coffee, Lunch, Tiffin). Hierarchical (group → child). User-addable.

**LedgerEntry** (Day Book is a *view*, not manual entry) — date, ref (receipt/voucher no), credit, debit, running balance; generated automatically from Receipts & Vouchers.

**Document** — file uploads (KYC, sanction letter, etc.) linked to customer/loan file.

**AuditLog** — user, action, entity, before/after, timestamp.

## 6. MODULE BEHAVIOUR

### 6.1 Customer Code List
- Searchable, sortable, filterable table (status, bank, month). Row click opens the customer file.
- "New Customer" auto-assigns next SR No. Quick status change (Sanctioned / Cancelled). Export to Excel.

### 6.2 Customer Data Sheet (Salaried / NRI) and 6.3 Self Employed
- One reusable multi-section form with **sticky section navigation**: *Loan Details → Applicant → Address → Employment → Co-Applicants → References → NRI Office (only when type = NRI) → Property*.
- **Type of Customer** dropdown (Salaried / Self Employed / NRI) decides which form variant and sections show; Self Employed swaps Applicant/Employment for Company Profile + dynamic Directors list.
- Auto-calculations: age from DOB, total cost = land + construction, years in business from incorporation date. "Same as current address" copy button for permanent address and co-applicant address.
- Buttons from the sheet map to: **Submit** (save + validate), **Edit**, **Change** (status/type change, logged in audit trail). Add **Save as Draft**.
- Validation: 10-digit mobile, email format, 6-digit PIN, PAN format, DOB not in future, sanction ≤ total cost, dates sequential (enquiry ≤ login ≤ sanction ≤ disbursement). Warn if sanction amount > enquiry amount.
- Duplicate check on mobile / PAN / file number.
- DSA code auto-fills when Bank + Channel are selected.

### 6.4 Invoice
- Generate from a loan file: pulls applicant, loan type, land/construction/total/sanction automatically.
- **Charge templates (Settings)** pre-load the standard lines and formulas so staff only adjust values:
  - Sale Deed: Stamp duty/registration (% of total cost – Old = 7%, New = **CONFIRM**), Stamp paper, CD charge 300, Computer 200, Scan 500, Fees (Old = 2% of total cost)
  - Construction: Stamp paper & fees (% of construction cost), CD 300, Computer 200, Scan 500
  - MOTD: Stamp paper (0.5% of sanction), Fees, CD 200, Scan 500
  - Other: Legal 6,000, Valuer 6,000, Stamp paper GST 1,440, Document writer, Sub-registrar office (1%), Service charges (1 / 2 / 3 % of sanction)
- Each line: amount editable, formula/basis shown as a note, mode of payment, date. Group subtotals and grand total computed live.
- Two printable layouts exactly as in the sheet: **detailed (customer copy)** and **summary invoice** with customer address block, company bank details, self-declaration paragraph, signature blocks (Customer / Director B.S. Kannan).
- Auto invoice number, **PDF download, print, WhatsApp/email share**. Locks after "Issued" (changes require Admin + audit entry).
- Show outstanding balance = invoice total − receipts linked to it.

### 6.5 Bank Invoice (payout invoice)
- Pick loan file(s) + business month → auto-populates borrower, product, disbursal amount/date.
- Payout % comes from Lender master; payout = disbursal × %; same for insurance payout.
- Taxes: GST toggle (CGST+SGST 9% / IGST 18% / NIL) ; **TDS 5%** ; net = payout + GST − TDS.
- Amount-in-words generator (Indian system: lakh/crore).
- Two print variants side by side as in sheet: **DSA → Bank** and **DSA → Thawa/aggregator** (different "from", "to", account details).
- Running invoice number, month-wise status (Raised / Received), feeds Yearly Report.

### 6.6 Bank / DSA Codes
- Editable grid: Bank, DSA code per channel (SUNDAR RAM FIN, THAWA, DRT, ANDRO MEDA), products offered, payout %. Seeded from the 26 lenders in the sheet. Used as dropdown source everywhere.

### 6.7 Receipt and 6.8 Voucher
- Pick customer (autocomplete by SR No / name / cell) → cell no auto-fills. Add multiple payment lines (method, reference no, particulars, amount). Total auto-sums.
- Particulars: Receipt = invoice charge heads; Voucher = ExpenseHead master (searchable tree).
- Sequential numbering (R-00001 / V-00001), printable A4/A5 PDF in the existing layout with signatures. Edits/cancellation logged.
- Receipts can be allocated against an Invoice (partial payments supported).

### 6.9 Day Book
- Auto-built from Receipts (credit) and Vouchers (debit). Filters: day, month, custom range, payment method. Shows opening balance, running balance, closing balance. Print / Excel export. No manual entry except optional "opening balance" and adjustment entries (Admin).

### 6.10 Yearly Report
- Financial year selector (Apr–Mar, e.g. 2026–27). Rows: DSA / bank / customer payments; columns Apr…Mar + overall total. Pulls from Bank Invoices (payout) and Receipts. Click a cell to drill down to the underlying documents. Chart (bar by month) + Excel/PDF export.

### 6.11 Dashboard
- Cards: total files, sanctioned vs disbursed (₹), pending payouts, receipts this month, cash balance. Charts: monthly disbursement, files by bank, files by status. Recent customers & documents.

## 7. CROSS-CUTTING REQUIREMENTS
- Global search (SR No, name, cell, file no, invoice no).
- Role-based permissions per module; every create/update/delete written to AuditLog.
- Soft-delete only; no hard deletes for financial documents (cancel instead, keep number).
- Number series never reused; configurable prefixes in Settings.
- Reports exportable to Excel & PDF; all documents have the logo and company header from Settings.
- Automatic daily backup + manual "Backup now / Restore".
- One-time **Excel importer** for the existing workbook (customers, bank codes, expense heads).
- Keyboard-friendly data entry (Tab order, Enter to add line, Ctrl+S to save).
- Unit tests for all money calculations (invoice totals, GST/TDS, payout, running balance, amount-in-words).
- Seed script with the bank list, expense heads, charge templates and one demo customer.

## 8. ISSUES FOUND IN THE CURRENT SHEET (handle in the software / CONFIRM with client)
1. **Invalid date** `30/2/2026` appears in Invoice and Receipt → real date pickers will prevent this.
2. **Double counting:** the summary invoice adds *Stamp paper ₹8,000* as a separate line **and** inside *Sale Deed ₹7,44,000* (which already includes it). Total ₹9,88,140 is therefore overstated by ₹8,000. **CONFIRM** intended behaviour.
3. **Sanction amount mismatch:** page 1 shows ₹65,00,000, summary shows ₹46,83,208 for the same customer. Software will use one source (the loan file).
4. **Fees Charges (Sale Deed)** shows `0` while the side note computes ₹2,10,000 (2% old) → ends up outside the total. **CONFIRM** whether it should be in the total.
5. **Payout "0.9"** appears next to a result of ₹38,940 on ₹64,90,000 (that is actually 0.6%); the other payout ₹45,430 = 0.7%. **CONFIRM** payout % per bank/product.
6. Receipt number is `00001` on the receipt but `R-00001` in Day Book; Voucher `V-00001` — will be unified.
7. Name inconsistencies: "THAWA FIANANCICAL / FINANCIAL", `Naresh Babu K S` vs `NARESH BABU`, customer "Ram" / "raghu" test data — master data + autocomplete will remove retyping.
8. Typos ("Sancation / cacelled", "Disbursment", "Referation", "Propery", "Motd", "PIN CODFE", "recipt", "INSERANCE") — fix all labels in the UI and printed documents.
9. Duplicate fields in the form (File Number twice, Landmark twice, Sub-Registrar twice in lists) — consolidated.
10. Free-text cells that should be dropdowns: Type of Customer, Company type (Pvt/Prop/Para), Property type, Loan type, Payment mode, Referral source, Remarks.
11. Day Book balance formula only works for the sample rows — replaced by ledger logic.
12. Yearly Report labels ("BANK aro", "CUSTOMER Payment") are inconsistent and the S.No skips 2.

## 9. OPEN QUESTIONS FOR THE CLIENT
1. Single office/PC or several users and locations (decides desktop-installed vs cloud-hosted)?
2. Is the company GST-registered (sheet says NIL)? Should GST ever be charged on the customer invoice?
3. Should the invoice formulas (7% stamp duty, 2% fees, service charge 1/2/3 %) be fixed rules or editable per case?
4. Do you need SMS/WhatsApp/email delivery of invoices and receipts?
5. Is the *Andro Meda* / *Thawa* relationship a sub-DSA structure (payout shared)? Is a split/commission report needed?
6. Existing data to migrate (how many customers)? Any old numbering to keep?
7. Is the Daybook meant to be cash-only or all payment modes?
8. Preferred language for printouts (English only, or English + Tamil)?

## 10. DELIVERY PLAN
1. **Phase 1 – Foundation:** project setup, theme, auth/roles, Settings, Bank/DSA Codes, Expense heads, Customer Code List.
2. **Phase 2 – Customer files:** Customer Data Sheet + Self Employed forms, validations, documents upload.
3. **Phase 3 – Billing:** Invoice (templates, formulas, PDF), Receipt, Voucher.
4. **Phase 4 – Accounts & reports:** Day Book, Bank Invoice, Yearly Report, Dashboard, Excel export.
5. **Phase 5 – Hardening:** Excel import, audit log, backups, tests, UAT with client, deployment & training.

## 11. DELIVERABLES
Working application; database schema + migrations; seed data; API documentation; user manual (screenshots per tab); deployment guide; backup/restore guide.

## 12. FIRST TASK
Scaffold the monorepo (`/client`, `/server`), set up the theme tokens from §3, implement auth + the sidebar/tab shell with the 12 tabs from §4 as empty pages, create the Prisma schema from §5, seed the lender list and expense heads, then build **Customer Code List** end-to-end as the reference module. Pause and show me before continuing.
