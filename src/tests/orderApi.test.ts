import { describe, it, expect, beforeEach, vi } from 'vitest';
import { orderApi } from '../features/pos/services/orderApi';
import axiosInstance from '../api/axiosInstance';
import { buildNewOrderPayload } from '../features/pos/terminal/mappers/orderPayloadMapper';

vi.mock('../api/axiosInstance', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('Order API Integration & Submission (orderApi.ts submitOrder)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vat', '10');
    localStorage.setItem('priceView', 'Exclusive');
    vi.clearAllMocks();
  });

  it('Order #79 in Inclusive mode: submitOrder posts discAmount ~9.091, vatExcl ~90.91, netAmount 100', async () => {
    localStorage.setItem('discCalc', 'Inclusive');

    const cartDetails: any[] = [
      {
        uniqueId: 'item-demo-79',
        productId: 6,
        quantity: 10,
        price: 10.000,
        basePrice: 10.000,
        isIncl: false,
        product: { id: 6, name: 'Demo', price: 10.000, vatValue: 10 },
      }
    ];

    const context: any = {
      cartDetails,
      subtotal: 100.000,
      discount: 9.091,
      tax: 9.091,
      charges: 0,
      totalServiceCharge: 0,
      totalLevy: 0,
      total: 100.000,
      deliveryCharge: 0,
      selectedOrderTypeName: 'Takeaway',
      selectedOrderTypeId: 2,
      billDiscountValue: 10.000,
      billDiscountType: 'amount',
    };

    const session: any = {
      userId: 1,
      employeeId: 1,
      customerId: 1,
      transDate: '2026-10-28T00:00:00.000Z',
    };

    const orderPayload = buildNewOrderPayload(context, session);

    // Mock successful API response
    (axiosInstance.post as any).mockResolvedValueOnce({
      data: {
        isSuccess: true,
        message: 'Order created',
        data: { id: 79, ticketNo: 79 },
      },
    });

    const res = await orderApi.submitOrder(orderPayload);
    expect(res.isSuccess).toBe(true);

    // Inspect the actual payload sent to axiosInstance.post('/menu/order', payload)
    const [endpoint, postedPayload] = (axiosInstance.post as any).mock.calls[0];
    expect(endpoint).toBe('/menu/order');

    // 1. Inclusive discount must reduce VAT portion: 10 / 1.10 = 9.0909091 ("9. something")
    expect(postedPayload.discAmount).toBeCloseTo(9.0909091, 5);

    // 2. Taxable Base (vatExclAmount): 100 - 9.0909091 = 90.9090909
    expect(postedPayload.vatExclAmount).toBeCloseTo(90.9090909, 5);

    // 3. VAT: 90.9090909 * 0.10 = 9.0909091
    expect(postedPayload.vatAmount).toBeCloseTo(9.0909091, 5);

    // 4. Net payable: 100.000
    expect(postedPayload.netAmount).toBe(100.000);

    // 5. Details: bill discount allocates to details
    expect(postedPayload.details.length).toBe(1);
    expect(postedPayload.details[0].discAmount).toBeCloseTo(9.091, 3);
    expect(postedPayload.details[0].price).toBe(10.000);
  });

  it('Exclusive mode: submitOrder posts exact entered discAmount 10.000', async () => {
    localStorage.setItem('discCalc', 'Exclusive');

    const cartDetails: any[] = [
      {
        uniqueId: 'item-demo-incl',
        productId: 6,
        quantity: 2,
        price: 10.000,
        basePrice: 10.000,
        isIncl: false,
        product: { id: 6, name: 'Demo', price: 10.000, vatValue: 10 },
      }
    ];

    const context: any = {
      cartDetails,
      subtotal: 20.000,
      discount: 10.000,
      tax: 1.000,
      charges: 0,
      totalServiceCharge: 0,
      totalLevy: 0,
      total: 11.000,
      deliveryCharge: 0,
      selectedOrderTypeName: 'Takeaway',
      selectedOrderTypeId: 2,
      billDiscountValue: 10.000,
      billDiscountType: 'amount',
    };

    const session: any = {
      userId: 1,
      employeeId: 1,
      customerId: 1,
      transDate: '2026-10-28T00:00:00.000Z',
    };

    const orderPayload = buildNewOrderPayload(context, session);

    (axiosInstance.post as any).mockResolvedValueOnce({
      data: {
        isSuccess: true,
        message: 'Order created',
        data: { id: 80, ticketNo: 80 },
      },
    });

    await orderApi.submitOrder(orderPayload);
    const [, postedPayload] = (axiosInstance.post as any).mock.calls[0];

    // In Exclusive mode, entered 10.000 remains 10.000
    expect(postedPayload.discAmount).toBe(10.000);
    expect(postedPayload.vatExclAmount).toBe(10.000);
    expect(postedPayload.vatAmount).toBe(1.000);
    expect(postedPayload.netAmount).toBe(11.000);
  });

  it('Item discount in Inclusive mode: details line has discAmount ~0.909, master discAmount is 0', async () => {
    localStorage.setItem('discCalc', 'Inclusive');

    const cartDetails: any[] = [
      {
        uniqueId: 'item-disc-excl',
        productId: 1,
        quantity: 1,
        price: 10.000,
        basePrice: 10.000,
        isIncl: false,
        discountValue: 1.000,
        discountType: 'amount',
        product: { id: 1, name: 'Item 1', price: 10.000, vatValue: 10 },
      }
    ];

    const context: any = {
      cartDetails,
      subtotal: 10.000,
      discount: 0.909,
      tax: 0.909,
      charges: 0,
      totalServiceCharge: 0,
      totalLevy: 0,
      total: 10.000,
      deliveryCharge: 0,
      selectedOrderTypeName: 'Takeaway',
      selectedOrderTypeId: 2,
      billDiscountValue: 0,
      billDiscountType: 'amount',
    };

    const session: any = {
      userId: 1,
      employeeId: 1,
      customerId: 1,
      transDate: '2026-10-28T00:00:00.000Z',
    };

    const orderPayload = buildNewOrderPayload(context, session);

    (axiosInstance.post as any).mockResolvedValueOnce({
      data: {
        isSuccess: true,
        message: 'Order created',
        data: { id: 81, ticketNo: 81 },
      },
    });

    await orderApi.submitOrder(orderPayload);
    const [, postedPayload] = (axiosInstance.post as any).mock.calls[0];

    // Master discount must be 0 (item discount only)
    expect(postedPayload.discAmount).toBe(0);
    expect(postedPayload.discPer).toBe(0);

    // Detail line item discount must reduce VAT portion: 1 / 1.10 = 0.9090909 (".90 something")
    expect(postedPayload.details[0].discAmount).toBeCloseTo(0.9090909, 5);
  });

  it('getOrderDetails: passes serviceCharge and levy dynamically from POS configuration without hardcoded fallbacks', async () => {
    (axiosInstance.get as any).mockResolvedValue({
      data: { isSuccess: true, data: { masterData: {}, detailsData: [] } }
    });

    // 1. With 10% service charge and 5% levy configured in POS configuration:
    localStorage.setItem('posConfigs', JSON.stringify({ configs: { serviceCharges: 10, levy: 5 } }));

    // TakeOut order: serviceCharge MUST be 0, levy MUST be configured 5
    await orderApi.getOrderDetails(120, { orderType: 'TakeOut', priceView: 'Inclusive' });
    expect(axiosInstance.get).toHaveBeenCalledWith('/order/recall/order_data/120', {
      params: { serviceCharge: 0, levy: 5, priceView: 'Inclusive' }
    });

    // DineIn order: serviceCharge MUST be configured 10, levy MUST be configured 5
    await orderApi.getOrderDetails(111, { orderType: 'DineIn', priceView: 'Inclusive' });
    expect(axiosInstance.get).toHaveBeenCalledWith('/order/recall/order_data/111', {
      params: { serviceCharge: 10, levy: 5, priceView: 'Inclusive' }
    });

    // 2. User screenshot scenario: Service Charge = 0%, Levy = 0% in POS configuration
    localStorage.setItem('posConfigs', JSON.stringify({ configs: { serviceCharges: 0, levy: 0 } }));

    await orderApi.getOrderDetails(241, { orderType: 'TakeOut', priceView: 'Inclusive' });
    expect(axiosInstance.get).toHaveBeenCalledWith('/order/recall/order_data/241', {
      params: { serviceCharge: 0, levy: 0, priceView: 'Inclusive' }
    });

    await orderApi.getOrderDetails(242, { orderType: 'DineIn', priceView: 'Inclusive' });
    expect(axiosInstance.get).toHaveBeenCalledWith('/order/recall/order_data/242', {
      params: { serviceCharge: 0, levy: 0, priceView: 'Inclusive' }
    });

    // 3. Custom configuration scenario: Service Charge = 15%, Levy = 7%
    localStorage.setItem('posConfigs', JSON.stringify({ configs: { serviceCharges: 15, levy: 7 } }));

    await orderApi.getOrderDetails(300, { orderType: 'DineIn', priceView: 'Inclusive' });
    expect(axiosInstance.get).toHaveBeenCalledWith('/order/recall/order_data/300', {
      params: { serviceCharge: 15, levy: 7, priceView: 'Inclusive' }
    });

    // Clean up
    localStorage.clear();
  });
});
