# SR Fin – Loan Consultancy Manager

React + TypeScript (Vite) frontend, **Convex** backend/database.

## Run locally

```bash
cd app
npm install
npm run dev:backend      # terminal 1 – starts Convex (first time: choose "local deployment" / log in)
npx convex run seed:run  # once – seeds 25 banks, expense heads, company settings
npm run dev              # terminal 2 – http://localhost:5173
```

## Deploy for the client

```bash
npx convex deploy        # production backend
npm run build            # static site in dist/ (set VITE_CONVEX_URL to the production URL)
```

## Layout

| Path | What |
|---|---|
| `convex/schema.ts` | All tables (customers, loanFiles, invoices, bankInvoices, receipts, vouchers, banks, …) |
| `convex/*.ts` | Queries / mutations with server-side validation & money maths |
| `src/pages/*` | One page per Excel sheet |
| `src/lib/charges.ts` | Standard invoice charge template (from the Excel Invoice sheet) |
| `src/lib/formConfig.ts` | Field lists that drive the customer application forms |
| `src/styles.css` | Palette tokens `#235347` / `#8EB69B` / `#DAF1DE` |

## Not built yet
Login & roles, audit-log viewer, KYC file uploads, Excel importer/exporter, dedicated PDF engine (documents use browser Print → Save as PDF).
