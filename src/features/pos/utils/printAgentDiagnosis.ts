/**
 * Why the Printer Agent (PrinterAgent.exe, ws://localhost:9191) could not be reached — told to the cashier in plain
 * words instead of a generic "Is PrinterAgent.exe running?" (2026-11-11).
 *
 * Chrome's "Local Network Access" rule (2025+) blocks a page from reaching programs on the user's own PC
 * (localhost) unless the site is allowed: a POS opened from an internet address (e.g. a public IP) is blocked, and a
 * site whose "Local network access" permission is set to Block is blocked too. The browser does not say why a
 * WebSocket failed, so the cause is inferred from the page address and the permission state.
 */

export type PrintAgentProblem = "localNetworkBlocked" | "openedFromInternet" | "agentNotReachable";
export type LocalNetworkPermission = "granted" | "denied" | "prompt" | "unknown";

/** localhost, private IPv4 ranges, link-local, *.local and single-word machine names count as the local network. */
export const isLocalNetworkHost = (hostname: string): boolean => {
  const h = (hostname || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!h || h === "localhost" || h === "::1" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  const ip = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ip) {
    const [a, b] = [Number(ip[1]), Number(ip[2])];
    return a === 127 || a === 10 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 169 && b === 254);
  }
  if (h.includes(":")) return h.startsWith("fe80:") || h.startsWith("fc") || h.startsWith("fd"); // IPv6 local ranges
  return !h.includes("."); // "POS-SERVER" style machine name
};

export const printAgentProblem = (hostname: string, permission: LocalNetworkPermission): PrintAgentProblem => {
  if (permission === "denied") return "localNetworkBlocked";
  if (!isLocalNetworkHost(hostname)) return "openedFromInternet";
  return "agentNotReachable";
};

export const printAgentProblemMessage = (problem: PrintAgentProblem, hostname: string, permission: LocalNetworkPermission): string => {
  switch (problem) {
    case "localNetworkBlocked":
      return "Chrome is blocking this page from reaching the Printer Agent on this PC (\"Local network access\" is set to Block). " +
        "Click the icon left of the address bar → Site settings → Local network access → Allow, then reload the page.";
    case "openedFromInternet":
      return `The POS is open from an internet address (${hostname}), and Chrome does not let such pages reach the Printer Agent on this PC. ` +
        "Open the POS by its local network address instead (for example http://192.168.x.x:port), " +
        "or allow \"Local network access\" for this site in Chrome's site settings and reload.";
    default:
      return "Could not reach the Printer Agent on this PC. Make sure PrinterAgent.exe is running, then try again." +
        (permission === "prompt" ? " If Chrome asks to access devices on your local network, choose Allow." : "");
  }
};

/** Chrome's "Local network access" permission for this site; "unknown" where the browser has no such permission. */
export const queryLocalNetworkPermission = async (): Promise<LocalNetworkPermission> => {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
  for (const name of ["local-network-access", "local-network"]) {
    try {
      const status = await navigator.permissions.query({ name: name as PermissionName });
      return status.state as LocalNetworkPermission;
    } catch {
      // this browser does not know the permission name — try the next one
    }
  }
  return "unknown";
};

/** The message to show when no Printer Agent address answered. */
export const diagnosePrintAgentFailure = async (): Promise<string> => {
  const hostname = typeof window !== "undefined" ? window.location?.hostname ?? "" : "";
  const permission = await queryLocalNetworkPermission();
  return printAgentProblemMessage(printAgentProblem(hostname, permission), hostname, permission);
};
