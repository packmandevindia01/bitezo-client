/**
 * Provider orders on this backend (checked on 8060, 2026-11-13):
 * - Order types are ONE list: 1 DineIn, 2 TakeOut, 3 DriveThru, 4 Delivery, then each provider by its own id
 *   (5 Swiggy, 6 Zomato, 7 …). A provider order is saved with orderTypeId = the provider's id.
 * - POS Config "Provider Own Menu Status": ON = only the products in the provider's Provider Settings,
 *   OFF = every product (the provider's price where it has one). Providers always show.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import axiosInstance from "../api/axiosInstance";
import { buildDirectSettleOrderPayload, buildNewOrderPayload } from "../features/pos/terminal/mappers/orderPayloadMapper";
import posReducer, { setOrderType, loadRecalledOrder } from "../features/pos/terminal/store/posSlice";
import { selectMenuOrderTypeId } from "../features/pos/terminal/store/posSelectors";
import { menuApi, getProviderOwnStatus } from "../features/pos/services/menuApi";

vi.mock("../api/axiosInstance", () => ({
  default: { post: vi.fn(), get: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

const stateWith = (...actions: Parameters<typeof posReducer>[1][]) =>
  ({ pos: actions.reduce(posReducer, posReducer(undefined, { type: "@@init" } as never)) }) as never;

const setOwnStatus = (value: unknown, where: "configs" | "top" = "configs") => {
  const full = where === "configs" ? { configs: { providerOwnStatus: value } } : { providerOwnStatus: value };
  localStorage.setItem("posConfigs", JSON.stringify(full));
};

const cart = () => ({
  cartDetails: [
    { uniqueId: "l1", productId: 6, quantity: 1, price: 10, basePrice: 10, isIncl: false, product: { id: 6, name: "Burgers", price: 10, vatValue: 10 } },
  ],
  subtotal: 10, discount: 0, tax: 1, charges: 0, totalServiceCharge: 0, totalLevy: 0, total: 11, deliveryCharge: 0,
  billDiscountValue: 0, billDiscountType: "amount",
}) as any;

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("enableVat", "true");
  localStorage.setItem("vat", "10");
  localStorage.setItem("priceView", "Exclusive");
  vi.mocked(axiosInstance.get).mockReset();
});

describe("saving a provider order: orderTypeId is the provider's id", () => {
  it("settle payload: Zomato (6) is saved as order type 6, not 5 (= Swiggy on the server)", () => {
    const p = buildDirectSettleOrderPayload({ ...cart(), selectedOrderTypeId: 6, selectedOrderTypeName: "Zomato" }, { customerId: 5, providerId: 6 });
    expect(p.orderTypeId).toBe(6);
  });

  it("settle payload: Swiggy stays 5, the test provider 7", () => {
    expect(buildDirectSettleOrderPayload({ ...cart(), selectedOrderTypeId: 5, selectedOrderTypeName: "Swiggy" }, { customerId: 1, providerId: 5 }).orderTypeId).toBe(5);
    expect(buildDirectSettleOrderPayload({ ...cart(), selectedOrderTypeId: 7, selectedOrderTypeName: "test" }, { customerId: 1, providerId: 7 }).orderTypeId).toBe(7);
  });

  it("ORDER (KOT) payload: the selected provider type goes as orderTypeId", () => {
    const p = buildNewOrderPayload({ ...cart(), selectedOrderTypeId: 6, selectedOrderTypeName: "Zomato" }, { customerId: 5 });
    expect(p.orderTypeId).toBe(6);
  });

  it("a normal order is unchanged (Take Out = 2)", () => {
    expect(buildDirectSettleOrderPayload({ ...cart(), selectedOrderTypeId: 2, selectedOrderTypeName: "TakeOut" }, { customerId: 1 }).orderTypeId).toBe(2);
  });
});

describe("menu order type for a provider order", () => {
  it("picking Zomato sets order type 6, and the menu asks for 6", () => {
    expect(selectMenuOrderTypeId(stateWith(setOrderType({ orderTypeId: 6, orderType: "Zomato" })))).toBe(6);
  });

  it("a recalled Zomato order (saved type 6, no providerId from the server) keeps Zomato's menu", () => {
    const recalled = loadRecalledOrder({ editingOrderId: 70, cartItems: [], orderTypeId: 6, orderTypeName: "Providers", customerId: 5, addressId: 0, billDiscountValue: 0, billDiscountType: "percentage" } as never);
    expect(selectMenuOrderTypeId(stateWith(recalled))).toBe(6);
  });
});

describe("Provider Own Menu Status on this device", () => {
  it("reads the saved value (configs section)", () => {
    setOwnStatus(false);
    expect(getProviderOwnStatus(6)).toBe(false);
    setOwnStatus(true);
    expect(getProviderOwnStatus(6)).toBe(true);
  });

  it("reads it at the top level too (a copy saved without a configs section)", () => {
    setOwnStatus(false, "top");
    expect(getProviderOwnStatus(6)).toBe(false);
  });

  it("nothing saved: on", () => {
    expect(getProviderOwnStatus(6)).toBe(true);
  });
});

/** product-list on 8060: for a provider id it returns only the provider's products, whatever providerOwnStatus says. */
const normalList = [
  { productId: 1, productName: "Shawarma", price: 1 },
  { productId: 2, productName: "Orange Juice", price: 0.5 },
  { productId: 3, productName: "Mutton Biriyani", price: 100 },
];
const zomatoList = [
  { productId: 1, productName: "Shawarma", price: 1.2 },
  { productId: 9, productName: "Test(2)", price: 1 },
];
const mockProductList = () =>
  vi.mocked(axiosInstance.get).mockImplementation(async (_url: string, cfg?: any) => {
    const ot = Number(cfg?.params?.orderTypeId);
    return { data: { data: ot > 4 ? zomatoList : normalList } } as any;
  });

