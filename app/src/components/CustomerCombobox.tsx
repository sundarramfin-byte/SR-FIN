import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export interface CustomerComboboxItem {
  _id: string;
  name: string;
  srNo?: string;
  cell?: string;
  customerType?: string;
}

interface CustomerComboboxProps {
  value: string;
  onChange: (id: string, customer?: CustomerComboboxItem) => void;
  customers: CustomerComboboxItem[];
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function CustomerCombobox({
  value,
  onChange,
  customers,
  placeholder = "Type customer name, SR no, or mobile...",
  disabled,
  autoFocus,
}: CustomerComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selected = useMemo(
    () => customers.find((c) => c._id === value),
    [customers, value]
  );

  // Filter customers based on query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;

    const qNorm = q.replace(/[\s\-_.]/g, "");
    const qDigits = q.replace(/\D/g, "");

    return customers.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const nameNorm = name.replace(/[\s\-_.]/g, "");
      const sr = (c.srNo || "").toLowerCase();
      const srNorm = sr.replace(/[\s\-_.]/g, "");
      const cell = (c.cell || "").replace(/\D/g, "");
      const type = (c.customerType || "").toLowerCase();

      // Name matches (plain or space-normalized e.g. "arunkumar" matches "Arun Kumar")
      if (name.includes(q) || (qNorm && nameNorm.includes(qNorm))) return true;
      // SR No matches (e.g. "0005" or "sr 5" or "5")
      if (sr.includes(q) || (qNorm && srNorm.includes(qNorm))) return true;
      // Phone digits match (e.g. "9876")
      if (qDigits && cell.includes(qDigits)) return true;
      // Customer type matches (e.g. "salaried")
      if (type.includes(q)) return true;

      return false;
    });
  }, [customers, query]);

  // Keep highlighted index in bounds
  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered.length, query]);

  // Scroll active item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.children[highlightIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex, isOpen]);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function handleSelect(c: CustomerComboboxItem) {
    onChange(c._id, c);
    setIsOpen(false);
    setQuery("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("", undefined);
    setQuery("");
    setIsOpen(true);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
      } else {
        setHighlightIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
      }
    } else if (e.key === "Enter") {
      if (isOpen && filtered.length > 0) {
        e.preventDefault();
        const target = filtered[highlightIndex] || filtered[0];
        if (target) handleSelect(target);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setQuery("");
    }
  }

  const displayInputValue = isOpen
    ? query
    : selected
    ? `${selected.srNo ? selected.srNo + " – " : ""}${selected.name}`
    : query;

  return (
    <div className="combobox" ref={containerRef}>
      <div
        className={`combobox-input-wrap ${isOpen ? "open" : ""} ${selected ? "has-value" : ""}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <Search className="combobox-icon" size={15} />

        <input
          ref={inputRef}
          type="text"
          value={displayInputValue}
          placeholder={selected ? "" : placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          className="combobox-input"
        />

        <div className="combobox-actions">
          {(selected || query) && !disabled && (
            <button
              type="button"
              className="combobox-btn"
              title="Clear selection"
              onClick={handleClear}
            >
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            className="combobox-btn"
            title={isOpen ? "Close list" : "View all customers"}
            onClick={(e) => {
              e.stopPropagation();
              if (disabled) return;
              setIsOpen((prev) => !prev);
              if (!isOpen) inputRef.current?.focus();
            }}
          >
            <ChevronDown size={14} className={isOpen ? "rotate-180" : ""} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="combobox-dropdown" onMouseDown={(e) => e.preventDefault()}>
          <div className="combobox-count-bar">
            {query.trim()
              ? `Found ${filtered.length} matching of ${customers.length} customer${customers.length === 1 ? "" : "s"}`
              : `All Customers (${customers.length}) · Type to filter`}
          </div>

          <div className="combobox-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="combobox-empty">
                No customer found matching "<b>{query}</b>".
                <div style={{ fontSize: 11.5, color: "var(--text-2)", marginTop: 4 }}>
                  Try typing name, SR number (e.g. 0005), or mobile digits.
                </div>
              </div>
            ) : (
              filtered.map((c, idx) => {
                const isCurrent = c._id === value;
                const isHighlighted = idx === highlightIndex;
                return (
                  <div
                    key={c._id}
                    className={`combobox-option ${isHighlighted ? "highlighted" : ""} ${isCurrent ? "selected" : ""}`}
                    onClick={() => handleSelect(c)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                  >
                    <div className="combobox-option-body">
                      <div className="combobox-option-title">
                        {c.srNo && <span className="combobox-sr-tag">{c.srNo}</span>}
                        <span className="combobox-option-name">{c.name}</span>
                      </div>
                      <div className="combobox-option-sub">
                        {c.customerType && <span>{c.customerType}</span>}
                        {c.customerType && c.cell && <span> · </span>}
                        {c.cell && <span>📱 {c.cell}</span>}
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="combobox-check">
                        <Check size={16} />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- Loan File Combobox for Bank Invoices ---------------- */

export interface LoanFileComboboxItem {
  _id: string;
  srNo?: string;
  customerName?: string;
  bankName?: string;
  fileNo?: string;
  loanType?: string;
  disbursementAmount?: number;
}

interface LoanFileComboboxProps {
  value: string;
  onChange: (id: string, file?: LoanFileComboboxItem) => void;
  files: LoanFileComboboxItem[];
  placeholder?: string;
  disabled?: boolean;
}

export function LoanFileCombobox({
  value,
  onChange,
  files,
  placeholder = "Type borrower name, SR no, bank, or file no...",
  disabled,
}: LoanFileComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);

  const selected = useMemo(() => files.find((f) => f._id === value), [files, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    const qNorm = q.replace(/[\s\-_.]/g, "");

    return files.filter((f) => {
      const name = (f.customerName || "").toLowerCase();
      const nameNorm = name.replace(/[\s\-_.]/g, "");
      const sr = (f.srNo || "").toLowerCase();
      const srNorm = sr.replace(/[\s\-_.]/g, "");
      const bank = (f.bankName || "").toLowerCase();
      const fileNo = (f.fileNo || "").toLowerCase();
      const fileNoNorm = fileNo.replace(/[\s\-_.]/g, "");

      if (name.includes(q) || (qNorm && nameNorm.includes(qNorm))) return true;
      if (sr.includes(q) || (qNorm && srNorm.includes(qNorm))) return true;
      if (bank.includes(q)) return true;
      if (fileNo.includes(q) || (qNorm && fileNoNorm.includes(qNorm))) return true;

      return false;
    });
  }, [files, query]);

  useEffect(() => {
    setHighlightIndex(0);
  }, [filtered.length, query]);

  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const activeEl = listRef.current.children[highlightIndex] as HTMLElement;
    if (activeEl) {
      activeEl.scrollIntoView({ block: "nearest" });
    }
  }, [highlightIndex, isOpen]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function handleSelect(f: LoanFileComboboxItem) {
    onChange(f._id, f);
    setIsOpen(false);
    setQuery("");
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("", undefined);
    setQuery("");
    setIsOpen(true);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (disabled) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlightIndex((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) setIsOpen(true);
      else setHighlightIndex((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      if (isOpen && filtered.length > 0) {
        e.preventDefault();
        const target = filtered[highlightIndex] || filtered[0];
        if (target) handleSelect(target);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setQuery("");
    }
  }

  const displayInputValue = isOpen
    ? query
    : selected
    ? `${selected.srNo ? selected.srNo + " " : ""}${selected.customerName} – ${selected.bankName} (${selected.fileNo})`
    : query;

  return (
    <div className="combobox" ref={containerRef}>
      <div
        className={`combobox-input-wrap ${isOpen ? "open" : ""} ${selected ? "has-value" : ""}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        <Search className="combobox-icon" size={15} />

        <input
          ref={inputRef}
          type="text"
          value={displayInputValue}
          placeholder={selected ? "" : placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          className="combobox-input"
        />

        <div className="combobox-actions">
          {(selected || query) && !disabled && (
            <button type="button" className="combobox-btn" title="Clear selection" onClick={handleClear}>
              <X size={14} />
            </button>
          )}
          <button
            type="button"
            className="combobox-btn"
            title={isOpen ? "Close list" : "View all files"}
            onClick={(e) => {
              e.stopPropagation();
              if (disabled) return;
              setIsOpen((prev) => !prev);
              if (!isOpen) inputRef.current?.focus();
            }}
          >
            <ChevronDown size={14} className={isOpen ? "rotate-180" : ""} />
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="combobox-dropdown" onMouseDown={(e) => e.preventDefault()}>
          <div className="combobox-count-bar">
            {query.trim()
              ? `Found ${filtered.length} of ${files.length} loan files`
              : `All Loan Files (${files.length}) · Type to filter`}
          </div>

          <div className="combobox-list" ref={listRef}>
            {filtered.length === 0 ? (
              <div className="combobox-empty">
                No loan file found matching "<b>{query}</b>".
              </div>
            ) : (
              filtered.map((f, idx) => {
                const isCurrent = f._id === value;
                const isHighlighted = idx === highlightIndex;
                return (
                  <div
                    key={f._id}
                    className={`combobox-option ${isHighlighted ? "highlighted" : ""} ${isCurrent ? "selected" : ""}`}
                    onClick={() => handleSelect(f)}
                    onMouseEnter={() => setHighlightIndex(idx)}
                  >
                    <div className="combobox-option-body">
                      <div className="combobox-option-title">
                        {f.srNo && <span className="combobox-sr-tag">{f.srNo}</span>}
                        <span className="combobox-option-name">{f.customerName}</span>
                      </div>
                      <div className="combobox-option-sub">
                        <span>🏦 {f.bankName}</span>
                        {f.fileNo && <span> · File: {f.fileNo}</span>}
                        {f.loanType && <span> · {f.loanType}</span>}
                      </div>
                    </div>
                    {isCurrent && (
                      <span className="combobox-check">
                        <Check size={16} />
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
