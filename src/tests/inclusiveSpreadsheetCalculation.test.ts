import { describe, it, expect, beforeEach } from 'vitest';
import { calculateOrder, type BillingConfig } from '../features/pos/terminal/utils/billing';

describe('Price View Inclusive Master Calculation (calculation.xlsx)', () => {
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

  it('1. Exact Excel tab "Inclusive" (calculation.xlsx): 4 @ 11 and 2 @ 15 in Dine-In', () => {
    const dineInConfig: BillingConfig = {
      serviceChargeRate: 0.10, // 10%
      levyRate: 0.05,          // 5%
      vatRate: 0.10,           // 10%
      vatType: 'Inclusive',
      discountType: 'Inclusive',
      orderType: 'DineIn',
    };

    const cartItems = [
      {
        productId: 1,
        name: 'DEMO',
        price: 11,
        quantity: 4,
        product: { id: 1, name: 'DEMO', price: 11, vatValue: 10 },
      },
      {
        productId: 2,
        name: 'ITEM 2',
        price: 15,
        quantity: 2,
        product: { id: 2, name: 'ITEM 2', price: 15, vatValue: 10 },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: dineInConfig,
      orderType: 'DineIn',
    });

    const [line1, line2] = result.lines;

    // Line 1: 4 @ 11.000 = 44.000
    // Excel Row 7: Excl Price: 8.658008658, Excl amnt: 34.63203, Service: 3.463203, Levy: 1.904762, Vat Excl: 40, vat: 4, netamnt: 44
    expect(line1.price).toBe(11);
    expect(line1.lineTotal).toBe(44);
    expect(line1.basePrice).toBeCloseTo(8.658008658, 6);
    expect(line1.amount).toBeCloseTo(34.6320346, 4);
    expect(line1.sc).toBeCloseTo(3.4632035, 4);
    expect(line1.levy).toBeCloseTo(1.9047619, 4);
    expect(line1.vatAmount).toBeCloseTo(4.0000000, 4);
    expect(line1.lineNetAmount).toBe(44);

    // Line 2: 2 @ 15.000 = 30.000
    // Excel Row 9: Excl Price: 11.80637544, Excl amnt: 23.61275, Service: 2.361275, Levy: 1.298701, Vat Excl: 27.27273, vat: 2.727273, netamnt: 30
    expect(line2.price).toBe(15);
    expect(line2.lineTotal).toBe(30);
    expect(line2.basePrice).toBeCloseTo(11.80637544, 6);
    expect(line2.amount).toBeCloseTo(23.6127509, 4);
    expect(line2.sc).toBeCloseTo(2.3612751, 4);
    expect(line2.levy).toBeCloseTo(1.2987013, 4);
    expect(line2.vatAmount).toBeCloseTo(2.7272727, 4);
    expect(line2.lineNetAmount).toBe(30);

    // Summary (Excel Rows 11-16):
    // SubTotal: 58.24479
    expect(result.summary.subtotal).toBeCloseTo(58.2447855, 4);
    // Service Charge sum: 5.8244786
    expect(result.summary.serviceCharge).toBeCloseTo(5.8244786, 4);
    // Levy sum: 3.2034632
    expect(result.summary.levy).toBeCloseTo(3.2034632, 4);
    // Charges(Levy+Service): 9.0279418
    expect(result.summary.charges).toBeCloseTo(9.0279418, 4);
    // Net Value (vatExclAmount): 67.2727273
    expect(result.summary.vatExclAmount).toBeCloseTo(67.2727273, 4);
    // Vat: 6.7272727
    expect(result.summary.vatAmount).toBeCloseTo(6.7272727, 4);
    // Grand Total: 74
    expect(result.summary.grandTotal).toBe(74);

    // Verify mathematical identity:
    // SubTotal + Charges = Net Value
    expect(result.summary.subtotal + result.summary.charges).toBeCloseTo(result.summary.vatExclAmount, 5);
    // Net Value + VAT = Grand Total
    expect(result.summary.vatExclAmount + result.summary.vatAmount).toBeCloseTo(result.summary.grandTotal, 5);
  });

  it('2. User TakeOut screen: 3 DEMO @ 11.000 with 10% Levy and 10% VAT', () => {
    const takeOutConfig: BillingConfig = {
      serviceChargeRate: 0.10, // Not applied to TakeOut
      levyRate: 0.10,          // 10%
      vatRate: 0.10,           // 10%
      vatType: 'Inclusive',
      discountType: 'Inclusive',
      orderType: 'TakeOut',
    };

    const cartItems = [
      {
        productId: 6,
        name: 'DEMO',
        price: 11,
        quantity: 3,
        product: { id: 6, name: 'DEMO', price: 11, vatValue: 10 },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    expect(line.price).toBe(11);
    expect(line.lineTotal).toBe(33);
    expect(line.lineNetAmount).toBe(33);

    // Reverse breakdown:
    // Vat Excl: 33 / 1.10 = 30.000
    // Vat: 3.000
    // Base before Levy: 30 / 1.10 = 27.272727...
    // Levy: 2.727273...
    // Service Charge: 0 (TakeOut)
    expect(line.amount).toBeCloseTo(27.272727, 4);
    expect(line.levy).toBeCloseTo(2.727273, 4);
    expect(line.sc).toBe(0);
    expect(line.vatAmount).toBeCloseTo(3.000000, 4);

    // Summary footer on POS:
    // Sub Total: 27.273
    expect(result.summary.subtotal).toBeCloseTo(27.272727, 3);
    // Charges: 2.727
    expect(result.summary.charges).toBeCloseTo(2.727273, 3);
    // Net Value: 30.000
    expect(result.summary.vatExclAmount).toBeCloseTo(30.000000, 3);
    // VAT: 3.000
    expect(result.summary.vatAmount).toBeCloseTo(3.000000, 3);
    // Grand Total: 33.000
    expect(result.summary.grandTotal).toBe(33);

    expect(result.summary.subtotal + result.summary.charges).toBeCloseTo(30.000, 3);
  });

  it('3. User TakeOut screen in Image 3: 4 DEMO @ 10.000 with 10% Levy and 10% VAT', () => {
    const takeOutConfig: BillingConfig = {
      serviceChargeRate: 0.10,
      levyRate: 0.10,
      vatRate: 0.10,
      vatType: 'Inclusive',
      discountType: 'Inclusive',
      orderType: 'TakeOut',
    };

    const cartItems = [
      {
        productId: 6,
        name: 'DEMO',
        price: 10,
        quantity: 4,
        product: { id: 6, name: 'DEMO', price: 10, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    expect(line.price).toBe(10);
    expect(line.lineTotal).toBe(40);

    // Matches Image 3 screenshot exactly:
    // Sub Total: 33.058
    expect(result.summary.subtotal).toBeCloseTo(33.057851, 3);
    // Charges: 3.306
    expect(result.summary.charges).toBeCloseTo(3.305785, 3);
    // Net Value: 36.364
    expect(result.summary.vatExclAmount).toBeCloseTo(36.363636, 3);
    // VAT: 3.636
    expect(result.summary.vatAmount).toBeCloseTo(3.636364, 3);
    // Grand Total: 40.000
    expect(result.summary.grandTotal).toBe(40);
  });

  it('4. User screenshot media_1793269090175_2006eb9b.png: 2 DEMO @ 10.000 exclusive base in TakeOut with 10% Levy and 10% VAT -> Price displays 12.100 so qty * price = total (2 * 12.100 = 24.200)', () => {
    const takeOutConfig: BillingConfig = {
      serviceChargeRate: 0.10, // Not applied to TakeOut
      levyRate: 0.10,          // 10% Levy
      vatRate: 0.10,           // 10% VAT
      vatType: 'Inclusive',
      discountType: 'Inclusive',
      orderType: 'TakeOut',
    };

    // Product DEMO in catalog has price = 10.000, [ ] INCL is unchecked (isIncl = false)
    const cartItems = [
      {
        productId: 6,
        name: 'DEMO',
        price: 10,
        quantity: 2,
        isIncl: false,
        product: { id: 6, name: 'DEMO', price: 10, vatValue: 10, isIncl: false },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // Base exclusive unit is 10.000
    expect(line.basePrice).toBe(10);
    expect(line.amount).toBe(20);
    expect(line.levy).toBe(2);
    expect(line.sc).toBe(0);
    expect(line.vatAmount).toBe(2.2);
    expect(line.lineNetAmount).toBe(24.2);

    // CRITICAL: Display price per unit MUST BE 12.100 so qty * price = lineTotal (2 * 12.100 = 24.200)
    expect(line.price).toBeCloseTo(12.100, 3);
    expect(line.lineTotal).toBeCloseTo(24.200, 3);
    expect(line.quantity * line.price).toBeCloseTo(line.lineTotal, 3);

    // Summary footer on POS:
    // Sub Total: 20.000
    expect(result.summary.subtotal).toBe(20);
    // Charges: 2.000
    expect(result.summary.charges).toBe(2);
    // Net Value: 22.000
    expect(result.summary.vatExclAmount).toBe(22);
    // VAT: 2.200
    expect(result.summary.vatAmount).toBe(2.2);
    // Grand Total: 24.200
    expect(result.summary.grandTotal).toBe(24.2);
  });

  it('5. User screenshots (Bill-wise discount with Discount Calculation: Inclusive): Displays whatever discount value was typed (10.000)', () => {
    const takeOutConfig: BillingConfig = {
      serviceChargeRate: 0.10, // Not applied to TakeOut
      levyRate: 0.10,          // 10% Levy
      vatRate: 0.10,           // 10% VAT
      vatType: 'Inclusive',
      discountType: 'Inclusive', // Discount Calculation: Inclusive
      orderType: 'TakeOut',
    };

    const cartItems = [
      {
        productId: 6,
        name: 'DEMO',
        price: 10,
        quantity: 2,
        isIncl: false,
        product: { id: 6, name: 'DEMO', price: 10, vatValue: 10, isIncl: false },
      },
    ];

    // Apply flat 10.000 bill-wise discount
    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
      billDiscountValue: 10,
      billDiscountType: 'amount',
    });

    // In summary panel, discount displays the exclusive discount amount (10.000 / 1.21 = 8.264)
    expect(result.summary.billDiscountTotal).toBeCloseTo(8.264, 3);
    expect(result.summary.totalDiscount).toBeCloseTo(8.264, 3);

    // Summary values:
    expect(result.summary.subtotal).toBe(20);
    expect(result.summary.charges).toBeCloseTo(1.174, 3);
    expect(result.summary.vatExclAmount).toBeCloseTo(12.909, 3);
    expect(result.summary.vatAmount).toBeCloseTo(1.291, 3);
    expect(result.summary.grandTotal).toBeCloseTo(14.201, 3);
  });

  it('6. User screenshot: Item-level discount with Discount Calculation: Inclusive displays typed value (10.000)', () => {
    const takeOutConfig: BillingConfig = {
      serviceChargeRate: 0.10,
      levyRate: 0.10,          // 10% Levy
      vatRate: 0.10,           // 10% VAT
      vatType: 'Inclusive',
      discountType: 'Inclusive', // Discount Calculation: Inclusive
      orderType: 'TakeOut',
    };

    // Item with 10.000 discount applied directly to line
    const cartItems = [
      {
        productId: 6,
        name: 'DEMO',
        price: 10,
        quantity: 2,
        isIncl: false,
        discountValue: 10,
        discountType: 'amount',
        product: { id: 6, name: 'DEMO', price: 10, vatValue: 10, isIncl: false },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    // Undiscounted unit price is 12.100
    expect(line.price).toBeCloseTo(12.100, 3);
    // Item discount displays whatever value was typed (10.000)
    expect(line.itemDiscount).toBe(10);
    // Line total after discount is 14.200 (24.200 - 10.000)
    expect(line.lineTotal).toBeCloseTo(14.200, 3);
    expect(line.originalLineTotal).toBeCloseTo(24.200, 3);

    // Summary footer shows exclusive amounts:
    expect(result.summary.subtotal).toBe(20);
    expect(result.summary.totalDiscount).toBeCloseTo(8.264, 3);
    expect(result.summary.charges).toBeCloseTo(1.174, 3);
    expect(result.summary.vatExclAmount).toBeCloseTo(12.909, 3);
    expect(result.summary.vatAmount).toBeCloseTo(1.291, 3);
    expect(result.summary.grandTotal).toBeCloseTo(14.200, 3);
  });

  it('7. User screenshot media_1793269404798_2db8bac0.png: Item-level discount of 10.000 with Discount Calculation: Exclusive', () => {
    const takeOutConfig: BillingConfig = {
      serviceChargeRate: 0.10,
      levyRate: 0.10,          // 10% Levy
      vatRate: 0.10,           // 10% VAT
      vatType: 'Inclusive',
      discountType: 'Exclusive', // Discount Calculation: Exclusive
      orderType: 'TakeOut',
    };

    const cartItems = [
      {
        productId: 6,
        name: 'DEMO',
        price: 10,
        quantity: 2,
        isIncl: false,
        discountValue: 10,
        discountType: 'amount',
        product: { id: 6, name: 'DEMO', price: 10, vatValue: 10, isIncl: false },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
    });

    const [line] = result.lines;
    expect(line.price).toBeCloseTo(12.100, 3);
    // In Inclusive view, exclusive discount (10.000) displays scaled by factor (10.000 * 1.21 = 12.100)
    expect(line.itemDiscount).toBeCloseTo(12.100, 3);
    expect(line.itemDiscountAmount).toBe(10);
    // Line total after discount is 12.100 (24.200 - 12.100)
    expect(line.lineTotal).toBeCloseTo(12.100, 3);
    expect(line.originalLineTotal).toBeCloseTo(24.200, 3);

    // Summary footer shows exclusive amounts:
    expect(result.summary.subtotal).toBe(20);
    expect(result.summary.totalDiscount).toBe(10);
    expect(result.summary.charges).toBe(1);
    expect(result.summary.vatExclAmount).toBe(11);
    expect(result.summary.vatAmount).toBeCloseTo(1.100, 3);
    expect(result.summary.grandTotal).toBeCloseTo(12.100, 3);
  });

  it('8. Terminal Bill View Verification: displays QTY 2, PRICE 12.100, TOTAL 24.200 with typed bill discount (10.000)', () => {
    const takeOutConfig: BillingConfig = {
      serviceChargeRate: 0.10,
      levyRate: 0.10,
      vatRate: 0.10,
      vatType: 'Inclusive',
      discountType: 'Inclusive',
      orderType: 'TakeOut',
    };

    const cartItems = [
      {
        productId: 6,
        name: 'DEMO',
        price: 10,
        quantity: 2,
        isIncl: false,
        product: { id: 6, name: 'DEMO', price: 10, vatValue: 10, isIncl: false },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
      billDiscountValue: 10,
      billDiscountType: 'amount',
    });

    // Cart row table display:
    const [line] = result.lines;
    expect(line.quantity).toBe(2);
    expect(line.price).toBeCloseTo(12.100, 3);
    expect(line.lineTotal).toBeCloseTo(24.200, 3);
    expect(line.quantity * line.price).toBeCloseTo(line.lineTotal, 3);

    // Footer display: discount row under subtotal displays exclusive discount amount (10 / 1.21 = 8.264)
    expect(result.summary.subtotal).toBe(20.000);
    expect(result.summary.totalDiscount).toBeCloseTo(8.264, 3);
    expect(result.summary.charges).toBeCloseTo(1.174, 3);
    expect(result.summary.vatExclAmount).toBeCloseTo(12.909, 3);
    expect(result.summary.vatAmount).toBeCloseTo(1.291, 3);
    expect(result.summary.grandTotal).toBeCloseTo(14.201, 3);
  });

  it('9. User screenshot (Bill-wise discount with Discount Calculation: Exclusive): 10.000 bill discount displays full 10.000 discount', () => {
    const takeOutConfig: BillingConfig = {
      serviceChargeRate: 0.10,
      levyRate: 0.10,
      vatRate: 0.10,
      vatType: 'Inclusive',
      discountType: 'Exclusive', // Discount Calculation: Exclusive
      orderType: 'TakeOut',
    };

    const cartItems = [
      {
        productId: 6,
        name: 'DEMO',
        price: 10,
        quantity: 2,
        isIncl: false,
        product: { id: 6, name: 'DEMO', price: 10, vatValue: 10, isIncl: false },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
      billDiscountValue: 10,
      billDiscountType: 'amount',
    });

    // Cart row table display:
    const [line] = result.lines;
    expect(line.quantity).toBe(2);
    expect(line.price).toBeCloseTo(12.100, 3);
    expect(line.lineTotal).toBeCloseTo(24.200, 3);

    // Footer display matches Image 9:
    expect(result.summary.subtotal).toBe(20.000);
    expect(result.summary.totalDiscount).toBe(10.000);
    expect(result.summary.charges).toBe(1.000);
    expect(result.summary.vatExclAmount).toBe(11.000);
    expect(result.summary.vatAmount).toBeCloseTo(1.100, 3);
    expect(result.summary.grandTotal).toBeCloseTo(12.100, 3);

    // Balance checks:
    expect((result.summary.subTotalExclusive || 0) - (result.summary.totalDiscountExcl || 0) + result.summary.charges).toBeCloseTo(result.summary.vatExclAmount, 3);
    expect(result.summary.vatExclAmount + result.summary.vatAmount).toBeCloseTo(result.summary.grandTotal, 3);
  });

  it('10. Percentage bill-wise discount (10%) on DEMO (2 @ 12.100) in TakeOut', () => {
    const takeOutConfig: BillingConfig = {
      serviceChargeRate: 0.10,
      levyRate: 0.10,
      vatRate: 0.10,
      vatType: 'Inclusive',
      discountType: 'Inclusive',
      orderType: 'TakeOut',
    };

    const cartItems = [
      {
        productId: 6,
        name: 'DEMO',
        price: 10,
        quantity: 2,
        isIncl: false,
        product: { id: 6, name: 'DEMO', price: 10, vatValue: 10, isIncl: false },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: takeOutConfig,
      orderType: 'TakeOut',
      billDiscountValue: 10,
      billDiscountType: 'percentage',
    });

    // Subtotal = 20.000
    expect(result.summary.subtotal).toBe(20.000);
    // Exclusive discount amount under subtotal: 10% on 20.000 = 2.000
    expect(result.summary.totalDiscount).toBe(2.000);
    // Charges: 10% levy on remaining base 18.000 = 1.800
    expect(result.summary.charges).toBe(1.800);
    // Net Value: 18.000 + 1.800 = 19.800
    expect(result.summary.vatExclAmount).toBe(19.800);
    // VAT: 10% on 19.800 = 1.980
    expect(result.summary.vatAmount).toBeCloseTo(1.980, 3);
    // Grand Total: 19.800 + 1.980 = 21.780
    expect(result.summary.grandTotal).toBeCloseTo(21.780, 3);
    expect(result.summary.vatExclAmount + result.summary.vatAmount).toBeCloseTo(result.summary.grandTotal, 3);
  });

  it('11. User latest screenshot media_1793271542956_164f0238.png: ABCD in Dine-In with typed 27.050 discount displays 27.050 and line total 100.000', () => {
    const dineInConfig: BillingConfig = {
      serviceChargeRate: 0.10, // 10%
      levyRate: 0.05,          // 5%
      vatRate: 0.10,           // 10%
      vatType: 'Inclusive',
      discountType: 'Inclusive',
      orderType: 'DineIn',
    };

    // Item ABCD in Price View Inclusive has display price 127.050 (base 100 * 1.10 * 1.05 * 1.10 = 127.050)
    // User types 27.050 discount directly on the item
    const cartItems = [
      {
        productId: 99,
        name: 'ABCD',
        price: 127.050,
        quantity: 1,
        isIncl: true,
        discountValue: 27.050,
        discountType: 'amount',
        product: { id: 99, name: 'ABCD', price: 127.050, vatValue: 10, isIncl: true },
      },
    ];

    const result = calculateOrder(cartItems, {
      config: dineInConfig,
      orderType: 'DineIn',
    });

    const [line] = result.lines;
    // Cart row table display matches user screenshot exactly:
    expect(line.price).toBeCloseTo(127.050, 3);
    // Displayed discount MUST BE the value typed (27.050), strictly NOT reduced to 21.291
    expect(line.itemDiscount).toBe(27.050);
    // Line total after discount: 127.050 - 27.050 = 100.000
    expect(line.lineTotal).toBe(100.000);
    expect(line.originalLineTotal).toBeCloseTo(127.050, 3);

    // Summary footer matches user screenshot exactly:
    expect(result.summary.subtotal).toBe(100.000);
    // Discount row under Sub Total shows the exclusive discount amount (21.291)
    expect(result.summary.totalDiscount).toBeCloseTo(21.291, 3);
    // Charges: 12.200
    expect(result.summary.charges).toBeCloseTo(12.200, 3);
    // Net Value: 90.909
    expect(result.summary.vatExclAmount).toBeCloseTo(90.909, 3);
    // VAT: 9.091
    expect(result.summary.vatAmount).toBeCloseTo(9.091, 3);
    // Grand Total: 100.000
    expect(result.summary.grandTotal).toBe(100.000);
    expect(result.summary.grandTotal).toBe(100.000);
  });
});
