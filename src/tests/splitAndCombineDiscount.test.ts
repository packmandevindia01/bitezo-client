import { describe, it, expect, beforeEach } from 'vitest';
import { calculateLineItem, roundCalc, CALC_PRECISION } from '../features/pos/terminal/utils/billing';
import {
  splitCombineDiscountStatus,
  stripBillDiscountFromCombinedLines,
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

    it('asks to remove the bill discount (instead of blocking) when splitting a bill-discount order', () => {
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

      expect(splitCombineDiscountStatus(billDiscountOrder)).toBe("billDiscount");
    });

    it('treats a bill complimentary (100 % bill discount) like a bill discount', () => {
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

      expect(splitCombineDiscountStatus(compOrder)).toBe("billDiscount");
    });

    it("still blocks an order with item complimentary", () => {
      const itemCompOrder = {
        data: {
          masterData: [{ orderId: 87, discAmount: 0, discPer: 0, isBillDiscount: false, complimentaryStatus: false }],
          detailsData: [
            { mapId: 1, productId: 10, price: 10.0, qty: 1, discPer: 100, discAmount: 10.0, complimentaryStatus: true },
            { mapId: 2, productId: 20, price: 5.0, qty: 1, discPer: 0, discAmount: 0 },
          ],
        },
      };
      expect(splitCombineDiscountStatus(itemCompOrder)).toBe("complimentary");
    });

    it("blocks when every item was made complimentary one by one (no master discount)", () => {
      const allItemsComp = {
        data: {
          masterData: [{ orderId: 88, discAmount: 0, discPer: 0, isBillDiscount: false, complimentaryStatus: true }],
          detailsData: [{ mapId: 1, productId: 10, price: 10.0, qty: 1, discPer: 100, discAmount: 10.0, complimentaryStatus: true }],
        },
      };
      expect(splitCombineDiscountStatus(allItemsComp)).toBe("complimentary");
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

      expect(splitCombineDiscountStatus(itemDiscountOrder)).toBe("ok");
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
    it('asks to remove the bill discount when any order to combine has one', () => {
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

      expect(splitCombineDiscountStatus(orderA)).toBe("ok");
      expect(splitCombineDiscountStatus(orderB_withBillDiscount)).toBe("billDiscount");
      expect(splitCombineDiscountStatus(orderA, orderB_withBillDiscount)).toBe("billDiscount");
    });

    it('strictly forbids combining orders if any order has complimentary status', () => {
      const orderComplimentary = {
        data: {
          masterData: [{ orderId: 92, complimentaryStatus: true }],
          detailsData: [{ mapId: 3, price: 15, qty: 1, discAmount: 15, complimentaryStatus: true }],
        },
      };

      expect(splitCombineDiscountStatus(orderComplimentary)).toBe("complimentary");
    });

    it('allows combining orders that only have item-level discounts', () => {
      const orderWithItemDiscount = {
        data: {
          masterData: [{ orderId: 93, discAmount: 0, discPer: 0 }],
          detailsData: [{ mapId: 4, price: 20, qty: 1, discAmount: 5.0, discPer: 25 }],
        },
      };

      expect(splitCombineDiscountStatus(orderWithItemDiscount)).toBe("ok");
    });

    it("removes the bill discount only from lines of the bill-discount orders", () => {
      const combinedLines = [
        { orderId: 90, id: 1, mapId: 1000, price: 10, qty: 1, discPer: 25, discAmount: 2.5 }, // item discount, kept
        { orderId: 91, id: 2, mapId: 1001, price: 20, qty: 1, discPer: 10, discAmount: 2 },  // bill discount, removed
        { orderId: 91, id: 3, mapId: 1002, price: 30, qty: 1, discPer: 10, discAmount: 3 },  // bill discount, removed
      ];
      const out = stripBillDiscountFromCombinedLines(combinedLines, new Set([91]));
      expect(out[0]).toEqual(combinedLines[0]);
      expect(out[1]).toMatchObject({ discPer: 0, discAmount: 0, price: 20, qty: 1 });
      expect(out[2]).toMatchObject({ discPer: 0, discAmount: 0, price: 30, qty: 1 });
    });

    it("removes bill complimentary from the lines of that order", () => {
      const lines = [
        { orderId: 95, id: 1, mapId: 1, price: 10, qty: 1, discPer: 100, discAmount: 10, complimentaryStatus: true },
        { orderId: 96, id: 2, mapId: 2, price: 10, qty: 1, discPer: 0, discAmount: 0, complimentaryStatus: false },
      ];
      const out = stripBillDiscountFromCombinedLines(lines, new Set([95]));
      expect(out[0]).toMatchObject({ discPer: 0, discAmount: 0, complimentaryStatus: false });
      expect(out[1]).toEqual(lines[1]);
    });

    it("falls back to detail ids when combined lines have no orderId", () => {
      const lines = [
        { id: 7, mapId: 1, price: 10, qty: 1, discAmount: 1 },
        { id: 8, mapId: 2, price: 10, qty: 1, discAmount: 1 },
      ];
      const out = stripBillDiscountFromCombinedLines(lines, new Set(), new Set([8]));
      expect(out[0].discAmount).toBe(1);
      expect(out[1].discAmount).toBe(0);
    });
  });
});
