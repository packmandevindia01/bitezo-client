import { describe, it, expect, beforeEach } from 'vitest';
import { buildUnifiedOrderPricing } from '../features/pos/utils/orderPricing';
import { formatAmount } from '../utils/currency';

describe('Recall & Settle Display Matching Backend Data', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('decimalPart', '3');
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vat', '10');
  });

  const order85BackendData = {
    masterData: {
      orderNo: 85,
      ticketNo: 85,
      orderType: 'TakeOut',
      orderTypeId: 2,
      customerId: 1,
      customerName: 'CASH CUSTOMER',
      deliveryCharge: 0,
      driverId: 0,
      discAmount: 0.3636364,
      discPer: 0,
      serviceCharge: 0,
      levy: 0,
      vatExclAmount: 3.6363636,
      vatAmount: 0.3636364,
      netAmount: 4,
      updatedAt: '2026-10-28T14:14:16.241+05:30'
    },
    detailsData: [
      {
        productId: 6,
        productName: 'Demo',
        qty: 4,
        price: 1,
        discPer: 0,
        discAmount: 0,
        vatId: 1,
        vatValue: 10,
        vatAmount: 0.3636364,
        netAmount: 4,
        mapId: 1
      }
    ]
  };

  /**
   * Helper extracting the display footer values according to PosRecallDetailsModal and PosSettledDetailsModal logic
   */
  const computeDisplayTotals = (order: typeof order85BackendData, priceView: 'Inclusive' | 'Exclusive') => {
    const master = order.masterData;
    const isTaxInclusive = priceView === 'Inclusive';
    const unified = buildUnifiedOrderPricing(order, {
      orderType: master.orderType,
      priceView,
      isBillDiscount: Number(master.discAmount || 0) > 0,
      products: (order as any).products,
      productCache: (order as any).productCache,
    });

    // Backend authoritative footer fields
    const backendDiscount = Number(
      master.discAmount ??
      (master as any).DiscAmount ??
      (master as any).discAmt ??
      (master as any).discount ??
      0
    );
    const displayDiscount = Number(
      unified
        ? (isTaxInclusive
            ? (unified.summary.totalDiscountIncl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(true) : backendDiscount))
            : (unified.summary.totalDiscountExcl ?? (typeof unified.summary.getTotalDiscount === "function" ? unified.summary.getTotalDiscount(false) : backendDiscount)))
        : (backendDiscount > 0 ? backendDiscount : 0)
    );

    const displayServiceCharge = Number(master.serviceCharge || 0);
    const displayLevy = Number(master.levy || 0);
    const displayDeliveryCharge = Number(master.deliveryCharge || 0);

    const grossSubTotalFromLines = unified
      ? ((isTaxInclusive && (displayServiceCharge + displayLevy) <= 0) ? unified.summary.subTotalInclusive : unified.summary.subTotalExclusive)
      : 0;

    const displaySubTotal = Number(
      grossSubTotalFromLines > 0
        ? grossSubTotalFromLines
        : ((master as any).subTotal !== undefined && (master as any).subTotal !== null && Number((master as any).subTotal) > 0
            ? Number((master as any).subTotal)
            : (master.vatExclAmount !== undefined && master.vatExclAmount !== null && Number(master.vatExclAmount) > 0
                ? Number(master.vatExclAmount) + displayDiscount
                : 0))
    );

    const displayVatAmount = Number(
      master.vatAmount !== undefined && master.vatAmount !== null && Number(master.vatAmount) > 0
        ? Number(master.vatAmount)
        : unified.summary.vatAmount
    );

    const displayGrandTotal = Number(
      master.netAmount !== undefined && master.netAmount !== null
        ? Number(master.netAmount)
        : unified.summary.grandTotal
    );

    // Single line items
    const lineItem = unified.lines[0];
    const lineUnitPrice = isTaxInclusive
      ? lineItem.inclusiveRate
      : lineItem.exclusiveRate;
    const lineTotal = isTaxInclusive
      ? lineItem.inclusiveGross
      : lineItem.exclusiveGross;

    let displayCharges = Number(displayServiceCharge || 0) + Number(displayLevy || 0);
    const exclDiscountForNetBase = (isTaxInclusive && Number(displayServiceCharge + displayLevy) > 0)
      ? Number(unified?.summary?.totalDiscountExcl ?? displayDiscount)
      : displayDiscount;
    const netBase = Math.max(0, displaySubTotal - exclDiscountForNetBase);
    if (!isTaxInclusive && displayGrandTotal > 0) {
      const residual = Math.round((displayGrandTotal - netBase - displayDeliveryCharge - displayVatAmount) * 1000) / 1000;
      if (residual > 0.001) {
        if (displayCharges <= 0 || Math.abs(displayCharges - residual) > 0.005) {
          displayCharges = residual;
        }
      }
    }
    const displayNetValue = Math.max(0, Math.round((displayGrandTotal - displayDeliveryCharge - displayVatAmount) * 1000) / 1000);

    return {
      subTotalStr: formatAmount(displaySubTotal),
      discountStr: formatAmount(displayDiscount),
      serviceChargeStr: formatAmount(displayServiceCharge),
      levyStr: formatAmount(displayLevy),
      chargesStr: formatAmount(displayCharges),
      netValueStr: formatAmount(displayNetValue),
      deliveryChargeStr: formatAmount(displayDeliveryCharge),
      vatStr: formatAmount(displayVatAmount),
      grandTotalStr: formatAmount(displayGrandTotal),
      lineUnitPriceStr: formatAmount(lineUnitPrice),
      lineTotalStr: formatAmount(lineTotal),
      lineDiscountStr: formatAmount(lineItem.getDiscount(isTaxInclusive)),
      lineNetStr: formatAmount(isTaxInclusive ? lineItem.inclusiveAmount : lineItem.exclusiveAmount),
      displaySubTotal,
      displayDiscount,
      displayCharges,
      displayNetValue,
      displayVatAmount,
      displayGrandTotal,
    };
  };

  it('Order #85 in EXCLUSIVE priceView: single product shows exclusive rate (0.909, 3.636) while footer matches backend data exactly (Subtotal 3.636, Discount 0.364, VAT 0.364, Grand Total 4.000)', () => {
    localStorage.setItem('priceView', 'Exclusive');
    const result = computeDisplayTotals(order85BackendData, 'Exclusive');

    // Product line must reflect exclusive rate
    expect(result.lineUnitPriceStr).toBe('0.909');
    expect(result.lineTotalStr).toBe('3.636');

    // Footer section MUST match backend data
    expect(result.subTotalStr).toBe('3.636'); // masterData.vatExclAmount
    expect(result.discountStr).toBe('0.364'); // masterData.discAmount (NOT corrupted to 0.331!)
    expect(result.vatStr).toBe('0.364'); // masterData.vatAmount
    expect(result.grandTotalStr).toBe('4.000'); // masterData.netAmount
  });

  it('Order #85 in INCLUSIVE priceView: single product shows inclusive rate (1.000, 4.000) and inclusive gross subtotal (4.000)', () => {
    localStorage.setItem('priceView', 'Inclusive');
    const result = computeDisplayTotals(order85BackendData, 'Inclusive');

    // Product line must reflect inclusive rate
    expect(result.lineUnitPriceStr).toBe('1.000');
    expect(result.lineTotalStr).toBe('4.000');

    // Footer in inclusive view shows inclusive gross subtotal
    expect(result.subTotalStr).toBe('4.000');
    expect(result.discountStr).toBe('0.364'); // masterData.discAmount
    expect(result.vatStr).toBe('0.364'); // masterData.vatAmount
    expect(result.grandTotalStr).toBe('4.000'); // masterData.netAmount
  });

  it('Order with Service Charge, Levy, and Delivery Charge matches backend data in display footer', () => {
    const complexOrder = {
      masterData: {
        orderNo: 99,
        ticketNo: 99,
        orderType: 'DineIn',
        orderTypeId: 1,
        customerId: 1,
        customerName: 'CASH CUSTOMER',
        subTotal: 20.000,
        vatExclAmount: 20.000,
        discAmount: 2.000,
        serviceCharge: 2.500,
        levy: 1.000,
        deliveryCharge: 1.500,
        vatAmount: 2.150,
        netAmount: 25.150,
      },
      detailsData: [
        {
          productId: 10,
          productName: 'Pizza',
          qty: 2,
          price: 10,
          isPriceTaxExclusive: true,
          vatValue: 10,
          vatAmount: 2.000,
          netAmount: 22,
          discAmount: 0,
        }
      ]
    };

    const exclResult = computeDisplayTotals(complexOrder as any, 'Exclusive');
    expect(exclResult.subTotalStr).toBe('20.000');
    expect(exclResult.discountStr).toBe('2.000');
    expect(exclResult.chargesStr).toBe('3.500'); // 2.500 SC + 1.000 Levy
    expect(exclResult.netValueStr).toBe('21.500'); // 20 - 2 + 3.5 = 21.5
    expect(exclResult.serviceChargeStr).toBe('2.500');
    expect(exclResult.levyStr).toBe('1.000');
    expect(exclResult.deliveryChargeStr).toBe('1.500');
    expect(exclResult.vatStr).toBe('2.150');
    expect(exclResult.grandTotalStr).toBe('25.150');

    const inclResult = computeDisplayTotals(complexOrder as any, 'Inclusive');
    expect(inclResult.subTotalStr).toBe('20.000');
    expect(inclResult.discountStr).toBe('2.000');
    expect(inclResult.chargesStr).toBe('3.500');
    expect(inclResult.netValueStr).toBe('21.500');
    expect(inclResult.serviceChargeStr).toBe('2.500');
    expect(inclResult.levyStr).toBe('1.000');
    expect(inclResult.deliveryChargeStr).toBe('1.500');
    expect(inclResult.vatStr).toBe('2.150');
    expect(inclResult.grandTotalStr).toBe('25.150');
  });

  it('Order #97 from user screenshot (TakeOut Qty 2 @ 10, Disc 10) displays SubTotal 20.000, Discount 10.000, Charges 0.500, Net Value 10.500, VAT 1.050, Grand Total 11.550', () => {
    const screenshotOrder = {
      masterData: {
        orderNo: 97,
        ticketNo: 97,
        orderType: 'TakeOut',
        orderTypeId: 2,
        customerId: 1,
        subTotal: 20.000,
        discAmount: 10.000,
        serviceCharge: 0,
        levy: 0.500,
        vatExclAmount: 10.500,
        vatAmount: 1.050,
        netAmount: 11.550,
      },
      detailsData: [
        {
          productId: 1,
          productName: 'DEMO',
          qty: 2,
          price: 10,
          isPriceTaxExclusive: true,
          vatValue: 10,
          vatAmount: 1.050,
          netAmount: 11.550,
        }
      ]
    };

    const res = computeDisplayTotals(screenshotOrder as any, 'Exclusive');
    expect(res.subTotalStr).toBe('20.000');
    expect(res.discountStr).toBe('10.000');
    expect(res.chargesStr).toBe('0.500');
    expect(res.netValueStr).toBe('10.500');
    expect(res.vatStr).toBe('1.050');
    expect(res.grandTotalStr).toBe('11.550');
  });

  it('DineIn order from spreadsheet (Qty 4 @ 11, Qty 2 @ 15, SC 10%, Levy 5%, VAT 10%) displays SubTotal 74.000, Charges 11.470, Net Value 85.470, VAT 8.547, Grand Total 94.017', () => {
    const spreadsheetOrder = {
      masterData: {
        orderNo: 101,
        ticketNo: 1,
        orderType: 'DineIn',
        orderTypeId: 1,
        subTotal: 74.000,
        serviceCharge: 7.400,
        levy: 4.070,
        vatAmount: 8.547,
        netAmount: 94.017,
      },
      detailsData: [
        {
          productId: 101,
          productName: 'Item 1',
          qty: 4,
          price: 11,
          isPriceTaxExclusive: true,
          vatValue: 10,
          vatAmount: 5.082,
          netAmount: 55.902,
          serviceCharge: 4.4,
          levy: 2.42,
        },
        {
          productId: 102,
          productName: 'Item 2',
          qty: 2,
          price: 15,
          isPriceTaxExclusive: true,
          vatValue: 10,
          vatAmount: 3.465,
          netAmount: 38.115,
          serviceCharge: 3.0,
          levy: 1.65,
        }
      ]
    };

    const res = computeDisplayTotals(spreadsheetOrder as any, 'Exclusive');
    expect(res.subTotalStr).toBe('74.000');
    expect(res.discountStr).toBe('0.000');
    expect(res.chargesStr).toBe('11.470');
    expect(res.netValueStr).toBe('85.470');
    expect(res.vatStr).toBe('8.547');
    expect(res.grandTotalStr).toBe('94.017');
  });

  describe('Inside Recall & Settle Print Receipts (HTML & Thermal ESC/POS)', () => {
    const order97Data = {
      masterData: {
        orderNo: 97,
        ticketNo: 97,
        orderType: 'TakeOut',
        orderTypeId: 2,
        subTotal: 20.000,
        discAmount: 10.000,
        serviceCharge: 0,
        levyAmt: 0.500,
        levy: 0.500,
        vatExclAmount: 10.500,
        vatAmount: 1.050,
        netAmount: 11.550,
      },
      detailsData: [
        {
          productId: 1,
          productName: 'DEMO',
          qty: 2,
          price: 10,
          isPriceTaxExclusive: true,
          vatValue: 10,
          vatAmount: 1.050,
          netAmount: 11.550,
        }
      ]
    };

    it('Order #97 inside recall Guest Print HTML: displays Charges (0.500) and Net Value (10.500), NOT Levy(5%)', async () => {
      const { generateGuestPrintHtml } = await import('../features/pos/utils/guestPrintTemplate');
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');

      const master = order97Data.masterData;
      const unified = buildUnifiedOrderPricing(order97Data, {
        orderType: master.orderType,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      });

      const printData: any = {
        orderNo: master.orderNo,
        ticketNo: master.ticketNo,
        waiter: 'emp1',
        counter: 'Main',
        orderType: master.orderType,
        subTotal: 20.000,
        discount: 10.000,
        serviceCharge: 0,
        levy: 0.500,
        charges: 0.500,
        netValue: 10.500,
        vatAmount: 1.050,
        netAmount: 11.550,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      };

      const html = await generateGuestPrintHtml(unified as any, printData);

      // Verify all lines match the cart and recall display
      expect(html).toContain('Sub Total');
      expect(html).toContain('20.000');
      expect(html).toContain('Discount');
      expect(html).toContain('-10.000');
      expect(html).toContain('Charges');
      expect(html).toContain('0.500');
      expect(html).toContain('Net Value');
      expect(html).toContain('10.500');
      expect(html).toContain('VAT Amount');
      expect(html).toContain('1.050');
      expect(html).toContain('Grand Total');
      expect(html).toContain('11.550');

      // Crucial: Must NEVER contain obsolete separate 'Levy(5%)'
      expect(html).not.toContain('Levy(5%)');
      expect(html).not.toContain('Levy (5%)');
    });

    it('Order #97 inside recall ESC/POS Thermal Print: displays Charges and Net Value, NOT Levy (5%)', async () => {
      const { generateBillMarkup } = await import('../features/pos/utils/escPosGenerator');
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');

      const master = order97Data.masterData;
      const printData: any = {
        orderNo: master.orderNo,
        ticketNo: master.ticketNo,
        waiter: 'emp1',
        counter: 'Main',
        orderType: master.orderType,
        subTotal: 20.000,
        discount: 10.000,
        serviceCharge: 0,
        levy: 0.500,
        charges: 0.500,
        netValue: 10.500,
        vatAmount: 1.050,
        netAmount: 11.550,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      };

      const unified = buildUnifiedOrderPricing(order97Data, {
        orderType: master.orderType,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      });

      const markup = generateBillMarkup({
        cartDetails: unified as any,
        data: printData,
      });

      expect(markup).toContain('Sub Total');
      expect(markup).toContain('20.000');
      expect(markup).toContain('Discount');
      expect(markup).toContain('-10.000');
      expect(markup).toContain('Charges');
      expect(markup).toContain('0.500');
      expect(markup).toContain('Net Value');
      expect(markup).toContain('10.500');
      expect(markup).toContain('VAT Amount');
      expect(markup).toContain('1.050');
      expect(markup).toContain('GRAND TOTAL');
      expect(markup).toContain('11.550');

      // Crucial: Must NEVER contain obsolete separate 'Levy(5%)' or 'Levy (5%)'
      expect(markup).not.toContain('Levy(5%)');
      expect(markup).not.toContain('Levy (5%)');
    });

    it('Inside recall print when master has missing levy/charges: falls back gracefully to unified summary and prints Charges', async () => {
      const { generateGuestPrintHtml } = await import('../features/pos/utils/guestPrintTemplate');
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('levy', '5');

      // Order with levy missing on masterData
      const incompleteOrder = {
        masterData: {
          orderNo: 98,
          ticketNo: 98,
          orderType: 'TakeOut',
          orderTypeId: 2,
          subTotal: 20.000,
          discAmount: 10.000,
          serviceCharge: 0,
          // levyAmt & levy intentionally undefined to simulate missing backend field
          vatAmount: 1.050,
          netAmount: 11.550,
        },
        detailsData: [
          {
            productId: 1,
            productName: 'DEMO',
            qty: 2,
            price: 10,
            isPriceTaxExclusive: true,
            levy: 0.500,
            vatValue: 10,
            vatAmount: 1.050,
            netAmount: 11.550,
          }
        ],
        products: [
          { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        ],
        productCache: {
          5: { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        }
      };

      const unified = buildUnifiedOrderPricing(incompleteOrder, {
        orderType: 'TakeOut',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      });

      // Even if printData doesn't explicitly pass charges, generator must resolve from unified.summary.levy
      const printData: any = {
        orderNo: '98',
        ticketNo: '98',
        waiter: 'emp1',
        counter: 'Main',
        orderType: 'TakeOut',
        subTotal: 20.000,
        discount: 10.000,
        serviceCharge: 0,
        levy: 0, // master had 0
        vatAmount: 1.050,
        netAmount: 11.550,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      };

      const html = await generateGuestPrintHtml(unified as any, printData);
      expect(html).toContain('Charges');
      expect(html).toContain('0.500');
      expect(html).toContain('Net Value');
      expect(html).toContain('10.500');
    });

    it('Bilingual Arabic Guest Print: prints Charges (الرسوم) and Net Value (القيمة الصافية)', async () => {
      const { generateGuestPrintHtml } = await import('../features/pos/utils/guestPrintTemplate');
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('billArabic', 'true');

      const master = order97Data.masterData;
      const unified = buildUnifiedOrderPricing(order97Data, {
        orderType: master.orderType,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      });

      const printData: any = {
        orderNo: master.orderNo,
        ticketNo: master.ticketNo,
        waiter: 'emp1',
        counter: 'Main',
        orderType: master.orderType,
        subTotal: 20.000,
        discount: 10.000,
        serviceCharge: 0,
        levy: 0.500,
        charges: 0.500,
        netValue: 10.500,
        vatAmount: 1.050,
        netAmount: 11.550,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
        billArabic: true,
      };

      const html = await generateGuestPrintHtml(unified as any, printData);
      expect(html).toContain('Charges');
      expect(html).toContain('الرسوم');
      expect(html).toContain('Net Value');
      expect(html).toContain('القيمة الصافية');
    });

    it('Order #99 (Invoice 44) Settled Details Modal: displays Charges 0.500 and Net Value 10.500 even when backend sales invoice returns 0 levyAmt', async () => {
      // Order #99 as reported in media_1793248895271_5d7e77d5.png
      const order99SettledData = {
        masterData: {
          orderNo: 99,
          invoiceNo: '44',
          ticketNo: '99',
          orderType: 'TakeOut',
          orderTypeId: 2,
          subTotal: 20.000,
          discAmount: 10.000,
          serviceCharge: 0,
          levyAmt: 0, // Backend sales invoice returned 0!
          levy: 0,
          vatExclAmount: 10.000, // Backend returned 10.000
          vatAmount: 1.050,
          netAmount: 11.550,
        },
        detailsData: [
          {
            productId: 1,
            productName: 'DEMO',
            qty: 2,
            price: 10,
            isPriceTaxExclusive: true,
            vatValue: 10,
            vatAmount: 1.050,
            netAmount: 11.550,
          }
        ],
        products: [
          { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        ],
        productCache: {
          5: { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        }
      };

      localStorage.setItem('priceView', 'Exclusive');
      const res = computeDisplayTotals(order99SettledData as any, 'Exclusive');

      // Crucial: Must display Charges 0.500 and Net Value 10.500 so arithmetic balances:
      // Sub Total (20.000) - Discount (10.000) + Charges (0.500) = Net Value (10.500)
      // Net Value (10.500) + VAT (1.050) = Grand Total (11.550)
      expect(res.subTotalStr).toBe('20.000');
      expect(res.discountStr).toBe('10.000');
      expect(res.chargesStr).toBe('0.500');
      expect(res.netValueStr).toBe('10.500');
      expect(res.vatStr).toBe('1.050');
      expect(res.grandTotalStr).toBe('11.550');
    });

    it('Order #99 Settle Print (Guest HTML): prints Charges 0.500 and Net Value 10.500 when printed from Settled Details', async () => {
      const { generateGuestPrintHtml } = await import('../features/pos/utils/guestPrintTemplate');
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');

      const order99SettledData = {
        masterData: {
          orderNo: 99,
          invoiceNo: '44',
          ticketNo: '99',
          orderType: 'TakeOut',
          orderTypeId: 2,
          subTotal: 20.000,
          discAmount: 10.000,
          serviceCharge: 0,
          levyAmt: 0,
          levy: 0,
          vatAmount: 1.050,
          netAmount: 11.550,
        },
        detailsData: [
          {
            productId: 1,
            productName: 'DEMO',
            qty: 2,
            price: 10,
            isPriceTaxExclusive: true,
            vatValue: 10,
            vatAmount: 1.050,
            netAmount: 11.550,
          }
        ],
        products: [
          { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        ],
        productCache: {
          5: { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        }
      };

      const unified = buildUnifiedOrderPricing(order99SettledData as any, {
        orderType: 'TakeOut',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      });

      // Simulating settled modal passing printData with backend 0 levy
      const printData: any = {
        orderNo: '99',
        invoiceNo: '44',
        ticketNo: '99',
        waiter: 'emp1',
        counter: 'Main',
        orderType: 'TakeOut',
        subTotal: 20.000,
        discount: 10.000,
        serviceCharge: 0,
        levy: 0,
        charges: 0, // Missing/0 from backend
        vatAmount: 1.050,
        netAmount: 11.550,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
        isSettlement: true,
      };

      const html = await generateGuestPrintHtml(unified as any, printData);
      expect(html).toContain('Charges');
      expect(html).toContain('0.500');
      expect(html).toContain('Net Value');
      expect(html).toContain('10.500');
      expect(html).toContain('1.050');
      expect(html).toContain('11.550');
      expect(html).toContain('Invoice No');
      expect(html).toContain('#44');
    });

    it('Order #99 Settle ESC/POS Thermal Print: prints Charges 0.500 and Net Value 10.500 when printed from Settled Details', async () => {
      const { generateBillMarkup } = await import('../features/pos/utils/escPosGenerator');
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');

      const order99SettledData = {
        masterData: {
          orderNo: 99,
          invoiceNo: '44',
          ticketNo: '99',
          orderType: 'TakeOut',
          orderTypeId: 2,
          subTotal: 20.000,
          discAmount: 10.000,
          serviceCharge: 0,
          levyAmt: 0,
          levy: 0,
          vatAmount: 1.050,
          netAmount: 11.550,
        },
        detailsData: [
          {
            productId: 1,
            productName: 'DEMO',
            qty: 2,
            price: 10,
            isPriceTaxExclusive: true,
            vatValue: 10,
            vatAmount: 1.050,
            netAmount: 11.550,
          }
        ],
        products: [
          { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        ],
        productCache: {
          5: { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        }
      };

      const unified = buildUnifiedOrderPricing(order99SettledData as any, {
        orderType: 'TakeOut',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      });

      const printData: any = {
        orderNo: '99',
        invoiceNo: '44',
        ticketNo: '99',
        waiter: 'emp1',
        counter: 'Main',
        orderType: 'TakeOut',
        subTotal: 20.000,
        discount: 10.000,
        serviceCharge: 0,
        levy: 0,
        charges: 0, // Missing/0 from backend
        vatAmount: 1.050,
        netAmount: 11.550,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
        isSettlement: true,
      };

      const markup = generateBillMarkup({
        cartDetails: unified as any,
        data: printData,
      });

      expect(markup).toContain('Charges');
      expect(markup).toContain('0.500');
      expect(markup).toContain('Net Value');
      expect(markup).toContain('10.500');
      expect(markup).toContain('VAT Amount');
      expect(markup).toContain('1.050');
      expect(markup).toContain('GRAND TOTAL');
      expect(markup).toContain('11.550');
    });

    it('Order #102: Initial Punch (No Discount) -> Recall displays Sub Total 20.000, Charges 1.000, Net Value 21.000, VAT 2.100, Grand Total 23.100', () => {
      // Order #102 initial punch as in media_1793249576131_3abbb1b8.png
      const order102InitialData = {
        masterData: {
          orderNo: 102,
          ticketNo: '102',
          orderType: 'TakeOut',
          orderTypeId: 2,
          subTotal: 20.000,
          discAmount: 0,
          serviceCharge: 0,
          levyAmt: 1.000,
          levy: 1.000,
          vatExclAmount: 21.000,
          vatAmount: 2.100,
          netAmount: 23.100,
        },
        detailsData: [
          {
            productId: 1,
            productName: 'DEMO',
            qty: 2,
            price: 10,
            isPriceTaxExclusive: true,
            vatValue: 10,
            vatAmount: 2.100,
            netAmount: 23.100,
          }
        ],
        products: [
          { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        ],
        productCache: {
          5: { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        }
      };

      localStorage.setItem('priceView', 'Exclusive');
      const res = computeDisplayTotals(order102InitialData as any, 'Exclusive');
      expect(res.subTotalStr).toBe('20.000');
      expect(res.discountStr).toBe('0.000');
      expect(res.chargesStr).toBe('1.000');
      expect(res.netValueStr).toBe('21.000');
      expect(res.vatStr).toBe('2.100');
      expect(res.grandTotalStr).toBe('23.100');
    });

    it('Order #102: Edited with 10.000 discount -> Recall Details Modal reconciles stale 1.000 levy to 0.500 and Net Value to 10.500', () => {
      // Order #102 after editing with discount, but backend still holds stale pre-discount levy 1.000 as in media_1793249643374_b87af09f.png
      const order102EditedDataWithStaleLevy = {
        masterData: {
          orderNo: 102,
          ticketNo: '102',
          orderType: 'TakeOut',
          orderTypeId: 2,
          subTotal: 20.000,
          discAmount: 10.000,
          serviceCharge: 0,
          levyAmt: 1.000, // STALE levy from backend database
          levy: 1.000,    // STALE levy from backend database
          vatAmount: 1.050,
          netAmount: 11.550,
        },
        detailsData: [
          {
            productId: 1,
            productName: 'DEMO',
            qty: 2,
            price: 10,
            isPriceTaxExclusive: true,
            vatValue: 10,
            vatAmount: 1.050,
            netAmount: 11.550,
          }
        ],
        products: [
          { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        ],
        productCache: {
          5: { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        }
      };

      localStorage.setItem('priceView', 'Exclusive');
      const res = computeDisplayTotals(order102EditedDataWithStaleLevy as any, 'Exclusive');

      // The modal MUST reconcile charges to 0.500 and net value to 10.500!
      // Must NOT show stale charges of 1.000 and net value of 11.000!
      expect(res.subTotalStr).toBe('20.000');
      expect(res.discountStr).toBe('10.000');
      expect(res.chargesStr).toBe('0.500'); // Corrected from stale 1.000
      expect(res.netValueStr).toBe('10.500'); // Corrected from stale 11.000
      expect(res.vatStr).toBe('1.050');
      expect(res.grandTotalStr).toBe('11.550');
    });

    it('Order #102 Edited with Discount Guest Print HTML: prints reconciled Charges 0.500 and Net Value 10.500', async () => {
      const { generateGuestPrintHtml } = await import('../features/pos/utils/guestPrintTemplate');
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');

      const order102Data = {
        masterData: {
          orderNo: 102,
          ticketNo: '102',
          orderType: 'TakeOut',
          orderTypeId: 2,
          subTotal: 20.000,
          discAmount: 10.000,
          serviceCharge: 0,
          levyAmt: 1.000, // Stale levy
          levy: 1.000,
          vatAmount: 1.050,
          netAmount: 11.550,
        },
        detailsData: [
          {
            productId: 1,
            productName: 'DEMO',
            qty: 2,
            price: 10,
            isPriceTaxExclusive: true,
            vatValue: 10,
            vatAmount: 1.050,
            netAmount: 11.550,
          }
        ],
        products: [
          { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        ],
        productCache: {
          5: { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        }
      };

      const unified = buildUnifiedOrderPricing(order102Data as any, {
        orderType: 'TakeOut',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      });

      const printData: any = {
        orderNo: '102',
        ticketNo: '102',
        waiter: 'emp1',
        counter: 'Main',
        orderType: 'TakeOut',
        subTotal: 20.000,
        discount: 10.000,
        serviceCharge: 0,
        levy: 1.000, // Stale levy passed
        charges: 1.000,
        netValue: 11.000, // Stale net value passed
        vatAmount: 1.050,
        netAmount: 11.550,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      };

      const html = await generateGuestPrintHtml(unified as any, printData);
      expect(html).toContain('Charges');
      expect(html).toContain('0.500');
      expect(html).not.toContain('1.000</td>');
      expect(html).toContain('Net Value');
      expect(html).toContain('10.500');
      expect(html).not.toContain('11.000</td>');
      expect(html).toContain('1.050');
      expect(html).toContain('11.550');
    });

    it('Order #102 Edited with Discount ESC/POS Thermal Print: prints reconciled Charges 0.500 and Net Value 10.500', async () => {
      const { generateBillMarkup } = await import('../features/pos/utils/escPosGenerator');
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');

      const order102Data = {
        masterData: {
          orderNo: 102,
          ticketNo: '102',
          orderType: 'TakeOut',
          orderTypeId: 2,
          subTotal: 20.000,
          discAmount: 10.000,
          serviceCharge: 0,
          levyAmt: 1.000, // Stale levy
          levy: 1.000,
          vatAmount: 1.050,
          netAmount: 11.550,
        },
        detailsData: [
          {
            productId: 1,
            productName: 'DEMO',
            qty: 2,
            price: 10,
            isPriceTaxExclusive: true,
            vatValue: 10,
            vatAmount: 1.050,
            netAmount: 11.550,
          }
        ],
        products: [
          { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        ],
        productCache: {
          5: { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        }
      };

      const unified = buildUnifiedOrderPricing(order102Data as any, {
        orderType: 'TakeOut',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      });

      const printData: any = {
        orderNo: '102',
        ticketNo: '102',
        waiter: 'emp1',
        counter: 'Main',
        orderType: 'TakeOut',
        subTotal: 20.000,
        discount: 10.000,
        serviceCharge: 0,
        levy: 1.000, // Stale levy
        charges: 1.000,
        netValue: 11.000, // Stale netValue
        vatAmount: 1.050,
        netAmount: 11.550,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        isBillDiscount: true,
      };

      const markup = generateBillMarkup({
        cartDetails: unified as any,
        data: printData,
      });

      expect(markup).toContain('Charges');
      expect(markup).toContain('0.500');
      expect(markup).toContain('Net Value');
      expect(markup).toContain('10.500');
      expect(markup).toContain('VAT Amount');
      expect(markup).toContain('1.050');
      expect(markup).toContain('GRAND TOTAL');
      expect(markup).toContain('11.550');
    });

    it('Edge Case: 50% Bill Discount percentage on 20.000 with stale pre-discount levy 1.000 -> reconciles to 0.500', () => {
      const order50PercentData = {
        masterData: {
          orderNo: 103,
          ticketNo: '103',
          orderType: 'TakeOut',
          orderTypeId: 2,
          subTotal: 20.000,
          discAmount: 10.000,
          discPer: 50,
          serviceCharge: 0,
          levyAmt: 1.000, // Stale pre-discount levy
          levy: 1.000,
          vatAmount: 1.050,
          netAmount: 11.550,
        },
        detailsData: [
          {
            productId: 1,
            productName: 'DEMO',
            qty: 2,
            price: 10,
            isPriceTaxExclusive: true,
            vatValue: 10,
            vatAmount: 1.050,
            netAmount: 11.550,
          }
        ],
        products: [
          { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        ],
        productCache: {
          5: { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        }
      };

      localStorage.setItem('priceView', 'Exclusive');
      const res = computeDisplayTotals(order50PercentData as any, 'Exclusive');
      expect(res.subTotalStr).toBe('20.000');
      expect(res.discountStr).toBe('10.000');
      expect(res.chargesStr).toBe('0.500');
      expect(res.netValueStr).toBe('10.500');
      expect(res.vatStr).toBe('1.050');
      expect(res.grandTotalStr).toBe('11.550');
    });

    it('Edge Case: Item-level discount of 10.000 (2 DEMO, 5.000 discount per unit) with stale pre-discount levy -> reconciles to 0.500', () => {
      const orderItemDiscountData = {
        masterData: {
          orderNo: 104,
          ticketNo: '104',
          orderType: 'TakeOut',
          orderTypeId: 2,
          subTotal: 20.000,
          discAmount: 0,
          serviceCharge: 0,
          levyAmt: 1.000, // Stale pre-discount levy
          levy: 1.000,
          vatAmount: 1.050,
          netAmount: 11.550,
        },
        detailsData: [
          {
            productId: 1,
            productName: 'DEMO',
            qty: 2,
            price: 10,
            discAmount: 10, // Item discount
            isPriceTaxExclusive: true,
            vatValue: 10,
            vatAmount: 1.050,
            netAmount: 11.550,
          }
        ],
        products: [
          { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        ],
        productCache: {
          5: { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        }
      };

      localStorage.setItem('priceView', 'Exclusive');
      const res = computeDisplayTotals(orderItemDiscountData as any, 'Exclusive');
      expect(res.subTotalStr).toBe('20.000');
      expect(res.discountStr).toBe('10.000');
      expect(res.chargesStr).toBe('0.500');
      expect(res.netValueStr).toBe('10.500');
      expect(res.vatStr).toBe('1.050');
      expect(res.grandTotalStr).toBe('11.550');
    });

    it('Three Displays Synchronization (Cart, Recall, Settled): Order 114/116 in Inclusive & Exclusive modes', () => {
      // DineIn order: 1 SNDNDKSDKKSLNASkLNS @ 127.050 inclusive (100.000 exclusive)
      // Discount: typed 27.050 inclusive (21.291 exclusive)
      // Service charge: 10% (7.871), Levy: 5% (4.329), VAT: 10% (9.091), NetAmount: 100.000
      const order114Data = {
        masterData: {
          orderNo: 114,
          ticketNo: 114,
          orderType: 'DineIn',
          orderTypeId: 1,
          customer: 'CASH CUSTOMER',
          waiter: 'emp1',
          sectionName: 'upper',
          tableNo: 'T2',
          orderDate: '2026-10-30T00:00:00',
          deliveryCharge: 0,
          discAmount: 0,
          serviceCharge: 7.870917,
          levy: 4.3290043,
          vatExclAmount: 90.9090909,
          vatAmount: 9.0909091,
          netAmount: 100,
        },
        detailsData: [
          {
            qty: 1,
            productId: 5,
            productName: 'sndndksdkkslnasklns',
            price: 127.05,
            amount: 127.05,
            discAmount: 27.0500000232,
            serviceCharge: 7.870917,
            levy: 4.3290043,
            vatAmount: 9.0909091,
            mapId: 1,
          }
        ],
        products: [
          { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        ],
        productCache: {
          5: { id: 5, name: 'sndndksdkkslnasklns', price: 100.000, isIncl: false }
        }
      };

      // ─── 1. INCLUSIVE PRICE VIEW ───
      localStorage.setItem('priceView', 'Inclusive');
      const inclTotals = computeDisplayTotals(order114Data as any, 'Inclusive');

      // Line display in Inclusive: Rate=127.050, Gross=127.050, Net=100.000
      expect(inclTotals.lineUnitPriceStr).toBe('127.050');
      expect(inclTotals.lineTotalStr).toBe('127.050');
      expect(inclTotals.lineNetStr).toBe('100.000');

      // Summary display in Inclusive: MUST NOT SHOW SubTotal 127.050! SubTotal MUST be 100.000!
      expect(inclTotals.subTotalStr).toBe('100.000');
      expect(inclTotals.discountStr).toBe('27.050');
      expect(inclTotals.chargesStr).toBe('12.200');
      expect(inclTotals.netValueStr).toBe('90.909');
      expect(inclTotals.vatStr).toBe('9.091');
      expect(inclTotals.grandTotalStr).toBe('100.000');

      // Visual arithmetic check in Inclusive: 100.000 - 21.291 + 12.200 = 90.909; 90.909 + 9.091 = 100.000
      expect(100.000 - 21.291 + 12.200).toBeCloseTo(90.909, 3);
      expect(90.909 + 9.091).toBeCloseTo(100.000, 3);

      // ─── 2. EXCLUSIVE PRICE VIEW ───
      // When queried with priceView=Exclusive (Order 111 in Swagger):
      // Backend returns price=100.000, discAmount=21.291
      const order111Data = {
        masterData: {
          ...order114Data.masterData,
          orderNo: 111,
          ticketNo: 111,
        },
        detailsData: [
          {
            qty: 1,
            productId: 5,
            productName: 'sndndksdkkslnasklns',
            price: 100,
            amount: 100,
            discAmount: 21.2908304,
            serviceCharge: 7.870917,
            levy: 4.3290043,
            vatAmount: 9.0909091,
            mapId: 1,
          }
        ],
        products: order114Data.products,
        productCache: order114Data.productCache,
      };

      localStorage.setItem('priceView', 'Exclusive');
      const exclTotals = computeDisplayTotals(order111Data as any, 'Exclusive');

      // Line display in Exclusive: Rate=100.000, Gross=100.000, Net=78.709
      expect(exclTotals.lineUnitPriceStr).toBe('100.000');
      expect(exclTotals.lineTotalStr).toBe('100.000');
      expect(exclTotals.lineNetStr).toBe('78.709');

      // Summary display in Exclusive:
      expect(exclTotals.subTotalStr).toBe('100.000');
      expect(exclTotals.discountStr).toBe('21.291');
      expect(exclTotals.chargesStr).toBe('12.200');
      expect(exclTotals.netValueStr).toBe('90.909');
      expect(exclTotals.vatStr).toBe('9.091');
      expect(exclTotals.grandTotalStr).toBe('100.000');

      // Visual arithmetic check in Exclusive: 100.000 - 21.291 + 12.200 = 90.909; 90.909 + 9.091 = 100.000
      expect(100.000 - 21.291 + 12.200).toBeCloseTo(90.909, 3);
      expect(90.909 + 9.091).toBeCloseTo(100.000, 3);
    });

    it('Settled Order #116 in Exclusive View (Swagger settled-data 116 with price=100 and discAmount=27.0500000232)', () => {
      // Swagger GET /api/v1/settled-orders/settled-data/116?serviceCharge=10&levy=5&priceView=Exclusive
      // Returns price: 100, discAmount: 27.0500000232 (raw inclusive discount returned by backend in exclusive view)
      const order116Data = {
        masterData: {
          orderNo: 116,
          ticketNo: 116,
          voucherNo: "49",
          orderType: "DineIn",
          counterName: "Counter1",
          sectionName: "upper",
          tableNo: "T2",
          orderDate: "0001-01-01T00:00:00",
          deliveryCharge: 0,
          discAmount: 0,
          discPer: 0,
          serviceCharge: 7.870917,
          levy: 4.3290043,
          vatExclAmount: 90.9090909,
          vatAmount: 9.0909091,
          netAmount: 100
        },
        detailsData: [
          {
            qty: 1,
            productId: 5,
            productName: "sndndksdkkslnasklns",
            arabicName: "",
            altName: "",
            altArabicName: "",
            price: 100,
            amount: 100,
            discAmount: 27.0500000232,
            serviceCharge: 7.870917,
            levy: 4.3290043,
            vatAmount: 9.0909091,
            mapId: 1
          }
        ],
        products: [
          { id: 5, name: "sndndksdkkslnasklns", price: 100.000, isIncl: false, vatValue: 10 }
        ],
        productCache: {
          5: { id: 5, name: "sndndksdkkslnasklns", price: 100.000, isIncl: false, vatValue: 10 }
        }
      };

      localStorage.setItem('priceView', 'Exclusive');
      const exclTotals = computeDisplayTotals(order116Data as any, 'Exclusive');

      // Line item display in Exclusive:
      // Price = 100.000, Gross = 100.000
      expect(exclTotals.lineUnitPriceStr).toBe('100.000');
      expect(exclTotals.lineTotalStr).toBe('100.000');
      // Discount = 21.291 (MUST NOT BE 27.050!)
      expect(exclTotals.lineDiscountStr).toBe('21.291');
      // Net Total = 78.709 (MUST NOT BE 72.950!)
      expect(exclTotals.lineNetStr).toBe('78.709');

      // Summary display in Exclusive:
      // Sub Total = 100.000
      expect(exclTotals.subTotalStr).toBe('100.000');
      // Discount = 21.291 (MUST NOT BE 27.050!)
      expect(exclTotals.discountStr).toBe('21.291');
      // Charges = 12.200 (MUST NOT BE 17.959!)
      expect(exclTotals.chargesStr).toBe('12.200');
      expect(exclTotals.serviceChargeStr).toBe('7.871');
      expect(exclTotals.levyStr).toBe('4.329');
      // Net Value = 90.909 (MUST NOT BE 85.150!)
      expect(exclTotals.netValueStr).toBe('90.909');
      // VAT = 9.091
      expect(exclTotals.vatStr).toBe('9.091');
      // Grand Total = 100.000
      expect(exclTotals.grandTotalStr).toBe('100.000');

      // Visual arithmetic reconciliation:
      // Sub Total (100.000) - Discount (21.291) + Charges (12.200) = Net Value (90.909)
      expect(100.000 - 21.291 + 12.200).toBeCloseTo(90.909, 3);
      // Net Value (90.909) + VAT (9.091) = Grand Total (100.000)
      expect(90.909 + 9.091).toBeCloseTo(100.000, 3);

      // Now test Inclusive View for Order 116 (Swagger returns price: 127.05 when priceView=Inclusive)
      const order116InclusiveData = {
        ...order116Data,
        detailsData: [
          {
            ...order116Data.detailsData[0],
            price: 127.05,
            amount: 127.05,
          }
        ]
      };
      localStorage.setItem('priceView', 'Inclusive');
      const inclTotals = computeDisplayTotals(order116InclusiveData as any, 'Inclusive');

      // In Inclusive view:
      // Price = 127.050, Gross = 127.050, Disc = 27.050, Net = 100.000
      expect(inclTotals.lineUnitPriceStr).toBe('127.050');
      expect(inclTotals.lineTotalStr).toBe('127.050');
      expect(inclTotals.lineDiscountStr).toBe('27.050');
      expect(inclTotals.lineNetStr).toBe('100.000');

      // Summary in Inclusive view:
      expect(inclTotals.subTotalStr).toBe('100.000');
      expect(inclTotals.discountStr).toBe('27.050');
      expect(inclTotals.chargesStr).toBe('12.200');
      expect(inclTotals.netValueStr).toBe('90.909');
      expect(inclTotals.vatStr).toBe('9.091');
      expect(inclTotals.grandTotalStr).toBe('100.000');
    });
  });
});
