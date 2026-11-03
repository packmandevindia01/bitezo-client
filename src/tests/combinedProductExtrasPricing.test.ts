import { describe, it, expect, beforeEach } from 'vitest';
import { calculateOrder } from '../features/pos/terminal/utils/billing';
import { buildNewOrderPayload, buildUpdateOrderPayload } from '../features/pos/terminal/mappers/orderPayloadMapper';
import { buildSalesInvoicePayload } from '../features/pos/terminal/mappers/invoicePayloadMapper';
import { buildUnifiedOrderPricing } from '../features/pos/utils/orderPricing';
import { mapOrderDetailsToCartItems } from '../features/pos/terminal/mappers/orderDetailToCartMapper';

describe('Combined Product Extras Pricing Specification', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vatStatus', 'true');
    localStorage.setItem('posConfigs', JSON.stringify({
      configs: {
        vat: 10,
        serviceCharges: 10,
        levy: 5,
        vatStatus: true,
      }
    }));
  });

  it('1. User Rule: Exclusive Base (1.000) + Exclusive Extra (0.100) = Combined Product Price 1.100 in details payload', () => {
    localStorage.setItem('priceView', 'Exclusive');

    // Customer buys 1 item with base price 1.000 exclusive and adds extra cheese (exclusive 0.100 -> entered cart price 0.1155)
    const cartItems = [
      {
        uniqueId: 'item-1',
        productId: 7,
        unitId: 1,
        price: 1.000,
        quantity: 1,
        isIncl: false,
        product: { id: 7, name: 'Burger', price: 1.000, isIncl: false, unitId: 1, vatValue: 10 },
        extras: [
          { id: 10, name: 'Extra Cheese', price: 0.1155, qty: 1, typeId: 2, isPriceTaxExclusive: true }
        ]
      }
    ];

    const calc = calculateOrder(cartItems, { orderType: 'TakeOut' });
    expect(calc.summary.grandTotal).toBeCloseTo(1.2705, 3);

    // KOT Payload (POST /menu/order)
    const newOrderPayload = buildNewOrderPayload(
      {
        cartDetails: calc.lines as any,
        subtotal: calc.summary.subtotal,
        discount: 0,
        tax: calc.summary.vatAmount,
        charges: calc.summary.charges,
        totalServiceCharge: calc.summary.serviceCharge,
        totalLevy: calc.summary.levy,
        total: calc.summary.grandTotal,
        deliveryCharge: 0,
        selectedOrderTypeId: 2,
        selectedOrderTypeName: 'TakeOut',
        selectedCustomerId: 1,
      } as any,
      { dayId: 1, shiftId: 1, transDate: '2026-10-31T12:00:00' }
    );

    // Detail price MUST be 1.100 (New Product Price = Base 1.000 + Extra 0.100), NEVER 1.000!
    expect(newOrderPayload.details).toHaveLength(1);
    expect(newOrderPayload.details[0].price).toBeCloseTo(1.100, 4);
    expect(newOrderPayload.details[0].basePrice).toBeCloseTo(1.100, 4);
    expect(newOrderPayload.details[0].exclusivePrice).toBeCloseTo(1.100, 4);

    // Charges and VAT calculated using the single combined price 1.100
    // Levy (5%) = 1.100 * 0.05 = 0.055
    expect(newOrderPayload.details[0].levy).toBeCloseTo(0.055, 4);
    // Taxable Base = 1.100 + 0.055 = 1.155. VAT (10%) = 1.155 * 0.10 = 0.1155
    expect(newOrderPayload.details[0].vatAmount).toBeCloseTo(0.1155, 4);
    // Net Amount = 1.155 + 0.1155 = 1.2705
    expect(newOrderPayload.details[0].netAmount).toBeCloseTo(1.2705, 4);

    // Sales Payload (POST /sales / settlement)
    const invoicePayload = buildSalesInvoicePayload({
      orderPayload: newOrderPayload as any,
      payments: [{ paymodeId: 1, amount: newOrderPayload.netAmount }],
      employeeId: 1,
      dayId: 1,
      shiftId: 1,
      transDate: '2026-10-31T12:00:00',
    });

    expect(invoicePayload.details).toHaveLength(1);
    expect(invoicePayload.details[0].price).toBeCloseTo(1.100, 4);
    expect(invoicePayload.details[0].levy).toBeCloseTo(0.055, 4);
    expect(invoicePayload.details[0].vatAmount).toBeCloseTo(0.1155, 4);
    expect(invoicePayload.details[0].netAmount).toBeCloseTo(1.2705, 4);
    expect(invoicePayload.netAmount).toBeCloseTo(1.2705, 4);
  });

  it('2. User Scenario: Inclusive Product (1.000 gross) + Extra (0.100 gross) produces combined exclusive price 0.952381 in details payload', () => {
    localStorage.setItem('priceView', 'Inclusive');

    // TEST PRICE1 (1.000 gross) + test extra (0.100 gross)
    const cartItems = [
      {
        uniqueId: 'item-takeout',
        productId: 7,
        unitId: 1,
        price: 1.000,
        quantity: 1,
        isIncl: true,
        product: { id: 7, name: 'TEST PRICE1', price: 1.000, isIncl: true, unitId: 1, vatValue: 10 },
        extras: [
          { id: 6, name: 'test', price: 0.100, qty: 1, typeId: 2 }
        ]
      }
    ];

    const calc = calculateOrder(cartItems, { orderType: 'TakeOut' });
    expect(calc.summary.grandTotal).toBeCloseTo(1.100, 3);
    expect(calc.summary.charges).toBeCloseTo(0.048, 3);
    expect(calc.summary.vatAmount).toBeCloseTo(0.100, 3);

    // KOT Payload (POST /menu/order)
    const newOrderPayload = buildNewOrderPayload(
      {
        cartDetails: calc.lines as any,
        subtotal: calc.summary.subtotal,
        discount: 0,
        tax: calc.summary.vatAmount,
        charges: calc.summary.charges,
        totalServiceCharge: calc.summary.serviceCharge,
        totalLevy: calc.summary.levy,
        total: calc.summary.grandTotal,
        deliveryCharge: 0,
        selectedOrderTypeId: 2,
        selectedOrderTypeName: 'TakeOut',
        selectedCustomerId: 1,
      } as any,
      { dayId: 1, shiftId: 1, transDate: '2026-10-31T12:00:00' }
    );

    // Combined Exclusive Price = 1.000 / 1.155 + 0.100 / 1.155 = 0.8658009 + 0.0865801 = 0.952381
    expect(newOrderPayload.details).toHaveLength(1);
    expect(newOrderPayload.details[0].price).toBeCloseTo(0.952381, 4);
    expect(newOrderPayload.details[0].basePrice).toBeCloseTo(0.952381, 4);

    // Combined Levy (5%) = 0.952381 * 0.05 = 0.047619
    expect(newOrderPayload.details[0].levy).toBeCloseTo(0.047619, 4);
    // Combined VAT (10%) = (0.952381 + 0.047619) * 0.10 = 0.100000
    expect(newOrderPayload.details[0].vatAmount).toBeCloseTo(0.100000, 4);
    // Combined Net Amount = 1.000000 + 0.100000 = 1.100000
    expect(newOrderPayload.details[0].netAmount).toBeCloseTo(1.100000, 3);

    // Master totals match detail line exactly
    expect(newOrderPayload.levy).toBeCloseTo(0.047619, 4);
    expect(newOrderPayload.vatExclAmount).toBeCloseTo(1.000000, 3);
    expect(newOrderPayload.vatAmount).toBeCloseTo(0.100000, 3);
    expect(newOrderPayload.netAmount).toBeCloseTo(1.100000, 3);

    // Recall in Inclusive View displays PRICE 1.100, TOTAL 1.100, Subtotal 0.952, Charges 0.048, Net 1.000, VAT 0.100, Grand Total 1.100
    const recallInclusive = buildUnifiedOrderPricing(
      {
        masterData: {
          orderNo: 181,
          ticketNo: 181,
          orderType: 'TakeOut',
          levy: newOrderPayload.levy,
          vatExclAmount: newOrderPayload.vatExclAmount,
          vatAmount: newOrderPayload.vatAmount,
          netAmount: newOrderPayload.netAmount,
        },
        detailsData: newOrderPayload.details,
        modifiersData: newOrderPayload.modifiers,
      },
      { orderType: 'TakeOut', priceView: 'Inclusive' }
    );

    expect(recallInclusive.lines[0].inclusiveRate).toBeCloseTo(1.100, 3);
    expect(recallInclusive.lines[0].inclusiveGross).toBeCloseTo(1.100, 3);
    expect(recallInclusive.summary.subTotalExclusive).toBeCloseTo(0.952, 3);
    expect(recallInclusive.summary.charges).toBeCloseTo(0.048, 3);
    expect(recallInclusive.summary.netValue).toBeCloseTo(1.000, 3);
    expect(recallInclusive.summary.vatAmount).toBeCloseTo(0.100, 3);
    expect(recallInclusive.summary.grandTotal).toBeCloseTo(1.100, 3);

    // Recall in Exclusive View displays PRICE 0.952, TOTAL 0.952, Subtotal 0.952, Charges 0.048, Net 1.000, VAT 0.100, Grand Total 1.100
    const recallExclusive = buildUnifiedOrderPricing(
      {
        masterData: {
          orderNo: 181,
          ticketNo: 181,
          orderType: 'TakeOut',
          levy: newOrderPayload.levy,
          vatExclAmount: newOrderPayload.vatExclAmount,
          vatAmount: newOrderPayload.vatAmount,
          netAmount: newOrderPayload.netAmount,
        },
        detailsData: newOrderPayload.details,
        modifiersData: newOrderPayload.modifiers,
      },
      { orderType: 'TakeOut', priceView: 'Exclusive' }
    );

    expect(recallExclusive.lines[0].exclusiveRate).toBeCloseTo(0.952, 3);
    expect(recallExclusive.lines[0].exclusiveGross).toBeCloseTo(0.952, 3);
    expect(recallExclusive.summary.subTotalExclusive).toBeCloseTo(0.952, 3);
    expect(recallExclusive.summary.charges).toBeCloseTo(0.048, 3);
    expect(recallExclusive.summary.netValue).toBeCloseTo(1.000, 3);
    expect(recallExclusive.summary.vatAmount).toBeCloseTo(0.100, 3);
    expect(recallExclusive.summary.grandTotal).toBeCloseTo(1.100, 3);
  });

  it('4. Bug Fix: Backend recall returns combined exclusive price in details.price (0.952381) + extras in modifiersData (0.0865801) → must NOT double-add extras → inclusiveRate = 1.100 NOT 1.187/1.200', () => {
    // This tests the Order 183 bug scenario:
    // Backend stores the combined exclusive price (0.952381) in details.price
    // Backend ALSO returns the extras (0.0865801) in modifiersData
    // The frontend was incorrectly adding extras on top of the already-combined price
    // Expected: inclusiveRate = 1.100 (NOT 1.187 or 1.200)

    localStorage.setItem('priceView', 'Inclusive');

    // Exact data that backend returns for a TakeOut recall (5% levy + 10% VAT)
    const rawBackendRecall = {
      masterData: {
        orderNo: 183,
        ticketNo: 183,
        orderType: 'TakeOut',
        serviceCharge: 0,
        levy: 0.047619,        // Combined levy on 0.952381 * 5% = 0.047619
        vatExclAmount: 1.0,    // Full exclusive net of extras = 1.000
        vatAmount: 0.1,        // VAT on combined amount = 0.1
        netAmount: 1.1,        // Grand total = 1.100
      },
      detailsData: [
        {
          qty: 1,
          productId: 7,
          productName: 'test price1',
          price: 0.952381,       // Combined exclusive: base(0.8658009) + extra(0.0865801) = 0.952381
          amount: 0.952381,      // Row amount = combined exclusive price
          discAmount: 0,
          serviceCharge: 0,
          levy: 0.047619,
          vatAmount: 0.1,
          mapId: 1,
        }
      ],
      modifiersData: [
        {
          qty: 1,
          modifierId: 6,
          modifierName: 'test',
          arabicName: '',
          typeName: '',
          price: 0.0865801,    // Extra exclusive price (backend always returns this separately)
          mapId: 1,
        }
      ]
    };

    const recallIncl = buildUnifiedOrderPricing(rawBackendRecall, {
      orderType: 'TakeOut',
      priceView: 'Inclusive',
    });

    // KEY ASSERTION: Must NOT double-add extras. Inclusive rate = 1.100, NOT 1.187 or 1.200
    expect(recallIncl.lines[0].inclusiveRate).toBeCloseTo(1.100, 3);
    expect(recallIncl.lines[0].exclusiveRate).toBeCloseTo(0.952, 3);
    expect(recallIncl.lines[0].inclusiveGross).toBeCloseTo(1.100, 3);
    expect(recallIncl.summary.grandTotal).toBeCloseTo(1.100, 3);
    expect(recallIncl.summary.vatAmount).toBeCloseTo(0.100, 3);
    expect(recallIncl.summary.charges).toBeCloseTo(0.048, 3);

    // Also test Exclusive view (should be 0.952, not 1.039)
    const recallExcl = buildUnifiedOrderPricing(rawBackendRecall, {
      orderType: 'TakeOut',
      priceView: 'Exclusive',
    });

    expect(recallExcl.lines[0].exclusiveRate).toBeCloseTo(0.952, 3);
    expect(recallExcl.lines[0].inclusiveRate).toBeCloseTo(1.100, 3);
    expect(recallExcl.summary.subTotalExclusive).toBeCloseTo(0.952, 3);
    expect(recallExcl.summary.grandTotal).toBeCloseTo(1.100, 3);
  });

  it('3. Lifecycle: Punch order with extras -> Edit order -> Add same item again -> Punch again -> Recall Details displays accurate rates', () => {
    localStorage.setItem('priceView', 'Inclusive');

    // Order with 1 item + extras saved in backend
    const savedBackendOrder = {
      masterData: {
        orderNo: 182,
        ticketNo: 182,
        orderType: 'TakeOut',
        levy: 0.047619,
        vatExclAmount: 1.0,
        vatAmount: 0.1,
        netAmount: 1.1,
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
          vatAmount: 0.1,
          netAmount: 1.1,
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

    const products = [
      { id: 7, name: 'test price1', price: 1.0, isIncl: true, unitId: 1, vatValue: 10 }
    ];

    // Restore into cart on edit
    const cartItems = mapOrderDetailsToCartItems(savedBackendOrder.detailsData, savedBackendOrder.modifiersData, {
      products,
      priceView: 'Inclusive',
      orderType: 'TakeOut'
    });

    expect(cartItems).toHaveLength(1);
    expect(cartItems[0].price).toBeCloseTo(1.000, 3);
    expect(cartItems[0].extras).toHaveLength(1);
    expect(cartItems[0].extras?.[0].price).toBeCloseTo(0.100, 3);

    // User adds the same product again without extras from product catalog
    const secondItem = {
      uniqueId: '7-new-click',
      productId: 7,
      unitId: 1,
      quantity: 1,
      price: 1.0,
      isIncl: true,
      extras: [],
      modifiers: [],
      messages: [],
      isExisting: false,
      product: products[0]
    };

    const cartCalc = calculateOrder([...cartItems, secondItem], { orderType: 'TakeOut' });
    expect(cartCalc.lines[0].lineTotal).toBeCloseTo(1.100, 2);
    expect(cartCalc.lines[1].lineTotal).toBeCloseTo(1.000, 2);
    expect(cartCalc.summary.grandTotal).toBeCloseTo(2.100, 2);

    // Save updated order
    const updatePayload = buildUpdateOrderPayload(182, {
      cartDetails: cartCalc.lines as any,
      selectedOrderTypeName: 'TakeOut',
      selectedOrderTypeId: 2,
      selectedCustomerId: 1,
    } as any, {
      dayId: 1,
      shiftId: 1,
      employeeId: 1
    });

    expect(updatePayload.details).toHaveLength(2);
    // Line 1 (with extras) has combined exclusive price 0.952381
    expect(updatePayload.details[0].price).toBeCloseTo(0.952381, 4);
    expect(updatePayload.details[0].netAmount).toBeCloseTo(1.100, 3);
    // Line 2 (without extras) has base exclusive price 0.8658009
    expect(updatePayload.details[1].price).toBeCloseTo(0.8658009, 4);
    expect(updatePayload.details[1].netAmount).toBeCloseTo(1.000, 3);

    // Master netAmount is 2.100
    expect(updatePayload.netAmount).toBeCloseTo(2.100, 3);

    // Recalled from backend
    const updatedBackendOrder = {
      masterData: {
        orderNo: 182,
        ticketNo: 182,
        orderType: 'TakeOut',
        serviceCharge: 0,
        levy: updatePayload.levy,
        vatExclAmount: updatePayload.vatExclAmount,
        vatAmount: updatePayload.vatAmount,
        netAmount: updatePayload.netAmount,
      },
      detailsData: updatePayload.details,
      modifiersData: updatePayload.modifiers,
    };

    const recallInclusive = buildUnifiedOrderPricing(updatedBackendOrder, {
      orderType: 'TakeOut',
      priceView: 'Inclusive'
    });

    expect(recallInclusive.lines[0].inclusiveRate).toBeCloseTo(1.100, 3);
    expect(recallInclusive.lines[1].inclusiveRate).toBeCloseTo(1.000, 3);
    expect(recallInclusive.summary.grandTotal).toBeCloseTo(2.100, 3);

    const recallExclusive = buildUnifiedOrderPricing(updatedBackendOrder, {
      orderType: 'TakeOut',
      priceView: 'Exclusive'
    });

    expect(recallExclusive.lines[0].exclusiveRate).toBeCloseTo(0.952, 3);
    expect(recallExclusive.lines[1].exclusiveRate).toBeCloseTo(0.866, 3);
    expect(recallExclusive.summary.subTotalExclusive).toBeCloseTo(1.818, 3);
    expect(recallExclusive.summary.grandTotal).toBeCloseTo(2.100, 3);
  });
});
