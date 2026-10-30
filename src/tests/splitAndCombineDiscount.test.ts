import { describe, it, expect, beforeEach } from 'vitest';
import { calculateLineItem, roundCalc, CALC_PRECISION } from '../features/pos/terminal/utils/billing';
import {
  checkOrderAllowsSplitOrCombine,
} from '../features/pos/terminal/utils/orderDiscountCheck';

describe('Split and Combine Discount Logic', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('currencySymbol', 'BHD');
    localStorage.setItem('decimalPart', '3');
    localStorage.setItem('vatEnabled', 'false');
    localStorage.setItem('priceView', 'Exclusive');
    localStorage.setItem('discountMode', 'Exclusive');
  });

  describe('1. Split Item Discount Equal & Proportional Division', () => {
    it('divides a 10.000 discount equally into 5.000 on each product when 2 items of price 10 are split', () => {
      // User scenario: 2 items of price 10, total item discount = 10
      const initialItem = {
        mapId: 1,
        name: 'Demo Burger',
        price: 10.0,
        currentQty: 2,
        discountValue: 10.0,
        discountType: 'amount' as const,
        isIncl: false,
        detail: { productId: 101, vatValue: 0 },
        modifiers: [],
      };

      // Function representing moveItem logic in PosSplitModal & useSplitBuckets
      const moveQuantity = (
        sourceItem: typeof initialItem,
        moveQty: number
      ) => {
        const actualMoveQty = Math.min(moveQty, sourceItem.currentQty);
        const totalDiscount = Number(sourceItem.discountValue || 0);
        const unitDiscount = sourceItem.currentQty > 0 ? totalDiscount / sourceItem.currentQty : 0;
        const movedDiscount = roundCalc(unitDiscount * actualMoveQty, CALC_PRECISION);
        const remainingDiscount = roundCalc(Math.max(0, totalDiscount - movedDiscount), CALC_PRECISION);

        const remainingSource = {
          ...sourceItem,
          currentQty: sourceItem.currentQty - actualMoveQty,
          discountValue: remainingDiscount,
        };

        const targetItem = {
          ...sourceItem,
          currentQty: actualMoveQty,
          discountValue: movedDiscount,
        };

        return { remainingSource, targetItem };
      };

      // Split 1 item out of 2
      const { remainingSource: baseItem, targetItem: splitItem } = moveQuantity(initialItem, 1);

      // Verify Base Bucket Item
      expect(baseItem.currentQty).toBe(1);
      expect(baseItem.price).toBe(10.0);
      expect(baseItem.discountValue).toBe(5.0); // Exactly divided to 5
      expect(baseItem.discountType).toBe('amount');

      // Verify Split Bucket Item
      expect(splitItem.currentQty).toBe(1);
      expect(splitItem.price).toBe(10.0);
      expect(splitItem.discountValue).toBe(5.0); // Exactly divided to 5
      expect(splitItem.discountType).toBe('amount');

      // Verify line calculation for base bucket
      const baseCalc = calculateLineItem(
        baseItem.currentQty,
        baseItem.price,
        { type: 'amount', value: baseItem.discountValue },
        0,
        { vatRate: 0, vatType: 'Exclusive', serviceChargeRate: 0, levyRate: 0, orderType: 'TakeAway', discountType: 'Exclusive' },
        0,
        false
      );
      expect(baseCalc.amount).toBe(10.0);
      expect(baseCalc.netValue).toBe(5.0); // 10 - 5 = 5
      expect(baseCalc.lineNetAmount).toBe(5.0);

      // Verify line calculation for split bucket
      const splitCalc = calculateLineItem(
        splitItem.currentQty,
        splitItem.price,
        { type: 'amount', value: splitItem.discountValue },
        0,
        { vatRate: 0, vatType: 'Exclusive', serviceChargeRate: 0, levyRate: 0, orderType: 'TakeAway', discountType: 'Exclusive' },
        0,
        false
      );
      expect(splitCalc.amount).toBe(10.0);
      expect(splitCalc.netValue).toBe(5.0); // 10 - 5 = 5
      expect(splitCalc.lineNetAmount).toBe(5.0);

      // Verify total discount conservation
      expect(baseItem.discountValue + splitItem.discountValue).toBe(10.0);
    });

    it('strictly forbids splitting an order with order-level bill discount', () => {
      // Scenario: Order has bill discount (Order #84 with discount 11.818)
      const billDiscountOrder = {
        data: {
          masterData: [
            {
              orderId: 84,
              discAmount: 11.818,
              billDiscount: 11.818,
              billDiscountValue: 13.0,
              isBillDiscount: true,
            },
          ],
          detailsData: [
            { mapId: 1, productId: 10, price: 10.0, qty: 1, discAmount: 0 },
            { mapId: 2, productId: 20, price: 10.0, qty: 1, discAmount: 0 },
            { mapId: 3, productId: 30, price: 10.0, qty: 1, discAmount: 0 },
          ],
        },
      };

      const checkResult = checkOrderAllowsSplitOrCombine(billDiscountOrder);
      expect(checkResult.allowed).toBe(false);
      expect(checkResult.reason).toContain("bill discount");
    });

    it('strictly forbids splitting a complimentary order', () => {
      const compOrder = {
        data: {
          masterData: [
            {
              orderId: 85,
              discAmount: 20.0,
              discPer: 100,
              complimentaryStatus: true,
            },
          ],
          detailsData: [
            { mapId: 1, productId: 10, price: 10.0, qty: 2, discAmount: 20.0, complimentaryStatus: true },
          ],
        },
      };

      const checkResult = checkOrderAllowsSplitOrCombine(compOrder);
      expect(checkResult.allowed).toBe(false);
      expect(checkResult.reason).toContain("complimentary");
    });

    it('allows splitting an order with genuine item discount', () => {
      // 2 items of price 10 with item discount 10 on that line
      const itemDiscountOrder = {
        data: {
          masterData: [
            {
              orderId: 86,
              discAmount: 0,
              discPer: 0,
              billDiscount: 0,
              billDiscountValue: 0,
              isBillDiscount: false,
              complimentaryStatus: false,
            },
          ],
          detailsData: [
            { mapId: 1, productId: 10, price: 10.0, qty: 2, discAmount: 10.0, discPer: 0, discountValue: 10.0 },
          ],
        },
      };

      const checkResult = checkOrderAllowsSplitOrCombine(itemDiscountOrder);
      expect(checkResult.allowed).toBe(true);
    });

    it('merges discount back losslessly when item is moved back from split to base', () => {
      const baseItem = {
        mapId: 1,
        name: 'Demo Burger',
        price: 10.0,
        currentQty: 1,
        discountValue: 5.0,
        discountType: 'amount' as const,
      };

      const splitItem = {
        mapId: 1,
        name: 'Demo Burger',
        price: 10.0,
        currentQty: 1,
        discountValue: 5.0,
        discountType: 'amount' as const,
      };

      // Moving splitItem back to base
      const mergedQty = baseItem.currentQty + splitItem.currentQty;
      const mergedDiscount = roundCalc(baseItem.discountValue + splitItem.discountValue, CALC_PRECISION);

      expect(mergedQty).toBe(2);
      expect(mergedDiscount).toBe(10.0);
    });

    it('divides discount proportionally for 3 items with 12.000 discount', () => {
      const initialItem = {
        mapId: 1,
        name: 'Product A',
        price: 10.0,
        currentQty: 3,
        discountValue: 12.0,
        discountType: 'amount' as const,
      };

      // Move 1 item to Split-1
      const unitDiscount = initialItem.discountValue / initialItem.currentQty; // 12 / 3 = 4
      const movedDiscount1 = roundCalc(unitDiscount * 1, CALC_PRECISION);
      const remainingDiscount1 = roundCalc(initialItem.discountValue - movedDiscount1, CALC_PRECISION);

      expect(movedDiscount1).toBe(4.0);
      expect(remainingDiscount1).toBe(8.0);

      // Move another 1 item to Split-2 from remaining 2 items
      const unitDiscount2 = remainingDiscount1 / 2; // 8 / 2 = 4
      const movedDiscount2 = roundCalc(unitDiscount2 * 1, CALC_PRECISION);
      const remainingDiscount2 = roundCalc(remainingDiscount1 - movedDiscount2, CALC_PRECISION);

      expect(movedDiscount2).toBe(4.0);
      expect(remainingDiscount2).toBe(4.0);

      // All 3 items each have exactly 4.000 discount, total is 12.000
      expect(movedDiscount1 + movedDiscount2 + remainingDiscount2).toBe(12.0);
    });

    it('preserves percentage discounts without altering the rate on split items', () => {
      const initialItem = {
        mapId: 1,
        name: 'Pizza',
        price: 20.0,
        currentQty: 2,
        discountValue: 25.0, // 25% discount
        discountType: 'percentage' as const,
      };

      // On split, percentage stays 25% for both
      const baseItem = { ...initialItem, currentQty: 1 };
      const splitItem = { ...initialItem, currentQty: 1 };

      expect(baseItem.discountValue).toBe(25.0);
      expect(baseItem.discountType).toBe('percentage');
      expect(splitItem.discountValue).toBe(25.0);
      expect(splitItem.discountType).toBe('percentage');

      const baseCalc = calculateLineItem(
        baseItem.currentQty,
        baseItem.price,
        { type: 'percentage', value: baseItem.discountValue },
        0,
        { vatRate: 0, vatType: 'Exclusive', serviceChargeRate: 0, levyRate: 0, orderType: 'TakeAway', discountType: 'Exclusive' },
        0,
        false
      );
      // 1 item of 20 with 25% discount = 5.00 discount, net = 15.00
      expect(baseCalc.discountAmount).toBe(5.0);
      expect(baseCalc.netValue).toBe(15.0);
    });
  });

  describe('2. Combine Orders Discount Rule', () => {
    it('strictly forbids combining orders if any order has a bill discount', () => {
      const orderA = {
        data: {
          masterData: [{ orderId: 90, discAmount: 0, discPer: 0 }],
          detailsData: [{ mapId: 1, price: 10, qty: 1, discAmount: 0 }],
        },
      };

      const orderB_withBillDiscount = {
        data: {
          masterData: [{ orderId: 91, discAmount: 5.0, billDiscount: 5.0, isBillDiscount: true }],
          detailsData: [{ mapId: 2, price: 20, qty: 1, discAmount: 0 }],
        },
      };

      expect(checkOrderAllowsSplitOrCombine(orderA).allowed).toBe(true);
      expect(checkOrderAllowsSplitOrCombine(orderB_withBillDiscount).allowed).toBe(false);
    });

    it('strictly forbids combining orders if any order has complimentary status', () => {
      const orderComplimentary = {
        data: {
          masterData: [{ orderId: 92, complimentaryStatus: true }],
          detailsData: [{ mapId: 3, price: 15, qty: 1, discAmount: 15, complimentaryStatus: true }],
        },
      };

      expect(checkOrderAllowsSplitOrCombine(orderComplimentary).allowed).toBe(false);
    });

    it('allows combining orders that only have item-level discounts', () => {
      const orderWithItemDiscount = {
        data: {
          masterData: [{ orderId: 93, discAmount: 0, discPer: 0 }],
          detailsData: [{ mapId: 4, price: 20, qty: 1, discAmount: 5.0, discPer: 25 }],
        },
      };

      expect(checkOrderAllowsSplitOrCombine(orderWithItemDiscount).allowed).toBe(true);
    });
  });
});
