import { describe, it, expect, beforeEach } from 'vitest';
import { buildDirectSettleOrderPayload, buildUpdateOrderPayload } from '../features/pos/terminal/mappers/orderPayloadMapper';
import { buildSalesInvoicePayload } from '../features/pos/terminal/mappers/invoicePayloadMapper';
import { calculateOrder } from '../features/pos/terminal/utils/billing';

describe('Order Payload Mapper (orderPayloadMapper.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vat', '10');
    localStorage.setItem('priceView', 'Exclusive');
    localStorage.setItem('discCalc', 'Exclusive');
  });

  it('should store exact discount entered in masterData discAmount (no conversion)', () => {
    const cartDetails: any[] = [
      {
        uniqueId: 'item-1',
        productId: 6,
        quantity: 2,
        price: 10.000,
        basePrice: 10.000,
        isIncl: false,
        product: { id: 6, name: 'Demo Product', price: 10.000, vatValue: 10 },
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

    const payload = buildDirectSettleOrderPayload(context, session);

    // Master discount must strictly be 10.000 (what the user entered)
    expect(payload.discAmount).toBe(10.000);
    expect(payload.billDiscount).toBe(10.000);
    expect(payload.billDiscountValue).toBe(10.000);

    // Detail rows: prices must strictly be tax-exclusive base price
    expect(payload.details.length).toBe(1);
    expect(payload.details[0].price).toBe(10.000);
    expect(payload.details[0].qty).toBe(2);

    // VAT Excl: 20.000 - 10.000 = 10.000
    expect(payload.vatExclAmount).toBe(10.000);

    // VAT: 10% on 10.000 = 1.000
    expect(payload.vatAmount).toBe(1.000);

    // Net payable: 10.000 + 1.000 = 11.000
    expect(payload.netAmount).toBe(11.000);
  });

  it('should calculate vatExclAmount reducing VAT when discCalc is Inclusive', () => {
    localStorage.setItem('discCalc', 'Inclusive');

    const cartDetails: any[] = [
      {
        uniqueId: 'item-1',
        productId: 6,
        quantity: 2,
        price: 10.000,
        basePrice: 10.000,
        isIncl: false,
        product: { id: 6, name: 'Demo Product', price: 10.000, vatValue: 10 },
      }
    ];

    const context: any = {
      cartDetails,
      subtotal: 20.000,
      discount: 0.909,
      tax: 1.909,
      charges: 0,
      totalServiceCharge: 0,
      totalLevy: 0,
      total: 20.000,
      deliveryCharge: 0,
      selectedOrderTypeName: 'Takeaway',
      selectedOrderTypeId: 2,
      billDiscountValue: 1.000,
      billDiscountType: 'amount',
    };

    const session: any = {
      userId: 1,
      employeeId: 1,
      customerId: 1,
      transDate: '2026-10-28T00:00:00.000Z',
    };

    const payload = buildDirectSettleOrderPayload(context, session);

    // When discount mode is Inclusive, discAmount sent to backend reduces VAT: 1 / 1.1 = 0.9090909
    expect(payload.discAmount).toBeCloseTo(0.909, 3);

    // Effective base discount reduces VAT: 1 / 1.1 = 0.9090909
    // vatExclAmount: 20.000 - 0.9090909 = 19.090909
    expect(payload.vatExclAmount).toBeCloseTo(19.091, 3);
  });

  it('Order #79: 10 items @ 10 base, 10 bill discount with discCalc Inclusive', () => {
    localStorage.setItem('discCalc', 'Inclusive');
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vat', '10');

    const cartDetails: any[] = [
      {
        uniqueId: 'item-demo',
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

    const payload = buildDirectSettleOrderPayload(context, session);

    // Master discount MUST be 10 / 1.10 = 9.0909091 ("9. something")
    expect(payload.discAmount).toBeCloseTo(9.0909091, 5);

    // vatExclAmount: 100 - 9.0909091 = 90.9090909
    expect(payload.vatExclAmount).toBeCloseTo(90.9090909, 5);

    // vatAmount: 90.9090909 * 0.10 = 9.0909091
    expect(payload.vatAmount).toBeCloseTo(9.0909091, 5);

    // netAmount: 90.9090909 + 9.0909091 = 100.000
    expect(payload.netAmount).toBe(100.000);
  });

  it('should properly map Delivery orders with delivery charge', () => {
    const cartDetails: any[] = [
      {
        uniqueId: 'item-1',
        productId: 1,
        quantity: 1,
        price: 10.000,
        basePrice: 10.000,
        isIncl: false,
        product: { id: 1, name: 'Pizza', price: 10.000, vatValue: 10 },
      }
    ];

    const context: any = {
      cartDetails,
      subtotal: 10.000,
      discount: 0,
      tax: 1.000,
      charges: 0,
      totalServiceCharge: 0,
      totalLevy: 0,
      total: 13.000,
      deliveryCharge: 2.000,
      selectedOrderTypeName: 'Delivery',
      selectedOrderTypeId: 4,
    };

    const session: any = {
      userId: 1,
      employeeId: 1,
      customerId: 1,
      transDate: '2026-10-28T00:00:00.000Z',
    };

    const payload = buildDirectSettleOrderPayload(context, session);

    expect(payload.orderTypeId).toBe(4);
    expect(payload.deliveryCharge).toBe(2.000);
    // 10 base + 1.000 vat + 2 delivery = 13.000
    expect(payload.netAmount).toBe(13.000);
  });

  it('Order #104: Updating an order with 2 items @ 10 base, 10 bill discount, 5% levy passes levy: 0.500 to backend database', () => {
    localStorage.setItem('posConfigs', JSON.stringify({
      configs: {
        vat: 10,
        levy: 5,
        serviceCharges: 0,
        priceView: 'Exclusive',
        discCalc: 'Exclusive',
      }
    }));

    // 1. Calculate order via central calculateOrder engine
    const rawCartItems: any[] = [
      {
        uniqueId: 'item-demo',
        productId: 6,
        quantity: 2,
        price: 10.000,
        isIncl: false,
        product: { id: 6, name: 'Demo', price: 10.000, vatValue: 10 },
      }
    ];

    const calcResult = calculateOrder(rawCartItems, {
      orderType: 'Takeaway',
      orderTypeId: 2,
      billDiscountValue: 10.000,
      billDiscountType: 'amount',
    });

    expect(calcResult.summary.subtotal).toBe(20.000);
    expect(calcResult.summary.totalDiscount).toBe(10.000);
    expect(calcResult.summary.levy).toBe(0.500);
    expect(calcResult.summary.vatExclAmount).toBe(10.500);
    expect(calcResult.summary.vatAmount).toBe(1.050);
    expect(calcResult.summary.grandTotal).toBe(11.550);

    // 2. Build form context matching POS cart actions
    const context: any = {
      cartDetails: calcResult.lines,
      subtotal: calcResult.summary.subtotal,
      discount: calcResult.summary.totalDiscount,
      tax: calcResult.summary.vatAmount,
      charges: calcResult.summary.charges,
      totalServiceCharge: calcResult.summary.serviceCharge,
      totalLevy: calcResult.summary.levy,
      total: calcResult.summary.grandTotal,
      deliveryCharge: 0,
      selectedOrderTypeName: 'Takeaway',
      selectedOrderTypeId: 2,
      billDiscountValue: 10.000,
      billDiscountType: 'amount',
      editingOrderId: 104,
      prevUpdatedAt: '2026-10-29T10:54:53.110302+05:30',
    };

    const session: any = {
      userId: 1,
      employeeId: 1,
      customerId: 1,
      transDate: '2026-10-29T00:00:00.000Z',
    };

    // 3. Test buildUpdateOrderPayload for PUT /menu/order/104
    const updatePayload = buildUpdateOrderPayload(104, context, session);

    // Detail rows passed to database
    expect(updatePayload.details.length).toBe(1);
    expect(updatePayload.details[0].productId).toBe(6);
    expect(updatePayload.details[0].qty).toBe(2);
    expect(updatePayload.details[0].price).toBe(10.000);
    expect(updatePayload.details[0].discAmount).toBe(0); // Bill discount, line disc is 0
    expect(updatePayload.details[0].levy).toBe(0.500); // Line levy is 0.500
    expect(updatePayload.details[0].vatAmount).toBe(1.050);

    // Master record passed to database:
    // Levy must strictly be 0.500 (NOT 1.000!)
    expect(updatePayload.levy).toBe(0.500);
    expect(updatePayload.serviceCharge).toBe(0);
    expect(updatePayload.discAmount).toBe(10.000);
    expect(updatePayload.vatExclAmount).toBe(10.500); // 10.000 base + 0.500 levy
    expect(updatePayload.vatAmount).toBe(1.050);
    expect(updatePayload.netAmount).toBe(11.550);
  });

  it('Exclusive spreadsheet order: 4 @ 11 and 2 @ 15 with 10% SC, 5% Levy, 10% VAT maps accurately to database payload', () => {
    localStorage.setItem('posConfigs', JSON.stringify({
      configs: {
        vat: 10,
        levy: 5,
        serviceCharges: 10,
        priceView: 'Exclusive',
        discCalc: 'Exclusive',
      }
    }));

    const rawCartItems: any[] = [
      {
        uniqueId: 'item-1',
        productId: 1,
        quantity: 4,
        price: 11.000,
        isIncl: false,
        product: { id: 1, name: 'Product 1', price: 11.000, vatValue: 10 },
      },
      {
        uniqueId: 'item-2',
        productId: 2,
        quantity: 2,
        price: 15.000,
        isIncl: false,
        product: { id: 2, name: 'Product 2', price: 15.000, vatValue: 10 },
      }
    ];

    const calcResult = calculateOrder(rawCartItems, {
      orderType: 'DineIn',
      orderTypeId: 1,
      billDiscountValue: 0,
      billDiscountType: 'percentage',
    });

    const context: any = {
      cartDetails: calcResult.lines,
      subtotal: calcResult.summary.subtotal,
      discount: 0,
      tax: calcResult.summary.vatAmount,
      charges: calcResult.summary.charges,
      totalServiceCharge: calcResult.summary.serviceCharge,
      totalLevy: calcResult.summary.levy,
      total: calcResult.summary.grandTotal,
      deliveryCharge: 0,
      selectedOrderTypeName: 'DineIn',
      selectedOrderTypeId: 1,
      billDiscountValue: 0,
      billDiscountType: 'percentage',
    };

    const session: any = {
      userId: 1,
      employeeId: 1,
      customerId: 1,
      transDate: '2026-10-29T00:00:00.000Z',
    };

    const payload = buildDirectSettleOrderPayload(context, session);

    // Sum of details:
    // Line 1: qty 4 @ 11 = 44. SC = 4.4, Levy = 2.42
    // Line 2: qty 2 @ 15 = 30. SC = 3.0, Levy = 1.65
    // Master SC = 7.4, Master Levy = 4.07
    expect(payload.serviceCharge).toBe(7.400);
    expect(payload.levy).toBe(4.070);
    expect(payload.vatExclAmount).toBe(85.470);
    expect(payload.vatAmount).toBe(8.547);
    expect(payload.netAmount).toBe(94.017);
  });

  it('Dine-In Inclusive Item Discount: 1 @ 127.050 with 27.050 item discount passes exclusive data (disc: 21.291, net: 100.000, NOT 94) to database', () => {
    localStorage.setItem('posConfigs', JSON.stringify({
      configs: {
        vat: 10,
        levy: 5,
        serviceCharges: 10,
        priceView: 'Inclusive',
        discCalc: 'Inclusive',
      }
    }));
    localStorage.setItem('priceView', 'Inclusive');
    localStorage.setItem('discCalc', 'Inclusive');
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vat', '10');

    const rawCartItems: any[] = [
      {
        uniqueId: 'item-sndnd',
        productId: 99,
        quantity: 1,
        price: 127.050,
        isIncl: true,
        discountType: 'amount',
        discountValue: 27.050,
        product: { id: 99, name: 'SNDNDKSDKKSLNASKLNS', price: 127.050, vatValue: 10, isIncl: true },
      }
    ];

    const calcResult = calculateOrder(rawCartItems, {
      orderType: 'DineIn',
      orderTypeId: 1,
    });

    // Verification of central calculation output
    expect(calcResult.summary.subtotal).toBe(100.000);
    expect(calcResult.summary.totalDiscountExcl).toBeCloseTo(21.291, 3);
    expect(calcResult.summary.totalDiscountIncl).toBeCloseTo(27.050, 3);
    expect(calcResult.summary.serviceCharge).toBeCloseTo(7.871, 3);
    expect(calcResult.summary.levy).toBeCloseTo(4.329, 3);
    expect(calcResult.summary.vatExclAmount).toBeCloseTo(90.909, 3);
    expect(calcResult.summary.vatAmount).toBeCloseTo(9.091, 3);
    expect(calcResult.summary.grandTotal).toBeCloseTo(100.000, 3);

    const context: any = {
      cartDetails: calcResult.lines,
      subtotal: calcResult.summary.subtotal,
      discount: calcResult.summary.totalDiscount,
      tax: calcResult.summary.vatAmount,
      charges: calcResult.summary.charges,
      totalServiceCharge: calcResult.summary.serviceCharge,
      totalLevy: calcResult.summary.levy,
      total: calcResult.summary.grandTotal,
      deliveryCharge: 0,
      selectedOrderTypeName: 'DineIn',
      selectedOrderTypeId: 1,
      billDiscountValue: 0,
      billDiscountType: 'percentage',
    };

    const session: any = {
      userId: 1,
      employeeId: 1,
      customerId: 1,
      transDate: '2026-10-29T00:00:00.000Z',
    };

    const payload = buildDirectSettleOrderPayload(context, session);

    // Detail row must have strictly tax-exclusive base price and exclusive discount:
    expect(payload.details[0].price).toBe(100.000);
    expect(payload.details[0].discAmount).toBeCloseTo(21.291, 3);
    expect(payload.details[0].serviceCharge).toBeCloseTo(7.871, 3);
    expect(payload.details[0].levy).toBeCloseTo(4.329, 3);
    expect(payload.details[0].vatAmount).toBeCloseTo(9.091, 3);
    expect(payload.details[0].netAmount).toBe(100.000);

    // Master payload:
    expect(payload.discAmount).toBe(0); // item-level discount, master is 0
    expect(payload.serviceCharge).toBeCloseTo(7.871, 3);
    expect(payload.levy).toBeCloseTo(4.329, 3);
    expect(payload.vatExclAmount).toBeCloseTo(90.909, 3);
    expect(payload.vatAmount).toBeCloseTo(9.091, 3);
    // CRITICAL: netAmount must strictly be 100.000, NOT 94!
    expect(payload.netAmount).toBe(100.000);

    // Sales Invoice Payload:
    const invoicePayload = buildSalesInvoicePayload({
      orderPayload: payload,
      payments: [{ paymodeId: 1, amount: 100 }],
      employeeId: 1,
      dayId: 1,
      shiftId: 1,
      transDate: '2026-10-29T00:00:00.000Z',
    });
    expect(invoicePayload.details[0].price).toBe(100.000);
    expect(invoicePayload.details[0].discAmount).toBeCloseTo(21.291, 3);
    expect(invoicePayload.vatExclAmount).toBeCloseTo(90.909, 3);
    expect(invoicePayload.netAmount).toBe(100.000);
  });

  it('Dine-In Inclusive Bill Discount: 1 @ 127.050 with 27.050 bill discount passes exclusive data (master disc: 21.291, net: 100.000, NOT 96) to database', () => {
    localStorage.setItem('posConfigs', JSON.stringify({
      configs: {
        vat: 10,
        levy: 5,
        serviceCharges: 10,
        priceView: 'Inclusive',
        discCalc: 'Inclusive',
      }
    }));
    localStorage.setItem('priceView', 'Inclusive');
    localStorage.setItem('discCalc', 'Inclusive');
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vat', '10');

    const rawCartItems: any[] = [
      {
        uniqueId: 'item-sndnd',
        productId: 99,
        quantity: 1,
        price: 127.050,
        isIncl: true,
        product: { id: 99, name: 'SNDNDKSDKKSLNASKLNS', price: 127.050, vatValue: 10, isIncl: true },
      }
    ];

    const calcResult = calculateOrder(rawCartItems, {
      orderType: 'DineIn',
      orderTypeId: 1,
      billDiscountValue: 27.050,
      billDiscountType: 'amount',
    });

    expect(calcResult.summary.subtotal).toBe(100.000);
    expect(calcResult.summary.totalDiscountExcl).toBeCloseTo(21.291, 3);
    expect(calcResult.summary.grandTotal).toBeCloseTo(100.000, 3);

    const context: any = {
      cartDetails: calcResult.lines,
      subtotal: calcResult.summary.subtotal,
      discount: calcResult.summary.totalDiscount,
      tax: calcResult.summary.vatAmount,
      charges: calcResult.summary.charges,
      totalServiceCharge: calcResult.summary.serviceCharge,
      totalLevy: calcResult.summary.levy,
      total: calcResult.summary.grandTotal,
      deliveryCharge: 0,
      selectedOrderTypeName: 'DineIn',
      selectedOrderTypeId: 1,
      billDiscountValue: 27.050,
      billDiscountType: 'amount',
    };

    const session: any = {
      userId: 1,
      employeeId: 1,
      customerId: 1,
      transDate: '2026-10-29T00:00:00.000Z',
    };

    const payload = buildDirectSettleOrderPayload(context, session);
    expect(payload.details[0].price).toBe(100.000);
    expect(payload.details[0].discAmount).toBe(0); // bill discount, line disc is 0
    expect(payload.discAmount).toBeCloseTo(21.291, 3); // compound reverse calculated discount
    expect(payload.vatExclAmount).toBeCloseTo(90.909, 3);
    expect(payload.vatAmount).toBeCloseTo(9.091, 3);
    expect(payload.netAmount).toBeCloseTo(100.000, 3);

    const updatePayload = buildUpdateOrderPayload(105, context, session);
    expect(updatePayload.details[0].price).toBe(100.000);
    expect(updatePayload.details[0].discAmount).toBe(0);
    expect(updatePayload.discAmount).toBeCloseTo(21.291, 3);
    expect(updatePayload.vatExclAmount).toBeCloseTo(90.909, 3);
    expect(updatePayload.netAmount).toBeCloseTo(100.000, 3);
  });
});
