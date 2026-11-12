// @vitest-environment jsdom
/**
 * Extras / Modifiers unit rail (owner's request 2026-11-12, prototype "EXTRAS LIST" with 1…5 on the left).
 * Line DEMO × 5: pick 3, tap Sugar → DEMO × 3 with Sugar × 3 (one per unit) + DEMO × 2 as its own line; pick 2 on
 * that line, tap Salt → Salt × 2. Modifiers the same. Nothing picked = as before (a tap adds one to the whole line).
 * Lines already sent to the kitchen are never split (owner's choice "a").
 */
import { createElement } from "react";
import { Provider } from "react-redux";
import { render, screen, fireEvent, waitFor, cleanup, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { store } from "../app/store";
import { PosExtrasModifierModal, type LineCustomization, type LineSplit } from "../features/pos/terminal/components/modals/product/PosExtrasModifierModal";
import { addCustomizationUnits, canSplitLine, splitCustomizations } from "../features/pos/terminal/utils/lineCustomization";
import posReducer, { addToCart, setItemCustomizations, setItemDiscount, splitCartLine } from "../features/pos/terminal/store/posSlice";
import { calculateOrder } from "../features/pos/terminal/utils/billing";
import { menuApi } from "../features/pos/services/menuApi";

vi.mock("../features/pos/services/menuApi", async (orig) => {
  const real = await orig<{ menuApi: object }>();
  return {
    ...real,
    menuApi: { ...real.menuApi, getExtraTypes: vi.fn(), getExtras: vi.fn(), getModifierTypes: vi.fn(), getModifiers: vi.fn() },
  };
});
const mock = (fn: unknown) => fn as ReturnType<typeof vi.fn>;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, serviceCharges: 0, levy: 0 } }));
  localStorage.setItem("priceView", "Inclusive");
  localStorage.setItem("discCalc", "Inclusive");
  localStorage.setItem("decimalPart", "3");
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => cleanup());

const sugar = (qty: number) => ({ id: 31, name: "Sugar", price: 0.5, qty, typeId: 1 });
const salt = (qty: number) => ({ id: 32, name: "Salt", price: 0.25, qty, typeId: 1 });
const noIce = (qty: number) => ({ id: 41, name: "Ice", qty, typeId: 5, typeName: "No" });
const product = { id: 7, name: "Demo", price: 2, vatValue: 0, isIncl: true, categoryId: 1 };
const takeOut = { orderType: "TakeOut", orderTypeId: 2 };

type State = ReturnType<typeof posReducer>;
const run = (state: State, ...actions: Parameters<typeof posReducer>[1][]) => actions.reduce(posReducer, state);
const cartOf5 = () => run(posReducer(undefined, { type: "@@init" } as never),
  addToCart({ uniqueId: "demo", productId: 7, quantity: 5, price: 2, isIncl: true }));
const priced = (state: State) => calculateOrder(state.cartItems.map((i) => ({ ...i, product })) as never, takeOut as never);

describe("helpers", () => {
  it("addCustomizationUnits adds one per unit picked", () => {
    expect(addCustomizationUnits([], sugar(1), 3)).toEqual([sugar(3)]);
    expect(addCustomizationUnits([sugar(3)], sugar(1), 3)).toEqual([sugar(6)]);
  });

  it("splitCustomizations moves an even share and keeps the total of every extra", () => {
    const { remaining, split } = splitCustomizations({ extras: [sugar(5), salt(1)], modifiers: [noIce(10)], messages: [{ name: "Hot" }] }, 5, 3);
    expect(split.extras).toEqual([sugar(3)]);
    expect(remaining.extras).toEqual([sugar(2), salt(1)]);
    expect(split.modifiers).toEqual([noIce(6)]);
    expect(remaining.modifiers).toEqual([noIce(4)]);
    expect(split.messages).toEqual([{ name: "Hot" }]);
    expect(remaining.messages).toEqual([{ name: "Hot" }]);
  });

  it("canSplitLine: new lines of 2+ whole units only", () => {
    expect(canSplitLine({ quantity: 5 })).toBe(true);
    expect(canSplitLine({ quantity: 1 })).toBe(false);
    expect(canSplitLine({ quantity: 2.5 })).toBe(false);
    expect(canSplitLine({ quantity: 5, isExisting: true })).toBe(false);
    expect(canSplitLine({ quantity: 5, mapId: 9 })).toBe(false);
  });
});

