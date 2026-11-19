import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import {
  Bell, BookOpen, Building2, CalendarRange, FileSpreadsheet, FileText, Landmark, LayoutDashboard,
  Menu, ReceiptText, Search, Settings as SettingsIcon, UserRound, Users, Wallet, Briefcase, Activity, type LucideIcon,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { SidebarWaves, WorkspaceWaves } from "./Decor";

export const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/customer-codes", label: "Customer Code List", icon: Users },
  { to: "/customer-sheet", label: "Customer Data Sheet", icon: FileSpreadsheet },
  { to: "/self-employed", label: "Self Employed", icon: Briefcase },
  { to: "/invoice", label: "Invoice", icon: FileText },
  { to: "/bank-invoice", label: "Bank Invoice", icon: Landmark },
  { to: "/banks", label: "Bank / DSA Codes", icon: Building2 },
  { to: "/receipt", label: "Receipt", icon: ReceiptText },
  { to: "/voucher", label: "Voucher", icon: Wallet },
  { to: "/day-book", label: "Day Book", icon: BookOpen },
  { to: "/yearly-report", label: "Yearly Report", icon: CalendarRange },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

const initials = (s?: string) =>
  (s ?? "SR").replace(/\[.*?\]/g, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

/** Close a dropdown when clicking outside it. */
function useOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && onClose();
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [onClose]);
  return ref;
}

