import { getDecimalPart } from "../../../../utils/formatters";

export interface BillingConfig {
  serviceChargeRate: number;
  levyRate: number;
  vatRate: number;
  vatType: 'Exclusive' | 'Inclusive';
  discountType: 'Exclusive' | 'Inclusive';
  orderType: string;
}

export const getBillingConfig = (orderType: string): BillingConfig => {
  try {
    const savedConfigs = localStorage.getItem('posConfigs');
    const fullConfig = savedConfigs ? JSON.parse(savedConfigs) : {};
    const configs = fullConfig.configs || {};
    
    return {
      serviceChargeRate: (configs.serviceCharges ?? 0) / 100,
      levyRate: (configs.levy ?? 0) / 100,
      vatRate: (configs.vat ?? 0) / 100, // No fallback, use 0 if not found
      vatType: (configs.priceView || '').toLowerCase() === 'inclusive' ? 'Inclusive' : 'Exclusive',
      discountType: (configs.discountCalc || '').toLowerCase() === 'inclusive' ? 'Inclusive' : 'Exclusive',
      orderType
    };
  } catch {
    return {
      serviceChargeRate: 0.10,
      levyRate: 0.05,
      vatRate: 0.10,
      vatType: 'Exclusive',
      discountType: 'Exclusive',
      orderType
    };
  }
};

export const calculateLineItem = (
  qty: number,
  price: number,
  discount: number,
  extras: number,
  config: BillingConfig,
  itemVatRate?: number,
  isIncl?: boolean   // per-line override: true=inclusive, false=exclusive, undefined=follow global config
) => {
  const activeVatRate = itemVatRate !== undefined ? itemVatRate / 100 : config.vatRate;

  // Determine if this specific line item is VAT inclusive
  const isInclusive =
    isIncl === true  ? true :
    isIncl === false ? false :
    config.vatType === 'Inclusive';

  let basePrice = price;
  let baseDiscount = discount;

  // Extras are always inclusive of VAT, regardless of product's vatType
  let baseExtras = extras / (1 + activeVatRate);

  // Reverse Calculation for Inclusive VAT (Main Product)
  if (isInclusive) {
    basePrice = price / (1 + activeVatRate);
  }

  // Reverse Calculation for Discount based on Discount config
  if (config.discountType === 'Inclusive') {
    baseDiscount = discount / (1 + activeVatRate);
  } else {
    baseDiscount = discount;
  }

  const amount = (qty * basePrice) + baseExtras;
  const netValue = amount - baseDiscount;
  
  // SC applies only to Dine-In
  const isDineIn = config.orderType.toLowerCase().includes('dine');
  const sc = isDineIn ? netValue * config.serviceChargeRate : 0;
  
  // Levy stacks on (Net Value + SC)
  const levy = (netValue + sc) * config.levyRate;
  
  const vatBase = netValue + sc + levy;
  let vatAmount = 0;
  
  // If it was inclusive, we still calculate the exact vatAmount extracted
  // If it was exclusive, we calculate the vatAmount to add on top
  vatAmount = vatBase * activeVatRate;
  
  const lineNetAmount = vatBase + vatAmount;

  return {
    baseAmount: qty * basePrice,
    amount,
    netValue,
    sc,
    levy,
    vatAmount,
    lineNetAmount
  };
};

export const formatBillAmount = (value: number): number => {
  const decimals = getDecimalPart();
  return parseFloat(value.toFixed(decimals));
};
