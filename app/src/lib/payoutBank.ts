export type Channel = "Direct Bank" | "THAWA";
export const CHANNELS: Channel[] = ["Direct Bank", "THAWA"];

/** Payout account printed at the bottom of each channel's invoice (from the Bank Invoice sheet). */
export const PAYOUT_BANKS: Record<Channel, { bankName: string; type: string; branch: string; accountNo: string; ifsc: string }> = {
  "Direct Bank": { bankName: "FEDERAL BANK", type: "CURRENT", branch: "MADIPAKKAM", accountNo: "23280 20000 7194", ifsc: "FDRL0002328" },
  THAWA: { bankName: "BANK OF INDIA", type: "SAVINGS", branch: "NANGANALLUR", accountNo: "8035 1031 0000 072", ifsc: "FDRL0002328" },
};

export const THAWA_NAME = "THAWA FINANCIAL SERVICE PVT LTD";
export const THAWA_ADDRESS = "Old no 21, New No 65, 1st floor Velachery Main road, little mount Saidapet, Chennai - 600 015";

/** Which bank-code column feeds "CHANNEL DSA CODE": Direct Bank -> SUNDAR RAM FIN code, Thawa -> Thawa code. */
export function codeFor(channel: Channel, bank?: { sundarRamCode?: string; thawaCode?: string }) {
  if (!bank) return "";
  if (channel === "THAWA") return bank.thawaCode ?? "";
  return bank.sundarRamCode ?? "";
}
