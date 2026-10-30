import { describe, it, expect, beforeEach } from 'vitest';
import { buildUnifiedOrderPricing } from '../features/pos/utils/orderPricing';

describe('Unified Order Pricing (orderPricing.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vat', '10');
    localStorage.setItem('priceView', 'Exclusive');
    localStorage.setItem('printPrice', 'Exclusive');
    localStorage.setItem('discCalc', 'Inclusive');
  });

  it('should perfectly reconstruct backend Order #75 (Rate 10, Qty 2, Disc 10, VAT 1, Net 11)', () => {
    // Simulating backend response for Order #75
    const backendOrder = {
      masterData: {
        orderNo: 75,
        ticketNo: 75,
        orderTypeId: 2,
        discAmount: 10,
        discPer: 0,
        serviceCharge: 0,
        levy: 0,
        vatExclAmount: 10,
        vatAmount: 1,
        netAmount: 11,
      },
      detailsData: [
        {
          productId: 6,
          productName: 'Demo',
          qty: 2,
          price: 10,
          discPer: 0,
          discAmount: 0,
          vatValue: 10,
          vatAmount: 1,
          netAmount: 11,
          mapId: 1,
        }
      ]
    };

    const unified = buildUnifiedOrderPricing(backendOrder, {
      orderType: 'Takeaway',
      priceView: 'Exclusive',
    });

    // Subtotal: 2 * 10 = 20.000
    expect(unified.summary.subTotalExclusive).toBe(20.000);

    // Total discount: strictly 10.000 exclusive (11.000 inclusive)
    expect(unified.summary.totalDiscount).toBe(10.000);
    expect(unified.summary.totalDiscountExcl).toBe(10.000);
    expect(unified.summary.totalDiscountIncl).toBe(11.000);

    // VAT: strictly 1.000
    expect(unified.summary.vatAmount).toBe(1.000);

    // Grand Total: strictly 11.000 (not 10.000 and not 12.100)
    expect(unified.summary.grandTotal).toBe(11.000);

    // Line amounts
    expect(unified.lines.length).toBe(1);
    expect(unified.lines[0].exclusiveRate).toBe(10.000);
    expect(unified.lines[0].exclusiveGross).toBe(20.000);
    expect(unified.lines[0].quantity).toBe(2);
  });

  it('should calculate Inclusive print views without altering authoritative net amounts', () => {
    localStorage.setItem('priceView', 'Inclusive');
    localStorage.setItem('printPrice', 'Inclusive');

    const backendOrder = {
      masterData: {
        orderNo: 75,
        ticketNo: 75,
        orderTypeId: 2,
        discAmount: 10,
        vatExclAmount: 10,
        vatAmount: 1,
        netAmount: 11,
      },
      detailsData: [
        {
          productId: 6,
          productName: 'Demo',
          qty: 2,
          price: 10,
          vatValue: 10,
          vatAmount: 1,
          netAmount: 11,
        }
      ]
    };

    const unified = buildUnifiedOrderPricing(backendOrder, {
      orderType: 'Takeaway',
      priceView: 'Inclusive',
    });

    // In inclusive view, rate is 11.000 (10 base + 10% VAT)
    expect(unified.lines[0].inclusiveRate).toBe(11.000);
    expect(unified.summary.grandTotal).toBe(11.000);
  });

  it('should correctly handle line-item level discounts without mistaking them for bill discounts', () => {
    const orderWithLineDiscount = {
      masterData: {
        orderNo: 78,
        ticketNo: 78,
        orderTypeId: 2,
        discAmount: 0,
        discPer: 0,
        netAmount: 19.900,
      },
      detailsData: [
        {
          productId: 1,
          productName: 'Burger',
          qty: 1,
          price: 10.000,
          discAmount: 1.000,
          vatValue: 10,
          vatAmount: 0.900,
          netAmount: 9.900,
        },
        {
          productId: 2,
          productName: 'Fries',
          qty: 1,
          price: 10.000,
          discAmount: 0,
          vatValue: 10,
          vatAmount: 1.000,
          netAmount: 11.000,
        }
      ]
    };

    const unified = buildUnifiedOrderPricing(orderWithLineDiscount, {
      orderType: 'Takeaway',
      priceView: 'Exclusive',
    });

    expect(unified.summary.isBillDiscount).toBe(false);
    expect(unified.summary.lineDiscountsTotal).toBe(1.000);
    expect(unified.summary.totalDiscount).toBe(1.000);
    expect(unified.lines[0].lineDiscountExcl).toBe(1.000);
    expect(unified.lines[1].lineDiscountExcl).toBe(0);
  });
});
