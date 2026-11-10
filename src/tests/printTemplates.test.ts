import { describe, it, expect, beforeEach } from 'vitest';
import { generateBillMarkup, generateKotMarkup } from '../features/pos/utils/escPosGenerator';
import { generateGuestPrintHtml } from '../features/pos/utils/guestPrintTemplate';
import { buildPrintPricing } from '../features/pos/utils/printPricing';
import { calculateOrder } from '../features/pos/terminal/utils/billing';

type View = 'Inclusive' | 'Exclusive';

/** What the bill receives in production for a saved order: the order priced from its stored values. */
const savedBill = (dataView: View, printPrice: View, masterData: any, detailsData: any[], options: Record<string, unknown> = {}): any =>
  buildPrintPricing({ masterData, detailsData }, { dataView, printPrice, orderType: masterData.orderType, ...options });

describe('Printing Generation (escPosGenerator.ts & guestPrintTemplate.ts)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vat', '10');
    localStorage.setItem('priceView', 'Exclusive');
    localStorage.setItem('printPrice', 'Exclusive');
    localStorage.setItem('discCalc', 'Inclusive');
    localStorage.setItem('currencySymbol', 'BHD');
    localStorage.setItem('decimalPart', '3');
  });

  describe('Guest / Invoice Bill ESC/POS Printing', () => {
    it('should print gross subtotal before bill discount, and show exact discount row in Exclusive mode', () => {
      const data: any = {
        orderNo: 75,
        ticketNo: 75,
        orderType: 'Takeaway',
        discount: 10.000,
        vatExclAmount: 10.000,
        vatAmount: 1.000,
        netAmount: 11.000,
        isBillDiscount: true,
        waiter: 'Admin',
        counter: 'Main',
      };

      const cartDetails: any[] = [
        {
          productId: 6,
          productName: 'Demo Product',
          qty: 2,
          price: 10.000,
          basePrice: 10.000,
          vatValue: 10,
          vatAmount: 1.000,
          netAmount: 11.000,
        }
      ];

      const markup = generateBillMarkup({ data, cartDetails });

      // 1. Line item: should print Rate/Amount (20.000)
      expect(markup).toContain('20.000');

      // 2. Sub Total: strictly gross 20.000 (NOT 10.000)
      expect(markup).toContain('Sub Total');
      expect(markup).toContain('20.000');

      // 3. Discount row: strictly -10.000
      expect(markup).toContain('Discount');
      expect(markup).toContain('-10.000');

      // 4. VAT row: 1.000
      expect(markup).toContain('VAT Amount');
      expect(markup).toContain('1.000');

      // 5. Grand Total: strictly 11.000
      expect(markup).toContain('GRAND TOTAL');
      expect(markup).toContain('11.000');
    });

    it('should print tax-inclusive subtotal and discount in Inclusive mode without calculation mismatches', () => {
      localStorage.setItem('printPrice', 'Inclusive');
      localStorage.setItem('priceView', 'Inclusive');

      const data: any = {
        orderNo: 75,
        ticketNo: 75,
        orderType: 'Takeaway',
        discount: 10.000,
        vatExclAmount: 10.000,
        vatAmount: 1.000,
        netAmount: 11.000,
        isBillDiscount: true,
        waiter: 'Admin',
        counter: 'Main',
        printPrice: 'Inclusive',
      };

      const cartDetails: any[] = [
        {
          productId: 6,
          productName: 'Demo Product',
          qty: 2,
          price: 10.000,
          basePrice: 10.000,
          vatValue: 10,
          vatAmount: 1.000,
          netAmount: 11.000,
        }
      ];

      const markup = generateBillMarkup({ data, cartDetails });

      // In Inclusive print mode:
      // Line amount: 2 * 11 = 22.000
      expect(markup).toContain('22.000');

      // Sub Total: inclusive gross 22.000
      expect(markup).toContain('Sub Total');
      expect(markup).toContain('22.000');

      // Discount: inclusive discount -11.000
      expect(markup).toContain('Discount');
      expect(markup).toContain('-11.000');

      // Grand Total: 22.000 - 11.000 = 11.000
      expect(markup).toContain('GRAND TOTAL');
      expect(markup).toContain('11.000');

      // VAT table at bottom still shows compliance breakdown
      expect(markup).toContain('Excl Amt');
      expect(markup).toContain('VAT Amt');
    });

    it('should format 100% complimentary orders with 0.000 grand total', () => {
      const data: any = {
        orderNo: 76,
        ticketNo: 76,
        orderType: 'Takeaway',
        discount: 15.000,
        complimentaryStatus: true,
        isBillDiscount: true,
        netAmount: 0,
        waiter: 'Admin',
        counter: 'Main',
      };

      const cartDetails: any[] = [
        {
          productId: 1,
          productName: 'Burger',
          qty: 1,
          price: 15.000,
          basePrice: 15.000,
          vatValue: 10,
          vatAmount: 0,
          netAmount: 0,
          complimentaryStatus: true,
        }
      ];

      const markup = generateBillMarkup({ data, cartDetails });
      expect(markup).toContain('15.000');
      expect(markup).toContain('-15.000');
      expect(markup).toContain('0.000');
    });

    it('should format line item discounts under specific rows when not bill discount', () => {
      const data: any = {
        orderNo: 77,
        ticketNo: 77,
        orderType: 'Takeaway',
        discount: 1.000,
        isBillDiscount: false,
        netAmount: 19.900,
        waiter: 'Admin',
        counter: 'Main',
      };

      const cartDetails: any[] = [
        {
          productId: 1,
          productName: 'Burger',
          qty: 1,
          price: 10.000,
          basePrice: 10.000,
          discountValue: 1.000,
          discAmount: 1.000,
          vatValue: 10,
          vatAmount: 0.900,
          netAmount: 9.900,
        }
      ];

      const markup = generateBillMarkup({ data, cartDetails });
      expect(markup).toContain('Disc : 1.000');
    });

    it('should format line item discounts proportionally in Inclusive mode', () => {
      localStorage.setItem('printPrice', 'Inclusive');
      localStorage.setItem('priceView', 'Inclusive');

      const data: any = {
        orderNo: 77,
        ticketNo: 77,
        orderType: 'Takeaway',
        isBillDiscount: false,
        waiter: 'Admin',
        counter: 'Main',
        printPrice: 'Inclusive',
      };

      const cartDetails: any[] = [
        {
          productId: 1,
          productName: 'Burger',
          qty: 1,
          price: 10.000,
          basePrice: 10.000,
          discountValue: 1.000,
          discAmount: 1.000,
          vatValue: 10,
          vatAmount: 0.900,
          netAmount: 9.900,
        }
      ];

      const markup = generateBillMarkup({ data, cartDetails });
      // In Inclusive print, 1.000 excl discount becomes 1.100 incl discount, net is 9.900
      expect(markup).toContain('Disc : 1.100');
      expect(markup).toContain('9.900');
    });
  });

  describe('HTML Guest Receipt Generation (guestPrintTemplate.ts)', () => {
    it('should generate balanced Exclusive HTML receipt for Order #79', async () => {
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('discCalc', 'Exclusive');

      // Order #79: 10 items @ 10 gross (100 gross), discount 10 BD
      const data: any = {
        orderNo: 79,
        ticketNo: 79,
        orderType: 'Takeaway',
        isBillDiscount: true,
        discount: 9.091,
        billDiscountValue: 10.000,
        vatExclAmount: 81.818,
        vatAmount: 8.182,
        netAmount: 90.000,
        waiter: 'Cashier',
        counter: 'Counter 1',
        printPrice: 'Exclusive',
      };

      const html = await generateGuestPrintHtml(savedBill('Inclusive', 'Exclusive', { orderType: 'Takeaway', discAmount: 10, vatExclAmount: 81.818, vatAmount: 8.182, netAmount: 90 }, [{ productId: 6, productName: 'Demo', qty: 10, price: 10, amount: 100, discAmount: 10, vatValue: 10, vatAmount: 8.182, mapId: 1 }]), data);

      // In Exclusive mode:
      // Rate is tax-exclusive: 9.091
      expect(html).toContain('9.091');
      // Subtotal is gross before discount: 90.909
      expect(html).toContain('90.909');
      // Discount is exclusive: -9.091
      expect(html).toContain('-9.091');
      // VAT is printed: 8.182
      expect(html).toContain('8.182');
      // Grand Total: 90.909 - 9.091 + 8.182 = 90.000
      expect(html).toContain('90.000');
    });

    it('should generate balanced Inclusive HTML receipt for Order #79', async () => {
      localStorage.setItem('printPrice', 'Inclusive');
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('discCalc', 'Exclusive');

      const data: any = {
        orderNo: 79,
        ticketNo: 79,
        orderType: 'Takeaway',
        isBillDiscount: true,
        discount: 10.000,
        billDiscountValue: 10.000,
        vatExclAmount: 81.818,
        vatAmount: 8.182,
        netAmount: 90.000,
        waiter: 'Cashier',
        counter: 'Counter 1',
        printPrice: 'Inclusive',
      };

      const html = await generateGuestPrintHtml(savedBill('Inclusive', 'Inclusive', { orderType: 'Takeaway', discAmount: 10, vatExclAmount: 81.818, vatAmount: 8.182, netAmount: 90 }, [{ productId: 6, productName: 'Demo', qty: 10, price: 10, amount: 100, discAmount: 10, vatValue: 10, vatAmount: 8.182, mapId: 1 }]), data);

      // In Inclusive mode:
      // Rate is tax-inclusive: 10.000
      expect(html).toContain('10.000');
      // Subtotal is gross before discount: 100.000
      expect(html).toContain('100.000');
      // Footer discount is EXCLUSIVE, same as the screen footer: 10.000 / 1.1 = -9.091
      expect(html).toContain('-9.091');
      expect(html).toContain('90.909'); // footer Sub Total (exclusive)
      // VAT Amount is printed: 8.182
      expect(html).toContain('VAT Amount');
      expect(html).toContain('8.182');
      // Grand Total: 100.000 - 10.000 = 90.000
      expect(html).toContain('90.000');
    });

    it('a live cart prints the VAT the cart worked out when price view and print view both are Inclusive', async () => {
      localStorage.setItem('printPrice', 'Inclusive');
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('enableVat', 'true');
      localStorage.setItem('vat', '10');

      // Gross items total: 100.000 BD inclusive of 10% VAT. No vatAmount provided (0).
      // Reverse calculation: Taxable Base = 100 / 1.10 = 90.909, VAT = 100 - 90.909 = 9.091
      const data: any = {
        orderNo: 90,
        ticketNo: 90,
        orderType: 'Takeaway',
        netAmount: 100.000,
        waiter: 'Cashier',
        counter: 'Counter 1',
        printPrice: 'Inclusive',
        vatAmount: 0, // Zero/missing initial VAT
      };

      const html = await generateGuestPrintHtml(
        calculateOrder(
          [{ uniqueId: 'a', productId: 10, name: 'Special Dish', price: 50, quantity: 2, isIncl: true, product: { id: 10, name: 'Special Dish', price: 50, vatValue: 10, isIncl: true } }] as any,
          { orderType: 'TakeOut', config: { serviceChargeRate: 0, levyRate: 0, vatRate: 0.1, vatType: 'Inclusive', discountType: 'Exclusive', orderType: 'TakeOut' } }
        ).lines as any,
        data
      );

      // 1. Items printed at inclusive rate: 50.000, gross: 100.000
      expect(html).toContain('50.000');
      expect(html).toContain('100.000');

      // 2. Subtotal printed at inclusive amount: 100.000
      expect(html).toContain('Sub Total');
      expect(html).toContain('100.000');

      // 3. VAT row is reverse-calculated and printed: 9.091
      expect(html).toContain('VAT Amount');
      expect(html).toContain('9.091');

      // 4. Grand Total is 100.000
      expect(html).toContain('Grand Total');
      expect(html).toContain('100.000');

      // 5. VAT breakdown table shows reverse-calculated base and tax:
      expect(html).toContain('90.909'); // Excl Amt
      expect(html).toContain('9.091');  // VAT Amt
    });

    it('should reverse calculate VAT in ESC/POS thermal text markup when both price view and print view are Inclusive with zero initial vatAmount', () => {
      localStorage.setItem('printPrice', 'Inclusive');
      localStorage.setItem('priceView', 'Inclusive');
      localStorage.setItem('enableVat', 'true');
      localStorage.setItem('vat', '10');

      const data: any = {
        orderNo: 91,
        ticketNo: 91,
        orderType: 'Takeaway',
        discount: 10.000,
        netAmount: 90.000,
        isBillDiscount: true,
        waiter: 'Cashier',
        counter: 'Counter 1',
        printPrice: 'Inclusive',
        vatAmount: 0,
      };

      const cartDetails: any[] = [
        {
          productId: 12,
          productName: 'Combo Meal',
          qty: 1,
          price: 100.000, // 100 gross
          vatValue: 10,
          vatAmount: 0,
          netAmount: 100.000,
          isPriceTaxInclusive: true,
        }
      ];

      const markup = generateBillMarkup({ data, cartDetails });

      // 1. Line amount: 100.000
      expect(markup).toContain('100.000');

      // 2. Sub Total: 100.000
      expect(markup).toContain('Sub Total');
      expect(markup).toContain('100.000');

      // 3. Discount: -10.000
      expect(markup).toContain('Discount');
      expect(markup).toContain('-10.000');

      // 4. Reverse calculated VAT: (100 - 10) / 1.10 = 81.818 base, 90 - 81.818 = 8.182 VAT
      expect(markup).toContain('VAT Amount');
      expect(markup).toContain('8.182');

      // 5. Grand Total: 90.000
      expect(markup).toContain('GRAND TOTAL');
      expect(markup).toContain('90.000');

      // 6. VAT breakdown table:
      expect(markup).toContain('81.818');
      expect(markup).toContain('8.182');
    });

    it('should format Dine-In orders with Service Charge and Levy accurately in Exclusive and Inclusive prints', async () => {
      // 1. Exclusive Print
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');

      const dineInData: any = {
        orderNo: 85,
        ticketNo: 85,
        orderType: 'DINE IN',
        serviceCharge: 2.000,
        levy: 1.100,
        vatExclAmount: 20.000,
        vatAmount: 2.310,
        netAmount: 25.410,
        waiter: 'Waiter 1',
        counter: 'Main',
        table: 'Table 2',
        section: 'Indoor',
        printPrice: 'Exclusive',
      };

      const exclHtml = await generateGuestPrintHtml(savedBill('Exclusive', 'Exclusive', { orderType: 'DINE IN', serviceCharge: 2, levy: 1.1, vatExclAmount: 23.1, vatAmount: 2.31, netAmount: 25.41 }, [{ productId: 1, productName: 'Steak', qty: 1, price: 20, amount: 20, serviceCharge: 2, levy: 1.1, vatValue: 10, vatAmount: 2.31, mapId: 1 }]), dineInData);
      expect(exclHtml).toContain('Sub Total');
      expect(exclHtml).toContain('20.000');
      expect(exclHtml).toContain('Levy (5%)');
      expect(exclHtml).toContain('1.100');
      expect(exclHtml).toContain('Service Charge (10%)');
      expect(exclHtml).toContain('2.000');
      expect(exclHtml).toContain('Net Value');
      expect(exclHtml).toContain('23.100');
      expect(exclHtml).toContain('VAT Amount');
      expect(exclHtml).toContain('2.310');
      expect(exclHtml).toContain('25.410');

      // 2. Inclusive Print
      localStorage.setItem('printPrice', 'Inclusive');
      localStorage.setItem('priceView', 'Inclusive');

      const inclData = { ...dineInData, printPrice: 'Inclusive' };
      const inclHtml = await generateGuestPrintHtml(savedBill('Inclusive', 'Inclusive', { orderType: 'DINE IN', serviceCharge: 2, levy: 1.1, vatExclAmount: 23.1, vatAmount: 2.31, netAmount: 25.41 }, [{ productId: 1, productName: 'Steak', qty: 1, price: 25.41, amount: 25.41, serviceCharge: 2, levy: 1.1, vatValue: 10, vatAmount: 2.31, mapId: 1 }]), inclData as any);
      expect(inclHtml).toContain('Sub Total');
      expect(inclHtml).toContain('Grand Total');
      expect(inclHtml).toContain('25.410');
    });

    it('should format Delivery orders with Delivery Charge accurately in prints', async () => {
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');

      const deliveryData: any = {
        orderNo: 86,
        ticketNo: 86,
        orderType: 'DELIVERY',
        deliveryCharge: 1.500,
        vatExclAmount: 10.000,
        vatAmount: 1.000,
        netAmount: 12.500,
        driver: 'Driver Sam',
        contactNo: '97312345678',
        printPrice: 'Exclusive',
      };

      const html = await generateGuestPrintHtml(savedBill('Exclusive', 'Exclusive', { orderType: 'DELIVERY', deliveryCharge: 1.5, vatExclAmount: 10, vatAmount: 1, netAmount: 12.5 }, [{ productId: 2, productName: 'Pizza', qty: 1, price: 10, amount: 10, vatValue: 10, vatAmount: 1, mapId: 1 }]), deliveryData);
      expect(html).toContain('Delivery Charge');
      expect(html).toContain('1.500');
      expect(html).toContain('Driver Sam');
      expect(html).toContain('97312345678');
      expect(html).toContain('12.500');
    });

    it('Order #27: should calculate 7 decimals and accurately format 3-decimal total as 69.878 (not 69.877) and Excl Amt as 63.525 (not 63.524)', async () => {
      localStorage.setItem('decimalPart', '3');
      localStorage.setItem('serviceCharges', '10');
      localStorage.setItem('levy', '5');
      localStorage.setItem('vat', '10');
      localStorage.setItem('enableVat', 'true');
      localStorage.setItem('priceView', 'Exclusive');
      localStorage.setItem('printPrice', 'Exclusive');

      const dineInData: any = {
        orderNo: 27,
        ticketNo: 27,
        orderType: 'DINE IN',
        subTotal: 55.000,
        serviceCharge: 5.500,
        levy: 3.025,
        vatAmount: 6.353,
        netAmount: 69.878,
        table: 'T1',
        waiter: 'Waiter',
        counter: 'Main',
        section: 'test',
        enableVat: true,
      };

      const cartDetails: any[] = [
        {
          productId: 1,
          productName: 'SPICY NOODLE SALAD',
          qty: 1,
          price: 10.000,
          vatValue: 10,
          vatAmount: 1.155,
          netAmount: 12.705,
        },
        {
          productId: 2,
          productName: 'SAMOSA',
          qty: 5,
          price: 3.000,
          vatValue: 10,
          vatAmount: 1.7325,
          netAmount: 19.0575,
        },
        {
          productId: 3,
          productName: 'MOMOS',
          qty: 5,
          price: 6.000,
          vatValue: 10,
          vatAmount: 3.465,
          netAmount: 38.115,
        },
      ];

      // 1. Test HTML Guest Print
      const html = await generateGuestPrintHtml(savedBill('Exclusive', 'Exclusive', { orderType: 'DINE IN', serviceCharge: 5.5, levy: 3.025, vatExclAmount: 63.525, vatAmount: 6.353, netAmount: 69.878 }, [
        { productId: 1, productName: 'SPICY NOODLE SALAD', qty: 1, price: 10, amount: 10, serviceCharge: 1, levy: 0.55, vatValue: 10, vatAmount: 1.155, mapId: 1 },
        { productId: 2, productName: 'SAMOSA', qty: 5, price: 3, amount: 15, serviceCharge: 1.5, levy: 0.825, vatValue: 10, vatAmount: 1.7325, mapId: 2 },
        { productId: 3, productName: 'MOMOS', qty: 5, price: 6, amount: 30, serviceCharge: 3, levy: 1.65, vatValue: 10, vatAmount: 3.465, mapId: 3 },
      ]), dineInData);
      expect(html).toContain('55.000'); // Sub Total
      expect(html).toContain('Levy (5%)');
      expect(html).toContain('3.025');
      expect(html).toContain('Service Charge (10%)');
      expect(html).toContain('5.500');
      expect(html).toContain('Net Value');
      expect(html).toContain('63.525'); // Net Value
      expect(html).toContain('6.353');  // VAT Amount
      expect(html).toContain('69.878'); // Grand Total (NOT 69.877)
      expect(html).not.toContain('69.877');
      expect(html).toContain('63.525'); // Excl Amt (NOT 63.524)
      expect(html).not.toContain('63.524');

      // 2. Test ESC/POS Thermal Markup
      const markup = generateBillMarkup({ data: dineInData, cartDetails });
      expect(markup).toContain('55.000');
      expect(markup).toContain('Levy (5%)');
      expect(markup).toContain('3.025');
      expect(markup).toContain('Service Charge (10%)');
      expect(markup).toContain('5.500');
      expect(markup).toContain('Net Value');
      expect(markup).toContain('63.525');
      expect(markup).toContain('6.353');
      expect(markup).toContain('69.878');
      expect(markup).not.toContain('69.877');
      expect(markup).toContain('63.525');
      expect(markup).not.toContain('63.524');
    });

    it('should display item discounts both under line items AND in footer totals in HTML Guest Print and ESC/POS Thermal Print', async () => {
      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');

      const data: any = {
        orderNo: 88,
        ticketNo: 88,
        orderType: 'Takeaway',
        isBillDiscount: false, // Item-level discount
        waiter: 'Emp1',
        counter: 'Main',
        printPrice: 'Exclusive',
      };

      const cartDetails: any[] = [
        {
          productId: 1,
          productName: 'Burger Deluxe',
          qty: 1,
          price: 10.000,
          basePrice: 10.000,
          discountValue: 2.000,
          discAmount: 2.000,
          vatValue: 10,
          vatAmount: 0.800,
          netAmount: 8.800,
        }
      ];

      // 1. HTML Guest Print
      const html = await generateGuestPrintHtml(savedBill('Exclusive', 'Exclusive', { orderType: 'Takeaway', vatExclAmount: 8, vatAmount: 0.8, netAmount: 8.8 }, [{ productId: 1, productName: 'Burger Deluxe', qty: 1, price: 10, amount: 10, discAmount: 2, vatValue: 10, vatAmount: 0.8, mapId: 1 }], { isBillDiscount: false }), data);
      // Line item shows Disc : 2.000
      expect(html).toContain('Disc : 2.000');
      // Footer table shows Discount row with -2.000
      expect(html).toContain('Discount');
      expect(html).toContain('-2.000');
      expect(html).toContain('10.000'); // Sub Total
      expect(html).toContain('8.800');  // Grand Total

      // 2. ESC/POS Thermal Print
      const markup = generateBillMarkup({ data, cartDetails });
      // Line item shows Disc : 2.000
      expect(markup).toContain('Disc : 2.000');
      // Footer totals show Discount with -2.000
      expect(markup).toContain('Discount');
      expect(markup).toContain('-2.000');
      expect(markup).toContain('10.000');
      expect(markup).toContain('8.800');
    });

    it('Scenario (Image 10): Settle & Print with Item-Level Discount displays Disc : 8.658 under DEMO in Exclusive print', async () => {
      const data: any = {
        orderNo: 'New',
        ticketNo: 'New',
        orderType: 'TakeOut',
        subTotal: 30.000,
        discount: 8.658,
        discAmount: 0,
        isBillDiscount: false, // Item-level discount
        waiter: 'Emp1',
        counter: 'Main',
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
        charges: 1.067,
        netValue: 22.409,
        vatAmount: 2.241,
        netAmount: 24.650,
      };

      const cartDetails: any[] = [
        {
          productId: 6,
          productName: 'DEMO',
          qty: 3,
          price: 10.000,
          basePrice: 10.000,
          baseDiscount: 8.658,
          itemDiscount: 8.658,
          itemDiscountAmount: 8.658,
          itemDiscountExcl: 8.658,
          discountValue: 8.658,
          discAmount: 8.658,
          lineTotal: 21.342,
        }
      ];

      // 1. HTML Guest Print
      const html = await generateGuestPrintHtml(savedBill('Exclusive', 'Exclusive', { orderType: 'TakeOut', levy: 1.067, vatExclAmount: 22.409, vatAmount: 2.241, netAmount: 24.65 }, [{ productId: 6, productName: 'DEMO', qty: 3, price: 10, amount: 30, discAmount: 8.658, levy: 1.067, vatValue: 10, vatAmount: 2.241, mapId: 1 }], { isBillDiscount: false }), data);
      expect(html).toContain('DEMO');
      expect(html).toContain('30.000');
      expect(html).toContain('Disc : 8.658');
      expect(html).toContain('21.342');
      expect(html).toContain('Discount');
      expect(html).toContain('-8.658');
      expect(html).toContain('24.650');

      // 2. ESC/POS Thermal Print
      const markup = generateBillMarkup({ data, cartDetails });
      expect(markup).toContain('DEMO');
      expect(markup).toContain('30.000');
      expect(markup).toContain('Disc : 8.658');
      expect(markup).toContain('21.342');
      expect(markup).toContain('Discount');
      expect(markup).toContain('-8.658');
      expect(markup).toContain('24.650');
    });

    it('Scenario: Settle & Print with Item-Level Discount displays Disc : 10.000 (not 9.524) under DEMO in Inclusive print', async () => {
      const data: any = {
        orderNo: 'New',
        ticketNo: 'New',
        orderType: 'TakeOut',
        subTotal: 34.650,
        discount: 10.000,
        discAmount: 0,
        isBillDiscount: false, // Item-level discount
        waiter: 'Emp1',
        counter: 'Main',
        printPrice: 'Inclusive',
        priceView: 'Inclusive',
        charges: 1.067,
        vatAmount: 2.241,
        netAmount: 24.650,
      };

      const cartDetails: any[] = [
        {
          productId: 6,
          productName: 'DEMO',
          qty: 3,
          price: 11.550,
          basePrice: 10.000,
          baseDiscount: 8.658,
          itemDiscount: 10.000,
          itemDiscountAmount: 8.658,
          itemDiscountExcl: 8.658,
          itemDiscountIncl: 10.000,
          discountValue: 10.000,
          discAmount: 8.658,
          lineTotal: 24.650,
        }
      ];

      // 1. HTML Guest Print
      const html = await generateGuestPrintHtml(savedBill('Inclusive', 'Inclusive', { orderType: 'TakeOut', levy: 1.067, vatExclAmount: 22.409, vatAmount: 2.241, netAmount: 24.65 }, [{ productId: 6, productName: 'DEMO', qty: 3, price: 11.55, amount: 34.65, discAmount: 10, levy: 1.067, vatValue: 10, vatAmount: 2.241, mapId: 1 }], { isBillDiscount: false }), { ...data });
      expect(html).toContain('DEMO');
      expect(html).toContain('34.650');
      expect(html).toContain('Disc : 10.000');
      expect(html).not.toContain('9.524');
      expect(html).toContain('24.650');
      expect(html).toContain('Discount');
      // Footer discount is EXCLUSIVE (same as the screen): 10.000 / 1.155 = -8.658; the row still shows Disc : 10.000
      expect(html).toContain('-8.658');

      // 2. ESC/POS Thermal Print
      const markup = generateBillMarkup({ data, cartDetails });
      expect(markup).toContain('DEMO');
      expect(markup).toContain('34.650');
      expect(markup).toContain('Disc : 10.000');
      expect(markup).not.toContain('9.524');
      expect(markup).toContain('24.650');
      expect(markup).toContain('Discount');
      expect(markup).toContain('-10.000');
    });

    it('Scenario: Settle & Print when priceView is Exclusive and printPrice is Inclusive displays Disc : 10.000 (not 8.658)', async () => {
      const data: any = {
        orderNo: 'New',
        ticketNo: 'New',
        orderType: 'TakeOut',
        subTotal: 34.650,
        discount: 10.000,
        discAmount: 0,
        isBillDiscount: false, // Item-level discount
        waiter: 'Emp1',
        counter: 'Main',
        printPrice: 'Inclusive',
        priceView: 'Exclusive',
        charges: 1.067,
        vatAmount: 2.241,
        netAmount: 24.650,
      };

      const cartDetails: any[] = [
        {
          productId: 6,
          productName: 'DEMO',
          qty: 3,
          price: 10.000,
          basePrice: 10.000,
          baseDiscount: 8.658,
          itemDiscount: 8.658,
          itemDiscountAmount: 8.658,
          itemDiscountExcl: 8.658,
          discountValue: 10.000,
          discAmount: 8.658,
          lineTotal: 21.342,
        }
      ];

      // 1. HTML Guest Print
      const html = await generateGuestPrintHtml(savedBill('Exclusive', 'Inclusive', { orderType: 'TakeOut', levy: 1.067, vatExclAmount: 22.409, vatAmount: 2.241, netAmount: 24.65 }, [{ productId: 6, productName: 'DEMO', qty: 3, price: 10, amount: 30, discAmount: 8.658, levy: 1.067, vatValue: 10, vatAmount: 2.241, mapId: 1 }], { isBillDiscount: false }), { ...data });
      expect(html).toContain('DEMO');
      expect(html).toContain('34.650');
      expect(html).toContain('Disc : 10.000');
      expect(html).not.toContain('Disc : 8.658');
      expect(html).toContain('24.650');
      expect(html).toContain('Discount');
      // Footer discount is EXCLUSIVE (same as the screen): 10.000 / 1.155 = -8.658; the row still shows Disc : 10.000
      expect(html).toContain('-8.658');

      // 2. ESC/POS Thermal Print
      const markup = generateBillMarkup({ data, cartDetails });
      expect(markup).toContain('DEMO');
      expect(markup).toContain('34.650');
      expect(markup).toContain('Disc : 10.000');
      expect(markup).not.toContain('Disc : 8.658');
      expect(markup).toContain('24.650');
      expect(markup).toContain('Discount');
      expect(markup).toContain('-10.000');
    });

    it('Swagger Order #120 recall print data (/api/v1/order/recall/order-print-data/120) prints exact 3.000 in Inclusive and Exclusive views', async () => {
      // Swagger order-print-data for 120 (Inclusive)
      const printData120Inclusive: any = {
        masterData: {
          orderNo: 120,
          ticketNo: 120,
          orderType: 'TakeOut',
          counterName: 'Counter1',
          waiter: 'emp1',
          customerName: 'CASH CUSTOMER',
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
            productName: 'abcd',
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
            vatCode: '10%',
            exclAmount: 2.7272727,
            vatAmount: 0.2727273,
            netAmount: 3
          }
        ]
      };

      // 1. Inclusive View Print
      localStorage.setItem('printPrice', 'Inclusive');
      localStorage.setItem('priceView', 'Inclusive');
      const htmlIncl = await generateGuestPrintHtml(buildPrintPricing(printData120Inclusive, { dataView: 'Inclusive', printPrice: 'Inclusive', orderType: 'TakeOut' }) as any, {
        ...printData120Inclusive.masterData,
        printPrice: 'Inclusive',
        priceView: 'Inclusive',
      });
      expect(htmlIncl).toContain('3.000');
      expect(htmlIncl).toContain('2.597'); // Sub Total
      expect(htmlIncl).toContain('0.130'); // Charges (Levy)
      expect(htmlIncl).toContain('2.727'); // Net Value
      expect(htmlIncl).toContain('0.273'); // VAT Amount

      const markupIncl = generateBillMarkup({
        data: { ...printData120Inclusive.masterData, printPrice: 'Inclusive', priceView: 'Inclusive' },
        cartDetails: printData120Inclusive,
      });
      expect(markupIncl).toContain('3.000');
      expect(markupIncl).toContain('2.597');
      expect(markupIncl).toContain('0.130');
      expect(markupIncl).toContain('2.727');
      expect(markupIncl).toContain('0.273');

      // 2. Exclusive View Print
      const printData120Exclusive: any = {
        ...printData120Inclusive,
        detailsData: [
          {
            ...printData120Inclusive.detailsData[0],
            price: 2.5974026,
            amount: 2.5974026,
          }
        ]
      };

      localStorage.setItem('printPrice', 'Exclusive');
      localStorage.setItem('priceView', 'Exclusive');
      const htmlExcl = await generateGuestPrintHtml(buildPrintPricing(printData120Exclusive, { dataView: 'Exclusive', printPrice: 'Exclusive', orderType: 'TakeOut' }) as any, {
        ...printData120Exclusive.masterData,
        printPrice: 'Exclusive',
        priceView: 'Exclusive',
      });
      expect(htmlExcl).toContain('2.597');
      expect(htmlExcl).toContain('0.130');
      expect(htmlExcl).toContain('2.727');
      expect(htmlExcl).toContain('0.273');
      expect(htmlExcl).toContain('3.000');

      const markupExcl = generateBillMarkup({
        data: { ...printData120Exclusive.masterData, printPrice: 'Exclusive', priceView: 'Exclusive' },
        cartDetails: printData120Exclusive,
      });
      expect(markupExcl).toContain('2.597');
      expect(markupExcl).toContain('0.130');
      expect(markupExcl).toContain('2.727');
      expect(markupExcl).toContain('0.273');
      expect(markupExcl).toContain('3.000');
    });
  });

  describe('Kitchen Order Ticket (KOT) ESC/POS Printing', () => {
    it('should format KOT markup with order type, table, and item details', () => {
      const kotData: any = {
        orderNo: 80,
        ticketNo: 80,
        orderType: 'DINE IN',
        table: 'Table 5',
        waiter: 'John',
        kotNo: 'KOT-101',
      };

      const cartDetails: any[] = [
        {
          productId: 10,
          productName: 'Pepperoni Pizza',
          qty: 2,
          modifiers: [{ id: 1, name: 'Extra Cheese', qty: 1 }],
          messages: [{ name: 'Well Done' }],
        }
      ];

      const markup = generateKotMarkup({ data: kotData, cartDetails });
      expect(markup).toContain('PEPPERONI PIZZA');
      expect(markup).toContain('x2');
      expect(markup).toContain('EXTRA CHEESE');
      expect(markup).toContain('WELL DONE');
      expect(markup).toContain('Table: Table 5');
    });
  });
});
