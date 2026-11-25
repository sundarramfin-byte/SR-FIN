import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { CustomerCombobox } from "../components/CustomerCombobox";
import { Letterhead, SignBlock } from "../components/Letterhead";
import { Badge, Empty, Fld, Modal, PageHead, toNum, useToast } from "../components/ui";
import { buildInvoiceLines, GROUPS, type InvoiceLine } from "../lib/charges";
import { fmtDate, inr, today } from "../lib/format";
import { downloadInvoicePdf, shareInvoicePdf } from "../lib/pdf";

export default function Invoices() {
  const invoices = useQuery(api.invoices.list);
  const [editing, setEditing] = useState<Id<"invoices"> | "new" | null>(null);
  const [preview, setPreview] = useState<{ id: Id<"invoices">; mode: "company" | "customer" } | null>(null);
  const setStatus = useMutation(api.invoices.setStatus);
  const toast = useToast();

  return (
    <>
      <PageHead title="Invoice">
        <button className="btn" onClick={() => setEditing("new")}>+ New invoice</button>
      </PageHead>
      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr><th>Invoice no</th><th>Date</th><th>Customer</th><th className="r">Total</th><th className="r">Received</th><th className="r">Balance</th><th>Status</th><th /></tr>
          </thead>
          <tbody>
            {(invoices ?? []).map((i) => (
              <tr key={i._id} className={i.status === "Cancelled" ? "cancelled" : ""}>
                <td><b>{i.invoiceNo}</b></td>
                <td>{fmtDate(i.date)}</td>
                <td>{i.srNo} – {i.customerName}</td>
                <td className="r">{inr(i.total)}</td>
                <td className="r">{inr(i.paid)}</td>
                <td className="r">{inr(i.balance)}</td>
                <td><Badge v={i.status} /></td>
                <td className="r">
                  <button className="btn secondary sm" title="Detailed itemized breakdown for office records" onClick={() => setPreview({ id: i._id, mode: "company" })}>
                    Company Copy
                  </button>{" "}
                  <button className="btn secondary sm" title="Official copy with bank details & self-declaration for client" onClick={() => setPreview({ id: i._id, mode: "customer" })}>
                    Customer Copy
                  </button>{" "}
                  <button
                    className="btn secondary sm"
                    title="Share e-Signed Customer Invoice via WhatsApp"
                    onClick={() => {
                      const viewUrl = `${window.location.origin}/view-invoice/${i._id}`;
                      const msg = encodeURIComponent(
                        `Dear ${i.customerName},\n\nPlease find your Invoice No: ${i.invoiceNo} from SUNDAR RAM FIN CONSULTANCY [P] LTD.\nTotal Amount: ₹${i.total.toLocaleString("en-IN")}\nDate: ${fmtDate(i.date)}\n\nView & download your official e-Signed copy here:\n${viewUrl}\n\nThank you for choosing us!`
                      );
                      window.open(`https://api.whatsapp.com/send?text=${msg}`, "_blank");
                    }}
                  >
                    💬 WhatsApp
                  </button>{" "}
                  {i.status === "Draft" && (
                    <>
                      <button className="btn secondary sm" onClick={() => setEditing(i._id)}>Edit</button>{" "}
                      <button className="btn sm" onClick={() => setStatus({ id: i._id, status: "Issued" }).then(() => toast.ok("Invoice issued and locked")).catch(toast.err)}>Issue</button>
                    </>
                  )}
                  {i.status === "Issued" && (
                    <button className="btn sm" onClick={() => setStatus({ id: i._id, status: "Paid" }).catch(toast.err)}>Mark paid</button>
                  )}{" "}
                  {i.status !== "Cancelled" && i.status !== "Paid" && (
                    <button className="btn danger sm" onClick={() => confirm("Cancel this invoice? The number is kept.") && setStatus({ id: i._id, status: "Cancelled" }).catch(toast.err)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {invoices?.length === 0 && <Empty text="No invoices yet." />}
      </div>
      {editing && <InvoiceEditor id={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {preview && <InvoicePreview id={preview.id} initialMode={preview.mode} onClose={() => setPreview(null)} />}
    </>
  );
}

export function InvoiceEditor({ id, onClose, presetCustomerId, presetLoanFileId }: {
  id?: Id<"invoices">;
  onClose: () => void;
  /** Start a new invoice already filled for this customer / loan file (from the customer page). */
  presetCustomerId?: Id<"customers">;
  presetLoanFileId?: Id<"loanFiles">;
}) {
  const existing = useQuery(api.invoices.get, id ? { id } : "skip");
  const customers = useQuery(api.customers.list, {}) ?? [];
  const create = useMutation(api.invoices.create);
  const update = useMutation(api.invoices.update);
  const toast = useToast();

  const [customerId, setCustomerId] = useState<string>(presetCustomerId ?? "");
  const [loanFileId, setLoanFileId] = useState<string>(presetLoanFileId ?? "");
  const [date, setDate] = useState(today());
  const [propertyType, setPropertyType] = useState("Old");
  const [land, setLand] = useState("");
  const [cons, setCons] = useState("");
  const [sanction, setSanction] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [loaded, setLoaded] = useState(!id);

  const files = useQuery(api.loanFiles.listByCustomer, customerId ? { customerId: customerId as Id<"customers"> } : "skip") ?? [];

  if (id && existing && !loaded) {
    const i = existing.invoice;
    setCustomerId(i.customerId); setLoanFileId(i.loanFileId ?? ""); setDate(i.date);
    setPropertyType(i.propertyType ?? "Old"); setLand(String(i.landCost)); setCons(String(i.constructionCost));
    setSanction(String(i.sanctionAmount)); setLines(i.lines); setLoaded(true);
  }

  const presetApplied = useRef(false);
  useEffect(() => {
    if (id || !presetLoanFileId || presetApplied.current) return;
    const f = files.find((x) => x._id === presetLoanFileId);
    if (!f) return;
    presetApplied.current = true;
    const l = f.landCost ?? 0, c = f.constructionCost ?? 0, sn = f.sanctionAmount ?? 0, pt = f.propertyType ?? "Old";
    setLand(String(l)); setCons(String(c)); setSanction(String(sn)); setPropertyType(pt);
    setLines(buildInvoiceLines({ propertyType: pt, landCost: l, constructionCost: c, sanctionAmount: sn }));
  }, [files, id, presetLoanFileId]);

  const landN = toNum(land) ?? 0, consN = toNum(cons) ?? 0, sanN = toNum(sanction) ?? 0;

  function pickFile(fid: string) {
    setLoanFileId(fid);
    const f = files.find((x) => x._id === fid);
    if (f) {
      setLand(String(f.landCost ?? 0)); setCons(String(f.constructionCost ?? 0));
      setSanction(String(f.sanctionAmount ?? 0)); setPropertyType(f.propertyType ?? "Old");
    }
  }

  const setLine = (i: number, patch: Partial<InvoiceLine>) =>
    setLines((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const subtotal = (g: string) => lines.filter((l) => l.group === g).reduce((s, l) => s + (l.amount || 0), 0);
  const total = lines.reduce((s, l) => s + (l.amount || 0), 0);

  async function save() {
    try {
      if (!customerId) throw new Error("Select a customer");
      const payload = {
        date, customerId: customerId as Id<"customers">,
        loanFileId: (loanFileId || undefined) as Id<"loanFiles"> | undefined,
        propertyType, landCost: landN, constructionCost: consN, sanctionAmount: sanN, lines,
      };
      if (id) await update({ id, ...payload }); else await create(payload);
      toast.ok("Invoice saved");
      onClose();
    } catch (e) { toast.err(e); }
  }

  return (
    <Modal title={id ? `Edit invoice ${existing?.invoice.invoiceNo ?? ""}` : "New invoice"} onClose={onClose}
      actions={<button className="btn secondary sm" onClick={save}>Save</button>}>
      <div className="grid" style={{ marginBottom: 14 }}>
        <Fld label="Customer (Type to search)">
          <CustomerCombobox
            value={customerId}
            onChange={(val) => {
              setCustomerId(val);
              setLoanFileId("");
            }}
            customers={customers}
            placeholder="Type customer name, SR no, mobile..."
          />
        </Fld>
        <Fld label="Loan file">
          <select value={loanFileId} onChange={(e) => pickFile(e.target.value)}>
            <option value="">— none —</option>
            {files.map((f) => <option key={f._id} value={f._id}>{f.bankName} {f.fileNo}</option>)}
          </select>
        </Fld>
        <Fld label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Fld>
        <Fld label="Property type">
          <select value={propertyType} onChange={(e) => setPropertyType(e.target.value)}><option>Old</option><option>New</option></select>
        </Fld>
        <Fld label="Land cost ₹"><input type="number" value={land} onChange={(e) => setLand(e.target.value)} /></Fld>
        <Fld label="Construction cost ₹"><input type="number" value={cons} onChange={(e) => setCons(e.target.value)} /></Fld>
        <Fld label="Total cost ₹"><input readOnly className="computed" value={(landN + consN).toLocaleString("en-IN")} /></Fld>
        <Fld label="Sanction amount ₹"><input type="number" value={sanction} onChange={(e) => setSanction(e.target.value)} /></Fld>
      </div>

      <div className="row" style={{ marginBottom: 10 }}>
        <button className="btn" onClick={() => setLines(buildInvoiceLines({ propertyType, landCost: landN, constructionCost: consN, sanctionAmount: sanN }))}>
          Load standard charges
        </button>
        <span className="hint">Fills the standard lines from your costs. Every amount stays editable.</span>
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Group</th><th>Particulars</th><th>Basis / note</th><th className="r">Amount ₹</th><th>Mode</th><th /></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i}>
                <td><select value={l.group} onChange={(e) => setLine(i, { group: e.target.value })}>{GROUPS.map((g) => <option key={g}>{g}</option>)}</select></td>
                <td><input value={l.particulars} onChange={(e) => setLine(i, { particulars: e.target.value })} /></td>
                <td><input value={l.basis ?? ""} onChange={(e) => setLine(i, { basis: e.target.value })} /></td>
                <td><input type="number" style={{ width: 120, textAlign: "right" }} value={l.amount} onChange={(e) => setLine(i, { amount: Number(e.target.value) })} /></td>
                <td><input value={l.mode ?? ""} onChange={(e) => setLine(i, { mode: e.target.value })} /></td>
                <td><button className="btn danger sm" onClick={() => setLines((x) => x.filter((_, j) => j !== i))}>×</button></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            {GROUPS.map((g) => <tr key={g}><td colSpan={3}>{g} subtotal</td><td className="r">{inr(subtotal(g))}</td><td colSpan={2} /></tr>)}
            <tr><td colSpan={3}>GRAND TOTAL</td><td className="r">{inr(total)}</td><td colSpan={2} /></tr>
          </tfoot>
        </table>
      </div>
      <div style={{ marginTop: 10 }}>
        <button className="btn secondary sm" onClick={() => setLines((l) => [...l, { group: GROUPS[3], particulars: "", amount: 0, mode: "Current / GPay" }])}>+ Add line</button>
      </div>
    </Modal>
  );
}

function getCustomerCopyRows(lines: InvoiceLine[], defaultDate: string) {
  const rows: { sno: number; particulars: string; date: string; amount: number; mode: string }[] = [];

  // 1. Sale Deed Expenses (Bundles CD, Scan, Computer, Stamp & Fees into one line)
  const saleDeedTotal = lines.filter((l) => l.group === "Sale Deed Expenses").reduce((sum, l) => sum + l.amount, 0);
  if (saleDeedTotal > 0) {
    const paid = lines.find((l) => l.group === "Sale Deed Expenses" && l.paidDate)?.paidDate || defaultDate;
    const mode = lines.find((l) => l.group === "Sale Deed Expenses" && l.mode)?.mode || "Current / GPay";
    rows.push({ sno: rows.length + 1, particulars: "Sale Deed Expenses", date: paid, amount: saleDeedTotal, mode });
  }

  // 2. Construction Cost (Bundles CD, Scan, Computer, Stamp & Fees into one line)
  const constTotal = lines.filter((l) => l.group === "Construction Cost").reduce((sum, l) => sum + l.amount, 0);
  if (constTotal > 0) {
    const paid = lines.find((l) => l.group === "Construction Cost" && l.paidDate)?.paidDate || defaultDate;
    const mode = lines.find((l) => l.group === "Construction Cost" && l.mode)?.mode || "Current / GPay";
    rows.push({ sno: rows.length + 1, particulars: "Construction Cost", date: paid, amount: constTotal, mode });
  }

  // 3. MOTD Fees Charges (Bundles MOTD Stamp, Fees, CD, Scan into one line)
  const motdTotal = lines.filter((l) => l.group === "MOTD Charges").reduce((sum, l) => sum + l.amount, 0);
  if (motdTotal > 0) {
    const paid = lines.find((l) => l.group === "MOTD Charges" && l.paidDate)?.paidDate || defaultDate;
    const mode = lines.find((l) => l.group === "MOTD Charges" && l.mode)?.mode || "Current / GPay";
    rows.push({ sno: rows.length + 1, particulars: "Motd Fees Charges", date: paid, amount: motdTotal, mode });
  }

  // 4. Other Charges (Individual clean heads: Legal, Valuer, Document Writer, Service Charges, etc.)
  lines
    .filter((l) => l.group === "Other Charges" && l.amount > 0)
    .forEach((l) => {
      rows.push({
        sno: rows.length + 1,
        particulars: l.particulars,
        date: l.paidDate || defaultDate,
        amount: l.amount,
        mode: l.mode || "Current / GPay",
      });
    });

  return rows;
}

function InvoicePreview({ id, initialMode = "customer", onClose }: { id: Id<"invoices">; initialMode?: "company" | "customer"; onClose: () => void }) {
  const data = useQuery(api.invoices.get, { id });
  const s = useQuery(api.settings.get);
  const [mode, setMode] = useState<"company" | "customer">(initialMode);
  const [signMode, setSignMode] = useState<"esign" | "physical">("esign");
  const [generating, setGenerating] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  if (!data) return null;
  const { invoice: inv, customer: c } = data;
  const addr = c?.currentAddress ?? {};
  const addrLine = [addr.doorNo, addr.villaFlat, addr.street, addr.village, addr.taluk, addr.district, addr.pin].filter(Boolean).join(", ");
  const filename = `Invoice-${inv.invoiceNo}-${(c?.name || "Customer").replace(/[\s\W]+/g, "-")}.pdf`;

  const handleDownloadPdf = async () => {
    if (!docRef.current) return;
    setGenerating(true);
    try {
      await downloadInvoicePdf(docRef.current, filename);
      toast.ok("PDF downloaded successfully!");
    } catch (e: any) {
      toast.err(e?.message || "Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handleWhatsAppPdf = async () => {
    if (!docRef.current) return;
    setGenerating(true);
    try {
      const res = await shareInvoicePdf(docRef.current, filename, c?.name ?? "Customer", inv.invoiceNo, c?.cell);
      if (res.method === "download_and_whatsapp") {
        toast.ok("PDF downloaded! Attach it in the opened WhatsApp chat.");
      } else if (res.method === "native") {
        toast.ok("Invoice PDF shared via WhatsApp!");
      }
    } catch (e: any) {
      toast.err(e?.message || "Failed to share PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyLink = () => {
    const viewUrl = `${window.location.origin}/view-invoice/${inv._id}`;
    navigator.clipboard.writeText(viewUrl);
    toast.ok("Invoice link copied to clipboard!");
  };

  const head = (
    <>
      <div className="meta">
        <div>Customer: <b>{c?.srNo}</b><br />Applicant: <b>{c?.name}</b><br />Type of Loan: <b>{c?.customerType ?? "Home Loan"}</b></div>
        <div style={{ textAlign: "right" }}>Invoice No: <b>{inv.invoiceNo}</b><br />Date: {fmtDate(inv.date)}<br />Property: <b>{inv.propertyType ?? "Old / New"}</b></div>
      </div>
      <table style={{ marginBottom: 8 }}>
        <tbody>
          <tr><td>Land cost</td><td className="r">{inr(inv.landCost)}</td><td>Total cost</td><td className="r">{inr(inv.landCost + inv.constructionCost)}</td></tr>
          <tr><td>Construction cost</td><td className="r">{inr(inv.constructionCost)}</td><td>Sanction amount</td><td className="r">{inr(inv.sanctionAmount)}</td></tr>
        </tbody>
      </table>
    </>
  );

  return (
    <Modal title={`Invoice ${inv.invoiceNo}`} onClose={onClose}
      actions={
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <div className="btn-group" style={{ display: "inline-flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--c-border)" }}>
            <button
              type="button"
              className={`btn sm ${mode === "company" ? "primary" : "secondary"}`}
              style={{ borderRadius: 0, fontWeight: mode === "company" ? "bold" : "normal" }}
              onClick={() => setMode("company")}
            >
              🏢 Company Copy
            </button>
            <button
              type="button"
              className={`btn sm ${mode === "customer" ? "primary" : "secondary"}`}
              style={{ borderRadius: 0, fontWeight: mode === "customer" ? "bold" : "normal" }}
              onClick={() => setMode("customer")}
            >
              👤 Customer Copy
            </button>
          </div>

          {mode === "customer" && (
            <div className="btn-group" style={{ display: "inline-flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--c-border)" }}>
              <button
                type="button"
                className={`btn sm ${signMode === "esign" ? "primary" : "secondary"}`}
                style={{ borderRadius: 0 }}
                title="Stamps the Director's e-signature for WhatsApp / digital sharing"
                onClick={() => setSignMode("esign")}
              >
                🖋️ e-Sign (WhatsApp)
              </button>
              <button
                type="button"
                className={`btn sm ${signMode === "physical" ? "primary" : "secondary"}`}
                style={{ borderRadius: 0 }}
                title="Leaves signature area blank for wet ink pen signature"
                onClick={() => setSignMode("physical")}
              >
                📝 Physical Print (Blank Sign)
              </button>
            </div>
          )}

          <button
            type="button"
            className="btn sm"
            disabled={generating}
            onClick={handleDownloadPdf}
            title="Download actual .pdf document to your computer"
          >
            📥 {generating ? "Generating…" : "Download PDF"}
          </button>

          <button
            type="button"
            className="btn secondary sm"
            disabled={generating}
            onClick={handleWhatsAppPdf}
            title="Share the actual PDF file directly to customer on WhatsApp"
            style={{ fontWeight: 600 }}
          >
            💬 WhatsApp PDF
          </button>

          <button
            type="button"
            className="btn secondary sm"
            onClick={() => window.print()}
            title={signMode === "esign" ? "Print or Save as PDF with verified e-Sign" : "Print physical copy (signature left blank for pen)"}
          >
            🖨️ Print
          </button>

          <button type="button" className="btn ghost sm" onClick={handleCopyLink} title="Copy public invoice link">
            🔗 Copy Link
          </button>
        </div>
      }>
      <div className="print-area">
        <div className="doc" ref={docRef}>
          <Letterhead title={mode === "company" ? "INVOICE (COMPANY COPY - DETAILED)" : "INVOICE (CUSTOMER COPY)"}>
            {head}
          </Letterhead>

          {mode === "company" ? (
            <table>
              <thead><tr><th>S.No</th><th>Particulars</th><th>Basis / Calculation</th><th className="r">Amount ₹</th><th>Mode</th></tr></thead>
              <tbody>
                {GROUPS.map((g, gi) => {
                  const ls = inv.lines.filter((l) => l.group === g);
                  if (!ls.length) return null;
                  return [
                    <tr key={g} className="grp"><td><b>{gi + 1}</b></td><td colSpan={4}><b>{g}</b></td></tr>,
                    ...ls.map((l, i) => (
                      <tr key={g + i}><td /><td>{l.particulars}</td><td>{l.basis}</td><td className="r">{l.amount.toLocaleString("en-IN")}</td><td>{l.mode}</td></tr>
                    )),
                    <tr key={g + "t"}><td /><td colSpan={2}><b>Total {g}</b></td><td className="r"><b>{ls.reduce((a, l) => a + l.amount, 0).toLocaleString("en-IN")}</b></td><td /></tr>,
                  ];
                })}
                <tr style={{ borderTop: "2px solid var(--c-primary-dark)" }}><td colSpan={3}><b>GRAND TOTAL</b></td><td className="r"><b>{inr(inv.total)}</b></td><td /></tr>
              </tbody>
            </table>
          ) : (
            <table>
              <thead><tr><th>S.No</th><th>Particulars</th><th>Date</th><th className="r">Amount in ₹</th><th>Mode Of Payment</th></tr></thead>
              <tbody>
                {getCustomerCopyRows(inv.lines, inv.date).map((row) => (
                  <tr key={row.sno}>
                    <td>{row.sno}</td>
                    <td><b>{row.particulars}</b></td>
                    <td>{fmtDate(row.date)}</td>
                    <td className="r"><b>{inr(row.amount)}</b></td>
                    <td>{row.mode}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "2px solid var(--c-primary-dark)" }}>
                  <td colSpan={3}><b>TOTAL</b></td>
                  <td className="r"><b>{inr(inv.total)}</b></td>
                  <td><b>Current / GPay</b></td>
                </tr>
              </tbody>
            </table>
          )}

          <div className="meta" style={{ marginTop: 14 }}>
            <div><b>Customer Details:</b><br />Mr. {c?.name}<br />{addrLine}</div>
            <div style={{ textAlign: "right" }}>
              <b>BANK DETAILS</b><br />ALL PAYMENT / NEFT / RTGS / GPAY<br />
              Bank: {s?.bankName}<br />Branch: {s?.bankBranch}<br />A/c no: {s?.bankAccountNo}<br />IFSC: {s?.bankIfsc}
            </div>
          </div>
          <div style={{ margin: "14px 0", padding: "10px", background: "var(--c-primary-light)", borderRadius: 6, fontSize: "0.85rem" }}>
            <b>SELF DECLARATION:</b><br />
            {s?.declaration ?? "I has been paid me to The above mentioned bank account for the purpose of the payment of expenses to be incurred at the bank, Sub registrar office Expenses , Document writer office, Sale deed charges, MOTD Charges, Construction Charges , Legal Fees Valuer Fees ,& Facility Charges on behalf of me"}
          </div>
          <SignBlock showESign={mode === "customer" && signMode === "esign"} />
        </div>
      </div>
    </Modal>
  );
}
