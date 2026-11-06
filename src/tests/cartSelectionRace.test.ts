/**
 * Reported bug: after Set Order the price cache is empty, so adding the same product again waits for the
 * network. The previous line stayed selected during that wait, so + / qty / extras changed the FIRST line.
 * Runs the real hook (React state stubbed) and the real cart reducer.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  getProductData: vi.fn(),
  getAlternatives: vi.fn(),
  productDataCache: {} as Record<string, unknown>,
  alternativesCache: {} as Record<string, unknown[]>,
}));

vi.mock("react", async (orig) => ({
  ...(await orig<typeof import("react")>()),
  useState: (v: unknown) => [v, () => {}],
  useRef: (v: unknown) => ({ current: v }),
}));
vi.mock("../app/hooks", () => ({ useAppDispatch: () => () => {} }));
vi.mock("../features/pos/services/menuApi", () => ({ menuApi: { getProductData: h.getProductData, getAlternatives: h.getAlternatives } }));
vi.mock("../features/pos/terminal/hooks/usePosProducts", () => ({ productDataCache: h.productDataCache, alternativesCache: h.alternativesCache }));

import { useProductSelection as productSelectionUnderTest } from "../features/pos/terminal/hooks/menu/useProductSelection";
import posReducer, { incrementItem } from "../features/pos/terminal/store/posSlice";

type PosState = ReturnType<typeof posReducer>;
type Line = PosState["cartItems"][number];

/** The screen: selected line + "+" button, wired like PosOrderPanel. */
const screen = (state: PosState) => {
  let cart = state;
  let selected: string | null = "saved-line";
  return {
    setSelectedKey: (k: string | null) => { selected = k; },
    addProduct: () => {
      cart = { ...cart, cartItems: [...cart.cartItems, { uniqueId: "new-line", productId: 7, quantity: 1, price: 0.2, isExisting: false } as Line] };
      return "new-line";
    },
    plus: () => { if (selected) cart = posReducer(cart, incrementItem({ uniqueId: selected })); },
    qty: (id: string) => cart.cartItems.find((i) => i.uniqueId === id)?.quantity,
    selected: () => selected,
  };
};

const reopenedOrder = (): PosState => ({
  ...posReducer(undefined, { type: "@@init" }),
  cartItems: [{ uniqueId: "saved-line", productId: 7, quantity: 2, price: 0.2, isExisting: true, mapId: 1 } as Line],
});

const product = { id: 7, name: "Tea", price: 0.2, categoryId: 1, isIncl: true };
const select = (s: ReturnType<typeof screen>, p: Record<string, unknown> = product) =>
  productSelectionUnderTest({ visibleProducts: [p] as never, selectedOrderTypeId: 1, addProduct: s.addProduct as never, setSelectedKey: s.setSelectedKey, openPriceModal: () => {} });

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(h.productDataCache)) delete h.productDataCache[k];
  for (const k of Object.keys(h.alternativesCache)) delete h.alternativesCache[k];
});

describe("Adding a product while the price is loading", () => {
  it("+ pressed during the wait does not change the saved line; the new line then gets selected", async () => {
    let answer!: (v: unknown) => void;
    h.getProductData.mockReturnValue(new Promise((r) => { answer = r; }));
    const s = screen(reopenedOrder());

    const adding = select(s).handleProductSelect(7);
    s.plus(); // cashier presses + before the server answered
    expect(s.qty("saved-line")).toBe(2);
    expect(s.selected()).toBeNull();

    answer({ price: 0.2, isIncl: true });
    await adding;
    expect(s.selected()).toBe("new-line");

    s.plus();
    expect(s.qty("new-line")).toBe(2);
    expect(s.qty("saved-line")).toBe(2);
  });

  it("a failed price call still adds the line and selects it", async () => {
    h.getProductData.mockRejectedValue(new Error("offline"));
    const s = screen(reopenedOrder());
    await select(s).handleProductSelect(7);
    expect(s.selected()).toBe("new-line");
    expect(s.qty("saved-line")).toBe(2);
  });

  it("a product with variants already in the cache keeps the selection until a variant is chosen", async () => {
    h.alternativesCache["7-1"] = [{ altName: "Large", price: 1 }];
    const s = screen(reopenedOrder());
    await select(s, { ...product, hasAlternatives: true }).handleProductSelect(7);
    expect(s.selected()).toBe("saved-line");
  });
});
