import { describe, it, expect, beforeEach } from 'vitest';
import { calculateOrder, type BillingConfig } from '../features/pos/terminal/utils/billing';
import { buildUnifiedOrderPricing } from '../features/pos/utils/orderPricing';
import { buildNewOrderPayload, buildUpdateOrderPayload } from '../features/pos/terminal/mappers/orderPayloadMapper';
import { mapOrderDetailsToCartItems } from '../features/pos/terminal/mappers/orderDetailToCartMapper';

describe('VAT & Charges Inclusive Product Pricing (Product Master [x] INCL. Checkbox)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('decimalPart', '3');
    localStorage.setItem('currencySymbol', 'BHD');
    localStorage.setItem('priceView', 'Exclusive');
    localStorage.setItem('printPrice', 'Inclusive');
    localStorage.setItem('discCalc', 'Inclusive');
    localStorage.setItem('vatStatus', 'true');
    localStorage.setItem('posConfigs', JSON.stringify({
      configs: {
        vat: 10,
        serviceCharges: 10,
        levy: 5,
        priceView: 'Exclusive',
        printPrice: 'Inclusive',
        discountCalc: 'Inclusive',
        vatStatus: true,
      }
    }));
  });

  const takeOutConfig: BillingConfig = {
    serviceChargeRate: 0,
    levyRate: 0.05,
    vatRate: 0.10,
    vatType: 'Exclusive',
    discountType: 'Inclusive',
    orderType: 'TakeOut',
  };

  const dineInConfig: BillingConfig = {
    serviceChargeRate: 0.10,
    levyRate: 0.05,
    vatRate: 0.10,
    vatType: 'Exclusive',
    discountType: 'Inclusive',
    orderType: 'DineIn',
  };

  it('1. Exact User Scenario: Freshi Lime @ 3.000 with [x] INCL. in TakeOut with 5% Levy and 10% VAT has Grand Total exactly 3.000 (NOT 3.150)', () => {
    // Freshi Lime has price 3.000 in Product Master with [x] INCL. checked
    // Combined factor = (1 + 0.10) * (1 + 0.05) = 1.155
    const cartItems = [
      {
        productId: 4,
        name: 'FRESHI LIME',
        price: 3.000,
        quantity: 1,
        isIncl: true,
        product: { id: 4, name: 'FRESHI LIME', price: 3.000, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // Base Price: 3.000 / 1.155 = 2.5974026...
    expect(line.basePrice).toBeCloseTo(2.5974026, 5);
    expect(line.price).toBeCloseTo(2.5974026, 5); // Unit price in exclusive cart is 2.597
    expect(line.amount).toBeCloseTo(2.5974026, 5);

    // TakeOut has 0% Service Charge, 5% Levy on Base
    // Levy: 5% * 2.5974026 = 0.1298701... (~0.130)
    expect(line.sc).toBe(0);
    expect(line.levy).toBeCloseTo(0.1298701, 4);

    // Net Value (Taxable Base): 2.5974026 + 0.1298701 = 2.7272727... (~2.727)
    expect(line.vatBase).toBeCloseTo(2.7272727, 4);

    // VAT: 10% on 2.7272727 = 0.2727273... (~0.273)
    expect(line.vatAmount).toBeCloseTo(0.2727273, 4);

    // Grand Total MUST BE exactly 3.000 (2.7272727 + 0.2727273 = 3.000), NEVER 3.150!
    expect(line.lineNetAmount).toBeCloseTo(3.000, 3);

    // Summary assertions
    expect(result.summary.subtotal).toBeCloseTo(2.5974026, 3);
    expect(result.summary.charges).toBeCloseTo(0.1298701, 3);
    expect(result.summary.levy).toBeCloseTo(0.1298701, 3);
    expect(result.summary.vatExclAmount).toBeCloseTo(2.7272727, 3);
    expect(result.summary.vatAmount).toBeCloseTo(0.2727273, 3);
    expect(result.summary.grandTotal).toBeCloseTo(3.000, 3);
  });

  it('2. TakeOut order with 1 [x] INCL. product (Demo @ 10.000, 10% VAT, 5% Levy): Grand Total is 10.000 (NOT 10.500)', () => {
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
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // 10.000 / 1.155 = 8.6580087...
    expect(line.basePrice).toBeCloseTo(8.6580087, 5);
    expect(line.amount).toBeCloseTo(8.6580087, 5);

    // Levy: 5% * 8.6580087 = 0.4329004...
    expect(line.sc).toBe(0);
    expect(line.levy).toBeCloseTo(0.4329004, 4);

    // Net Value (Taxable Base): 8.6580087 + 0.4329004 = 9.0909091...
    expect(line.vatBase).toBeCloseTo(9.0909091, 4);

    // VAT: 10% on 9.0909091 = 0.9090909...
    expect(line.vatAmount).toBeCloseTo(0.9090909, 4);

    // Grand Total: 9.0909091 + 0.9090909 = 10.000 (NOT 10.500!)
    expect(line.lineNetAmount).toBeCloseTo(10.000, 3);
    expect(result.summary.grandTotal).toBeCloseTo(10.000, 3);
  });

  it('3. DineIn order with 1 [x] INCL. product (Demo @ 10.000, 10% VAT, 10% SC, 5% Levy): Grand Total is 10.000 (NOT 11.550)', () => {
    // Combined factor for DineIn: (1 + 0.10) * (1 + 0.05) * (1 + 0.10) = 1.2705
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
    // Base Price: 10 / 1.2705 = 7.8709169...
    expect(line.basePrice).toBeCloseTo(7.8709169, 5);

    // Service Charge (10% on base): 0.7870917...
    expect(line.sc).toBeCloseTo(0.7870917, 4);

    // Levy (5% on Base + SC = 8.6580086...): 0.4329004...
    expect(line.levy).toBeCloseTo(0.4329004, 4);

    // Total Charges: 0.7870917 + 0.4329004 = 1.2200000 (~1.220)
    expect(result.summary.charges).toBeCloseTo(1.2199921, 3);

    // Net Value (Taxable Base): 7.8709169 + 1.2199921 = 9.090909...
    expect(line.vatBase).toBeCloseTo(9.0909091, 4);

    // VAT (10% on 9.0909091): 0.9090909...
    expect(line.vatAmount).toBeCloseTo(0.9090909, 4);

    // Grand Total: 9.0909091 + 0.9090909 = 10.000! (NOT 11.550!)
    expect(line.lineNetAmount).toBeCloseTo(10.000, 3);
    expect(result.summary.grandTotal).toBeCloseTo(10.000, 3);
  });

  it('4. TakeOut order with 2 [x] INCL. products (2 Freshi Lime @ 3.000): Grand Total is exactly 6.000', () => {
    const cartItems = [
      {
        productId: 4,
        name: 'FRESHI LIME',
        price: 3,
        quantity: 2,
        isIncl: true,
        product: { id: 4, name: 'FRESHI LIME', price: 3, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    expect(line.basePrice).toBeCloseTo(2.5974026, 5);
    expect(line.amount).toBeCloseTo(5.1948052, 4);
    expect(line.levy).toBeCloseTo(0.2597403, 4);
    expect(line.vatBase).toBeCloseTo(5.4545455, 4);
    expect(line.vatAmount).toBeCloseTo(0.5454545, 4);
    expect(line.lineNetAmount).toBeCloseTo(6.000, 3);
    expect(result.summary.grandTotal).toBeCloseTo(6.000, 3);
  });

  it('5. Backend payload mapping for [x] INCL. product passes tax-exclusive base and correct netAmount equal to catalog price', () => {
    const rawCartItems = [
      {
        uniqueId: 'item-1',
        productId: 4,
        price: 3,
        quantity: 1,
        isIncl: true,
        product: { id: 4, name: 'FRESHI LIME', price: 3, vatValue: 10, isIncl: true, unitId: 1 },
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
      transDate: '2026-10-31T10:00:00',
    };

    const payload = buildNewOrderPayload(context, session);

    // Detail row assertions
    expect(payload.details).toHaveLength(1);
    const detail = payload.details[0];
    expect(detail.productId).toBe(4);
    expect(detail.price).toBeCloseTo(2.5974026, 5);
    expect(detail.basePrice).toBeCloseTo(2.5974026, 5);
    expect(detail.isPriceTaxExclusive).toBe(true);
    expect(detail.levy).toBeCloseTo(0.1298701, 4);
    expect(detail.serviceCharge).toBe(0);
    expect(detail.vatAmount).toBeCloseTo(0.2727273, 4);
    expect(detail.netAmount).toBeCloseTo(3.000, 3);

    // Master row assertions
    expect(payload.levy).toBeCloseTo(0.1298701, 3);
    expect(payload.serviceCharge).toBe(0);
    expect(payload.vatExclAmount).toBeCloseTo(2.7272727, 3);
    expect(payload.vatAmount).toBeCloseTo(0.2727273, 3);
    expect(payload.netAmount).toBeCloseTo(3.000, 3);
  });

  it('6. buildUnifiedOrderPricing renders accurate values for recall and settle screens matching 3.000 Grand Total', () => {
    const rawOrder = {
      masterData: {
        orderNo: 401,
        orderTypeId: 2,
        orderTypeName: 'TakeOut',
        discAmount: 0,
        discPer: 0,
        serviceCharge: 0,
        levy: 0.130,
        vatExclAmount: 2.727,
        vatAmount: 0.273,
        netAmount: 3.000,
      },
      detailsData: [
        {
          productId: 4,
          productName: 'FRESHI LIME',
          qty: 1,
          price: 2.597,
          basePrice: 2.597,
          discAmount: 0,
          serviceCharge: 0,
          levy: 0.130,
          vatAmount: 0.273,
          netAmount: 3.000,
          mapId: 1,
        },
      ],
    };

    const pricing = buildUnifiedOrderPricing(rawOrder, { orderType: 'TakeOut' });

    expect(pricing.lines[0].exclusiveRate).toBeCloseTo(2.597, 3);
    expect(pricing.lines[0].inclusiveRate).toBeCloseTo(3.000, 3);
    expect(pricing.lines[0].exclusiveAmount).toBeCloseTo(2.597, 3);
    expect(pricing.lines[0].inclusiveAmount).toBeCloseTo(3.000, 3);
    expect(pricing.summary.charges).toBeCloseTo(0.130, 3);
    expect(pricing.summary.netValue).toBeCloseTo(2.727, 3);
    expect(pricing.summary.vatAmount).toBeCloseTo(0.273, 3);
    expect(pricing.summary.grandTotal).toBeCloseTo(3.000, 3);
  });

  it('7. Mixed Cart: 1 [x] INCL. item (Freshi Lime @ 3, isIncl: true) + 1 Exclusive item (Burger @ 10, isIncl: false) in TakeOut', () => {
    const cartItems = [
      {
        productId: 4,
        name: 'FRESHI LIME',
        price: 3,
        quantity: 1,
        isIncl: true,
        product: { id: 4, name: 'FRESHI LIME', price: 3, vatValue: 10, isIncl: true },
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

    const [freshiLine, burgerLine] = result.lines;
    // Freshi Lime is inclusive: base is 3 / 1.155 = 2.5974026, lineNetAmount is 3.000
    expect(freshiLine.basePrice).toBeCloseTo(2.5974026, 5);
    expect(freshiLine.lineNetAmount).toBeCloseTo(3.000, 3);

    // Burger is exclusive: base is 10.000, lineNetAmount is 10 * 1.05 * 1.10 = 11.550
    expect(burgerLine.basePrice).toBe(10.000);
    expect(burgerLine.lineNetAmount).toBeCloseTo(11.550, 3);

    // Combined Grand Total: 3.000 + 11.550 = 14.550
    expect(result.summary.grandTotal).toBeCloseTo(14.550, 3);
  });

  it('8. Percentage Discount (10%) on [x] INCL. product correctly yields 3.000 - 10% = 2.700 Grand Total', () => {
    const cartItems = [
      {
        productId: 4,
        name: 'FRESHI LIME',
        price: 3,
        quantity: 1,
        isIncl: true,
        discountType: 'percentage' as const,
        discountValue: 10,
        product: { id: 4, name: 'FRESHI LIME', price: 3, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // Base Price: 2.5974026
    expect(line.basePrice).toBeCloseTo(2.5974026, 5);
    // Net Value: 2.5974026 * 0.9 = 2.3376623
    expect(line.netValue).toBeCloseTo(2.3376623, 4);
    // Levy: 5% * 2.3376623 = 0.1168831
    expect(line.levy).toBeCloseTo(0.1168831, 4);
    // VAT: 10% * (2.3376623 + 0.1168831) = 0.2454545
    expect(line.vatAmount).toBeCloseTo(0.2454545, 4);
    // Grand Total: 2.7000000
    expect(line.lineNetAmount).toBeCloseTo(2.700, 3);
    expect(result.summary.grandTotal).toBeCloseTo(2.700, 3);
  });

  it('9. POS Inclusive View: Cart shows 3.000 and Grand Total is 3.000', () => {
    const inclusiveConfig: BillingConfig = {
      ...takeOutConfig,
      vatType: 'Inclusive',
    };

    const cartItems = [
      {
        productId: 4,
        name: 'FRESHI LIME',
        price: 3,
        quantity: 1,
        isIncl: true,
        product: { id: 4, name: 'FRESHI LIME', price: 3, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: inclusiveConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // In Inclusive View, line.price is 3.000
    expect(line.price).toBeCloseTo(3.000, 3);
    expect(line.lineTotal).toBeCloseTo(3.000, 3);
    expect(result.summary.grandTotal).toBeCloseTo(3.000, 3);
  });

  it('10. Extras price 1.000 includes all charges: Freshi Lime (3.000) + Extra (1.000) in TakeOut has Grand Total exactly 4.000', () => {
    const cartItems = [
      {
        productId: 4,
        name: 'FRESHI LIME',
        price: 3,
        quantity: 1,
        isIncl: true,
        extras: [
          { id: 101, name: 'Extra Mint', price: 1.000, qty: 1, typeId: 2 },
        ],
        product: { id: 4, name: 'FRESHI LIME', price: 3, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // Total gross is 3.000 + 1.000 = 4.000
    // Combined base is 4.000 / 1.155 = 3.4632035...
    expect(line.amount).toBeCloseTo(3.4632035, 4);
    // Extra base is 1.000 / 1.155 = 0.8658009...
    // Product base is 3.000 / 1.155 = 2.5974026...
    expect(line.basePrice).toBeCloseTo(2.5974026, 4);
    expect(line.lineNetAmount).toBeCloseTo(4.000, 3);
    expect(result.summary.grandTotal).toBeCloseTo(4.000, 3);
  });

  it('11. Extras price 1.000 on Exclusive product: Burger (10.000 exclusive) + Extra (1.000 inclusive of charges) = Grand Total 12.550 (NOT 12.705)', () => {
    // Burger @ 10.000 exclusive: net is 10.000 * 1.155 = 11.550
    // Extra @ 1.000: already includes all charges, net is exactly 1.000
    // Grand Total: 11.550 + 1.000 = 12.550
    const cartItems = [
      {
        productId: 7,
        name: 'Burger',
        price: 10,
        quantity: 1,
        isIncl: false,
        extras: [
          { id: 102, name: 'Extra Cheese', price: 1.000, qty: 1, typeId: 2 },
        ],
        product: { id: 7, name: 'Burger', price: 10, vatValue: 10, isIncl: false },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // Burger base is 10.000, Extra base is 1.000 / 1.155 = 0.8658009
    // Line base amount: 10.8658009
    expect(line.baseAmount).toBeCloseTo(10.000, 4);
    expect(line.amount).toBeCloseTo(10.8658009, 4);
    // Grand total: 10.8658009 * 1.155 = 12.550
    expect(line.lineNetAmount).toBeCloseTo(12.550, 3);
    expect(result.summary.grandTotal).toBeCloseTo(12.550, 3);
  });

  it('12. DineIn with Service Charge (10%), Levy (5%), VAT (10%): Freshi Lime (3.000) + Extra (1.000) has Grand Total exactly 4.000', () => {
    // DineIn combined factor: (1 + 0.10) * (1 + 0.05) * (1 + 0.10) = 1.2705
    const cartItems = [
      {
        productId: 4,
        name: 'FRESHI LIME',
        price: 3,
        quantity: 1,
        isIncl: true,
        extras: [
          { id: 101, name: 'Extra Mint', price: 1.000, qty: 1, typeId: 2 },
        ],
        product: { id: 4, name: 'FRESHI LIME', price: 3, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: dineInConfig,
      orderType: 'DineIn',
    });

    const [line] = result.lines;
    // Total gross is 4.000
    expect(line.lineNetAmount).toBeCloseTo(4.000, 3);
    expect(result.summary.grandTotal).toBeCloseTo(4.000, 3);
  });

  it('13. buildUnifiedOrderPricing correctly formats Extra (1.000) for Inclusive and Exclusive receipt printing', () => {
    const rawOrder = {
      masterData: {
        orderNo: 405,
        orderTypeId: 2,
        orderTypeName: 'TakeOut',
        netAmount: 4.000,
      },
      detailsData: [
        {
          productId: 4,
          productName: 'FRESHI LIME',
          qty: 1,
          price: 3.000,
          isIncl: true,
          netAmount: 4.000,
          mapId: 1,
          extras: [
            { id: 101, name: 'Extra Mint', price: 1.000, qty: 1, typeId: 2 },
          ],
        },
      ],
    };

    const pricing = buildUnifiedOrderPricing(rawOrder, { orderType: 'TakeOut' });
    const line = pricing.lines[0];
    const extra = line.extras[0];

    // Inclusive print price: 1.000
    expect(extra.inclusivePrice).toBeCloseTo(1.000, 3);
    expect(extra.getPrice?.(true)).toBeCloseTo(1.000, 3);

    // Exclusive print price: 1.000 / 1.155 = 0.866
    expect(extra.exclusivePrice).toBeCloseTo(0.866, 3);
    expect(extra.getPrice?.(false)).toBeCloseTo(0.866, 3);

    // Grand total on unified pricing is exactly 4.000
    expect(pricing.summary.grandTotal).toBeCloseTo(4.000, 3);
  });

  it('14. Rule 4: Manual Price Override on [x] INCL. product treats manual price as Inclusive (Grand Total = entered price)', () => {
    // User enters 5.000 manually for Freshi Lime ([x] INCL. in master)
    const cartItems = [
      {
        productId: 4,
        name: 'FRESHI LIME',
        price: 5.000,
        quantity: 1,
        isIncl: true, // Inherits product master inclusive nature
        product: { id: 4, name: 'FRESHI LIME', price: 3.000, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // Base Price: 5.000 / 1.155 = 4.3290043...
    expect(line.basePrice).toBeCloseTo(4.3290043, 5);
    // Line net amount is exactly 5.000!
    expect(line.lineNetAmount).toBeCloseTo(5.000, 3);
    expect(result.summary.grandTotal).toBeCloseTo(5.000, 3);
  });

  it('15. Rule 4: Manual Price Override on Exclusive product treats manual price as Exclusive (adds charges and VAT on top)', () => {
    // User enters 8.000 manually for Burger (Exclusive in master)
    const cartItems = [
      {
        productId: 7,
        name: 'Burger',
        price: 8.000,
        quantity: 1,
        isIncl: false, // Inherits product master exclusive nature
        product: { id: 7, name: 'Burger', price: 10.000, vatValue: 10, isIncl: false },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // Base Price: 8.000
    expect(line.basePrice).toBe(8.000);
    // Levy (5%): 0.400
    expect(line.levy).toBeCloseTo(0.400, 3);
    // VAT (10% on 8.400): 0.840
    expect(line.vatAmount).toBeCloseTo(0.840, 3);
    // Grand Total: 8.000 + 0.400 + 0.840 = 9.240
    expect(line.lineNetAmount).toBeCloseTo(9.240, 3);
    expect(result.summary.grandTotal).toBeCloseTo(9.240, 3);
  });

  it('16. Conditions 1-4 (Invariance): Switching Price View / Print View between Inclusive & Exclusive NEVER alters Grand Total, VAT, or Charges', () => {
    const rawItems = [
      {
        productId: 7,
        name: 'Burger',
        price: 10.000,
        quantity: 1,
        isIncl: false,
        product: { id: 7, name: 'Burger', price: 10.000, vatValue: 10, isIncl: false },
      },
    ];

    // Under Exclusive Price View
    const resExcl = calculateOrder(rawItems, {
      config: { ...takeOutConfig, vatType: 'Exclusive' },
      orderType: 'TakeOut',
    });

    // Under Inclusive Price View
    const resIncl = calculateOrder(rawItems, {
      config: { ...takeOutConfig, vatType: 'Inclusive' },
      orderType: 'TakeOut',
    });

    // Both MUST produce the EXACT same Grand Total (11.550), VAT (1.050), and Levy (0.500)
    expect(resExcl.summary.grandTotal).toBeCloseTo(11.550, 3);
    expect(resIncl.summary.grandTotal).toBeCloseTo(11.550, 3);
    expect(resExcl.summary.vatAmount).toBeCloseTo(1.050, 3);
    expect(resIncl.summary.vatAmount).toBeCloseTo(1.050, 3);
    expect(resExcl.summary.levy).toBeCloseTo(0.500, 3);
    expect(resIncl.summary.levy).toBeCloseTo(0.500, 3);
  });

  it('17. Extras data passed to backend: payload.modifiers price MUST BE strictly TAX-EXCLUSIVE', () => {
    // TakeOut order with 1 item + 1 Extra priced at 1.000 (inclusive of charges/tax)
    // In TakeOut: SC = 0%, Levy = 5%, VAT = 10% -> combinedFactor = 1.05 * 1.10 = 1.155
    // Tax-exclusive extras price = 1.000 / 1.155 = 0.8658009
    const rawCartItemsTakeOut = [
      {
        uniqueId: 'item-takeout',
        productId: 7,
        price: 1.000,
        quantity: 1,
        isIncl: true,
        product: { id: 7, name: 'TEST PRICE1', price: 1.000, vatValue: 10, isIncl: true, unitId: 1 },
        extras: [
          { id: 101, name: 'Cheese Extra', price: 1.000, qty: 1, typeId: 2 },
        ],
      },
    ];

    const calcTakeOut = calculateOrder(rawCartItemsTakeOut, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const contextTakeOut: any = {
      cartDetails: calcTakeOut.lines,
      subtotal: calcTakeOut.summary.subtotal,
      discount: 0,
      tax: calcTakeOut.summary.vatAmount,
      charges: calcTakeOut.summary.charges,
      totalServiceCharge: calcTakeOut.summary.serviceCharge,
      totalLevy: calcTakeOut.summary.levy,
      total: calcTakeOut.summary.grandTotal,
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
      transDate: '2026-10-31T10:00:00',
    };

    const payloadTakeOut = buildNewOrderPayload(contextTakeOut, session);

    // Assert that modifiers array contains the extra
    expect(payloadTakeOut.modifiers).toHaveLength(1);
    const extraTakeOut = payloadTakeOut.modifiers[0];
    expect(extraTakeOut.modifierId).toBe(101);
    expect(extraTakeOut.qty).toBe(1);

    // MUST be strictly TAX-EXCLUSIVE (0.8658009), NOT 1.000 (inclusive) and NOT 0.7871 (DineIn)
    expect(extraTakeOut.price).toBeCloseTo(0.8658009, 5);
    expect(extraTakeOut.amount).toBeCloseTo(0.8658009, 5);

    // In DineIn: SC = 10%, Levy = 5%, VAT = 10% -> combinedFactor = 1.10 * 1.05 * 1.10 = 1.2705
    // Tax-exclusive extras price = 1.000 / 1.2705 = 0.7870917
    const calcDineIn = calculateOrder(rawCartItemsTakeOut, {
      config: dineInConfig,
      orderType: 'DineIn',
    });

    const contextDineIn: any = {
      cartDetails: calcDineIn.lines,
      subtotal: calcDineIn.summary.subtotal,
      discount: 0,
      tax: calcDineIn.summary.vatAmount,
      charges: calcDineIn.summary.charges,
      totalServiceCharge: calcDineIn.summary.serviceCharge,
      totalLevy: calcDineIn.summary.levy,
      total: calcDineIn.summary.grandTotal,
      deliveryCharge: 0,
      selectedOrderTypeId: 1,
      selectedOrderTypeName: 'DineIn',
      selectedCustomerId: 1,
    };

    const payloadDineIn = buildNewOrderPayload(contextDineIn, session);
    expect(payloadDineIn.modifiers).toHaveLength(1);
    const extraDineIn = payloadDineIn.modifiers[0];
    expect(extraDineIn.modifierId).toBe(101);
    expect(extraDineIn.qty).toBe(1);

    // MUST be strictly TAX-EXCLUSIVE for Dine-In (0.7870917)
    expect(extraDineIn.price).toBeCloseTo(0.7870917, 5);
    expect(extraDineIn.amount).toBeCloseTo(0.7870917, 5);
  });

  it('18. Recall self-healing: recognizes extras from knownExtras cache and adds extra price to individual rate', () => {
    // When backend returns modifiersData without price or typeId (e.g. { modifierId: 6, modifierName: "test" })
    // If modifierId matches known extras, it is classified as an extra (typeId 2) and rolls into individual line price
    const orderData = {
      masterData: {
        orderNo: 148,
        ticketNo: 148,
        orderType: 'TakeOut',
        serviceCharge: 0,
        levy: 0.047619,
        vatExclAmount: 1.000,
        vatAmount: 0.100,
        netAmount: 1.100,
      },
      detailsData: [
        {
          qty: 1,
          productId: 7,
          productName: 'test price1',
          price: 0.952381,
          amount: 0.952381,
          serviceCharge: 0,
          levy: 0.047619,
          vatAmount: 0.100,
          netAmount: 1.100,
          mapId: 1,
        }
      ],
      modifiersData: [
        {
          qty: 1,
          modifierId: 6,
          modifierName: 'test',
          mapId: 1,
        }
      ]
    };

    const unified = buildUnifiedOrderPricing(orderData, {
      orderType: 'TakeOut',
      priceView: 'Exclusive',
      allExtras: [{ id: 6, name: 'test', price: 0, typeId: 2 }],
      products: [{ id: 7, name: 'TEST PRICE1', price: 1.000, vatValue: 10, isIncl: true, unitId: 1 }],
    });

    // Extra is recognized as an extra (+ test) rather than a modifier (* test)
    expect(unified.lines[0].extras).toHaveLength(1);
    expect(unified.lines[0].extras[0].name).toBe('test');
    expect(unified.lines[0].modifiers).toHaveLength(0);

    // Rate and summary match cart
    expect(unified.lines[0].exclusiveRate).toBeCloseTo(0.952, 3);
    expect(unified.summary.subTotalExclusive).toBeCloseTo(0.952, 3);
    expect(unified.summary.charges).toBeCloseTo(0.048, 3);
    expect(unified.summary.vatExclAmount).toBeCloseTo(1.000, 3);
    expect(unified.summary.vatAmount).toBeCloseTo(0.100, 3);
    expect(unified.summary.grandTotal).toBeCloseTo(1.100, 3);
  });

  it('19. Order 149 Swagger payload: detailsData price (0.8658009) + modifiersData price (0.0865801) sums to individual rate 0.952 and matching totals', () => {
    const orderData149 = {
      masterData: {
        orderNo: 149,
        ticketNo: 149,
        orderType: 'TakeOut',
        customer: 'CASH CUSTOMER',
        waiter: 'emp1',
        deliveryCharge: 0,
        discAmount: 0,
        serviceCharge: 0,
        levy: 0.047619,
        vatExclAmount: 1,
        vatAmount: 0.1,
        netAmount: 1.1,
      },
      detailsData: [
        {
          qty: 1,
          productId: 7,
          productName: 'test price1',
          price: 0.8658009,
          amount: 0.8658009,
          discAmount: 0,
          serviceCharge: 0,
          levy: 0.04329,
          vatAmount: 0.0909091,
          mapId: 1,
        }
      ],
      modifiersData: [
        {
          qty: 1,
          modifierId: 6,
          modifierName: 'test',
          price: 0.0865801,
          mapId: 1,
        }
      ]
    };

    const unified = buildUnifiedOrderPricing(orderData149, {
      orderType: 'TakeOut',
      priceView: 'Exclusive',
      allExtras: [{ id: 6, name: 'test', price: 0.100, typeId: 2 }],
      products: [{ id: 7, name: 'TEST PRICE1', price: 1.000, vatValue: 10, isIncl: true, unitId: 1 }],
    });

    // 1. Extra is recognized as an extra
    expect(unified.lines[0].extras).toHaveLength(1);
    expect(unified.lines[0].extras[0].name).toBe('test');

    // 2. Individual line unit rate combines product price (0.8658009) + extra price (0.0865801) = 0.952381
    expect(unified.lines[0].exclusiveRate).toBeCloseTo(0.952, 3);
    expect(unified.lines[0].exclusiveGross).toBeCloseTo(0.952, 3);

    // 3. Totals match cart exactly:
    // Sub Total: 0.952
    // Charges (5% levy on 0.952): 0.048
    // Net Value (vatExclAmount): 1.000
    // VAT (10% on 1.000): 0.100
    // Grand Total: 1.100
    expect(unified.summary.subTotalExclusive).toBeCloseTo(0.952, 3);
    expect(unified.summary.charges).toBeCloseTo(0.048, 3);
    expect(unified.summary.vatExclAmount).toBeCloseTo(1.000, 3);
    expect(unified.summary.vatAmount).toBeCloseTo(0.100, 3);
    expect(unified.summary.grandTotal).toBeCloseTo(1.100, 3);
  });

  it('20. Edit Order 149: mapOrderDetailsToCartItems restores cartItems so calculateOrder yields unit price 0.952 and grand total 1.100', () => {
    const products = [{ id: 7, name: 'TEST PRICE1', price: 1.000, vatValue: 10, isIncl: true, unitId: 1 }];
    const productCache = { 7: products[0] };
    const orderData149 = {
      masterData: {
        orderNo: 149,
        ticketNo: 149,
        orderType: 'TakeOut',
        serviceCharge: 0,
        levy: 0.047619,
        vatExclAmount: 1,
        vatAmount: 0.1,
        netAmount: 1.1,
      },
      detailsData: [
        {
          qty: 1,
          productId: 7,
          productName: 'test price1',
          price: 0.8658009,
          amount: 0.8658009,
          discAmount: 0,
          serviceCharge: 0,
          levy: 0.04329,
          vatAmount: 0.0909091,
          mapId: 1,
        }
      ],
      modifiersData: [
        {
          qty: 1,
          modifierId: 6,
          modifierName: 'test',
          price: 0.0865801,
          mapId: 1,
        }
      ]
    };

    const cartItems = mapOrderDetailsToCartItems(orderData149.detailsData, orderData149.modifiersData, {
      products,
      productCache,
      orderType: 'TakeOut',
    });

    const calcResult = calculateOrder(cartItems, {
      orderType: 'TakeOut',
      productCache,
    });

    // Cart line check
    const [line] = calcResult.lines;
    expect(line.amount).toBeCloseTo(0.952, 3);
    expect(calcResult.summary.grandTotal).toBeCloseTo(1.100, 3);

    // Verify PUT /api/v1/menu/order/149 update payload
    const updatePayload = buildUpdateOrderPayload(
      149,
      {
        cartDetails: calcResult.lines as any,
        selectedCustomerId: 1,
        selectedOrderTypeId: 2,
        selectedOrderTypeName: 'TakeOut',
      } as any,
      {
        dayId: 1,
        shiftId: 1,
        transDate: new Date('2026-10-31').toISOString(),
      }
    );

    expect(updatePayload.orderId).toBe(149);
    expect(updatePayload.details).toHaveLength(1);
    expect(updatePayload.details[0].productId).toBe(7);
    // Detail price combines Base Product (0.8658009) + Extra Cheese (0.0865801) = 0.952381
    expect(updatePayload.details[0].price).toBeCloseTo(0.952381, 4);
    expect(updatePayload.details[0].levy).toBeCloseTo(0.047619, 4);
    expect(updatePayload.details[0].vatAmount).toBeCloseTo(0.100, 4);
    expect(updatePayload.details[0].netAmount).toBeCloseTo(1.100, 3);

    expect(updatePayload.modifiers).toHaveLength(1);
    expect(updatePayload.modifiers[0].modifierId).toBe(6);
    expect(updatePayload.modifiers[0].price).toBeCloseTo(0.0865801, 4);
    expect(updatePayload.modifiers[0].amount).toBeCloseTo(0.0865801, 4);
    expect(updatePayload.modifiers[0].typeId).toBe(2);

    expect(updatePayload.levy).toBeCloseTo(0.047619, 4);
    expect(updatePayload.vatExclAmount).toBeCloseTo(1.000, 3);
    expect(updatePayload.vatAmount).toBeCloseTo(0.100, 3);
    expect(updatePayload.netAmount).toBeCloseTo(1.100, 3);
  });

  it('21. Edit Order 149 -> Add 2nd Item -> Place Order -> Recall Details displays 0.952 (not 0.941) for extras item and 1.818 subtotal', () => {
    localStorage.setItem("priceView", "Exclusive");

    const initialBackendOrder = {
      orderNo: 148,
      ticketNo: 148,
      orderType: "TakeOut",
      customer: "CASH CUSTOMER",
      waiter: "emp1",
      serviceCharge: 0,
      levy: 0.047619,
      vatExclAmount: 1.0,
      vatAmount: 0.1,
      netAmount: 1.1,
      detailsData: [
        {
          qty: 1,
          productId: 7,
          productName: "test price1",
          price: 0.8658009,
          amount: 0.8658009,
          discAmount: 0,
          serviceCharge: 0,
          levy: 0.04329,
          vatAmount: 0.0909091,
          mapId: 1
        }
      ],
      modifiersData: [
        {
          qty: 1,
          modifierId: 6,
          modifierName: "test",
          price: 0.0865801,
          mapId: 1
        }
      ]
    };

    const products = [
      {
        id: 7,
        name: "test price1",
        price: 1.0,
        isIncl: true,
        categoryId: 1,
        unitId: 1
      }
    ];

    // User edits order: restored into cart
    const cartItems = mapOrderDetailsToCartItems(initialBackendOrder.detailsData, initialBackendOrder.modifiersData, {
      products,
      priceView: "Exclusive",
      orderType: "TakeOut"
    });

    // User adds 2nd item from product catalog
    const secondItem = {
      uniqueId: "7-variant-new-2nd-item",
      productId: 7,
      unitId: 1,
      quantity: 1,
      price: 1.0,
      isIncl: true,
      extras: [],
      modifiers: [],
      messages: [],
      isExisting: false,
      product: {
        id: 7,
        name: "test price1",
        price: 1.0,
        isIncl: true,
        vatValue: 10
      }
    };

    const updatedCart = [...cartItems, secondItem];
    const cartCalc = calculateOrder(updatedCart, { orderType: "TakeOut" });
    expect(Number(cartCalc.lines[0].lineTotal.toFixed(3))).toBe(0.952);
    expect(Number(cartCalc.lines[1].lineTotal.toFixed(3))).toBe(0.866);
    expect(Number(cartCalc.summary.subtotal.toFixed(3))).toBe(1.818);
    expect(Number(cartCalc.summary.grandTotal.toFixed(3))).toBe(2.100);

    // Save updated order
    const updatePayload = buildUpdateOrderPayload(148, {
      cartDetails: cartCalc.lines as any,
      selectedOrderTypeName: "TakeOut",
      selectedOrderTypeId: 2,
      selectedCustomerId: 1,
    } as any, {
      dayId: 1,
      shiftId: 1,
      employeeId: 1
    });

    // Recall updated order with 2 items from backend
    const updatedBackendOrder = {
      masterData: {
        orderNo: 148,
        ticketNo: 148,
        orderType: "TakeOut",
        customer: "CASH CUSTOMER",
        waiter: "emp1",
        serviceCharge: 0,
        levy: updatePayload.levy,
        vatExclAmount: updatePayload.vatExclAmount,
        vatAmount: updatePayload.vatAmount,
        netAmount: updatePayload.netAmount
      },
      detailsData: updatePayload.details,
      modifiersData: updatePayload.modifiers
    };

    const recallUnified = buildUnifiedOrderPricing(updatedBackendOrder, {
      orderType: "TakeOut",
      priceView: "Exclusive"
    });

    // Line 1 with extras MUST be 0.952 (not 0.941!)
    expect(Number(recallUnified.lines[0].exclusiveRate.toFixed(3))).toBe(0.952);
    expect(Number(recallUnified.lines[0].exclusiveGross.toFixed(3))).toBe(0.952);

    // Line 2 MUST be 0.866
    expect(Number(recallUnified.lines[1].exclusiveRate.toFixed(3))).toBe(0.866);
    expect(Number(recallUnified.lines[1].exclusiveGross.toFixed(3))).toBe(0.866);

    // Subtotal MUST be 1.818 (not 1.807!)
    expect(Number(recallUnified.summary.subTotalExclusive.toFixed(3))).toBe(1.818);
    expect(Number(recallUnified.summary.grandTotal.toFixed(3))).toBe(2.100);
  });

  it('22. Order with Extras in Inclusive Recall View displays Line Rate 1.100 (not 1.087), Sub Total 0.952 (not 0.941), Net Value 1.000 (not 0.988)', () => {
    localStorage.setItem("priceView", "Inclusive");

    const orderData154 = {
      masterData: {
        orderNo: 154,
        ticketNo: 154,
        orderType: "TakeOut",
        customer: "CASH CUSTOMER",
        waiter: "emp1",
        serviceCharge: 0,
        levy: 0.047619,
        vatExclAmount: 1.0,
        vatAmount: 0.1,
        netAmount: 1.1,
      },
      detailsData: [
        {
          qty: 1,
          productId: 7,
          productName: "test price1",
          price: 0.8658009,
          amount: 0.8658009,
          discAmount: 0,
          serviceCharge: 0,
          levy: 0.04329,
          vatAmount: 0.0909091,
          mapId: 1,
        }
      ],
      modifiersData: [
        {
          qty: 1,
          modifierId: 6,
          modifierName: "test",
          price: 0.0865801,
          mapId: 1,
        }
      ]
    };

    const products = [
      {
        id: 7,
        name: "test price1",
        price: 1.0,
        isIncl: true,
        categoryId: 1,
        unitId: 1,
      }
    ];
    const productCache = { 7: products[0] };
    const allExtras = [{ id: 6, name: "test", price: 0.1 }];

    const unified = buildUnifiedOrderPricing(orderData154, {
      orderType: "TakeOut",
      priceView: "Inclusive",
      products,
      productCache,
      allExtras,
    });

    // 1. Line rates MUST be 1.100 in Inclusive View (not 1.087!)
    expect(Number(unified.lines[0].inclusiveRate.toFixed(3))).toBe(1.100);
    expect(Number(unified.lines[0].inclusiveGross.toFixed(3))).toBe(1.100);
    expect(Number(unified.lines[0].getRate(true).toFixed(3))).toBe(1.100);

    // 2. Line rates in Exclusive View MUST be 0.952 (not 0.941!)
    expect(Number(unified.lines[0].exclusiveRate.toFixed(3))).toBe(0.952);
    expect(Number(unified.lines[0].exclusiveGross.toFixed(3))).toBe(0.952);
    expect(Number(unified.lines[0].getRate(false).toFixed(3))).toBe(0.952);

    // 3. Totals match cart exactly:
    // Sub Total: 0.952 (not 0.941!)
    // Charges: 0.048
    // Net Value: 1.000 (not 0.988!)
    // VAT: 0.100
    // Grand Total: 1.100
    expect(Number(unified.summary.subTotalExclusive.toFixed(3))).toBe(0.952);
    expect(Number(unified.summary.charges?.toFixed(3))).toBe(0.048);
    expect(Number(unified.summary.netValue?.toFixed(3))).toBe(1.000);
    expect(Number(unified.summary.vatExclAmount?.toFixed(3))).toBe(1.000);
    expect(Number(unified.summary.vatAmount.toFixed(3))).toBe(0.100);
    expect(Number(unified.summary.grandTotal.toFixed(3))).toBe(1.100);
  });

  it('23. Guest and Settle receipt HTML prints correctly display extras and match line total 1.100 / subtotal 0.952 in Inclusive View', async () => {
    const { generateGuestPrintHtml } = await import("../features/pos/utils/guestPrintTemplate");

    const orderData154 = {
      masterData: {
        orderNo: 154,
        ticketNo: 154,
        orderType: "TakeOut",
        customer: "CASH CUSTOMER",
        waiter: "emp1",
        serviceCharge: 0,
        levy: 0.047619,
        vatExclAmount: 1.0,
        vatAmount: 0.1,
        netAmount: 1.1,
      },
      detailsData: [
        {
          qty: 1,
          productId: 7,
          productName: "test price1",
          price: 0.8658009,
          amount: 0.8658009,
          discAmount: 0,
          serviceCharge: 0,
          levy: 0.04329,
          vatAmount: 0.0909091,
          mapId: 1,
        }
      ],
      modifiersData: [
        {
          qty: 1,
          modifierId: 6,
          modifierName: "test",
          price: 0.0865801,
          mapId: 1,
        }
      ]
    };

    const products = [
      {
        id: 7,
        name: "test price1",
        price: 1.0,
        isIncl: true,
        categoryId: 1,
        unitId: 1,
      }
    ];

    const unified = buildUnifiedOrderPricing(orderData154, {
      orderType: "TakeOut",
      priceView: "Inclusive",
      products,
    });

    // Generate Guest Print
    const guestHtml = await generateGuestPrintHtml(unified as any, {
      orderNo: "154",
      ticketNo: "154",
      orderType: "TakeOut",
      printPrice: "Inclusive",
      enableVat: true,
      waiter: "emp1",
      counter: "1",
      customerName: "CASH CUSTOMER",
      subTotal: 0.952,
      vatAmount: 0.100,
      netAmount: 1.100,
    });

    // Check that guest print contains TEST, 1.100, 0.952, 0.048, 1.000, 0.100, 1.100
    expect(guestHtml).toContain("TEST PRICE1");
    expect(guestHtml).toContain("TEST");
    expect(guestHtml).toContain("1.100");
    expect(guestHtml).toContain("0.952");
    expect(guestHtml).toContain("0.048");
    expect(guestHtml).toContain("0.100");

    // Generate Settle / Invoice Print
    const settleHtml = await generateGuestPrintHtml(unified as any, {
      invoiceNo: "INV-154",
      orderNo: "154",
      ticketNo: "154",
      orderType: "TakeOut",
      printPrice: "Inclusive",
      isSettlement: true,
      enableVat: true,
      waiter: "emp1",
      counter: "1",
      customerName: "CASH CUSTOMER",
      subTotal: 0.952,
      vatAmount: 0.100,
      netAmount: 1.100,
    });

    expect(settleHtml).toContain("TEST PRICE1");
    expect(settleHtml).toContain("TEST");
    expect(settleHtml).toContain("1.100");
    expect(settleHtml).toContain("0.952");
    expect(settleHtml).toContain("0.048");
    expect(settleHtml).toContain("0.100");
  });

  it('24. Order 164 Lifecycle: Inclusive View with 2x TEST PRICE1 (1.000 incl) and 1x TEST extra (0.100 incl) calculates lineTotal 2.100 and unit price 1.050 (NEVER 2.410 / 1.205)', () => {
    localStorage.setItem('priceView', 'Inclusive');
    localStorage.setItem('printPrice', 'Inclusive');
    localStorage.setItem('vatStatus', 'true');

    const products = [
      {
        id: 7,
        name: 'test price1',
        price: 1.0,
        isIncl: false, // In product master, isIncl checkbox is unchecked (false), but priceView is Inclusive!
        categoryId: 1,
        unitId: 1,
      }
    ];

    // Backend returned Order 164 details
    const orderData164 = {
      masterData: {
        orderNo: 164,
        ticketNo: 164,
        orderType: 'TakeOut',
        customer: 'CASH CUSTOMER',
        waiter: 'emp1',
        serviceCharge: 0,
        levy: 0.047619,
        vatExclAmount: 1.866,
        vatAmount: 0.191,
        netAmount: 2.1,
      },
      detailsData: [
        {
          qty: 2,
          productId: 7,
          productName: 'test price1',
          price: 1.0,
          amount: 2.0,
          discAmount: 0,
          serviceCharge: 0,
          levy: 0.08658,
          vatAmount: 0.1818182,
          mapId: 1,
        }
      ],
      modifiersData: [
        {
          qty: 1,
          modifierId: 6,
          modifierName: 'test',
          price: 0.0865801,
          mapId: 1,
        }
      ]
    };

    const cartItems = mapOrderDetailsToCartItems(
      orderData164.detailsData,
      orderData164.modifiersData,
      {
        products,
        priceView: 'Inclusive',
        orderType: 'TakeOut',
      }
    );

    expect(cartItems).toHaveLength(1);
    const item = cartItems[0];
    expect(item.quantity).toBe(2);
    expect(item.isIncl).toBe(true);
    expect(item.price).toBeCloseTo(1.000, 3);
    expect(item.extras).toHaveLength(1);
    expect(item.extras?.[0].price).toBeCloseTo(0.100, 3);

    const calc = calculateOrder(cartItems, {
      orderType: 'TakeOut',
    });

    const [line] = calc.lines;
    // Line total MUST be 2.100 (2 * 1.000 + 0.100 = 2.100), NEVER 2.410!
    expect(line.lineTotal).toBeCloseTo(2.100, 2);
    expect(calc.summary.grandTotal).toBeCloseTo(2.100, 2);

    // Effective unit price for card (lineTotal / qty) must be 1.050, NEVER 1.205!
    const effectiveUnitPrice = line.lineTotal / line.quantity;
    expect(effectiveUnitPrice).toBeCloseTo(1.050, 3);

    // Variant B: Backend returned detail.price as exclusive base 0.8658009
    const orderData164ExclPrice = {
      ...orderData164,
      detailsData: [
        {
          ...orderData164.detailsData[0],
          price: 0.8658009,
          amount: 1.7316018,
        }
      ]
    };
    const cartItemsB = mapOrderDetailsToCartItems(
      orderData164ExclPrice.detailsData,
      orderData164ExclPrice.modifiersData,
      {
        products,
        priceView: 'Inclusive',
        orderType: 'TakeOut',
      }
    );
    expect(cartItemsB).toHaveLength(1);
    expect(cartItemsB[0].quantity).toBe(2);
    expect(cartItemsB[0].isIncl).toBe(true);
    expect(cartItemsB[0].price).toBeCloseTo(1.000, 3);

    const calcB = calculateOrder(cartItemsB, {
      orderType: 'TakeOut',
    });
    expect(calcB.lines[0].lineTotal).toBeCloseTo(2.100, 2);
    expect(calcB.summary.grandTotal).toBeCloseTo(2.100, 2);
    expect(calcB.lines[0].lineTotal / calcB.lines[0].quantity).toBeCloseTo(1.050, 3);
  });
});
