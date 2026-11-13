import { describe, it, expect } from "vitest";
import {
  providerNameFromOrderType,
  orderTypeNameFromId,
  isProviderOrderTypeId,
  orderTypeFromListDetails,
  isProviderOrderRow,
} from "../features/pos/utils/providerOrderType";
import { fallbackOrderTypeByName } from "../features/pos/terminal/store/posSlice";

describe("provider order types (server list: 1-4 standard, then each provider by its own id)", () => {
  it("ids above 4 are providers; there is no Coming type", () => {
    expect(orderTypeNameFromId(1)).toBe("DineIn");
    expect(orderTypeNameFromId(4)).toBe("Delivery");
    expect(orderTypeNameFromId(5)).toBe("Providers");
    expect(orderTypeNameFromId(6)).toBe("Providers"); // Zomato, not "Coming"
    expect(orderTypeNameFromId(0)).toBe("");
    expect(isProviderOrderTypeId(6)).toBe(true);
    expect(isProviderOrderTypeId(4)).toBe(false);
  });

  it("a provider name is a provider order, not DineIn; Coming is a delivery", () => {
    expect(fallbackOrderTypeByName("Zomato").orderType).toBe("Providers");
    expect(fallbackOrderTypeByName("Coming")).toEqual({ orderTypeId: 4, orderType: "Delivery" });
    expect(fallbackOrderTypeByName("DineIn").orderTypeId).toBe(1);
    expect(fallbackOrderTypeByName("").orderTypeId).toBe(1);
    expect(fallbackOrderTypeByName("TakeOut").orderTypeId).toBe(2);
    expect(fallbackOrderTypeByName("DriveThru").orderTypeId).toBe(3);
    expect(fallbackOrderTypeByName("Delivery").orderTypeId).toBe(4);
  });

  it("providerNameFromOrderType gives the name only for providers", () => {
    expect(providerNameFromOrderType(" Zomato ")).toBe("Zomato");
    for (const t of ["DineIn", "TAKE OUT", "DriveThru", "DELIVERY", "Providers", "Coming", "", null, undefined]) {
      expect(providerNameFromOrderType(t as any)).toBe("");
    }
  });

  it("recall list rows: provider rows are found by id or by the name in the line", () => {
    const zomato = "Order : 61 Ticket : 61 01:18:25 AM (Zomato) (Rahul) (Waiter) No : 012 Amnt : 2.310";
    const dineIn = "Order : 58 Ticket : 58 01:09:37 AM (DineIn) (CASH CUSTOMER) (Waiter) Section : Upstair";
    expect(orderTypeFromListDetails(zomato)).toBe("Zomato");
    expect(isProviderOrderRow({ details: zomato })).toBe(true);
    expect(isProviderOrderRow({ details: dineIn })).toBe(false);
    expect(isProviderOrderRow({ orderTypeId: 6 })).toBe(true);
    expect(isProviderOrderRow({ orderTypeId: 2, details: zomato })).toBe(false);
    expect(isProviderOrderRow({ orderType: "Swiggy" })).toBe(true);
  });
});
