import { cashierLogService } from "../../../../../cashier/services/cashierLogService";
import { generateEndReportHtml } from "../../../../../utils/endReportTemplate";
import type { EntryMode } from "./cashierSessionModes";

type ShowToast = (message: string, type?: any) => void;

/** Denomination counts are sent only when the cash was counted by denomination. */
export const buildDenominationPayload = (entryMode: EntryMode, counts: Record<number, number>) =>
  entryMode === "DENOM"
    ? Object.entries(counts).map(([id, count]) => ({ denominationId: Number(id), cashCount: count }))
    : [];

/** A failed open / close: an expired login goes back to login, anything else shows the server's message. */
export const showSessionActionError = (err: any, showToast: ShowToast, fallback: string) => {
  if (err.response?.status === 401) {
    showToast("Session expired. Redirecting to login...", "error");
    setTimeout(() => window.location.href = '/', 2000);
  } else {
    const apiMsg = err.response?.data?.message || (err.response?.data?.errors ? JSON.stringify(err.response.data.errors) : null);
    showToast(apiMsg || err.message || fallback, "error");
  }
};

/** Drops the login and the open shift on this device. */
export const clearCashierLogin = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("activeShift");
};

/** Prints the Shift End or Day End report on the bill printer. Errors show as a toast. */
export const printEndReport = async (
  kind: "SHIFT" | "DAY",
  dayId: number,
  shiftId: number,
  showToast: ShowToast,
) => {
  try {
    let html: string;
    if (kind === "SHIFT") {
      const reportData = await cashierLogService.getShiftEndReport(dayId, shiftId);
      if (!(reportData as any).counter) {
        (reportData as any).counter = localStorage.getItem("systemCounterName") || "Counter 1";
      }
      if (!(reportData as any).user) {
        (reportData as any).user = localStorage.getItem("userName") || "";
      }
      html = await generateEndReportHtml(reportData, 'SHIFTEND');
    } else {
      const reportData = await cashierLogService.getDayEndReport(dayId);
      html = await generateEndReportHtml(reportData, 'DAYEND');
    }
    const { printHtmlReceipt } = await import("../../../../../services/qzService");
    const defaultPrinter = localStorage.getItem('cachedBillPrinter') || undefined;
    await printHtmlReceipt(html, defaultPrinter);
    showToast(kind === "SHIFT" ? "Printing Shift End..." : "Printing Day End...", "success");
  } catch (e: any) {
    showToast(e.message || (kind === "SHIFT" ? "Failed to print Shift End" : "Failed to print Day End"), "error");
  }
};
