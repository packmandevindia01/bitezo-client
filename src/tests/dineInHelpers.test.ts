/** Pure helpers split out of the Dine-In table orders window (2026-11-11). */
import { describe, it, expect, beforeEach } from "vitest";
import { paymodesToTenderOptions, dineInTenderOptions, dineInOrderRowText, isDineInTableReserved } from "../features/pos/terminal/utils/dineInTable";
import { dineInBillFigures, dineInBillArabic } from "../features/pos/terminal/utils/dineInBillFigures";

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("decimalPart", "3");
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { printPrice: "Exclusive", priceView: "Exclusive" } }));
});

describe("payment types", () => {
  it("Cash first, then by paymode id", () => {
    const list = [{ paymodeId: 3, paymodeName: "Credit" }, { paymodeId: 2, paymodeName: "Card" }, { paymodeId: 7, paymodeName: "Cash Box" }];
    expect(paymodesToTenderOptions(list)).toEqual([
      { id: "7", label: "Cash Box" }, { id: "2", label: "Card" }, { id: "3", label: "Credit" },
    ]);
  });

  it("table screen: Cash / Card / Credit when the master data has none", () => {
    expect(dineInTenderOptions(null).map((t) => t.label)).toEqual(["Cash", "Card", "Credit"]);
    expect(dineInTenderOptions({ data: { paymodes: [{ paymodeId: 5, paymodeName: "Benefit" }] } })).toEqual([{ id: "5", label: "Benefit" }]);
  });
});

describe("order row text", () => {
  const m = { orderId: 41, orderNo: 41, ticketNo: 5, sectionName: "Hall", tableNo: "T9", netAmount: 12.32 } as never;
  it("uses the Recall list text when there is one", () => {
    expect(dineInOrderRowText(m, { details: "Order : 41 (DineIn) (Ali)" } as never)).toBe("Order : 41 (DineIn) (Ali)");
  });
  it("builds it from the table data otherwise", () => {
    expect(dineInOrderRowText(m, undefined)).toBe("Order : 41 Ticket : 5 (DineIn) Section : Hall TableNo : T9 Amnt : 12.320");
  });
});

describe("reserved table", () => {
  it("from the table, the response or an order", () => {
    expect(isDineInTableReserved({ tableId: 1, tableName: "T1" } as never, null, null)).toBe(false);
    expect(isDineInTableReserved({ tableId: 1, tableName: "T1", status: "Reserved" } as never, null, null)).toBe(true);
    expect(isDineInTableReserved({ tableId: 1, tableName: "T1" } as never, { masterData: [{ note: "reservation 8pm" }] } as never, null)).toBe(true);
  });
});

describe("Dine-In bill figures", () => {
  const unified = {
    summary: { isBillDiscount: false, totalDiscountExcl: 0.5, subTotalExclusive: 11.75, vatAmount: 1.21, serviceCharge: 1.1, levy: 0 },
    lines: [{ productArabicName: "", variantArabic: "" }],
  } as never;
  const master = { serviceCharge: 1.1, levy: 0 };

  it("guest bill shows the discount; the settle receipt only for a bill discount", () => {
    expect(dineInBillFigures(unified, master, false, { discountOnlyForBillDiscount: false })).toMatchObject({ discount: 0.5, subTotal: 11.75, charges: 1.1, vatAmount: 1.21, netValue: 12.35 });
    expect(dineInBillFigures(unified, master, false, { discountOnlyForBillDiscount: true })).toMatchObject({ discount: 0, netValue: 12.85 });
  });

  it("Arabic when a line has an Arabic name", () => {
    expect(dineInBillArabic(unified)).toBe(false);
    expect(dineInBillArabic({ ...(unified as object), lines: [{ productArabicName: "شاي" }] } as never)).toBe(true);
  });
});
