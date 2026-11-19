import { useId, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { Link } from "react-router-dom";
import { AlertTriangle, Banknote, FileStack, HandCoins, Landmark, Receipt, Users, Wallet, type LucideIcon } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { fmtDate, FY_START, inr } from "../lib/format";

/* ---------------- date range ---------------- */
type Preset = "all" | "today" | "week" | "month" | "year" | "custom";
const PRESETS: [Preset, string][] = [
  ["all", "All time"], ["today", "Today"], ["week", "This Week"], ["month", "This Month"],
  ["year", "This Year"], ["custom", "Custom Range"],
];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "This Year" = current financial year (Apr–Mar), matching the Yearly Report. */
function rangeFor(p: Preset, cFrom: string, cTo: string): { from: string; to: string } | null {
  const now = new Date();
  const day = (y: number, m: number, d: number) => new Date(y, m, d);
  if (p === "today") return { from: iso(now), to: iso(now) };
  if (p === "week") {
    const off = (now.getDay() + 6) % 7; // Monday start
    const start = day(now.getFullYear(), now.getMonth(), now.getDate() - off);
    return { from: iso(start), to: iso(day(start.getFullYear(), start.getMonth(), start.getDate() + 6)) };
  }
  if (p === "month") return { from: iso(day(now.getFullYear(), now.getMonth(), 1)), to: iso(day(now.getFullYear(), now.getMonth() + 1, 0)) };
  if (p === "year") { const y = FY_START(now); return { from: `${y}-04-01`, to: `${y + 1}-03-31` }; }
  if (p === "custom" && cFrom && cTo && cFrom <= cTo) return { from: cFrom, to: cTo };
  return null;
}

/* ---------------- charts (dependency-free SVG) ---------------- */
// Palette tints only – no unrelated colours. Ordered by loan stage.
const STATUS_COLORS: Record<string, string> = {
  Disbursed: "#063d30",
  Sanctioned: "#205448",
  Login: "#4f8f78",
  Enquiry: "#9fcdb0",
  Cancelled: "#73877d",
};
const STATUS_ORDER = ["Disbursed", "Sanctioned", "Login", "Enquiry", "Cancelled"];

function Doughnut({ data }: { data: Record<string, number> }) {
  const keys = [...STATUS_ORDER.filter((k) => data[k]), ...Object.keys(data).filter((k) => !STATUS_ORDER.includes(k))];
  const total = keys.reduce((s, k) => s + data[k], 0);
  if (!total) return <div className="chart-empty">No customers in this period.</div>;
  const R = 70, C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <div className="donut-wrap">
      <div className="donut" role="img" aria-label={`Customers by status, total ${total}`}>
        <svg viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={R} fill="none" stroke="#f2f8f3" strokeWidth="26" />
          {keys.map((k) => {
            const len = (data[k] / total) * C;
            const el = (
              <circle key={k} cx="100" cy="100" r={R} fill="none" stroke={STATUS_COLORS[k] ?? "#73877d"} strokeWidth="26"
                strokeDasharray={`${Math.max(len - (keys.length > 1 ? 2 : 0), 0)} ${C}`} strokeDashoffset={-offset} />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="centre"><b>{total}</b><span>Total customers</span></div>
      </div>
      <div className="legend">
        {keys.map((k) => (
          <Link key={k} to={`/customer-codes?status=${encodeURIComponent(k)}`} className="legend-row" title={`View ${k} customers`}>
            <i style={{ background: STATUS_COLORS[k] ?? "#73877d" }} />
            <span className="nm">{k}</span>
            <b>{data[k]}</b>
            <span className="pc">{Math.round((data[k] / total) * 100)}%</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function HBars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map((e) => e[1]));
  if (!entries.length) return <div className="chart-empty">No loan files in this period.</div>;
  return (
    <div role="img" aria-label="Loan files by bank">
      {entries.map(([name, n]) => (
        <Link className="hbar" key={name} to={`/banks?q=${encodeURIComponent(name)}`} title={`Open ${name}`}>
          <span className="nm">{name}</span>
          <div className="track"><div className="fill" style={{ width: `${(n / max) * 100}%` }} /></div>
          <b>{n}</b>
        </Link>
      ))}
    </div>
  );
}

/* ---------------- page ---------------- */
type Accent = "mint" | "green" | "fresh" | "aqua" | "yellow" | "pink";

/** Organic hills in the card's bottom-right; colours come from the .acc-* CSS variables. */
function CardWaves() {
  const id = useId();
  return (
    <svg className="kpi-wave" viewBox="0 0 300 90" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0" style={{ stopColor: "var(--a1)", stopOpacity: 0.15 }} />
          <stop offset="1" style={{ stopColor: "var(--a1)", stopOpacity: 0.9 }} />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="1" y2="0.5">
          <stop offset="0" style={{ stopColor: "var(--a2)", stopOpacity: 0.1 }} />
          <stop offset="1" style={{ stopColor: "var(--a2)", stopOpacity: 0.85 }} />
        </linearGradient>
        <linearGradient id={`${id}c`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" style={{ stopColor: "var(--a3)", stopOpacity: 0 }} />
          <stop offset="1" style={{ stopColor: "var(--a3)", stopOpacity: 0.75 }} />
        </linearGradient>
      </defs>
      <path fill={`url(#${id}a)`} d="M0,90 L0,66 C58,76 112,44 182,40 C236,37 272,22 300,6 L300,90 Z" />
      <path fill={`url(#${id}b)`} d="M70,90 C112,78 156,62 210,58 C250,55 278,46 300,34 L300,90 Z" />
      <path fill={`url(#${id}c)`} d="M150,90 C196,82 244,76 300,62 L300,90 Z" />
    </svg>
  );
}

function Kpi({ icon: Icon, label, value, note, accent, to }: { icon: LucideIcon; label: string; value: string; note?: string; accent: Accent; to: string }) {
  return (
    <Link to={to} className={`kpi kpi-link acc-${accent}`} title={`Open ${label}`}>
      <CardWaves />
      <div className="ico"><Icon /></div>
      <div className="kpi-body">
        <small>{label}</small>
        <b>{value}</b>
        {note && <div className="note"><AlertTriangle />{note}</div>}
      </div>
    </Link>
  );
}

export default function Dashboard() {
  const [preset, setPreset] = useState<Preset>("all");
  const [cFrom, setCFrom] = useState("");
  const [cTo, setCTo] = useState("");
  const range = useMemo(() => rangeFor(preset, cFrom, cTo), [preset, cFrom, cTo]);

  const args = range
    ? {
        fromDate: range.from, toDate: range.to,
        fromMs: new Date(`${range.from}T00:00:00`).getTime(),
        toMs: new Date(`${range.to}T23:59:59.999`).getTime(),
      }
    : {};
  const d = useQuery(api.reports.dashboard, args);

  const label = PRESETS.find(([k]) => k === preset)![1];
  const sub = range ? `${label}: ${fmtDate(range.from)} – ${fmtDate(range.to)}` : "Overview of your loan consultancy operations";

  return (
    <>
      <div className="page-head no-print">
        <div>
          <h1>Dashboard</h1>
          <div className="page-sub">{range ? <>Overview of your loan consultancy operations · <b>{sub}</b></> : sub}</div>
        </div>
        <div className="grow" />
        <div className="range">
          {preset === "custom" && (
            <>
              <input type="date" aria-label="From date" value={cFrom} onChange={(e) => setCFrom(e.target.value)} />
              <span className="hint">to</span>
              <input type="date" aria-label="To date" value={cTo} onChange={(e) => setCTo(e.target.value)} />
            </>
          )}
          <select aria-label="Date filter" value={preset} onChange={(e) => setPreset(e.target.value as Preset)}>
            {PRESETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
      </div>
      {preset === "custom" && !range && <p className="hint" style={{ marginTop: -8 }}>Pick a valid From and To date to apply the filter (showing all time meanwhile).</p>}

      <div className="card" style={{ marginBottom: 16, background: "linear-gradient(90deg, var(--c-primary-light), var(--c-white))", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, padding: "14px 20px" }}>
        <div>
          <b style={{ color: "var(--c-primary-dark)", fontSize: "1rem" }}>📋 Client Application Link (Online Intake)</b>
          <div style={{ fontSize: "0.85rem", color: "var(--c-text-muted)", marginTop: 2 }}>
            Share this link with customers so they can fill their own details directly from their phone or computer:
            <code style={{ marginLeft: 8, background: "rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: 4, fontWeight: "bold" }}>
              {window.location.origin}/apply
            </code>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn secondary sm"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/apply`);
              alert(`Copied link to clipboard: ${window.location.origin}/apply`);
            }}
          >
            📋 Copy Link
          </button>
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              const text = encodeURIComponent(`Hello! Please fill out your loan application form using this link: ${window.location.origin}/apply - SUNDAR RAM FIN CONSULTANCY [P] LTD`);
              window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
            }}
          >
            💬 Share on WhatsApp
          </button>
          <a href="/apply" target="_blank" rel="noreferrer" className="btn ghost sm">
            ↗ Open Form
          </a>
        </div>
      </div>

      {!d ? (
        <div className="empty">Loading…</div>
      ) : (
        <>
          <div className="cards cards-4">
            <Kpi accent="mint" icon={Users} label="Customers" value={String(d.customers)} to="/customer-codes" />
            <Kpi accent="green" icon={FileStack} label="Loan Files" value={String(d.loanFiles)} to="/customer-codes" />
            <Kpi accent="fresh" icon={Landmark} label="Sanctioned (₹)" value={inr(d.sanctioned)} to="/customer-codes?status=Sanctioned" />
            <Kpi accent="aqua" icon={HandCoins} label="Disbursed (₹)" value={inr(d.disbursed)} to="/customer-codes?status=Disbursed" />
          </div>
          <div className="cards cards-3">
            <Kpi accent="yellow" icon={Banknote} label="Pending Payouts (net)" value={inr(d.pendingPayout)} to="/bank-invoice?status=Raised" />
            <Kpi accent="green" icon={Receipt} label={range ? `Receipts · ${label}` : "Receipts This Month"} value={inr(d.receiptsThisMonth)} to="/receipt" />
            <Kpi accent="pink" icon={Wallet} label="Cash Balance" value={inr(d.cashBalance)} to="/day-book"
              note={d.cashBalance < 0 ? "Vouchers exceed receipts" : undefined} />
          </div>

          <div className="analytics">
            <div className="card">
              <div className="card-head"><h2>Customers by Status</h2><small>{range ? label : "All time"}</small></div>
              <Doughnut data={d.byStatus} />
            </div>
            <div className="card">
              <div className="card-head"><h2>Loan Files by Bank</h2><small>{range ? label : "All time"}</small></div>
              <HBars data={d.byBank} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
