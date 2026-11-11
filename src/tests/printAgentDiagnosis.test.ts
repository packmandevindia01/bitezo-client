/** Why the Printer Agent cannot be reached (Chrome Local Network Access, internet page address, agent down). */
import { describe, it, expect, vi, afterEach } from "vitest";
import {
  isLocalNetworkHost, printAgentProblem, printAgentProblemMessage, queryLocalNetworkPermission,
} from "../features/pos/utils/printAgentDiagnosis";

afterEach(() => vi.unstubAllGlobals());

describe("local network address", () => {
  it.each(["localhost", "127.0.0.1", "192.168.1.53", "10.0.0.5", "172.16.0.1", "172.31.255.1", "169.254.1.1", "pos-server", "till.local", "::1"])(
    "%s is local", (h) => expect(isLocalNetworkHost(h)).toBe(true));
  it.each(["103.209.220.154", "172.32.0.1", "8.8.8.8", "pos.example.com"])(
    "%s is the internet", (h) => expect(isLocalNetworkHost(h)).toBe(false));
});

describe("problem and message", () => {
  it("permission set to Block wins", () => {
    expect(printAgentProblem("192.168.1.53", "denied")).toBe("localNetworkBlocked");
    expect(printAgentProblemMessage("localNetworkBlocked", "192.168.1.53", "denied")).toMatch(/Local network access → Allow/);
  });

  it("opened from a public IP: says so and how to fix it", () => {
    expect(printAgentProblem("103.209.220.154", "unknown")).toBe("openedFromInternet");
    const msg = printAgentProblemMessage("openedFromInternet", "103.209.220.154", "unknown");
    expect(msg).toContain("103.209.220.154");
    expect(msg).toMatch(/local network address/);
  });

  it("local page: the agent is not running (and the Allow hint when Chrome would ask)", () => {
    expect(printAgentProblem("192.168.1.53", "prompt")).toBe("agentNotReachable");
    expect(printAgentProblemMessage("agentNotReachable", "192.168.1.53", "granted")).toMatch(/PrinterAgent\.exe is running/);
    expect(printAgentProblemMessage("agentNotReachable", "192.168.1.53", "prompt")).toMatch(/choose Allow/);
  });
});

describe("Chrome permission lookup", () => {
  it("reads the local-network-access permission", async () => {
    vi.stubGlobal("navigator", { permissions: { query: async ({ name }: { name: string }) => {
      if (name !== "local-network-access") throw new TypeError("unknown");
      return { state: "denied" };
    } } });
    expect(await queryLocalNetworkPermission()).toBe("denied");
  });

  it("unknown where the browser has no such permission", async () => {
    vi.stubGlobal("navigator", { permissions: { query: async () => { throw new TypeError("unknown"); } } });
    expect(await queryLocalNetworkPermission()).toBe("unknown");
  });
});
