import { describe, it, expect, beforeEach } from 'vitest';
import { buildUnifiedOrderPricing } from '../features/pos/utils/orderPricing';
import { generateGuestPrintHtml } from '../features/pos/utils/guestPrintTemplate';
import { buildPrintPricing } from '../features/pos/utils/printPricing';
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

  // The backend stores a bill discount on the lines too; the bill reads it from there.
  const savedOrder84 = { ...backendSettledOrder84, detailsData: [{ ...backendSettledOrder84.detailsData[0], discAmount: 13 }] };

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
    expect(html).toContain('>30.000<'); // Sub Total — exclusive, same as the screen footer (33.000 / 1.1)
    expect(html).toContain('>-11.818<'); // Discount — exclusive (13.000 / 1.1)
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

  it('Order #84: the settled screen prints the pricing built from the saved order', async () => {
    const printPriceSetting = 'Inclusive';
    const unified = buildPrintPricing(savedOrder84, {
      dataView: 'Inclusive',
      printPrice: printPriceSetting,
      orderType: 'TakeOut',
      isBillDiscount: true,
    });

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

    const html = await generateGuestPrintHtml(unified as any, printData as any);

    expect(html).toContain('>33.000<'); // row amount (inclusive)
    expect(html).toContain('>30.000<'); // footer Sub Total (exclusive)
    expect(html).toContain('>-11.818<'); // footer Discount (exclusive)
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

    const unified = buildPrintPricing(savedOrder84, { dataView: 'Inclusive', printPrice: 'Exclusive', orderType: 'TakeOut', isBillDiscount: true });
    const html = await generateGuestPrintHtml(unified as any, printData as any);

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

      // Discount on the exclusive basis (9.0909091 → 9.091 ± 1 fil after footer balancing), STRICTLY NOT -8.264.
      // Balanced footer adds up: 100.000 − 9.090 + 4.545 = 95.455; + 9.545 = 105.000 (old print: 104.999).
      expect(html).toMatch(/>-9\.09[01]</);
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
      // exclusive-basis discount (± 1 fil from footer balancing), never the inclusive-basis 8.264
      expect(html).toMatch(/>-9\.09[01]</);
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

    it('Order #149 with Extras: in Exclusive Print mode, HTML guest & settle receipt includes rolled-in rate 0.952, + TEST extra row, and matches preview totals', async () => {
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('printPrice', 'Exclusive');

      const order149 = {
        masterData: {
          orderNo: 149,
          ticketNo: 149,
          orderType: "TakeOut",
          customer: "CASH CUSTOMER",
          waiter: "emp1",
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

      const unified = buildUnifiedOrderPricing(order149, {
        orderType: 'TakeOut',
        priceView: 'Exclusive',
        printPrice: 'Exclusive',
      });

      expect(unified.lines).toHaveLength(1);
      // Base: 0.8658009 + Extra: 0.0865801 = 0.952381
      expect(unified.lines[0].exclusiveRate).toBeCloseTo(0.952, 2);
      expect(unified.lines[0].exclusiveGross).toBeCloseTo(0.952, 2);
      expect(unified.lines[0].extras).toHaveLength(1);
      expect(unified.lines[0].extras[0].name).toBe('test');

      expect(unified.summary.subTotalExclusive).toBeCloseTo(0.952, 2);
      expect(unified.summary.grandTotal).toBeCloseTo(1.100, 2);

      const printData = {
        orderNo: "149",
        ticketNo: "149",
        invoiceNo: "149",
        waiter: "emp1",
        counter: "Main",
        orderType: "TakeOut",
        customerName: "CASH CUSTOMER",
        date: "31/10/2026",
        time: "11:51:00 AM",
        subTotal: unified.summary.subTotalExclusive,
        charges: 0.048,
        netValue: 1.000,
        vatAmount: 0.100,
        netAmount: 1.100,
        enableVat: true,
        printPrice: "Exclusive",
        priceView: "Exclusive",
      };

      const html = await generateGuestPrintHtml(unified as any, printData as any);

      // Verify item description and rolled-in price 0.952
      expect(html).toContain('TEST PRICE1');
      expect(html).toContain('0.952');
      // Verify extra line is rendered with +
      expect(html).toContain('+ TEST');

      // Verify totals table perfectly matches preview
      expect(html).toContain('>0.952<'); // Sub Total
      expect(html).toContain('>0.048<'); // Charges (Levy)
      expect(html).toContain('>1.000<'); // Net Value
      expect(html).toContain('>0.100<'); // VAT
      expect(html).toContain('>1.100<'); // Grand Total
    });

    it('Order #149 with Extras: in Inclusive Print mode, HTML guest & settle receipt includes rolled-in rate 1.100, + TEST extra row, and grand total 1.100', async () => {
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('printPrice', 'Inclusive');

      const order149 = {
        masterData: {
          orderNo: 149,
          ticketNo: 149,
          orderType: "TakeOut",
          customer: "CASH CUSTOMER",
          waiter: "emp1",
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

      const unified = buildUnifiedOrderPricing(order149, {
        orderType: 'TakeOut',
        priceView: 'Inclusive',
        printPrice: 'Inclusive',
      });

      // Inclusive rate: Base (1.000) + Extra (0.100) = 1.100
      expect(unified.lines[0].inclusiveRate).toBeCloseTo(1.100, 2);
      expect(unified.lines[0].inclusiveGross).toBeCloseTo(1.100, 2);
      expect(unified.lines[0].extras).toHaveLength(1);
      expect(unified.lines[0].extras[0].name).toBe('test');

      const printData = {
        orderNo: "149",
        ticketNo: "149",
        invoiceNo: "149",
        waiter: "emp1",
        counter: "Main",
        orderType: "TakeOut",
        customerName: "CASH CUSTOMER",
        date: "31/10/2026",
        time: "11:51:00 AM",
        subTotal: unified.summary.subTotalInclusive,
        netAmount: 1.100,
        enableVat: true,
        printPrice: "Inclusive",
        priceView: "Inclusive",
      };

      const html = await generateGuestPrintHtml(unified as any, printData as any);

      // Verify item description and rolled-in price 1.100
      expect(html).toContain('TEST PRICE1');
      expect(html).toContain('1.100');
      // Verify extra line is rendered with +
      expect(html).toContain('+ TEST');
      // Verify Grand Total
      expect(html).toContain('>1.100<');
    });

    it('Order #149 with Extras: in ESC/POS thermal markup, both Exclusive and Inclusive modes render rolled-in rates and + TEST extra line', () => {
      const order149 = {
        masterData: {
          orderNo: 149,
          ticketNo: 149,
          orderType: "TakeOut",
          customer: "CASH CUSTOMER",
          waiter: "emp1",
          levy: 0.047619,
          vatExclAmount: 1,
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

      // 1. Exclusive Thermal Print
      const unifiedExcl = buildUnifiedOrderPricing(order149, {
        orderType: 'TakeOut',
        priceView: 'Exclusive',
        printPrice: 'Exclusive',
      });

      const markupExcl = generateBillMarkup({
        cartDetails: unifiedExcl as any,
        data: {
          orderNo: "149",
          ticketNo: "149",
          waiter: "emp1",
          counter: "Main",
          orderType: "TakeOut",
          printPrice: "Exclusive",
          priceView: "Exclusive",
          subTotal: 0.952,
          charges: 0.048,
          netValue: 1.000,
          vatAmount: 0.100,
          netAmount: 1.100,
        }
      });

      expect(markupExcl).toContain('TEST PRICE1');
      expect(markupExcl).toContain('0.952');
      expect(markupExcl).toContain('+ TEST');
      expect(markupExcl).toContain('1.100');

      // 2. Inclusive Thermal Print
      const unifiedIncl = buildUnifiedOrderPricing(order149, {
        orderType: 'TakeOut',
        priceView: 'Inclusive',
        printPrice: 'Inclusive',
      });

      const markupIncl = generateBillMarkup({
        cartDetails: unifiedIncl as any,
        data: {
          orderNo: "149",
          ticketNo: "149",
          waiter: "emp1",
          counter: "Main",
          orderType: "TakeOut",
          printPrice: "Inclusive",
          priceView: "Inclusive",
          subTotal: 0.952,
          vatAmount: 0.100,
          netAmount: 1.100,
        }
      });

      expect(markupIncl).toContain('TEST PRICE1');
      expect(markupIncl).toContain('1.100');
      expect(markupIncl).toContain('+ TEST');
      expect(markupIncl).toContain('1.100');
    });

    it('Order #162 (Settled Order with 1 item + 1 extra in Exclusive mode): line item rate must include extra (0.952), extra classified as + test, subTotal 0.952, charges 0.048, netValue 1.000, vat 0.100, grand total 1.100', async () => {
      const order162 = {
        masterData: {
          orderNo: 162,
          ticketNo: 162,
          voucherNo: "62",
          orderType: "TakeOut",
          counterName: "Counter1",
          sectionName: "",
          tableNo: "",
          orderDate: "0001-01-01T00:00:00",
          deliveryCharge: 0,
          discAmount: 0,
          discPer: 0,
          serviceCharge: 0,
          levy: 0.047619,
          vatExclAmount: 1,
          vatAmount: 0.1,
          netAmount: 1.1
        },
        detailsData: [
          {
            qty: 1,
            productId: 7,
            productName: "test price1",
            arabicName: "",
            altName: "",
            altArabicName: "",
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
            arabicName: "",
            typeName: "",
            typeArabicName: "",
            price: 0.0865801,
            mapId: 1
          }
        ]
      };

      const unifiedExcl = buildUnifiedOrderPricing(order162, {
        orderType: 'TakeOut',
        priceView: 'Exclusive',
        printPrice: 'Exclusive',
        allExtras: [{ id: 6, name: "test", price: 0.100, typeId: 2 }]
      });

      // 1. Line item checks
      expect(unifiedExcl.lines).toHaveLength(1);
      const line = unifiedExcl.lines[0];
      expect(line.productName).toBe("test price1");
      expect(line.getRate(false)).toBeCloseTo(0.952, 3);
      expect(line.getRate(true)).toBeCloseTo(1.100, 3);
      expect(line.extras).toHaveLength(1);
      expect(line.extras[0].name).toBe("test");
      expect(line.extras[0].price).toBeCloseTo(0.087, 3);
      expect(line.modifiers).toHaveLength(0); // must NOT be in zero-price modifiers

      // 2. Summary checks
      expect(unifiedExcl.summary.subTotalExclusive).toBeCloseTo(0.952, 3);
      expect(unifiedExcl.summary.charges).toBeCloseTo(0.048, 3);
      expect(unifiedExcl.summary.vatAmount).toBeCloseTo(0.100, 3);
      expect(unifiedExcl.summary.grandTotal).toBeCloseTo(1.100, 3);

      // 3. Settled Receipt HTML Check
      const printData = {
        orderNo: 162,
        ticketNo: 162,
        invoiceNo: '62',
        orderType: 'TakeOut',
        customerName: 'CASH CUSTOMER',
        date: '31/10/2026',
        time: '12:00:00 PM',
        isSettlement: true,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        enableVat: true,
      };

      const html = await generateGuestPrintHtml(unifiedExcl as any, printData as any);
      expect(html).toContain('+ TEST');
      expect(html).toContain('0.952');
      expect(html).toContain('1.100');
    });

    it('Diagnose Inclusive settle & print: checking rate and subtotal when printPrice is Inclusive', async () => {
      // Test A: with cartDetails directly
      const cartItem = {
        productId: 7,
        product: { id: 7, name: 'test price1', price: 1.000 },
        price: 1.000,
        catalogPrice: 1.000,
        quantity: 1,
        isIncl: true,
        extras: [{ id: 6, name: 'test', price: 0.100, qty: 1 }],
      };

      const unifiedA = buildUnifiedOrderPricing([cartItem], {
        orderType: 'TakeOut',
        priceView: 'Inclusive',
        printPrice: 'Inclusive',
        allExtras: [{ id: 6, name: 'test', price: 0.100, typeId: 2 }],
      });

      console.log('UNIFIED A (from cartItem):', {
        exclusiveRate: unifiedA.lines[0]?.exclusiveRate,
        inclusiveRate: unifiedA.lines[0]?.inclusiveRate,
        getRateExcl: unifiedA.lines[0]?.getRate(false),
        getRateIncl: unifiedA.lines[0]?.getRate(true),
        subTotalExclusive: unifiedA.summary.subTotalExclusive,
        subTotalInclusive: unifiedA.summary.subTotalInclusive,
        grandTotal: unifiedA.summary.grandTotal,
      });

      // Test B: with order object from backend
      const orderObj = {
        masterData: {
          orderNo: 162,
          ticketNo: 162,
          voucherNo: "62",
          orderType: "TakeOut",
          netAmount: 1.1,
          vatAmount: 0.1,
          levy: 0.047619,
          vatExclAmount: 1,
        },
        detailsData: [
          {
            qty: 1,
            productId: 7,
            productName: "test price1",
            price: 0.8658009,
            amount: 0.8658009,
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

      const unifiedB = buildUnifiedOrderPricing(orderObj, {
        orderType: 'TakeOut',
        priceView: 'Inclusive',
        printPrice: 'Inclusive',
        allExtras: [{ id: 6, name: 'test', price: 0.100, typeId: 2 }],
      });

      console.log('UNIFIED B (from orderObj):', {
        exclusiveRate: unifiedB.lines[0]?.exclusiveRate,
        inclusiveRate: unifiedB.lines[0]?.inclusiveRate,
        getRateExcl: unifiedB.lines[0]?.getRate(false),
        getRateIncl: unifiedB.lines[0]?.getRate(true),
        subTotalExclusive: unifiedB.summary.subTotalExclusive,
        subTotalInclusive: unifiedB.summary.subTotalInclusive,
        grandTotal: unifiedB.summary.grandTotal,
      });

      // Test C: with mappedPrintItems from usePosCheckoutFlow
      // where d.price was 0.8658009 from backend, and extras had price 0.100 from cartMatch
      const mappedPrintItem = {
        productId: 7,
        quantity: 1,
        price: 0.8658009,
        product: { name: 'test price1', price: 0.8658009 },
        extras: [{ id: 6, name: 'test', price: 0.100, qty: 1 }],
      };

      const unifiedC = buildUnifiedOrderPricing([mappedPrintItem], {
        orderType: 'TakeOut',
        priceView: 'Inclusive',
        printPrice: 'Inclusive',
        allExtras: [{ id: 6, name: 'test', price: 0.100, typeId: 2 }],
      });

      console.log('UNIFIED C (from mappedPrintItem with excl item price + incl extra price):', {
        exclusiveRate: unifiedC.lines[0]?.exclusiveRate,
        inclusiveRate: unifiedC.lines[0]?.inclusiveRate,
        getRateExcl: unifiedC.lines[0]?.getRate(false),
        getRateIncl: unifiedC.lines[0]?.getRate(true),
        subTotalExclusive: unifiedC.summary.subTotalExclusive,
        subTotalInclusive: unifiedC.summary.subTotalInclusive,
        grandTotal: unifiedC.summary.grandTotal,
      });

      // Test F: EXACT mappedPrintItem from usePosCheckoutFlow when settling
      // When order has 1 item and 1 extra:
      // detailsData from backend: { qty: 1, productId: 7, productName: "test price1", price: 0.8658009, amount: 0.8658009, mapId: 1 }
      // modifiersData from backend: [{ qty: 1, modifierId: 6, modifierName: "test", price: 0.0865801, mapId: 1 }]
      // printData: { printPrice: "Inclusive", priceView: "Inclusive", orderType: "TAKE OUT", subTotal: 1.100, netAmount: 1.100 }
      const itemF = {
        productId: 7,
        unitId: 1,
        quantity: 1,
        price: 0.8658009,
        basePrice: 0.8658009,
        baseAmount: 0.8658009,
        vatAmount: 0.0909091,
        lineNetAmount: 0.8658009,
        product: {
          name: "test price1",
          price: 0.8658009,
        },
        extras: [{ id: 6, name: "test", price: 0.0865801, qty: 1, typeId: 2 }],
        modifiers: [],
        messages: [],
        lineTotal: 0.8658009,
      };

      const printDataF = {
        orderNo: "162",
        ticketNo: "162",
        orderType: "TAKE OUT",
        printPrice: "Inclusive",
        priceView: "Inclusive",
        subTotal: 1.100,
        netAmount: 1.100,
        vatAmount: 0.100,
        charges: 0.048,
        netValue: 1.000,
        enableVat: true,
      };

      const unifiedF = buildUnifiedOrderPricing([itemF], printDataF as any);
      console.log('UNIFIED F (with backend prices 0.8658009 and 0.0865801, printPrice Inclusive):', {
        exclusiveRate: unifiedF.lines[0]?.exclusiveRate,
        inclusiveRate: unifiedF.lines[0]?.inclusiveRate,
        getRateExcl: unifiedF.lines[0]?.getRate(false),
        getRateIncl: unifiedF.lines[0]?.getRate(true),
        subTotalExclusive: unifiedF.summary.subTotalExclusive,
        subTotalInclusive: unifiedF.summary.subTotalInclusive,
        grandTotal: unifiedF.summary.grandTotal,
      });

      // Test G: what if extras had price 0.100 (inclusive)?
      const itemG = {
        ...itemF,
        extras: [{ id: 6, name: "test", price: 0.100, qty: 1, typeId: 2 }],
      };
      const unifiedG = buildUnifiedOrderPricing([itemG], printDataF as any);
      console.log('UNIFIED G (with item 0.8658009 and extra 0.100, printPrice Inclusive):', {
        exclusiveRate: unifiedG.lines[0]?.exclusiveRate,
        inclusiveRate: unifiedG.lines[0]?.inclusiveRate,
        getRateExcl: unifiedG.lines[0]?.getRate(false),
        getRateIncl: unifiedG.lines[0]?.getRate(true),
        subTotalExclusive: unifiedG.summary.subTotalExclusive,
        subTotalInclusive: unifiedG.summary.subTotalInclusive,
        grandTotal: unifiedG.summary.grandTotal,
      });

      // Test H: what if item price was 0.952?
      const itemH = {
        ...itemF,
        price: 0.952,
        product: { name: "test price1", price: 0.952 },
        extras: [{ id: 6, name: "test", price: 0.100, qty: 1, typeId: 2 }],
      };
      const unifiedH = buildUnifiedOrderPricing([itemH], printDataF as any);
      console.log('UNIFIED H (with item 0.952 and extra 0.100, printPrice Inclusive):', {
        exclusiveRate: unifiedH.lines[0]?.exclusiveRate,
        inclusiveRate: unifiedH.lines[0]?.inclusiveRate,
        getRateExcl: unifiedH.lines[0]?.getRate(false),
        getRateIncl: unifiedH.lines[0]?.getRate(true),
        subTotalExclusive: unifiedH.summary.subTotalExclusive,
        subTotalInclusive: unifiedH.summary.subTotalInclusive,
        grandTotal: unifiedH.summary.grandTotal,
      });

      // Search which combination produces Rate = 1.216 and Subtotal = 1.100
      const uSingle = buildUnifiedOrderPricing([
        {
          productId: 7,
          product: { id: 7, name: "TEST PRICE1", price: 1.000 },
          price: 1.000,
          catalogPrice: 1.000,
          basePrice: 0.8658009,
          quantity: 1,
          extras: [{ id: 6, name: "test", price: 0.100, qty: 1 }],
          lineNetAmount: 1.100,
          lineTotal: 1.100,
        }
      ], {
        orderType: "TAKE OUT",
        printPrice: "Inclusive",
        priceView: "Inclusive",
        subTotal: 1.100,
        charges: 0.048,
        levy: 0.048,
        vatAmount: 0.100,
        netAmount: 1.100,
        enableVat: true,
      } as any);

      expect(uSingle.lines[0]?.getRate(true)).toBeCloseTo(1.100, 3);
      expect(uSingle.lines[0]?.getRate(false)).toBeCloseTo(1.000, 3);

      const printDataSingle = {
        orderNo: "164",
        ticketNo: "164",
        orderType: "TAKE OUT",
        customerName: "CASH CUSTOMER",
        printPrice: "Inclusive",
        priceView: "Inclusive",
        subTotal: 1.100,
        charges: 0.048,
        levy: 0.048,
        vatAmount: 0.100,
        netAmount: 1.100,
        enableVat: true,
      };

      const htmlSingle = await generateGuestPrintHtml(uSingle as any, printDataSingle as any);
      expect(htmlSingle).not.toContain('1.216');
      expect(htmlSingle).not.toContain('1.255');
      expect(htmlSingle).toContain('>1.100<');
    });

    it('Order #89 (User Photo Image 1 & 2): Settle and Print DEMO x3 with TEST and 10 discount', async () => {
      localStorage.setItem('printPrice', 'Inclusive');
      localStorage.setItem('priceView', 'Exclusive');

      const cartItemOrder89 = {
        productId: 6,
        unitId: 1,
        quantity: 3,
        catalogPrice: 10.000,
        price: 11.583,
        basePrice: 10.029,
        lineTotal: 24.750,
        originalLineTotal: 34.750,
        lineNetAmount: 24.750,
        amount: 30.087,
        baseAmount: 30.000,
        extrasTotal: 0.100,
        itemDiscount: 10.000,
        itemDiscountIncl: 10.000,
        itemDiscountExcl: 8.658,
        itemDiscountAmount: 8.658,
        baseDiscount: 8.658,
        product: { id: 6, name: "DEMO", price: 10.000 },
        extras: [{ id: 6, name: "TEST", price: 0.100, qty: 1 }],
        modifiers: [],
        messages: [],
      };

      const printData89 = {
        orderNo: "89",
        ticketNo: "89",
        invoiceNo: "89",
        orderType: "TakeOut",
        customerName: "CASH CUSTOMER",
        isBillDiscount: false,
        printPrice: "Inclusive",
        priceView: "Exclusive",
        subTotal: 30.087,
        discount: 8.658,
        charges: 1.071,
        levy: 1.071,
        netValue: 22.500,
        vatAmount: 2.250,
        netAmount: 24.750,
        enableVat: true,
      };

      const unified89 = buildUnifiedOrderPricing([cartItemOrder89], printData89 as any);
      console.log('UNIFIED 89:', {
        exclusiveRate: unified89.lines[0]?.exclusiveRate,
        inclusiveRate: unified89.lines[0]?.inclusiveRate,
        getRateExcl: unified89.lines[0]?.getRate(false),
        getRateIncl: unified89.lines[0]?.getRate(true),
        subTotalExclusive: unified89.summary.subTotalExclusive,
        subTotalInclusive: unified89.summary.subTotalInclusive,
        grandTotal: unified89.summary.grandTotal,
        lineDiscIncl: unified89.lines[0]?.lineDiscountIncl,
        lineDiscExcl: unified89.lines[0]?.lineDiscountExcl,
      });

      const html89 = await generateGuestPrintHtml(unified89 as any, printData89 as any);
      console.log('HTML 89 snippet:', html89.slice(html89.indexOf('Qty'), html89.indexOf('TOTAL') + 200));

      // Test with exact calculateOrder output:
      const { calculateOrder, getBillingConfig } = await import('../features/pos/terminal/utils/billing');
      const bConfig = getBillingConfig('TakeOut');
      const billResult = calculateOrder(
        [
          {
            uniqueId: "row-1",
            productId: 6,
            quantity: 3,
            price: 10.000,
            catalogPrice: 10.000,
            extras: [{ id: 6, name: "TEST", price: 0.100, qty: 1, typeId: 2 }],
            discountValue: 10,
            discountType: 'amount',
            product: { id: 6, name: "DEMO", price: 10.000 },
          }
        ],
        { orderType: 'TakeOut', config: bConfig }
      );
      console.log('EXACT BILLING CART ITEM:', billResult.lines[0]);
      console.log('EXACT BILLING TOTALS:', {
        subtotal: billResult.summary.subtotal,
        discount: billResult.summary.totalDiscount,
        charges: billResult.summary.charges,
        netValue: billResult.summary.netValue,
        tax: billResult.summary.tax,
        total: billResult.summary.total
      });

      const unifiedFromLiveCart = buildUnifiedOrderPricing(billResult.lines, {
        orderType: "TakeOut",
        printPrice: "Inclusive",
        priceView: "Exclusive",
        subTotal: billResult.summary.subtotal,
        discount: billResult.summary.totalDiscount,
        charges: billResult.summary.charges,
        netValue: billResult.summary.netValue,
        vatAmount: billResult.summary.tax,
        netAmount: billResult.summary.total,
        enableVat: true,
      } as any);

      console.log('UNIFIED FROM LIVE CART:', {
        rate: unifiedFromLiveCart.lines[0]?.getRate(true),
        gross: unifiedFromLiveCart.lines[0]?.inclusiveGross,
        disc: unifiedFromLiveCart.lines[0]?.lineDiscountIncl,
        net: unifiedFromLiveCart.lines[0]?.inclusiveAmount,
        subTotal: unifiedFromLiveCart.summary.subTotalInclusive,
        subTotalExcl: unifiedFromLiveCart.summary.subTotalExclusive,
        grandTotal: unifiedFromLiveCart.summary.grandTotal
      });

      const htmlFromLiveCart = await generateGuestPrintHtml(unifiedFromLiveCart as any, {
        orderType: "TakeOut",
        printPrice: "Inclusive",
        priceView: "Exclusive",
        subTotal: billResult.summary.subtotal,
        discount: billResult.summary.totalDiscount,
        charges: billResult.summary.charges,
        netValue: billResult.summary.netValue,
        vatAmount: billResult.summary.tax,
        netAmount: billResult.summary.total,
        enableVat: true,
      } as any);
      console.log('HTML FROM LIVE CART SNIPPET:', htmlFromLiveCart.slice(htmlFromLiveCart.indexOf('Qty'), htmlFromLiveCart.indexOf('TOTAL') + 200));

      // Rate in Inclusive mode must be 11.583, NOT 13.374
      expect(unified89.lines[0]?.getRate(true)).toBeCloseTo(11.583, 2);
      expect(html89).not.toContain('13.374');
      expect(html89).not.toContain('40.121');
      expect(html89).not.toContain('34.737');
      expect(html89).not.toContain('27.150');
      expect(html89).not.toContain('4.149');
      expect(html89).toContain('11.583');
      expect(html89).toContain('34.750');
      expect(html89).toContain('24.750');
    });

    it('Order #253 (Settled Details) vs Order #254 (Recall Details): ABCD inclusive 105.000 with extra xxx displays Subtotal 95.455, Net Value 95.455, VAT 9.545, Grand Total 105.000', async () => {
      localStorage.setItem('decimalPart', '3');
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('enableVat', 'true');
      localStorage.setItem('vat', '10');

      const order253Data = {
        masterData: {
          orderNo: 253,
          ticketNo: 253,
          voucherNo: "104",
          orderType: "TakeOut",
          vatExclAmount: 95.4545455,
          vatAmount: 9.5454545,
          netAmount: 105.000,
          discAmount: 0,
          serviceCharge: 0,
          levy: 0,
          deliveryCharge: 0,
        },
        detailsData: [
          {
            productId: 101,
            productName: "Abcd",
            price: 105.000,
            amount: 105.000,
            qty: 1,
            vatAmount: 9.5454545,
            mapId: 1,
          }
        ],
        modifiersData: [
          {
            modifierId: 201,
            modifierName: "xxx",
            price: 4.5454545,
            qty: 1,
            mapId: 1,
          }
        ]
      };

      const unified253 = buildUnifiedOrderPricing(order253Data, {
        orderType: "TakeOut",
        priceView: "Inclusive",
        allExtras: [{ id: 201, name: "xxx", price: 5.000, typeId: 2 }],
        products: [{ id: 101, name: "Abcd", price: 100.000, isIncl: true }],
      });

      // Line item combined inclusive rate
      expect(unified253.lines[0]?.getRate(true)).toBeCloseTo(105.000, 3);
      expect(unified253.lines[0]?.inclusiveGross).toBeCloseTo(105.000, 3);

      // PosSettledDetailsModal authoritative logic:
      const master = order253Data.masterData;
      const rawVatExcl = Number(
        master.vatExclAmount !== undefined && master.vatExclAmount !== null
          ? master.vatExclAmount
          : master.netAmount
      );
      const displayCharges = 0;
      const displayDiscount = 0;

      // Sub Total must be 95.455 (NOT 105.000)
      const displaySubTotal = Math.round((Math.max(0, rawVatExcl - displayCharges) + displayDiscount) * 1000) / 1000;
      expect(displaySubTotal).toBeCloseTo(95.455, 3);

      // Net Value must be 95.455 (NOT 105.000)
      const displayNetValue = Math.round(rawVatExcl * 1000) / 1000;
      expect(displayNetValue).toBeCloseTo(95.455, 3);

      // VAT must be 9.545
      const displayVat = Math.round(Number(master.vatAmount) * 1000) / 1000;
      expect(displayVat).toBeCloseTo(9.545, 3);

      // Grand Total must be 105.000
      expect(master.netAmount).toBe(105.000);
      expect(displayNetValue + displayVat).toBeCloseTo(105.000, 3);
    });
  });
});
