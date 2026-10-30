import { describe, it, expect, beforeEach } from 'vitest';
import { calculateOrder, type BillingConfig } from '../features/pos/terminal/utils/billing';
import { buildUnifiedOrderPricing } from '../features/pos/utils/orderPricing';
import { generateGuestPrintHtml } from '../features/pos/utils/guestPrintTemplate';
import { generateBillMarkup } from '../features/pos/utils/escPosGenerator';

describe('Exclusive Price View & Internal Calculation (Exact Spreadsheet Verification)', () => {
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

  const dineInConfig: BillingConfig = {
    serviceChargeRate: 0.10,
    levyRate: 0.05,
    vatRate: 0.10,
    vatType: 'Exclusive',
    discountType: 'Exclusive',
    orderType: 'DineIn',
  };

  const spreadsheetItems = [
    {
      productId: 101,
      name: 'Item 1',
      price: 11,
      quantity: 4,
      isIncl: false,
      product: { id: 101, name: 'Item 1', price: 11, vatValue: 10, isIncl: false },
    },
    {
      productId: 102,
      name: 'Item 2',
      price: 15,
      quantity: 2,
      isIncl: false,
      product: { id: 102, name: 'Item 2', price: 15, vatValue: 10, isIncl: false },
    },
  ];

  it('matches exact internal calculation columns and totals from the spreadsheet', () => {
    const result = calculateOrder(spreadsheetItems, {
      config: dineInConfig,
      orderType: 'DineIn',
    });

    const [line1, line2] = result.lines;

    // Line 1: Qty 4, Excl Price 11
    // Excl amnt: 44, Service: 4.4, Levy: 2.42, Vat Excl: 50.82, Vat: 5.082, Net amnt: 55.902
    expect(line1.basePrice).toBe(11);
    expect(line1.amount).toBe(44);
    expect(line1.sc).toBe(4.4);
    expect(line1.levy).toBe(2.42);
    expect(line1.vatBase).toBe(50.82);
    expect(line1.vatAmount).toBe(5.082);
    expect(line1.lineNetAmount).toBe(55.902);
    expect(line1.lineTotal).toBe(44); // Price view exclusive table shows 44

    // Line 2: Qty 2, Excl Price 15
    // Excl amnt: 30, Service: 3, Levy: 1.65, Vat Excl: 34.65, Vat: 3.465, Net amnt: 38.115
    expect(line2.basePrice).toBe(15);
    expect(line2.amount).toBe(30);
    expect(line2.sc).toBe(3.0);
    expect(line2.levy).toBe(1.65);
    expect(line2.vatBase).toBe(34.65);
    expect(line2.vatAmount).toBe(3.465);
    expect(line2.lineNetAmount).toBe(38.115);
    expect(line2.lineTotal).toBe(30); // Price view exclusive table shows 30

    // Overall Summary:
    // Excl amnt / SubTotal: 74
    expect(result.summary.subTotalExclusive).toBe(74);
    expect(result.summary.subtotal).toBe(74);
    expect(result.summary.totalDiscount).toBe(0);

    // Service: 7.4
    expect(result.summary.serviceCharge).toBe(7.4);

    // Levy: 4.07
    expect(result.summary.levy).toBe(4.07);

    // Charges (Levy + Service): 11.47
    expect(result.summary.charges).toBe(11.47);

    // Vat Excl / Net Value (SubTotal - Discount + Charges): 85.47
    const netValue = result.summary.subtotal - result.summary.totalDiscount + result.summary.charges;
    expect(netValue).toBe(85.47);

    // Vat: 8.547
    expect(result.summary.vatAmount).toBe(8.547);

    // Net amnt / Grand Total: 94.017
    expect(result.summary.grandTotal).toBe(94.017);
  });

  it('matches buildUnifiedOrderPricing dual computation for exclusive orders', () => {
    const rawOrder = {
      masterData: {
        orderId: 1,
        orderNo: '101',
        ticketNo: '1',
        orderType: 'DineIn',
        serviceCharge: 7.4,
        levy: 4.07,
        vatAmount: 8.547,
        netAmount: 94.017,
      },
      detailsData: [
        {
          productId: 101,
          productName: 'Item 1',
          qty: 4,
          price: 11,
          isIncl: false,
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
          isIncl: false,
          vatAmount: 3.465,
          netAmount: 38.115,
          serviceCharge: 3.0,
          levy: 1.65,
        },
      ],
    };

    const unified = buildUnifiedOrderPricing(rawOrder, {
      orderType: 'DineIn',
      priceView: 'Exclusive',
      printPrice: 'Exclusive',
    });

    expect(unified.lines[0].exclusiveRate).toBe(11);
    expect(unified.lines[0].exclusiveGross).toBe(44);
    expect(unified.lines[0].exclusiveAmount).toBe(44);

    expect(unified.lines[1].exclusiveRate).toBe(15);
    expect(unified.lines[1].exclusiveGross).toBe(30);
    expect(unified.lines[1].exclusiveAmount).toBe(30);

    expect(unified.summary.subTotalExclusive).toBe(74);
    expect(unified.summary.serviceCharge).toBe(7.4);
    expect(unified.summary.levy).toBe(4.07);
    expect(unified.summary.taxableBase).toBe(85.47);
    expect(unified.summary.vatAmount).toBe(8.547);
    expect(unified.summary.grandTotal).toBe(94.017);
  });

  it('renders guest print HTML matching the spreadsheet values in Exclusive mode', async () => {
    const printData: any = {
      orderNo: '101',
      ticketNo: '1',
      waiter: 'Staff',
      counter: 'Main',
      section: 'Ground',
      table: 'T1',
      orderType: 'DineIn',
      subTotal: 74,
      serviceCharge: 7.4,
      levy: 4.07,
      vatAmount: 8.547,
      netAmount: 94.017,
      printPrice: 'Exclusive',
      priceView: 'Exclusive',
    };

    const html = await generateGuestPrintHtml(spreadsheetItems as any, printData);

    // Line rates and amounts
    expect(html).toContain('11.000');
    expect(html).toContain('44.000');
    expect(html).toContain('15.000');
    expect(html).toContain('30.000');

    // Totals table
    expect(html).toContain('Sub Total');
    expect(html).toContain('74.000');
    expect(html).toContain('Charges');
    expect(html).toContain('11.470');
    expect(html).toContain('Net Value');
    expect(html).toContain('85.470');
    expect(html).toContain('VAT Amount');
    expect(html).toContain('8.547');
    expect(html).toContain('Grand Total');
    expect(html).toContain('94.017');

    // VAT breakdown table: Excl Amt must be 85.470 (Net - VAT)
    expect(html).toContain('Excl Amt');
    expect(html).toContain('85.470');
  });

  it('generates ESC/POS thermal printer markup matching spreadsheet values in Exclusive mode', () => {
    const printData: any = {
      orderNo: '101',
      ticketNo: '1',
      waiter: 'Staff',
      counter: 'Main',
      section: 'Ground',
      table: 'T1',
      orderType: 'DineIn',
      subTotal: 74,
      serviceCharge: 7.4,
      levy: 4.07,
      vatAmount: 8.547,
      netAmount: 94.017,
      printPrice: 'Exclusive',
      priceView: 'Exclusive',
    };

    const markup = generateBillMarkup({
      cartDetails: spreadsheetItems as any,
      data: printData,
    });

    // Check item rows
    expect(markup).toContain('x4');
    expect(markup).toContain('44.000');
    expect(markup).toContain('x2');
    expect(markup).toContain('30.000');

    // Totals rows
    expect(markup).toContain('Sub Total');
    expect(markup).toContain('74.000');
    expect(markup).toContain('Charges');
    expect(markup).toContain('11.470');
    expect(markup).toContain('Net Value');
    expect(markup).toContain('85.470');
    expect(markup).toContain('VAT Amount');
    expect(markup).toContain('8.547');
    expect(markup).toContain('GRAND TOTAL');
    expect(markup).toContain('94.017');

    // VAT breakdown table: Excl Amt 85.470
    expect(markup).toContain('85.470');
  });

  it('correctly handles edge case: Item discount in Exclusive mode', () => {
    // 10 discount applied to Item 1
    const itemsWithDisc = [
      {
        productId: 101,
        name: 'Item 1',
        price: 11,
        quantity: 4,
        discountValue: 10,
        discountType: 'amount' as const,
        isIncl: false,
        product: { id: 101, name: 'Item 1', price: 11, vatValue: 10, isIncl: false },
      },
      {
        productId: 102,
        name: 'Item 2',
        price: 15,
        quantity: 2,
        isIncl: false,
        product: { id: 102, name: 'Item 2', price: 15, vatValue: 10, isIncl: false },
      },
    ];

    const result = calculateOrder(itemsWithDisc, {
      config: dineInConfig,
      orderType: 'DineIn',
    });

    const [l1, l2] = result.lines;
    // Item 1: 44 - 10 = 34 net value
    expect(l1.itemDiscountAmount).toBe(10);
    expect(l1.netValue).toBe(34);
    expect(l1.sc).toBe(3.4);
    expect(l1.levy).toBeCloseTo(1.87, 4); // (34 + 3.4) * 0.05 = 1.87
    expect(l1.vatBase).toBeCloseTo(39.27, 4); // 34 + 3.4 + 1.87 = 39.27
    expect(l1.vatAmount).toBeCloseTo(3.927, 4);
    expect(l1.lineNetAmount).toBe(43.197);

    // Item 2: unmodified
    expect(l2.netValue).toBe(30);
    expect(l2.sc).toBe(3.0);
    expect(l2.levy).toBe(1.65);
    expect(l2.vatBase).toBe(34.65);
    expect(l2.vatAmount).toBe(3.465);
    expect(l2.lineNetAmount).toBe(38.115);

    // Summary
    expect(result.summary.subTotalExclusive).toBe(74);
    expect(result.summary.totalDiscount).toBe(10);
    expect(result.summary.serviceCharge).toBe(6.4);
    expect(result.summary.levy).toBe(3.52);
    expect(result.summary.charges).toBe(9.92);

    // Net Value = 74 - 10 + 9.92 = 73.92
    const netVal = result.summary.subtotal - result.summary.totalDiscount + result.summary.charges;
    expect(netVal).toBe(73.92);

    expect(result.summary.vatAmount).toBe(7.392);
    expect(result.summary.grandTotal).toBe(81.312);
  });

  it('correctly handles edge case: Bill discount in Exclusive mode', () => {
    const result = calculateOrder(spreadsheetItems, {
      config: dineInConfig,
      orderType: 'DineIn',
      billDiscountValue: 10,
      billDiscountType: 'amount',
    });

    expect(result.summary.subTotalExclusive).toBe(74);
    expect(result.summary.totalDiscount).toBe(10);
    expect(result.summary.serviceCharge).toBe(6.4);
    expect(result.summary.levy).toBe(3.52);
    expect(result.summary.charges).toBe(9.92);

    const netVal = result.summary.subtotal - result.summary.totalDiscount + result.summary.charges;
    expect(netVal).toBe(73.92);

    expect(result.summary.vatAmount).toBe(7.392);
    expect(result.summary.grandTotal).toBe(81.312);
  });

  it('correctly handles edge case: TakeAway / Delivery (No Service Charge, Levy only)', () => {
    const takeOutConfig: BillingConfig = {
      ...dineInConfig,
      orderType: 'TakeOut',
      serviceChargeRate: 0,
    };

    const result = calculateOrder(spreadsheetItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [l1, l2] = result.lines;
    // Line 1: Excl 44, SC 0, Levy = 44 * 0.05 = 2.2, VatBase = 46.2, VAT = 4.62, Net = 50.82
    expect(l1.sc).toBe(0);
    expect(l1.levy).toBe(2.2);
    expect(l1.vatBase).toBe(46.2);
    expect(l1.vatAmount).toBe(4.62);
    expect(l1.lineNetAmount).toBe(50.82);

    // Line 2: Excl 30, SC 0, Levy = 30 * 0.05 = 1.5, VatBase = 31.5, VAT = 3.15, Net = 34.65
    expect(l2.sc).toBe(0);
    expect(l2.levy).toBe(1.5);
    expect(l2.vatBase).toBe(31.5);
    expect(l2.vatAmount).toBe(3.15);
    expect(l2.lineNetAmount).toBe(34.65);

    // Summary
    expect(result.summary.subTotalExclusive).toBe(74);
    expect(result.summary.serviceCharge).toBe(0);
    expect(result.summary.levy).toBe(3.7);
    expect(result.summary.charges).toBe(3.7);

    // Net Value = 74 + 3.7 = 77.7
    const netVal = result.summary.subtotal - result.summary.totalDiscount + result.summary.charges;
    expect(netVal).toBe(77.7);

    // VAT = 77.7 * 0.10 = 7.77
    expect(result.summary.vatAmount).toBe(7.77);
    // Grand Total = 77.7 + 7.77 = 85.47
    expect(result.summary.grandTotal).toBe(85.47);
  });

  it('correctly handles edge case: VAT disabled (0% tax)', () => {
    const noVatConfig: BillingConfig = {
      ...dineInConfig,
      vatRate: 0,
    };

    const zeroTaxItems = spreadsheetItems.map(item => ({
      ...item,
      product: { ...item.product, vatValue: 0 },
    }));

    const result = calculateOrder(zeroTaxItems, {
      config: noVatConfig,
      orderType: 'DineIn',
    });

    expect(result.summary.subTotalExclusive).toBe(74);
    expect(result.summary.serviceCharge).toBe(7.4);
    expect(result.summary.levy).toBe(4.07);
    expect(result.summary.charges).toBe(11.47);
    expect(result.summary.vatAmount).toBe(0);
    expect(result.summary.grandTotal).toBe(85.47); // Subtotal + charges, 0 VAT
  });

  it('correctly handles edge case: Delivery charge added to Grand Total', () => {
    const deliveryConfig: BillingConfig = {
      ...dineInConfig,
      orderType: 'Delivery',
      serviceChargeRate: 0,
    };

    const result = calculateOrder(spreadsheetItems, {
      config: deliveryConfig,
      orderType: 'Delivery',
      orderTypeId: 4,
      customDeliveryCharge: 1.5,
    });

    expect(result.summary.deliveryCharge).toBe(1.5);
    // Without delivery: 85.47, With delivery: 85.47 + 1.5 = 86.97
    expect(result.summary.grandTotal).toBe(86.97);
  });

  it('correctly handles edge case: fractional quantities (e.g. 1.5 and 2.25)', () => {
    const fractionalItems = [
      {
        productId: 101,
        name: 'Item 1',
        price: 11,
        quantity: 1.5,
        isIncl: false,
        product: { id: 101, name: 'Item 1', price: 11, vatValue: 10, isIncl: false },
      },
      {
        productId: 102,
        name: 'Item 2',
        price: 15,
        quantity: 2.25,
        isIncl: false,
        product: { id: 102, name: 'Item 2', price: 15, vatValue: 10, isIncl: false },
      },
    ];

    const result = calculateOrder(fractionalItems, {
      config: dineInConfig,
      orderType: 'DineIn',
    });

    // Item 1: 1.5 * 11 = 16.5
    // SC: 16.5 * 0.10 = 1.65
    // Levy: (16.5 + 1.65) * 0.05 = 18.15 * 0.05 = 0.9075
    // VatBase: 16.5 + 1.65 + 0.9075 = 19.0575
    // VAT: 1.90575
    // Net: 20.96325

    // Item 2: 2.25 * 15 = 33.75
    // SC: 33.75 * 0.10 = 3.375
    // Levy: (33.75 + 3.375) * 0.05 = 37.125 * 0.05 = 1.85625
    // VatBase: 33.75 + 3.375 + 1.85625 = 38.98125
    // VAT: 3.898125
    // Net: 42.879375

    expect(result.summary.subTotalExclusive).toBe(50.25);
    expect(result.summary.serviceCharge).toBe(5.025);
    expect(result.summary.levy).toBe(2.76375);
    expect(result.summary.charges).toBe(7.78875);
    expect(result.summary.vatAmount).toBe(5.803875);
    expect(result.summary.grandTotal).toBe(63.842625);
  });
});
