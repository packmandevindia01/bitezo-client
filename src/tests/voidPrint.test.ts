/**
 * Bug: Price View = Exclusive, Print Price = Inclusive. Punch an order → Recall → Edit → decrease two
 * items → Order. The VOID ITEMS print showed EXCLUSIVE amounts.
 *
 * Cause: the void row amount was `item.price × qty` (the SCREEN price) and the void print had no engine
 * result (and VAT 0), so it could not follow Print Price.
 * Fix: voided units are priced by the engine (priceVoidedPortion); the stored amount is exclusive (R9)
 * and the print reads the PricedLine like any KOT line.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { calculateOrder, getBillingConfigForOrder, toPricingSettings } from "../features/pos/terminal/utils/billing";
import { priceVoidedPortion, sumPricedLines } from "../features/pos/pricing";
import { generateKotHtml } from "../features/pos/utils/kotTemplate";
import { buildKotRowLines } from "../features/pos/utils/printPricing";
import reducer, { addVoidProduct } from "../features/pos/terminal/store/posSlice";

const ABCD = { id: 9, name: "ABCd", price: 100, vatValue: 10, isIncl: true };
const FACTOR = 1.1 * 1.05 * 1.1; // Dine-In: SC 10 %, levy 5 %, VAT 10 %

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 10, levy: 5 } }));
  localStorage.setItem("priceView", "Exclusive"); // screen
  localStorage.setItem("printPrice", "Inclusive"); // print
  localStorage.setItem("decimalPart", "3");
  localStorage.setItem("kotArabic", "Disable");
});

const savedLine = (extras: any[] = []) =>
  calculateOrder(
    [{ uniqueId: "a", productId: 9, quantity: 3, price: 100, isIncl: true, product: ABCD, isExisting: true, mapId: 1, extras }],
    { orderType: "DineIn", orderTypeId: 1 }
  ).lines[0];

const settings = () => toPricingSettings(getBillingConfigForOrder("DineIn", null));

/** Same shape usePosCartActions builds for the VOID ITEMS print. */
const voidPrintRow = (vp: { qty: number; amount: number; pricedLine: any }) => ({
  productId: 9,
  quantity: vp.qty,
  price: vp.amount / vp.qty,
  lineTotal: vp.amount,
  product: { id: 9, name: "ABCd", price: vp.amount / vp.qty, categoryId: 0 },
  pricedLine: vp.pricedLine,
  vatAmount: vp.pricedLine.vatAmount,
  netAmount: vp.pricedLine.lineNet,
  extras: [],
  modifiers: [],
  messages: [],
});

describe("void pricing (engine)", () => {
  it("the screen shows exclusive prices (this is what used to be stored / printed)", () => {
    expect(savedLine().price).toBeCloseTo(100 / FACTOR, 6);
  });

  it("2 voided units: stored amount is exclusive, inclusive amount is the catalog price", () => {
    const p = priceVoidedPortion(savedLine().pricedLine!, 2, [], settings());
    expect(p.productBase).toBeCloseTo(200 / FACTOR, 6); // backend voidProducts.amount
    expect(p.grossAmount).toBeCloseTo(200, 6);
    expect(p.lineNet).toBeCloseTo(200, 6);
    expect(p.vatAmount).toBeGreaterThan(0);
  });

  it("voided extra: exclusive extra amount for the backend", () => {
    const line = savedLine([{ id: 1, name: "aa", price: 5, qty: 1, typeId: 2 }]).pricedLine!;
    const p = priceVoidedPortion(line, 1, [{ price: 5, qty: 1 }], settings());
    expect(p.productBase).toBeCloseTo(100 / FACTOR, 6);
    expect(p.extras[0].baseAmount).toBeCloseTo(5 / FACTOR, 6); // backend voidModifiers.amount
    expect(p.lineNet).toBeCloseTo(105, 6);
  });

  it("decreasing one at a time twice = voiding two at once (merged void row)", () => {
    const line = savedLine().pricedLine!;
    const once = priceVoidedPortion(line, 1, [], settings());
    const merged = sumPricedLines(once, once);
    const two = priceVoidedPortion(line, 2, [], settings());
    expect(merged.qty).toBe(2);
    expect(merged.amount).toBeCloseTo(two.amount, 6);
    expect(merged.lineNet).toBeCloseTo(two.lineNet, 6);
    expect(merged.vatAmount).toBeCloseTo(two.vatAmount, 6);
  });

  it("store: two decreases on the same saved line keep a summed engine result", () => {
    const line = savedLine().pricedLine!;
    const once = priceVoidedPortion(line, 1, [], settings());
    let state = reducer(undefined, { type: "@@init" });
    state = reducer(state, addVoidProduct({ productId: 9, unitId: 1, qty: 1, amount: once.productBase, mapId: 1, pricedLine: once }));
    state = reducer(state, addVoidProduct({ productId: 9, unitId: 1, qty: 1, amount: once.productBase, mapId: 1, pricedLine: once }));
    expect(state.voidProducts).toHaveLength(1);
    expect(state.voidProducts[0].qty).toBe(2);
    expect(state.voidProducts[0].amount).toBeCloseTo(200 / FACTOR, 6);
    expect(state.voidProducts[0].pricedLine!.lineNet).toBeCloseTo(200, 6);
  });
});