describe("splitCartLine", () => {
  it("moves units to a new line right after it, same price", () => {
    const state = run(cartOf5(), splitCartLine({ uniqueId: "demo", newUniqueId: "demo~1", quantity: 3 }));
    expect(state.cartItems.map((i) => [i.uniqueId, i.quantity, i.price])).toEqual([["demo", 2, 2], ["demo~1", 3, 2]]);
  });

  it("owner's example: 5 Demo → 3 with Sugar × 3, 2 with Salt × 2; total = 10 + 1.5 + 0.5", () => {
    const state = run(cartOf5(),
      splitCartLine({ uniqueId: "demo", newUniqueId: "demo~1", quantity: 3 }),
      setItemCustomizations({ uniqueId: "demo~1", extras: [sugar(3)] }),
      setItemCustomizations({ uniqueId: "demo", extras: [salt(2)] }),
    );
    expect(state.cartItems.map((i) => [i.quantity, i.extras])).toEqual([[2, [salt(2)]], [3, [sugar(3)]]]);
    expect(priced(state).summary.grandTotal).toBeCloseTo(12, 6);
  });

  it("splitting alone never changes the total, also with an amount item discount (shared pro-rata)", () => {
    const before = run(cartOf5(), setItemDiscount({ uniqueId: "demo", value: 1, type: "amount" }));
    const after = run(before, splitCartLine({ uniqueId: "demo", newUniqueId: "demo~1", quantity: 3 }));
    expect(after.cartItems.map((i) => i.discountValue)).toEqual([0.4, 0.6].map((v) => expect.closeTo(v, 9)));
    expect(priced(after).summary.grandTotal).toBeCloseTo(priced(before).summary.grandTotal, 9);
    expect(priced(after).summary.grandTotal).toBeCloseTo(9, 9);
  });

  it("a % item discount stays the same % on both lines", () => {
    const after = run(cartOf5(), setItemDiscount({ uniqueId: "demo", value: 10, type: "percentage" }),
      splitCartLine({ uniqueId: "demo", newUniqueId: "demo~1", quantity: 3 }));
    expect(after.cartItems.map((i) => [i.discountValue, i.discountType])).toEqual([[10, "percentage"], [10, "percentage"]]);
    expect(priced(after).summary.grandTotal).toBeCloseTo(9, 9);
  });

  it("does nothing for a saved line, all units, zero, or a fraction", () => {
    const base = cartOf5();
    const saved = { ...base, cartItems: base.cartItems.map((i) => ({ ...i, isExisting: true, mapId: 4 })) };
    expect(run(saved, splitCartLine({ uniqueId: "demo", newUniqueId: "x", quantity: 2 })).cartItems).toHaveLength(1);
    for (const quantity of [5, 0, 1.5]) {
      expect(run(base, splitCartLine({ uniqueId: "demo", newUniqueId: "x", quantity })).cartItems).toHaveLength(1);
    }
  });

  it("the plain line left over still merges with the same product added again", () => {
    const state = run(cartOf5(),
      splitCartLine({ uniqueId: "demo", newUniqueId: "demo~1", quantity: 3 }),
      setItemCustomizations({ uniqueId: "demo~1", extras: [sugar(3)] }),
      addToCart({ uniqueId: "other", productId: 7, quantity: 1, price: 2, isIncl: true }),
    );
    expect(state.cartItems.map((i) => [i.uniqueId, i.quantity])).toEqual([["demo", 3], ["demo~1", 3]]);
  });
});

