import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Fld, PageHead, useToast } from "../components/ui";

type S = {
  companyName: string; address: string; cin: string; pan: string; gst: string; directorName: string;
  phone: string; email: string; bankName: string; bankBranch: string; bankAccountNo: string;
  bankIfsc: string; bankAccountType: string; declaration: string; openingBalance: number;
  eSignature?: string; eSignEnabled?: boolean;
};

function SignatureManager({
  signature,
  enabled = true,
  onChange,
  onToggle,
}: {
  signature?: string;
  enabled?: boolean;
  onChange: (sig?: string) => void;
  onToggle: (en: boolean) => void;
}) {
  const [mode, setMode] = useState<"view" | "draw" | "upload">(signature ? "view" : "upload");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    if (mode === "draw" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#082a20";
      }
    }
  }, [mode]);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasStrokes(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const endDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const saveDrawn = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasStrokes) return;
    onChange(canvas.toDataURL("image/png"));
    setMode("view");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      if (!src) return;
      const img = new Image();
      img.onload = () => {
        const maxW = 400, maxH = 160;
        let w = img.width, h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        const ctx = c.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          onChange(c.toDataURL("image/png"));
        } else {
          onChange(src);
        }
        setMode("view");
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--c-text-muted)" }}>
        Add the Director's official signature. Invoices shared to WhatsApp or saved as digital PDFs will automatically display this verified e-sign. Physical printable copies leave the signature area blank for pen signing.
      </p>

      {signature && mode === "view" && (
        <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", background: "#f8fbf9", border: "1px solid var(--c-border)", padding: "16px 20px", borderRadius: 8 }}>
          <div style={{ background: "#fff", border: "1px solid #d4ded8", borderRadius: 6, padding: "8px 14px", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 64 }}>
            <img src={signature} alt="Current e-Signature" style={{ maxHeight: 54, maxWidth: 180, objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--c-primary-dark)" }}>
              ✓ e-Signature Active
            </span>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: "0.85rem" }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => onToggle(e.target.checked)}
              />
              <span>Enable e-Sign on WhatsApp shares & digital invoices</span>
            </label>
          </div>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <button type="button" className="btn secondary sm" onClick={() => setMode("upload")}>
              Replace File
            </button>
            <button type="button" className="btn secondary sm" onClick={() => setMode("draw")}>
              Draw New
            </button>
            <button type="button" className="btn danger sm" onClick={() => onChange(undefined)}>
              Remove
            </button>
          </div>
        </div>
      )}

      {mode === "upload" && (
        <div style={{ border: "1px dashed var(--c-border)", padding: "20px", borderRadius: 8, textAlign: "center", background: "#fff" }}>
          <h3 style={{ fontSize: "0.95rem", marginBottom: 6 }}>Upload Signature Image</h3>
          <p style={{ fontSize: "0.82rem", color: "var(--c-text-muted)", marginBottom: 14 }}>
            Select a clear PNG or JPEG image of the signature on a white/clean background.
          </p>
          <input
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            style={{ display: "none" }}
            id="sig-file-input"
            onChange={handleFileUpload}
          />
          <div className="row" style={{ justifyContent: "center" }}>
            <label htmlFor="sig-file-input" className="btn" style={{ cursor: "pointer" }}>
              📁 Choose Signature Image
            </label>
            <button type="button" className="btn secondary" onClick={() => setMode("draw")}>
              ✍️ Draw with Mouse/Touch Instead
            </button>
            {signature && (
              <button type="button" className="btn ghost" onClick={() => setMode("view")}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {mode === "draw" && (
        <div style={{ border: "1px solid var(--c-border)", padding: "16px", borderRadius: 8, background: "#fff" }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: "0.88rem", fontWeight: 600 }}>Sign below using mouse, stylus, or touchpad:</span>
            <button type="button" className="btn secondary sm" onClick={clearCanvas}>
              Clear
            </button>
          </div>
          <canvas
            ref={canvasRef}
            width={400}
            height={130}
            style={{ width: "100%", maxWidth: 440, height: 130, border: "1px solid #c9d8d0", borderRadius: 6, background: "#fafdfb", cursor: "crosshair", display: "block", touchAction: "none" }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="btn sm" disabled={!hasStrokes} onClick={saveDrawn}>
              Save Signature
            </button>
            <button type="button" className="btn secondary sm" onClick={() => setMode("upload")}>
              Upload File Instead
            </button>
            {signature && (
              <button type="button" className="btn ghost sm" onClick={() => setMode("view")}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const data = useQuery(api.settings.get);
  const save = useMutation(api.settings.save);
  const toast = useToast();
  const [f, setF] = useState<S | null>(null);
  const heads = useQuery(api.expenseHeads.list) ?? [];
  const addHead = useMutation(api.expenseHeads.add);
  const removeHead = useMutation(api.expenseHeads.remove);
  const [newHead, setNewHead] = useState("");
  const [kind, setKind] = useState<"expense" | "charge">("expense");

  useEffect(() => {
    if (data && !f) { const { _id, _creationTime, ...rest } = data; setF(rest); }
  }, [data, f]);

  if (data === null) return <div className="empty">No settings yet. Run <code>npx convex run seed:run</code> once.</div>;
  if (!f) return <div className="empty">Loading…</div>;
  const t = (k: keyof S, label: string, wide?: boolean) => (
    <Fld label={label} wide={wide}>
      <input value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </Fld>
  );

  return (
    <>
      <PageHead title="Settings">
        <button className="btn" onClick={() => save(f).then(() => toast.ok("Settings saved")).catch(toast.err)}>Save settings</button>
      </PageHead>
      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Company profile (printed on every document)</h2>
        <div className="grid">
          {t("companyName", "Company name", true)}{t("address", "Address", true)}
          {t("cin", "CIN")}{t("pan", "PAN")}{t("gst", "GST no")}{t("directorName", "Director / signatory")}
          {t("phone", "Contact no(s)")}{t("email", "Email")}
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Digital Signature (e-Sign for WhatsApp & Digital PDFs)</h2>
        <SignatureManager
          signature={f.eSignature}
          enabled={f.eSignEnabled !== false}
          onChange={(sig) => setF({ ...f, eSignature: sig, eSignEnabled: sig ? true : false })}
          onToggle={(en) => setF({ ...f, eSignEnabled: en })}
        />
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Bank details (invoice footer & payout invoices)</h2>
        <div className="grid">
          {t("bankName", "Bank name")}{t("bankBranch", "Branch")}{t("bankAccountType", "Account type")}
          {t("bankAccountNo", "Account no")}{t("bankIfsc", "IFSC")}
          <Fld label="Opening cash balance ₹ (Day Book)">
            <input type="number" value={f.openingBalance} onChange={(e) => setF({ ...f, openingBalance: Number(e.target.value) })} />
          </Fld>
          <Fld label="Self-declaration text (invoice)" wide>
            <textarea value={f.declaration} onChange={(e) => setF({ ...f, declaration: e.target.value })} />
          </Fld>
        </div>
      </div>
      <div className="card">
        <h2 style={{ marginBottom: 12 }}>Receipt charge heads & voucher expense heads</h2>
        <div className="row" style={{ marginBottom: 10 }}>
          <input placeholder="New head name" value={newHead} onChange={(e) => setNewHead(e.target.value)} />
          <select value={kind} onChange={(e) => setKind(e.target.value as "expense" | "charge")}>
            <option value="expense">Voucher expense</option><option value="charge">Receipt charge</option>
          </select>
          <button className="btn" onClick={() => addHead({ name: newHead, kind }).then(() => setNewHead("")).catch(toast.err)}>Add</button>
        </div>
        <div className="row">
          {heads.map((h) => (
            <span key={h._id} className="badge">
              {h.name} <span className="hint">({h.kind})</span>{" "}
              <a href="#" onClick={(e) => { e.preventDefault(); removeHead({ id: h._id }); }} style={{ color: "var(--c-danger)" }}>×</a>
            </span>
          ))}
        </div>
      </div>
    </>
  );
}
