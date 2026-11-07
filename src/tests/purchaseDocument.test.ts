/** Helpers shared by the Purchase Invoice and Purchase Return forms. */
import { describe, it, expect } from "vitest";
import { formatDateOnly, mapStoredPayments, parseStockValue, paymodesForSave, toNumber } from "../features/transaction/shared/purchaseDocument";

const paymodes = [{ paymodeId: 1, paymodeName: "Cash" }, { paymodeId: 2, paymodeName: "Card" }, { paymodeId: 3, paymodeName: "MultiPay" }];
const load = (over: Partial<Parameters<typeof mapStoredPayments>[0]>) =>
  mapStoredPayments({ rootPaymodeId: 3, multiPayId: 3, netAmount: 40, stored: null, paymodes, decimalPart: 3, ...over });

describe("mapStoredPayments", () => {
  it("a split that adds up keeps its lines", () => {
    expect(load({ stored: [{ paymodeId: 1, amount: 25 }, { paymodeId: 2, amount: 15 }] }).map((p) => [p.mode, p.amount])).toEqual([["cash", "25"], ["card", "15"]]);
  });
  it("an old document that stored part of the split shows the rest as Cash first", () => {
    expect(load({ stored: [{ paymodeId: 2, amount: 15 }] }).map((p) => [p.mode, p.amount])).toEqual([["cash", "25"], ["card", "15"]]);
  });
  it("a single paymode with no stored lines pays the whole amount", () => {
    expect(load({ rootPaymodeId: 2 })).toEqual([{ mode: "card", amount: "40", paymodeId: 2 }]);
  });
  it("a split with no stored lines has no payments", () => {
    expect(load({})).toEqual([]);
  });
  it("names fall back by id when the master list is not loaded", () => {
    expect(load({ rootPaymodeId: 1, paymodes: undefined, multiPayId: 0 })[0].mode).toBe("cash");
    expect(load({ rootPaymodeId: 9, paymodes: undefined })[0].mode).toBe("credit");
  });
});

describe("paymodesForSave", () => {
  const base = { rootPaymodeId: 3, multiPayId: 3, fallbackPaymodeId: 1, decimalPart: 3 };
  it("a single payment sends nothing", () => {
    expect(paymodesForSave({ ...base, rootPaymodeId: 1, payments: [{ paymodeId: 1, amount: "5" }] })).toEqual([]);
  });
  it("lines of one paymode are added together", () => {
    expect(paymodesForSave({ ...base, payments: [{ paymodeId: 1, amount: "0.1" }, { paymodeId: 1, amount: "0.2" }, { paymodeId: 2, amount: 5 }] })).toEqual([{ paymodeId: 1, amount: 0.3 }, { paymodeId: 2, amount: 5 }]);
  });
  it("a line with no paymode uses the fallback", () => {
    expect(paymodesForSave({ ...base, fallbackPaymodeId: 2, payments: [{ amount: "1" }] })).toEqual([{ paymodeId: 2, amount: 1 }]);
  });
});

describe("small helpers", () => {
  const fmt = (n: number) => n.toFixed(3);
  it("parseStockValue reads each shape", () => {
    expect(parseStockValue(null, fmt)).toBe("0.000");
    expect(parseStockValue(2, fmt)).toBe("2.000");
    expect(parseStockValue("5 Nos", fmt)).toBe("5 Nos");
    expect(parseStockValue({ closingStock: "3" }, fmt)).toBe("3.000");
    expect(parseStockValue({ other: 1 }, fmt)).toBe("0.000");
  });
  it("formatDateOnly keeps the calendar day", () => {
    expect(formatDateOnly("2026-11-07")).toBe("2026-11-07");
    expect(formatDateOnly("2026-11-07T23:30:00")).toBe("2026-11-07");
  });
  it("toNumber is 0 for anything that is not a number", () => {
    expect(toNumber("x")).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("1.5")).toBe(1.5);
  });
});
