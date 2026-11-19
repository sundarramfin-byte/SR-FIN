import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ageFrom } from "../lib/format";
import * as C from "../lib/formConfig";
import type { FieldDef } from "../lib/formConfig";

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
        <label key={fd.key} className={`f ${fd.wide ? "wide" : ""}`}>
          <span className="lbl">{fd.label}</span>
          {fd.type === "select" ? (
            <select value={value[fd.key] ?? ""} onChange={(e) => set(fd.key, e.target.value)}>
              <option value="">— Select —</option>
              {fd.options!.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : fd.type === "textarea" ? (
            <textarea rows={3} value={value[fd.key] ?? ""} onChange={(e) => set(fd.key, e.target.value)} />
          ) : (
            <input
              className={fd.type === "computed" ? "computed" : ""}
              readOnly={fd.type === "computed"}
              type={fd.type === "date" ? "date" : fd.type === "number" ? "number" : "text"}
              value={value[fd.key] ?? ""}
              onChange={(e) => set(fd.key, e.target.value)}
              placeholder={fd.type === "computed" ? "Auto-computed" : ""}
            />
          )}
        </label>
      ))}
    </div>
  );
}

const clean = (s: Sec) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== ""));
const cleanList = (l: Sec[]) => l.map(clean).filter((x) => Object.keys(x).length > 0);

