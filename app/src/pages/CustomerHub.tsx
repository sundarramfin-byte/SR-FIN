import { useState, type ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge, Empty, PageHead, StatusStepper, useToast } from "../components/ui";
import { fmtDate, inr } from "../lib/format";
import CustomerForm from "./CustomerForm";
import { InvoiceEditor } from "./Invoices";
import LoanFiles, { LoanFileModal } from "./LoanFiles";
import { PaymentEditor } from "./Payments";

const TABS = [
  ["overview", "Overview"],
  ["files", "Loan files"],
  ["money", "Invoices & payments"],
  ["details", "Application details"],
] as const;
type Tab = (typeof TABS)[number][0];

type ModalState =
  | { kind: "loanFile" }
  | { kind: "invoice"; loanFileId?: Id<"loanFiles"> }
  | { kind: "receipt"; invoiceId?: Id<"invoices"> }
  | null;

/** One page per customer: stage, next step, loan files, invoices and receipts, application form. */
export default function CustomerHub() {
  const { id } = useParams();
  const customerId = id as Id<"customers">;
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find(([k]) => k === params.get("tab"))?.[0] ?? "overview") as Tab;
  const setTab = (t: Tab) => setParams(t === "overview" ? {} : { tab: t }, { replace: true });

  const data = useQuery(api.customers.get, { id: customerId });
  const allInvoices = useQuery(api.invoices.list);
  const allReceipts = useQuery(api.receipts.list, {});
  const setStatus = useMutation(api.customers.setStatus);
  const [modal, setModal] = useState<ModalState>(null);
  const toast = useToast();
  const nav = useNavigate();

  if (data === undefined) return <div className="empty">Loading…</div>;
  if (data === null) return <div className="empty">Customer not found. <Link to="/customers">Back to customers</Link></div>;

  const { customer: c, loanFiles } = data;
  const invoices = (allInvoices ?? []).filter((i) => i.customerId === customerId);
  const live = invoices.filter((i) => i.status !== "Cancelled");
  const receipts = (allReceipts ?? []).filter((r) => r.customerId === customerId);
  const invoiced = live.reduce((s, i) => s + i.total, 0);
  const received = live.reduce((s, i) => s + i.paid, 0);
  const due = invoiced - received;
  const sanctioned = loanFiles.reduce((s, f) => s + (f.sanctionAmount ?? 0), 0);
  const isCompany = c.customerType === "Self Employed";

  const setStage = (s: string) =>
    setStatus({ id: customerId, status: s as never }).then(() => toast.ok(`Stage set to ${s}`)).catch(toast.err);

  /* what should the user do next? */
  const needsInvoice = loanFiles.find((f) => f.sanctionDate && !live.some((i) => i.loanFileId === f._id));
  const owing = live.find((i) => i.balance > 0);
  let next: { text: string; label?: string; go?: () => void };
  if (c.status === "Cancelled") next = { text: "This customer is marked Cancelled.", label: "Reopen", go: () => setStage("Enquiry") };
  else if (loanFiles.length === 0) next = { text: "No loan file yet – add the bank and loan details.", label: "+ Add loan file", go: () => setModal({ kind: "loanFile" }) };
  else if (needsInvoice) next = {
    text: `Loan sanctioned${needsInvoice.bankName ? ` by ${needsInvoice.bankName}` : ""} – raise the fee invoice.`,
    label: "+ Create invoice", go: () => setModal({ kind: "invoice", loanFileId: needsInvoice._id }),
  };
  else if (owing) next = {
    text: `${owing.invoiceNo} has ${inr(owing.balance)} still to collect.`,
    label: "+ Record receipt", go: () => setModal({ kind: "receipt", invoiceId: owing._id }),
  };
  else if (!loanFiles.some((f) => f.sanctionDate)) next = { text: "Waiting for sanction – update the loan file when the bank responds.", label: "Open loan files", go: () => setTab("files") };
  else next = { text: "All invoices are paid. Nothing pending." };

  const wa = () => {
    const msg = encodeURIComponent(`Hello ${c.name}, this is SUNDAR RAM FIN CONSULTANCY [P] LTD regarding your loan file ${c.srNo}.`);
    window.open(`https://api.whatsapp.com/send?phone=91${c.cell}&text=${msg}`, "_blank");
  };

  return (
    <>
      <div className="no-print" style={{ marginBottom: 8 }}>
        <button className="btn ghost sm" onClick={() => nav("/customers")}>← All customers</button>
      </div>

      <div className="card">
        <div className="hub-head">
          <div>
            <h1>{c.name}</h1>
            <div className="hub-meta">
              <span>{c.srNo}</span>
              <span>📞 {c.cell || "No phone"}</span>
              <span>{c.customerType}</span>
              {c.referredBy && <span>Referred by {c.referredBy}</span>}
            </div>
          </div>
          <div className="row no-print">
            {c.cell && <button className="btn secondary sm" onClick={wa}>💬 WhatsApp</button>}
            {c.status !== "Cancelled" && (
              <button className="btn danger sm" onClick={() => confirm("Mark this customer as Cancelled?") && setStage("Cancelled")}>Cancel customer</button>
            )}
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <StatusStepper status={c.status} onSet={c.status === "Cancelled" ? undefined : setStage} />
          <p className="hint" style={{ marginTop: 6 }}>The stage updates by itself when you enter login, sanction or disbursement dates on a loan file. Click a step to set it by hand.</p>
        </div>

        <div className={"next-step" + (next.go ? "" : " done")}>
          <div>
            <div className="ns-label">{next.go ? "Next step" : "Status"}</div>
            <div className="ns-text">{next.go ? next.text : `✓ ${next.text}`}</div>
          </div>
          {next.go && <button className="btn" onClick={next.go}>{next.label}</button>}
        </div>
      </div>

      <div className="tabs no-print" role="tablist">
        {TABS.map(([k, label]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="stat-row">
            <Stat label="Loan files" value={String(loanFiles.length)} />
            <Stat label="Sanctioned" value={inr(sanctioned)} />
            <Stat label="Invoiced" value={inr(invoiced)} />
            <Stat label="Received" value={inr(received)} />
            <Stat label="Balance due" value={inr(due)} />
          </div>
          <div className="card">
            <div className="row" style={{ marginBottom: 10 }}>
              <h2>Loan files</h2><div className="grow" />
              <button className="btn secondary sm" onClick={() => setTab("files")}>Manage</button>
            </div>
            {loanFiles.length === 0 ? <Empty text="No loan files yet." /> : (
              <table className="t">
                <thead><tr><th>Bank</th><th>File no</th><th>Loan type</th><th>Sanction</th><th>Disbursed</th></tr></thead>
                <tbody>
                  {loanFiles.map((f) => (
                    <tr key={f._id}>
                      <td>{f.bankName}</td><td>{f.fileNo}</td><td>{f.loanType}</td>
                      <td className="r">{inr(f.sanctionAmount)}</td><td className="r">{inr(f.disbursementAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {c.remarks && <div className="card"><h2 style={{ marginBottom: 6 }}>Remarks</h2><p>{c.remarks}</p></div>}
        </>
      )}

      {tab === "files" && <div className="card"><LoanFiles customerId={customerId} /></div>}

      {tab === "money" && (
        <>
          <PageHead title="Invoices">
            <button className="btn" onClick={() => setModal({ kind: "invoice" })}>+ Create invoice</button>
            <button className="btn secondary" onClick={() => setModal({ kind: "receipt" })}>+ Record receipt</button>
          </PageHead>
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Invoice no</th><th>Date</th><th className="r">Total</th><th className="r">Received</th><th className="r">Balance</th><th>Status</th><th /></tr></thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i._id} className={i.status === "Cancelled" ? "cancelled" : ""}>
                    <td><b>{i.invoiceNo}</b></td><td>{fmtDate(i.date)}</td>
                    <td className="r">{inr(i.total)}</td><td className="r">{inr(i.paid)}</td><td className="r">{inr(i.balance)}</td>
                    <td><Badge v={i.status} /></td>
                    <td className="r">
                      {i.status !== "Cancelled" && i.balance > 0 && (
                        <button className="btn sm" onClick={() => setModal({ kind: "receipt", invoiceId: i._id })}>Record receipt</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allInvoices && invoices.length === 0 && <Empty text="No invoices yet. Create one once a loan is sanctioned." />}
          </div>
          <p className="hint" style={{ margin: "6px 0 18px" }}>Need the printable copy or WhatsApp link? Open <Link to="/invoice">Invoice</Link>.</p>

          <PageHead title="Receipts" />
          <div className="table-wrap">
            <table className="t">
              <thead><tr><th>Receipt no</th><th>Date</th><th>Particulars</th><th className="r">Amount</th></tr></thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r._id} className={r.cancelled ? "cancelled" : ""}>
                    <td><b>{r.receiptNo}</b></td><td>{fmtDate(r.date)}</td>
                    <td>{r.lines.map((l) => l.particulars).join(", ")}</td><td className="r">{inr(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {allReceipts && receipts.length === 0 && <Empty text="No receipts yet." />}
          </div>
        </>
      )}

      {tab === "details" && <CustomerForm key={isCompany ? "c" : "i"} company={isCompany} embedded />}

      {modal?.kind === "loanFile" && <LoanFileModal customerId={customerId} onClose={() => setModal(null)} />}
      {modal?.kind === "invoice" && (
        <InvoiceEditor presetCustomerId={customerId} presetLoanFileId={modal.loanFileId} onClose={() => setModal(null)} />
      )}
      {modal?.kind === "receipt" && (
        <PaymentEditor kind="receipt" presetCustomerId={customerId} presetInvoiceId={modal.invoiceId} onClose={() => setModal(null)} />
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return <div className="stat"><small>{label}</small><b>{value}</b></div>;
}
