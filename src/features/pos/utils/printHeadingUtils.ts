/**
 * Utility functions for checking printer headings configuration and alerting users.
 */

/**
 * Checks whether custom printer headings (section: 'header' / code: 'H1'..'H7')
 * are configured with non-empty values in branch print data or session.
 */
export const hasPrinterHeadings = (): boolean => {
  try {
    const cached = localStorage.getItem("branchPrintData");
    if (cached) {
      const parsed = JSON.parse(cached);
      const lines = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.data) ? parsed.data : []);
      const isHeader = (l: any) => {
        const sec = String(l.section || "").toLowerCase();
        const code = String(l.code || l.id || "").toUpperCase();
        return sec === "header" || (code.startsWith("H") && !code.startsWith("EH"));
      };
      const headers = lines.filter((l: any) => isHeader(l) && l.value && String(l.value).trim() !== "");
      if (headers.length > 0) return true;
    }

    const sessionStr = localStorage.getItem("posSession") || localStorage.getItem("activeBranch");
    if (sessionStr) {
      const parsed = JSON.parse(sessionStr);
      const lines = parsed.lines || parsed.activeBranch?.lines || [];
      if (Array.isArray(lines)) {
        const isHeader = (l: any) => {
          const sec = String(l.section || "").toLowerCase();
          const code = String(l.code || l.id || "").toUpperCase();
          return sec === "header" || (code.startsWith("H") && !code.startsWith("EH"));
        };
        const headers = lines.filter((l: any) => isHeader(l) && l.value && String(l.value).trim() !== "");
        if (headers.length > 0) return true;
      }
    }
  } catch (e) {
    // Ignore JSON errors
  }
  return false;
};

let lastWarnedTime = 0;

/**
 * Dispatches a warning notification when printer headings are not configured.
 * Debounced by 3 seconds to avoid multiple identical toasts during a print job.
 */
export const notifyPrinterHeadingWarning = (showToastFn?: (msg: string, type: any) => void) => {
  const now = Date.now();
  if (now - lastWarnedTime < 3000) return;
  lastWarnedTime = now;

  const warningMsg = "You don't set printer headings";
  if (showToastFn) {
    showToastFn(warningMsg, "warning");
  } else if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("app:toast", {
        detail: {
          message: warningMsg,
          type: "warning",
        },
      })
    );
  }
};
