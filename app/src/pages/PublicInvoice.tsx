import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Letterhead, SignBlock } from "../components/Letterhead";
import { fmtDate, inr } from "../lib/format";
import type { InvoiceLine } from "../lib/charges";
import { downloadInvoicePdf, shareInvoicePdf } from "../lib/pdf";

function getCustomerCopyRows(lines: InvoiceLine[], defaultDate: string) {
  const rows: { sno: number; particulars: string; date: string; amount: number; mode: string }[] = [];

  const saleDeedTotal = lines.filter((l) => l.group === "Sale Deed Expenses").reduce((sum, l) => sum + l.amount, 0);
  if (saleDeedTotal > 0) {
    const paid = lines.find((l) => l.group === "Sale Deed Expenses" && l.paidDate)?.paidDate || defaultDate;
    const mode = lines.find((l) => l.group === "Sale Deed Expenses" && l.mode)?.mode || "Current / GPay";
    rows.push({ sno: rows.length + 1, particulars: "Sale Deed Expenses", date: paid, amount: saleDeedTotal, mode });
  }

  const constTotal = lines.filter((l) => l.group === "Construction Cost").reduce((sum, l) => sum + l.amount, 0);
  if (constTotal > 0) {
    const paid = lines.find((l) => l.group === "Construction Cost" && l.paidDate)?.paidDate || defaultDate;
    const mode = lines.find((l) => l.group === "Construction Cost" && l.mode)?.mode || "Current / GPay";
    rows.push({ sno: rows.length + 1, particulars: "Construction Cost", date: paid, amount: constTotal, mode });
  }

  const motdTotal = lines.filter((l) => l.group === "MOTD Charges").reduce((sum, l) => sum + l.amount, 0);
  if (motdTotal > 0) {
    const paid = lines.find((l) => l.group === "MOTD Charges" && l.paidDate)?.paidDate || defaultDate;
    const mode = lines.find((l) => l.group === "MOTD Charges" && l.mode)?.mode || "Current / GPay";
    rows.push({ sno: rows.length + 1, particulars: "Motd Fees Charges", date: paid, amount: motdTotal, mode });
  }

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

export default function PublicInvoice() {
  const { id } = useParams<{ id: string }>();
  const [showESign, setShowESign] = useState(true);
  const [generating, setGenerating] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  const data = useQuery(api.invoices.get, id ? { id: id as Id<"invoices"> } : "skip");
  const s = useQuery(api.settings.get);

  if (!id || data === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f2f6f4" }}>
        <div className="card" style={{ maxWidth: 440, textAlign: "center", padding: 32 }}>
          <h2>Invoice Not Found</h2>
          <p style={{ color: "var(--c-text-muted)" }}>This invoice link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (data === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f2f6f4" }}>
        <div style={{ color: "var(--green-primary)", fontWeight: 600 }}>Loading official invoice…</div>
      </div>
    );
  }

  const { invoice: inv, customer: c } = data;
  const addr = c?.currentAddress ?? {};
  const addrLine = [addr.doorNo, addr.villaFlat, addr.street, addr.village, addr.taluk, addr.district, addr.pin]
    .filter(Boolean)
    .join(", ");
  const filename = `Invoice-${inv.invoiceNo}-${(c?.name || "Customer").replace(/[\s\W]+/g, "-")}.pdf`;

  const handleDownloadPdf = async () => {
    if (!docRef.current) return;
    setGenerating(true);
    try {
      await downloadInvoicePdf(docRef.current, filename);
    } catch (e: any) {
      alert("Failed to generate PDF: " + (e?.message || "Unknown error"));
    } finally {
      setGenerating(false);
    }
  };

  const handleShareWhatsAppPdf = async () => {
    if (!docRef.current) return;
    setGenerating(true);
    try {
      await shareInvoicePdf(docRef.current, filename, c?.name ?? "Customer", inv.invoiceNo, c?.cell);
    } catch (e: any) {
      alert("Failed to share PDF: " + (e?.message || "Unknown error"));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#dfe5e1", padding: "16px 8px 48px" }}>
      {/* Top Floating Control Bar (Hidden on print) */}
      <div
        className="no-print"
        style={{
          maxWidth: "210mm",
          margin: "0 auto 16px",
          background: "#fff",
          borderRadius: 8,
          boxShadow: "0 4px 18px rgba(6, 61, 48, 0.12)",
          padding: "12px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.png" alt="Logo" style={{ height: 32, width: "auto" }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.92rem", color: "var(--c-primary-dark)" }}>
              {inv.invoiceNo} – {c?.name}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--c-text-muted)" }}>
              Official Customer Invoice · {fmtDate(inv.date)}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: "0.82rem", cursor: "pointer", marginRight: 6 }}>
            <input
              type="checkbox"
              checked={showESign}
              onChange={(e) => setShowESign(e.target.checked)}
            />
            <span>Include e-Sign</span>
          </label>

          <button
            type="button"
            className="btn sm"
            disabled={generating}
            onClick={handleDownloadPdf}
            title="Download actual .pdf document file"
          >
            📥 {generating ? "Generating…" : "Download PDF"}
          </button>

          <button
            type="button"
            className="btn secondary sm"
            disabled={generating}
            onClick={handleShareWhatsAppPdf}
            title="Share PDF file to WhatsApp"
          >
            💬 WhatsApp PDF
          </button>

          <button
            type="button"
            className="btn secondary sm"
            onClick={() => window.print()}
            title="Print document"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div className="print-area" style={{ background: "transparent", padding: 0 }}>
        <div className="doc" ref={docRef}>
          <Letterhead title="INVOICE (CUSTOMER COPY)">
            <div className="meta">
              <div>
                Customer: <b>{c?.srNo}</b>
                <br />
                Applicant: <b>{c?.name}</b>
                <br />
                Type of Loan: <b>{c?.customerType ?? "Home Loan"}</b>
              </div>
              <div style={{ textAlign: "right" }}>
                Invoice No: <b>{inv.invoiceNo}</b>
                <br />
                Date: {fmtDate(inv.date)}
                <br />
                Property: <b>{inv.propertyType ?? "Old / New"}</b>
              </div>
            </div>

            <table style={{ marginBottom: 8 }}>
              <tbody>
                <tr>
                  <td>Land cost</td>
                  <td className="r">{inr(inv.landCost)}</td>
                  <td>Total cost</td>
                  <td className="r">{inr(inv.landCost + inv.constructionCost)}</td>
                </tr>
                <tr>
                  <td>Construction cost</td>
                  <td className="r">{inr(inv.constructionCost)}</td>
                  <td>Sanction amount</td>
                  <td className="r">{inr(inv.sanctionAmount)}</td>
                </tr>
              </tbody>
            </table>
          </Letterhead>

          <table>
            <thead>
              <tr>
                <th>S.No</th>
                <th>Particulars</th>
                <th>Date</th>
                <th className="r">Amount in ₹</th>
                <th>Mode Of Payment</th>
              </tr>
            </thead>
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

          <div className="meta" style={{ marginTop: 14 }}>
            <div>
              <b>Customer Details:</b>
              <br />
              Mr. {c?.name}
              <br />
              {addrLine}
            </div>
            <div style={{ textAlign: "right" }}>
              <b>BANK DETAILS</b>
              <br />
              ALL PAYMENT / NEFT / RTGS / GPAY
              <br />
              Bank: {s?.bankName}
              <br />
              Branch: {s?.bankBranch}
              <br />
              A/c no: {s?.bankAccountNo}
              <br />
              IFSC: {s?.bankIfsc}
            </div>
          </div>

          <div
            style={{
              margin: "14px 0",
              padding: "10px",
              background: "var(--c-primary-light)",
              borderRadius: 6,
              fontSize: "0.85rem",
            }}
          >
            <b>SELF DECLARATION:</b>
            <br />
            {s?.declaration ??
              "I has been paid me to The above mentioned bank account for the purpose of the payment of expenses to be incurred at the bank, Sub registrar office Expenses , Document writer office, Sale deed charges, MOTD Charges, Construction Charges , Legal Fees Valuer Fees ,& Facility Charges on behalf of me"}
          </div>

          <SignBlock showESign={showESign} />
        </div>
      </div>
    </div>
  );
}
