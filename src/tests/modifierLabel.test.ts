/**
 * Modifiers show as "<TYPE> <NAME>" in every preview and print ("NO SUGAR", "TEST TEST1").
 * Bug: type "TEST" + modifier "TEST1" printed "* TEST: 1" (the name was cut because it starts with the
 * same letters as the type).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { formatModifierLabel, modifierLabelOf, rememberModifierTypes } from "../features/pos/utils/modifierLabel";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { generateKotHtml } from "../features/pos/utils/kotTemplate";
import { generateGuestPrintHtml } from "../features/pos/utils/guestPrintTemplate";
import { buildPrintPricing } from "../features/pos/utils/printPricing";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true } }));
  localStorage.setItem("decimalPart", "3");
  localStorage.setItem("kotArabic", "Disable");
  localStorage.setItem("billArabic", "Disable");
});

const text = (html: string) =>
  html.replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");

describe("formatModifierLabel", () => {
  it("type + name", () => {
    expect(formatModifierLabel("No", "Sugar")).toBe("No Sugar");
    expect(formatModifierLabel("With", "Sugar")).toBe("With Sugar");
    expect(formatModifierLabel("TEST", "TEST1")).toBe("TEST TEST1"); // was "TEST: 1"
  });
  it("does not repeat a type the name already starts with (whole word)", () => {
    expect(formatModifierLabel("No", "No Sugar")).toBe("No Sugar");
    expect(formatModifierLabel("No", "No: Sugar")).toBe("No Sugar");
    expect(formatModifierLabel("No", "No-Sugar")).toBe("No Sugar");
    expect(formatModifierLabel("No", "Nooo")).toBe("No Nooo");
  });
  it("no type / same as type / upper case / old qty", () => {
    expect(formatModifierLabel("", "Sugar")).toBe("Sugar");
    expect(formatModifierLabel("Spicy", "spicy")).toBe("Spicy");
    expect(formatModifierLabel("No", "Sugar", { upperCase: true })).toBe("NO SUGAR");
    expect(formatModifierLabel("No", "Sugar", { qty: 1 })).toBe("No Sugar");
    expect(formatModifierLabel("No", "Sugar", { qty: 2 })).toBe("2 x No Sugar"); // old saved orders only
  });
  it("saved row without a type name uses the type remembered for its id", () => {
    expect(modifierLabelOf({ modifierId: 5, modifierName: "Sugar", typeName: "" })).toBe("Sugar");
    rememberModifierTypes([{ id: 5 }], "No");
    expect(modifierLabelOf({ modifierId: 5, modifierName: "Sugar", typeName: "" })).toBe("No Sugar");
  });
});

const cart = () =>
  calculateOrder(
    [{
      uniqueId: "a", productId: 9, quantity: 1, price: 10, isIncl: true,
      product: { id: 9, name: "ABCD", price: 10, vatValue: 10, isIncl: true },
      modifiers: [
        { id: 5, name: "TEST1", qty: 1, typeId: 3, typeName: "TEST" },
        { id: 6, name: "Sugar", qty: 1, typeId: 4, typeName: "No" },
      ],
    }],
    { orderType: "TakeOut", orderTypeId: 2 }
  ).lines;

const printData = { orderNo: "1", ticketNo: "7", waiter: "w", orderType: "TakeOut" } as any;

describe("prints show the full modifier label", () => {
  it("KOT (live cart)", async () => {
    const t = text(await generateKotHtml(cart() as any, printData));
    expect(t).toContain("* TEST TEST1");
    expect(t).toContain("* NO SUGAR");
    expect(t).not.toMatch(/TEST: 1\b/);
  });

  it("guest bill (live cart)", async () => {
    const t = text(await generateGuestPrintHtml(cart() as any, printData));
    expect(t).toContain("* TEST TEST1");
    expect(t).toContain("* NO SUGAR");
  });

  it("saved order (recall / settled print) — type from the row, or remembered when the row has none", () => {
    rememberModifierTypes([{ id: 6 }], "No");
    const saved = {
      masterData: { orderId: 1, orderNo: 1, ticketNo: 7, orderType: "TakeOut", netAmount: 10 },
      detailsData: [{ productId: 9, productName: "ABCD", qty: 1, price: 9.0909091, amount: 9.0909091, vatAmount: 0.9090909, mapId: 1 }],
      modifiersData: [
        { mapId: 1, qty: 1, modifierId: 5, modifierName: "TEST1", typeName: "TEST", price: 0 },
        { mapId: 1, qty: 1, modifierId: 6, modifierName: "Sugar", typeName: "", price: 0 },
      ],
    };
    const mods = buildPrintPricing(saved, { dataView: "Exclusive", printPrice: "Exclusive", orderType: "TakeOut" }).lines[0].modifiers;
    expect(mods.map((m) => modifierLabelOf(m, { upperCase: true }))).toEqual(["TEST TEST1", "NO SUGAR"]);
  });
});
