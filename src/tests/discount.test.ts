import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateLineItem,
  calculateOrder,
  type BillingConfig
} from '../features/pos/terminal/utils/billing';
import { buildDirectSettleOrderPayload } from '../features/pos/terminal/mappers/orderPayloadMapper';

describe('Discount Calculations: Bill Discount & Item Discount (Inclusive vs Exclusive)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vat', '10');
    localStorage.setItem('serviceCharges', '0');
    localStorage.setItem('levy', '0');
    localStorage.setItem('currencySymbol', 'BHD');
    localStorage.setItem('decimalPart', '3');
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. ITEM DISCOUNT
  // ══════════════════════════════════════════════════════════════════════════
  describe('1. Item-Level Discount', () => {
    it('1.1 Item Discount under EXCLUSIVE mode (Face value 1.000 BHD remains 1.000)', () => {
      // Configuration: Exclusive price, Exclusive discount
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Exclusive',
        orderType: 'Takeaway',
      };

      // Item base price: 10.000 BHD. Discount entered: 1.000 BHD
      const line = calculateLineItem(1, 10.000, { type: 'amount', value: 1.000 }, 0, config, 10, false);

      // In Exclusive mode:
      // Base discount is strictly 1.000 BHD
      expect(line.discountAmount).toBe(1.000);
      // Net Taxable Base: 10.000 - 1.000 = 9.000
      expect(line.netValue).toBe(9.000);
      // VAT (10% on 9.000): 0.900
      expect(line.vatAmount).toBe(0.900);
      // Line Net Amount (Payable): 9.000 + 0.900 = 9.900
      expect(line.lineNetAmount).toBe(9.900);
    });

    it('1.2 Item Discount under INCLUSIVE mode (Reduces VAT portion: 1.000 / 1.10 = ~0.909)', () => {
      // Configuration: Exclusive price, Inclusive discount
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Inclusive',
        orderType: 'Takeaway',
      };

      // Item base price: 10.000 BHD. Discount entered: 1.000 BHD
      const line = calculateLineItem(1, 10.000, { type: 'amount', value: 1.000 }, 0, config, 10, false);

      // In Inclusive mode:
      // Base discount reduces VAT: 1.000 / (1 + 0.10) = 0.9090909 BHD (shows .909)
      expect(line.discountAmount).toBeCloseTo(0.909, 3);
      // Net Taxable Base: 10.000 - 0.9090909 = 9.090909 BHD
      expect(line.netValue).toBeCloseTo(9.091, 3);
      // VAT (10% on 9.090909): 0.909091 BHD
      expect(line.vatAmount).toBeCloseTo(0.909, 3);
      // Line Net Amount (Payable): 9.090909 + 0.909091 = 10.000 BHD (customer saves exactly 1.000 from 11.000 gross)
      expect(line.lineNetAmount).toBeCloseTo(10.000, 3);
    });

    it('1.3 Multiple items with independent Item Discounts in Cart', () => {
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('discCalc', 'Exclusive');

      const items = [
        {
          productId: 1,
          price: 10.000,
          quantity: 1,
          isIncl: false,
          discountValue: 2.000,
          discountType: 'amount',
        },
        {
          productId: 2,
          price: 20.000,
          quantity: 1,
          isIncl: false,
          discountValue: 5.000,
          discountType: 'amount',
        }
      ];

      const orderCalc = calculateOrder(items, {
        orderType: 'Takeaway',
      });

      // Subtotal before discounts: 10.000 + 20.000 = 30.000
      expect(orderCalc.summary.subtotal).toBe(30.000);
      // Total item discounts: 2.000 + 5.000 = 7.000
      expect(orderCalc.summary.itemDiscountsTotal).toBe(7.000);
      expect(orderCalc.summary.totalDiscount).toBe(7.000);
      // Taxable base: 30.000 - 7.000 = 23.000
      expect(orderCalc.summary.vatExclAmount).toBe(23.000);
      // VAT (10% on 23.000): 2.300
      expect(orderCalc.summary.vatAmount).toBe(2.300);
      // Grand Total: 23.000 + 2.300 = 25.300
      expect(orderCalc.summary.grandTotal).toBe(25.300);
    });

    it('1.4 User Photo Scenario: 4 MOMOS @ 6.600 with 10.000 item discount under discCalc: Exclusive & priceView: Inclusive', () => {
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('discCalc', 'Exclusive');
      localStorage.setItem('enableVat', 'true');
      localStorage.setItem('vat', '10');

      const items = [
        {
          productId: 101,
          name: 'MOMOS',
          price: 6.600,
          quantity: 4,
          isIncl: true,
          discountValue: 10.000,
          discountType: 'amount',
          product: { id: 101, name: 'MOMOS', price: 6.600, vatValue: 10, isIncl: true },
        },
        {
          productId: 102,
          name: 'OTHER ITEM',
          price: 6.600,
          quantity: 5,
          isIncl: true,
          product: { id: 102, name: 'OTHER ITEM', price: 6.600, vatValue: 10, isIncl: true },
        }
      ];

      const orderCalc = calculateOrder(items, {
        orderType: 'TakeOut',
      });

      // MOMOS line:
      const momosLine = orderCalc.lines[0];
      // Original inclusive total: 4 * 6.600 = 26.400
      expect(momosLine.originalLineTotal).toBe(26.400);
      // Item discount displays formatted with view factor: 10.000 * 1.10 = 11.000
      expect(momosLine.itemDiscount).toBe(11.000);
      // Line Total deducts discount: 26.400 - 11.000 = 15.400
      expect(momosLine.lineTotal).toBe(15.400);
      expect(momosLine.lineNetAmount).toBe(15.400);

      // Other item line: 5 * 6.600 = 33.000
      const otherLine = orderCalc.lines[1];
      expect(otherLine.lineTotal).toBe(33.000);

      // Order Summary:
      // Subtotal displays exclusive amount: 24.000 + 30.000 = 54.000
      expect(orderCalc.summary.subtotal).toBe(54.000);
      expect(orderCalc.summary.subTotalInclusive).toBe(59.400);
      // Total Discount displays exclusive amount: 10.000
      expect(orderCalc.summary.totalDiscount).toBe(10.000);
      expect(orderCalc.summary.itemDiscountsTotal).toBe(10.000);
      // Grand Total: 15.400 + 33.000 = 48.400
      expect(orderCalc.summary.grandTotal).toBe(48.400);
    });

    it('1.5 User Latest Screenshot Scenario: 2 DEMO @ 10.000 in TakeOut with 5% Levy, priceView: Inclusive, discCalc: Inclusive, Item Discount 10.000', () => {
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('discCalc', 'Inclusive');
      localStorage.setItem('posConfigs', JSON.stringify({
        configs: {
          discountCalc: 'Inclusive',
          priceView: 'Inclusive',
          vatType: 'Inclusive',
          vatRate: 0.10,
          charges: { serviceCharge: 0, levy: 5, defaultDeliveryCharge: 0 },
          levy: 5,
        }
      }));

      const items = [
        {
          productId: 6,
          name: 'DEMO',
          price: 10.000,
          quantity: 2,
          isIncl: true,
          discountValue: 10.000,
          discountType: 'amount',
          product: { id: 6, name: 'DEMO', price: 10.000, vatValue: 10, isIncl: true },
        }
      ];

      const orderCalc = calculateOrder(items, {
        orderType: 'TakeOut',
      });

      const demoLine = orderCalc.lines[0];
      // Base catalog price per unit: 10 / (1.05 * 1.10) = 8.6580087
      // 2 units gross base: 17.316017
      expect(demoLine.amount).toBeCloseTo(17.316017, 4);

      // In Inclusive calc & Inclusive view: Item discount displays exactly as typed 10.000
      expect(demoLine.itemDiscount).toBeCloseTo(10.000, 3);

      // Line Net Amount is 10.000 (20.000 gross - 10.000 discount)
      expect(demoLine.lineNetAmount).toBeCloseTo(10.000, 3);
      expect(demoLine.lineTotal).toBeCloseTo(10.000, 3);

      // Summary displays exclusive amounts:
      // Subtotal is exclusive: 17.316
      expect(orderCalc.summary.subtotal).toBeCloseTo(17.316, 3);
      expect(orderCalc.summary.subTotalInclusive).toBeCloseTo(20.000, 3);
      // Discount is exclusive: 8.658
      expect(orderCalc.summary.totalDiscount).toBeCloseTo(8.658, 3);

      // Charges: 5% levy on remaining base (17.316017 - 8.658009 = 8.658008) = 0.4329
      expect(orderCalc.summary.charges).toBeCloseTo(0.4329, 3);

      // Net Value: 8.658008 + 0.4329 = 9.0909
      expect(orderCalc.summary.vatExclAmount).toBeCloseTo(9.0909, 3);

      // VAT: 10% on 9.0909 = 0.9091
      expect(orderCalc.summary.vatAmount).toBeCloseTo(0.9091, 3);

      // Grand Total: 9.0909 + 0.9091 = 10.000
      expect(orderCalc.summary.grandTotal).toBeCloseTo(10.000, 3);
    });

    it('1.6 Counterpart Scenario: 2 DEMO @ 10.000 in TakeOut with 5% Levy, priceView: Inclusive, discCalc: Exclusive, Item Discount 10.000', () => {
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('discCalc', 'Exclusive');
      localStorage.setItem('posConfigs', JSON.stringify({
        configs: {
          discountCalc: 'Exclusive',
          priceView: 'Inclusive',
          vatType: 'Inclusive',
          vatRate: 0.10,
          charges: { serviceCharge: 0, levy: 5, defaultDeliveryCharge: 0 },
          levy: 5,
        }
      }));

      const items = [
        {
          productId: 6,
          name: 'DEMO',
          price: 10.000,
          quantity: 2,
          isIncl: true,
          discountValue: 10.000,
          discountType: 'amount',
          product: { id: 6, name: 'DEMO', price: 10.000, vatValue: 10, isIncl: true },
        }
      ];

      const orderCalc = calculateOrder(items, {
        orderType: 'TakeOut',
      });

      const demoLine = orderCalc.lines[0];
      // In Exclusive calc & Inclusive view: Item discount displays as exclusive * factor = 10 * 1.155 = 11.550
      expect(demoLine.itemDiscount).toBeCloseTo(11.550, 3);

      // Summary subtotal displays exclusive amount: 17.316
      expect(orderCalc.summary.subtotal).toBeCloseTo(17.316, 3);
      expect(orderCalc.summary.subTotalInclusive).toBeCloseTo(20.000, 3);
      // Summary discount displays exclusive amount: 10.000
      expect(orderCalc.summary.totalDiscount).toBeCloseTo(10.000, 3);

      // Charges: 5% levy on remaining base (17.316017 - 10.000 = 7.316017) = 0.3658
      expect(orderCalc.summary.charges).toBeCloseTo(0.3658, 3);

      // Net Value: 7.316017 + 0.3658 = 7.6818
      expect(orderCalc.summary.vatExclAmount).toBeCloseTo(7.6818, 3);

      // VAT: 10% on 7.6818 = 0.7682
      expect(orderCalc.summary.vatAmount).toBeCloseTo(0.7682, 3);

      // Grand Total: 7.6818 + 0.7682 = 8.450 (which is 20.000 - 11.550 = 8.450)
      expect(orderCalc.summary.grandTotal).toBeCloseTo(8.450, 3);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. BILL DISCOUNT
  // ══════════════════════════════════════════════════════════════════════════
  describe('2. Bill-Level Discount', () => {
    it('2.1 Bill Discount under EXCLUSIVE mode (Face value 10.000 BHD on Order #75)', () => {
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('discCalc', 'Exclusive');

      // 2 items @ 10.000 base each (Subtotal = 20.000)
      const items = [
        {
          productId: 6,
          price: 10.000,
          quantity: 2,
          isIncl: false,
          product: { id: 6, name: 'Demo Product', price: 10.000, vatValue: 10 },
        }
      ];

      const orderCalc = calculateOrder(items, {
        orderType: 'Takeaway',
        billDiscountValue: 10.000,
        billDiscountType: 'amount',
      });

      // Gross Subtotal: 2 * 10 = 20.000
      expect(orderCalc.summary.subtotal).toBe(20.000);
      // Bill discount displays and applies strictly as 10.000
      expect(orderCalc.summary.billDiscountTotal).toBe(10.000);
      expect(orderCalc.summary.totalDiscount).toBe(10.000);
      // Taxable Base: 20.000 - 10.000 = 10.000
      expect(orderCalc.summary.vatExclAmount).toBe(10.000);
      // VAT (10% on 10.000): 1.000
      expect(orderCalc.summary.vatAmount).toBe(1.000);
      // Grand Total: 10.000 + 1.000 = 11.000
      expect(orderCalc.summary.grandTotal).toBe(11.000);
    });

    it('2.2 Bill Discount under INCLUSIVE mode (Reduces VAT portion: 10.000 / 1.10 = ~9.091)', () => {
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('discCalc', 'Inclusive');

      // 2 items @ 10.000 base each (Subtotal = 20.000)
      const items = [
        {
          productId: 6,
          price: 10.000,
          quantity: 2,
          isIncl: false,
          product: { id: 6, name: 'Demo Product', price: 10.000, vatValue: 10 },
        }
      ];

      const orderCalc = calculateOrder(items, {
        orderType: 'Takeaway',
        billDiscountValue: 10.000,
        billDiscountType: 'amount',
      });

      // Gross Subtotal: 20.000
      expect(orderCalc.summary.subtotal).toBe(20.000);
      // In Inclusive mode, base discount is reduced by VAT: 10.000 / 1.10 = 9.090909
      expect(orderCalc.summary.totalDiscountExcl).toBeCloseTo(9.091, 3);
      // Taxable Base: 20.000 - 9.090909 = 10.909091
      expect(orderCalc.summary.vatExclAmount).toBeCloseTo(10.909, 3);
      // VAT (10% on 10.909091): 1.090909
      expect(orderCalc.summary.vatAmount).toBeCloseTo(1.091, 3);
      // Grand Total: 10.909091 + 1.090909 = 12.000 BHD (customer saves 10.000 from 22.000 gross)
      expect(orderCalc.summary.grandTotal).toBeCloseTo(12.000, 3);
    });

    it('2.3 Percentage Bill Discount (e.g. 10%) works identically in both modes', () => {
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('discCalc', 'Inclusive');

      const items = [
        {
          productId: 1,
          price: 50.000,
          quantity: 1,
          isIncl: false,
        }
      ];

      const orderCalc = calculateOrder(items, {
        orderType: 'Takeaway',
        billDiscountValue: 10,
        billDiscountType: 'percentage',
      });

      // 10% on 50.000 = 5.000
      expect(orderCalc.summary.totalDiscount).toBe(5.000);
      // Taxable base = 45.000
      expect(orderCalc.summary.vatExclAmount).toBe(45.000);
      // VAT = 4.500
      expect(orderCalc.summary.vatAmount).toBe(4.500);
      // Grand Total = 49.500
      expect(orderCalc.summary.grandTotal).toBe(49.500);
    });

    it('2.4 User Image 3: 3 DEMO @ 10.000 with 13.000 inclusive bill discount under Exclusive priceView', () => {
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('discCalc', 'Inclusive');

      const items = [
        {
          productId: 6,
          price: 10.000,
          quantity: 3,
          isIncl: false,
          product: { id: 6, name: 'DEMO', price: 10.000, vatValue: 10 },
        }
      ];

      const orderCalc = calculateOrder(items, {
        orderType: 'TakeOut',
        billDiscountValue: 13.000,
        billDiscountType: 'amount',
      });

      // Under Exclusive priceView:
      // Sub Total is strictly 30.000 (tax-exclusive base)
      expect(orderCalc.summary.subtotal).toBe(30.000);

      // Display discount MUST be base discount (13 / 1.10 = 11.818) so it mathematically subtracts from 30.000!
      // Strictly NOT 13.000 (which would corrupt Net Value to 17.000!)
      expect(orderCalc.summary.totalDiscount).toBeCloseTo(11.818, 3);
      expect(orderCalc.summary.totalDiscount).not.toBe(13.000);

      // Net Value: 30.000 - 11.818 = 18.182 (strictly NOT 17.000!)
      const netValue = orderCalc.summary.subtotal - orderCalc.summary.totalDiscount;
      expect(netValue).toBeCloseTo(18.182, 3);
      expect(netValue).not.toBeCloseTo(17.000, 2);

      // VAT (10% on 18.182): 1.818
      expect(orderCalc.summary.vatAmount).toBeCloseTo(1.818, 3);

      // Net Value (18.182) + VAT (1.818) === Grand Total (20.000)!
      expect(netValue + orderCalc.summary.vatAmount).toBeCloseTo(20.000, 3);
      expect(orderCalc.summary.grandTotal).toBeCloseTo(20.000, 3);
    });

    it('2.5 User Image 3 in Inclusive priceView: Subtotal 33.000, Discount 13.000, Net Value 20.000, Grand Total 20.000', () => {
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('discCalc', 'Inclusive');

      const items = [
        {
          productId: 6,
          price: 11.000,
          quantity: 3,
          isIncl: true,
          product: { id: 6, name: 'DEMO', price: 11.000, vatValue: 10 },
        }
      ];

      const orderCalc = calculateOrder(items, {
        orderType: 'TakeOut',
        billDiscountValue: 13.000,
        billDiscountType: 'amount',
      });

      // Under Inclusive priceView:
      // Subtotal displays exclusive: 30.000
      expect(orderCalc.summary.subtotal).toBe(30.000);
      expect(orderCalc.summary.subTotalInclusive).toBe(33.000);

      // Discount displays exclusive: 11.818
      expect(orderCalc.summary.totalDiscount).toBeCloseTo(11.818, 3);
      expect(orderCalc.summary.totalDiscountIncl).toBe(13.000);

      // Grand Total is 20.000
      expect(orderCalc.summary.grandTotal).toBeCloseTo(20.000, 3);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. BACKEND PAYLOAD CONTRACT FOR DISCOUNTS
  // ══════════════════════════════════════════════════════════════════════════
  describe('3. Backend Contract: What went to backend shows in frontend', () => {
    it('3.1 Master discAmount must strictly be what was given (no division on payload)', () => {
      localStorage.setItem('discCalc', 'Exclusive');

      const cartDetails: any[] = [
        {
          productId: 6,
          quantity: 2,
          price: 10.000,
          basePrice: 10.000,
          isIncl: false,
          product: { id: 6, name: 'Demo Product', price: 10.000, vatValue: 10 },
        }
      ];

      const context: any = {
        cartDetails,
        subtotal: 20.000,
        discount: 10.000,
        tax: 1.000,
        charges: 0,
        totalServiceCharge: 0,
        totalLevy: 0,
        total: 11.000,
        deliveryCharge: 0,
        selectedOrderTypeName: 'Takeaway',
        selectedOrderTypeId: 2,
        billDiscountValue: 10.000,
        billDiscountType: 'amount',
      };

      const session: any = {
        userId: 1,
        employeeId: 1,
        customerId: 1,
        transDate: '2026-10-28T00:00:00.000Z',
      };

      const payload = buildDirectSettleOrderPayload(context, session);

      // What was given (10.000) goes directly to backend in Exclusive mode
      expect(payload.discAmount).toBe(10.000);
      expect(payload.billDiscount).toBe(10.000);
      expect(payload.billDiscountValue).toBe(10.000);
      expect(payload.vatExclAmount).toBe(10.000);
      expect(payload.vatAmount).toBe(1.000);
      expect(payload.netAmount).toBe(11.000);
    });

    it('3.2 Master discAmount under INCLUSIVE mode reduces VAT (e.g. 10.000 -> 9.0909091)', () => {
      localStorage.setItem('discCalc', 'Inclusive');

      const cartDetails: any[] = [
        {
          productId: 6,
          quantity: 2,
          price: 10.000,
          basePrice: 10.000,
          isIncl: false,
          product: { id: 6, name: 'Demo Product', price: 10.000, vatValue: 10 },
        }
      ];

      const context: any = {
        cartDetails,
        subtotal: 20.000,
        discount: 9.091,
        tax: 1.091,
        charges: 0,
        totalServiceCharge: 0,
        totalLevy: 0,
        total: 12.000,
        deliveryCharge: 0,
        selectedOrderTypeName: 'Takeaway',
        selectedOrderTypeId: 2,
        billDiscountValue: 10.000,
        billDiscountType: 'amount',
      };

      const session: any = {
        userId: 1,
        employeeId: 1,
        customerId: 1,
        transDate: '2026-10-28T00:00:00.000Z',
      };

      const payload = buildDirectSettleOrderPayload(context, session);

      // In Inclusive mode, discAmount sent to backend is 10 / 1.10 = 9.0909091 ("9. something")
      expect(payload.discAmount).toBeCloseTo(9.0909091, 5);
      expect(payload.billDiscount).toBeCloseTo(9.0909091, 5);
      expect(payload.billDiscountValue).toBe(10.000);
      // Taxable base: 20.000 - 9.0909091 = 10.9090909
      expect(payload.vatExclAmount).toBeCloseTo(10.9090909, 5);
      // VAT: 10% on 10.9090909 = 1.0909091
      expect(payload.vatAmount).toBeCloseTo(1.0909091, 5);
      // Net Amount: 10.9090909 + 1.0909091 = 12.000
      expect(payload.netAmount).toBe(12.000);
    });

    it('3.3 User Excel Sheet Verification (Item 1: 210 gross @ 5% VAT, Item 2: 50 gross @ 0% VAT, BillDisc: 5)', () => {
      // Test the exact scenario from user uploaded spreadsheet calc25-09-2026.xlsx
      // Column K: Item 1 gross = 210, Item 2 gross = 50. Total Gross = 260, BillDisc = 5
      // Column D: Item 1 base = 200, Item 2 base = 50. Total Base = 250
      const items = [
        {
          productId: 1,
          price: 210.000,
          quantity: 1,
          isIncl: true,
          vatRate: 5,
          product: { id: 1, name: 'Item 1', price: 210.000, vatValue: 5, isIncl: true },
        },
        {
          productId: 2,
          price: 50.000,
          quantity: 1,
          isIncl: true,
          vatRate: 0,
          product: { id: 2, name: 'Item 2', price: 50.000, vatValue: 0, isIncl: true },
        }
      ];

      // Test Table 1: Discount calculation under Inclusive mode (matches base deduction D14 = 4.8076923)
      localStorage.setItem('discCalc', 'Inclusive');
      const orderCalcTable1 = calculateOrder(items, {
        orderType: 'Takeaway',
        billDiscountValue: 5.000,
        billDiscountType: 'amount',
      });

      // Total Base: 250.000
      expect(orderCalcTable1.summary.subTotalExclusive).toBe(250.000);
      // Table 1 Item 1 base discount: 5 * (200 / 260) = 3.846154
      expect(orderCalcTable1.lines[0].billDiscountAmount).toBeCloseTo(3.846154, 3);
      // Table 1 Item 2 base discount: 5 * (50 / 260) = 0.961538
      expect(orderCalcTable1.lines[1].billDiscountAmount).toBeCloseTo(0.961538, 3);
      // Total Base Discount: 4.80769
      expect(orderCalcTable1.summary.totalDiscountExcl).toBeCloseTo(4.80769, 3);
      // Total Net Taxable Base: 245.1923
      expect(orderCalcTable1.summary.vatExclAmount).toBeCloseTo(245.1923, 3);
      // Total VAT: 9.807692
      expect(orderCalcTable1.summary.vatAmount).toBeCloseTo(9.807692, 3);
      // Grand Total Payable: 255.000 (Gross 260 - 5 = 255)
      expect(orderCalcTable1.summary.grandTotal).toBeCloseTo(255.000, 3);
    });
  });
});
