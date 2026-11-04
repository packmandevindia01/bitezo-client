/**
 * Product details `netAmount` is sent with 7 decimals (round half-up) on every order / invoice request.
 * All other values (master totals, detail VAT / sc / levy / price) keep the 14-decimal precision.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const post = vi.fn();
const put = vi.fn();
vi.mock("../api/axiosInstance", () => ({ default: { post: (...a: unknown[]) => post(...a), put: (...a: unknown[]) => put(...a) } }));

import { withDetailNet7, DETAIL_NET_PRECISION } from "../utils/money";
import { orderApi } from "../features/pos/services/orderApi";
import { salesInvoiceApi } from "../features/pos/services/salesInvoiceApi";

const ok = { data: { isSuccess: true, message: null, data: { id: 1 } } };
const detail = (netAmount: number) => ({
  productId: 1, unitId: 1, qty: 3, price: 3.33333333333333, basePrice: 3.33333333333333, exclusivePrice: 3.33333333333333,
  isPriceTaxExclusive: true, discPer: 0, discAmount: 0, serviceCharge: 0, levy: 0, vatId: 1,
  vatAmount: 0.99999999999999, netAmount, mapId: 1, complimentaryStatus: false,
});
const master = (netAmount: number) => ({
  customerId: 1, employeeId: 1, discAmount: 0, discPer: 0, serviceCharge: 0, levy: 0,
  vatExclAmount: 9.99999999999999, vatAmount: 0.99999999999999, netAmount, deliveryCharge: 0,
  orderTypeId: 2, details: [detail(10.99999999999998), detail(1.23456785)], modifiers: [],
});

beforeEach(() => {
  post.mockReset().mockResolvedValue(ok);
  put.mockReset().mockResolvedValue(ok);
  localStorage.clear();
});

describe("withDetailNet7", () => {
  it("rounds only netAmount to 7 decimals, half-up", () => {
    expect(DETAIL_NET_PRECISION).toBe(7);
    const [a, b] = withDetailNet7([detail(10.99999999999998), detail(1.23456785)]);
    expect(a.netAmount).toBe(11);
    expect(b.netAmount).toBe(1.2345679);
    expect(a.vatAmount).toBe(0.99999999999999);
    expect(a.price).toBe(3.33333333333333);
  });

  it("leaves missing values and non-arrays alone; does not change the input", () => {
    const src = [{ netAmount: 1.123456789 }, { qty: 1 } as { netAmount?: number; qty: number }];
    const out = withDetailNet7(src);
    expect(out[0].netAmount).toBe(1.1234568);
    expect(out[1]).toBe(src[1]);
    expect(src[0].netAmount).toBe(1.123456789);
    expect(withDetailNet7(undefined)).toBeUndefined();
  });
});

const sentDetails = (call: unknown[]) => (call[1] as { details: { netAmount: number }[] }).details.map((d) => d.netAmount);

describe("requests send details.netAmount with 7 decimals", () => {
  it("POST /menu/order", async () => {
    await orderApi.submitOrder(master(12.23456784999998) as never);
    expect(post.mock.calls[0][0]).toBe("/menu/order");
    expect(sentDetails(post.mock.calls[0])).toEqual([11, 1.2345679]);
    expect((post.mock.calls[0][1] as { netAmount: number }).netAmount).toBe(12.23456784999998); // master untouched
  });

  it("PUT /menu/order/{id}", async () => {
    await orderApi.updateOrder(7, { orderId: 7, ...master(12.5) } as never);
    expect(sentDetails(put.mock.calls[0])).toEqual([11, 1.2345679]);
  });

  it("POST /order-split (each order)", async () => {
    await orderApi.splitOrder({ orderId: 7, orders: [master(11), master(1.2345)] } as never);
    const body = post.mock.calls[0][1] as { orders: { details: { netAmount: number }[] }[] };
    body.orders.forEach((o) => expect(o.details.map((d) => d.netAmount)).toEqual([11, 1.2345679]));
  });

  it("POST /sales-invoices", async () => {
    await salesInvoiceApi.createSalesInvoice({ ...master(12.5), paymodeId: 1, paymodes: [] } as never);
    expect(sentDetails(post.mock.calls[0])).toEqual([11, 1.2345679]);
  });

  it("COMBINE: combined order saved (PUT /menu/order/{id} with combinedOrderIds)", async () => {
    await orderApi.updateOrder(9, { orderId: 9, ...master(12.5), combinedOrderIds: [7, 8] } as never);
    expect(put.mock.calls[0][0]).toBe("/menu/order/9");
    expect(sentDetails(put.mock.calls[0])).toEqual([11, 1.2345679]);
    expect((put.mock.calls[0][1] as { combinedOrderIds: number[] }).combinedOrderIds).toEqual([7, 8]);
  });

  it("COMBINE: combined order settled (POST /sales-invoices with combinedOrderIds)", async () => {
    await salesInvoiceApi.createSalesInvoice({ ...master(12.5), paymodeId: 1, paymodes: [], combinedOrderIds: [7, 8] } as never);
    expect(sentDetails(post.mock.calls[0])).toEqual([11, 1.2345679]);
    expect((post.mock.calls[0][1] as { combinedOrderIds: number[] }).combinedOrderIds).toEqual([7, 8]);
  });

  it("PUT /sales-invoices/{id}", async () => {
    await salesInvoiceApi.updateSalesInvoice(5, { ...master(12.5), paymodeId: 1, paymodes: [] } as never);
    expect(sentDetails(put.mock.calls[0])).toEqual([11, 1.2345679]);
  });
});