export default function ClientIntake() {
  const submit = useMutation(api.customers.submitApplication);
  const settings = useQuery(api.settings.get);

  const [type, setType] = useState<CType>("Salaried");
  const [name, setName] = useState("");
  const [cell, setCell] = useState("");
  const [applicant, setApplicant] = useState<Sec>({});
  const [currentAddress, setCurrent] = useState<Sec>({});
  const [permanentAddress, setPermanent] = useState<Sec>({});
  const [sameAsCurrent, setSameAsCurrent] = useState(false);
  const [employment, setEmployment] = useState<Sec>({});
  const [companyD, setCompany] = useState<Sec>({});
  const [nriOffice, setNri] = useState<Sec>({});
  const [property, setProperty] = useState<Sec>({});
  const [coApplicants, setCo] = useState<Sec[]>([]);
  const [officeDetails, setOffice] = useState<Sec>({});
  const [coEmployment, setCoEmp] = useState<Sec>({});
  const [loanRequirement, setLoanReq] = useState<Sec>({});
  const [existingLoans, setLoans] = useState<Sec[]>([]);
  const [directors, setDirectors] = useState<Sec[]>([]);
  const [references, setRefs] = useState<Sec[]>([{}, {}]);
  const [referredBy, setReferredBy] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submittedSrNo, setSubmittedSrNo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCompany = type === "Self Employed";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanCell = cell.replace(/\D/g, "");
    if (!name.trim()) {
      setError("Please enter your full name / applicant name.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (cleanCell.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSubmitting(true);
    try {
      const perm = sameAsCurrent ? currentAddress : permanentAddress;
      const res = await submit({
        name: name.trim(),
        cell: cleanCell,
        customerType: type,
        referredBy: referredBy || undefined,
        applicant: clean(applicant),
        currentAddress: clean(currentAddress),
        permanentAddress: clean(perm),
        employment: isCompany ? undefined : clean(employment),
        company: isCompany ? clean(companyD) : undefined,
        officeDetails: isCompany ? clean(officeDetails) : undefined,
        coEmployment: isCompany ? clean(coEmployment) : undefined,
        loanRequirement: clean(loanRequirement),
        existingLoans: cleanList(existingLoans),
        property: clean(property),
        coApplicants: cleanList(coApplicants),
        directors: isCompany ? cleanList(directors) : undefined,
        references: cleanList(references),
      });

      setSubmittedSrNo(res.srNo);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      setError(err?.message || "Failed to submit application. Please check your details.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submittedSrNo) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--c-bg)", padding: "40px 16px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <div className="card" style={{ maxWidth: 640, width: "100%", textAlign: "center", padding: "40px 24px" }}>
          <img src="/logo.png" alt="Company Logo" style={{ height: 60, width: "auto", objectFit: "contain", margin: "0 auto 10px", display: "block" }} />
          <img
            src="/sundar-name.png"
            alt={settings?.companyName ?? "SUNDAR RAM FIN CONSULTANCY PVT LTD"}
            style={{
              height: 40,
              width: "auto",
              maxWidth: "min(340px, 90%)",
              objectFit: "contain",
              margin: "0 auto 16px",
              display: "block",
            }}
          />
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--c-primary-light)", color: "var(--c-primary-dark)", fontSize: 28, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            ✓
          </div>
          <h1 style={{ color: "var(--c-primary-dark)", marginBottom: 8, fontSize: "1.75rem" }}>Application Submitted!</h1>
          <p style={{ color: "var(--c-text-muted)", marginBottom: 20 }}>
            Thank you, <b>{name}</b>. Your loan application has been received successfully.
          </p>

          <div style={{ background: "var(--c-primary-light)", border: "1px solid var(--c-primary-mid)", borderRadius: 8, padding: 16, marginBottom: 24 }}>
            <span style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: 1, color: "var(--c-text-muted)" }}>Your Application Reference No</span>
            <div style={{ fontSize: "1.6rem", fontWeight: "bold", color: "var(--c-primary-dark)", marginTop: 4 }}>
              {submittedSrNo}
            </div>
          </div>

          <p style={{ fontSize: "0.95rem", lineHeight: 1.6, color: "var(--c-text)", marginBottom: 24 }}>
            Our loan consultancy team at <b>{settings?.companyName ?? "SUNDAR RAM FIN CONSULTANCY [P] LTD"}</b> will review your details and contact you at <b>{cell}</b> shortly.
          </p>

          <div style={{ fontSize: "0.85rem", color: "var(--c-text-muted)", borderTop: "1px solid var(--c-border)", paddingTop: 16 }}>
            For any immediate assistance, reach us at: <b>8056148198 / 9790896475</b> or <b>bskannan1966@gmail.com</b>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--c-bg)", padding: "24px 16px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div className="card" style={{ textAlign: "center", marginBottom: 20, padding: "26px 20px" }}>
          <img
            src="/logo.png"
            alt="Company Logo"
            style={{ height: 68, width: "auto", objectFit: "contain", margin: "0 auto 10px", display: "block" }}
          />
          <img
            src="/sundar-name.png"
            alt={settings?.companyName ?? "SUNDAR RAM FIN CONSULTANCY PVT LTD"}
            style={{
              height: 48,
              width: "auto",
              maxWidth: "min(380px, 92%)",
              objectFit: "contain",
              margin: "0 auto 8px",
              display: "block",
            }}
          />
          <div style={{ fontSize: "0.85rem", color: "var(--c-text-muted)", marginTop: 4 }}>
            CIN: {settings?.cin ?? "U66190TN2023PTC160827"} | Madipakkam, Chennai - 600091
          </div>
          <h2 style={{ fontSize: "1.15rem", marginTop: 14, color: "var(--c-text)", fontWeight: 650 }}>
            Loan Application Form (Customer Intake)
          </h2>
          <p style={{ fontSize: "0.85rem", color: "var(--c-text-muted)", margin: "4px 0 0" }}>
            Please fill in your details accurately below. Our team will review and process your loan file.
          </p>
        </div>

        {error && (
          <div className="card" style={{ background: "#FEE4E2", border: "1px solid var(--c-danger)", color: "var(--c-danger)", marginBottom: 20, padding: 14 }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Customer Type Selector */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 12 }}>1. Application Type</h2>
            <div className="btn-group" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {(["Salaried", "Self Employed", "NRI"] as CType[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  className={`btn ${type === t ? "primary" : "secondary"}`}
                  style={{ flex: 1, minWidth: 140, padding: "10px 16px" }}
                  onClick={() => setType(t)}
                >
                  {t === "Salaried" && "💼 "}
                  {t === "Self Employed" && "🏢 "}
                  {t === "NRI" && "✈️ "}
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Basic Customer Profile */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 12 }}>2. Applicant Contact</h2>
            <div className="grid">
              <label className="f">
                <span className="lbl">{isCompany ? "Company / Applicant Name *" : "Applicant Full Name *"}</span>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name as per Aadhaar / PAN" />
              </label>
              <label className="f">
                <span className="lbl">Mobile Contact No (10 Digits) *</span>
                <input
                  required
                  inputMode="numeric"
                  maxLength={10}
                  value={cell}
                  onChange={(e) => setCell(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 9876543210"
                />
              </label>
              <label className="f">
                <span className="lbl">Referred By (Optional)</span>
                <select value={referredBy} onChange={(e) => setReferredBy(e.target.value)}>
                  <option value="">— Select source —</option>
                  <option value="Website">Website</option>
                  <option value="Broker">Broker / DSA</option>
                  <option value="sulaka.com">sulaka.com</option>
                  <option value="Connector">Connector</option>
                  <option value="Friend/Family">Friend / Family</option>
                </select>
              </label>
            </div>
          </div>

          {/* Applicant Details (all types) */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 12 }}>3. Applicant Details</h2>
            <Grid fields={C.applicantFields} value={applicant} onChange={setApplicant} />
          </div>

          {/* Address Information */}
          {true && (
            <>
              <div className="card" style={{ marginBottom: 20 }}>
                <h2 style={{ marginBottom: 12 }}>4. Current Residential Address</h2>
                <Grid fields={C.currentAddressFields} value={currentAddress} onChange={setCurrent} />
              </div>

              <div className="card" style={{ marginBottom: 20 }}>
                <div className="row" style={{ marginBottom: 12 }}>
                  <h2>5. Permanent Address</h2>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.88rem", userSelect: "none" }}>
                    <input
                      type="checkbox"
                      style={{ width: 17, height: 17, margin: 0, cursor: "pointer", accentColor: "var(--c-primary-dark, #205448)" }}
                      checked={sameAsCurrent}
                      onChange={(e) => {
                        setSameAsCurrent(e.target.checked);
                        if (e.target.checked) setPermanent({ ...currentAddress });
                      }}
                    />
                    <span>Same as current address</span>
                  </label>
                </div>
                {!sameAsCurrent && <Grid fields={C.permanentAddressFields} value={permanentAddress} onChange={setPermanent} />}
              </div>
            </>
          )}

          {!isCompany && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h2 style={{ marginBottom: 12 }}>6. {type === "NRI" ? "Employment Details (Overseas)" : "Employment Details"}</h2>
              <Grid fields={type === "NRI" ? C.nriEmploymentFields : C.employmentFields} value={employment} onChange={setEmployment} />
            </div>
          )}

          {isCompany && (
            <>
              <div className="card" style={{ marginBottom: 20 }}>
                <h2 style={{ marginBottom: 12 }}>6. Business Details</h2>
                <Grid fields={C.companyFields} value={companyD} onChange={setCompany} />
              </div>
              <div className="card" style={{ marginBottom: 20 }}>
                <h2 style={{ marginBottom: 12 }}>Office / Business Details</h2>
                <Grid fields={C.officeBusinessFields} value={officeDetails} onChange={setOffice} />
              </div>
              <div className="card" style={{ marginBottom: 20 }}>
                <h2 style={{ marginBottom: 12 }}>Employment / Business Details (Co-Applicant)</h2>
                <Grid fields={C.coEmploymentFields} value={coEmployment} onChange={setCoEmp} />
              </div>
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="row" style={{ marginBottom: 12 }}>
                  <h2>Directors / Partners</h2>
                  <button type="button" className="btn secondary sm" onClick={() => setDirectors([...directors, {}])}>
                    + Add Director
                  </button>
                </div>
                {directors.map((d, i) => (
                  <div key={i} style={{ marginBottom: 14, paddingBottom: 10, borderBottom: "1px dashed var(--c-border)" }}>
                    <div className="row" style={{ marginBottom: 8 }}>
                      <h3>Director {i + 1}</h3>
                      <button type="button" className="btn danger sm" onClick={() => setDirectors(directors.filter((_, j) => j !== i))}>Remove</button>
                    </div>
                    <Grid fields={C.directorFields} value={d} onChange={(v) => setDirectors(directors.map((x, j) => (j === i ? v : x)))} />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Property Details */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 12 }}>Property Details (For Loan)</h2>
            <Grid fields={C.propertyFields} value={property} onChange={setProperty} />
          </div>

          {/* Co-Applicants (Optional) */}
          {true && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="row" style={{ marginBottom: 12 }}>
                <h2>Co-Applicants (If Any)</h2>
                <button type="button" className="btn secondary sm" onClick={() => setCo([...coApplicants, {}])}>
                  + Add Co-Applicant
                </button>
              </div>
              {coApplicants.length === 0 && <p className="hint">No co-applicant added. Click "+ Add Co-Applicant" if applicable.</p>}
              {coApplicants.map((co, i) => (
                <div key={i} style={{ marginBottom: 14, paddingBottom: 10, borderBottom: "1px dashed var(--c-border)" }}>
                  <div className="row" style={{ marginBottom: 8 }}>
                    <h3>Co-Applicant {i + 1}</h3>
                    <button type="button" className="btn danger sm" onClick={() => setCo(coApplicants.filter((_, j) => j !== i))}>Remove</button>
                  </div>
                  <Grid fields={C.coApplicantFields} value={co} onChange={(v) => setCo(coApplicants.map((x, j) => (j === i ? v : x)))} />
                </div>
              ))}
            </div>
          )}

          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 12 }}>Loan Requirement Details</h2>
            <Grid fields={C.loanRequirementFields} value={loanRequirement} onChange={setLoanReq} />
          </div>

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="row" style={{ marginBottom: 12 }}>
              <h2>Existing Loan Details (if any)</h2>
              <button type="button" className="btn secondary sm" onClick={() => setLoans([...existingLoans, {}])}>+ Add Loan</button>
            </div>
            <p className="hint" style={{ marginBottom: 8 }}>No. of loans: {existingLoans.length}</p>
            {existingLoans.map((l, i) => (
              <div key={i} style={{ marginBottom: 14, paddingBottom: 10, borderBottom: "1px dashed var(--c-border)" }}>
                <div className="row" style={{ marginBottom: 8 }}>
                  <h3>Loan {i + 1}</h3>
                  <button type="button" className="btn danger sm" onClick={() => setLoans(existingLoans.filter((_, j) => j !== i))}>Remove</button>
                </div>
                <Grid fields={C.existingLoanFields} value={l} onChange={(v) => setLoans(existingLoans.map((x, j) => (j === i ? v : x)))} />
              </div>
            ))}
          </div>

          {/* References */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h2 style={{ marginBottom: 12 }}>References (2 Friends / Known Contacts)</h2>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8 }}>Reference 1</h3>
              <Grid fields={C.referenceFields} value={references[0] ?? {}} onChange={(v) => setRefs([v, references[1] ?? {}])} />
            </div>
            <div>
              <h3 style={{ marginBottom: 8 }}>Reference 2</h3>
              <Grid fields={C.referenceFields} value={references[1] ?? {}} onChange={(v) => setRefs([references[0] ?? {}, v])} />
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ textAlign: "center", margin: "32px 0 60px" }}>
            <button
              type="submit"
              disabled={submitting}
              className="btn"
              style={{ padding: "14px 48px", fontSize: "1.1rem", borderRadius: 8, minWidth: 260 }}
            >
              {submitting ? "Submitting Application…" : "Submit Application"}
            </button>
            <div style={{ fontSize: "0.8rem", color: "var(--c-text-muted)", marginTop: 10 }}>
              By submitting, you authorize Sundar Ram Fin Consultancy to review your application for loan processing.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