function timeAgo(ms: number) {
  const m = Math.round((Date.now() - ms) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const items = useQuery(api.activity.recent) ?? [];
  return (
    <div className="dropdown" ref={ref}>
      <button className="icon-btn" aria-label="Notifications" onClick={() => setOpen((o) => !o)}>
        <Bell />
        {items.length > 0 && <span className="dot" />}
      </button>
      {open && (
        <div className="dropdown-menu">
          <div className="dm-head">Recent activity</div>
          {items.length === 0 && <div className="empty" style={{ padding: 20 }}>No activity yet.</div>}
          {items.map((i) => (
            <div key={i._id} className="dm-item">
              <Activity />
              <div>
                <span style={{ textTransform: "capitalize" }}>{i.action}</span> {i.entity}
                <small>{i.summary} · {timeAgo(i.at)}</small>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Profile({ name, director }: { name?: string; director?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const nav = useNavigate();
  return (
    <div className="dropdown" ref={ref}>
      <button className="avatar" aria-label="Profile" onClick={() => setOpen((o) => !o)}>{initials(director ?? name)}</button>
      {open && (
        <div className="dropdown-menu" style={{ width: 260 }}>
          <div className="dm-head">
            {director ?? "Director"}
            <div className="hint" style={{ fontWeight: 400 }}>{name}</div>
          </div>
          <button className="dm-item" onClick={() => { setOpen(false); nav("/settings"); }}><SettingsIcon /> Company settings</button>
          <button className="dm-item" onClick={() => { setOpen(false); nav("/customer-codes"); }}><UserRound /> Customer list</button>
        </div>
      )}
    </div>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useOutside(() => setOpen(false));
  const nav = useNavigate();

  const custResults = useQuery(api.customers.list, q.trim() ? { search: q.trim() } : "skip");
  const allBanks = useQuery(api.banks.list) ?? [];

  const rawQ = q.trim().toLowerCase();
  const bankResults = rawQ
    ? allBanks.filter((b) => {
        const name = (b.name || "").toLowerCase();
        const tc = (b.thawaCode || "").toLowerCase();
        const sc = (b.sundarRamCode || "").toLowerCase();
        const dc = (b.drtCode || "").toLowerCase();
        const ac = (b.andromedaCode || "").toLowerCase();
        return name.includes(rawQ) || tc.includes(rawQ) || sc.includes(rawQ) || dc.includes(rawQ) || ac.includes(rawQ);
      })
    : [];

  function handleSelect(c: NonNullable<typeof custResults>[number]) {
    setOpen(false);
    setQ("");
    const path = c.customerType === "Self Employed" ? `/self-employed/${c._id}` : `/customer-sheet/${c._id}`;
    nav(path);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && q.trim()) {
      setOpen(false);
      if (bankResults.length > 0 && (!custResults || custResults.length === 0)) {
        nav(`/banks?q=${encodeURIComponent(q.trim())}`);
      } else {
        nav(`/customer-codes?q=${encodeURIComponent(q.trim())}`);
      }
    }
  }

  const hasResults = (custResults && custResults.length > 0) || bankResults.length > 0;

  return (
    <div className="search-box" ref={ref}>
      <Search className="search-icon" size={16} />
      <input
        placeholder="Quick search: name / bank / SR no / cell"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(Boolean(e.target.value.trim()));
        }}
        onFocus={() => {
          if (q.trim()) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />
      {q && (
        <button
          type="button"
          className="search-clear"
          title="Clear search"
          onClick={() => {
            setQ("");
            setOpen(false);
          }}
        >
          ×
        </button>
      )}

      {open && q.trim() && (
        <div className="search-dropdown">
          {custResults === undefined ? (
            <div className="empty" style={{ padding: "16px" }}>Searching…</div>
          ) : !hasResults ? (
            <div className="empty" style={{ padding: "20px" }}>No customers or banks found for "{q}"</div>
          ) : (
            <>
              {bankResults.length > 0 && (
                <>
                  <div className="search-section-head">
                    <span>🏦 Banks & DSA Codes</span>
                    <span>{bankResults.length}</span>
                  </div>
                  {bankResults.slice(0, 4).map((b) => (
                    <div
                      key={b._id}
                      className="search-item"
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                        nav(`/banks?q=${encodeURIComponent(b.name)}`);
                      }}
                    >
                      <div>
                        <b>{b.name}</b>
                        <small>
                          {b.thawaCode && `Thawa: ${b.thawaCode} · `}
                          {b.sundarRamCode && `SR: ${b.sundarRamCode} · `}
                          Payout: {b.payoutPercent ?? 0}%
                        </small>
                      </div>
                      <span className="badge" style={{ fontSize: "10.5px" }}>Bank</span>
                    </div>
                  ))}
                </>
              )}

              {custResults && custResults.length > 0 && (
                <>
                  <div className="search-section-head">
                    <span>👤 Customers</span>
                    <span>{custResults.length}</span>
                  </div>
                  {custResults.slice(0, 6).map((c) => (
                    <div key={c._id} className="search-item" onClick={() => handleSelect(c)}>
                      <div>
                        <b>{c.name}</b>
                        <small>{c.srNo} · 📞 {c.cell || "No phone"}</small>
                      </div>
                      <div className="search-meta">
                        <span className="badge" style={{ fontSize: "10.5px" }}>{c.customerType}</span>
                        <small style={{ color: "var(--text-2)" }}>{c.status}</small>
                      </div>
                    </div>
                  ))}
                  <div
                    style={{ padding: "8px 14px", fontSize: "11.5px", color: "var(--green-primary)", background: "var(--bg)", textAlign: "center", cursor: "pointer", fontWeight: 600 }}
                    onClick={() => {
                      setOpen(false);
                      nav(`/customer-codes?q=${encodeURIComponent(q.trim())}`);
                    }}
                  >
                    View all customer results in Customer Code List →
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const settings = useQuery(api.settings.get);
  const [drawer, setDrawer] = useState(false);
  const [offline, setOffline] = useState(false);
  const loc = useLocation();

  useEffect(() => setDrawer(false), [loc.pathname]);
  useEffect(() => {
    if (settings !== undefined) { setOffline(false); return; }
    const t = setTimeout(() => setOffline(true), 4000);
    return () => clearTimeout(t);
  }, [settings]);

  const company = settings?.companyName ?? "SR FIN";
  return (
    <div className="app">
      <aside className={"sidebar no-print" + (drawer ? " open" : "")}>
        <div className="brand">
          <div className="logo">
            <img src="/logo.png" alt="SR Fin Logo" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <img src="/sundar-name-sidebar.png" alt={company} className="name-img" style={{ width: "100%", height: "auto", maxHeight: "38px", objectFit: "contain", display: "block" }} />
          </div>
        </div>
        <nav className="nav">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"}>
              <Icon />
              {label}
            </NavLink>
          ))}
        </nav>
        <SidebarWaves />
        <div className="sidebar-foot">© {new Date().getFullYear()} {company}</div>
      </aside>
      <div className={"scrim no-print" + (drawer ? " open" : "")} onClick={() => setDrawer(false)} />

      <div className="main">
        <WorkspaceWaves />
        <header className="topbar no-print">
          <button className="icon-btn menu-btn" aria-label="Open menu" onClick={() => setDrawer(true)}><Menu /></button>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--c-primary-dark)", letterSpacing: "-0.01em" }}>
            Loan Management System
          </span>
          <div className="grow" />
          <GlobalSearch />
          <Notifications />
          <Profile name={settings?.companyName} director={settings?.directorName} />
        </header>
        {offline && (
          <div className="banner no-print">
            Cannot reach the database. Run <code>npm start</code> in the app folder, then refresh.
          </div>
        )}
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
