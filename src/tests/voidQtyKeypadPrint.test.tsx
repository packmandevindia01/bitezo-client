// @vitest-environment jsdom
/**
 * Voiding through the Qty keypad used to send the kitchen a row with no engine result, so the VOID ITEMS print
 * relied on the old tax guess. It now carries the same engine result as the Remove and Decrement voids.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { usePosVoidFlow } from "../features/pos/terminal/hooks/usePosVoidFlow";
import { generateKotHtml } from "../features/pos/utils/kotTemplate";

vi.mock("../app/hooks", () => ({
  useAppSelector: (pick: (state: unknown) => unknown) => pick({ pos: { selectedOrderTypeName: "DineIn", editingOrderRates: null } }),
}));

const PRODUCT = { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true };

const voidRowHtml = async (printPrice: "Inclusive" | "Exclusive") => {
  localStorage.setItem("printPrice", printPrice);
  const item = calculateOrder(
    [{ uniqueId: "a", productId: 9, quantity: 3, price: 100, isIncl: true, product: PRODUCT, isExisting: true, mapId: 1, extras: [] }] as never,
    { orderType: "DineIn", orderTypeId: 1 }
  ).lines[0];
  const { result } = renderHook(() => usePosVoidFlow({ cartDetails: [item], editingOrderId: 1 } as never));
  const pricedLine = result.current.priceVoidedUnits(item, 2, []);
  return generateKotHtml(
    [{ productId: 9, quantity: 2, product: { id: 9, name: "ABCd" }, pricedLine, vatAmount: pricedLine?.vatAmount, extras: [], modifiers: [], messages: [] }] as never,
    { orderNo: "1", ticketNo: "1", waiter: "w", orderType: "DineIn", printPrice, headerTitle: "VOID ITEMS" } as never
  );
};

describe("VOID ITEMS print from the Qty keypad", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 10, levy: 5 } }));
    localStorage.setItem("decimalPart", "3");
  });

  it.each(["Inclusive", "Exclusive"])("screen in %s view, Print Price Inclusive prints 200.000", async (view) => {
    localStorage.setItem("priceView", view);
    expect(await voidRowHtml("Inclusive")).toMatch(/>\s*200\.000\s*</);
  });

  it.each(["Inclusive", "Exclusive"])("screen in %s view, Print Price Exclusive prints 157.418", async (view) => {
    localStorage.setItem("priceView", view);
    expect(await voidRowHtml("Exclusive")).toMatch(/>\s*157\.418\s*</);
  });
});
