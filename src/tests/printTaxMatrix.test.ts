import { describe, it, expect, beforeEach } from 'vitest';
import { calculateOrder, type BillingConfig } from '../features/pos/terminal/utils/billing';
import { buildUnifiedOrderPricing } from '../features/pos/utils/orderPricing';
import { generateGuestPrintHtml } from '../features/pos/utils/guestPrintTemplate';
import { generateBillMarkup } from '../features/pos/utils/escPosGenerator';

describe('4-Way Tax Matrix & Receipt Print Invariance (priceView vs printPrice)', () => {
  const takeOutConfig: BillingConfig = {
    serviceChargeRate: 0,
    levyRate: 0.05,
    vatRate: 0.10,
    vatType: 'Exclusive',
    discountType: 'Inclusive',
    orderType: 'TakeOut',
  };

  const products = [
    { id: 7, name: 'TEST PRICE1', price: 1.000, vatValue: 10, isIncl: true, unitId: 1 },
    { id: 8, name: 'Burger', price: 10.000, vatValue: 10, isIncl: false, unitId: 1 },
  ];
  const productCache = {
    7: products[0],
    8: products[1],
  };

  const allExtras = [
    { id: 6, name: 'test', price: 0.100, typeId: 2 },
    { id: 101, name: 'Extra Cheese', price: 1.000, typeId: 2 },
  ];

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vatStatus', 'true');
    localStorage.setItem('vat', '10');
    localStorage.setItem('currencySymbol', 'BHD');
    localStorage.setItem('decimalPart', '3');
    localStorage.setItem('discCalc', 'Inclusive');
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

  describe('Scenario 1: priceView === "Inclusive" AND printPrice === "Inclusive" (Screen and Print are IDENTICAL)', () => {
    it('1.1 Single Item with Extra: Screen and Print must have IDENTICAL rate (1.100), lineTotal (1.100), charges (0.048), VAT (0.100), and grand total (1.100)', async () => {
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('printPrice', 'Inclusive');

      // Cart on screen in Inclusive view:
      // TEST PRICE1 is 1.000 gross. Extra 'test' is 0.100 gross. Total gross = 1.100.
      const cartItems = [
        {
          productId: 7,
          name: 'TEST PRICE1',
          price: 1.000,
          quantity: 1,
          isIncl: true,
          extras: [{ id: 6, name: 'test', price: 0.100, qty: 1, typeId: 2 }],
          product: products[0],
        },
      ];

      const screenCalc = calculateOrder(cartItems, { orderType: 'TakeOut', productCache, config: { ...takeOutConfig, vatType: 'Inclusive' } });

      // Screen values:
      // Line rate is gross 1.100 (1.000 + 0.100)
      expect(screenCalc.lines[0].lineNetAmount).toBeCloseTo(1.100, 3);
      expect(screenCalc.summary.grandTotal).toBeCloseTo(1.100, 3);
      expect(screenCalc.summary.charges).toBeCloseTo(0.048, 3);
      expect(screenCalc.summary.vatAmount).toBeCloseTo(0.100, 3);

      // Print generated with printPrice: Inclusive:
      const printData: any = {
        orderNo: '162',
        ticketNo: '162',
        orderType: 'TakeOut',
        printPrice: 'Inclusive',
        priceView: 'Inclusive',
        enableVat: true,
        levy: 0.048,
        vatAmount: 0.100,
        netAmount: 1.100,
      };

      const unifiedPrint = buildUnifiedOrderPricing(screenCalc.lines, {
        ...printData,
        products,
        productCache,
        allExtras,
      });



      // Verification: Screen and Print rates and totals match identically!
      const line = unifiedPrint.lines[0];
      expect(line.getRate(true)).toBeCloseTo(1.100, 3);
      expect(line.inclusiveGross).toBeCloseTo(1.100, 3);
      expect(unifiedPrint.summary.charges).toBeCloseTo(screenCalc.summary.charges, 3);
      expect(unifiedPrint.summary.vatAmount).toBeCloseTo(screenCalc.summary.vatAmount, 3);
      expect(unifiedPrint.summary.grandTotal).toBeCloseTo(screenCalc.summary.grandTotal, 3);

      // HTML receipt verification:
      const html = await generateGuestPrintHtml(unifiedPrint as any, printData);
      expect(html).toContain('1.100');
      expect(html).toContain('+ TEST');
      expect(html).not.toContain('1.216');

      // Thermal ESC/POS verification:
      const thermal = generateBillMarkup({ data: printData, cartDetails: unifiedPrint as any });
      expect(thermal).toContain('1.100');
      expect(thermal).toContain('+ TEST');
    });

    it('1.2 Multiple Items with Extras: Screen and Print must show identical rates (1.100 & 1.000) and grand total (2.100)', async () => {
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('printPrice', 'Inclusive');

      const cartItems = [
        {
          productId: 7,
          name: 'TEST PRICE1',
          price: 1.000,
          quantity: 1,
          isIncl: true,
          extras: [{ id: 6, name: 'test', price: 0.100, qty: 1, typeId: 2 }],
          product: products[0],
        },
        {
          productId: 7,
          name: 'TEST PRICE1',
          price: 1.000,
          quantity: 1,
          isIncl: true,
          extras: [],
          product: products[0],
        },
      ];

      const screenCalc = calculateOrder(cartItems, { orderType: 'TakeOut', productCache, config: { ...takeOutConfig, vatType: 'Inclusive' } });
      expect(screenCalc.summary.grandTotal).toBeCloseTo(2.100, 3);

      const printData: any = {
        orderNo: '163',
        ticketNo: '163',
        orderType: 'TakeOut',
        printPrice: 'Inclusive',
        priceView: 'Inclusive',
        enableVat: true,
        levy: 0.048,
        netAmount: 2.100,
      };

      const unifiedPrint = buildUnifiedOrderPricing(screenCalc.lines, {
        ...printData,
        products,
        productCache,
        allExtras,
      });



      expect(unifiedPrint.lines[0].getRate(true)).toBeCloseTo(1.100, 3);
      expect(unifiedPrint.lines[1].getRate(true)).toBeCloseTo(1.000, 3);
      expect(unifiedPrint.summary.grandTotal).toBeCloseTo(2.100, 3);
    });
  });

  describe('Scenario 2: priceView === "Exclusive" AND printPrice === "Exclusive" (Screen and Print are IDENTICAL)', () => {
    it('2.1 Single Item with Extra: Screen and Print must have IDENTICAL rate (0.952), subtotal (0.952), charges (0.048), VAT (0.100), and grand total (1.100)', async () => {
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('printPrice', 'Exclusive');

      // In Exclusive view, item price added to cart is base price 0.8658009
      const cartItems = [
        {
          productId: 7,
          name: 'TEST PRICE1',
          price: 0.8658009,
          quantity: 1,
          isIncl: false,
          extras: [{ id: 6, name: 'test', price: 0.100, qty: 1, typeId: 2 }],
          product: products[0],
        },
      ];

      const screenCalc = calculateOrder(cartItems, { orderType: 'TakeOut', productCache, config: takeOutConfig });
      // In Exclusive view, screen line amount is base rate (0.8658 + 0.0866 = 0.9524)
      expect(screenCalc.lines[0].amount).toBeCloseTo(0.952, 3);
      expect(screenCalc.summary.grandTotal).toBeCloseTo(1.100, 3);
      expect(screenCalc.summary.charges).toBeCloseTo(0.048, 3);
      expect(screenCalc.summary.vatAmount).toBeCloseTo(0.100, 3);

      const printData: any = {
        orderNo: '164',
        ticketNo: '164',
        orderType: 'TakeOut',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        enableVat: true,
        levy: 0.048,
        vatAmount: 0.100,
        netAmount: 1.100,
      };

      const unifiedPrint = buildUnifiedOrderPricing(screenCalc.lines, {
        ...printData,
        products,
        productCache,
        allExtras,
      });



      const line = unifiedPrint.lines[0];
      expect(line.getRate(false)).toBeCloseTo(0.952, 3);
      expect(line.exclusiveGross).toBeCloseTo(0.952, 3);
      expect(unifiedPrint.summary.subTotalExclusive).toBeCloseTo(0.952, 3);
      expect(unifiedPrint.summary.charges).toBeCloseTo(screenCalc.summary.charges, 3);
      expect(unifiedPrint.summary.vatAmount).toBeCloseTo(screenCalc.summary.vatAmount, 3);
      expect(unifiedPrint.summary.grandTotal).toBeCloseTo(screenCalc.summary.grandTotal, 3);

      const html = await generateGuestPrintHtml(unifiedPrint as any, printData);
      expect(html).toContain('0.952');
      expect(html).toContain('+ TEST');
    });

    it('2.2 Multiple Items with Extras: Screen and Print show identical rates (0.952 & 0.866) and grand total (2.100)', async () => {
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('printPrice', 'Exclusive');

      const cartItems = [
        {
          productId: 7,
          name: 'TEST PRICE1',
          price: 0.8658009,
          quantity: 1,
          isIncl: false,
          extras: [{ id: 6, name: 'test', price: 0.100, qty: 1, typeId: 2 }],
          product: products[0],
        },
        {
          productId: 7,
          name: 'TEST PRICE1',
          price: 0.8658009,
          quantity: 1,
          isIncl: false,
          extras: [],
          product: products[0],
        },
      ];

      const screenCalc = calculateOrder(cartItems, { orderType: 'TakeOut', productCache, config: takeOutConfig });
      expect(screenCalc.lines[0].amount).toBeCloseTo(0.952, 3);
      expect(screenCalc.lines[1].amount).toBeCloseTo(0.866, 3);
      expect(screenCalc.summary.grandTotal).toBeCloseTo(2.100, 3);

      const printData: any = {
        orderNo: '165',
        ticketNo: '165',
        orderType: 'TakeOut',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        enableVat: true,
        levy: 0.048,
        netAmount: 2.100,
      };

      const unifiedPrint = buildUnifiedOrderPricing(screenCalc.lines, {
        ...printData,
        products,
        productCache,
        allExtras,
      });



      expect(unifiedPrint.lines[0].getRate(false)).toBeCloseTo(0.952, 3);
      expect(unifiedPrint.lines[1].getRate(false)).toBeCloseTo(0.866, 3);
      expect(unifiedPrint.summary.grandTotal).toBeCloseTo(2.100, 3);
    });
  });

  describe('Scenario 3: priceView === "Inclusive" AND printPrice === "Exclusive" (Print transforms to what Exclusive Screen would show)', () => {
    it('3.1 Screen is Inclusive (Rate: 1.100), but Print is Exclusive -> Print MUST show 0.952 rate and 0.952 subtotal', async () => {
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('printPrice', 'Exclusive');

      const cartItems = [
        {
          productId: 7,
          name: 'TEST PRICE1',
          price: 1.000,
          quantity: 1,
          isIncl: true,
          extras: [{ id: 6, name: 'test', price: 0.100, qty: 1, typeId: 2 }],
          product: products[0],
        },
      ];

      // Screen is in Inclusive mode:
      const screenCalc = calculateOrder(cartItems, { orderType: 'TakeOut', productCache, config: { ...takeOutConfig, vatType: 'Inclusive' } });
      expect(screenCalc.lines[0].lineNetAmount).toBeCloseTo(1.100, 3);

      // Print is configured for Exclusive mode:
      const printData: any = {
        orderNo: '166',
        ticketNo: '166',
        orderType: 'TakeOut',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        enableVat: true,
        levy: 0.048,
        vatAmount: 0.100,
        netAmount: 1.100,
      };

      const unifiedPrint = buildUnifiedOrderPricing(screenCalc.lines, {
        ...printData,
        products,
        productCache,
        allExtras,
      });



      // The print line rate MUST be 0.952 (the exclusive base that would appear on screen in Exclusive mode)
      expect(unifiedPrint.lines[0].exclusiveRate).toBeCloseTo(0.952, 3);
      expect(unifiedPrint.lines[0].getRate(false)).toBeCloseTo(0.952, 3);
      expect(unifiedPrint.summary.subTotalExclusive).toBeCloseTo(0.952, 3);
      expect(unifiedPrint.summary.grandTotal).toBeCloseTo(1.100, 3);

      const html = await generateGuestPrintHtml(unifiedPrint as any, printData);
      expect(html).toContain('0.952');
      expect(html).toContain('+ TEST');
      expect(html).toContain('1.100'); // Grand Total remains strictly invariant!
    });
  });

  describe('Scenario 4: priceView === "Exclusive" AND printPrice === "Inclusive" (Print transforms to what Inclusive Screen would show)', () => {
    it('4.1 Screen is Exclusive (Rate: 0.952), but Print is Inclusive -> Print MUST show 1.100 rate and 1.100 grand total', async () => {
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('printPrice', 'Inclusive');

      const cartItems = [
        {
          productId: 7,
          name: 'TEST PRICE1',
          price: 0.8658009,
          quantity: 1,
          isIncl: false,
          extras: [{ id: 6, name: 'test', price: 0.100, qty: 1, typeId: 2 }],
          product: products[0],
        },
      ];

      // Screen is in Exclusive mode:
      const screenCalc = calculateOrder(cartItems, { orderType: 'TakeOut', productCache, config: takeOutConfig });
      expect(screenCalc.lines[0].amount).toBeCloseTo(0.952, 3);

      // Print is configured for Inclusive mode:
      const printData: any = {
        orderNo: '167',
        ticketNo: '167',
        orderType: 'TakeOut',
        printPrice: 'Inclusive',
        priceView: 'Inclusive',
        enableVat: true,
        levy: 0.048,
        netAmount: 1.100,
      };

      const unifiedPrint = buildUnifiedOrderPricing(screenCalc.lines, {
        ...printData,
        products,
        productCache,
        allExtras,
      });



      // The print line rate MUST be 1.100 (the gross rate that would appear on screen in Inclusive mode)
      expect(unifiedPrint.lines[0].inclusiveRate).toBeCloseTo(1.100, 3);
      expect(unifiedPrint.lines[0].getRate(true)).toBeCloseTo(1.100, 3);
      expect(unifiedPrint.summary.grandTotal).toBeCloseTo(1.100, 3);

      const html = await generateGuestPrintHtml(unifiedPrint as any, printData);
      expect(html).toContain('1.100');
      expect(html).toContain('+ TEST');
      expect(html).not.toContain('1.216');
    });

    it('4.2 Backend Settled Order in Exclusive mode printed with printPrice: "Inclusive" produces 1.100 rate and NEVER 1.216', async () => {
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('printPrice', 'Inclusive');

      const backendSettledOrder = {
        masterData: {
          orderNo: 162,
          ticketNo: 162,
          voucherNo: '62',
          orderType: 'TakeOut',
          netAmount: 1.100,
          vatAmount: 0.100,
          vatExclAmount: 1.000,
          levy: 0.048,
        },
        detailsData: [
          {
            qty: 1,
            productId: 7,
            productName: 'test price1',
            price: 0.8658009,
            amount: 0.8658009,
            vatAmount: 0.0909091,
            levy: 0.04329,
            mapId: 1,
          },
        ],
        modifiersData: [
          {
            qty: 1,
            modifierId: 6,
            modifierName: 'test',
            price: 0.0865801,
            mapId: 1,
          },
        ],
      };

      const printData: any = {
        orderNo: '162',
        ticketNo: '162',
        orderType: 'TakeOut',
        printPrice: 'Inclusive',
        priceView: 'Inclusive',
        enableVat: true,
      };

      const unifiedPrint = buildUnifiedOrderPricing(backendSettledOrder, {
        ...printData,
        products,
        productCache,
        allExtras,
      });

      // Rate is strictly rolled-in 1.100 (NEVER 1.216)
      expect(unifiedPrint.lines[0].inclusiveRate).toBeCloseTo(1.100, 3);
      expect(unifiedPrint.lines[0].getRate(true)).toBeCloseTo(1.100, 3);
      expect(unifiedPrint.summary.grandTotal).toBeCloseTo(1.100, 3);

      const html = await generateGuestPrintHtml(unifiedPrint as any, printData);
      expect(html).toContain('1.100');
      expect(html).toContain('+ TEST');
      expect(html).not.toContain('1.216');
      expect(html).not.toContain('0.866'); // Does not omit extras
    });
  });

  describe('Edge Cases: Discounts with Extras across 4-Way Tax Matrix', () => {
    it('Item Discount with Extras: 10% line discount on item with extra yields identical net across print and screen', async () => {
      const cartItems = [
        {
          productId: 7,
          name: 'TEST PRICE1',
          price: 1.000,
          quantity: 1,
          isIncl: true,
          discountValue: 10,
          discountType: 'percentage',
          extras: [{ id: 6, name: 'test', price: 0.100, qty: 1, typeId: 2 }],
          product: products[0],
        },
      ];

      // Total gross: 1.100
      // 10% line discount: -0.110
      // Net gross: 0.990
      const screenCalc = calculateOrder(cartItems, { orderType: 'TakeOut', productCache, config: { ...takeOutConfig, vatType: 'Inclusive' } });
      expect(screenCalc.summary.grandTotal).toBeCloseTo(0.990, 3);

      // Test in Exclusive Print mode:
      const printExcl: any = {
        orderNo: '170',
        orderType: 'TakeOut',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        enableVat: true,
        netAmount: 0.990,
      };
      const unifiedExcl = buildUnifiedOrderPricing(cartItems, {
        ...printExcl,
        products,
        productCache,
        allExtras,
      });
      expect(unifiedExcl.summary.grandTotal).toBeCloseTo(0.990, 3);

      // Test in Inclusive Print mode:
      const printIncl: any = {
        orderNo: '171',
        orderType: 'TakeOut',
        printPrice: 'Inclusive',
        priceView: 'Inclusive',
        enableVat: true,
        netAmount: 0.990,
      };
      const unifiedIncl = buildUnifiedOrderPricing(cartItems, {
        ...printIncl,
        products,
        productCache,
        allExtras,
      });
      expect(unifiedIncl.summary.grandTotal).toBeCloseTo(0.990, 3);
    });

    it('Bill Discount with Extras: 10% bill discount on order with extras yields identical grand total across print and screen', async () => {
      const cartItems = [
        {
          productId: 7,
          name: 'TEST PRICE1',
          price: 1.000,
          quantity: 1,
          isIncl: true,
          extras: [{ id: 6, name: 'test', price: 0.100, qty: 1, typeId: 2 }],
          product: products[0],
        },
      ];

      const screenCalc = calculateOrder(cartItems, {
        orderType: 'TakeOut',
        productCache,
        config: { ...takeOutConfig, vatType: 'Inclusive' },
        billDiscountValue: 10,
        billDiscountType: 'percentage',
      });
      expect(screenCalc.summary.grandTotal).toBeCloseTo(0.990, 3);

      const printData: any = {
        orderNo: '172',
        orderType: 'TakeOut',
        printPrice: 'Inclusive',
        priceView: 'Inclusive',
        enableVat: true,
        isBillDiscount: true,
        discount: 0.110,
        discPer: 10,
        netAmount: 0.990,
      };
      const unified = buildUnifiedOrderPricing(cartItems, {
        ...printData,
        products,
        productCache,
        allExtras,
      });
      expect(unified.summary.grandTotal).toBeCloseTo(0.990, 3);
    });
  });
});
