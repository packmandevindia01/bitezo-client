import { isCashDrawerEnabled } from "../services/posConfigApi";

/** Longest a settlement waits for the drawer. A drawer problem must never hold up a saved sale. */
export const CASH_DRAWER_WAIT_MS = 3000;

interface SettledPayment {
  paymodeId: number | string;
  amount: number;
  label?: string;
  paymodeName?: string;
}

/** True when real cash changes hands: a Cash payment above 0 (Cash + Card counts, Card alone or a 0 total does not). */
export const hasCashPayment = (
  payments: readonly SettledPayment[],
  tenderOptions: readonly { id: number | string; label?: string }[] = []
): boolean =>
  payments.some((payment) => {
    if (!(Number(payment.amount) > 0)) return false;
    const tender = tenderOptions.find((t) => String(t.id) === String(payment.paymodeId));
    const label = tender?.label || payment.label || payment.paymodeName || "";
    return label ? label.toLowerCase().includes("cash") : Number(payment.paymodeId) === 1;
  });

/** The printer the drawer is cabled to: the bill printer, in the same order the settle receipt uses. */
const billPrinter = (): string | undefined => {
  const named = localStorage.getItem("cachedBillPrinter");
  if (named && named !== "No Printer") return named;
  return (
    localStorage.getItem("cachedBillPrinterIp") ||
    localStorage.getItem("cachedKotPrinter") ||
    localStorage.getItem("cachedKotPrinterIp") ||
    localStorage.getItem("printerIpAddress") ||
    undefined
  );
};

/** Sends the open command to the bill printer. Waits at most CASH_DRAWER_WAIT_MS. Throws on failure. */
const sendOpenCommand = async (): Promise<void> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const { openCashDrawer } = await import("../services/qzService");
    await Promise.race([
      openCashDrawer(billPrinter()),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("no response from the printer")), CASH_DRAWER_WAIT_MS);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Opens the drawer after a settlement is saved, when POS config has it enabled and cash was taken. Awaited before
 * the receipt so the two jobs do not reach the printer together. Never throws: the sale is already saved, so a
 * failure only goes to onFailed.
 */
export const openDrawerIfCash = async (
  payments: readonly SettledPayment[],
  tenderOptions: readonly { id: number | string; label?: string }[],
  onFailed: (message: string) => void
): Promise<void> => {
  if (!isCashDrawerEnabled() || !hasCashPayment(payments, tenderOptions)) return;
  try {
    await sendOpenCommand();
  } catch (err) {
    console.warn("[CashDrawer] Could not open the drawer:", err);
    onFailed(err instanceof Error ? err.message : String(err));
  }
};

export type ManualDrawerResult = { status: "sent" } | { status: "disabled" } | { status: "failed"; reason: string };

/** More → Open Cash Drawer: no sale needed, still follows POS config "Cash Drawer". */
export const openDrawerManually = async (): Promise<ManualDrawerResult> => {
  if (!isCashDrawerEnabled()) return { status: "disabled" };
  try {
    await sendOpenCommand();
    return { status: "sent" };
  } catch (err) {
    console.warn("[CashDrawer] Could not open the drawer:", err);
    return { status: "failed", reason: err instanceof Error ? err.message : String(err) };
  }
};
