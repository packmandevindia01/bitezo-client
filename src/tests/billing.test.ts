import { describe, it, expect, beforeEach } from 'vitest';
import {
  calculateLineItem,
  calculateOrder,
  type BillingConfig
} from '../features/pos/terminal/utils/billing';

describe('POS Calculation Engine (billing.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vat', '10');
    localStorage.setItem('serviceCharges', '10');
    localStorage.setItem('levy', '5');
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. PRICING MODES (Exclusive vs Inclusive)
  // ──────────────────────────────────────────────────────────────────────────
  describe('1. Pricing Modes (Exclusive vs Inclusive)', () => {
    it('1.1 should calculate standard Exclusive pricing correctly on Dine-In', () => {
      // Net = 10.000, SC(10%) = 1.000, Levy(5% on 11.000) = 0.550, VAT(10% on 11.550) = 1.155, Total = 12.705
      const config: BillingConfig = {
        serviceChargeRate: 0.10,
        levyRate: 0.05,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Inclusive',
        orderType: 'DineIn',
      };

      const result = calculateLineItem(1, 10.000, 0, 0, config, 10, false);
      expect(result.basePrice).toBe(10.000);
      expect(result.baseAmount).toBe(10.000);
      expect(result.netValue).toBe(10.000);
      expect(result.sc).toBe(1.000);
      expect(result.levy).toBe(0.550);
      expect(result.vatAmount).toBe(1.155);
      expect(result.lineNetAmount).toBe(12.705);
    });

    it('1.2 should reverse-calculate Base Price on Inclusive Dine-In without double-adding tax', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0.10,
        levyRate: 0.05,
        vatRate: 0.10,
        vatType: 'Inclusive',
        discountType: 'Inclusive',
        orderType: 'DineIn',
      };

      // In inclusive view, product includes SC (10%), Levy (5%) and VAT (10%): reverse-calculated backwards from 11.000 to base 8.6580087
      const result = calculateLineItem(1, 11.000, 0, 0, config, 10, true);
      expect(result.basePrice).toBeCloseTo(8.6580087, 5);
      expect(result.sc).toBeCloseTo(0.8658009, 4);
      expect(result.levy).toBeCloseTo(0.4761905, 4);
      expect(result.vatAmount).toBeCloseTo(1.0000000, 4);
      expect(result.lineNetAmount).toBe(11.000);
    });

    it('1.3 should handle per-item override (isIncl: true in Exclusive bill)', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Inclusive',
        orderType: 'Takeaway',
      };

      // Line item is explicitly Inclusive (11.000 BHD gross)
      const result = calculateLineItem(1, 11.000, 0, 0, config, 10, true);
      expect(result.basePrice).toBe(10.000);
      expect(result.vatAmount).toBe(1.000);
      expect(result.lineNetAmount).toBe(11.000);
    });

    it('1.4 should handle per-item override (isIncl: false in Inclusive bill)', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0.10,
        vatType: 'Inclusive',
        discountType: 'Inclusive',
        orderType: 'Takeaway',
      };

      // Line item is explicitly Exclusive (10.000 BHD base)
      const result = calculateLineItem(1, 10.000, 0, 0, config, 10, false);
      expect(result.basePrice).toBe(10.000);
      expect(result.vatAmount).toBe(1.000);
      expect(result.lineNetAmount).toBe(11.000);
    });

    it('1.5 should handle zero VAT / tax-exempt item (vatRate = 0)', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0,
        vatType: 'Exclusive',
        discountType: 'Inclusive',
        orderType: 'Takeaway',
      };

      const result = calculateLineItem(1, 10.000, 0, 0, config, 0, false);
      expect(result.vatAmount).toBe(0);
      expect(result.lineNetAmount).toBe(10.000);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 2. ORDER TYPES & SURCHARGES
  // ──────────────────────────────────────────────────────────────────────────
  describe('2. Order Types & Surcharges', () => {
    it('2.1 should not apply Service Charge to Takeaway orders', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0.10,
        levyRate: 0.05,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Inclusive',
        orderType: 'Takeaway',
      };

      const result = calculateLineItem(1, 10.000, 0, 0, config, 10, false);
      expect(result.sc).toBe(0);
      expect(result.levy).toBe(0.500); // 5% on 10.000
      expect(result.vatAmount).toBe(1.050); // 10% on 10.500
      expect(result.lineNetAmount).toBe(11.550);
    });

    it('2.2 should include Delivery Charge in Grand Total for Delivery orders', () => {
      localStorage.setItem('priceView', 'Exclusive');
      const items = [{
        productId: 1,
        price: 10.000,
        quantity: 1,
        isIncl: false,
      }];

      const orderCalc = calculateOrder(items, {
        orderType: 'Delivery',
        orderTypeId: 4,
        customDeliveryCharge: 1.500,
      });

      expect(orderCalc.summary.subtotal).toBe(10.000);
      expect(orderCalc.summary.deliveryCharge).toBe(1.500);
      // Net without delivery = 10.000 base + 1.000 VAT = 11.000
      // With delivery = 11.000 + 1.500 = 12.500
      expect(orderCalc.summary.grandTotal).toBe(12.500);
    });

    it('2.3 should not apply Service Charge to Drive-Thru orders', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0.10,
        levyRate: 0.05,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Inclusive',
        orderType: 'DriveThru',
      };

      const result = calculateLineItem(1, 10.000, 0, 0, config, 10, false);
      expect(result.sc).toBe(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 3. DISCOUNT CALCULATION RULES (Inclusive vs Exclusive)
  // ──────────────────────────────────────────────────────────────────────────
  describe('3. Discount Calculation Rules (Inclusive vs Exclusive)', () => {
    it('3.1 when Discount Calculation is Exclusive, discount 1.000 must be applied as exactly 1.000', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Exclusive',
        orderType: 'Takeaway',
      };

      // Raw discount is 1.000
      const result = calculateLineItem(1, 10.000, { type: 'amount', value: 1.000 }, 0, config, 10, false);
      expect(result.discountAmount).toBe(1.000);
      expect(result.netValue).toBe(9.000);
      expect(result.vatAmount).toBe(0.900);
      expect(result.lineNetAmount).toBe(9.900);
    });

    it('3.2 when Discount Calculation is Inclusive, discount 1.000 reduces VAT amount (shows ~0.909)', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Inclusive',
        orderType: 'Takeaway',
      };

      // 1.000 / (1 + 0.10) = 0.9090909
      const result = calculateLineItem(1, 10.000, { type: 'amount', value: 1.000 }, 0, config, 10, false);
      expect(result.discountAmount).toBeCloseTo(0.909, 3);
      expect(result.netValue).toBeCloseTo(9.091, 3);
      expect(result.lineNetAmount).toBeCloseTo(10.000, 3); // 11.000 - 1.000 = 10.000
    });

    it('3.3 should handle percentage discount (e.g. 20%)', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Exclusive',
        orderType: 'Takeaway',
      };

      const result = calculateLineItem(1, 10.000, { type: 'percentage', value: 20 }, 0, config, 10, false);
      expect(result.discountAmount).toBe(2.000);
      expect(result.netValue).toBe(8.000);
      expect(result.vatAmount).toBe(0.800);
      expect(result.lineNetAmount).toBe(8.800);
    });

    it('3.4 should handle 100% complimentary bill discount (Net = 0, VAT = 0)', () => {
      localStorage.setItem('priceView', 'Exclusive');
      const items = [{
        productId: 1,
        price: 20.000,
        quantity: 1,
        isIncl: false,
      }];

      const orderCalc = calculateOrder(items, {
        orderType: 'Takeaway',
        billDiscountValue: 100,
        billDiscountType: 'percentage',
      });

      expect(orderCalc.summary.grandTotal).toBe(0);
      expect(orderCalc.summary.vatAmount).toBe(0);
      expect(orderCalc.summary.totalDiscount).toBe(20.000);
    });

    it('3.5 should distribute flat bill discount across lines with remainder allocation', () => {
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('discCalc', 'Exclusive');
      const items = [
        { productId: 1, price: 10.000, quantity: 1, isIncl: false },
        { productId: 2, price: 10.000, quantity: 1, isIncl: false },
        { productId: 3, price: 10.000, quantity: 1, isIncl: false },
      ];

      // Flat bill discount of 10.000 across 3 items
      const orderCalc = calculateOrder(items, {
        orderType: 'Takeaway',
        billDiscountValue: 10.000,
        billDiscountType: 'amount',
      });

      const totalAllocated = orderCalc.lines.reduce((sum, l) => sum + (l.billDiscountAmount || 0), 0);
      expect(totalAllocated).toBeCloseTo(10.000, 3);
      expect(orderCalc.summary.totalDiscount).toBeCloseTo(10.000, 3);
      expect(orderCalc.summary.subtotal).toBe(30.000);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 4. EXTRAS & MODIFIERS
  // ──────────────────────────────────────────────────────────────────────────
  describe('4. Extras & Modifiers', () => {
    it('4.1 should include extras in gross amount before calculating taxes', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Inclusive',
        orderType: 'Takeaway',
      };

      // Base price 10.000 + 2 extras @ 0.500 = 11.000 total base
      const result = calculateLineItem(1, 10.000, 0, 1.000, config, 10, false);
      expect(result.amount).toBe(11.000);
      expect(result.vatAmount).toBe(1.100);
      expect(result.lineNetAmount).toBe(12.100);
    });

    it('4.2 should extract base extra proportionally on inclusive item', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0.10,
        vatType: 'Inclusive',
        discountType: 'Inclusive',
        orderType: 'Takeaway',
      };

      // Item 11.000 incl + 1.100 extra incl = 12.100 gross
      // Base should be 10.000 + 1.000 = 11.000
      const result = calculateLineItem(1, 11.000, 0, 1.100, config, 10, true);
      expect(result.basePrice).toBe(10.000);
      expect(result.amount).toBe(11.000);
      expect(result.lineNetAmount).toBe(12.100);
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 5. BOUNDARY & EDGE CASES
  // ──────────────────────────────────────────────────────────────────────────
  describe('5. Boundary & Edge Cases', () => {
    it('5.1 should cap discount so net value cannot become negative', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Inclusive',
        orderType: 'Takeaway',
      };

      // Item is 5.000, discount entered is 10.000
      const result = calculateLineItem(1, 5.000, { type: 'amount', value: 10.000 }, 0, config, 10, false);
      expect(result.discountAmount).toBe(5.000);
      expect(result.netValue).toBe(0);
      expect(result.lineNetAmount).toBe(0);
    });

    it('5.2 should handle fractional weighted quantities (e.g. 0.375 kg)', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Inclusive',
        orderType: 'Takeaway',
      };

      const result = calculateLineItem(0.375, 4.800, 0, 0, config, 10, false);
      expect(result.amount).toBe(1.800); // 0.375 * 4.800
      expect(result.vatAmount).toBe(0.180);
      expect(result.lineNetAmount).toBe(1.980);
    });

    it('5.3 should handle micro-quantities (e.g. 0.005 kg)', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0,
        levyRate: 0,
        vatRate: 0.10,
        vatType: 'Exclusive',
        discountType: 'Inclusive',
        orderType: 'Takeaway',
      };

      const result = calculateLineItem(0.005, 12.000, 0, 0, config, 10, false);
      expect(result.amount).toBe(0.060);
      expect(result.vatAmount).toBe(0.006);
      expect(result.lineNetAmount).toBe(0.066);
    });

    it('5.4 should handle zero-price promo items without errors', () => {
      const config: BillingConfig = {
        serviceChargeRate: 0.10,
        levyRate: 0.05,
        vatRate: 0.10,
        vatType: 'Inclusive',
        discountType: 'Inclusive',
        orderType: 'DineIn',
      };

      const result = calculateLineItem(1, 0, 0, 0, config, 10, true);
      expect(result.basePrice).toBe(0);
      expect(result.lineNetAmount).toBe(0);
      expect(result.vatAmount).toBe(0);
    });

    it('5.5 should handle mixed VAT rates in the same order (10% and 0% exempt)', () => {
      localStorage.setItem('priceView', 'Exclusive');
      const items = [
        { productId: 1, price: 10.000, quantity: 1, isIncl: false, vatValue: 10 },
        { productId: 2, price: 20.000, quantity: 1, isIncl: false, vatValue: 0 },
      ];

      const orderCalc = calculateOrder(items, {
        orderType: 'Takeaway',
      });

      expect(orderCalc.summary.subtotal).toBe(30.000);
      // Item 1 VAT = 1.000, Item 2 VAT = 0.000 -> Total VAT = 1.000
      expect(orderCalc.summary.vatAmount).toBe(1.000);
      // Total = 30.000 + 1.000 = 31.000
      expect(orderCalc.summary.grandTotal).toBe(31.000);
    });
  });
});
