import { formatCurrency } from '../../../../../../../../utils/currency';
import type { 
  VoidOrderSummaryItem, 
  VoidProductSummaryItem, 
  VoidInvoiceSummaryItem,
  InvoiceComplementarySummaryItem,
  DriverSummaryItem,
  AllTransactionSummaryItem 
} from '../types';

const COMMON_80MM_STYLES = `
  @page { size: 80mm auto; margin: 0; }
  body {
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    font-size: 12px;
    font-weight: 800;
    color: #000 !important;
    width: 72mm;
    max-width: 72mm;
    margin: 0 auto;
    padding: 6px 2px;
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header { text-align: center; margin-bottom: 10px; border-bottom: 2px solid #000; padding-bottom: 8px; }
  .title { font-size: 16px; font-weight: 900; text-transform: uppercase; color: #000 !important; letter-spacing: 0.5px; }
  .sub { font-size: 11px; font-weight: 800; margin-top: 3px; color: #000 !important; }
  .card { border-bottom: 1px dashed #000; padding: 7px 0; }
  .flex-row { display: flex; justify-content: space-between; align-items: baseline; font-weight: 900; font-size: 13px; color: #000 !important; }
  .details { font-size: 11px; font-weight: 800; color: #000 !important; margin-top: 3px; line-height: 1.4; }
  .total-box { border-top: 2px solid #000; border-bottom: 3px double #000; margin-top: 10px; padding: 8px 0; font-weight: 900; font-size: 13px; display: flex; justify-content: space-between; color: #000 !important; }
`;

