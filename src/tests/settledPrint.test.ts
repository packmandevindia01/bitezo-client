import { describe, it, expect, beforeEach } from 'vitest';
import { buildUnifiedOrderPricing } from '../features/pos/utils/orderPricing';
import { generateGuestPrintHtml } from '../features/pos/utils/guestPrintTemplate';
import { generateBillMarkup } from '../features/pos/utils/escPosGenerator';
import { mapOrderDetailsToCartItems } from '../features/pos/terminal/mappers/orderDetailToCartMapper';

describe('Settled Print Verification (Order #84 & Settled Details)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('decimalPart', '3');
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vat', '10');
    localStorage.setItem('priceView', 'Inclusive');
    localStorage.setItem('printPrice', 'Inclusive');
  });

  const backendSettledOrder84 = {
    masterData: {
      orderNo: 84,
      ticketNo: 84,
      voucherNo: '84',
      orderType: 'TakeOut',
      orderTypeId: 2,
      discAmount: 13.000,
      discPer: 0,
      vatExclAmount: 18.182,
      vatAmount: 1.818,
      netAmount: 20.000,
      customerName: 'CASH CUSTOMER',
    },
    detailsData: [
      {
        productId: 6,
        productName: 'Demo',
        qty: 3,
        price: 11.000,
        vatValue: 10,
        vatAmount: 1.818,
        netAmount: 20.000,
        discAmount: 0,
      }
    ]
  };

  it('Order #84: when printPrice is Inclusive, HTML settled print must have exact Sub Total 33.000, Discount -13.000, VAT 1.818, Grand Total 20.000', async () => {
    const unified = buildUnifiedOrderPricing(backendSettledOrder84, {
      orderType: 'TakeOut',
      priceView: 'Inclusive',
      printPrice: 'Inclusive',
      isBillDiscount: true,
    });

    expect(unified.summary.subTotalInclusive).toBe(33);
    expect(unified.summary.subTotalExclusive).toBe(30);
    expect(unified.summary.totalDiscountIncl).toBe(13);
    expect(unified.summary.vatAmount).toBeCloseTo(1.818, 3);
    expect(unified.summary.grandTotal).toBe(20);

    const printData = {
      orderNo: 84,
      ticketNo: 84,
      invoiceNo: '84',
      orderType: 'TakeOut',
      customerName: 'CASH CUSTOMER',
      date: '28/10/2026',
      time: '01:55:56 PM',
      isSettlement: true,
      printPrice: 'Inclusive',
      priceView: 'Inclusive',
      enableVat: true,
    };

    const html = await generateGuestPrintHtml(unified as any, printData as any);

    // Verify correct item row
    expect(html).toContain('11.000');
    expect(html).toContain('33.000');

    // Verify totals table
    expect(html).toContain('>33.000<'); // Sub Total
    expect(html).toContain('>-13.000<'); // Discount
    expect(html).toContain('>1.818<'); // VAT Amount
    expect(html).toContain('>20.000<'); // Grand Total

    // Verify VAT table
    expect(html).toContain('>18.182<'); // Excl Amt in VAT table
    expect(html).toContain('>1.818<'); // VAT Amt in VAT table
    expect(html).toContain('>20.000<'); // Net Amt in VAT table

    // Strictly ensure corrupt numbers are NOT present
    expect(html).not.toContain('0.636');
    expect(html).not.toContain('19.364');
    expect(html).not.toContain('6.061');
    expect(html).not.toContain('6.364');
  });

  it('Order #84: when printPrice is Inclusive, ESC/POS thermal markup must have exact Sub Total 33.000, Discount -13.000, VAT 1.818, Grand Total 20.000', () => {
    const unified = buildUnifiedOrderPricing(backendSettledOrder84, {
      orderType: 'TakeOut',
      priceView: 'Inclusive',
      printPrice: 'Inclusive',
      isBillDiscount: true,
    });

    const printData = {
      orderNo: 84,
      ticketNo: 84,
      invoiceNo: '84',
      orderType: 'TakeOut',
      customerName: 'CASH CUSTOMER',
      date: '28/10/2026',
      time: '01:55:56 PM',
      isSettlement: true,
      printPrice: 'Inclusive',
      priceView: 'Inclusive',
      enableVat: true,
    };

    const markup = generateBillMarkup({
      cartDetails: unified as any,
      data: printData as any,
    });

    expect(markup).toContain('33.000');
    expect(markup).toContain('-13.000');
    expect(markup).toContain('1.818');
    expect(markup).toContain('20.000');
    expect(markup).toContain('18.182');

    // Strictly ensure corrupt numbers are NOT present
    expect(markup).not.toContain('0.636');
    expect(markup).not.toContain('19.364');
  });

  it('Order #84: simulating PosSettledDetailsModal flow passing mappedItems array directly to generateGuestPrintHtml', async () => {
    const isTaxInclusive = true;
    const printPriceSetting = 'Inclusive';
    const isBillLevelDiscount = true;

    const unified = buildUnifiedOrderPricing(backendSettledOrder84, {
      orderType: 'TakeOut',
      printPrice: printPriceSetting,
      priceView: printPriceSetting,
      isBillDiscount: isBillLevelDiscount,
    });

    const mappedItems = unified.lines.map((l) => ({
      ...l,
      isUnifiedPricingLine: true,
      productId: l.productId,
      quantity: l.quantity,
      price: l.getRate(isTaxInclusive),
      baseAmount: l.exclusiveGross,
      variantName: l.variantName,
      variantArabic: l.variantArabic,
      product: {
        name: l.productName,
        price: l.getRate(isTaxInclusive),
        arabicName: l.productArabicName,
      },
      extras: l.extras,
      modifiers: l.modifiers,
      messages: l.messages,
      itemDiscount: 0,
      lineTotal: l.getAmount(isTaxInclusive, true),
      lineNetAmount: l.inclusiveAmount,
      basePrice: l.exclusiveRate,
      vatAmount: l.vatAmount,
    }));

    const printData = {
      orderNo: 84,
      ticketNo: 84,
      invoiceNo: '84',
      orderType: 'TakeOut',
      customerName: 'CASH CUSTOMER',
      subTotal: unified.summary.subTotalInclusive,
      discount: unified.summary.totalDiscountIncl,
      vatAmount: unified.summary.vatAmount,
      netAmount: unified.summary.grandTotal,
      enableVat: true,
      isSettlement: true,
      printPrice: printPriceSetting,
      priceView: 'Inclusive',
    };

    const html = await generateGuestPrintHtml(mappedItems as any, printData as any);

    expect(html).toContain('>33.000<');
    expect(html).toContain('>-13.000<');
    expect(html).toContain('>1.818<');
    expect(html).toContain('>20.000<');
    expect(html).toContain('>18.182<');
    expect(html).not.toContain('0.636');
    expect(html).not.toContain('19.364');
  });

  it('Order #84: when printPrice is Exclusive, settled print displays exclusive bases (Subtotal 30.000, Discount -11.818, VAT 1.818, Net 20.000)', async () => {
    localStorage.setItem('printPrice', 'Exclusive');

    const printData = {
      orderNo: 84,
      ticketNo: 84,
      invoiceNo: '84',
      orderType: 'TakeOut',
      customerName: 'CASH CUSTOMER',
      date: '28/10/2026',
      time: '01:55:56 PM',
      isSettlement: true,
      printPrice: 'Exclusive',
      priceView: 'Exclusive',
      enableVat: true,
    };

    const html = await generateGuestPrintHtml(backendSettledOrder84 as any, printData as any);

    // Exclusive item rate = 10.000, Amt = 30.000
    expect(html).toContain('10.000');
    expect(html).toContain('30.000');

    // Totals table
    expect(html).toContain('>30.000<'); // Sub Total Exclusive
    expect(html).toContain('>-11.818<'); // Discount Exclusive
    expect(html).toContain('>1.818<'); // VAT
    expect(html).toContain('>20.000<'); // Grand Total

    // VAT Table
    expect(html).toContain('>18.182<');
    expect(html).toContain('>1.818<');
    expect(html).toContain('>20.000<');
  });

  it('mapOrderDetailsToCartItems must NOT corrupt trueBasePrice when mapping settled order with bill discount', () => {
    const cartItems = mapOrderDetailsToCartItems(
      backendSettledOrder84.detailsData,
      [],
      {
        priceView: 'Inclusive',
        isOrderBillDiscount: true,
      }
    );

    expect(cartItems).toHaveLength(1);
    const item = cartItems[0];
    expect(item.price).toBe(11);
    expect(item.quantity).toBe(3);
    // Crucial: price is 11, so true unit base is 10, NOT 6.0607!
    expect(item.product?.price).toBe(11);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // Order #22: User Images Verification (Bill Discount & Item Discount in Prints)
  // ══════════════════════════════════════════════════════════════════════════
  describe('Order #22 (Images 1 & 2): Settle and Print Discount Verification', () => {
    const order22Data = {
      masterData: {
        orderNo: 22,
        ticketNo: 22,
        voucherNo: '22',
        orderType: 'TakeOut',
        orderTypeId: 2,
        discAmount: 9.0909091,
        discPer: 0,
        levy: 4.545,
        vatExclAmount: 90.9090909,
        vatAmount: 9.545,
        netAmount: 105.000,
        customerName: 'CASH CUSTOMER',
      },
      detailsData: [
        {
          productId: 1,
          productName: 'SPICY NOODLE SALAD',
          qty: 7,
          price: 10.000,
          vatValue: 10,
          vatAmount: 6.682,
          netAmount: 73.500,
          discAmount: 0,
        },
        {
          productId: 2,
          productName: 'MOMOS',
          qty: 5,
          price: 6.000,
          vatValue: 10,
          vatAmount: 2.863,
          netAmount: 31.500,
          discAmount: 0,
        }
      ]
    };

    it('Order #22 in Exclusive Print: Discount MUST be -9.091 and NEVER -8.264', async () => {
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('discCalc', 'Inclusive');

      const unified = buildUnifiedOrderPricing(order22Data, {
        orderType: 'TakeOut',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      });

      // Unified pricing summary verification:
      expect(unified.summary.subTotalExclusive).toBe(100.000);
      expect(unified.summary.totalDiscountExcl).toBeCloseTo(9.091, 3);
      expect(unified.summary.totalDiscountExcl).not.toBeCloseTo(8.264, 2);
      expect(unified.summary.totalDiscountIncl).toBeCloseTo(10.000, 3);
      expect(unified.summary.levy).toBeCloseTo(4.545, 3);
      expect(unified.summary.vatAmount).toBeCloseTo(9.545, 3);
      expect(unified.summary.grandTotal).toBeCloseTo(105.000, 3);

      const printData = {
        orderNo: 22,
        ticketNo: 22,
        invoiceNo: '22',
        orderType: 'TakeOut',
        customerName: 'CASH CUSTOMER',
        subTotal: 100.000,
        discount: 9.091,
        levy: 4.545,
        vatAmount: 9.545,
        netAmount: 105.000,
        isSettlement: true,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        enableVat: true,
        isBillDiscount: true,
      };

      const html = await generateGuestPrintHtml(unified as any, printData as any);

      // Verify receipt items
      expect(html).toContain('SPICY NOODLE SALAD');
      expect(html).toContain('MOMOS');
      expect(html).toContain('>100.000<'); // Sub Total

      // Verify discount: MUST be -9.091 and STRICTLY NOT -8.264
      expect(html).toContain('>-9.091<');
      expect(html).not.toContain('8.264');
      expect(html).not.toContain('-8.264');

      // Verify taxes and grand total
      expect(html).toContain('>4.545<'); // Levy
      expect(html).toContain('>9.545<'); // VAT
      expect(html).toContain('>105.000<'); // Grand Total
    });

    it('Order #22 in Exclusive Thermal ESC/POS: Discount MUST be -9.091 and NEVER -8.264', () => {
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('discCalc', 'Inclusive');

      const unified = buildUnifiedOrderPricing(order22Data, {
        orderType: 'TakeOut',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      });

      const printData = {
        orderNo: 22,
        ticketNo: 22,
        invoiceNo: '22',
        orderType: 'TakeOut',
        customerName: 'CASH CUSTOMER',
        subTotal: 100.000,
        discount: 9.091,
        levy: 4.545,
        vatAmount: 9.545,
        netAmount: 105.000,
        isSettlement: true,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        enableVat: true,
        isBillDiscount: true,
      };

      const markup = generateBillMarkup({
        cartDetails: unified as any,
        data: printData as any,
      });

      expect(markup).toContain('100.000');
      expect(markup).toContain('-9.091');
      expect(markup).not.toContain('8.264');
      expect(markup).not.toContain('-8.264');
      expect(markup).toContain('105.000');
    });

    it('Order #22 in Inclusive Print: When charges are present, footer discount MUST match exclusive basis (-9.091) and NEVER -8.264', async () => {
      localStorage.setItem('printPrice', 'Inclusive');
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('discCalc', 'Inclusive');

      const unified = buildUnifiedOrderPricing(order22Data, {
        orderType: 'TakeOut',
        printPrice: 'Inclusive',
        priceView: 'Inclusive',
        isBillDiscount: true,
      });

      expect(unified.summary.totalDiscountIncl).toBeCloseTo(10.000, 3);
      expect(unified.summary.totalDiscountIncl).not.toBeCloseTo(8.264, 2);

      const printData = {
        orderNo: 22,
        ticketNo: 22,
        invoiceNo: '22',
        orderType: 'TakeOut',
        customerName: 'CASH CUSTOMER',
        discount: 10.000,
        isSettlement: true,
        printPrice: 'Inclusive',
        priceView: 'Inclusive',
        enableVat: true,
        isBillDiscount: true,
      };

      const html = await generateGuestPrintHtml(unified as any, printData as any);
      expect(html).toContain('>-9.091<');
      expect(html).not.toContain('8.264');
      expect(html).not.toContain('-8.264');
      expect(html).toContain('>105.000<');
    });

    it('Detail Line Item Discount: settled print must display -0.909 in Exclusive print and NEVER -0.826', async () => {
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('discCalc', 'Inclusive');

      const lineDiscountOrder = {
        masterData: {
          orderNo: 23,
          ticketNo: 23,
          voucherNo: '23',
          orderType: 'TakeOut',
          discAmount: 0,
          vatExclAmount: 9.091,
          vatAmount: 0.909,
          netAmount: 10.000,
        },
        detailsData: [
          {
            productId: 10,
            productName: 'PIZZA',
            qty: 1,
            price: 10.000,
            vatValue: 10,
            vatAmount: 0.909,
            netAmount: 10.000,
            discAmount: 0.9090909, // stored base discount in backend
          }
        ]
      };

      const unified = buildUnifiedOrderPricing(lineDiscountOrder, {
        orderType: 'TakeOut',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: false,
      });

      expect(unified.lines[0].lineDiscountExcl).toBeCloseTo(0.909, 3);
      expect(unified.lines[0].lineDiscountExcl).not.toBeCloseTo(0.826, 2);
      expect(unified.lines[0].lineDiscountIncl).toBeCloseTo(1.000, 3);

      const printData = {
        orderNo: 23,
        ticketNo: 23,
        invoiceNo: '23',
        orderType: 'TakeOut',
        isSettlement: true,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        enableVat: true,
        isBillDiscount: false,
      };

      const html = await generateGuestPrintHtml(unified as any, printData as any);
      expect(html).toContain('PIZZA');
      expect(html).toContain('Disc : 0.909');
      expect(html).not.toContain('0.826');
      expect(html).not.toContain('-0.826');
    });

    it('Order #105: exact swagger response for settled-data with priceView=Inclusive and 5% Levy', async () => {
      const settledOrder105 = {
        masterData: {
          orderNo: 105,
          ticketNo: 105,
          voucherNo: "48",
          orderType: "TakeOut",
          deliveryCharge: 0,
          discAmount: 0,
          discPer: 0,
          serviceCharge: 0,
          levy: 0.4545455,
          vatExclAmount: 9.5454546,
          vatAmount: 0.9545455,
          netAmount: 10.5000001,
          customerName: "CASH CUSTOMER",
        },
        detailsData: [
          {
            qty: 2,
            productId: 6,
            productName: "Demo",
            price: 10.5000000105,
            amount: 21.000000021,
            discAmount: 10.5000000105,
            serviceCharge: 0,
            levy: 0.4545455,
            vatAmount: 0.9545455,
            mapId: 1,
          }
        ]
      };

      const unified = buildUnifiedOrderPricing(settledOrder105, {
        orderType: 'TakeOut',
        printPrice: 'Inclusive',
        priceView: 'Inclusive',
        isBillDiscount: false,
      });

      expect(unified.lines[0].quantity).toBe(2);
      expect(unified.lines[0].inclusiveRate).toBeCloseTo(10.500, 3);
      expect(unified.lines[0].inclusiveGross).toBeCloseTo(21.000, 3);
      expect(unified.lines[0].lineDiscountIncl).toBeCloseTo(10.500, 3);
      expect(unified.lines[0].inclusiveAmount).toBeCloseTo(10.500, 3);

      expect(unified.summary.subTotalInclusive).toBeCloseTo(21.000, 3);
      expect(unified.summary.totalDiscountIncl).toBeCloseTo(10.500, 3);
      expect(unified.summary.grandTotal).toBeCloseTo(10.500, 3);

      const printData = {
        orderNo: 105,
        ticketNo: 105,
        voucherNo: '48',
        orderType: 'TakeOut',
        isSettlement: true,
        printPrice: 'Inclusive',
        priceView: 'Inclusive',
        enableVat: true,
        isBillDiscount: false,
      };

      const html = await generateGuestPrintHtml(unified as any, printData as any);
      expect(html).toContain('DEMO');
      expect(html).toContain('21.000');
      expect(html).toContain('10.500');
    });
  });
});
