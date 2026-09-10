import React from 'react';
import type { 
  DayClosedLog, 
  ShiftClosedLog, 
  VoidOrderSummaryItem, 
  VoidProductSummaryItem, 
  VoidInvoiceSummaryItem,
  InvoiceComplementarySummaryItem,
  DriverSummaryItem,
  AllTransactionSummaryItem 
} from '../../../../../cashier/services/cashierLogService';

export type ReportType = 
  | 'HUB' 
  | 'DAY_END' 
  | 'SHIFT_END' 
  | 'VOID_ORDER_SUMMARY' 
  | 'VOID_PRODUCT_SUMMARY' 
  | 'CANCELLED_INVOICE_SUMMARY' 
  | 'BILL_COMPLEMENTARY_SUMMARY'
  | 'DRIVER_SUMMARY'
  | 'ALL_TRANSACTION_SUMMARY'
  | 'SETTLED_ORDERS' 
  | 'PAY_IN_OUT' 
  | 'CASHIER_SHIFT';

export interface ReportCardItem {
  id: ReportType;
  title: string;
  badge: string;
  badgeBg: string;
  badgeTextColor: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

export type { 
  DayClosedLog, 
  ShiftClosedLog, 
  VoidOrderSummaryItem, 
  VoidProductSummaryItem, 
  VoidInvoiceSummaryItem,
  InvoiceComplementarySummaryItem,
  DriverSummaryItem,
  AllTransactionSummaryItem 
};
