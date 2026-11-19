import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Empty, Fld, PageHead } from "../components/ui";
import { FY_START, fmtDate, inr, MONTHS, today } from "../lib/format";

export function DayBook() {
  const first = today().slice(0, 8) + "01";
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(today());
  const d = useQuery(api.reports.dayBook, { from, to });
  return (
    <>
      <PageHead title="Day Book">
        <Fld label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Fld>
        <Fld label="To"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Fld>
        <button className="btn secondary" onClick={() => window.print()}>Print</button>
      </PageHead>
      <div className="print-area">
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>S.No</th><th>Date</th><th>Receipt / Voucher no</th><th className="r">Credit</th><th className="r">Debit</th><th className="r">Balance</th></tr></thead>
            <tbody>
              <tr><td /><td /><td><i>Opening balance</i></td><td /><td /><td className="r">{inr(d?.opening ?? 0)}</td></tr>
              {(d?.rows ?? []).map((r, i) => (
                <tr key={i}>
                  <td>{i + 1}</td><td>{fmtDate(r.date)}</td><td>{r.ref}</td>
                  <td className="r">{r.credit ? inr(r.credit) : ""}</td><td className="r">{r.debit ? inr(r.debit) : ""}</td>
                  <td className="r">{inr(r.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td colSpan={3}>Total / Closing balance</td><td className="r">{inr(d?.totalCredit ?? 0)}</td><td className="r">{inr(d?.totalDebit ?? 0)}</td><td className="r">{inr(d?.closing ?? 0)}</td></tr>
            </tfoot>
          </table>
          {d && d.rows.length === 0 && <Empty text="No receipts or vouchers in this period." />}
        </div>
      </div>
      <p className="hint no-print">The Day Book is generated automatically from Receipts (credit) and Vouchers (debit). Cancelled documents are excluded.</p>
    </>
  );
}

export function Yearly() {
  const [fy, setFy] = useState(FY_START());
  const d = useQuery(api.reports.yearly, { fyStart: fy });
  return (
    <>
      <PageHead title={`Payout Charges – Year ${fy} to ${fy + 1}`}>
        <Fld label="Financial year (Apr–Mar)">
          <select value={fy} onChange={(e) => setFy(Number(e.target.value))}>
            {[0, 1, 2, 3, 4].map((o) => { const y = FY_START() + 1 - o; return <option key={y} value={y}>{y}–{String(y + 1).slice(2)}</option>; })}
          </select>
        </Fld>
        <button className="btn secondary" onClick={() => window.print()}>Print</button>
      </PageHead>
      <div className="print-area">
        <div className="table-wrap">
          <table className="t">
            <thead><tr><th>S.No</th><th>DSA / Bank</th>{MONTHS.map((m) => <th key={m} className="r">{m}</th>)}<th className="r">Overall</th></tr></thead>
            <tbody>
              {(d?.rows ?? []).map((r, i) => (
                <tr key={r.name}>
                  <td>{i + 1}</td><td><b>{r.name}</b></td>
                  {r.months.map((m, j) => <td key={j} className="r">{m ? m.toLocaleString("en-IN") : ""}</td>)}
                  <td className="r"><b>{r.total.toLocaleString("en-IN")}</b></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td /><td>Total</td>{(d?.totals ?? Array(12).fill(0)).map((m, j) => <td key={j} className="r">{m ? m.toLocaleString("en-IN") : ""}</td>)}<td className="r">{(d?.grand ?? 0).toLocaleString("en-IN")}</td></tr>
            </tfoot>
          </table>
          {d && d.rows.length === 0 && <Empty text="No payout invoices or receipts in this financial year." />}
        </div>
      </div>
      <p className="hint no-print">Bank rows come from Bank (payout) Invoices by business month; “CUSTOMER Payment” is the sum of Receipts.</p>
    </>
  );
}
