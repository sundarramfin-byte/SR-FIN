import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { LoanFileCombobox } from "../components/CustomerCombobox";
import { Letterhead } from "../components/Letterhead";
import { Badge, Empty, Fld, Modal, PageHead, toNum, useToast } from "../components/ui";
import { amountInWords, fmtDate, inr, today } from "../lib/format";
import { CHANNELS, codeFor, PAYOUT_BANKS, THAWA_ADDRESS, THAWA_NAME } from "../lib/payoutBank";
import type { Channel } from "../lib/payoutBank";

type Gst = "NIL" | "CGST_SGST" | "IGST";
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Same maths as the server (convex/bankInvoices.ts) – shown live while typing. */
type OvKey = "payout" | "total" | "gst" | "tds" | "net";
function calc(disb: number, pct: number, insPayout: number, gst: Gst, ov: Partial<Record<OvKey, number>> = {}) {
  const payout = ov.payout ?? r2((disb * pct) / 100);
  const total = ov.total ?? r2(payout + insPayout);
  const g = ov.gst ?? (gst === "NIL" ? 0 : r2(total * 0.18));
  const tds = ov.tds ?? r2(total * 0.05);
  return { payout, total, gst: g, tds, net: ov.net ?? r2(total + g - tds) };
}

export default function BankInvoices() {
  const list = useQuery(api.bankInvoices.list);
  const setStatus = useMutation(api.bankInvoices.setStatus);
  const [editing, setEditing] = useState<Channel | null>(null);
  const [activeTab, setActiveTab] = useState<"All" | Channel>("All");
  const [view, setView] = useState<NonNullable<typeof list>[number] | null>(null);
  const [params, setParams] = useSearchParams();
  const statusFilter = params.get("status");
  const toast = useToast();

  const filtered = (list ?? []).filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (activeTab === "All") return true;
    return (b.channel ?? "Direct Bank") === activeTab;
  });

  return (
    <>
      <PageHead title="Bank Invoice (Payouts)">
        <div className="btn-group" style={{ display: "inline-flex", borderRadius: 6, overflow: "hidden", border: "1px solid var(--c-border)", marginRight: 8 }}>
          <button
            type="button"
            className={`btn sm ${activeTab === "All" ? "primary" : "secondary"}`}
            style={{ borderRadius: 0 }}
            onClick={() => setActiveTab("All")}
          >
            All
          </button>
          <button
            type="button"
            className={`btn sm ${activeTab === "Direct Bank" ? "primary" : "secondary"}`}
            style={{ borderRadius: 0 }}
            onClick={() => setActiveTab("Direct Bank")}
          >
            🏦 Direct Bank
          </button>
          <button
            type="button"
            className={`btn sm ${activeTab === "THAWA" ? "primary" : "secondary"}`}
            style={{ borderRadius: 0 }}
            onClick={() => setActiveTab("THAWA")}
          >
            ⚡ Thawa
          </button>
        </div>
        <button className="btn" onClick={() => setEditing("Direct Bank")}>+ Direct Bank Invoice</button>
        <button className="btn secondary" onClick={() => setEditing("THAWA")}>+ Thawa Invoice</button>
      </PageHead>
      {statusFilter && (
        <p className="hint" style={{ marginBottom: 8 }}>
          Showing <b>{statusFilter}</b> invoices only.{" "}
          <button type="button" className="btn ghost sm" onClick={() => setParams({})}>Show all</button>
        </p>
      )}
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>Invoice no</th><th>Channel</th><th>Date</th><th>Month</th><th>To</th><th>Borrower</th><th className="r">Disbursal</th><th className="r">Payout</th><th className="r">TDS</th><th className="r">Net</th><th>Status</th><th /></tr></thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b._id}>
                <td><b>{b.invoiceNo}</b></td>
                <td><span className="badge" style={{ fontSize: "0.75rem" }}>{b.channel ?? "Direct Bank"}</span></td>
                <td>{fmtDate(b.date)}</td>
                <td>{b.month}</td>
                <td>{b.toEntity}</td>
                <td>{b.borrower}</td>
                <td className="r">{inr(b.disbursalAmount)}</td>
                <td className="r">{inr(b.totalPayout)}</td>
                <td className="r">{inr(b.tdsAmount)}</td>
                <td className="r"><b>{inr(b.netAmount)}</b></td>
                <td><Badge v={b.status} /></td>
                <td className="r">
                  <button className="btn secondary sm" onClick={() => setView(b)}>View / Print</button>{" "}
                  <button className="btn sm" onClick={() => setStatus({ id: b._id, status: b.status === "Raised" ? "Received" : "Raised" }).catch(toast.err)}>
                    {b.status === "Raised" ? "Mark received" : "Reopen"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <Empty text="No payout invoices yet." />}
      </div>
      {editing && <Editor defaultChannel={editing} onClose={() => setEditing(null)} />}
      {view && <Preview b={view} onClose={() => setView(null)} />}
    </>
  );
}

