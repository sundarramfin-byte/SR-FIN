import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Badge, Empty, Modal, PageHead, useToast } from "../components/ui";
import { STATUSES } from "../lib/charges";

const TYPES = ["Salaried", "NRI", "Self Employed"] as const;

/** One list for every customer – filter by type or stage instead of picking the right tab first. */
export default function Customers() {
  const [params] = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const urlStatus = params.get("status") ?? "";
  const [search, setSearch] = useState(urlQ);
  const [status, setStatus] = useState(urlStatus);
  const [type, setType] = useState(params.get("type") ?? "");
  const [choosing, setChoosing] = useState(false);

  useEffect(() => setSearch(urlQ), [urlQ]);
  useEffect(() => setStatus(urlStatus), [urlStatus]);

  const rows = useQuery(api.customers.list, { search: search || undefined });
  const nav = useNavigate();
  const toast = useToast();

  const byStatus = (rows ?? []).filter((c) => !status || c.status === status);
  const shown = byStatus.filter((c) => !type || c.customerType === type);
  const count = (t: string) => byStatus.filter((c) => !t || c.customerType === t).length;

  const intakeUrl = `${window.location.origin}/apply`;
  const copyIntake = () => {
    navigator.clipboard.writeText(intakeUrl);
    toast.ok(`Client form link copied: ${intakeUrl}`);
  };
  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello! Please fill out your loan application form at: ${intakeUrl} — SUNDAR RAM FIN CONSULTANCY [P] LTD`,
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <>
      <PageHead title="Customers">
        <input className="search" placeholder="Search name / SR no / cell…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All stages</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button type="button" className="btn secondary" title="Copy client-facing application link" onClick={copyIntake}>🔗 Client form link</button>
        <button type="button" className="btn secondary" title="Send the client form on WhatsApp" onClick={shareWhatsApp}>💬 WhatsApp</button>
        <button className="btn" onClick={() => setChoosing(true)}>+ New customer</button>
      </PageHead>

      <div className="chips no-print">
        {[["", "All"], ...TYPES.map((t) => [t, t])].map(([t, label]) => (
          <button key={t} type="button" className={type === t ? "on" : ""} onClick={() => setType(t)}>
            {label}<small>{count(t)}</small>
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr><th>SR No</th><th>Customer name</th><th>Cell no</th><th>Type</th><th>Stage</th><th>Referred by</th><th>Remarks</th></tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c._id} className="click" onClick={() => nav(`/customers/${c._id}`)}>
                <td>{c.srNo}</td>
                <td><b>{c.name}</b></td>
                <td>{c.cell}</td>
                <td>{c.customerType}</td>
                <td><Badge v={c.status} /></td>
                <td>{c.referredBy}</td>
                <td>{c.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows && shown.length === 0 && <Empty text="No customers found. Click “+ New customer” to add one." />}
      </div>

      {choosing && (
        <Modal title="New customer" onClose={() => setChoosing(false)}>
          <p className="hint" style={{ marginBottom: 14 }}>What kind of applicant is this? You can also send the client form link and let them fill it in.</p>
          <div className="type-choice">
            <button type="button" onClick={() => nav("/customers/new/individual")}>
              <b>Salaried / NRI</b><span>Individual applicant with a job, here or overseas</span>
            </button>
            <button type="button" onClick={() => nav("/customers/new/company")}>
              <b>Self Employed / Company</b><span>Business owner, firm or company with directors</span>
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
