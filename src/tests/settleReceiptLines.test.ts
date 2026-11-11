/** Terminal settle receipt: saved detail rows → receipt lines (the path used when settled data cannot be priced). */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { mapSettledDetailsToPrintItems } from "../features/pos/terminal/utils/settleReceiptData";

vi.mock("../features/general/employee/services/employeeService", () => ({ getEmployeeNames: async () => [], getEmployeeById: async () => null, employeeService: {} }));

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { printPrice: "Exclusive", priceView: "Exclusive" } }));
});

describe("mapSettledDetailsToPrintItems", () => {
  const detailsData = [
    { mapId: 2, productId: 2, productName: "Fries", qty: 1, price: 5, amount: 5, netAmount: 5.5, vatAmount: 0.5, unitId: 1 },
    { mapId: 1, productId: 1, productName: "Burger", qty: 2, price: 10, amount: 20, netAmount: 20.35, discAmount: 1.5, vatAmount: 1.85, unitId: 1 },
  ];
  const modifiersData = [
    { mapId: 1, modifierId: 11, modifierName: "Cheese", price: 0.5, qty: 1, typeId: 2, status: "extras" },
    { mapId: 1, modifierId: 12, modifierName: "Less salt", price: 0, qty: 1, typeId: 1, status: "modifier" },
    { mapId: 1, modifierId: 13, modifierName: "Very hot", price: 0, status: "message" },
  ];
  const cartDetails = [
    { mapId: 1, productId: 1, unitId: 1, quantity: 2, price: 10, basePrice: 10, isIncl: false, baseDiscount: 1.5, lineTotal: 20.35, product: { name: "Burger" } },
    { mapId: 2, productId: 2, unitId: 1, quantity: 1, price: 5, basePrice: 5, isIncl: false, lineTotal: 5.5, product: { name: "Fries" } },
  ];

  it("matches each saved line to its cart line, keeps the saved order and the item discount", () => {
    const lines = mapSettledDetailsToPrintItems({ detailsData, modifiersData, cartDetails, isBillDisc: false });
    expect(lines.map((l) => [l.product.name, l.quantity, l.itemDiscount])).toEqual([["Burger", 2, 1.5], ["Fries", 1, 0]]);
    expect(lines[0].extras.map((e: { name: string }) => e.name)).toEqual(["Cheese"]);
    expect(lines[0].modifiers.map((m: { name: string }) => m.name)).toEqual(["Less salt"]);
    expect(lines[0].messages.map((m: { name: string }) => m.name)).toEqual(["Very hot"]);
    expect(lines).toMatchSnapshot();
  });

  it("a bill discount is not shown on the lines", () => {
    const lines = mapSettledDetailsToPrintItems({ detailsData, modifiersData, cartDetails, isBillDisc: true });
    expect(lines.every((l) => l.itemDiscount === 0)).toBe(true);
  });
});
