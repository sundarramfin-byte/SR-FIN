export const inr = (n: number | undefined | null) =>
  n === undefined || n === null || Number.isNaN(n)
    ? "—"
    : (n < 0 ? "-" : "") + "₹ " + Math.abs(n).toLocaleString("en-IN", { maximumFractionDigits: 2 });

export const num = (n: number | undefined | null) =>
  n === undefined || n === null ? "" : n.toLocaleString("en-IN", { maximumFractionDigits: 2 });

/** Local calendar date (toISOString would give the previous day in IST before 5:30am). */
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** ISO (YYYY-MM-DD) -> DD/MM/YYYY */
export const fmtDate = (iso?: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

export const ageFrom = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age >= 0 ? String(age) : "";
};

export const yearsSince = (iso?: string) => ageFrom(iso);

const ones = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
  "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const below100 = (n: number) => (n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : ""));
const below1000 = (n: number) =>
  (n >= 100 ? ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " : "") : "") + below100(n % 100);

/** Indian numbering system (lakh / crore). */
export function amountInWords(amount: number): string {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";
  const parts: string[] = [];
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const rest = rupees % 1000;
  if (crore) parts.push(below1000(crore) + " Crore");
  if (lakh) parts.push(below100(lakh) + " Lakh");
  if (thousand) parts.push(below100(thousand) + " Thousand");
  if (rest) parts.push(below1000(rest));
  let s = parts.join(" ") + " Rupees";
  if (paise) s += " and " + below100(paise) + " Paise";
  return s + " Only";
}

/** Pull the readable message out of a Convex error. */
export function errMsg(e: unknown): string {
  const raw = e instanceof Error ? e.message : String(e);
  const m = raw.match(/Uncaught Error: (.*)/);
  return (m ? m[1] : raw).split("\n")[0].replace(/ at handler.*$/, "").trim();
}

export const FY_START = (d = new Date()) => (d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1);
export const MONTHS = ["APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC", "JAN", "FEB", "MAR"];
