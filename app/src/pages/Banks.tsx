import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import type { Doc } from "../../convex/_generated/dataModel";
import { Empty, Fld, Modal, PageHead, toNum, useToast } from "../components/ui";

type Bank = Doc<"banks">;

export default function Banks() {
  const [params] = useSearchParams();
  const urlQ = params.get("q") ?? "";
  const [search, setSearch] = useState(urlQ);

  useEffect(() => {
    setSearch(urlQ);
  }, [urlQ]);

  const banks = useQuery(api.banks.list);
  const [editing, setEditing] = useState<Bank | "new" | null>(null);

  const filtered = (banks ?? []).filter((b) => {
    if (!search.trim()) return true;
    const raw = search.trim().toLowerCase();
    return (
      (b.name || "").toLowerCase().includes(raw) ||
      (b.sundarRamCode || "").toLowerCase().includes(raw) ||
      (b.thawaCode || "").toLowerCase().includes(raw) ||
      (b.drtCode || "").toLowerCase().includes(raw) ||
      (b.andromedaCode || "").toLowerCase().includes(raw)
    );
  });

  return (
    <>
      <PageHead title="Bank / DSA Codes">
        <input
          className="search"
          placeholder="Search bank name or code (e.g. Thawa)…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn" onClick={() => setEditing("new")}>+ Add bank</button>
      </PageHead>
      <div className="table-wrap">
        <table className="t">
          <thead><tr><th>S.No</th><th>Bank name</th><th>SUNDAR RAM FIN code</th><th>Thawa code</th><th>DRT code</th><th>Andro Meda code</th><th className="r">Payout %</th><th /></tr></thead>
          <tbody>
            {filtered.map((b, i) => (
              <tr key={b._id} style={b.active ? undefined : { opacity: 0.5 }}>
                <td>{i + 1}</td><td><b>{b.name}</b></td><td>{b.sundarRamCode}</td><td>{b.thawaCode}</td><td>{b.drtCode}</td><td>{b.andromedaCode}</td>
                <td className="r">{b.payoutPercent ?? ""}</td>
                <td className="r"><button className="btn secondary sm" onClick={() => setEditing(b)}>Edit</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {banks && filtered.length === 0 && <Empty text={`No banks found matching "${search}".`} />}
        {banks?.length === 0 && <Empty text="No banks. Run the seed: npx convex run seed:run" />}
      </div>
      {editing && <BankModal bank={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function BankModal({ bank, onClose }: { bank?: Bank; onClose: () => void }) {
  const save = useMutation(api.banks.save);
  const toast = useToast();
  const [f, setF] = useState({
    name: bank?.name ?? "", sundarRamCode: bank?.sundarRamCode ?? "", thawaCode: bank?.thawaCode ?? "",
    drtCode: bank?.drtCode ?? "", andromedaCode: bank?.andromedaCode ?? "", products: bank?.products ?? "",
    payoutPercent: bank?.payoutPercent === undefined ? "" : String(bank.payoutPercent), active: bank?.active ?? true,
  });
  const set = (k: keyof typeof f, v: string | boolean) => setF((x) => ({ ...x, [k]: v }));
  const text = (k: "name" | "sundarRamCode" | "thawaCode" | "drtCode" | "andromedaCode" | "payoutPercent", type = "text") => (
    <input type={type} value={f[k]} onChange={(e) => set(k, e.target.value)} />
  );
  async function submit() {
    try {
      await save({
        id: bank?._id, name: f.name, sundarRamCode: f.sundarRamCode || undefined, thawaCode: f.thawaCode || undefined,
        drtCode: f.drtCode || undefined, andromedaCode: f.andromedaCode || undefined, products: f.products || undefined,
        payoutPercent: toNum(f.payoutPercent), active: f.active,
      });
      toast.ok("Bank saved");
      onClose();
    } catch (e) { toast.err(e); }
  }
  return (
    <Modal title={bank ? "Edit bank" : "Add bank"} onClose={onClose} actions={<button className="btn secondary sm" onClick={submit}>Save</button>}>
      <div className="grid">
        <Fld label="Bank name">{text("name")}</Fld>
        <Fld label="SUNDAR RAM FIN code">{text("sundarRamCode")}</Fld>
        <Fld label="Thawa code">{text("thawaCode")}</Fld>
        <Fld label="DRT code">{text("drtCode")}</Fld>
        <Fld label="Andro Meda code">{text("andromedaCode")}</Fld>
        <Fld label="Default payout %">{text("payoutPercent", "number")}</Fld>
        <Fld label="Products" wide><textarea value={f.products} onChange={(e) => set("products", e.target.value)} /></Fld>
        <label className="f"><span>Active</span><input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} /></label>
      </div>
    </Modal>
  );
}
