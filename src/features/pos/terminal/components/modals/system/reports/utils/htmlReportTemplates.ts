import { formatCurrency } from '../../../../../../../../utils/currency';
import type { 
  VoidOrderSummaryItem, 
  VoidProductSummaryItem, 
  VoidInvoiceSummaryItem,
  InvoiceComplementarySummaryItem,
  DriverSummaryItem,
  AllTransactionSummaryItem 
} from '../types';

export const generateVoidOrderReportHtml = (logs: VoidOrderSummaryItem[], fromDate: string, toDate: string): string => {
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  const rowsHtml = logs.map(item => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.sNo}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: bold; text-align: center;">#${item.orderNo}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${item.orderType || '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${item.date ? new Date(item.date).toLocaleString('en-GB') : '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${item.employee || '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${item.reason || '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Void Order Summary Report</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #1e293b; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #49293e; padding-bottom: 12px; }
          .title { font-size: 18px; font-weight: 800; color: #49293e; text-transform: uppercase; letter-spacing: 1px; }
          .sub { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #f8fafc; color: #49293e; text-align: left; padding: 10px 8px; border-bottom: 2px solid #cbd5e1; font-size: 11px; text-transform: uppercase; font-weight: 800; }
          .tot { background: #f8fafc; font-weight: 800; font-size: 13px; color: #49293e; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Void Order Summary Report</div>
          <div class="sub">Period: ${fromDate} to ${toDate}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">S.No</th>
              <th style="text-align: center;">Order No</th>
              <th>Order Type</th>
              <th>Date & Time</th>
              <th>Employee</th>
              <th>Reason</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="7" style="text-align:center; padding: 30px; color: #94a3b8;">No void orders found for selected period</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="tot">
              <td colspan="6" style="padding: 12px 8px; text-align: right;">Total Void Amount:</td>
              <td style="padding: 12px 8px; text-align: right;">${formatCurrency(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;
};

export const generateVoidProductReportHtml = (logs: VoidProductSummaryItem[], fromDate: string, toDate: string): string => {
  const totalQty = logs.reduce((sum, item) => sum + (parseFloat(String(item.quantity)) || 0), 0);
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  const rowsHtml = logs.map(item => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.sNo}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: bold; text-align: center;">#${item.orderNo}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${item.orderType || '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${item.voidDate ? new Date(item.voidDate).toLocaleString('en-GB') : '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${item.employee || '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #e11d48;">${item.product || '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center; font-weight: bold;">${item.quantity} ${item.unit || ''}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Void Product Summary Report</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #1e293b; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #e11d48; padding-bottom: 12px; }
          .title { font-size: 18px; font-weight: 800; color: #e11d48; text-transform: uppercase; letter-spacing: 1px; }
          .sub { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #fff1f2; color: #9f1239; text-align: left; padding: 10px 8px; border-bottom: 2px solid #fecdd3; font-size: 11px; text-transform: uppercase; font-weight: 800; }
          .tot { background: #fff1f2; font-weight: 800; font-size: 13px; color: #9f1239; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Void Product Summary Report</div>
          <div class="sub">Period: ${fromDate} to ${toDate}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">S.No</th>
              <th style="text-align: center;">Order No</th>
              <th>Order Type</th>
              <th>Void Date</th>
              <th>Employee</th>
              <th>Product</th>
              <th style="text-align: center;">Qty</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="8" style="text-align:center; padding: 30px; color: #94a3b8;">No voided products found for selected period</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="tot">
              <td colspan="6" style="padding: 12px 8px; text-align: right;">Total Void Quantity & Amount:</td>
              <td style="padding: 12px 8px; text-align: center;">${totalQty}</td>
              <td style="padding: 12px 8px; text-align: right;">${formatCurrency(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;
};

export const generateVoidInvoiceReportHtml = (logs: VoidInvoiceSummaryItem[], fromDate: string, toDate: string): string => {
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  const rowsHtml = logs.map(item => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.sNo}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: bold; text-align: center; color: #7e22ce;">${item.billNo || '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: bold; text-align: center;">#${item.orderNo}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${item.orderType || '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${item.date ? new Date(item.date).toLocaleString('en-GB') : '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${item.employee || '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Cancelled Invoice Summary Report</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #1e293b; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #7e22ce; padding-bottom: 12px; }
          .title { font-size: 18px; font-weight: 800; color: #7e22ce; text-transform: uppercase; letter-spacing: 1px; }
          .sub { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #faf5ff; color: #6b21a8; text-align: left; padding: 10px 8px; border-bottom: 2px solid #e9d5ff; font-size: 11px; text-transform: uppercase; font-weight: 800; }
          .tot { background: #faf5ff; font-weight: 800; font-size: 13px; color: #6b21a8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Cancelled Invoice Summary Report</div>
          <div class="sub">Period: ${fromDate} to ${toDate}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">S.No</th>
              <th style="text-align: center;">Bill No</th>
              <th style="text-align: center;">Order No</th>
              <th>Order Type</th>
              <th>Date & Time</th>
              <th>Employee</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="7" style="text-align:center; padding: 30px; color: #94a3b8;">No cancelled invoices found for selected period</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="tot">
              <td colspan="6" style="padding: 12px 8px; text-align: right;">Total Cancelled Invoice Amount:</td>
              <td style="padding: 12px 8px; text-align: right;">${formatCurrency(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;
};

export const generateBillComplementaryReportHtml = (logs: InvoiceComplementarySummaryItem[], fromDate: string, toDate: string): string => {
  const rowsHtml = logs.map(item => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.sNo}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: bold; text-align: center; color: #059669;">${item.billNo || '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee;">${item.date ? new Date(item.date).toLocaleString('en-GB') : '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: bold;">${item.customer || '-'}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Bill Complementary Summary Report</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #1e293b; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #059669; padding-bottom: 12px; }
          .title { font-size: 18px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 1px; }
          .sub { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #ecfdf5; color: #065f46; text-align: left; padding: 10px 8px; border-bottom: 2px solid #a7f3d0; font-size: 11px; text-transform: uppercase; font-weight: 800; }
          .tot { background: #ecfdf5; font-weight: 800; font-size: 13px; color: #065f46; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Bill Complementary Summary Report</div>
          <div class="sub">Period: ${fromDate} to ${toDate}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">S.No</th>
              <th style="text-align: center;">Bill No</th>
              <th>Date & Time</th>
              <th>Customer</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="4" style="text-align:center; padding: 30px; color: #94a3b8;">No complementary bills found for selected period</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="tot">
              <td colspan="4" style="padding: 12px 8px; text-align: left;">Total Complementary Bills: ${logs.length}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;
};

export const generateDriverSummaryReportHtml = (logs: DriverSummaryItem[], fromDate: string, toDate: string): string => {
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  const rowsHtml = logs.map(item => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center;">${item.sNo}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #0891b2;">${item.driver || '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Driver Summary Report</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #1e293b; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #0891b2; padding-bottom: 12px; }
          .title { font-size: 18px; font-weight: 800; color: #0891b2; text-transform: uppercase; letter-spacing: 1px; }
          .sub { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #ecfeff; color: #155e75; text-align: left; padding: 10px 8px; border-bottom: 2px solid #a5f3fc; font-size: 11px; text-transform: uppercase; font-weight: 800; }
          .tot { background: #ecfeff; font-weight: 800; font-size: 13px; color: #155e75; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">Driver Summary Report</div>
          <div class="sub">Period: ${fromDate} to ${toDate}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">S.No</th>
              <th>Driver / Waiter Name</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="3" style="text-align:center; padding: 30px; color: #94a3b8;">No driver summary records found for selected period</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="tot">
              <td colspan="2" style="padding: 12px 8px; text-align: right;">Total Amount:</td>
              <td style="padding: 12px 8px; text-align: right;">${formatCurrency(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;
};

export const generateAllTransactionSummaryReportHtml = (logs: AllTransactionSummaryItem[], fromDate: string, toDate: string): string => {
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  const rowsHtml = logs.map((item, idx) => `
    <tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: center;">${idx + 1}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; font-weight: bold; color: #4338ca;">${item.particular || '-'}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${formatCurrency(item.amount)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>All Transaction Summary Report</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; font-size: 12px; color: #1e293b; margin: 20px; }
          .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #4338ca; padding-bottom: 12px; }
          .title { font-size: 18px; font-weight: 800; color: #4338ca; text-transform: uppercase; letter-spacing: 1px; }
          .sub { font-size: 11px; color: #64748b; margin-top: 4px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #eef2ff; color: #3730a3; text-align: left; padding: 10px 8px; border-bottom: 2px solid #c7d2fe; font-size: 11px; text-transform: uppercase; font-weight: 800; }
          .tot { background: #eef2ff; font-weight: 800; font-size: 13px; color: #3730a3; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="title">All Transaction Summary Report</div>
          <div class="sub">Period: ${fromDate} to ${toDate}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">S.No</th>
              <th>Particulars</th>
              <th style="text-align: right;">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="3" style="text-align:center; padding: 30px; color: #94a3b8;">No transaction summary records found for selected period</td></tr>'}
          </tbody>
          <tfoot>
            <tr class="tot">
              <td colspan="2" style="padding: 12px 8px; text-align: right;">Total Amount:</td>
              <td style="padding: 12px 8px; text-align: right;">${formatCurrency(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
    </html>
  `;
};