describe("VOID ITEMS print follows Print Price", () => {
  it("Print Price Inclusive → 200.000 (was 157.418, the exclusive screen value)", async () => {
    const p = priceVoidedPortion(savedLine().pricedLine!, 2, [], settings());
    const html = await generateKotHtml([voidPrintRow({ qty: 2, amount: p.productBase, pricedLine: p })] as any, {
      orderNo: "1", ticketNo: "1", waiter: "w", orderType: "DineIn", printPrice: "Inclusive", headerTitle: "VOID ITEMS",
    } as any);
    expect(html).toMatch(/>\s*200\.000\s*</);
    expect(html).not.toMatch(/157\.418/);
  });

  it("Print Price Exclusive → 157.418", async () => {
    localStorage.setItem("printPrice", "Exclusive");
    const p = priceVoidedPortion(savedLine().pricedLine!, 2, [], settings());
    const html = await generateKotHtml([voidPrintRow({ qty: 2, amount: p.productBase, pricedLine: p })] as any, {
      orderNo: "1", ticketNo: "1", waiter: "w", orderType: "DineIn", printPrice: "Exclusive", headerTitle: "VOID ITEMS",
    } as any);
    expect(html).toMatch(/>\s*157\.418\s*</);
  });
});

describe("KOT rows that are not a live cart", () => {
  const row = (over: Record<string, unknown>) => ({ productId: 9, quantity: 2, product: { id: 9, name: "ABCd" }, extras: [], modifiers: [], messages: [], ...over });

  it("a void without an engine result prints the amounts it carries", () => {
    const [line] = buildKotRowLines([row({ price: 5, lineTotal: 10, netAmount: 11.55 })]);
    expect(line.getAmount(false)).toBe(10);
    expect(line.getAmount(true)).toBe(11.55);
    expect(line.quantity).toBe(2);
    expect(line.productName).toBe("ABCd");
  });

  it("works out nothing from tax: with no netAmount both views print the same", () => {
    const [line] = buildKotRowLines([row({ price: 5, lineTotal: 10 })]);
    expect(line.getAmount(true)).toBe(10);
  });

  it("uses price x quantity when the row has no total", () => {
    expect(buildKotRowLines([row({ price: 5 })])[0].getAmount(false)).toBe(10);
  });

  it("rows already priced from the saved order stay exactly as they are", () => {
    const priced = { isUnifiedPricingLine: true, productId: 9, quantity: 2, productName: "ABCd", getAmount: () => 42, extras: [], modifiers: [], messages: [] };
    expect(buildKotRowLines([priced])[0]).toBe(priced);
  });

  it("an empty list gives no lines", () => {
    expect(buildKotRowLines([])).toEqual([]);
  });

  it("the recall reprint prints the saved amount", async () => {
    const priced = { isUnifiedPricingLine: true, productId: 9, quantity: 2, productName: "ABCd", getAmount: () => 42, extras: [], modifiers: [], messages: [] };
    const html = await generateKotHtml([priced] as any, { orderNo: "1", ticketNo: "1", waiter: "w", orderType: "DineIn", printPrice: "Exclusive" } as any);
    expect(html).toMatch(/>\s*42\.000\s*</);
  });
});
