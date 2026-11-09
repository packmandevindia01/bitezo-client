/**
 * "Settle Print" (POS config, Printing tab). Saved in this device's localStorage, not on the server, so each
 * terminal keeps its own choice, and logout does not clear it. Nothing saved: print directly.
 */
const STORAGE_KEY = "settlePrintConfig";

export interface SettlePrintConfig {
  /** Off: settling never prints the receipt. */
  enabled: boolean;
  /** On: ask "print the receipt?" after each settlement. Off: print directly. */
  askBeforePrint: boolean;
}

export const DEFAULT_SETTLE_PRINT_CONFIG: SettlePrintConfig = { enabled: true, askBeforePrint: false };

export const getSettlePrintConfig = (): SettlePrintConfig => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      enabled: typeof saved?.enabled === "boolean" ? saved.enabled : DEFAULT_SETTLE_PRINT_CONFIG.enabled,
      askBeforePrint:
        typeof saved?.askBeforePrint === "boolean" ? saved.askBeforePrint : DEFAULT_SETTLE_PRINT_CONFIG.askBeforePrint,
    };
  } catch {
    return DEFAULT_SETTLE_PRINT_CONFIG;
  }
};

export const saveSettlePrintConfig = (config: SettlePrintConfig): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
};

const readRuntimeConfig = (): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(localStorage.getItem("posConfigs") || "{}");
    return parsed?.configs || parsed || {};
  } catch {
    return {};
  }
};

/** POS config "Bill Copies": how many receipts one settlement prints. At least 1. */
export const getBillCopies = (): number => {
  const copies = Math.floor(Number(readRuntimeConfig().billCopies));
  return copies >= 1 ? copies : 1;
};

export const forEachBillCopy = async (print: () => Promise<void>): Promise<void> => {
  const copies = getBillCopies();
  for (let i = 0; i < copies; i++) await print();
};

/** POS config "KOT Print (Settle)": a settlement sends the kitchen whatever it has not received yet. */
export const isKotPrintSettleEnabled = (): boolean => {
  const value = readRuntimeConfig().kotPrintSettle;
  return value === true || ["enable", "true", "1"].includes(String(value ?? "").trim().toLowerCase());
};

/** Whether this settlement prints its receipt. `ask` shows the yes / no question and is only called when configured. */
export const decideSettlePrint = async (ask: () => Promise<boolean>): Promise<boolean> => {
  const { enabled, askBeforePrint } = getSettlePrintConfig();
  if (!enabled) return false;
  return askBeforePrint ? ask() : true;
};
