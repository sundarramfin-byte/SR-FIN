import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Badge, Fld, PageHead, useToast } from "../components/ui";
import { REFERRERS } from "../lib/charges";
import { ageFrom } from "../lib/format";
import * as C from "../lib/formConfig";
import type { FieldDef } from "../lib/formConfig";
import LoanFiles from "./LoanFiles";

type Sec = Record<string, string>;
type CType = "Salaried" | "Self Employed" | "NRI";

function Grid({ fields, value, onChange }: { fields: FieldDef[]; value: Sec; onChange: (v: Sec) => void }) {
  const set = (k: string, val: string) => {
    const next = { ...value, [k]: val };
    if (k === "dob") next.age = ageFrom(val);
    if (k === "incorporationDate") next.yearsInBusiness = ageFrom(val);
    onChange(next);
  };
  return (
    <div className="grid">
      {fields.map((fd) => (
        <Fld key={fd.key} label={fd.label} wide={fd.wide}>
          {fd.type === "select" ? (
            <select value={value[fd.key] ?? ""} onChange={(e) => set(fd.key, e.target.value)}>
              <option value="">—</option>
              {fd.options!.map((o) => <option key={o}>{o}</option>)}
            </select>
          ) : fd.type === "textarea" ? (
            <textarea value={value[fd.key] ?? ""} onChange={(e) => set(fd.key, e.target.value)} />
          ) : (
            <input
              className={fd.type === "computed" ? "computed" : ""}
              readOnly={fd.type === "computed"}
              type={fd.type === "date" ? "date" : fd.type === "number" ? "number" : "text"}
              value={value[fd.key] ?? ""}
              onChange={(e) => set(fd.key, e.target.value)}
            />
          )}
        </Fld>
      ))}
    </div>
  );
}

function ListSection({ title, fields, items, onChange, max, addLabel }: {
  title: string;
  fields: FieldDef[];
  items: Sec[];
  onChange: (v: Sec[]) => void;
  max?: number;
  addLabel: string;
}) {
  return (
    <>
      {items.map((it, i) => (
        <div key={i} style={{ marginBottom: 14, paddingBottom: 10, borderBottom: "1px dashed var(--c-border)" }}>
          <div className="row" style={{ marginBottom: 8 }}>
            <h3>{title} {i + 1}</h3>
            <button type="button" className="btn danger sm" onClick={() => onChange(items.filter((_, j) => j !== i))}>Remove</button>
          </div>
          <Grid fields={fields} value={it} onChange={(v) => onChange(items.map((x, j) => (j === i ? v : x)))} />
        </div>
      ))}
      {(!max || items.length < max) && (
        <button type="button" className="btn secondary sm" onClick={() => onChange([...items, {}])}>+ {addLabel}</button>
      )}
    </>
  );
}

const clean = (s: Sec) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== ""));
const cleanList = (l: Sec[]) => l.map(clean).filter((x) => Object.keys(x).length > 0);