describe("Customise screen unit rail", () => {
  const demo = (over: Record<string, unknown> = {}) => ({
    uniqueId: "demo", productId: 7, quantity: 5, price: 2, lineTotal: 10, product: { name: "Demo", categoryId: 1, price: 2 },
    extras: [], modifiers: [], messages: [], ...over,
  });
  const open = (lines = [demo()], type = "extras") => {
    const onDone = vi.fn<(changes: LineCustomization[], splits?: LineSplit[]) => void>();
    const onSelectRow = vi.fn();
    render(createElement(Provider, {
      store,
      children: createElement(PosExtrasModifierModal, { isOpen: true, onClose: vi.fn(), type, cartItems: lines, selectedKey: "demo", onSelectRow, onDone } as never),
    }));
    return { onDone, onSelectRow };
  };
  const tile = (label: string) => screen.findByRole("button", { name: new RegExp(`^(×[0-9]+ )?${label}`) });
  const unit = (n: number, of: number) => screen.getByRole("button", { name: `For ${n} of ${of}` });
  const done = () => fireEvent.click(screen.getByRole("button", { name: /^Done/ }));

  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    mock(menuApi.getExtraTypes).mockResolvedValue([{ typeId: 1, typeName: "Add" }]);
    mock(menuApi.getExtras).mockResolvedValue({ extras: [{ extrasId: 31, extraName: "Sugar", price: 0.5 }, { extrasId: 32, extraName: "Salt", price: 0.25 }] });
    mock(menuApi.getModifierTypes).mockResolvedValue([{ typeId: 5, typeName: "No" }]);
    mock(menuApi.getModifiers).mockResolvedValue({ modifier: [{ modifierId: 41, modifierName: "Ice" }] });
  });

  it("shows 1…5 for a line of 5", async () => {
    open();
    await tile("Sugar");
    expect(within(screen.getByLabelText("Units")).getAllByRole("button").map((b) => b.textContent)).toEqual(["1", "2", "3", "4", "5"]);
  });

  it("owner's example: pick 3 + Sugar, then the other 2 + Salt", async () => {
    const { onDone, onSelectRow } = open();
    fireEvent.click(unit(3, 5));
    fireEvent.click(await tile("Sugar"));
    // Now on the new line of 3; the rail shows 1…3 with 3 picked. The order panel lists 2 + 3.
    expect(unit(3, 3).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByLabelText("Sugar quantity").textContent).toBe("3");
    expect(onSelectRow).not.toHaveBeenCalledWith(expect.stringContaining("~"));

    fireEvent.keyDown(window, { key: "ArrowUp" }); // back to the 2 left on the first line
    fireEvent.click(unit(2, 2));
    fireEvent.click(await tile("Salt"));
    done();

    const [changes, splits] = onDone.mock.calls[0];
    expect(splits).toHaveLength(1);
    expect(splits![0]).toMatchObject({ fromKey: "demo", qty: 3 });
    const byKey = Object.fromEntries(changes.map((c) => [c.uniqueId, c.extras]));
    expect(byKey.demo).toEqual([expect.objectContaining({ id: 32, name: "Salt", qty: 2 })]);
    expect(byKey[splits![0].newKey]).toEqual([expect.objectContaining({ id: 31, name: "Sugar", price: 0.5, qty: 3 })]);
  });

  it("modifiers work the same way: pick 2 + No Ice → No Ice × 2 on a new line of 2", async () => {
    const { onDone } = open([demo()], "modifiers");
    await tile("Ice");
    fireEvent.click(unit(2, 5));
    fireEvent.click(await tile("Ice"));
    done();
    const [changes, splits] = onDone.mock.calls[0];
    expect(splits![0].qty).toBe(2);
    const newLine = changes.find((c) => c.uniqueId === splits![0].newKey)!;
    expect(newLine.modifiers).toEqual([expect.objectContaining({ id: 41, qty: 2, typeId: 5, typeName: "No" })]);
    expect(changes.find((c) => c.uniqueId === "demo")).toBeUndefined();
  });

  it("picking all 5 adds one per unit on the same line, no split", async () => {
    const { onDone } = open();
    fireEvent.click(unit(5, 5));
    fireEvent.click(await tile("Sugar"));
    done();
    const [changes, splits] = onDone.mock.calls[0];
    expect(splits).toEqual([]);
    expect(changes[0].extras[0].qty).toBe(5);
  });

  it("nothing picked: a tap adds one to the whole line, as before", async () => {
    const { onDone } = open();
    fireEvent.click(await tile("Sugar"));
    done();
    const [changes, splits] = onDone.mock.calls[0];
    expect(splits).toEqual([]);
    expect(changes[0]).toMatchObject({ uniqueId: "demo", extras: [expect.objectContaining({ qty: 1 })] });
  });

  it("tapping the picked number again un-picks it", async () => {
    open();
    await tile("Sugar");
    fireEvent.click(unit(3, 5));
    fireEvent.click(unit(3, 5));
    expect(unit(3, 5).getAttribute("aria-pressed")).toBe("false");
  });

  it("taking the extra off the split line again is no split: Done sends nothing", async () => {
    const { onDone } = open();
    fireEvent.click(unit(3, 5));
    fireEvent.click(await tile("Sugar"));
    fireEvent.click(screen.getByRole("button", { name: "Remove Sugar" }));
    done();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("a line sent to the kitchen has no rail; a tap goes on the whole line", async () => {
    const { onDone } = open([demo({ isExisting: true, mapId: 4 })]);
    fireEvent.click(await tile("Sugar"));
    expect(screen.queryByLabelText("Units")).toBeNull();
    expect(screen.getByText(/Sent to kitchen/)).toBeTruthy();
    done();
    expect(onDone.mock.calls[0][1]).toEqual([]);
  });

  it("a line of 1 has no rail", async () => {
    open([demo({ quantity: 1, lineTotal: 2 })]);
    await tile("Sugar");
    expect(screen.queryByLabelText("Units")).toBeNull();
  });

  it("splits sent by the screen give the cart the right lines and total", async () => {
    const { onDone } = open();
    fireEvent.click(unit(3, 5));
    fireEvent.click(await tile("Sugar"));
    await waitFor(() => expect(screen.getByLabelText("Sugar quantity")).toBeTruthy());
    done();
    const [changes, splits] = onDone.mock.calls[0];
    let state = cartOf5();
    splits!.forEach((s) => { state = posReducer(state, splitCartLine({ uniqueId: s.fromKey, newUniqueId: s.newKey, quantity: s.qty })); });
    changes.forEach((c) => { state = posReducer(state, setItemCustomizations(c)); });
    expect(state.cartItems.map((i) => [i.quantity, (i.extras || []).map((e) => e.qty)])).toEqual([[2, []], [3, [3]]]);
    expect(priced(state).summary.grandTotal).toBeCloseTo(11.5, 6);
  });
});
