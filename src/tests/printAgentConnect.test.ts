// @vitest-environment jsdom
/** Printer Agent connection: callers at the same moment share one attempt and get the same reason. */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/** A WebSocket that always fails, as Chrome does when it blocks localhost. */
class FailingSocket {
  static readonly OPEN = 1;
  static opened = 0;
  readyState = 0;
  onopen: (() => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  onmessage: ((e: unknown) => void) | null = null;
  url: string;
  constructor(url: string) {
    this.url = url;
    FailingSocket.opened++;
    setTimeout(() => this.onerror?.(new Event("error")), 0);
  }
  close() {}
  send() {}
}

beforeEach(() => {
  FailingSocket.opened = 0;
  vi.stubGlobal("WebSocket", FailingSocket);
  vi.resetModules();
  localStorage.clear();
  // POS opened from an internet address, like http://103.209.220.154:8056
  Object.defineProperty(window, "location", { value: { ...window.location, hostname: "103.209.220.154" }, configurable: true });
});
afterEach(() => vi.unstubAllGlobals());

describe("checkPrintAgent", () => {
  it("two checks at once share one attempt and both get the Chrome explanation (no generic timeout)", async () => {
    const { checkPrintAgent } = await import("../features/pos/services/qzService");
    const [a, b] = await Promise.all([checkPrintAgent(), checkPrintAgent()]);
    expect(a).toMatch(/internet address \(103\.209\.220\.154\)/);
    expect(b).toBe(a);
    expect(a).not.toMatch(/Timeout connecting/);
    // one attempt: localhost 9191 + 8181, then the page host 9191 + 8181
    expect(FailingSocket.opened).toBe(4);
  });

  it("a later check starts a new attempt", async () => {
    const { checkPrintAgent } = await import("../features/pos/services/qzService");
    await checkPrintAgent();
    await checkPrintAgent();
    expect(FailingSocket.opened).toBe(8);
  });
});
