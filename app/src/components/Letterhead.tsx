import type { ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/** Company header used by every printable document. */
export function Letterhead({ title, children }: { title?: string; children?: ReactNode }) {
  const s = useQuery(api.settings.get);
  return (
    <>
      <div className="doc-head">
        <div className="logo">
          <img src="/logo.png" alt="Company Logo" />
        </div>
        <div className="doc-head-text">
          <img src="/sundar-name.png" alt={s?.companyName ?? "Company Name"} style={{ height: "24px", width: "auto", maxWidth: "280px", objectFit: "contain", display: "block", marginBottom: "4px" }} />
          <div>{(s?.address ?? "").replace(/\s*-\s*(\d{3})\s?(\d{3})\s*$/, " - $1$2")}</div>
          <div>CIN: {s?.cin}</div>
        </div>
      </div>
      {title && <div className="doc-title">{title}</div>}
      {children}
    </>
  );
}

export function SignBlock({ showESign = false }: { showESign?: boolean } = {}) {
  const s = useQuery(api.settings.get);
  const hasESign = showESign && Boolean(s?.eSignature) && s?.eSignEnabled !== false;

  return (
    <div className="sign" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: "auto", paddingTop: "24px" }}>
      <div>
        <div style={{ height: 42 }} />
        <div style={{ borderTop: "1px dashed #777", paddingTop: "4px", fontSize: "0.85rem", fontWeight: 600 }}>
          CUSTOMER SIGNATURE
        </div>
      </div>
      <div style={{ textAlign: "right", minWidth: 210 }}>
        <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--c-primary-dark, #205448)" }}>
          {s?.companyName}
        </div>

        {hasESign && s?.eSignature ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", margin: "4px 0 2px" }}>
            <img
              src={s.eSignature}
              alt="Director e-Signature"
              style={{ maxHeight: 48, maxWidth: 160, objectFit: "contain", display: "block" }}
            />
            <span style={{ fontSize: "8.5px", color: "var(--green-primary, #205448)", letterSpacing: "0.5px", fontWeight: 700, textTransform: "uppercase" }}>
              ✓ Digitally Signed (e-Sign)
            </span>
          </div>
        ) : (
          <div style={{ height: 48, display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <span style={{ fontSize: "9.5px", color: "#888", fontStyle: "italic" }}>(Physical Signature)</span>
          </div>
        )}

        <div style={{ borderTop: "1px dashed #777", paddingTop: "4px", fontSize: "0.85rem", fontWeight: 600 }}>
          DIRECTOR
        </div>
        <div style={{ fontSize: "0.8rem", color: "#333" }}>
          [ {s?.directorName} ]
        </div>
      </div>
    </div>
  );
}
