/**
 * Phase 0 foundations: shared/api/unwrap, shared/config/settings, path aliases.
 * Imports use the "@shared" alias on purpose — this file also proves the alias resolves in Vitest.
 */
import { describe, it, expect } from "vitest";
import { unwrapBody, unwrapData, unwrapEnvelope, unwrapStrict } from "@shared/api/unwrap";
import { readJson, readNumber, readString, getPosConfigs, getPosConfigValue, getDecimals, getCurrencySymbol } from "@shared/config/settings";
import { round } from "@shared/lib/money";
import { toLocalDateString } from "@shared/lib/date";
import * as legacyMoney from "../utils/money";
import legacyHttp from "../api/axiosInstance";
import http from "@shared/api/http";

const res = <B,>(data: B) => Promise.resolve({ data });

describe("shared/api/unwrap — same behaviour as the copies it replaced", () => {
  it("unwrapBody returns the raw body", async () => {
    expect(await unwrapBody(res({ isSuccess: false, data: 1 }))).toEqual({ isSuccess: false, data: 1 });
    expect(await unwrapBody(res([1, 2]))).toEqual([1, 2]);
  });

  it("unwrapData returns body.data for an envelope, else the body; never throws", async () => {
    expect(await unwrapData(res({ data: { a: 1 } }))).toEqual({ a: 1 });
    expect(await unwrapData(res({ isSuccess: false, data: null }))).toBeNull();
    expect(await unwrapData(res([1]))).toEqual([1]);
  });

  it("unwrapEnvelope throws only when isSuccess === false", async () => {
    expect(await unwrapEnvelope(res({ isSuccess: true, data: 5 }))).toBe(5);
    expect(await unwrapEnvelope(res({ data: 7 }))).toBe(7);
    expect(await unwrapEnvelope(res({ items: [] } as any))).toEqual({ items: [] });
    await expect(unwrapEnvelope(res({ isSuccess: false, message: "No permission" }))).rejects.toThrow("No permission");
    await expect(unwrapEnvelope(res({ isSuccess: false, message: null }))).rejects.toThrow("null");
  });

  it("unwrapStrict throws unless isSuccess is truthy", async () => {
    expect(await unwrapStrict(res({ isSuccess: true, data: "ok" }))).toBe("ok");
    await expect(unwrapStrict(res({ data: 1 }))).rejects.toThrow("An unexpected error occurred");
    await expect(unwrapStrict(res({ isSuccess: false, message: "Bad" }))).rejects.toThrow("Bad");
  });
});

describe("shared/config/settings", () => {
  const store = (o: Record<string, string>) => ({ getItem: (k: string) => (k in o ? o[k] : null) });

  it("reads JSON / strings / numbers safely", () => {
    expect(readJson("x", { d: 1 }, store({ x: "{bad json" }))).toEqual({ d: 1 });
    expect(readJson("x", null, store({ x: '{"a":2}' }))).toEqual({ a: 2 });
    expect(readString("missing", "fb", store({}))).toBe("fb");
    expect(readNumber("n", 9, store({ n: "abc" }))).toBe(9);
    expect(readNumber("n", 9, store({ n: "0" }))).toBe(0);
  });

  it("unwraps posConfigs.configs or uses the object itself", () => {
    expect(getPosConfigs(store({ posConfigs: '{"configs":{"vatStatus":true}}' }))).toEqual({ vatStatus: true });
    expect(getPosConfigs(store({ posConfigs: '{"vatStatus":false}' }))).toEqual({ vatStatus: false });
    expect(getPosConfigs(store({}))).toEqual({});
    expect(getPosConfigValue("levy", 0, store({ posConfigs: '{"configs":{"levy":5}}' }))).toBe(5);
    expect(getPosConfigValue("levy", 0, store({ posConfigs: '{"configs":{"levy":null}}' }))).toBe(0);
  });

  it("decimals: stored value, else derived from the currency", () => {
    expect(getDecimals(store({ decimalPart: "2", currencySymbol: "BHD" }))).toBe(2);
    expect(getDecimals(store({ currencySymbol: "BHD" }))).toBe(3);
    expect(getDecimals(store({ currencySymbol: "SAR" }))).toBe(2);
    expect(getCurrencySymbol(store({}))).toBe("BHD");
  });
});

describe("moves are transparent (old import paths still work)", () => {
  it("utils/money and api/axiosInstance re-export the shared modules", () => {
    expect(legacyMoney.round).toBe(round);
    expect(legacyHttp).toBe(http);
    expect(toLocalDateString(new Date(2026, 0, 2, 0, 30))).toBe("2026-01-02");
  });
});

import { getTerminalBranchId, getSystemBranchId, getUserBranchId, getSystemCounterId, getTerminalId } from "@shared/config/device";
import { setTokenRefresher } from "@shared/api/http";

describe("shared/config/device (Phase 2b) — same results as the inline chains it replaced", () => {
  const store = (o: Record<string, string>) => ({ getItem: (k: string) => (k in o ? o[k] : null) });
  const inline = (o: Record<string, string>) =>
    Number(o.systemBranchId ?? null) || Number(o.activeBranchId ?? null) || Number(o.branchId ?? null);

  it("terminal branch: registered → login → user → 0", () => {
    const cases: Record<string, string>[] = [
      {}, { branchId: "4" }, { activeBranchId: "3", branchId: "4" }, { systemBranchId: "2", activeBranchId: "3" },
      { systemBranchId: "abc", activeBranchId: "5" }, { systemBranchId: "0", branchId: "6" }, { systemBranchId: "" },
    ];
    for (const c of cases) expect(getTerminalBranchId(store(c))).toBe(inline(c));
    expect(getTerminalBranchId(store({})) || 1).toBe(1); // call sites keep their own fallback (1 = All)
  });

  it("single reads", () => {
    expect(getSystemBranchId(store({ systemBranchId: "2" }))).toBe(2);
    expect(getSystemBranchId(store({}))).toBe(0);
    expect(getUserBranchId(store({ activeBranchId: "", branchId: "7" }))).toBe(7);
    expect(getSystemCounterId(store({ systemCounterId: "9" }))).toBe(9);
    expect(getTerminalId(store({}))).toBe("");
  });

  it("the HTTP client takes its token refresher from the outside (no feature import)", () => {
    expect(typeof setTokenRefresher).toBe("function");
    expect(() => setTokenRefresher(async () => ({ accessToken: "x" }))).not.toThrow();
    setTokenRefresher(null);
  });
});
