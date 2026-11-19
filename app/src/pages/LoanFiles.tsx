import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Fld, Modal, toNum, useToast } from "../components/ui";
import { CHANNELS, LOAN_TYPES } from "../lib/charges";
import { fmtDate, inr } from "../lib/format";

type LoanFile = Doc<"loanFiles">;
const CODE_FOR: Record<string, "sundarRamCode" | "thawaCode" | "andromedaCode"> = {
  "SUNDAR RAM FIN": "sundarRamCode",
  THAWA: "thawaCode",
  "ANDRO MEDA": "andromedaCode",
};

export default function LoanFiles({ customerId }: { customerId: Id<"customers"> }) {
  const files = useQuery(api.loanFiles.listByCustomer, { customerId });
  const remove = useMutation(api.loanFiles.remove);
  const toast = useToast();
  const [editing, setEditing] = useState<LoanFile | "new" | null>(null);

  return (
    <>
      <div className="table-wrap" style={{ marginBottom: 10 }}>
        <table className="t">
          <thead>
            <tr><th>Channel</th><th>Bank</th><th>File no</th><th>Loan type</th><th>Sanction</th><th>Disbursed</th><th /></tr>
          </thead>
          <tbody>
            {(files ?? []).map((f) => (
              <tr key={f._id}>
                <td>{f.channel}</td>
                <td>{f.bankName}</td>
                <td>{f.fileNo}</td>
                <td>{f.loanType}</td>
                <td className="r">{inr(f.sanctionAmount)} <span className="hint">{fmtDate(f.sanctionDate)}</span></td>
                <td className="r">{inr(f.disbursementAmount)} <span className="hint">{fmtDate(f.disbursementDate)}</span></td>
                <td className="r">
                  <button className="btn secondary sm" onClick={() => setEditing(f)}>Edit</button>{" "}
                  <button className="btn danger sm" onClick={() => confirm("Delete this loan file?") && remove({ id: f._id }).catch(toast.err)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {files?.length === 0 && <div className="empty">No loan files yet.</div>}
      </div>
      <button className="btn" onClick={() => setEditing("new")}>+ Add loan file</button>
      {editing && (
        <LoanFileModal customerId={customerId} file={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </>
  );
}

export function LoanFileModal({ customerId, file, onClose }: {
  customerId: Id<"customers">;
  file?: LoanFile;
  onClose: () => void;
}) {
  const banks = useQuery(api.banks.list) ?? [];
  const save = useMutation(api.loanFiles.save);
  const toast = useToast();
  const s = (x?: string | number) => (x === undefined ? "" : String(x));
  const [f, setF] = useState({
    channel: file?.channel ?? CHANNELS[0],
    bankId: (file?.bankId ?? "") as string,
    dsaCode: file?.dsaCode ?? "",
    clusterName: file?.clusterName ?? "",
    clusterEmail: file?.clusterEmail ?? "",
    clusterCell: file?.clusterCell ?? "",
    fileNo: file?.fileNo ?? "",
    branch: file?.branch ?? "",
    enquiryDate: file?.enquiryDate ?? "",
    enquiryAmount: s(file?.enquiryAmount),
    loginDate: file?.loginDate ?? "",
    sanctionDate: file?.sanctionDate ?? "",
    sanctionAmount: s(file?.sanctionAmount),
    disbursementDate: file?.disbursementDate ?? "",
    disbursementAmount: s(file?.disbursementAmount),
    landCost: s(file?.landCost),
    constructionCost: s(file?.constructionCost),
    tenureYears: s(file?.tenureYears),
    propertyType: file?.propertyType ?? "",
    loanType: file?.loanType ?? "Home Loan",
    remarks: file?.remarks ?? "",
  });
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }));

  // DSA code follows the bank + channel automatically
  function pick(channel: string, bankId: string) {
    const bank = banks.find((b) => b._id === bankId);
    const code = bank ? bank[CODE_FOR[channel]] : undefined;
    setF((x) => ({ ...x, channel, bankId, dsaCode: code ?? "" }));
  }

  const total = (toNum(f.landCost) ?? 0) + (toNum(f.constructionCost) ?? 0);

  async function submit() {
    try {
      const bank = banks.find((b) => b._id === f.bankId);
      await save({
        id: file?._id,
        customerId,
        channel: f.channel,
        bankId: bank?._id,
        bankName: bank?.name,
        dsaCode: f.dsaCode || undefined,
        clusterName: f.clusterName || undefined,
        clusterEmail: f.clusterEmail || undefined,
        clusterCell: f.clusterCell || undefined,
        fileNo: f.fileNo || undefined,
        branch: f.branch || undefined,
        enquiryDate: f.enquiryDate || undefined,
        enquiryAmount: toNum(f.enquiryAmount),
        loginDate: f.loginDate || undefined,
        sanctionDate: f.sanctionDate || undefined,
        sanctionAmount: toNum(f.sanctionAmount),
        disbursementDate: f.disbursementDate || undefined,
        disbursementAmount: toNum(f.disbursementAmount),
        landCost: toNum(f.landCost),
        constructionCost: toNum(f.constructionCost),
        tenureYears: toNum(f.tenureYears),
        propertyType: f.propertyType || undefined,
        loanType: f.loanType || undefined,
        remarks: f.remarks || undefined,
      });
      toast.ok("Loan file saved");
      onClose();
    } catch (e) {
      toast.err(e);
    }
  }

  const inp = (k: keyof typeof f, type = "text") => (
    <input type={type} value={f[k]} onChange={(e) => set(k, e.target.value)} />
  );

  return (
    <Modal title={file ? "Edit loan file" : "New loan file"} onClose={onClose}
      actions={<button className="btn secondary sm" onClick={submit}>Save</button>}>
      <div className="grid">
        <Fld label="DSA / Channel">
          <select value={f.channel} onChange={(e) => pick(e.target.value, f.bankId)}>
            {CHANNELS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </Fld>
        <Fld label="Bank name">
          <select value={f.bankId} onChange={(e) => pick(f.channel, e.target.value)}>
            <option value="">—</option>
            {banks.map((b) => <option key={b._id} value={b._id}>{b.name}</option>)}
          </select>
        </Fld>
        <Fld label="DSA code (auto)"><input value={f.dsaCode} onChange={(e) => set("dsaCode", e.target.value)} /></Fld>
        <Fld label="Cluster name">{inp("clusterName")}</Fld>
        <Fld label="Cluster email">{inp("clusterEmail", "email")}</Fld>
        <Fld label="Cluster cell no">{inp("clusterCell")}</Fld>
        <Fld label="File number / Reference no">{inp("fileNo")}</Fld>
        <Fld label="Branch">{inp("branch")}</Fld>
        <Fld label="Loan type">
          <select value={f.loanType} onChange={(e) => set("loanType", e.target.value)}>
            {LOAN_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Fld>
        <Fld label="Property type">
          <select value={f.propertyType} onChange={(e) => set("propertyType", e.target.value)}>
            <option value="">—</option><option>New</option><option>Old</option>
          </select>
        </Fld>
        <Fld label="Tenure (years)">{inp("tenureYears", "number")}</Fld>
        <Fld label="Enquiry date">{inp("enquiryDate", "date")}</Fld>
        <Fld label="Enquiry amount ₹">{inp("enquiryAmount", "number")}</Fld>
        <Fld label="Login date">{inp("loginDate", "date")}</Fld>
        <Fld label="Loan sanction date">{inp("sanctionDate", "date")}</Fld>
        <Fld label="Sanction amount ₹">{inp("sanctionAmount", "number")}</Fld>
        <Fld label="Disbursement date">{inp("disbursementDate", "date")}</Fld>
        <Fld label="Disbursement amount ₹">{inp("disbursementAmount", "number")}</Fld>
        <Fld label="Land cost ₹">{inp("landCost", "number")}</Fld>
        <Fld label="Construction cost ₹">{inp("constructionCost", "number")}</Fld>
        <Fld label="Total cost ₹ (auto)"><input readOnly className="computed" value={total ? total.toLocaleString("en-IN") : ""} /></Fld>
        <Fld label="Remarks" wide>{inp("remarks")}</Fld>
      </div>
      {toNum(f.sanctionAmount) !== undefined && toNum(f.enquiryAmount) !== undefined &&
        toNum(f.sanctionAmount)! > toNum(f.enquiryAmount)! && (
          <p className="warn">⚠ Sanction amount is higher than the enquiry amount.</p>
        )}
    </Modal>
  );
}