function Editor({ defaultChannel = "Direct Bank", onClose }: { defaultChannel?: Channel; onClose: () => void }) {
  const files = useQuery(api.loanFiles.listAll) ?? [];
  const banks = useQuery(api.banks.list) ?? [];
  const settings = useQuery(api.settings.get);
  const create = useMutation(api.bankInvoices.create);
  const toast = useToast();

  const [channel, setChannel] = useState<Channel>(defaultChannel);
  const [selectedBankId, setSelectedBankId] = useState("");
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(today().slice(0, 7));
  const [toEntity, setTo] = useState(defaultTo(defaultChannel));
  const [toAddress, setAddr] = useState(defaultChannel === "THAWA" ? THAWA_ADDRESS : "");
  const [fileId, setFileId] = useState("");
  const [borrower, setBorrower] = useState("");
  const [product, setProduct] = useState("Home Loan");
  const [disbDate, setDisbDate] = useState("");
  const [disb, setDisb] = useState("");
  const [pct, setPct] = useState(defaultChannel === "THAWA" ? "0.9" : "");
  const [ins, setIns] = useState("");
  const [insPayout, setInsPayout] = useState("");
  const [gst, setGst] = useState<Gst>("NIL");
  // sheet header block (auto-filled, still editable)
  const [dsaName, setDsaName] = useState("");
  const [contactNo, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [dsaCode, setDsaCode] = useState("");
  const [clusterName, setCluster] = useState("Ram");
  const [region, setRegion] = useState("CHENNAI");
  const [dirty, setDirty] = useState<Record<string, boolean>>({});

  function defaultTo(ch: Channel) {
    return ch === "THAWA" ? THAWA_NAME : "";
  }

  // DSA name / contact / email come from company Settings
  useEffect(() => {
    if (!settings) return;
    if (!dirty.dsaName) setDsaName(settings.directorName ?? "");
    if (!dirty.contactNo) setContact(settings.phone ?? "");
    if (!dirty.email) setEmail(settings.email ?? "");
  }, [settings, dirty]);

  // Channel DSA code follows the selected bank + channel
  useEffect(() => {
    if (dirty.dsaCode) return;
    setDsaCode(codeFor(channel, banks.find((b) => b._id === selectedBankId)));
  }, [channel, selectedBankId, banks, dirty.dsaCode]);

  const mark = (k: string) => setDirty((d) => ({ ...d, [k]: true }));

  function handleChannelSwitch(ch: Channel) {
    setChannel(ch);
    if (ch === "THAWA") {
      setTo(THAWA_NAME);
      setAddr(THAWA_ADDRESS);
      if (!pct) setPct("0.9");
    } else {
      setTo(selectedBankId ? banks.find((b) => b._id === selectedBankId)?.name ?? "" : "");
      setAddr("");
    }
  }

  function pickFile(id: string) {
    setFileId(id);
    const f = files.find((x) => x._id === id);
    if (!f) return;
    setBorrower(f.customerName);
    setProduct(f.loanType ?? "Home Loan");
    setDisbDate(f.disbursementDate ?? "");
    setDisb(String(f.disbursementAmount ?? ""));
    if (f.clusterName && !dirty.clusterName) setCluster(f.clusterName);
    if (f.bankId) {
      setSelectedBankId(f.bankId);
      if (channel === "Direct Bank") setTo(f.bankName ?? "");
      const bank = banks.find((b) => b._id === f.bankId);
      if (bank?.payoutPercent !== undefined) setPct(String(bank.payoutPercent));
    }
  }

  function handleBankSelect(bId: string) {
    setSelectedBankId(bId);
    const bank = banks.find((b) => b._id === bId);
    if (bank) {
      if (channel === "Direct Bank") setTo(bank.name);
      if (bank.payoutPercent !== undefined) setPct(String(bank.payoutPercent));
    }
  }

  // manual overrides for the calculated amounts (blank = auto)
  const [ovText, setOvText] = useState<Partial<Record<OvKey, string>>>({});
  const ov: Partial<Record<OvKey, number>> = {};
  (Object.keys(ovText) as OvKey[]).forEach((k) => {
    const n = toNum(ovText[k] ?? "");
    if (n !== undefined) ov[k] = n;
  });
  const c = calc(toNum(disb) ?? 0, toNum(pct) ?? 0, toNum(insPayout) ?? 0, gst, ov);
  const setOv = (k: OvKey, v: string) => setOvText((o) => ({ ...o, [k]: v }));
  const clearOv = (k: OvKey) => setOvText((o) => { const n = { ...o }; delete n[k]; return n; });

  async function save() {
    try {
      const selectedBank = banks.find((b) => b._id === selectedBankId);
      const pb = PAYOUT_BANKS[channel];
      const payoutBankDetails = `${pb.bankName} | ${pb.type} A/C: ${pb.accountNo} | ${pb.branch} | IFSC: ${pb.ifsc}`;

      await create({
        date,
        month,
        channel,
        bankName: selectedBank?.name,
        payoutBankDetails,
        dsaName: dsaName || undefined,
        contactNo: contactNo || undefined,
        email: email || undefined,
        dsaCode: dsaCode || undefined,
        clusterName: clusterName || undefined,
        region: region || undefined,
        toEntity: toEntity || defaultTo(channel) || "Bank",
        toAddress: toAddress || undefined,
        loanFileId: (fileId || undefined) as Id<"loanFiles"> | undefined,
        borrower,
        product,
        disbursalDate: disbDate || undefined,
        disbursalAmount: toNum(disb) ?? 0,
        payoutPercent: toNum(pct) ?? 0,
        insuranceAmount: toNum(ins) ?? 0,
        insurancePayout: toNum(insPayout) ?? 0,
        payoutAmount: c.payout,
        totalPayout: c.total,
        gstAmount: c.gst,
        tdsAmount: c.tds,
        netAmount: c.net,
        gstMode: gst,
      });
      toast.ok("Payout invoice saved");
      onClose();
    } catch (e) {
      toast.err(e);
    }
  }

  return (
    <Modal
      title={channel === "THAWA" ? "New Thawa Payout Invoice" : "New Direct Bank Payout Invoice"}
      onClose={onClose}
      actions={<button className="btn secondary sm" onClick={save}>Save Invoice</button>}
    >
      <div style={{ marginBottom: 16 }}>
        <span className="lbl" style={{ display: "block", marginBottom: 6 }}>Invoice Option:</span>
        <div className="btn-group" style={{ display: "flex", gap: 8 }}>
          {CHANNELS.map((ch) => (
            <button
              key={ch}
              type="button"
              className={`btn ${channel === ch ? "primary" : "secondary"}`}
              style={{ flex: 1 }}
              onClick={() => handleChannelSwitch(ch)}
            >
              {ch === "Direct Bank" ? "🏦 Direct Bank" : "⚡ Thawa Financial Service"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid">
        <Fld label="Loan file (Type borrower or file no)">
          <LoanFileCombobox
            value={fileId}
            onChange={(fid) => pickFile(fid)}
            files={files}
            placeholder="Type borrower name, SR no, file no..."
          />
        </Fld>

        <Fld label="Bank Name (Dropdown of all banks)">
          <select value={selectedBankId} onChange={(e) => handleBankSelect(e.target.value)}>
            <option value="">— Select Bank —</option>
            {banks.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </Fld>

        <Fld label="Invoice date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Fld>
        <Fld label="Business month (YYYY-MM)"><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></Fld>
        <Fld label="DSA name"><input value={dsaName} onChange={(e) => { setDsaName(e.target.value); mark("dsaName"); }} /></Fld>
        <Fld label="Contact no"><input value={contactNo} onChange={(e) => { setContact(e.target.value); mark("contactNo"); }} /></Fld>
        <Fld label="Email ID"><input value={email} onChange={(e) => { setEmail(e.target.value); mark("email"); }} /></Fld>
        <Fld label="Channel DSA code (auto from bank)"><input value={dsaCode} onChange={(e) => { setDsaCode(e.target.value); mark("dsaCode"); }} /></Fld>
        <Fld label="Cluster name"><input value={clusterName} onChange={(e) => { setCluster(e.target.value); mark("clusterName"); }} /></Fld>
        <Fld label="Region name / place"><input value={region} onChange={(e) => setRegion(e.target.value)} /></Fld>
        <Fld label="Billed To"><input value={toEntity} onChange={(e) => setTo(e.target.value)} /></Fld>
        <Fld label="Recipient Address" wide><input value={toAddress} onChange={(e) => setAddr(e.target.value)} /></Fld>
        <Fld label="Name of the Borrower"><input value={borrower} onChange={(e) => setBorrower(e.target.value)} /></Fld>
        <Fld label="Product"><input value={product} onChange={(e) => setProduct(e.target.value)} /></Fld>
        <Fld label="Disbursal date"><input type="date" value={disbDate} onChange={(e) => setDisbDate(e.target.value)} /></Fld>
        <Fld label="Disbursal amount ₹"><input type="number" value={disb} onChange={(e) => setDisb(e.target.value)} /></Fld>
        <Fld label="Payout %"><input type="number" step="0.01" value={pct} onChange={(e) => setPct(e.target.value)} /></Fld>
        <Fld label="Insurance disbursal ₹"><input type="number" value={ins} onChange={(e) => setIns(e.target.value)} /></Fld>
        <Fld label="Insurance payout ₹"><input type="number" value={insPayout} onChange={(e) => setInsPayout(e.target.value)} /></Fld>
        <Fld label="GST">
          <select value={gst} onChange={(e) => setGst(e.target.value as Gst)}>
            <option value="NIL">NIL</option><option value="CGST_SGST">CGST 9% + SGST 9%</option><option value="IGST">IGST 18%</option>
          </select>
        </Fld>
      </div>

      <p className="hint" style={{ marginTop: 14 }}>These amounts are calculated automatically — click any amount to type your own value.</p>
      <table className="t">
        <tbody>
          <tr>
            <td>Payout amount</td>
            <td className="r" style={{ width: 260 }}>
              <input
                type="number"
                step="0.01"
                style={{ textAlign: "right", fontWeight: 400 }}
                value={ovText.payout ?? String(c.payout)}
                onChange={(e) => setOv("payout", e.target.value)}
              />
              {ovText.payout !== undefined && <button type="button" className="btn ghost sm" onClick={() => clearOv("payout")}>Reset</button>}
            </td>
          </tr>
          <tr>
            <td>DSA payout total</td>
            <td className="r" style={{ width: 260 }}>
              <input
                type="number"
                step="0.01"
                style={{ textAlign: "right", fontWeight: 400 }}
                value={ovText.total ?? String(c.total)}
                onChange={(e) => setOv("total", e.target.value)}
              />
              {ovText.total !== undefined && <button type="button" className="btn ghost sm" onClick={() => clearOv("total")}>Reset</button>}
            </td>
          </tr>
          <tr>
            <td>GST</td>
            <td className="r" style={{ width: 260 }}>
              <input
                type="number"
                step="0.01"
                style={{ textAlign: "right", fontWeight: 400 }}
                value={ovText.gst ?? String(c.gst)}
                onChange={(e) => setOv("gst", e.target.value)}
              />
              {ovText.gst !== undefined && <button type="button" className="btn ghost sm" onClick={() => clearOv("gst")}>Reset</button>}
            </td>
          </tr>
          <tr>
            <td>TDS 5%</td>
            <td className="r" style={{ width: 260 }}>
              <input
                type="number"
                step="0.01"
                style={{ textAlign: "right", fontWeight: 400 }}
                value={ovText.tds ?? String(c.tds)}
                onChange={(e) => setOv("tds", e.target.value)}
              />
              {ovText.tds !== undefined && <button type="button" className="btn ghost sm" onClick={() => clearOv("tds")}>Reset</button>}
            </td>
          </tr>
          <tr>
            <td><b>DSA net amount</b></td>
            <td className="r" style={{ width: 260 }}>
              <input
                type="number"
                step="0.01"
                style={{ textAlign: "right", fontWeight: 700 }}
                value={ovText.net ?? String(c.net)}
                onChange={(e) => setOv("net", e.target.value)}
              />
              {ovText.net !== undefined && <button type="button" className="btn ghost sm" onClick={() => clearOv("net")}>Reset</button>}
            </td>
          </tr>
        </tbody>
      </table>
    </Modal>
  );
}

function Preview({ b, onClose }: { b: NonNullable<ReturnType<typeof useQuery<typeof api.bankInvoices.list>>>[number]; onClose: () => void }) {
  const s = useQuery(api.settings.get);
  const row = (k: string, v: string | number | undefined) => <tr><td>{k}</td><td>{v}</td></tr>;
  const gstLabel = b.gstMode === "NIL" ? "NIL" : inr(b.gstAmount);
  const ch = (b.channel ?? "Direct Bank") as Channel;
  const pb = PAYOUT_BANKS[ch] ?? PAYOUT_BANKS["Direct Bank"];
  const signer = ch === "THAWA" ? THAWA_NAME : (s?.companyName ?? "SUNDAR RAM FIN CONSULTANCY [P] LTD");

  return (
    <Modal title={`${b.invoiceNo} (${b.channel ?? "Direct Bank"})`} onClose={onClose} actions={<button className="btn secondary sm" onClick={() => window.print()}>Print / Save PDF</button>}>
      <div className="print-area">
        <div className="doc">
          <Letterhead title="LOAN SANCTION & DISBURSEMENT REPORT" />
          <table>
            <tbody>
              {row("INVOICE NO", b.invoiceNo)}
              {row("INVOICE DATE", fmtDate(b.date))}
              {row("BUSINESS FOR THE MONTH OF", b.month)}
              {row("BANK NAME", b.bankName || "—")}
              {row("DSA Name", b.dsaName ?? s?.directorName ?? "")}
              {row("Contact No", b.contactNo ?? s?.phone ?? "")}
              {row("Email ID", b.email ?? s?.email ?? "")}
              {row("CHANNEL DSA CODE", b.dsaCode ?? "")}
              {row("CLUSTER NAME", b.clusterName ?? "")}
              {row("REGION NAME / PLACE", b.region ?? "CHENNAI")}
              {row("To", `${b.toEntity} ${b.toAddress ?? ""}`)}
              {row("NAME OF THE BORROWER", b.borrower)}
              {row("PRODUCT", b.product)}
              {row("DISBURSAL DATE", fmtDate(b.disbursalDate))}
              {row("DISBURSAL AMOUNT", inr(b.disbursalAmount))}
              {row(`PAYOUT AMOUNT @ ${b.payoutPercent}%`, inr(b.payoutAmount))}
              {row("DISBURSAL INSURANCE AMOUNT", b.insuranceAmount ? inr(b.insuranceAmount) : "NIL")}
              {row("PAYOUT INSURANCE AMOUNT", b.insurancePayout ? inr(b.insurancePayout) : "NIL")}
              {row("DSA PAYOUT TOTAL", inr(b.totalPayout))}
              {row("CGST 9%", b.gstMode === "CGST_SGST" ? inr(b.gstAmount / 2) : "NIL")}
              {row("SGST 9%", b.gstMode === "CGST_SGST" ? inr(b.gstAmount / 2) : "NIL")}
              {row("IGST 18%", b.gstMode === "IGST" ? gstLabel : "NIL")}
              {row("TDS 5%", inr(b.tdsAmount))}
              <tr><td><b>DSA NET AMOUNT</b></td><td><b>{inr(b.netAmount)}</b></td></tr>
              {row("AMOUNT IN WORDS", amountInWords(b.netAmount))}
              {row("PAN NO", "ABKCS9433P")}
              {row("GST/SGST NO", "NILL")}
              <tr><td colSpan={2}><b>BANK DETAILS</b></td></tr>
              {row("BANK NAME", pb.bankName)}
              {row("TYPE OF ACCOUNT", pb.type)}
              {row("BRANCH", pb.branch)}
              {row("ACCOUNT NO", pb.accountNo)}
              {row("IFSC CODE", pb.ifsc)}
            </tbody>
          </table>
          <div className="sign" style={{ marginTop: "auto", paddingTop: "28px" }}>
            <div />
            <div style={{ textAlign: "right" }}>
              <div>{signer}</div>
              <div style={{ marginTop: 32 }}>AUTHORIZED SIGNATORY</div>
              <div>[ {s?.directorName ?? "B.S. KANNAN"} ]</div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
