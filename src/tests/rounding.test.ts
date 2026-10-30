import { describe, it, expect, beforeEach } from 'vitest';
import { roundCalc, calculateOrder, CALC_PRECISION } from '../features/pos/terminal/utils/billing';
import { formatAmount as formatCurrencyAmount, formatCurrency } from '../utils/currency';
import { formatAmount as formatFormatterAmount, roundToDecimals } from '../utils/formatters';
import { buildUnifiedOrderPricing } from '../features/pos/utils/orderPricing';

describe('High-Precision Rounding & Dynamic Decimal Display Engine', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('decimalPart', '3');
    localStorage.setItem('currencySymbol', 'BHD');
    localStorage.setItem('enableVat', 'true');
    localStorage.setItem('vat', '10');
    localStorage.setItem('serviceCharges', '10');
    localStorage.setItem('levy', '5');
    localStorage.setItem('priceView', 'Exclusive');
    localStorage.setItem('posConfigs', JSON.stringify({
      configs: {
        vat: 10,
        serviceCharges: 10,
        levy: 5,
        priceView: 'Exclusive',
        decimalPart: '3',
      }
    }));
  });

  describe('1. 7-Decimal Calculation Precision vs Dynamic Display Rounding', () => {
    it('should maintain at least 7 decimals precision during internal calculations', () => {
      const raw = 69.877512345;
      const calc7 = roundCalc(raw, CALC_PRECISION);
      expect(calc7).toBe(69.8775123);
    });

    it('should accurately round half-up for 69.8775 to 69.878 when displayed with 3 decimals', () => {
      expect(roundCalc(69.8775, 3)).toBe(69.878);
      expect(roundToDecimals(69.8775, 3)).toBe(69.878);
      expect(formatCurrencyAmount(69.8775)).toBe('69.878');
      expect(formatFormatterAmount(69.8775, 3)).toBe('69.878');
    });

    it('should withstand micro-float representation drift (e.g. 69.87749999999999)', () => {
      const drifted = 69.87749999999999;
      expect(roundCalc(drifted, 3)).toBe(69.878);
      expect(roundToDecimals(drifted, 3)).toBe(69.878);
      expect(formatCurrencyAmount(drifted)).toBe('69.878');
      expect(formatFormatterAmount(drifted, 3)).toBe('69.878');
    });

    it('should accurately round when localStorage decimalPart is changed to 2 decimals', () => {
      localStorage.setItem('decimalPart', '2');
      expect(roundCalc(69.8775, 2)).toBe(69.88);
      expect(formatCurrencyAmount(69.8775)).toBe('69.88');
      expect(formatFormatterAmount(69.8775, 2)).toBe('69.88');
      expect(formatCurrency(69.8775)).toBe('BHD 69.88');
    });

    it('should accurately round when localStorage decimalPart is changed to 4 decimals', () => {
      localStorage.setItem('decimalPart', '4');
      expect(roundCalc(69.87751, 4)).toBe(69.8775);
      expect(formatCurrencyAmount(69.8775)).toBe('69.8775');
      expect(formatFormatterAmount(69.8775, 4)).toBe('69.8775');
    });
  });

  describe('2. Order #27 Exact Mathematical Consistency Test', () => {
    it('should calculate Order #27 lines with 7 decimals and yield 69.878 grand total', () => {
      const items = [
        {
          productId: 1,
          product: { id: 1, name: 'SPICY NOODLE SALAD', price: 10, vatValue: 10 },
          quantity: 1,
          price: 10,
          isIncl: false,
        },
        {
          productId: 2,
          product: { id: 2, name: 'SAMOSA', price: 3, vatValue: 10 },
          quantity: 5,
          price: 3,
          isIncl: false,
        },
        {
          productId: 3,
          product: { id: 3, name: 'MOMOS', price: 6, vatValue: 10 },
          quantity: 5,
          price: 6,
          isIncl: false,
        },
      ];

      const result = calculateOrder(items, { orderType: 'DineIn' });

      // Verify line items:
      // Line 1: Net = 10, SC = 1, Levy = 0.55, VAT = 1.155, LineTotal = 12.705
      expect(result.lines[0].baseAmount).toBe(10);
      expect(result.lines[0].sc).toBe(1);
      expect(result.lines[0].levy).toBe(0.55);
      expect(result.lines[0].vatAmount).toBe(1.155);
      expect(result.lines[0].lineNetAmount).toBe(12.705);

      // Line 2: Net = 15, SC = 1.5, Levy = 0.825, VAT = 1.7325, LineTotal = 19.0575
      expect(result.lines[1].baseAmount).toBe(15);
      expect(result.lines[1].sc).toBe(1.5);
      expect(result.lines[1].levy).toBe(0.825);
      expect(result.lines[1].vatAmount).toBe(1.7325);
      expect(result.lines[1].lineNetAmount).toBe(19.0575);

      // Line 3: Net = 30, SC = 3, Levy = 1.65, VAT = 3.465, LineTotal = 38.115
      expect(result.lines[2].baseAmount).toBe(30);
      expect(result.lines[2].sc).toBe(3);
      expect(result.lines[2].levy).toBe(1.65);
      expect(result.lines[2].vatAmount).toBe(3.465);
      expect(result.lines[2].lineNetAmount).toBe(38.115);

      // Summary totals:
      // Subtotal = 55, SC = 5.5, Levy = 3.025, VAT = 6.3525, GrandTotal = 69.8775
      expect(result.summary.subtotal).toBe(55);
      expect(result.summary.serviceCharge).toBe(5.5);
      expect(result.summary.levy).toBe(3.025);
      expect(result.summary.vatAmount).toBe(6.3525);
      expect(result.summary.grandTotal).toBe(69.8775);

      // Formatted with 3 decimals:
      const displaySubTotal = formatCurrencyAmount(result.summary.subtotal);
      const displaySc = formatCurrencyAmount(result.summary.serviceCharge);
      const displayLevy = formatCurrencyAmount(result.summary.levy);
      const displayVat = formatCurrencyAmount(result.summary.vatAmount);
      const displayGrandTotal = formatCurrencyAmount(result.summary.grandTotal);

      expect(displaySubTotal).toBe('55.000');
      expect(displaySc).toBe('5.500');
      expect(displayLevy).toBe('3.025');
      expect(displayVat).toBe('6.353');
      expect(displayGrandTotal).toBe('69.878');

      // The mathematical sum of printed/displayed numbers MUST equal the printed Grand Total:
      const sumOfComponents = Number(displaySubTotal) + Number(displaySc) + Number(displayLevy) + Number(displayVat);
      expect(roundCalc(sumOfComponents, 3)).toBe(69.878);
      expect(Number(displayGrandTotal)).toBe(69.878);

      // Taxable Base (Excl Amt) in VAT breakdown table:
      const exclAmt = Number(displayGrandTotal) - Number(displayVat);
      expect(roundCalc(exclAmt, 3)).toBe(63.525);
    });

    it('should build unified pricing for Order #27 and produce identical 69.878 display', () => {
      const orderData = {
        masterData: {
          orderNo: 27,
          ticketNo: 27,
          orderType: 'DINE IN',
          orderTypeId: 1,
          serviceCharge: 5.5,
          levy: 3.025,
          subTotal: 55,
          vatAmount: 6.3525,
          netAmount: 69.8775,
        },
        detailsData: [
          { productId: 1, productName: 'SPICY NOODLE SALAD', price: 10, qty: 1, vatValue: 10 },
          { productId: 2, productName: 'SAMOSA', price: 3, qty: 5, vatValue: 10 },
          { productId: 3, productName: 'MOMOS', price: 6, qty: 5, vatValue: 10 },
        ],
      };

      const unified = buildUnifiedOrderPricing(orderData, { orderType: 'DineIn', priceView: 'Exclusive' });

      expect(unified.summary.subTotalExclusive).toBe(55);
      expect(unified.summary.serviceCharge).toBe(5.5);
      expect(unified.summary.levy).toBe(3.025);
      expect(unified.summary.vatAmount).toBe(6.3525);
      expect(unified.summary.grandTotal).toBe(69.8775);

      expect(formatCurrencyAmount(unified.summary.grandTotal)).toBe('69.878');
      expect(formatFormatterAmount(unified.summary.grandTotal, 3)).toBe('69.878');
    });
  });
});
