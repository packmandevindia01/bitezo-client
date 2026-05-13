import { getDecimalPart } from "../../../../utils/formatters";

export interface BillingConfig {
  serviceChargeRate: number;
  levyRate: number;
  vatRate: number;
  vatType: 'Exclusive' | 'Inclusive';
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
      vatType: configs.priceView === 'Inclusive' ? 'Inclusive' : 'Exclusive',
      orderType
    };
  } catch {
    return {
      serviceChargeRate: 0.10,
      levyRate: 0.05,
      vatRate: 0.10,
      vatType: 'Exclusive',
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
  itemVatRate?: number
) => {
  const amount = (qty * price) + extras;
  const netValue = amount - discount;
  
  // SC applies only to Dine-In
  const isDineIn = config.orderType.toLowerCase().includes('dine');
  const sc = isDineIn ? netValue * config.serviceChargeRate : 0;
  
  // Levy stacks on (Net Value + SC)
  const levy = (netValue + sc) * config.levyRate;
  
  const vatBase = netValue + sc + levy;
  let vatAmount = 0;
  
  const activeVatRate = itemVatRate !== undefined ? itemVatRate / 100 : config.vatRate;

  if (config.vatType === 'Exclusive') {
    vatAmount = vatBase * activeVatRate;
  }
  
  const lineNetAmount = vatBase + vatAmount;

  return {
    baseAmount: qty * price,
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
