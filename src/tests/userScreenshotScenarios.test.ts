import { describe, it, expect, beforeEach } from 'vitest';
import { calculateOrder, type BillingConfig } from '../features/pos/terminal/utils/billing';
import { buildUnifiedOrderPricing } from '../features/pos/utils/orderPricing';
import { buildDirectSettleOrderPayload, buildNewOrderPayload } from '../features/pos/terminal/mappers/orderPayloadMapper';
import { mapOrderDetailsToCartItems } from '../features/pos/terminal/mappers/orderDetailToCartMapper';
import { generateGuestPrintHtml } from '../features/pos/utils/guestPrintTemplate';
import { generateBillMarkup } from '../features/pos/utils/escPosGenerator';
import { fallbackOrderTypeByName } from '../features/pos/terminal/store/posSlice';
import { checkOrderHasBillDiscount } from '../features/pos/terminal/utils/orderDiscountCheck';
import { roundCalc } from '../features/pos/terminal/utils/billing';

describe('User Screenshot Exact Scenarios (Screenshot 4510 & Screenshot 4507)', () => {
  const P = 3;

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('decimalPart', '3');
    localStorage.setItem('currencySymbol', 'BHD');
    localStorage.setItem('priceView', 'Inclusive');
    localStorage.setItem('printPrice', 'Inclusive');
    localStorage.setItem('discCalc', 'Inclusive');
    localStorage.setItem('vatStatus', 'true');
    localStorage.setItem('posConfigs', JSON.stringify({
      configs: {
        vat: 10,
        serviceCharges: 10,
        levy: 5,
        priceView: 'Inclusive',
        printPrice: 'Inclusive',
        discountCalc: 'Inclusive',
        vatStatus: true,
      }
    }));
  });

  const dineInConfig: BillingConfig = {
    serviceChargeRate: 0.10, // 10% Service Charge
    levyRate: 0.05,          // 5% Levy (on Base + SC)
    vatRate: 0.10,           // 10% VAT (on Base + SC + Levy)
    vatType: 'Inclusive',
    discountType: 'Inclusive',
    orderType: 'DineIn',
  };

  it('Scenario 1 (Screenshot 4510): Bill Discount of 27.050 on SNDNDKSDKKSLNASKLNS @ 127.050 in Dine-In', () => {
    // 1 item in cart @ 127.050 inclusive price (Base 100 * 1.05 * 1.10 * 1.10 = 127.050)
    const cartItems = [
      {
        uniqueId: 'item-sndnd-1',
        productId: 99,
        name: 'SNDNDKSDKKSLNASKLNS',
        price: 127.050,
        quantity: 1,
        isIncl: true,
        product: { id: 99, name: 'SNDNDKSDKKSLNASKLNS', price: 127.050, vatValue: 10, isIncl: true },
      },
    ];

    // Cashier types flat bill discount: 27.050
    const result = calculateOrder(cartItems, {
      config: dineInConfig,
      orderType: 'DineIn',
      orderTypeId: 1,
      billDiscountValue: 27.050,
      billDiscountType: 'amount',
    });

    const [line] = result.lines;

    // ── Cart Row Display (matches Screenshot 4510 table) ──
    expect(line.quantity).toBe(1);
    expect(line.price).toBeCloseTo(127.050, P);
    // Bill discount does not appear on individual item row
    expect(line.itemDiscount).toBe(0);
    // Line total remains before discount on bill discount
    expect(line.lineTotal).toBeCloseTo(127.050, P);

    // ── Summary Panel Display (matches Screenshot 4510 bottom right exactly) ──
    expect(result.summary.subtotal).toBeCloseTo(100.000, P);
    expect(result.summary.totalDiscount).toBeCloseTo(21.291, P);
    expect(result.summary.charges).toBeCloseTo(12.200, P);
    expect(result.summary.serviceCharge).toBeCloseTo(7.871, P);
    expect(result.summary.levy).toBeCloseTo(4.329, P);
    expect(result.summary.netValue).toBeCloseTo(90.909, P);
    expect(result.summary.vatExclAmount).toBeCloseTo(90.909, P);
    expect(result.summary.vatAmount).toBeCloseTo(9.091, P);
    expect(result.summary.grandTotal).toBeCloseTo(100.000, P);

    // ── Mathematical Identity Checks ──
    // Sub Total - Discount + Charges = Net Value
    expect(result.summary.subtotal - result.summary.totalDiscount + result.summary.charges).toBeCloseTo(90.909, P);
    // Net Value + VAT = Grand Total
    expect(result.summary.netValue + result.summary.vatAmount).toBeCloseTo(100.000, P);
  });

  it('Scenario 2 (Screenshot 4507): Item Discount of 27.050 on SNDNDKSDKKSLNASKLNS @ 127.050 in Dine-In', () => {
    // 1 item in cart @ 127.050 inclusive price with 27.050 typed item discount
    const cartItems = [
      {
        uniqueId: 'item-sndnd-2',
        productId: 99,
        name: 'SNDNDKSDKKSLNASKLNS',
        price: 127.050,
        quantity: 1,
        isIncl: true,
        discountValue: 27.050,
        discountType: 'amount' as const,
        product: { id: 99, name: 'SNDNDKSDKKSLNASKLNS', price: 127.050, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: dineInConfig,
      orderType: 'DineIn',
      orderTypeId: 1,
    });

    const [line] = result.lines;

    // ── Cart Row Display (matches Screenshot 4507 table) ──
    expect(line.quantity).toBe(1);
    expect(line.price).toBeCloseTo(127.050, P);
    // Item discount displays the typed inclusive discount (27.050) directly under the line
    expect(line.itemDiscount).toBeCloseTo(27.050, P);
    // Line total after discount: 127.050 - 27.050 = 100.000
    expect(line.lineTotal).toBeCloseTo(100.000, P);

    // ── Summary Panel Display (matches Screenshot 4507 bottom right exactly) ──
    expect(result.summary.subtotal).toBeCloseTo(100.000, P);
    expect(result.summary.totalDiscount).toBeCloseTo(21.291, P);
    expect(result.summary.charges).toBeCloseTo(12.200, P);
    expect(result.summary.serviceCharge).toBeCloseTo(7.871, P);
    expect(result.summary.levy).toBeCloseTo(4.329, P);
    expect(result.summary.netValue).toBeCloseTo(90.909, P);
    expect(result.summary.vatExclAmount).toBeCloseTo(90.909, P);
    expect(result.summary.vatAmount).toBeCloseTo(9.091, P);
    expect(result.summary.grandTotal).toBeCloseTo(100.000, P);

    // ── Mathematical Identity Checks ──
    // Sub Total - Discount + Charges = Net Value
    expect(result.summary.subtotal - result.summary.totalDiscount + result.summary.charges).toBeCloseTo(90.909, P);
    // Net Value + VAT = Grand Total
    expect(result.summary.netValue + result.summary.vatAmount).toBeCloseTo(100.000, P);
  });

  it('Scenario 3 (Zero Discount Base Case): 1 SNDNDKSDKKSLNASKLNS @ 127.050 without discount in Dine-In', () => {
    const cartItems = [
      {
        uniqueId: 'item-sndnd-3',
        productId: 99,
        name: 'SNDNDKSDKKSLNASKLNS',
        price: 127.050,
        quantity: 1,
        isIncl: true,
        product: { id: 99, name: 'SNDNDKSDKKSLNASKLNS', price: 127.050, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: dineInConfig,
      orderType: 'DineIn',
      orderTypeId: 1,
    });

    const [line] = result.lines;
    expect(line.price).toBeCloseTo(127.050, P);
    expect(line.lineTotal).toBeCloseTo(127.050, P);

    // ── Summary Panel ──
    expect(result.summary.subtotal).toBeCloseTo(100.000, P);
    expect(result.summary.totalDiscount).toBe(0);
    expect(result.summary.charges).toBeCloseTo(15.500, P);
    expect(result.summary.serviceCharge).toBeCloseTo(10.000, P);
    expect(result.summary.levy).toBeCloseTo(5.500, P);
    expect(result.summary.netValue).toBeCloseTo(115.500, P);
    expect(result.summary.vatExclAmount).toBeCloseTo(115.500, P);
    expect(result.summary.vatAmount).toBeCloseTo(11.550, P);
    expect(result.summary.grandTotal).toBeCloseTo(127.050, P);

    // Sub Total + Charges = Net Value
    expect(result.summary.subtotal + result.summary.charges).toBeCloseTo(115.500, P);
    // Net Value + VAT = Grand Total
    expect(result.summary.netValue + result.summary.vatAmount).toBeCloseTo(127.050, P);
  });

  it('Scenario 4 (Backend Payload): Passes strictly exclusive base values to database for Screenshot 4507', () => {
    const cartItems = [
      {
        uniqueId: 'item-sndnd-4',
        productId: 99,
        name: 'SNDNDKSDKKSLNASKLNS',
        price: 127.050,
        quantity: 1,
        isIncl: true,
        discountValue: 27.050,
        discountType: 'amount' as const,
        product: { id: 99, name: 'SNDNDKSDKKSLNASKLNS', price: 127.050, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: dineInConfig,
      orderType: 'DineIn',
      orderTypeId: 1,
    });

    const context: any = {
      cartDetails: result.lines,
      subtotal: result.summary.subtotal,
      discount: result.summary.totalDiscount,
      tax: result.summary.vatAmount,
      charges: result.summary.charges,
      totalServiceCharge: result.summary.serviceCharge,
      totalLevy: result.summary.levy,
      total: result.summary.grandTotal,
      deliveryCharge: 0,
      selectedOrderTypeName: 'DineIn',
      selectedOrderTypeId: 1,
      selectedCustomerId: 1,
      selectedTender: '1',
      selectedTableId: 2,
      selectedTableNo: 'T2',
      selectedSectionId: 1,
      guestNo: 1,
      waiterId: 1,
      waiterName: 'Admin',
      billDiscountValue: 0,
      billDiscountType: 'amount',
    };

    const session: any = {
      tenantId: 'default',
      branchId: 1,
      userId: 'admin',
      posCounterId: 1,
      posCounterName: 'Main',
      transDate: '2026-10-30T00:00:00.000Z',
    };

    const payload = buildDirectSettleOrderPayload(context, session);

    // Backend detail row is saved with exclusive price (100.000) and exclusive discount (21.291)
    expect(payload.details[0].price).toBeCloseTo(100.000, P);
    expect(payload.details[0].discAmount).toBeCloseTo(21.291, P);
    expect(payload.details[0].serviceCharge).toBeCloseTo(7.871, P);
    expect(payload.details[0].levy).toBeCloseTo(4.329, P);
    expect(payload.details[0].vatAmount).toBeCloseTo(9.091, P);
    expect(payload.details[0].netAmount).toBeCloseTo(100.000, P);

    // Master payload carries authoritative exclusive numbers (detail discAmount is at detail level)
    expect(payload.serviceCharge).toBeCloseTo(7.871, P);
    expect(payload.levy).toBeCloseTo(4.329, P);
    expect(payload.vatExclAmount).toBeCloseTo(90.909, P);
    expect(payload.vatAmount).toBeCloseTo(9.091, P);
    expect(payload.netAmount).toBeCloseTo(100.000, P);
  });

  it('Scenario 5 (Backend Payload): Passes strictly exclusive base values to database for Bill Discount (Screenshot 4510)', () => {
    const cartItems = [
      {
        uniqueId: 'item-sndnd-5',
        productId: 99,
        name: 'SNDNDKSDKKSLNASKLNS',
        price: 127.050,
        quantity: 1,
        isIncl: true,
        product: { id: 99, name: 'SNDNDKSDKKSLNASKLNS', price: 127.050, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: dineInConfig,
      orderType: 'DineIn',
      orderTypeId: 1,
      billDiscountValue: 27.050,
      billDiscountType: 'amount',
    });

    const context: any = {
      cartDetails: result.lines,
      subtotal: result.summary.subtotal,
      discount: result.summary.totalDiscount,
      tax: result.summary.vatAmount,
      charges: result.summary.charges,
      totalServiceCharge: result.summary.serviceCharge,
      totalLevy: result.summary.levy,
      total: result.summary.grandTotal,
      deliveryCharge: 0,
      selectedOrderTypeName: 'DineIn',
      selectedOrderTypeId: 1,
      selectedCustomerId: 1,
      selectedTender: '1',
      selectedTableId: 2,
      selectedTableNo: 'T2',
      selectedSectionId: 1,
      guestNo: 1,
      waiterId: 1,
      waiterName: 'Admin',
      billDiscountValue: 27.050,
      billDiscountType: 'amount',
    };

    const session: any = {
      tenantId: 'default',
      branchId: 1,
      userId: 'admin',
      posCounterId: 1,
      posCounterName: 'Main',
      transDate: '2026-10-30T00:00:00.000Z',
    };

    const payload = buildDirectSettleOrderPayload(context, session);

    // Detail row carries base price 100.000 and allocated exclusive bill discount (21.291)
    expect(payload.details[0].price).toBeCloseTo(100.000, P);
    expect(payload.details[0].discAmount).toBeCloseTo(21.291, P);

    // Master payload carries the exclusive converted bill discount (21.291)
    expect(payload.discAmount).toBeCloseTo(21.291, P);
    expect(payload.serviceCharge).toBeCloseTo(7.871, P);
    expect(payload.levy).toBeCloseTo(4.329, P);
    expect(payload.vatExclAmount).toBeCloseTo(90.909, P);
    expect(payload.vatAmount).toBeCloseTo(9.091, P);
    expect(payload.netAmount).toBeCloseTo(100.000, P);
  });

  it('Scenario 6 (User Screenshot 1): Zero discount on SNDNDKSDKKSLNASKLNS @ 127.050 typed inclusively in Dine-In', () => {
    // In Image 1, cashier types 127.050 inclusively. Grand total MUST be 127.050.
    const cartItems = [
      {
        uniqueId: 'item-sndnd-zero',
        productId: 99,
        name: 'SNDNDKSDKKSLNASKLNS',
        price: 127.050,
        quantity: 1,
        isIncl: true,
        product: { id: 99, name: 'SNDNDKSDKKSLNASKLNS', price: 127.050, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: dineInConfig,
      orderType: 'DineIn',
      orderTypeId: 1,
    });

    const [line] = result.lines;

    // Line displays inclusive price and line total
    expect(line.price).toBeCloseTo(127.050, P);
    expect(line.lineTotal).toBeCloseTo(127.050, P);

    // Summary displays:
    // Sub Total: 100.000
    // Charges: 15.500 (SC 10% = 10.000, Levy 5% on 110 = 5.500)
    // Net Value: 115.500 (Sub Total 100.000 + Charges 15.500 = 115.500)
    // VAT: 11.550 (115.500 * 10% = 11.550)
    // Grand Total: 127.050 (Net Value 115.500 + VAT 11.550 = 127.050)
    expect(result.summary.subtotal).toBeCloseTo(100.000, P);
    expect(result.summary.charges).toBeCloseTo(15.500, P);
    expect(result.summary.serviceCharge).toBeCloseTo(10.000, P);
    expect(result.summary.levy).toBeCloseTo(5.500, P);
    expect(result.summary.netValue).toBeCloseTo(115.500, P);
    expect(result.summary.vatExclAmount).toBeCloseTo(115.500, P);
    expect(result.summary.vatAmount).toBeCloseTo(11.550, P);
    expect(result.summary.grandTotal).toBeCloseTo(127.050, P);

    // Visual row consistency checks
    expect(result.summary.subtotal + result.summary.charges).toBeCloseTo(115.500, P);
    expect(result.summary.netValue + result.summary.vatAmount).toBeCloseTo(127.050, P);
  });

  it('Scenario 7 (Swagger Order #111): Exact Swagger response for Bill Discount (Recall & Unified Pricing)', () => {
    // Swagger GET /api/v1/order/recall/order_data/111?serviceCharge=10&levy=5&priceView=Inclusive
    const swaggerInclusiveOrder = {
      masterData: {
        orderNo: 111,
        ticketNo: 111,
        orderType: "DineIn",
        customer: "CASH CUSTOMER",
        deliveryCharge: 0,
        discAmount: 21.2908304,
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
          price: 127.05,
          amount: 127.05,
          discAmount: 0,
          serviceCharge: 7.870917,
          levy: 4.3290043,
          vatAmount: 9.0909091,
          mapId: 1
        }
      ],
      modifiersData: null
    };

    const unifiedIncl = buildUnifiedOrderPricing(swaggerInclusiveOrder, {
      orderType: "DineIn",
      priceView: "Inclusive",
      isBillDiscount: true
    });

    expect(unifiedIncl.summary.subTotalExclusive).toBeCloseTo(100.000, P);
    expect(unifiedIncl.summary.totalDiscountExcl).toBeCloseTo(21.291, P);
    expect(unifiedIncl.summary.charges).toBeCloseTo(12.200, P);
    expect(unifiedIncl.summary.vatAmount).toBeCloseTo(9.091, P);
    expect(unifiedIncl.summary.grandTotal).toBeCloseTo(100.000, P);

    // Line displays inclusive price 127.050, no line discount for bill discount
    expect(unifiedIncl.lines[0].getRate(true)).toBeCloseTo(127.050, P);
    expect(unifiedIncl.lines[0].getAmount(true)).toBeCloseTo(127.050, P);

    // Swagger GET /api/v1/order/recall/order_data/111?serviceCharge=10&levy=5&priceView=Exclusive
    const swaggerExclusiveOrder = {
      masterData: {
        orderNo: 111,
        ticketNo: 111,
        orderType: "DineIn",
        customer: "CASH CUSTOMER",
        deliveryCharge: 0,
        discAmount: 21.2908304,
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
          price: 100,
          amount: 100,
          discAmount: 0,
          serviceCharge: 7.870917,
          levy: 4.3290043,
          vatAmount: 9.0909091,
          mapId: 1
        }
      ],
      modifiersData: null
    };

    const unifiedExcl = buildUnifiedOrderPricing(swaggerExclusiveOrder, {
      orderType: "DineIn",
      priceView: "Exclusive",
      isBillDiscount: true
    });

    expect(unifiedExcl.summary.subTotalExclusive).toBeCloseTo(100.000, P);
    expect(unifiedExcl.summary.totalDiscountExcl).toBeCloseTo(21.291, P);
    expect(unifiedExcl.summary.charges).toBeCloseTo(12.200, P);
    expect(unifiedExcl.summary.vatAmount).toBeCloseTo(9.091, P);
    expect(unifiedExcl.summary.grandTotal).toBeCloseTo(100.000, P);
    expect(unifiedExcl.lines[0].getRate(false)).toBeCloseTo(100.000, P);
  });

  it('Scenario 8 (Swagger Order #110): Exact Swagger response for Item Discount (Recall & Unified Pricing)', () => {
    // Swagger GET /api/v1/order/recall/order_data/110?serviceCharge=10&levy=5&priceView=Inclusive
    const swaggerInclusiveOrder = {
      masterData: {
        orderNo: 110,
        ticketNo: 110,
        orderType: "DineIn",
        customer: "CASH CUSTOMER",
        deliveryCharge: 0,
        discAmount: 0,
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
          price: 127.05,
          amount: 127.05,
          discAmount: 27.0500000232,
          serviceCharge: 7.870917,
          levy: 4.3290043,
          vatAmount: 9.0909091,
          mapId: 1
        }
      ],
      modifiersData: null
    };

    const unifiedIncl = buildUnifiedOrderPricing(swaggerInclusiveOrder, {
      orderType: "DineIn",
      priceView: "Inclusive",
      isBillDiscount: false
    });

    expect(unifiedIncl.summary.subTotalExclusive).toBeCloseTo(100.000, P);
    expect(unifiedIncl.summary.totalDiscountExcl).toBeCloseTo(21.291, P);
    expect(unifiedIncl.summary.charges).toBeCloseTo(12.200, P);
    expect(unifiedIncl.summary.vatAmount).toBeCloseTo(9.091, P);
    expect(unifiedIncl.summary.grandTotal).toBeCloseTo(100.000, P);

    // Line displays inclusive rate 127.050, inclusive discount 27.050, line amount 100.000
    expect(unifiedIncl.lines[0].getRate(true)).toBeCloseTo(127.050, P);
    expect(unifiedIncl.lines[0].getDiscount(true)).toBeCloseTo(27.050, P);
    expect(unifiedIncl.lines[0].getAmount(true)).toBeCloseTo(100.000, P);
  });

  it('Scenario 9 (Swagger Order #114 & Image 2): Exact Recall Modal Display even when product master isIncl is false', () => {
    // Swagger GET /api/v1/order/recall/order_data/114?serviceCharge=10&levy=5&priceView=Inclusive
    const swaggerOrder114 = {
      masterData: {
        orderNo: 114,
        ticketNo: 114,
        orderType: "DineIn",
        customer: "CASH CUSTOMER",
        waiter: "emp1",
        sectionName: "upper",
        tableNo: "T2",
        orderDate: "2026-10-30T00:00:00",
        deliveryCharge: 0,
        discAmount: 0,
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
          price: 127.05,
          amount: 127.05,
          discAmount: 27.0500000232,
          serviceCharge: 7.870917,
          levy: 4.3290043,
          vatAmount: 9.0909091,
          mapId: 1
        }
      ],
      modifiersData: null
    };

    // Product 5 in catalog has isIncl: false (user said: "also consider product master incl or not")
    const mockProducts = [
      { id: 5, name: "sndndksdkkslnasklns", price: 100.000, isIncl: false }
    ];
    const mockProductCache: Record<number, any> = {
      5: { id: 5, name: "sndndksdkkslnasklns", price: 100.000, isIncl: false }
    };

    const unified = buildUnifiedOrderPricing(swaggerOrder114, {
      orderType: "DineIn",
      priceView: "Inclusive",
      isBillDiscount: false,
      products: mockProducts,
      productCache: mockProductCache
    });

    // Subtotal MUST be 100.000 (NOT 78.709!)
    expect(unified.summary.subTotalExclusive).toBeCloseTo(100.000, P);
    // Discount MUST be 21.291 (NOT 16.758!)
    expect(unified.summary.totalDiscountExcl).toBeCloseTo(21.291, P);
    // Total inclusive discount on line MUST be 27.050
    expect(unified.summary.totalDiscountIncl).toBeCloseTo(27.050, P);
    // Charges MUST be 12.200 (SC 7.871 + Levy 4.329, NOT 28.958!)
    expect(unified.summary.charges).toBeCloseTo(12.200, P);
    expect(unified.summary.serviceCharge).toBeCloseTo(7.871, P);
    expect(unified.summary.levy).toBeCloseTo(4.329, P);
    // Net Value MUST be 90.909
    expect(unified.summary.vatExclAmount).toBeCloseTo(90.909, P);
    // VAT MUST be 9.091
    expect(unified.summary.vatAmount).toBeCloseTo(9.091, P);
    // Grand Total MUST be 100.000
    expect(unified.summary.grandTotal).toBeCloseTo(100.000, P);

    // Line display:
    // When priceView is Inclusive:
    // Price = 127.050 (NOT 100.000!)
    expect(unified.lines[0].getRate(true)).toBeCloseTo(127.050, P);
    // Item Disc = 27.050 (NOT 21.291!)
    expect(unified.lines[0].getDiscount(true)).toBeCloseTo(27.050, P);
    // Line Total after item discount = 100.000 (NOT 78.709!)
    expect(unified.lines[0].getAmount(true)).toBeCloseTo(100.000, P);

    // Visual arithmetic holds:
    // Sub Total (100.000) - Discount (21.291) + Charges (12.200) = Net Value (90.909)
    expect(
      unified.summary.subTotalExclusive - (unified.summary.totalDiscountExcl || 0) + (unified.summary.charges || 0)
    ).toBeCloseTo(unified.summary.vatExclAmount || 0, P);
    // Net Value (90.909) + VAT (9.091) = Grand Total (100.000)
    expect(
      (unified.summary.vatExclAmount || 0) + unified.summary.vatAmount
    ).toBeCloseTo(unified.summary.grandTotal, P);
  });

  it('Scenario 10 (Swagger Order #120): Exact TakeOut Recall with serviceCharge=0 for VAT-inclusive product (abcd @ 3.000)', () => {
    // Swagger GET /api/v1/order/recall/order_data/120?serviceCharge=0&levy=5&priceView=Inclusive
    const swaggerOrder120 = {
      masterData: {
        orderNo: 120,
        ticketNo: 120,
        orderType: "TakeOut",
        customer: "CASH CUSTOMER",
        waiter: "emp1",
        sectionName: "",
        tableNo: "",
        orderDate: "2026-10-30T00:00:00",
        deliveryCharge: 0,
        discAmount: 0,
        serviceCharge: 0,
        levy: 0.1298701,
        vatExclAmount: 2.7272727000000003,
        vatAmount: 0.2727273,
        netAmount: 3
      },
      detailsData: [
        {
          qty: 1,
          productId: 1,
          productName: "abcd",
          arabicName: "",
          altName: "",
          altArabicName: "",
          price: 3.000000003,
          amount: 3.000000003,
          discAmount: 0,
          serviceCharge: 0,
          levy: 0.1298701,
          vatAmount: 0.2727273,
          mapId: 1
        }
      ],
      modifiersData: null
    };

    const mockProducts = [
      { id: 1, name: "abcd", price: 3.000, isIncl: true, vatValue: 10 }
    ];
    const mockProductCache: Record<number, any> = {
      1: { id: 1, name: "abcd", price: 3.000, isIncl: true, vatValue: 10 }
    };

    const unified = buildUnifiedOrderPricing(swaggerOrder120, {
      orderType: "TakeOut",
      priceView: "Inclusive",
      isBillDiscount: false,
      products: mockProducts,
      productCache: mockProductCache
    });

    // Subtotal Exclusive must be 2.597 (3.000 / 1.155)
    expect(unified.summary.subTotalExclusive).toBeCloseTo(2.597, 3);
    // Charges must be 0.130 (5% Levy on 2.597)
    expect(unified.summary.charges).toBeCloseTo(0.130, 3);
    expect(unified.summary.serviceCharge).toBe(0);
    expect(unified.summary.levy).toBeCloseTo(0.130, 3);
    // Net Value (Taxable Base) must be 2.727
    expect(unified.summary.vatExclAmount).toBeCloseTo(2.727, 3);
    // VAT (10%) must be 0.273
    expect(unified.summary.vatAmount).toBeCloseTo(0.273, 3);
    // Grand Total must strictly be 3.000
    expect(unified.summary.grandTotal).toBeCloseTo(3.000, 3);

    // Line display in Inclusive view:
    // Price = strictly 3.000 (NOT 3.300!)
    expect(unified.lines[0].getRate(true)).toBeCloseTo(3.000, 3);
    // Amount = strictly 3.000 (NOT 3.300!)
    expect(unified.lines[0].getAmount(true)).toBeCloseTo(3.000, 3);
  });

  it('Scenario 11: Order 116 in Settled screen when Exclusive (Swagger settled-data 116)', () => {
    localStorage.setItem('priceView', 'Exclusive');
    const order116 = {
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
      modifiersData: null
    };

    const mockProducts = [
      { id: 5, name: "sndndksdkkslnasklns", price: 100.000, isIncl: false, vatValue: 10 }
    ];
    const mockProductCache: Record<number, any> = {
      5: { id: 5, name: "sndndksdkkslnasklns", price: 100.000, isIncl: false, vatValue: 10 }
    };

    const unified = buildUnifiedOrderPricing(order116, {
      orderType: "DineIn",
      priceView: "Exclusive",
      isBillDiscount: false,
      products: mockProducts,
      productCache: mockProductCache
    });

    // Exclusive View Assertions
    // Line item must display exclusive price 100.000, exclusive discount 21.291, net amount 78.709
    expect(unified.lines[0].exclusiveGross).toBeCloseTo(100.000, P);
    expect(unified.lines[0].getRate(false)).toBeCloseTo(100.000, P);
    expect(unified.lines[0].getDiscount(false)).toBeCloseTo(21.291, P);
    expect(unified.lines[0].getAmount(false)).toBeCloseTo(78.709, P);

    // Summary must display:
    // Sub Total = 100.000
    // Discount = 21.291 (NOT 27.050!)
    // Charges = 12.200 (NOT 17.959!)
    // Net Value = 90.909 (NOT 85.150!)
    // VAT = 9.091
    // Grand Total = 100.000
    expect(unified.summary.subTotalExclusive).toBeCloseTo(100.000, P);
    expect(unified.summary.totalDiscountExcl).toBeCloseTo(21.291, P);
    expect(unified.summary.charges).toBeCloseTo(12.200, P);
    expect(unified.summary.serviceCharge).toBeCloseTo(7.871, P);
    expect(unified.summary.levy).toBeCloseTo(4.329, P);
    expect(unified.summary.vatExclAmount).toBeCloseTo(90.909, P);
    expect(unified.summary.vatAmount).toBeCloseTo(9.091, P);
    expect(unified.summary.grandTotal).toBeCloseTo(100.000, P);

    // Visual arithmetic holds:
    // Sub Total (100.000) - Discount (21.291) + Charges (12.200) = Net Value (90.909)
    expect(
      unified.summary.subTotalExclusive - (unified.summary.totalDiscountExcl || 0) + (unified.summary.charges || 0)
    ).toBeCloseTo(unified.summary.vatExclAmount || 0, P);
    // Net Value (90.909) + VAT (9.091) = Grand Total (100.000)
    expect(
      (unified.summary.vatExclAmount || 0) + unified.summary.vatAmount
    ).toBeCloseTo(unified.summary.grandTotal, P);
  });

  it('Scenario 12: Order 116 in Settled screen when Inclusive (Swagger settled-data 116 with priceView=Inclusive)', () => {
    localStorage.setItem('priceView', 'Inclusive');
    // When queried with priceView=Inclusive, Swagger returns price: 127.05 and amount: 127.05
    const order116Inclusive = {
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
          price: 127.05,
          amount: 127.05,
          discAmount: 27.0500000232,
          serviceCharge: 7.870917,
          levy: 4.3290043,
          vatAmount: 9.0909091,
          mapId: 1
        }
      ],
      modifiersData: null
    };

    const mockProducts = [
      { id: 5, name: "sndndksdkkslnasklns", price: 100.000, isIncl: false, vatValue: 10 }
    ];
    const mockProductCache: Record<number, any> = {
      5: { id: 5, name: "sndndksdkkslnasklns", price: 100.000, isIncl: false, vatValue: 10 }
    };

    const unified = buildUnifiedOrderPricing(order116Inclusive, {
      orderType: "DineIn",
      priceView: "Inclusive",
      isBillDiscount: false,
      products: mockProducts,
      productCache: mockProductCache
    });

    // In Inclusive view:
    // Line Rate = 127.050, Disc = 27.050, Net Line = 100.000
    expect(unified.lines[0].getRate(true)).toBeCloseTo(127.050, P);
    expect(unified.lines[0].getDiscount(true)).toBeCloseTo(27.050, P);
    expect(unified.lines[0].getAmount(true)).toBeCloseTo(100.000, P);

    // Summary in Inclusive view:
    // Sub Total = 100.000 (tax-exclusive base when charges exist)
    expect(unified.summary.subTotalExclusive).toBeCloseTo(100.000, P);
    // Discount = 21.291 (excl) / 27.050 (incl)
    expect(unified.summary.totalDiscountExcl).toBeCloseTo(21.291, P);
    expect(unified.summary.totalDiscountIncl).toBeCloseTo(27.050, P);
    // Charges = 12.200 (SC 7.871 + Levy 4.329)
    expect(unified.summary.charges).toBeCloseTo(12.200, P);
    expect(unified.summary.serviceCharge).toBeCloseTo(7.871, P);
    expect(unified.summary.levy).toBeCloseTo(4.329, P);
    // Net Value = 90.909
    expect(unified.summary.vatExclAmount).toBeCloseTo(90.909, P);
    // VAT = 9.091
    expect(unified.summary.vatAmount).toBeCloseTo(9.091, P);
    // Grand Total = 100.000
    expect(unified.summary.grandTotal).toBeCloseTo(100.000, P);

    // Visual arithmetic holds:
    expect(
      unified.summary.subTotalExclusive - (unified.summary.totalDiscountExcl || 0) + (unified.summary.charges || 0)
    ).toBeCloseTo(unified.summary.vatExclAmount || 0, P);
    expect(
      (unified.summary.vatExclAmount || 0) + unified.summary.vatAmount
    ).toBeCloseTo(unified.summary.grandTotal, P);
  });

  it('Scenario 13: Exact PosSettledDetailsModal logic for Order 116 in Exclusive View (no 17.959 charges, no 27.050 discount)', () => {
    localStorage.setItem('priceView', 'Exclusive');
    const order116 = {
      masterData: {
        orderNo: 116,
        ticketNo: 116,
        voucherNo: "49",
        orderType: "DineIn",
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
          price: 100,
          amount: 100,
          discAmount: 27.0500000232,
          serviceCharge: 7.870917,
          levy: 4.3290043,
          vatAmount: 9.0909091,
          mapId: 1
        }
      ]
    };

    const effectivePriceView: 'Exclusive' | 'Inclusive' = 'Exclusive';
    const isTaxInclusive = (effectivePriceView as string) === 'Inclusive';
    const unified = buildUnifiedOrderPricing(order116, {
      orderType: 'DineIn',
      priceView: effectivePriceView,
      isBillDiscount: false,
    });

    const master = order116.masterData;
    const backendDiscount = Number((master as any).discAmount ?? 0);
    const displayDiscount = Number(
      unified
        ? (isTaxInclusive
            ? (unified.summary.totalDiscountIncl ?? (typeof unified.summary.getTotalDiscount === 'function' ? unified.summary.getTotalDiscount(true) : backendDiscount))
            : (unified.summary.totalDiscountExcl ?? (typeof unified.summary.getTotalDiscount === 'function' ? unified.summary.getTotalDiscount(false) : backendDiscount)))
        : (backendDiscount > 0 ? backendDiscount : 0)
    );

    const displayServiceCharge = Number(master.serviceCharge ?? (unified ? unified.summary.serviceCharge : 0));
    const displayLevy = Number(master.levy ?? (unified ? unified.summary.levy : 0));
    const rawModalCharges = Number(displayServiceCharge || 0) + Number(displayLevy || 0);
    const grossSubTotalFromLines = unified
      ? ((isTaxInclusive && rawModalCharges <= 0) ? unified.summary.subTotalInclusive : unified.summary.subTotalExclusive)
      : 0;
    const displaySubTotal = grossSubTotalFromLines;
    const displayVatAmount = Number(master.vatAmount ?? unified.summary.vatAmount);
    const displayGrandTotal = Number(master.netAmount ?? unified.summary.grandTotal);

    let displayCharges = (unified?.summary?.charges && unified.summary.charges > 0)
      ? unified.summary.charges
      : Math.round((displayServiceCharge + displayLevy) * 1000) / 1000;
    if (displayGrandTotal > 0) {
      const netBase = Math.max(0, displaySubTotal - displayDiscount);
      const residual = Math.round((displayGrandTotal - netBase - displayVatAmount) * 1000) / 1000;
      if (residual > 0.001) {
        if (displayCharges <= 0 || Math.abs(displayCharges - residual) > 0.05) {
          displayCharges = residual;
        }
      }
    }
    const displayNetValue = Math.round(((unified?.summary?.vatExclAmount && unified.summary.vatExclAmount > 0)
      ? unified.summary.vatExclAmount
      : Math.max(0, displayGrandTotal - displayVatAmount)) * 1000) / 1000;

    // Strict assertions matching the user requirement:
    expect(displaySubTotal).toBeCloseTo(100.000, 3);
    expect(displayDiscount).toBeCloseTo(21.291, 3);
    expect(displayCharges).toBeCloseTo(12.200, 3); // NOT 17.959!
    expect(displayNetValue).toBeCloseTo(90.909, 3); // NOT 85.150!
    expect(displayVatAmount).toBeCloseTo(9.091, 3);
    expect(displayGrandTotal).toBeCloseTo(100.000, 3);
  });

  it('Scenario 14: Cross-check Order #120 between order_data and order-print-data (both yield identical 3.000 totals)', () => {
    // 1. Raw order_data from /api/v1/order/recall/order_data/120
    const recallOrderData = {
      masterData: {
        orderNo: 120,
        ticketNo: 120,
        orderType: "TakeOut",
        customer: "CASH CUSTOMER",
        deliveryCharge: 0,
        discAmount: 0,
        serviceCharge: 0,
        levy: 0.1298701,
        vatExclAmount: 2.7272727,
        vatAmount: 0.2727273,
        netAmount: 3
      },
      detailsData: [
        {
          qty: 1,
          productId: 1,
          productName: "abcd",
          price: 3.000000003,
          amount: 3.000000003,
          discAmount: 0,
          serviceCharge: 0,
          levy: 0.1298701,
          vatAmount: 0.2727273,
          mapId: 1
        }
      ]
    };

    // 2. Raw order-print-data from /api/v1/order/recall/order-print-data/120 (Inclusive)
    const printOrderDataIncl = {
      masterData: {
        orderNo: 120,
        ticketNo: 120,
        orderType: "TakeOut",
        counterName: "Counter1",
        waiter: "emp1",
        customerName: "CASH CUSTOMER",
        subTotal: 2.5974026,
        discount: 0,
        levy: 0.1298701,
        serviceCharge: 0,
        vatAmount: 0.2727273,
        deliveryCharge: 0,
        netAmount: 3
      },
      detailsData: [
        {
          qty: 1,
          productId: 1,
          productName: "abcd",
          price: 3.000000003,
          amount: 3.000000003,
          discAmount: 0,
          serviceCharge: 0,
          levy: 0.1298701,
          vatAmount: 0.2727273,
          mapId: 1
        }
      ],
      vatSummary: [
        {
          vatCode: "10%",
          exclAmount: 2.7272727,
          vatAmount: 0.2727273,
          netAmount: 3
        }
      ]
    };

    // 3. Raw order-print-data from /api/v1/order/recall/order-print-data/120 (Exclusive)
    const printOrderDataExcl = {
      masterData: {
        ...printOrderDataIncl.masterData,
      },
      detailsData: [
        {
          ...printOrderDataIncl.detailsData[0],
          price: 2.5974026,
          amount: 2.5974026,
        }
      ]
    };

    const mockProducts = [
      { id: 1, name: "abcd", price: 3.000, isIncl: true, vatValue: 10 }
    ];
    const mockProductCache: Record<number, any> = {
      1: { id: 1, name: "abcd", price: 3.000, isIncl: true, vatValue: 10 }
    };

    // Compute pricing for both
    const unifiedRecall = buildUnifiedOrderPricing(recallOrderData, {
      orderType: "TakeOut",
      priceView: "Inclusive",
      products: mockProducts,
      productCache: mockProductCache,
    });

    const unifiedPrintIncl = buildUnifiedOrderPricing(printOrderDataIncl, {
      orderType: "TakeOut",
      priceView: "Inclusive",
      products: mockProducts,
      productCache: mockProductCache,
    });

    const unifiedPrintExcl = buildUnifiedOrderPricing(printOrderDataExcl, {
      orderType: "TakeOut",
      priceView: "Exclusive",
      products: mockProducts,
      productCache: mockProductCache,
    });

    // Cross-check: recall data and print data have IDENTICAL mathematical results!
    expect(unifiedRecall.summary.subTotalExclusive).toBeCloseTo(unifiedPrintIncl.summary.subTotalExclusive, 3);
    expect(unifiedRecall.summary.charges || 0).toBeCloseTo(unifiedPrintIncl.summary.charges || 0, 3);
    expect(unifiedRecall.summary.vatExclAmount || 0).toBeCloseTo(unifiedPrintIncl.summary.vatExclAmount || 0, 3);
    expect(unifiedRecall.summary.vatAmount).toBeCloseTo(unifiedPrintIncl.summary.vatAmount, 3);
    expect(unifiedRecall.summary.grandTotal).toBeCloseTo(unifiedPrintIncl.summary.grandTotal, 3);

    // Exact numbers:
    expect(unifiedPrintIncl.summary.subTotalExclusive).toBeCloseTo(2.597, 3);
    expect(unifiedPrintIncl.summary.charges || 0).toBeCloseTo(0.130, 3);
    expect(unifiedPrintIncl.summary.vatExclAmount || 0).toBeCloseTo(2.727, 3);
    expect(unifiedPrintIncl.summary.vatAmount).toBeCloseTo(0.273, 3);
    expect(unifiedPrintIncl.summary.grandTotal).toBeCloseTo(3.000, 3);

    // In Exclusive view, unit price matches 2.597 and grand total is 3.000
    expect(unifiedPrintExcl.lines[0].getRate(false)).toBeCloseTo(2.597, 3);
    expect(unifiedPrintExcl.summary.grandTotal).toBeCloseTo(3.000, 3);
  });

  it('Scenario 15: User Screenshot Order 125 — Recall vs Edit into Cart does NOT inflate price to 12.705 or total to 25.410', () => {
    localStorage.setItem('priceView', 'Inclusive');
    localStorage.setItem('printPrice', 'Inclusive');
    localStorage.setItem('discCalc', 'Inclusive');
    localStorage.setItem('posConfigs', JSON.stringify({
      configs: {
        vat: 10,
        serviceCharges: 10,
        levy: 5,
        priceView: 'Inclusive',
        printPrice: 'Inclusive',
        vatType: 'Inclusive',
      }
    }));

    const mockDemoProduct = {
      id: 6,
      name: 'DEMO',
      price: 10.000,
      isIncl: false,
      vatValue: 10,
    };
    const mockProducts = [mockDemoProduct];
    const mockProductCache = { 6: mockDemoProduct };

    // Order 125 data from recall API (TakeOut, 2 DEMO, SC 0, Levy 5%, VAT 10%)
    const order125BackendData = {
      masterData: {
        orderNo: 125,
        ticketNo: 125,
        orderType: 'TakeOut',
        customer: 'CASH CUSTOMER',
        waiter: 'emp1',
        orderDate: '2026-10-30T00:00:00',
        deliveryCharge: 0,
        discAmount: 0,
        serviceCharge: 0,
        levy: 1.000,
        vatExclAmount: 21.000,
        vatAmount: 2.100,
        netAmount: 23.100,
      },
      detailsData: [
        {
          productId: 6,
          productName: 'Demo',
          orderQty: 2,
          price: 11.550, // returned by backend in priceView=Inclusive
          amount: 23.100,
          discAmount: 0,
          vatAmount: 2.100,
          vatExclAmount: 20.000,
          serviceCharge: 0,
          levy: 1.000,
          mapId: 1,
        }
      ]
    };

    // 1. Verify Recall Display matches Image 1
    const unifiedRecall = buildUnifiedOrderPricing(order125BackendData, {
      orderType: 'TakeOut',
      priceView: 'Inclusive',
      products: mockProducts,
      productCache: mockProductCache,
    });

    expect(unifiedRecall.lines[0].getRate(true)).toBeCloseTo(11.550, 3);
    expect(unifiedRecall.lines[0].getAmount(true)).toBeCloseTo(23.100, 3);
    expect(unifiedRecall.summary.subTotalExclusive).toBeCloseTo(20.000, 3);
    expect(unifiedRecall.summary.charges || 0).toBeCloseTo(1.000, 3);
    expect(unifiedRecall.summary.vatExclAmount || 0).toBeCloseTo(21.000, 3);
    expect(unifiedRecall.summary.vatAmount).toBeCloseTo(2.100, 3);
    expect(unifiedRecall.summary.grandTotal).toBeCloseTo(23.100, 3);

    // 2. Map into Cart Items via mapOrderDetailsToCartItems (EDIT action)
    const cartItems = mapOrderDetailsToCartItems(
      order125BackendData.detailsData,
      [],
      {
        products: mockProducts,
        productCache: mockProductCache,
        priceView: 'Inclusive',
        orderType: 'TakeOut',
      }
    );

    // Cart item must be restored cleanly matching catalog base (10.000 with isIncl: false)
    expect(cartItems[0].price).toBeCloseTo(10.000, 3);
    expect(cartItems[0].isIncl).toBe(false);

    // 3. Now run central calculateOrder on the restored cart in TakeOut
    const cartCalc = calculateOrder(cartItems, {
      orderType: 'TakeOut',
      orderTypeId: 2,
      productCache: mockProductCache,
    });

    // Effective unit rate displayed in cart MUST be 11.550 (NOT 12.705!)
    expect(cartCalc.lines[0].price).toBeCloseTo(11.550, 3);
    expect(cartCalc.lines[0].lineTotal).toBeCloseTo(23.100, 3);

    // Totals in cart MUST remain 20.000, 1.000, 21.000, 2.100, 23.100 (NOT 25.410!)
    expect(cartCalc.summary.subtotal).toBeCloseTo(20.000, 3);
    expect(cartCalc.summary.charges).toBeCloseTo(1.000, 3);
    expect(cartCalc.summary.netValue).toBeCloseTo(21.000, 3);
    expect(cartCalc.summary.vatAmount).toBeCloseTo(2.100, 3);
    expect(cartCalc.summary.grandTotal).toBeCloseTo(23.100, 3);
  });

  it('Scenario 16 (Swagger Order #127 & User Screenshot): Direct Settle & Print with 10.000 Inclusive Discount on 3 DEMO', () => {
    // Exact Product Master: DEMO @ 10.000 base with isIncl: false
    const mockDemoProduct = {
      id: 6,
      name: 'Demo',
      price: 10.000,
      isIncl: false,
      vatValue: 10,
    };
    const mockProducts = [mockDemoProduct];
    const mockProductCache = { 6: mockDemoProduct };

    // 1. Terminal Cart State (as seen in user screenshot):
    // 3 DEMO @ 11.550 gross (10.000 base + 5% levy + 10% VAT)
    // Inclusive discount: -10.000 typed on line
    // Gross: 34.650, Line Net: 24.650
    // Subtotal: 30.000, Exclusive Disc: 8.658, Charges: 1.067, Net Value: 22.409, VAT: 2.241, Grand Total: 24.650
    const initialCart = [
      {
        uniqueId: 'item-demo-1',
        productId: 6,
        quantity: 3,
        price: 10.000,
        basePrice: 10.000,
        isIncl: false,
        discountType: 'amount' as const,
        discountValue: 10.000,
        product: mockDemoProduct,
      }
    ];

    const initialCalc = calculateOrder(initialCart, {
      orderType: 'TakeOut',
      orderTypeId: 2,
      productCache: mockProductCache,
    });

    expect(initialCalc.lines[0].price).toBeCloseTo(11.550, 3);
    expect(initialCalc.lines[0].originalLineTotal).toBeCloseTo(34.650, 3);
    expect(initialCalc.lines[0].itemDiscount).toBeCloseTo(10.000, 3);
    expect(initialCalc.lines[0].lineTotal).toBeCloseTo(24.650, 3);
    expect(initialCalc.summary.subtotal).toBeCloseTo(30.000, 3);
    expect(initialCalc.summary.totalDiscount).toBeCloseTo(8.658, 3);
    expect(initialCalc.summary.charges).toBeCloseTo(1.067, 3);
    expect(initialCalc.summary.netValue).toBeCloseTo(22.409, 3);
    expect(initialCalc.summary.vatAmount).toBeCloseTo(2.241, 3);
    expect(initialCalc.summary.grandTotal).toBeCloseTo(24.650, 3);

    // 2. Exact Swagger response for GET /api/v1/settled-orders/settled-data/127?serviceCharge=10&levy=5&priceView=Inclusive
    // The OLD fetch sent serviceCharge=10 for this TakeOut order, so the backend returned price 12.705 / disc 11.000.
    // The new fetch always requests stored (Exclusive) values and converts with the order's OWN rates
    // (services/storedOrderView.ts), so the Inclusive view below is what the POS now receives.
    const swaggerSettledOrder127 = {
      masterData: {
        orderNo: 127,
        ticketNo: 127,
        voucherNo: "51",
        orderType: "TakeOut",
        counterName: "Counter1",
        sectionName: "",
        tableNo: "",
        orderDate: "0001-01-01T00:00:00",
        deliveryCharge: 0,
        discAmount: 0,
        discPer: 0,
        serviceCharge: 0,
        levy: 1.0670996,
        vatExclAmount: 22.4090909,
        vatAmount: 2.2409091,
        netAmount: 24.65
      },
      detailsData: [
        {
          qty: 3,
          productId: 6,
          productName: "Demo",
          arabicName: "",
          altName: "",
          altArabicName: "",
          price: 11.55,
          amount: 34.65,
          discAmount: 10.00000005,
          serviceCharge: 0,
          levy: 1.0670996,
          vatAmount: 2.2409091,
          mapId: 1
        }
      ],
      modifiersData: null
    };

    // 3. Unified Pricing Reconciles Swagger response:
    // Discards phantom 10% service charge on TakeOut order and restores the true POS terminal numbers
    const unified = buildUnifiedOrderPricing(swaggerSettledOrder127, {
      orderType: 'TakeOut',
      priceView: 'Inclusive',
      products: mockProducts,
      productCache: mockProductCache,
    });

    expect(unified.lines[0].getRate(true)).toBeCloseTo(11.550, 3); // NOT 12.705!
    expect(unified.lines[0].inclusiveGross).toBeCloseTo(34.650, 3); // NOT 38.115!
    expect(unified.lines[0].getDiscount(true)).toBeCloseTo(10.000, 3); // NOT 11.000!
    expect(unified.lines[0].inclusiveAmount).toBeCloseTo(24.650, 3);
    expect(unified.summary.subTotalExclusive).toBeCloseTo(30.000, 3);
    expect(unified.summary.totalDiscountExcl).toBeCloseTo(8.658, 3);
    expect(unified.summary.charges || 0).toBeCloseTo(1.067, 3);
    expect(unified.summary.netValue || 0).toBeCloseTo(22.409, 3);
    expect(unified.summary.vatAmount).toBeCloseTo(2.241, 3);
    expect(unified.summary.grandTotal).toBeCloseTo(24.650, 3);

    // 4. Cart Mapping (Edit Action from Settled Order):
    const restoredCart = mapOrderDetailsToCartItems(
      swaggerSettledOrder127.detailsData,
      [],
      {
        products: mockProducts,
        productCache: mockProductCache,
        priceView: 'Inclusive',
        orderType: 'TakeOut',
      }
    );

    expect(restoredCart[0].price).toBeCloseTo(10.000, 3);
    expect(restoredCart[0].isIncl).toBe(false);
    expect(restoredCart[0].discountValue).toBeCloseTo(10.000, 3);

    const restoredCalc = calculateOrder(restoredCart, {
      orderType: 'TakeOut',
      orderTypeId: 2,
      productCache: mockProductCache,
    });

    expect(restoredCalc.lines[0].price).toBeCloseTo(11.550, 3);
    expect(restoredCalc.lines[0].lineTotal).toBeCloseTo(24.650, 3);
    expect(restoredCalc.summary.grandTotal).toBeCloseTo(24.650, 3);
  });

  it('Scenario 17: Order #124 & #129 Recall Guest Print & Thermal Print - Sub Total matching recall screen & Item discount displayed on item and footer', async () => {
    // 1. Order #124 from Swagger:
    // Backend order-print-data returned discounted masterData.subTotal: 78.7091696 and masterData.discount: 0
    // detailsData has price: 100, discAmount: 27.0503023
    const orderPrintData124 = {
      masterData: {
        orderNo: 124,
        ticketNo: 124,
        orderType: "DineIn",
        counterName: "Counter1",
        waiter: "emp1",
        sectionName: "upper",
        tableNo: "T2",
        orderDate: "2026-10-30T00:00:00",
        customerName: "CASH CUSTOMER",
        subTotal: 78.7091696, // Backend discounted subtotal - MUST NOT be used for print!
        discount: 0,
        levy: 4.3290043,
        serviceCharge: 7.870917,
        vatAmount: 9.0909091,
        deliveryCharge: 0,
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
          discAmount: 27.0503023,
          discPer: 0,
          vatAmount: 9.0909091,
          vatExclAmount: 90.9090909,
          serviceCharge: 7.870917,
          levy: 4.3290043,
          netAmount: 100
        }
      ]
    };

    // When printing, we ignore backend order-print-data's discounted subTotal:
    const cleanPrintOrder124 = {
      ...orderPrintData124,
      masterData: { ...orderPrintData124.masterData }
    };
    delete (cleanPrintOrder124.masterData as any).subTotal;

    const unified124 = buildUnifiedOrderPricing(cleanPrintOrder124, {
      orderType: "DineIn",
      printPrice: "Inclusive",
      products: [{ id: 5, name: "sndndksdkkslnasklns", price: 100.000, isIncl: false }],
      productCache: { 5: { id: 5, name: "sndndksdkkslnasklns", price: 100.000, isIncl: false } }
    });

    // Check line calculations
    expect(unified124.lines[0].getDiscount(true)).toBeCloseTo(27.050, 3);
    expect(unified124.summary.subTotalExclusive).toBeCloseTo(100.000, 3);

    const printData124 = {
      orderNo: "124",
      ticketNo: "124",
      orderType: "DineIn",
      customerName: "CASH CUSTOMER",
      waiter: "emp1",
      counter: "Counter1",
      subTotal: 100.000, // Matching recall screen display
      discount: 27.050,
      serviceCharge: 7.871,
      levy: 4.329,
      vatAmount: 9.091,
      netAmount: 100.000,
      enableVat: true,
      printPrice: "Inclusive"
    };

    const guestHtml124 = await generateGuestPrintHtml(unified124 as any, printData124);
    // Item discount MUST be displayed on the item line:
    expect(guestHtml124).toContain("Disc : 27.050");
    // Footer MUST display Sub Total 100.000 (NOT 78.709!)
    expect(guestHtml124).toContain("100.000");
    expect(guestHtml124).not.toContain("78.709");
    // Footer MUST display Discount (exclusive -21.291 when charges are present so Sub Total 100 - 21.291 + 12.200 = 90.909 Net Value):
    expect(guestHtml124).toContain("-21.291");
    // Grand Total MUST be 100.000
    expect(guestHtml124).toContain("100.000");

    const thermalMarkup124 = generateBillMarkup({ cartDetails: unified124 as any, data: printData124 as any });
    expect(thermalMarkup124).toContain("Disc : 27.050");
    expect(thermalMarkup124).toContain("-21.291");
    expect(thermalMarkup124).not.toContain("78.709");

    // 2. Order #129 (Screenshot 6 with DEMO x 3):
    const order129 = {
      masterData: {
        orderNo: 129,
        ticketNo: 129,
        orderType: "TakeOut",
        customerName: "CASH CUSTOMER",
        waiter: "emp1",
        orderDate: "2026-10-30T00:00:00",
        subTotal: 30.000,
        discount: 0,
        levy: 1.067,
        serviceCharge: 0,
        vatAmount: 2.241,
        netAmount: 24.650
      },
      detailsData: [
        {
          qty: 3,
          productId: 6,
          productName: "Demo",
          price: 10,
          isIncl: false,
          discAmount: 10.000,
          netAmount: 24.650,
          vatAmount: 2.241,
          levy: 1.067
        }
      ]
    };

    const unified129 = buildUnifiedOrderPricing(order129, {
      orderType: "TakeOut",
      printPrice: "Inclusive",
      products: [{ id: 6, name: "Demo", price: 10.000, isIncl: false }],
      productCache: { 6: { id: 6, name: "Demo", price: 10.000, isIncl: false } }
    });

    const printData129 = {
      orderNo: "129",
      ticketNo: "129",
      orderType: "TakeOut",
      customerName: "CASH CUSTOMER",
      waiter: "emp1",
      counter: "Counter1",
      subTotal: 30.000,
      discount: 8.658,
      charges: 1.067,
      netValue: 22.409,
      vatAmount: 2.241,
      netAmount: 24.650,
      enableVat: true,
      printPrice: "Inclusive"
    };

    const guestHtml129 = await generateGuestPrintHtml(unified129 as any, printData129);
    // Item discount MUST be displayed on the item line (10.000 inclusive discount):
    expect(guestHtml129).toContain("Disc : 10.000");
    // Footer MUST display Sub Total 30.000:
    expect(guestHtml129).toContain("30.000");
    // Footer MUST display Discount -8.658 (8. something, matching recall screen):
    expect(guestHtml129).toContain("-8.658");
    // Charges MUST be 1.067 (matching backend levy 1.067, NOT distorted to 2.409!):
    expect(guestHtml129).toContain(">1.067<");
    expect(guestHtml129).not.toContain(">2.409<");
    // Net Value MUST be 22.409:
    expect(guestHtml129).toContain(">22.409<");
    // VAT Amount MUST be 2.241:
    expect(guestHtml129).toContain(">2.241<");
    // Grand Total MUST be 24.650:
    expect(guestHtml129).toContain(">24.650<");

    const thermalMarkup129 = generateBillMarkup({ cartDetails: unified129 as any, data: printData129 as any });
    expect(thermalMarkup129).toContain("Disc : 10.000");
    expect(thermalMarkup129).toContain("-8.658");
    expect(thermalMarkup129).toContain("1.067");
    expect(thermalMarkup129).not.toContain(" 2.409");

    // 3. Order #129 in Exclusive Price View and Exclusive Print View:
    const unified129Excl = buildUnifiedOrderPricing(order129, {
      orderType: "TakeOut",
      priceView: "Exclusive",
      printPrice: "Exclusive",
      products: [{ id: 6, name: "Demo", price: 10.000, isIncl: false }],
      productCache: { 6: { id: 6, name: "Demo", price: 10.000, isIncl: false } }
    });

    const printData129Excl = {
      ...printData129,
      priceView: "Exclusive",
      printPrice: "Exclusive"
    };
    localStorage.setItem('priceView', 'Exclusive');
    localStorage.setItem('printPrice', 'Exclusive');

    const guestHtml129Excl = await generateGuestPrintHtml(unified129Excl as any, printData129Excl);
    expect(guestHtml129Excl).toContain("Disc : 8.658");
    expect(guestHtml129Excl).toContain(">30.000<");
    expect(guestHtml129Excl).toContain("-8.658");
    expect(guestHtml129Excl).toContain(">1.067<");
    expect(guestHtml129Excl).not.toContain(">2.409<");
    expect(guestHtml129Excl).toContain(">22.409<");
    expect(guestHtml129Excl).toContain(">2.241<");
    expect(guestHtml129Excl).toContain(">24.650<");

    const thermalMarkup129Excl = generateBillMarkup({ cartDetails: unified129Excl as any, data: printData129Excl as any });
    expect(thermalMarkup129Excl).toContain("Disc : 8.658");
    expect(thermalMarkup129Excl).toContain("1.067");
    expect(thermalMarkup129Excl).not.toContain(" 2.409");

    localStorage.setItem('priceView', 'Inclusive');
    localStorage.setItem('printPrice', 'Inclusive');
  });

  it('Scenario 5: Unification of Recall Print and Recall Details Guest Print (Order #129)', async () => {
    // Both prints must produce identical numbers:
    // Sub Total: 30.000, Discount: -8.658, Charges: 1.067, Net Value: 22.409, VAT: 2.241, Grand Total: 24.650
    const order129 = {
      masterData: {
        orderNo: 129,
        ticketNo: 129,
        orderType: "TakeOut",
        customerName: "CASH CUSTOMER",
        waiter: "emp1",
        subTotal: 21.3419913,
        discount: 0,
        levy: 1.0670996,
        serviceCharge: 0,
        vatAmount: 2.2409091,
        netAmount: 24.65
      },
      detailsData: [
        {
          qty: 3,
          productId: 6,
          productName: "Demo",
          price: 11.55,
          amount: 34.65,
          discAmount: 10.0000000485,
          serviceCharge: 0,
          levy: 1.0670996,
          vatAmount: 2.2409091,
          mapId: 1
        }
      ]
    };

    const unifiedPricing = buildUnifiedOrderPricing(order129, {
      orderType: "TakeOut",
      printPrice: "Inclusive",
      products: [{ id: 6, name: "Demo", price: 10.000, isIncl: false }],
      productCache: { 6: { id: 6, name: "Demo", price: 10.000, isIncl: false } }
    });

    const printData = {
      orderNo: "129",
      ticketNo: "129",
      orderType: "TakeOut",
      customerName: "CASH CUSTOMER",
      waiter: "emp1",
      counter: "Main",
      subTotal: 30.000,
      discount: 8.658,
      charges: 1.067,
      netValue: 22.409,
      vatAmount: 2.241,
      netAmount: 24.650,
      enableVat: true,
      printPrice: "Inclusive"
    };

    // Shared print HTML generator check
    const htmlReceipt = await generateGuestPrintHtml(unifiedPricing as any, printData);
    expect(htmlReceipt).toContain("Disc : 10.000");
    expect(htmlReceipt).toContain("30.000");
    expect(htmlReceipt).toContain("-8.658");
    expect(htmlReceipt).toContain(">1.067<");
    expect(htmlReceipt).not.toContain(">2.409<");
    expect(htmlReceipt).toContain(">22.409<");
    expect(htmlReceipt).toContain(">2.241<");
    expect(htmlReceipt).toContain(">24.650<");

    // Thermal markup check
    const thermalReceipt = generateBillMarkup({ cartDetails: unifiedPricing as any, data: printData as any });
    expect(thermalReceipt).toContain("Disc : 10.000");
    expect(thermalReceipt).toContain("-8.658");
    expect(thermalReceipt).toContain("1.067");
    expect(thermalReceipt).not.toContain(" 2.409");
  });

  it('Scenario 6: Order #125 Editing preserves TakeOut order type and does NOT mutate 11.550 into 12.705', () => {
    // Order #125 as recalled from backend or fallback list
    const order125 = {
      masterData: {
        orderNo: 125,
        ticketNo: 125,
        // Backend might omit orderType or orderTypeId in recall response:
        orderType: undefined,
        orderTypeId: undefined,
        customerName: "CASH CUSTOMER",
        waiter: "emp1",
        subTotal: 20.000,
        discount: 0,
        levy: 1.000,
        serviceCharge: 0,
        vatAmount: 2.100,
        netAmount: 23.100
      },
      detailsData: [
        {
          qty: 2,
          productId: 6,
          productName: "Demo",
          price: 11.55,
          amount: 23.10,
          discAmount: 0,
          serviceCharge: 0,
          levy: 1.000,
          vatAmount: 2.100,
          mapId: 1
        }
      ]
    };

    const orderDetailsStr = "Order : 125 Ticket : 125 01:50:58 PM (TakeOut) (CASH CUSTOMER) (emp1) Amnt : 23.100";

    // 1. Order type resolution must NOT fall back to DineIn:
    const rawTypeCandidate =
      (order125.masterData as any).orderType ||
      (order125.masterData as any).orderTypeName ||
      (orderDetailsStr.match(/\((DineIn|TakeOut|DriveThru|Delivery|Providers|Coming)\)/i)?.[1]) ||
      "TakeOut";
    const resolvedOrderTypeObj = fallbackOrderTypeByName(rawTypeCandidate);
    expect(resolvedOrderTypeObj.orderType).toBe("TakeOut");
    expect(resolvedOrderTypeObj.orderTypeId).toBe(2);

    // 2. Map order details to cart items with resolved orderType:
    const mappedCartItems = mapOrderDetailsToCartItems(order125.detailsData, [], {
      products: [{ id: 6, name: "Demo", price: 10.000, isIncl: false }],
      productCache: { 6: { id: 6, name: "Demo", price: 10.000, isIncl: false } },
      priceView: "Inclusive",
      orderType: resolvedOrderTypeObj.orderType
    });

    expect(mappedCartItems).toHaveLength(1);
    const cartItem = mappedCartItems[0];
    // Since product catalog item is tax-exclusive (isIncl: false), cartItem base price is 10.000:
    expect(cartItem.price).toBeCloseTo(10.000, P);
    expect(cartItem.isIncl).toBe(false);

    // 3. Cart calculation in TakeOut must compute 23.100 (DEMO @ 11.550 * 2 = 23.100)
    const cartCalc = calculateOrder(mappedCartItems, {
      orderType: resolvedOrderTypeObj.orderType,
      orderTypeId: resolvedOrderTypeObj.orderTypeId,
      productCache: { 6: { id: 6, name: "Demo", price: 10.000, isIncl: false } }
    });

    const [line] = cartCalc.lines;
    expect(line.quantity).toBe(2);
    // Line unit rate must be 11.550:
    expect(line.price).toBeCloseTo(11.550, P);
    // Line total must be 23.100 (NOT 25.410):
    expect(line.lineNetAmount).toBeCloseTo(23.100, P);

    // Summary checks:
    expect(cartCalc.summary.subtotal).toBeCloseTo(20.000, P);
    // Charges must be 1.000 (NOT 1.100):
    expect(cartCalc.summary.charges).toBeCloseTo(1.000, P);
    expect(cartCalc.summary.serviceCharge).toBeCloseTo(0.000, P);
    expect(cartCalc.summary.levy).toBeCloseTo(1.000, P);
    // Net Value must be 21.000 (NOT 23.100):
    expect(cartCalc.summary.vatExclAmount).toBeCloseTo(21.000, P);
    // VAT must be 2.100:
    expect(cartCalc.summary.vatAmount).toBeCloseTo(2.100, P);
    // Grand Total must be 23.100:
    expect(cartCalc.summary.grandTotal).toBeCloseTo(23.100, P);
  });

  it('Scenario 20 (Order #202 Screenshot): Recall Details footer with Item Discount in Inclusive View has Subtotal 30.087 (NOT 31.429) and exclusive discount 8.658', () => {
    localStorage.setItem('priceView', 'Inclusive');
    localStorage.setItem('printPrice', 'Inclusive');
    localStorage.setItem('vatStatus', 'true');
    localStorage.setItem('levy', '5');

    const order202 = {
      masterData: {
        orderNo: 202,
        ticketNo: 202,
        orderType: "TakeOut",
        customer: "CASH CUSTOMER",
        waiter: "emp1",
        deliveryCharge: 0,
        discAmount: 0, // item discount: master discAmount is 0
        serviceCharge: 0,
        levy: 1.071,
        vatExclAmount: 22.500,
        vatAmount: 2.250,
        netAmount: 24.750,
      },
      detailsData: [
        {
          qty: 3,
          productId: 6,
          productName: "Demo",
          price: 11.583,
          amount: 34.750,
          discAmount: 10.000, // inclusive item discount
          serviceCharge: 0,
          levy: 1.071,
          vatAmount: 2.250,
          mapId: 1,
        }
      ],
      modifiersData: [
        {
          qty: 1,
          modifierId: 6,
          modifierName: "test",
          price: 0.100,
          mapId: 1,
        }
      ]
    };

    // 1. Bill discount check: Since master discAmount == 0 and details has discount, MUST be ITEM discount (false)
    const isBillDisc = checkOrderHasBillDiscount(order202);
    expect(isBillDisc).toBe(false);

    // 2. Footer calculations in Recall Details:
    const master = order202.masterData;
    const details = order202.detailsData;
    const rawVatExcl = Number(master.vatExclAmount);
    const displayCharges = Number(master.levy);
    const backendDiscount = Number(master.discAmount);
    const lineDiscountsTotal = details.reduce((sum, d) => sum + Number(d.discAmount), 0);

    const isItemDiscount = backendDiscount <= 0.001 && lineDiscountsTotal > 0.001;
    expect(isItemDiscount).toBe(true);

    const orderCombinedFactor = (1 + 0.10) * (1 + 0.05); // 1.155
    const exclusiveItemDiscount = roundCalc(lineDiscountsTotal / orderCombinedFactor, 4);
    expect(exclusiveItemDiscount).toBeCloseTo(8.658, 3);

    const displayDiscount = backendDiscount > 0 ? backendDiscount : roundCalc(exclusiveItemDiscount);
    expect(displayDiscount).toBeCloseTo(8.658, 3);

    // Subtotal must be 30.087 (NOT 31.429!)
    const displaySubTotal = roundCalc(Math.max(0, rawVatExcl - displayCharges) + displayDiscount);
    expect(displaySubTotal).toBeCloseTo(30.087, 3);
    expect(displaySubTotal).not.toBeCloseTo(31.429, 2);

    // Net value and Grand total checks
    const displayNetValue = roundCalc(rawVatExcl);
    expect(displayNetValue).toBeCloseTo(22.500, 3);
    expect(master.netAmount).toBeCloseTo(24.750, 3);
  });

  it('Scenario 21 (Order #230 User Screenshot): ABCD [x] INCL. (100.000) with extra TEST (0.100) recalled and edited into cart displays 100.100 (NEVER 115.616)', () => {
    localStorage.setItem('priceView', 'Inclusive');
    localStorage.setItem('printPrice', 'Inclusive');
    localStorage.setItem('vatStatus', 'true');
    localStorage.setItem('levy', '5');

    const products = [
      { id: 9, name: 'ABCD', price: 100.000, vatValue: 10, isIncl: true, unitId: 1 }
    ];
    const productCache = { 9: products[0] };

    const order230 = {
      masterData: {
        orderId: 230,
        orderNo: "230",
        ticketNo: "230",
        orderType: "TakeOut",
        orderTypeId: 2,
        subTotal: 86.667,
        vatExclAmount: 86.667,
        levy: 4.333,
        serviceCharge: 0,
        vatAmount: 9.100,
        netAmount: 100.100,
      },
      detailsData: [
        {
          qty: 1,
          productId: 9,
          productName: "ABCD",
          price: 86.5800866,
          amount: 86.5800866,
          discAmount: 0,
          serviceCharge: 0,
          levy: 4.329,
          vatAmount: 9.0909,
          mapId: 1,
          isIncl: true,
        }
      ],
      modifiersData: [
        {
          qty: 1,
          modifierId: 1,
          modifierName: "TEST",
          price: 0.0865801,
          typeId: 2,
          mapId: 1,
        }
      ]
    };

    // 1. Recall Details verification:
    const unified = buildUnifiedOrderPricing(order230, {
      orderType: "TakeOut",
      priceView: "Inclusive",
      products,
      productCache,
    });
    expect(unified.lines[0].inclusiveRate).toBeCloseTo(100.100, 3);
    expect(unified.lines[0].inclusiveAmount).toBeCloseTo(100.100, 3);
    expect(unified.summary.subTotalExclusive).toBeCloseTo(86.667, 3);
    expect(unified.summary.charges).toBeCloseTo(4.333, 3);
    expect(unified.summary.grandTotal).toBeCloseTo(100.100, 3);

    // 2. Map to cart items on Edit click:
    const rawCartItems = mapOrderDetailsToCartItems(order230.detailsData, order230.modifiersData, {
      products,
      productCache,
      orderType: "TakeOut",
      priceView: "Inclusive",
    });

    // Enriched with unified pricing line values as done in PosRecallDetailsModal:
    const isTaxInclusive = true;
    const enrichedCartItems = rawCartItems.map((cartItem, idx) => {
      const uLine = unified.lines[idx] || unified.lines.find(
        (l) => (l.mapId !== undefined && cartItem.mapId !== undefined && Number(l.mapId) === Number(cartItem.mapId)) ||
               (l.productId !== undefined && cartItem.productId !== undefined && Number(l.productId) === Number(cartItem.productId))
      );
      if (uLine) {
        const authRate = uLine.getRate(isTaxInclusive);
        const authLineTotal = uLine.getAmount(isTaxInclusive, unified.summary.isBillDiscount);
        const authOrigTotal = isTaxInclusive ? uLine.inclusiveGross : uLine.exclusiveGross;
        const authDiscount = uLine.getDiscount(isTaxInclusive);
        return {
          ...cartItem,
          isIncl: uLine.isProductMasterInclusive !== undefined ? uLine.isProductMasterInclusive : cartItem.isIncl,
          authoritativePrice: authRate,
          authoritativeLineTotal: authLineTotal,
          authoritativeOriginalLineTotal: authOrigTotal,
          authoritativeDiscount: authDiscount,
          authoritativeVatAmount: uLine.vatAmount,
          lineTotal: authLineTotal,
          originalLineTotal: authOrigTotal,
        };
      }
      return cartItem;
    });

    // Initial cart item check:
    expect(enrichedCartItems[0].isIncl).toBe(true);
    expect(enrichedCartItems[0].price).toBeCloseTo(100.000, 3);
    expect((enrichedCartItems[0] as any).authoritativePrice).toBeCloseTo(100.100, 3);
    expect((enrichedCartItems[0] as any).lineTotal).toBeCloseTo(100.100, 3);

    // 3. Calculation check:
    const cartCalc = calculateOrder(enrichedCartItems, {
      orderType: "TakeOut",
      productCache,
    });

    const [line] = cartCalc.lines;
    // Price without extras is 100.000, and line total with extras is 100.100, NEVER 115.616!
    expect(line.price).toBeCloseTo(100.000, 3);
    expect(line.lineNetAmount).toBeCloseTo(100.100, 3);
    expect(line.lineNetAmount).not.toBeCloseTo(115.616, 2);
    expect(cartCalc.summary.grandTotal).toBeCloseTo(100.100, 3);
    expect(cartCalc.summary.grandTotal).not.toBeCloseTo(115.616, 2);
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SCENARIO 22: Order #248 (User Screenshots): 2 ABCD @ 100.000 (Product Master [x] INCL)
  // TakeOut, Disc: 10.000 -> Recall shows Price 100.000, Total 200.000, Net 190.000
  // On Edit, Cart MUST NOT show Price 115.500 or Total 231.000/221.000!
  // Backend calculation MUST be strictly tax-exclusive (base 86.580, disc 8.658, excl subtotal 173.160).
  // ══════════════════════════════════════════════════════════════════════════
  it('Scenario 22: Order #248 (2 ABCD @ 100.000 inclusive in Product Master, 10.000 discount) cart and backend exclusive payload', () => {
    localStorage.setItem("priceView", "Inclusive");
    localStorage.setItem("printPrice", "Inclusive");
    localStorage.setItem("posConfigs", JSON.stringify({
      configs: {
        priceView: "Inclusive",
        vatType: "Inclusive",
        discCalc: "Inclusive",
        vat: 10,
        levy: 5,
        serviceCharges: 0,
      }
    }));

    const products = [
      {
        id: 9,
        productId: 9,
        name: "ABCD",
        price: 100.000,
        isIncl: true, // [x] INCL in Product Master
        vatValue: 10,
        unitId: 1,
      }
    ];
    const productCache: Record<number, any> = { 9: products[0] };

    const order248 = {
      orderId: 248,
      orderNo: "248",
      ticketNo: "248",
      orderType: "TakeOut",
      orderTypeId: 2,
      subTotal: 173.160,
      vatExclAmount: 173.160,
      discAmount: 0,
      discount: 0,
      charges: 8.225,
      levy: 8.225,
      serviceCharge: 0,
      vatAmount: 17.273,
      netAmount: 190.000,
      details: [
        {
          productId: 9,
          productName: "ABCD",
          qty: 2,
          price: 100.000,
          amount: 200.000,
          discAmount: 10.000,
          discPer: 5,
          vatExclAmount: 173.160,
          vatAmount: 17.273,
          netAmount: 190.000,
          serviceCharge: 0,
          levy: 8.225,
          mapId: 1,
          isIncl: true,
        }
      ],
      modifiers: []
    };

    // 1. Unified order pricing check
    const unified = buildUnifiedOrderPricing(order248, {
      orderType: "TakeOut",
      priceView: "Inclusive",
      products,
      productCache,
    });

    expect(unified.summary.grandTotal).toBeCloseTo(190.000, 3);
    expect(unified.summary.subTotalExclusive).toBeCloseTo(173.160, 3);
    expect(unified.summary.charges).toBeCloseTo(8.225, 3);
    expect(unified.summary.vatAmount).toBeCloseTo(17.273, 3);

    const [uLine] = unified.lines;
    expect(uLine.getRate(true)).toBeCloseTo(100.000, 3);
    expect(uLine.getRate(false)).toBeCloseTo(86.580, 3);
    expect(uLine.inclusiveGross).toBeCloseTo(200.000, 3);
    expect(uLine.inclusiveAmount).toBeCloseTo(190.000, 3);
    expect(uLine.getAmount(true, false)).toBeCloseTo(190.000, 3);
    expect(uLine.getAmount(true, true)).toBeCloseTo(200.000, 3);

    // 2. Map to Cart on EDIT
    const rawMapped = mapOrderDetailsToCartItems(order248.details, order248.modifiers, {
      products,
      productCache,
      priceView: "Inclusive",
      orderType: "TakeOut",
    });

    expect(rawMapped[0].isIncl).toBe(true);
    expect(rawMapped[0].price).toBeCloseTo(100.000, 3);
    expect(rawMapped[0].price).not.toBeCloseTo(115.500, 2);

    // Enriched mapped items
    const enrichedCart = rawMapped.map((ci, idx) => {
      const line = unified.lines[idx];
      return {
        ...ci,
        isIncl: line?.isProductMasterInclusive !== undefined ? line.isProductMasterInclusive : ci.isIncl,
        authoritativePrice: line.getRate(true),
        authoritativeLineTotal: line.getAmount(true),
        authoritativeOriginalLineTotal: line.inclusiveGross,
        authoritativeDiscount: line.getDiscount(true),
      };
    });

    expect(enrichedCart[0].authoritativePrice).toBeCloseTo(100.000, 3);
    expect(enrichedCart[0].authoritativeOriginalLineTotal).toBeCloseTo(200.000, 3);
    expect(enrichedCart[0].authoritativeLineTotal).toBeCloseTo(190.000, 3);
    expect(enrichedCart[0].authoritativeDiscount).toBeCloseTo(10.000, 3);

    // 3. Cart calculation (dynamic re-calculation on edit)
    const cartCalc = calculateOrder(enrichedCart, {
      orderType: "TakeOut",
      productCache,
    });

    const [cartLine] = cartCalc.lines;
    // Cart row unit price MUST BE 100.000, NEVER 115.500!
    expect(cartLine.price).toBeCloseTo(100.000, 3);
    expect(cartLine.price).not.toBeCloseTo(115.500, 2);
    // Line original gross total MUST BE 200.000, NEVER 231.000!
    expect(cartLine.originalLineTotal).toBeCloseTo(200.000, 3);
    expect(cartLine.originalLineTotal).not.toBeCloseTo(231.000, 2);
    // Line net total MUST BE 190.000, NEVER 221.000!
    expect(cartLine.lineNetAmount).toBeCloseTo(190.000, 3);
    expect(cartLine.lineNetAmount).not.toBeCloseTo(221.000, 2);

    // 4. Ensure backend calculation payload is STRICTLY TAX-EXCLUSIVE:
    // Base Price = 100 / (1.05 * 1.10) = 86.580
    expect(cartLine.basePrice).toBeCloseTo(86.580, 3);
    // Base Amount = 2 * 86.580 = 173.160
    expect(cartLine.baseAmount).toBeCloseTo(173.160, 3);
    // Base Discount = 10 / (1.05 * 1.10) = 8.658
    expect(cartLine.itemDiscountAmount).toBeCloseTo(8.658, 3);

    // Verify backend payload mapper creates exclusive detail row
    const context: any = {
      cartDetails: cartCalc.lines,
      subtotal: cartCalc.summary.subtotal,
      discount: cartCalc.summary.totalDiscount,
      tax: cartCalc.summary.vatAmount,
      charges: cartCalc.summary.charges,
      totalServiceCharge: 0,
      totalLevy: cartCalc.summary.levy,
      total: cartCalc.summary.grandTotal,
      deliveryCharge: 0,
      selectedOrderTypeName: "TakeOut",
      selectedOrderTypeId: 2,
    };
    const session: any = { userId: 1, employeeId: 1, customerId: 1, transDate: "2026-11-02T00:00:00.000Z" };
    const backendPayload = buildNewOrderPayload(context, session);

    // Backend payload: details price MUST BE exclusive base 86.580
    expect(backendPayload.details[0].price).toBeCloseTo(86.580, 3);
    expect(backendPayload.details[0].basePrice).toBeCloseTo(86.580, 3);
    expect(backendPayload.details[0].exclusivePrice).toBeCloseTo(86.580, 3);
    expect(backendPayload.details[0].isPriceTaxExclusive).toBe(true);
    // Backend payload: exclusive discount MUST BE 8.658
    expect(backendPayload.details[0].discAmount).toBeCloseTo(8.658, 3);
    // Backend payload: exclusive taxable amount MUST BE 173.160 - 8.658 + 8.225 = 172.727
    expect(backendPayload.vatExclAmount).toBeCloseTo(172.727, 3);
    // Backend payload: netAmount MUST BE exactly 190.000
    expect(backendPayload.netAmount).toBeCloseTo(190.000, 3);
  });

  it('Scenario 23: Order #255 User Screenshot - ABCD (100.000 inclusive in Product Master, priceIsIncl: true) with 10.000 discount, Levy 0%, VAT 10% in TakeOut displays 100.000 in cart (NEVER 110.000) and 90.000 total', () => {
    localStorage.setItem('decimalPart', '3');
    localStorage.setItem('priceView', 'Inclusive');
    localStorage.setItem('printPrice', 'Inclusive');
    localStorage.setItem('vatStatus', 'true');
    localStorage.setItem('posConfigs', JSON.stringify({
      configs: {
        vat: 10,
        serviceCharges: 0,
        levy: 0,
        priceView: 'Inclusive',
        printPrice: 'Inclusive',
        discountCalc: 'Inclusive',
      }
    }));

    const products = [
      {
        id: 9,
        name: "ABCD",
        price: 100.000,
        catalogPrice: 100.000,
        priceIsIncl: true, // Product master [x] INCL. tag
        isIncl: true,
        vatValue: 10,
        unitId: 1,
      }
    ];
    const productCache: Record<number, any> = {
      9: products[0]
    };

    const order255 = {
      orderId: 255,
      orderNo: "255",
      ticketNo: "255",
      orderType: "TakeOut",
      orderTypeId: 2,
      subTotal: 90.909,
      vatExclAmount: 90.909,
      discAmount: 0,
      discount: 0,
      charges: 0,
      levy: 0,
      serviceCharge: 0,
      vatAmount: 8.182,
      netAmount: 90.000,
      details: [
        {
          productId: 9,
          productName: "ABCD",
          qty: 1,
          price: 90.9090909, // Backend exclusive base
          amount: 90.9090909,
          discAmount: 9.0909091, // Backend exclusive disc
          vatExclAmount: 81.8181818,
          vatAmount: 8.1818182,
          netAmount: 90.000,
          serviceCharge: 0,
          levy: 0,
          mapId: 1,
          isIncl: true,
          priceIsIncl: true,
        }
      ],
      modifiers: []
    };

    // 1. Map to Cart on EDIT
    const rawMapped = mapOrderDetailsToCartItems(order255.details, order255.modifiers, {
      products,
      productCache,
      priceView: "Inclusive",
      orderType: "TakeOut",
    });

    expect(rawMapped[0].isIncl).toBe(true);
    // User requirement: Price in cart MUST BE 100.000 (NEVER 110.000)
    expect(rawMapped[0].price).toBeCloseTo(100.000, 3);
    expect(rawMapped[0].price).not.toBeCloseTo(110.000, 2);

    // 2. Run calculateOrder on cart items
    const cartCalc = calculateOrder(rawMapped, {
      orderType: "TakeOut",
      orderTypeId: 2,
      productCache,
    });

    const [cartLine] = cartCalc.lines;
    // Cart row unit price must display 100.000, NOT 110.000
    expect(cartLine.price).toBeCloseTo(100.000, 3);
    expect(cartLine.price).not.toBeCloseTo(110.000, 2);
    // Line original total (before discount) must be 100.000, NOT 110.000
    expect(cartLine.originalLineTotal).toBeCloseTo(100.000, 3);
    // Line total (after 10.000 discount) must be 90.000, NOT 100.000
    expect(cartLine.lineTotal).toBeCloseTo(90.000, 3);

    // Behind the scenes: base price is exclusive 90.909
    expect(cartLine.basePrice).toBeCloseTo(90.909, 3);
    expect(cartLine.exclusivePrice).toBeCloseTo(90.909, 3);
    expect(cartLine.itemDiscountAmount).toBeCloseTo(9.091, 3);

    // Summary totals
    expect(cartCalc.summary.subtotal).toBeCloseTo(90.909, 3);
    expect(cartCalc.summary.totalDiscount).toBeCloseTo(9.091, 3);
    expect(cartCalc.summary.netValue).toBeCloseTo(81.818, 3);
    expect(cartCalc.summary.tax).toBeCloseTo(8.182, 3);
    expect(cartCalc.summary.grandTotal).toBeCloseTo(90.000, 3);

    // Verify backend payload is strictly exclusive
    const context: any = {
      cartDetails: cartCalc.lines,
      subtotal: cartCalc.summary.subtotal,
      discount: cartCalc.summary.totalDiscount,
      tax: cartCalc.summary.tax,
      charges: cartCalc.summary.charges,
      totalServiceCharge: 0,
      totalLevy: 0,
      total: cartCalc.summary.grandTotal,
      deliveryCharge: 0,
      selectedOrderTypeName: "TakeOut",
      selectedOrderTypeId: 2,
    };
    const session: any = { userId: 1, employeeId: 1, customerId: 1, transDate: "2026-11-02T00:00:00.000Z" };
    const backendPayload = buildNewOrderPayload(context, session);

    expect(backendPayload.details[0].price).toBeCloseTo(90.909, 3);
    expect(backendPayload.details[0].basePrice).toBeCloseTo(90.909, 3);
    expect(backendPayload.details[0].exclusivePrice).toBeCloseTo(90.909, 3);
    expect(backendPayload.details[0].isPriceTaxExclusive).toBe(true);
    expect(backendPayload.details[0].discAmount).toBeCloseTo(9.091, 3);
    expect(backendPayload.vatExclAmount).toBeCloseTo(81.818, 3);
    expect(backendPayload.vatAmount).toBeCloseTo(8.182, 3);
    expect(backendPayload.netAmount).toBeCloseTo(90.000, 3);
  });
});
