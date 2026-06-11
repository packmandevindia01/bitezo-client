import type { EndReportData } from '../cashier/services/cashierLogService';

export const generateEndReportHtml = (data: EndReportData, reportType: 'DAYEND' | 'SHIFTEND', isPdf: boolean = false): string => {
  const decimalPart = parseInt(localStorage.getItem('decimalPart') || '3', 10);
  const fmt = (val: number | undefined | null) => Number(val || 0).toFixed(decimalPart);
  
  const formatDate = (isoStr: string) => {
    if (!isoStr || isoStr.includes('1900-01-01')) return '';
    try {
      const date = new Date(isoStr);
      return date.toLocaleDateString('en-GB'); // DD/MM/YYYY
    } catch {
      return '';
    }
  };

  const formatTime = (isoStr: string) => {
    if (!isoStr || isoStr.includes('1900-01-01')) return '';
    try {
      const date = new Date(isoStr);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const h = data.header || {};
  const gs = data.generalSummary || {} as any;
  const cf = data.cashFlow || {} as any;

  // Helper to conditionally render headers (ignoring dummy "string" from swagger/API)
  const renderHeader = (text?: string) => {
    if (!text || text.toLowerCase() === 'string') return '';
    return `<div>${text}</div>`;
  };

  // Build the Header
  const headerHtml = `
    <div class="text-center font-bold">
      <div style="font-size: 18px;">${h.dayEndHeader1 && h.dayEndHeader1.toLowerCase() !== 'string' ? h.dayEndHeader1 : ''}</div>
      ${renderHeader(h.dayEndHeader2)}
      ${renderHeader(h.dayEndHeader3)}
      ${renderHeader(h.dayEndHeader4)}
      ${renderHeader(h.dayEndHeader5)}
      ${renderHeader(h.dayEndHeader6)}
      <div style="font-size: 16px; margin-top: 10px; font-weight: bold; text-transform: uppercase;">
        ${reportType === 'DAYEND' ? 'DAYEND REPORT' : 'SHIFTEND REPORT'}
      </div>
    </div>
  `;

  // Start / End Dates
  const datesHtml = `
    <table style="width: 100%; margin-top: 10px;">
      <tbody>
        <tr><td style="width: 40%;">Start Date</td><td>: ${formatDate(gs.startDate)}</td></tr>
        <tr><td>Start Time</td><td>: ${formatTime(gs.startDate)}</td></tr>
        <tr><td>End Date</td><td>: ${formatDate(gs.endDate)}</td></tr>
        <tr><td>End Time</td><td>: ${formatTime(gs.endDate)}</td></tr>
      </tbody>
    </table>
    <hr />
  `;

  // Order Summary
  let orderSummaryHtml = `
    <div class="section-title">Order Summary</div>
    <table class="data-table mb-10">
      <tbody>
  `;
  let orderSummaryTotal = 0;
  (data.orderTypes || []).forEach(o => {
    orderSummaryTotal += o.total;
    orderSummaryHtml += `
      <tr>
        <td colspan="2" class="font-bold">${o.orderType}</td>
        <td class="font-bold text-center">Count : ${o.count || 0}</td>
        <td colspan="2" class="text-right font-bold">Total : ${fmt(o.total)}</td>
      </tr>
    `;
  });
  orderSummaryHtml += `
      <tr>
        <td colspan="3"></td>
        <td colspan="2" class="text-right font-bold">Total : ${fmt(orderSummaryTotal)}</td>
      </tr>
  </tbody></table><hr />`;

  // Waiter Summary
  let waiterHtml = `
    <table class="data-table mb-10">
      <tbody>
        <tr><td colspan="2" class="font-bold">Waiter Summary</td><td class="text-right">X</td></tr>
  `;
  (data.waiters || []).forEach(w => {
    waiterHtml += `<tr><td>${w.waiter}</td><td class="text-right">${fmt(w.total)}</td></tr>`;
  });
  waiterHtml += `
        <tr><td class="font-bold">Total</td><td class="text-right font-bold">${fmt(data.waiters?.reduce((acc, curr) => acc + curr.total, 0))}</td></tr>
      </tbody>
    </table><hr />
  `;

  // Sales By Category
  let categoryHtml = `
    <div class="section-title">Sales By Category</div>
    <table class="data-table mb-10">
      <thead>
        <tr>
          <th>Category</th>
          <th>Qty</th>
          <th class="text-right">Net</th>
        </tr>
      </thead>
      <tbody>
  `;
  (data.categories || []).forEach(c => {
    categoryHtml += `
        <tr>
          <td>${c.categoryName}</td>
          <td>${c.qty}</td>
          <td class="text-right">${fmt(c.total)}</td>
        </tr>
    `;
  });
  categoryHtml += `</tbody></table><hr />`;

  // Void Items
  let voidHtml = '';
  if (data.voidProducts && data.voidProducts.length > 0) {
    voidHtml = `
      <div class="section-title">Void Items</div>
      <table class="data-table mb-10">
        <thead>
          <tr>
            <th>Product</th>
            <th>BillNo</th>
            <th>Waiter</th>
            <th>Time</th>
            <th>Qty</th>
            <th class="text-right">Amt</th>
          </tr>
        </thead>
        <tbody>
    `;
    let voidTotal = 0;
    data.voidProducts.forEach(v => {
      const amt = v.amount || 0;
      voidTotal += amt;
      voidHtml += `
          <tr>
            <td>${v.productName || v.product}</td>
            <td>${v.billNo}</td>
            <td>${v.waiter}</td>
            <td>${formatTime(v.time)}</td>
            <td>${v.qty}</td>
            <td class="text-right">${fmt(amt)}</td>
          </tr>
      `;
    });
    voidHtml += `
          <tr><td colspan="5" class="text-right font-bold">Total</td><td class="text-right font-bold">${fmt(voidTotal)}</td></tr>
        </tbody>
      </table><hr />
    `;
  }

  // Payment Summary
  let paymodeHtml = `
    <div class="section-title">Payment Summary</div>
    <table class="data-table mb-10">
      <thead>
        <tr>
          <th>Paymode</th>
          <th class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
  `;
  let paymodeTotal = 0;
  (data.paymodes || []).forEach(p => {
    paymodeTotal += p.amount;
    paymodeHtml += `<tr><td>${p.paymodeName}</td><td class="text-right">${fmt(p.amount)}</td></tr>`;
  });
  paymodeHtml += `
        <tr><td class="font-bold">Total</td><td class="text-right font-bold">${fmt(paymodeTotal)}</td></tr>
      </tbody>
    </table><hr />
  `;

  // Tax Summary
  let taxHtml = `
    <div class="section-title">Tax Summary</div>
    <table class="data-table mb-10">
      <thead>
        <tr>
          <th>Rate</th>
          <th>Amount</th>
          <th class="text-right">VAT Amount</th>
        </tr>
      </thead>
      <tbody>
  `;
  let vatTotal = 0;
  (data.taxSummary || []).forEach(t => {
    vatTotal += t.vatAmount;
    taxHtml += `<tr><td>${t.vatName}</td><td>${fmt(t.exclAmount)}</td><td class="text-right">${fmt(t.vatAmount)}</td></tr>`;
  });
  taxHtml += `
        <tr><td colspan="2"></td><td class="text-right font-bold">${fmt(vatTotal)}</td></tr>
      </tbody>
    </table><hr />
  `;

  const generalSummaryHtml = `
    <table class="data-table mb-10">
      <tbody>
        <tr><td>Sale</td><td class="text-right">${fmt(data.salesSummary?.sales)}</td></tr>
        <tr><td>Delivery Charge</td><td class="text-right">${fmt(data.salesSummary?.deliveryCharge)}</td></tr>
        <tr><td>VAT Amount</td><td class="text-right">${fmt(data.salesSummary?.vatAmount)}</td></tr>
        <tr><td class="font-bold">Grand Total</td><td class="text-right font-bold">${fmt((data.salesSummary?.sales || 0) + vatTotal + (data.salesSummary?.deliveryCharge || 0))}</td></tr>
        <tr><td>Cancelled Sales</td><td class="text-right">${fmt(gs.voidSales)}</td></tr>
        <tr><td>Cancelled Order</td><td class="text-right">${fmt(gs.voidOrders)}</td></tr>
      </tbody>
    </table><hr />
  `;

  // Cash Flow
  const cashFlowHtml = `
    <table class="data-table mb-10">
      <tbody>
        <tr><td>Pending Order</td><td class="text-right">${fmt(gs.pendingOrder)}</td></tr>
      </tbody>
    </table><hr style="border-top: 1px dashed #000;" />
    <table class="data-table">
      <tbody>
        <tr><td class="font-bold">Cash Flow</td><td class="text-right font-bold">X</td></tr>
        <tr><td>CASH</td><td class="text-right">${fmt(cf.cashSales)}</td></tr>
        <tr><td>Pay In</td><td class="text-right">${fmt(cf.payIn)}</td></tr>
        <tr><td class="font-bold">Total Cash In</td><td class="text-right font-bold">${fmt((cf.cashSales || 0) + (cf.payIn || 0))}</td></tr>
        <tr><td>Pay Out</td><td class="text-right">${fmt(cf.payOut)}</td></tr>
        <tr><td class="font-bold">Total Cash Out</td><td class="text-right font-bold">${fmt(cf.payOut)}</td></tr>
        <tr><td>Net Cash</td><td class="text-right">${fmt(((cf.cashSales || 0) + (cf.payIn || 0)) - (cf.payOut || 0))}</td></tr>
        <tr><td class="font-bold">Closing Balance</td><td class="text-right font-bold">${fmt(cf.closingBal)}</td></tr>
        <tr><td class="font-bold">Difference</td><td class="text-right font-bold">${fmt(cf.closingBal - ((cf.cashSales + cf.payIn) - cf.payOut))}</td></tr>
      </tbody>
    </table><hr />
  `;

  return `
    <html>
      <head>
        <style>
          ${isPdf ? `
          @page { size: A4 portrait; margin: 15mm; }
          body { width: 210mm; max-width: 100%; margin: 0 auto; }
          ` : `
          body { width: 100%; margin: 0; }
          `}
          * {
            border-color: #000000 !important;
            outline-color: transparent !important;
            background-color: transparent !important;
          }
          html, body {
            background-color: #ffffff !important;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
            color: #000;
            padding: 0;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .section-title { font-weight: bold; margin: 10px 0 5px 0; }
          .mb-10 { margin-bottom: 10px; }
          
          table { width: 100%; font-size: 12px; border-collapse: collapse; }
          th { text-align: left; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 3px; }
          td { padding: 2px 0; vertical-align: top; }
          
          hr { border: none; border-top: 1px solid #000; margin: 8px 0; }
        </style>
      </head>
      <body>
        ${headerHtml}
        ${datesHtml}
        ${orderSummaryHtml}
        ${waiterHtml}
        ${categoryHtml}
        ${voidHtml}
        ${paymodeHtml}
        ${taxHtml}
        ${generalSummaryHtml}
        ${cashFlowHtml}
      </body>
    </html>
  `;
};