describe("product search on a provider order", () => {
  it("own menu ON: only the provider's products", async () => {
    mockProductList();
    const rows = await menuApi.searchProducts({ productName: "", orderTypeId: 6, providerOwnStatus: true });
    expect(rows.map((r) => [r.productId, r.price])).toEqual([[1, 1.2], [9, 1]]);
  });

  it("own menu OFF: every product, at the provider's price where it has one", async () => {
    mockProductList();
    const rows = await menuApi.searchProducts({ productName: "", orderTypeId: 6, providerOwnStatus: false });
    expect(rows.map((r) => [r.productId, r.price])).toEqual([[1, 1.2], [2, 0.5], [3, 100], [9, 1]]);
  });

  it("own menu OFF follows the saved switch when not passed", async () => {
    setOwnStatus(false);
    mockProductList();
    const rows = await menuApi.searchProducts({ productName: "", orderTypeId: 6 });
    expect(rows).toHaveLength(4);
  });

  it("a normal order type is not touched", async () => {
    mockProductList();
    const rows = await menuApi.searchProducts({ productName: "", orderTypeId: 2, providerOwnStatus: false });
    expect(rows.map((r) => r.productId)).toEqual([1, 2, 3]);
  });
});

describe("provider list (Select Provider)", () => {
  it("every provider shows, whatever the switch; image paths point at the backend", async () => {
    setOwnStatus(false);
    vi.mocked(axiosInstance.get).mockResolvedValue({
      data: {
        isSuccess: true,
        data: [
          { providerId: 5, providerName: "Swiggy", imageUrl: "/uploads/provider/swiggy.png" },
          { providerId: 6, providerName: "Zomato", imageUrl: null },
        ],
      },
    } as any);
    const list = await menuApi.getProviders();
    expect(list.map((p) => p.providerId)).toEqual([5, 6]);
    expect(list[0].imageUrl).toMatch(/\/uploads\/provider\/swiggy\.png$/);
    expect(list[1].imageUrl).toBeNull();
  });
});
