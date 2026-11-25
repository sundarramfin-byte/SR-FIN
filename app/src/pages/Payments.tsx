import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CustomerCombobox } from "../components/CustomerCombobox";
import { Letterhead } from "../components/Letterhead";
import { Empty, Fld, Modal, PageHead, useToast } from "../components/ui";
import { PAYMENT_METHODS } from "../lib/charges";
import { amountInWords, fmtDate, inr, today } from "../lib/format";

type Line = { method: string; reference?: string; particulars: string; amount: number };
const blank = (): Line => ({ method: "GPay", reference: "", particulars: "", amount: 0 });

type DocRow = {
  _id: string;
  no: string;
  date: string;
  who: string;
  cell?: string;
  lines: Line[];
  total: number;
  cancelled: boolean;
};

/** One page component serves both Receipt (money in) and Voucher (money out). */
function PaymentPage({ kind }: { kind: "receipt" | "voucher" }) {
  const isReceipt = kind === "receipt";
  const receipts = useQuery(api.receipts.list, isReceipt ? {} : "skip");
  const vouchers = useQuery(api.vouchers.list, isReceipt ? "skip" : {});
  const cancelR = useMutation(api.receipts.cancel);
  const cancelV = useMutation(api.vouchers.cancel);
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [view, setView] = useState<DocRow | null>(null);

  const rows: DocRow[] = isReceipt
    ? (receipts ?? []).map((r) => ({ _id: r._id, no: r.receiptNo, date: r.date, who: `${r.srNo} – ${r.customerName}`, cell: r.cell, lines: r.lines, total: r.total, cancelled: r.cancelled }))
    : (vouchers ?? []).map((r) => ({ _id: r._id, no: r.voucherNo, date: r.date, who: r.payee, cell: r.cell, lines: r.lines, total: r.total, cancelled: r.cancelled }));

  const cancel = (id: string) =>
    confirm("Cancel this document? The number is kept and it is removed from the Day Book.") &&
    (isReceipt ? cancelR({ id: id as Id<"receipts"> }) : cancelV({ id: id as Id<"vouchers"> })).catch(toast.err);

  return (
    <>
      <PageHead title={isReceipt ? "Receipt" : "Voucher"}>
        <button className="btn" onClick={() => setAdding(true)}>+ New {isReceipt ? "receipt" : "voucher"}</button>
      </PageHead>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>No</th><th>Date</th><th>{isReceipt ? "Customer" : "Payee"}</th><th>Particulars</th><th className="r">Amount</th><th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id} className={r.cancelled ? "cancelled" : ""}>
                <td><b>{r.no}</b></td><td>{fmtDate(r.date)}</td><td>{r.who}</td>
                <td>{r.lines.map((l) => l.particulars).join(", ")}</td>
                <td className="r">{inr(r.total)}</td>
                <td className="r">
                  <button className="btn secondary sm" onClick={() => setView(r)}>View / Print</button>{" "}
                  {!r.cancelled && <button className="btn danger sm" onClick={() => cancel(r._id)}>Cancel</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty text={`No ${kind}s yet.`} />}
      </div>
      {adding && <PaymentEditor kind={kind} onClose={() => setAdding(false)} />}
      {view && <PaymentPreview kind={kind} row={view} onClose={() => setView(null)} />}
    </>
  );
}

