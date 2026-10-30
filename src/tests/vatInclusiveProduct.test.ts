import { describe, it, expect, beforeEach } from 'vitest';
import { calculateOrder, type BillingConfig } from '../features/pos/terminal/utils/billing';
import { buildUnifiedOrderPricing } from '../features/pos/utils/orderPricing';
import { buildNewOrderPayload } from '../features/pos/terminal/mappers/orderPayloadMapper';

describe('VAT-Inclusive Product Pricing (Product Master [x] INCL. Checkbox)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('decimalPart', '3');
    localStorage.setItem('currencySymbol', 'BHD');
    localStorage.setItem('priceView', 'Exclusive');
    localStorage.setItem('printPrice', 'Exclusive');
    localStorage.setItem('discCalc', 'Exclusive');
    localStorage.setItem('vatStatus', 'true');
    localStorage.setItem('posConfigs', JSON.stringify({
      configs: {
        vat: 10,
        serviceCharges: 10,
        levy: 5,
        priceView: 'Exclusive',
        printPrice: 'Exclusive',
        discountCalc: 'Exclusive',
        vatStatus: true,
      }
    }));
  });

  const takeOutConfig: BillingConfig = {
    serviceChargeRate: 0,
    levyRate: 0.05,
    vatRate: 0.10,
    vatType: 'Exclusive',
    discountType: 'Exclusive',
    orderType: 'TakeOut',
  };

  const dineInConfig: BillingConfig = {
    serviceChargeRate: 0.10,
    levyRate: 0.05,
    vatRate: 0.10,
    vatType: 'Exclusive',
    discountType: 'Exclusive',
    orderType: 'DineIn',
  };

  it('1. TakeOut order with 1 VAT-inclusive product (Demo @ 10.000, 10% VAT, 5% Levy): extracts base price 9.091, NOT 8.658', () => {
    // Product Demo from Product Master: Price 10.000, [x] INCL checked, 10% VAT
    const cartItems = [
      {
        productId: 6,
        name: 'Demo',
        price: 10,
        quantity: 1,
        isIncl: true, // VAT-inclusive only (NOT levy or service charge inclusive)
        product: { id: 6, name: 'Demo', price: 10, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // 10.000 / (1 + 0.10) = 9.0909091...
    expect(line.basePrice).toBeCloseTo(9.0909091, 5);
    expect(line.basePrice).not.toBeCloseTo(8.658, 2); // MUST NOT be 8.658!
    expect(line.price).toBeCloseTo(9.0909091, 5); // Unit price in exclusive cart must be 9.091
    expect(line.amount).toBeCloseTo(9.0909091, 5);

    // TakeOut has 0% Service Charge, 5% Levy on Base
    // Levy: 5% * 9.0909091 = 0.4545455...
    expect(line.sc).toBe(0);
    expect(line.levy).toBeCloseTo(0.4545455, 4);

    // Net Value (Taxable Base): 9.0909091 + 0.4545455 = 9.5454545...
    expect(line.vatBase).toBeCloseTo(9.5454545, 4);

    // VAT: 10% on 9.5454545 = 0.9545455...
    expect(line.vatAmount).toBeCloseTo(0.9545455, 4);

    // Grand Total: 9.5454545 + 0.9545455 = 10.500
    expect(line.lineNetAmount).toBeCloseTo(10.500, 3);

    // Summary assertions
    expect(result.summary.subtotal).toBeCloseTo(9.0909091, 3);
    expect(result.summary.levy).toBeCloseTo(0.4545455, 3);
    expect(result.summary.charges).toBeCloseTo(0.4545455, 3);
    expect(result.summary.vatExclAmount).toBeCloseTo(9.5454545, 3);
    expect(result.summary.vatAmount).toBeCloseTo(0.9545455, 3);
    expect(result.summary.grandTotal).toBeCloseTo(10.500, 3);
  });

  it('2. DineIn order with 1 VAT-inclusive product (Demo @ 10.000, 10% VAT, 10% SC, 5% Levy): extracts base price 9.091, NOT 8.something', () => {
    const cartItems = [
      {
        productId: 6,
        name: 'Demo',
        price: 10,
        quantity: 1,
        isIncl: true,
        product: { id: 6, name: 'Demo', price: 10, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: dineInConfig,
      orderType: 'DineIn',
    });

    const [line] = result.lines;
    // Base Price: 10 / 1.10 = 9.0909091
    expect(line.basePrice).toBeCloseTo(9.0909091, 5);

    // Service Charge (10% on 9.0909091): 0.9090909...
    expect(line.sc).toBeCloseTo(0.9090909, 4);

    // Levy (5% on Base + SC = 10.000): 0.5000000...
    expect(line.levy).toBeCloseTo(0.5000000, 4);

    // Total Charges: 0.9090909 + 0.5000000 = 1.4090909
    expect(result.summary.charges).toBeCloseTo(1.4090909, 3);

    // Net Value (Taxable Base): 9.0909091 + 1.4090909 = 10.500
    expect(line.vatBase).toBeCloseTo(10.500, 4);

    // VAT (10% on 10.500): 1.050
    expect(line.vatAmount).toBeCloseTo(1.050, 4);

    // Grand Total: 10.500 + 1.050 = 11.550
    expect(line.lineNetAmount).toBeCloseTo(11.550, 3);
    expect(result.summary.grandTotal).toBeCloseTo(11.550, 3);
  });

  it('3. TakeOut order with 2 VAT-inclusive products (2 Demo @ 10.000): subtotal is 18.182, charges 0.909, total 21.000', () => {
    const cartItems = [
      {
        productId: 6,
        name: 'Demo',
        price: 10,
        quantity: 2,
        isIncl: true,
        product: { id: 6, name: 'Demo', price: 10, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    expect(line.basePrice).toBeCloseTo(9.0909091, 5);
    expect(line.amount).toBeCloseTo(18.1818182, 4);
    expect(line.levy).toBeCloseTo(0.9090909, 4);
    expect(line.vatBase).toBeCloseTo(19.0909091, 4);
    expect(line.vatAmount).toBeCloseTo(1.9090909, 4);
    expect(line.lineNetAmount).toBeCloseTo(21.000, 3);
    expect(result.summary.grandTotal).toBeCloseTo(21.000, 3);
  });

  it('4. verifies backend payload mapping for VAT-inclusive product passes exact 9.091 base price and correct levy', () => {
    const rawCartItems = [
      {
        uniqueId: 'item-1',
        productId: 6,
        price: 10,
        quantity: 1,
        isIncl: true,
        product: { id: 6, name: 'Demo', price: 10, vatValue: 10, isIncl: true, unitId: 1 },
      },
    ];

    const calcResult = calculateOrder(rawCartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
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
      selectedOrderTypeId: 2,
      selectedOrderTypeName: 'TakeOut',
      selectedCustomerId: 1,
    };

    const session: any = {
      dayId: 1,
      shiftId: 1,
      userId: 1,
      customerId: 1,
      transDate: '2026-10-29T10:00:00',
    };

    const payload = buildNewOrderPayload(context, session);

    // Detail row assertions
    expect(payload.details).toHaveLength(1);
    const detail = payload.details[0];
    expect(detail.productId).toBe(6);
    expect(detail.price).toBeCloseTo(9.0909091, 5);
    expect(detail.basePrice).toBeCloseTo(9.0909091, 5);
    expect(detail.isPriceTaxExclusive).toBe(true);
    expect(detail.levy).toBeCloseTo(0.4545455, 4);
    expect(detail.serviceCharge).toBe(0);
    expect(detail.vatAmount).toBeCloseTo(0.9545455, 4);
    expect(detail.netAmount).toBeCloseTo(10.500, 3);

    // Master row assertions
    expect(payload.levy).toBeCloseTo(0.4545455, 3);
    expect(payload.serviceCharge).toBe(0);
    expect(payload.vatExclAmount).toBeCloseTo(9.5454545, 3);
    expect(payload.vatAmount).toBeCloseTo(0.9545455, 3);
    expect(payload.netAmount).toBeCloseTo(10.500, 3);
  });

  it('5. buildUnifiedOrderPricing renders accurate values for recall and settle screens', () => {
    const rawOrder = {
      masterData: {
        orderNo: 201,
        orderTypeId: 2,
        orderTypeName: 'TakeOut',
        discAmount: 0,
        discPer: 0,
        serviceCharge: 0,
        levy: 0.455,
        vatExclAmount: 9.546,
        vatAmount: 0.955,
        netAmount: 10.500,
      },
      detailsData: [
        {
          productId: 6,
          productName: 'Demo',
          qty: 1,
          price: 9.091,
          basePrice: 9.091,
          discAmount: 0,
          serviceCharge: 0,
          levy: 0.455,
          vatAmount: 0.955,
          netAmount: 10.500,
          mapId: 1,
        },
      ],
    };

    const pricing = buildUnifiedOrderPricing(rawOrder, { orderType: 'TakeOut' });

    expect(pricing.lines[0].exclusiveRate).toBeCloseTo(9.091, 3);
    expect(pricing.lines[0].exclusiveAmount).toBeCloseTo(9.091, 3);
    expect(pricing.summary.charges).toBeCloseTo(0.455, 3);
    expect(pricing.summary.netValue).toBeCloseTo(9.546, 3);
    expect(pricing.summary.vatAmount).toBeCloseTo(0.955, 3);
    expect(pricing.summary.grandTotal).toBeCloseTo(10.500, 3);
  });

  it('6. Mixed Cart: 1 VAT-inclusive item (Demo @ 10, isIncl: true) + 1 VAT-exclusive item (Burger @ 10, isIncl: false) in TakeOut', () => {
    const cartItems = [
      {
        productId: 6,
        name: 'Demo',
        price: 10,
        quantity: 1,
        isIncl: true,
        product: { id: 6, name: 'Demo', price: 10, vatValue: 10, isIncl: true },
      },
      {
        productId: 7,
        name: 'Burger',
        price: 10,
        quantity: 1,
        isIncl: false,
        product: { id: 7, name: 'Burger', price: 10, vatValue: 10, isIncl: false },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [demoLine, burgerLine] = result.lines;
    // Demo is VAT-inclusive: 10 / 1.10 = 9.091
    expect(demoLine.basePrice).toBeCloseTo(9.0909091, 5);
    // Burger is VAT-exclusive: 10.000
    expect(burgerLine.basePrice).toBe(10.000);

    // Subtotal: 9.0909091 + 10 = 19.0909091
    expect(result.summary.subtotal).toBeCloseTo(19.0909091, 4);

    // Levy: 5% * 19.0909091 = 0.9545455
    expect(result.summary.levy).toBeCloseTo(0.9545455, 4);

    // Net Value: 19.0909091 + 0.9545455 = 20.0454545
    expect(result.summary.vatExclAmount).toBeCloseTo(20.0454545, 4);

    // VAT: 10% * 20.0454545 = 2.0045455
    expect(result.summary.vatAmount).toBeCloseTo(2.0045455, 4);

    // Grand Total: 20.0454545 + 2.0045455 = 22.050
    expect(result.summary.grandTotal).toBeCloseTo(22.050, 3);
  });

  it('7. Percentage Item Discount (50%) on VAT-inclusive product correctly reduces base and charges', () => {
    const cartItems = [
      {
        productId: 6,
        name: 'Demo',
        price: 10,
        quantity: 1,
        isIncl: true,
        discountType: 'percentage' as const,
        discountValue: 50,
        product: { id: 6, name: 'Demo', price: 10, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // Base Price: 9.0909091
    expect(line.basePrice).toBeCloseTo(9.0909091, 5);
    // Discount: 50% * 9.0909091 = 4.5454545
    expect(line.itemDiscountAmount).toBeCloseTo(4.5454545, 4);
    // Net Value: 4.5454545
    expect(line.netValue).toBeCloseTo(4.5454545, 4);
    // Levy: 5% * 4.5454545 = 0.2272727
    expect(line.levy).toBeCloseTo(0.2272727, 4);
    // VAT Base: 4.5454545 + 0.2272727 = 4.7727273
    expect(line.vatBase).toBeCloseTo(4.7727273, 4);
    // VAT: 10% * 4.7727273 = 0.4772727
    expect(line.vatAmount).toBeCloseTo(0.4772727, 4);
    // Grand Total: 4.7727273 + 0.4772727 = 5.250
    expect(line.lineNetAmount).toBeCloseTo(5.250, 3);
    expect(result.summary.grandTotal).toBeCloseTo(5.250, 3);
  });

  it('8. Zero VAT Rate / Exempt product (vatValue = 0) with isIncl: true maintains full face value as base', () => {
    const cartItems = [
      {
        productId: 8,
        name: 'Exempt Demo',
        price: 10,
        quantity: 1,
        isIncl: true,
        product: { id: 8, name: 'Exempt Demo', price: 10, vatValue: 0, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: { ...takeOutConfig, vatRate: 0 },
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // Since VAT is 0%, base price is 10.000 / (1 + 0) = 10.000
    expect(line.basePrice).toBe(10.000);
    expect(line.levy).toBeCloseTo(0.500, 3); // 5% levy
    expect(line.vatAmount).toBe(0);
    expect(line.lineNetAmount).toBeCloseTo(10.500, 3);
  });
});
