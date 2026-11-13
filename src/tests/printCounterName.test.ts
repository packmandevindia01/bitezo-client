/**
 * Counter on prints (2026-11-13): every print sent the fixed text "Main". Now: a saved order's own counter
 * (server counterName), else this device's counter from system registration ("systemCounterName").
 * Receipts: dineInTableOrdersSnapshot / terminalSettleSnapshot print "Counter : Counter1".
 */
import { describe, it, expect, beforeEach } from "vitest";
import { printCounterName } from "../features/pos/utils/printCounterName";

beforeEach(() => localStorage.clear());

describe("printCounterName", () => {
  it("a saved order prints the counter that made it", () => {
    localStorage.setItem("systemCounterName", "Counter2");
    expect(printCounterName({ counterName: "Counter1" })).toBe("Counter1");
  });

  it("otherwise this device's registered counter", () => {
    localStorage.setItem("systemCounterName", "Counter2");
    expect(printCounterName({})).toBe("Counter2");
    expect(printCounterName(null)).toBe("Counter2");
    expect(printCounterName({ counterName: "  " })).toBe("Counter2");
  });

  it("nothing known: empty, never an invented 'Main'", () => {
    expect(printCounterName(undefined)).toBe("");
  });
});