export function PaymentEditor({ kind, onClose, presetCustomerId, presetInvoiceId }: {
  kind: "receipt" | "voucher";
  onClose: () => void;
  /** Open already filled for this customer / invoice (from the customer page). */
  presetCustomerId?: Id<"customers">;
  presetInvoiceId?: Id<"invoices">;
}) {
  const isReceipt = kind === "receipt";
  const customers = useQuery(api.customers.list, {}) ?? [];
  const invoices = useQuery(api.invoices.list) ?? [];
  const heads = (useQuery(api.expenseHeads.list) ?? []).filter((h) => h.kind === (isReceipt ? "charge" : "expense"));
  const createR = useMutation(api.receipts.create);
  const createV = useMutation(api.vouchers.create);
  const toast = useToast();

  const [date, setDate] = useState(today());
  const [customerId, setCustomerId] = useState<string>(presetCustomerId ?? "");
  const [invoiceId, setInvoiceId] = useState<string>(presetInvoiceId ?? "");
  const [payee, setPayee] = useState("");
  const [lines, setLines] = useState<Line[]>([blank()]);

  /** Choosing an invoice fills an empty first line with the balance still due. */
  function pickInvoice(iid: string) {
    setInvoiceId(iid);
    const inv = invoices.find((i) => i._id === iid);
    if (inv && lines.length === 1 && !lines[0].amount && !lines[0].particulars) {
      setLines([{ ...lines[0], particulars: `Against invoice ${inv.invoiceNo}`, amount: Math.max(inv.balance, 0) }]);
    }
  }
  const presetDone = useRef(false);
  useEffect(() => {
    if (presetDone.current || !presetInvoiceId) return;
    if (invoices.some((i) => i._id === presetInvoiceId)) { presetDone.current = true; pickInvoice(presetInvoiceId); }
  });

  const cust = customers.find((c) => c._id === customerId);
  const custInvoices = invoices.filter((i) => i.customerId === customerId && i.status !== "Cancelled");
  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);
  const setLine = (i: number, p: Partial<Line>) => setLines((l) => l.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function save() {
    try {
      const cleaned = lines
        .filter((l) => l.particulars || l.amount)
        .map((l) => ({ ...l, reference: l.reference || undefined }));
      if (isReceipt) {
        if (!customerId) throw new Error("Select a customer");
        await createR({ date, customerId: customerId as Id<"customers">, invoiceId: (invoiceId || undefined) as Id<"invoices"> | undefined, lines: cleaned });
      } else {
        await createV({
          date, payee: payee || cust?.name || "", cell: cust?.cell,
          customerId: (customerId || undefined) as Id<"customers"> | undefined, lines: cleaned,
        });
      }
      toast.ok(`${isReceipt ? "Receipt" : "Voucher"} saved`);
      onClose();
    } catch (e) { toast.err(e); }
  }

  return (
    <Modal title={`New ${kind}`} onClose={onClose} actions={<button className="btn secondary sm" onClick={save}>Save</button>}>
      <div className="grid" style={{ marginBottom: 14 }}>
        <Fld label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Fld>
        <Fld label={isReceipt ? "Customer (Type to search)" : "Customer (optional)"}>
          <CustomerCombobox
            value={customerId}
            onChange={(val) => {
              setCustomerId(val);
              setInvoiceId("");
            }}
            customers={customers}
            placeholder="Type customer name, SR no, mobile..."
          />
        </Fld>
        <Fld label="Cell no"><input readOnly className="computed" value={cust?.cell ?? ""} /></Fld>
        {isReceipt ? (
          <Fld label="Against invoice (optional)">
            <select value={invoiceId} onChange={(e) => pickInvoice(e.target.value)}>
              <option value="">— none —</option>
              {custInvoices.map((i) => <option key={i._id} value={i._id}>{i.invoiceNo} – balance {inr(i.balance)}</option>)}
            </select>
          </Fld>
        ) : (
          <Fld label="Payee name"><input value={payee} placeholder={cust?.name} onChange={(e) => setPayee(e.target.value)} /></Fld>
        )}
      </div>
      <datalist id="heads">{heads.map((h) => <option key={h._id} value={h.name} />)}</datalist>
      <table className="t">
        <thead><tr><th>S.No</th><th>Payment method</th><th>Reference no</th><th>Particulars</th><th className="r">Amount ₹</th><th /></tr></thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td><select value={l.method} onChange={(e) => setLine(i, { method: e.target.value })}>{PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}</select></td>
              <td><input value={l.reference ?? ""} onChange={(e) => setLine(i, { reference: e.target.value })} /></td>
              <td><input list="heads" value={l.particulars} onChange={(e) => setLine(i, { particulars: e.target.value })} /></td>
              <td><input type="number" style={{ width: 120, textAlign: "right" }} value={l.amount || ""} onChange={(e) => setLine(i, { amount: Number(e.target.value) })} /></td>
              <td><button className="btn danger sm" disabled={lines.length === 1} onClick={() => setLines((x) => x.filter((_, j) => j !== i))}>×</button></td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr><td colSpan={4}>Total paid amount</td><td className="r">{inr(total)}</td><td /></tr></tfoot>
      </table>
      <div style={{ marginTop: 10 }}>
        <button className="btn secondary sm" onClick={() => setLines((l) => [...l, blank()])}>+ Add line</button>
        <span className="hint" style={{ marginLeft: 12 }}>{total > 0 && amountInWords(total)}</span>
      </div>
    </Modal>
  );
}

function PaymentPreview({ kind, row, onClose }: { kind: "receipt" | "voucher"; row: DocRow; onClose: () => void }) {
  const s = useQuery(api.settings.get);
  const isReceipt = kind === "receipt";
  return (
    <Modal title={row.no} onClose={onClose} actions={<button className="btn secondary sm" onClick={() => window.print()}>Print / Save PDF</button>}>
      <div className="print-area">
        <div className="doc">
          <Letterhead title={isReceipt ? "RECEIPT" : "VOUCHER"}>
            <div className="meta">
              <div>{isReceipt ? "CUSTOMER NAME" : "PAYEE"}: <b>{row.who}</b><br />CELL NO: {row.cell}</div>
              <div style={{ textAlign: "right" }}>{isReceipt ? "R No" : "V No"}: <b>{row.no}</b><br />Date: {fmtDate(row.date)}</div>
            </div>
          </Letterhead>
          <table>
            <thead><tr><th>S No</th><th>Payment method</th><th>Reference no</th><th>Particulars</th><th className="r">Amount ₹</th></tr></thead>
            <tbody>
              {row.lines.map((l, i) => <tr key={i}><td>{i + 1}</td><td>{l.method}</td><td>{l.reference}</td><td>{l.particulars}</td><td className="r">{l.amount.toLocaleString("en-IN")}</td></tr>)}
              <tr><td colSpan={4}><b>Total paid amount</b></td><td className="r"><b>{inr(row.total)}</b></td></tr>
            </tbody>
          </table>
          <p>Amount in words: {amountInWords(row.total)}</p>
          <div className="sign">
            <div>CUSTOMER SIGNATURE<br />{row.who}</div>
            <div style={{ textAlign: "right" }}>{s?.companyName}<div style={{ marginTop: 30 }}>DIRECTOR<br />{s?.directorName}</div></div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export const Receipts = () => <PaymentPage kind="receipt" />;
export const Vouchers = () => <PaymentPage kind="voucher" />;