export const generateVoidOrderReportHtml = (logs: VoidOrderSummaryItem[], fromDate: string, toDate: string): string => {
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  const cardsHtml = logs.map((item, idx) => `
    <div class="card">
      <div class="flex-row">
        <span><b>#${item.sNo || (idx + 1)}. Order #${item.orderNo} (${item.orderType || '-'})</b></span>
        <span><b>${formatCurrency(item.amount)}</b></span>
      </div>
      <div class="details"><b>Date:</b> ${item.date ? new Date(item.date).toLocaleString('en-GB') : '-'}</div>
      <div class="details"><b>Emp:</b> ${item.employee || '-'} &nbsp;|&nbsp; <b>Reason:</b> ${item.reason || '-'}</div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Void Order Summary Report</title>
        <style>${COMMON_80MM_STYLES}</style>
      </head>
      <body>
        <div class="header">
          <div class="title">VOID ORDER SUMMARY</div>
          <div class="sub">Period: ${fromDate} to ${toDate}</div>
        </div>
        ${cardsHtml.length > 0 ? cardsHtml : '<div style="text-align:center; padding: 15px; font-weight: 800;">No void orders found for selected period</div>'}
        <div class="total-box">
          <span><b>TOTAL RECORDS: ${logs.length}</b></span>
          <span><b>TOTAL: ${formatCurrency(totalAmount)}</b></span>
        </div>
      </body>
    </html>
  `;
};

export const generateVoidProductReportHtml = (logs: VoidProductSummaryItem[], fromDate: string, toDate: string): string => {
  const totalQty = logs.reduce((sum, item) => sum + (parseFloat(String(item.quantity)) || 0), 0);
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  const cardsHtml = logs.map((item, idx) => `
    <div class="card">
      <div class="flex-row">
        <span><b>#${item.sNo || (idx + 1)}. ${item.product || '-'}</b></span>
        <span><b>${formatCurrency(item.amount)}</b></span>
      </div>
      <div class="details"><b>Order #${item.orderNo} (${item.orderType || '-'})</b> &nbsp;|&nbsp; <b>Qty: ${item.quantity} ${item.unit || ''}</b></div>
      <div class="details"><b>Emp:</b> ${item.employee || '-'} &nbsp;|&nbsp; <b>Void Date:</b> ${item.voidDate ? new Date(item.voidDate).toLocaleString('en-GB') : '-'}</div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Void Product Summary Report</title>
        <style>${COMMON_80MM_STYLES}</style>
      </head>
      <body>
        <div class="header">
          <div class="title">VOID PRODUCT SUMMARY</div>
          <div class="sub">Period: ${fromDate} to ${toDate}</div>
        </div>
        ${cardsHtml.length > 0 ? cardsHtml : '<div style="text-align:center; padding: 15px; font-weight: 800;">No voided products found for selected period</div>'}
        <div class="total-box">
          <span><b>TOTAL QTY: ${totalQty}</b></span>
          <span><b>TOTAL: ${formatCurrency(totalAmount)}</b></span>
        </div>
      </body>
    </html>
  `;
};

export const generateVoidInvoiceReportHtml = (logs: VoidInvoiceSummaryItem[], fromDate: string, toDate: string): string => {
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  const cardsHtml = logs.map((item, idx) => `
    <div class="card">
      <div class="flex-row">
        <span><b>#${item.sNo || (idx + 1)}. Bill: ${item.billNo || '-'} (#${item.orderNo})</b></span>
        <span><b>${formatCurrency(item.amount)}</b></span>
      </div>
      <div class="details"><b>Type:</b> ${item.orderType || '-'} &nbsp;|&nbsp; <b>Date:</b> ${item.date ? new Date(item.date).toLocaleString('en-GB') : '-'}</div>
      <div class="details"><b>Emp:</b> ${item.employee || '-'} &nbsp;|&nbsp; <b>Reason:</b> ${item.reason || '-'}</div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Cancelled Invoice Summary Report</title>
        <style>${COMMON_80MM_STYLES}</style>
      </head>
      <body>
        <div class="header">
          <div class="title">CANCELLED INVOICE SUMMARY</div>
          <div class="sub">Period: ${fromDate} to ${toDate}</div>
        </div>
        ${cardsHtml.length > 0 ? cardsHtml : '<div style="text-align:center; padding: 15px; font-weight: 800;">No cancelled invoices found for selected period</div>'}
        <div class="total-box">
          <span><b>TOTAL INVOICES: ${logs.length}</b></span>
          <span><b>TOTAL: ${formatCurrency(totalAmount)}</b></span>
        </div>
      </body>
    </html>
  `;
};

export const generateBillComplementaryReportHtml = (logs: InvoiceComplementarySummaryItem[], fromDate: string, toDate: string): string => {
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  const cardsHtml = logs.map((item, idx) => `
    <div class="card">
      <div class="flex-row">
        <span><b>#${item.sNo || (idx + 1)}. Bill: ${item.billNo || '-'}</b></span>
        <span><b>${formatCurrency(item.amount || 0)}</b></span>
      </div>
      <div class="details"><b>Customer:</b> ${item.customer || '-'}</div>
      <div class="details"><b>Emp:</b> ${item.employee || '-'} &nbsp;|&nbsp; <b>Date:</b> ${item.date ? new Date(item.date).toLocaleString('en-GB') : '-'}</div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Bill Complementary Summary Report</title>
        <style>${COMMON_80MM_STYLES}</style>
      </head>
      <body>
        <div class="header">
          <div class="title">BILL COMPLEMENTARY SUMMARY</div>
          <div class="sub">Period: ${fromDate} to ${toDate}</div>
        </div>
        ${cardsHtml.length > 0 ? cardsHtml : '<div style="text-align:center; padding: 15px; font-weight: 800;">No complementary bills found for selected period</div>'}
        <div class="total-box">
          <span><b>TOTAL BILLS: ${logs.length}</b></span>
          <span><b>TOTAL: ${formatCurrency(totalAmount)}</b></span>
        </div>
      </body>
    </html>
  `;
};

export const generateDriverSummaryReportHtml = (logs: DriverSummaryItem[], fromDate: string, toDate: string): string => {
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  const cardsHtml = logs.map((item, idx) => `
    <div class="card">
      <div class="flex-row">
        <span><b>#${item.sNo || (idx + 1)}. ${item.driver || 'Unknown'}${item.totalOrders ? ` (${item.totalOrders} Orders)` : ''}</b></span>
        <span><b>${formatCurrency(item.amount)}</b></span>
      </div>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Driver Summary Report</title>
        <style>${COMMON_80MM_STYLES}</style>
      </head>
      <body>
        <div class="header">
          <div class="title">DRIVER SUMMARY REPORT</div>
          <div class="sub">Period: ${fromDate} to ${toDate}</div>
        </div>
        ${cardsHtml.length > 0 ? cardsHtml : '<div style="text-align:center; padding: 15px; font-weight: 800;">No driver summary records found for selected period</div>'}
        <div class="total-box">
          <span><b>TOTAL DRIVERS: ${logs.length}</b></span>
          <span><b>TOTAL: ${formatCurrency(totalAmount)}</b></span>
        </div>
      </body>
    </html>
  `;
};

export const generateAllTransactionSummaryReportHtml = (logs: AllTransactionSummaryItem[], fromDate: string, toDate: string): string => {
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  const cardsHtml = logs.map((item, idx) => `
    <div class="card">
      <div class="flex-row">
        <span><b>#${item.sNo || (idx + 1)}. ${item.particular || '-'}</b></span>
        <span><b>${formatCurrency(item.amount)}</b></span>
      </div>
      ${(item.category || item.paymentType) ? `<div class="details"><b>Cat:</b> ${item.category || '-'} &nbsp;|&nbsp; <b>Pay:</b> ${item.paymentType || '-'}</div>` : ''}
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>All Transaction Summary Report</title>
        <style>${COMMON_80MM_STYLES}</style>
      </head>
      <body>
        <div class="header">
          <div class="title">ALL TRANSACTION SUMMARY</div>
          <div class="sub">Period: ${fromDate} to ${toDate}</div>
        </div>
        ${cardsHtml.length > 0 ? cardsHtml : '<div style="text-align:center; padding: 15px; font-weight: 800;">No transaction summary records found for selected period</div>'}
        <div class="total-box">
          <span><b>TOTAL TRANSACTIONS: ${logs.length}</b></span>
          <span><b>TOTAL: ${formatCurrency(totalAmount)}</b></span>
        </div>
      </body>
    </html>
  `;
};
