/** Pure pieces split out of the Recall / Settled details windows (2026-11-11). */
import { describe, it, expect } from "vitest";
import { dedupeModifierRows, modifierRowsOfLine, classifyLineModifiers } from "../features/pos/terminal/components/modals/savedOrder/lineModifiers";
import { parseRecallListText } from "../features/pos/terminal/utils/recallListText";
import { mergeModifiersData } from "../features/pos/terminal/utils/loadSettledOrder";

describe("modifier rows of a saved order", () => {
  const rows = [
    { mapId: 1, modifierId: 11, modifierName: "Cheese", price: 0.25, status: "extras" },
    { mapId: 1, modifierId: 11, modifierName: "Cheese", price: 0.25, status: "extras" }, // SQL-join duplicate
    { mapId: 1, modifierId: 12, modifierName: "Less salt", price: 0, typeId: 1 },
    { mapId: 1, modifierId: 14, modifierName: "Sauce", price: 0, typeId: 2 },           // typed extra, free
    { mapId: 2, modifierId: 13, modifierName: "Very hot", price: 0, status: "message" },
  ];

  it("drops SQL-join duplicates (same line + modifier)", () => {
    expect(dedupeModifierRows(rows)).toHaveLength(4);
    expect(dedupeModifierRows([])).toEqual([]);
  });

  it("finds a line's rows by mapId", () => {
    expect(modifierRowsOfLine(rows, 2).map((m) => m.modifierId)).toEqual([13]);
    expect(modifierRowsOfLine(rows, "1")).toHaveLength(4);
    expect(modifierRowsOfLine(rows, undefined)).toEqual([]);
  });

  it("splits extras, modifiers and messages", () => {
    const { extras, standardMods, messages } = classifyLineModifiers(dedupeModifierRows(rows));
    expect(extras.map((m) => m.modifierName)).toEqual(["Cheese", "Sauce"]);
    expect(standardMods.map((m) => m.modifierName)).toEqual(["Less salt"]);
    expect(messages.map((m) => m.modifierName)).toEqual(["Very hot"]);
  });

  it("settled merge: one row per modifier, a missing price taken from the other source", () => {
    const merged = mergeModifiersData([{ mapId: 1, modifierId: 11, price: 0 }], [{ mapId: 1, modifierId: 11, price: 0.5, modifierName: "Cheese" }, { mapId: 2, modifierId: 9, price: 0 }]);
    expect(merged).toHaveLength(2);
    expect(merged[0]).toMatchObject({ modifierId: 11, price: 0.5, modifierName: "Cheese" });
  });
});

describe("recall list text fallback", () => {
  it("reads order, ticket, type, customer, waiter and amount from the list row", () => {
    const o = parseRecallListText("Order : 5 Ticket : 1 07:52:49 AM (DineIn) (CASH CUSTOMER) (Ahmed) Section : UPSTAIR TableNo : T1 Amnt : 9.800", 5);
    expect(o).toMatchObject({ orderNo: "5", ticketNo: "1", orderTypeName: "DineIn", customerName: "CASH CUSTOMER", employeeName: "Ahmed", netAmount: 9.8, voucherDate: "07:52:49 AM" });
    expect(o.details).toEqual([{ productId: 1, productName: "Ordered Items", qty: 1, price: 9.8, netAmount: 9.8 }]);
    expect(o.deliveryDetails).toBeUndefined();
  });

  it("no text, no fallback", () => {
    expect(parseRecallListText("", 5)).toBeNull();
    expect(parseRecallListText(undefined, 5)).toBeNull();
  });
});