export default function CustomerForm({ company, embedded }: { company: boolean; embedded?: boolean }) {
  const { id } = useParams();
  const isNew = !id || id === "new";
  const nav = useNavigate();
  const toast = useToast();
  const data = useQuery(api.customers.get, isNew ? "skip" : { id: id as Id<"customers"> });
  const create = useMutation(api.customers.create);
  const update = useMutation(api.customers.update);

  const [name, setName] = useState("");
  const [cell, setCell] = useState("");
  const [type, setType] = useState<CType>(company ? "Self Employed" : "Salaried");
  const [referredBy, setReferredBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [applicant, setApplicant] = useState<Sec>({});
  const [currentAddress, setCurrent] = useState<Sec>({});
  const [permanentAddress, setPermanent] = useState<Sec>({});
  const [employment, setEmployment] = useState<Sec>({});
  const [companyD, setCompany] = useState<Sec>({});
  const [nriOffice, setNri] = useState<Sec>({});
  const [property, setProperty] = useState<Sec>({});
  const [coApplicants, setCo] = useState<Sec[]>([]);
  const [directors, setDirectors] = useState<Sec[]>([]);
  const [references, setRefs] = useState<Sec[]>([]);
  const [officeDetails, setOffice] = useState<Sec>({});
  const [coEmployment, setCoEmp] = useState<Sec>({});
  const [loanRequirement, setLoanReq] = useState<Sec>({});
  const [existingLoans, setLoans] = useState<Sec[]>([]);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(isNew);

  useEffect(() => {
    if (!data || loaded) return;
    const c = data.customer;
    setName(c.name); setCell(c.cell); setType(c.customerType); setReferredBy(c.referredBy ?? "");
    setRemarks(c.remarks ?? ""); setApplicant(c.applicant ?? {}); setCurrent(c.currentAddress ?? {});
    setPermanent(c.permanentAddress ?? {}); setEmployment(c.employment ?? {}); setCompany(c.company ?? {});
    setNri(c.nriOffice ?? {}); setProperty(c.property ?? {}); setCo(c.coApplicants ?? []);
    setDirectors(c.directors ?? []); setRefs(c.references ?? []);
    setOffice(c.officeDetails ?? {}); setCoEmp(c.coEmployment ?? {});
    setLoanReq(c.loanRequirement ?? {}); setLoans(c.existingLoans ?? []);
    setLoaded(true);
  }, [data, loaded]);

  const dup = useQuery(api.customers.findByCell, cell.length === 10 ? { cell } : "skip");
  const duplicates = (dup ?? []).filter((d) => d._id !== id);

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name, cell: cell.replace(/\s/g, ""), customerType: type,
        referredBy: referredBy || undefined, remarks: remarks || undefined,
        applicant: clean(applicant),
        currentAddress: clean(currentAddress),
        permanentAddress: clean(permanentAddress),
        employment: company ? undefined : clean(employment),
        company: company ? clean(companyD) : undefined,
        officeDetails: company ? clean(officeDetails) : undefined,
        coEmployment: company ? clean(coEmployment) : undefined,
        loanRequirement: clean(loanRequirement),
        existingLoans: cleanList(existingLoans),
        property: clean(property),
        coApplicants: cleanList(coApplicants),
        directors: company ? cleanList(directors) : undefined,
        references: cleanList(references),
      };
      if (isNew) {
        const newId = await create(payload);
        toast.ok("Customer saved");
        nav(`/customers/${newId}`, { replace: true });
      } else {
        await update({ id: id as Id<"customers">, ...payload });
        toast.ok("Changes saved");
      }
    } catch (e) {
      toast.err(e);
    } finally {
      setSaving(false);
    }
  }

  if (!isNew && data === undefined) return <div className="empty">Loading…</div>;
  if (!isNew && data === null) return <div className="empty">Customer not found.</div>;

  const sections = [
    ["basic", "Customer"],
    ["applicant", "Applicant"], ["current", "Current address"], ["permanent", "Permanent address"],
    ...(company
      ? [["company", "Business details"], ["office", "Office details"], ["coemp", "Co-applicant employment"], ["directors", "Directors"]]
      : [["employment", type === "NRI" ? "Employment (overseas)" : "Employment"]]),
    ["coapp", "Co-applicants"],
    ["loanreq", "Loan requirement"], ["existing", "Existing loans"],
    ["refs", "References"], ["property", "Property"],
    ...(embedded ? [] : [["loans", "Loan files"]]),
  ];

  return (
    <>
      <PageHead title={embedded ? "Application details" : isNew ? (company ? "New Self Employed customer" : "New customer") : name}>
        {!embedded && !isNew && data && <><span className="hint">{data.customer.srNo}</span><Badge v={data.customer.status} /></>}
        {!embedded && <button className="btn ghost" onClick={() => nav("/customers")}>← Back to list</button>}
        <button className="btn" disabled={saving} onClick={save}>{saving ? "Saving…" : isNew ? "Submit" : "Save changes"}</button>
      </PageHead>

      <div className="sticky-nav no-print">
        {sections.map(([k, l]) => <a key={k} href={`#sec-${k}`} onClick={(e) => { e.preventDefault(); document.getElementById(`sec-${k}`)?.scrollIntoView({ behavior: "smooth" }); }}>{l}</a>)}
      </div>

      <div className="card" id="sec-basic">
        <h2 style={{ marginBottom: 12 }}>Customer</h2>
        <div className="grid">
          {!isNew && data && <Fld label="SR No"><input readOnly className="computed" value={data.customer.srNo} /></Fld>}
          <Fld label={company ? "Applicant name [Company name]" : "Applicant name"}>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </Fld>
          <Fld label="Contact no">
            <input inputMode="numeric" maxLength={10} value={cell} onChange={(e) => setCell(e.target.value.replace(/\D/g, ""))} />
          </Fld>
          <Fld label="Type of customer">
            {company ? <input readOnly className="computed" value="Self Employed" /> : (
              <select value={type} onChange={(e) => setType(e.target.value as CType)}>
                <option>Salaried</option><option>NRI</option>
              </select>
            )}
          </Fld>
          <Fld label="Referred by">
            <select value={referredBy} onChange={(e) => setReferredBy(e.target.value)}>
              <option value="">—</option>{REFERRERS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </Fld>
          <Fld label="Remarks" wide><input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></Fld>
        </div>
        {duplicates.length > 0 && (
          <p className="warn">⚠ This cell number is already used by: {duplicates.map((d) => `${d.srNo} ${d.name}`).join(", ")}</p>
        )}
      </div>

      <div className="card" id="sec-applicant"><h2 style={{ marginBottom: 12 }}>Applicant</h2>
        <Grid fields={C.applicantFields} value={applicant} onChange={setApplicant} /></div>
      <div className="card" id="sec-current"><h2 style={{ marginBottom: 12 }}>Current address</h2>
        <Grid fields={C.currentAddressFields} value={currentAddress} onChange={setCurrent} /></div>
      <div className="card" id="sec-permanent">
        <div className="row" style={{ marginBottom: 12 }}>
          <h2>Permanent address</h2>
          <button type="button" className="btn secondary sm" onClick={() => setPermanent({ ...currentAddress })}>Same as current address</button>
        </div>
        <Grid fields={C.permanentAddressFields} value={permanentAddress} onChange={setPermanent} /></div>
      {company ? (
        <>
          <div className="card" id="sec-company"><h2 style={{ marginBottom: 12 }}>Business details</h2>
            <Grid fields={C.companyFields} value={companyD} onChange={setCompany} /></div>
          <div className="card" id="sec-office"><h2 style={{ marginBottom: 12 }}>Office / Business details</h2>
            <Grid fields={C.officeBusinessFields} value={officeDetails} onChange={setOffice} /></div>
          <div className="card" id="sec-coemp"><h2 style={{ marginBottom: 12 }}>Employment / Business details (Co-applicant)</h2>
            <Grid fields={C.coEmploymentFields} value={coEmployment} onChange={setCoEmp} /></div>
          <div className="card" id="sec-directors"><h2 style={{ marginBottom: 12 }}>Directors</h2>
            <ListSection title="Director" fields={C.directorFields} items={directors} onChange={setDirectors} addLabel="Add director" /></div>
        </>
      ) : (
        <div className="card" id="sec-employment"><h2 style={{ marginBottom: 12 }}>{type === "NRI" ? "Employment details (overseas)" : "Employment details"}</h2>
          <Grid fields={type === "NRI" ? C.nriEmploymentFields : C.employmentFields} value={employment} onChange={setEmployment} /></div>
      )}
      <div className="card" id="sec-coapp"><h2 style={{ marginBottom: 12 }}>Co-applicants</h2>
        <ListSection title="Co-applicant" fields={C.coApplicantFields} items={coApplicants} onChange={setCo} addLabel="Add co-applicant" /></div>
      <div className="card" id="sec-loanreq"><h2 style={{ marginBottom: 12 }}>Loan requirement details</h2>
        <Grid fields={C.loanRequirementFields} value={loanRequirement} onChange={setLoanReq} /></div>
      <div className="card" id="sec-existing"><h2 style={{ marginBottom: 12 }}>Existing loan details (if any)</h2>
        <ListSection title="Loan" fields={C.existingLoanFields} items={existingLoans} onChange={setLoans} addLabel="Add loan" /></div>

      <div className="card" id="sec-refs"><h2 style={{ marginBottom: 12 }}>References (friends)</h2>
        <ListSection title="Reference" fields={C.referenceFields} items={references} onChange={setRefs} max={2} addLabel="Add reference" /></div>
      <div className="card" id="sec-property"><h2 style={{ marginBottom: 12 }}>Property details</h2>
        <Grid fields={C.propertyFields} value={property} onChange={setProperty} /></div>

      {!embedded && <div className="card" id="sec-loans">
        <h2 style={{ marginBottom: 12 }}>Loan files</h2>
        {isNew ? <p className="hint">Submit the customer first, then add loan files here.</p>
          : <LoanFiles customerId={id as Id<"customers">} />}
      </div>}
    </>
  );
}
