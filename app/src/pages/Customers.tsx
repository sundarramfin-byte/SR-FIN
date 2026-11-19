import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Badge, Empty, PageHead, useToast } from "../components/ui";
import { STATUSES } from "../lib/charges";

type Kind = "all" | "individual" | "company";

export const basePath = (type: string) => (type === "Self Employed" ? "/self-employed" : "/customer-sheet");

/** Customer Code List (all customers) and the two list views of the application sheets. */
export default function Customers({ kind, title }: { kind: Kind; title: string }) {
  const [params] = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const [search, setSearch] = useState(urlQ);
  const [status, setStatus] = useState(params.get("status") ?? "");

  const urlStatus = params.get("status") ?? "";
  useEffect(() => {
    setSearch(urlQ);
  }, [urlQ]);
  useEffect(() => {
    setStatus(urlStatus);
  }, [urlStatus]);
  const rows = useQuery(api.customers.list, { search: search || undefined });
  const setStatusM = useMutation(api.customers.setStatus);
  const nav = useNavigate();
  const toast = useToast();

  const shown = (rows ?? []).filter(
    (c) =>
      (kind === "all" || (kind === "company") === (c.customerType === "Self Employed")) &&
      (!status || c.status === status),
  );

  const newBase = kind === "company" ? "/self-employed" : "/customer-sheet";

  const intakeUrl = `${window.location.origin}/apply`;
  const copyIntake = () => {
    navigator.clipboard.writeText(intakeUrl);
    toast.ok(`Client form link copied: ${intakeUrl}`);
  };
  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      `Hello! Please fill out your loan application form at: ${intakeUrl} — SUNDAR RAM FIN CONSULTANCY [P] LTD`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <>
      <PageHead title={title}>
        <input className="search" placeholder="Search name / SR no / cell…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <button type="button" className="btn secondary" title="Copy client-facing application link" onClick={copyIntake}>
          🔗 Copy Client Link
        </button>
        <button type="button" className="btn secondary" title="Share form on WhatsApp" onClick={shareWhatsApp}>
          💬 WhatsApp
        </button>
        {kind === "all" ? (
          <>
            <button className="btn" onClick={() => nav("/customer-sheet/new")}>+ Customer</button>
            <button className="btn secondary" onClick={() => nav("/self-employed/new")}>+ Self Employed</button>
          </>
        ) : (
          <button className="btn" onClick={() => nav(`${newBase}/new`)}>+ New customer</button>
        )}
      </PageHead>

      <div className="table-wrap">
        <table className="t">
          <thead>
            <tr>
              <th>S.No</th><th>SR No</th><th>Customer name</th><th>Cell no</th><th>Type</th>
              <th>Referred by</th><th>Status</th><th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c, i) => (
              <tr key={c._id} className="click" onClick={() => nav(`${basePath(c.customerType)}/${c._id}`)}>
                <td>{i + 1}</td>
                <td>{c.srNo}</td>
                <td><b>{c.name}</b></td>
                <td>{c.cell}</td>
                <td>{c.customerType}</td>
                <td>{c.referredBy}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <select
                    value={c.status}
                    onChange={(e) =>
                      setStatusM({ id: c._id, status: e.target.value as (typeof STATUSES)[number] })
                        .then(() => toast.ok("Status updated"))
                        .catch(toast.err)
                    }
                  >
                    {STATUSES.map((s) => <option key={s}>{s}</option>)}
                  </select>{" "}
                  <Badge v={c.status} />
                </td>
                <td>{c.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows && shown.length === 0 && <Empty text="No customers yet. Click “+ New customer” to add the first one." />}
      </div>
    </>
  );
}
