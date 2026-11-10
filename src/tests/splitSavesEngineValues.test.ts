/**
 * Split order lines are priced by the engine in PosSplitModal. They reach the backend exactly as priced:
 * a guess used to re-divide prices, invent VAT on zero-VAT lines and round line VAT to 3 decimals.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const post = vi.fn();
vi.mock("../api/axiosInstance", () => ({ default: { post: (...a: unknown[]) => post(...a), put: vi.fn(), get: vi.fn() } }));

import { orderApi } from "../features/pos/services/orderApi";

const line = (over: Record<string, unknown>) => ({ productId: 1, unitId: 1, qty: 1, discPer: 0, discAmount: 0, serviceCharge: 0, levy: 0, vatId: 1, mapId: 1, complimentaryStatus: false, ...over });
const bucket = (details: unknown[]) => ({ order: { sectionId: 0, tableId: 0, guestNo: 0, serviceCharge: 0, levy: 0, vatExclAmount: 5, vatAmount: 0, netAmount: 5 }, details, modifiers: [] });

const sent = async (detail: Record<string, unknown>) => {
  await orderApi.splitOrder({ orderId: 1, baseOrder: bucket([detail]), newOrders: [bucket([{ ...detail, mapId: 2 }])] } as never);
  const body = post.mock.calls[0][1];
  return { base: body.baseOrder.details[0], added: body.newOrders[0].details[0] };
};

describe("split order saving", () => {
  beforeEach(() => {
    post.mockReset().mockResolvedValue({ data: { isSuccess: true, message: null, data: { id: 1 } } });
    localStorage.clear();
    localStorage.setItem("posConfigs", JSON.stringify({ configs: { vatStatus: true, vat: 10, serviceCharges: 10, levy: 5 } }));
    localStorage.setItem("decimalPart", "3");
  });

  it.each(["Exclusive", "Inclusive"])("a zero-VAT line stays zero-VAT at the same price, %s view", async (view) => {
    localStorage.setItem("priceView", view);
    const { base, added } = await sent(line({ price: 5, vatAmount: 0, netAmount: 5, vatValue: 0 }));
    for (const d of [base, added]) {
      expect(d.price).toBe(5);
      expect(d.vatAmount).toBe(0);
      expect(d.netAmount).toBe(5);
    }
  });

  it("line VAT keeps its full precision", async () => {
    const { base } = await sent(line({ price: 9.0909091, vatAmount: 0.9090909, netAmount: 10, vatValue: 10 }));
    expect(base.vatAmount).toBe(0.9090909);
    expect(base.price).toBe(9.0909091);
  });

  it("line net is sent with 7 decimals on every bucket, like other saves", async () => {
    const { base, added } = await sent(line({ price: 1, vatAmount: 0.1, netAmount: 1.123456789 }));
    expect(base.netAmount).toBe(1.1234568);
    expect(added.netAmount).toBe(1.1234568);
  });
});
