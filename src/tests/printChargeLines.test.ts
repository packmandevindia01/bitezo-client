// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { printChargeLines } from "../features/pos/utils/printCharges";

const config = (serviceCharges: number, levy: number) =>
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges, levy } }));
const lines = (over: Partial<Parameters<typeof printChargeLines>[0]>) =>
  printChargeLines({ total: 0, serviceCharge: 0, levy: 0, netBase: 100, orderType: "DineIn", decimals: 3, ...over });

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("decimalPart", "3");
  config(10, 5);
});

describe("printChargeLines", () => {
  it("lists Service Charge first, then Levy, each with its percentage", () => {
    expect(lines({ total: 15.5, serviceCharge: 10, levy: 5.5 }).map((l) => [l.label, l.amount])).toEqual([["Service Charge (10%)", 10], ["Levy (5%)", 5.5]]);
  });

  it("shows only the charge there is", () => {
    expect(lines({ total: 5, levy: 5, orderType: "TakeOut" }).map((l) => l.label)).toEqual(["Levy (5%)"]);
    expect(lines({ total: 10, serviceCharge: 10 }).map((l) => l.label)).toEqual(["Service Charge (10%)"]);
  });

  it("prints nothing when there are no charges", () => {
    expect(lines({})).toEqual([]);
  });

  it("the two lines always add up to the bill's charges", () => {
    for (let net = 0.137; net < 40; net += 1.913) {
      const serviceCharge = net * 0.1, levy = (net + serviceCharge) * 0.05;
      const total = Math.round((serviceCharge + levy) * 1000) / 1000;
      const shown = lines({ total, serviceCharge, levy, netBase: net });
      expect(Math.round(shown.reduce((sum, l) => sum + l.amount, 0) * 1000)).toBe(Math.round(total * 1000));
    }
  });

  it("keeps the exact rate on a small bill where rounding drifts", () => {
    expect(lines({ total: 0.155, serviceCharge: 0.1, levy: 0.055, netBase: 1.003 }).map((l) => l.label)).toEqual(["Service Charge (10%)", "Levy (5%)"]);
  });

  it("a saved order with an older rate shows the rate it was charged at", () => {
    expect(lines({ total: 12.8, serviceCharge: 8, levy: 4.8, netBase: 100 }).map((l) => l.label)).toEqual(["Service Charge (8%)", "Levy (4.44%)"]);
  });

  it("decimal rates print as they are", () => {
    config(7.5, 2.25);
    expect(lines({ total: 9.92, serviceCharge: 7.5, levy: 2.42, netBase: 100 }).map((l) => l.label)).toEqual(["Service Charge (7.5%)", "Levy (2.25%)"]);
  });

  it("keeps one Charges line when nothing explains the total, so the bill adds up", () => {
    expect(lines({ total: 20, serviceCharge: 10, levy: 5.5 })).toEqual([{ label: "Charges", arabic: "الرسوم", amount: 20 }]);
    expect(lines({ total: 3 })).toEqual([{ label: "Charges", arabic: "الرسوم", amount: 3 }]);
  });

  it("uses the configured rates when the saved levy is missing or stale", () => {
    expect(lines({ total: 0.5, levy: 0, netBase: 10, orderType: "TakeOut" }).map((l) => [l.label, l.amount])).toEqual([["Levy (5%)", 0.5]]);
    expect(lines({ total: 0.5, levy: 1, netBase: 10, orderType: "TakeOut" }).map((l) => [l.label, l.amount])).toEqual([["Levy (5%)", 0.5]]);
    expect(lines({ total: 15.5, netBase: 100 }).map((l) => [l.label, l.amount])).toEqual([["Service Charge (10%)", 10], ["Levy (5%)", 5.5]]);
  });

  it("no percentage when there is no base to work it out from", () => {
    expect(lines({ total: 1.5, serviceCharge: 1, levy: 0.5, netBase: 0 }).map((l) => l.label)).toEqual(["Service Charge", "Levy"]);
  });

  it("works with 2 decimal currencies", () => {
    localStorage.setItem("decimalPart", "2");
    const shown = printChargeLines({ total: 1.55, serviceCharge: 1, levy: 0.55, netBase: 10, orderType: "DineIn", decimals: 2 });
    expect(shown.map((l) => [l.label, l.amount])).toEqual([["Service Charge (10%)", 1], ["Levy (5%)", 0.55]]);
  });
});
