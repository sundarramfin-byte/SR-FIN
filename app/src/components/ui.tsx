import { createPortal } from "react-dom";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { errMsg } from "../lib/format";

/* ---------------- toasts ---------------- */
type Toast = { id: number; text: string; err?: boolean };
const ToastCtx = createContext<{ ok: (t: string) => void; err: (e: unknown) => void }>({
  ok: () => {},
  err: () => {},
});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((text: string, err?: boolean) => {
    const id = Date.now() + Math.random();
    setItems((x) => [...x, { id, text, err }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), err ? 6000 : 3000);
  }, []);
  return (
    <ToastCtx.Provider value={{ ok: (t) => push(t), err: (e) => push(errMsg(e), true) }}>
      {children}
      <div className="toasts no-print">
        {items.map((t) => (
          <div key={t.id} className={"toast" + (t.err ? " err" : "")}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------------- modal ---------------- */
export function Modal({ title, onClose, children, actions }: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return createPortal(
    <div className="overlay no-print-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-head no-print">
          <h2>{title}</h2>
          <div className="row">
            {actions}
            <button className="btn secondary sm" onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- form bits ---------------- */
export function Fld({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={"f" + (wide ? " wide" : "")}>
      <span className="lbl">{label}</span>
      {children}
    </label>
  );
}

export function Badge({ v }: { v: string }) {
  return <span className={"badge " + v}>{v}</span>;
}

export function Empty({ text }: { text: string }) {
  return <div className="empty">{text}</div>;
}

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="page-head no-print">
      <h1>{title}</h1>
      <div className="grow" />
      {children}
    </div>
  );
}

/** Parse a numeric input, empty -> undefined. */
export const toNum = (s: string) => (s.trim() === "" ? undefined : Number(s));
