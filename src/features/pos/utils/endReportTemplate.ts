import type { EndReportData } from '../cashier/services/cashierLogService';
import { branchApi } from "../../inventory/branches/services/branchApi";
import { getLineStyle } from "../../inventory/branches/utils/lineHelpers";
import { getDayEndReportConfig } from '../services/posConfigApi';

export const generateEndReportHtml = async (data: EndReportData, reportType: 'DAYEND' | 'SHIFTEND', isPdf: boolean = false): Promise<string> => {
  const config = getDayEndReportConfig();
  console.log(`[${reportType} Report Data Received from Backend]:`, data);
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

  let customHeadersHtml = "";
  try {
    let branchLines: any[] = [];
    const cached = localStorage.getItem("branchPrintData");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) branchLines = parsed;
        else if (Array.isArray(parsed?.data)) branchLines = parsed.data;
      } catch {}
    }

    if (branchLines.length === 0) {
      try {
        branchLines = await branchApi.fetchBranchPrintData();
        if (branchLines && branchLines.length > 0) {
          localStorage.setItem("branchPrintData", JSON.stringify(branchLines));
        }
      } catch {
        const isBackoffice = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
        const branchIdStr = isBackoffice
          ? (sessionStorage.getItem("backoffice_activeBranchId") || sessionStorage.getItem("backoffice_branchId"))
          : (localStorage.getItem("activeBranchId") || localStorage.getItem("branchId"));
        
        let branchId = 0;
        if (branchIdStr && branchIdStr !== "null" && branchIdStr !== "undefined") {
          branchId = Number(branchIdStr);
        }
        if (branchId > 0) {
          const branch = await branchApi.fetchBranchById(branchId);
          if (branch && branch.lines) {
            branchLines = branch.lines;
          }
        }
      }
    }

    if (branchLines && branchLines.length > 0) {
      const isDayEnd = (l: any) => {
        const sec = String(l.section || "").toLowerCase();
        const code = String(l.code || l.id || "").toUpperCase();
        return sec === "dayendheader" || sec === "dayend" || code.startsWith("EH");
      };

      const headers = branchLines.filter(l => isDayEnd(l) && l.value && String(l.value).trim() !== "");
      if (headers.length > 0) {
        customHeadersHtml = headers.map(l => {
          const styleObj = getLineStyle(l) as any;
          const styleStr = Object.entries(styleObj).map(([k, v]) => {
            const kebab = k.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
            return `${kebab}:${v}`;
          }).join(";");
          return `<div style="${styleStr}">${l.value}</div>`;
        }).join("");
      }
    }
  } catch (e) {
    console.error("Failed to fetch branch for headers", e);
  }

  const h = data.header || {};
  const gs = data.generalSummary || {} as any;
  const cf = data.cashFlow || {} as any;

  // Helper to conditionally render headers (ignoring dummy "string" from swagger/API)
  const renderHeader = (text?: string) => {
    if (!text || text.toLowerCase() === 'string') return '';
    return `<div>${text}</div>`;
  };

  // Build the Header
  const headerHtml = customHeadersHtml ? `
    <div style="text-align: center; margin-bottom: 10px; padding: 0 10px; width: 100%; box-sizing: border-box; overflow-x: hidden;">
      ${customHeadersHtml}
      <div style="font-size: 16px; margin-top: 10px; font-weight: bold; text-transform: uppercase;">
        ${reportType === 'DAYEND' ? 'DAYEND REPORT' : 'SHIFTEND REPORT'}
      </div>
    </div>
  ` : `
    <div class="text-center font-bold">
      <div style="font-size: 18px;">${h.dayEndHeader1 && h.dayEndHeader1.toLowerCase() !== 'string' ? h.dayEndHeader1 : ''}</div>
      ${renderHeader(h.dayEndHeader2)}
      ${renderHeader(h.dayEndHeader3)}
      ${renderHeader(h.dayEndHeader4)}
      ${renderHeader(h.dayEndHeader5)}
      ${renderHeader(h.dayEndHeader6)}
      ${renderHeader((h as any).dayEndHeader7)}
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

  // Order Summary (Order Type)
  let orderSummaryHtml = '';
  if (config.showOrderType && data.orderTypes && data.orderTypes.length > 0) {
    orderSummaryHtml = `
      <div class="section-title">Order Summary</div>
      <table class="data-table mb-10">
        <tbody>
    `;
    let orderSummaryTotal = 0;
    data.orderTypes.forEach(o => {
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
  }

  // Waiter Summary (Employee)
  let waiterHtml = '';
  const waitersList = data.waiters || (data as any).employees || [];
  if (config.showEmployee && waitersList.length > 0) {
    waiterHtml = `
      <table class="data-table mb-10">
        <tbody>
          <tr><td colspan="2" class="font-bold">Waiter Summary</td><td class="text-right">X</td></tr>
    `;
    waitersList.forEach((w: any) => {
      const name = w.waiter || w.employeeName || w.employee || "Unknown";
      waiterHtml += `<tr><td>${name}</td><td class="text-right">${fmt(w.total)}</td></tr>`;
    });
    waiterHtml += `
          <tr><td class="font-bold">Total</td><td class="text-right font-bold">${fmt(waitersList.reduce((acc: number, curr: any) => acc + (curr.total || 0), 0))}</td></tr>
        </tbody>
      </table><hr />
    `;
  }

  // Sales By Category
  let categoryHtml = '';
  if (config.showCategory && data.categories && data.categories.length > 0) {
    categoryHtml = `
      <div class="section-title">Sales By Category</div>
      <table class="data-table mb-10">
        <thead>
          <tr>
            <th>Category</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Net</th>
          </tr>
        </thead>
        <tbody>
    `;
    (data.categories || []).forEach(c => {
      categoryHtml += `
          <tr>
            <td>${c.categoryName}</td>
            <td class="text-center">${c.qty}</td>
            <td class="text-right">${fmt(c.total)}</td>
          </tr>
      `;
    });
    categoryHtml += `</tbody></table><hr />`;
  }

  // Sales By Product
  let productHtml = '';
  const prodList = (data as any).products || (data as any).productSummary || [];
  if (config.showProduct && prodList.length > 0) {
    productHtml = `
      <div class="section-title">Sales By Product</div>
      <table class="data-table mb-10">
        <thead>
          <tr>
            <th>Product</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Net</th>
          </tr>
        </thead>
        <tbody>
    `;
    let prodTotal = 0;
    prodList.forEach((p: any) => {
      const name = p.productName || p.product || "Unknown";
      const qty = p.qty || p.quantity || 0;
      const total = p.total || p.amount || 0;
      prodTotal += Number(total) || 0;
      productHtml += `
          <tr>
            <td>${name}</td>
            <td class="text-center">${qty}</td>
            <td class="text-right">${fmt(total)}</td>
          </tr>
      `;
    });
    productHtml += `
          <tr>
            <td colspan="2" class="font-bold">Total</td>
            <td class="text-right font-bold">${fmt(prodTotal)}</td>
          </tr>
        </tbody>
      </table><hr />
    `;
  }

  // Sales By Group
  let groupHtml = '';
  const groupList = (data as any).groups || (data as any).groupSummary || [];
  if (config.showGroup && groupList.length > 0) {
    groupHtml = `
      <div class="section-title">Sales By Group</div>
      <table class="data-table mb-10">
        <thead>
          <tr>
            <th>Group</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Net</th>
          </tr>
        </thead>
        <tbody>
    `;
    let groupTotal = 0;
    groupList.forEach((g: any) => {
      const name = g.groupName || g.group || "Unknown";
      const qty = g.qty || g.quantity || 0;
      const total = g.total || g.amount || 0;
      groupTotal += Number(total) || 0;
      groupHtml += `
          <tr>
            <td>${name}</td>
            <td class="text-center">${qty}</td>
            <td class="text-right">${fmt(total)}</td>
          </tr>
      `;
    });
    groupHtml += `
          <tr>
            <td colspan="2" class="font-bold">Total</td>
            <td class="text-right font-bold">${fmt(groupTotal)}</td>
          </tr>
        </tbody>
      </table><hr />
    `;
  }

  // Driver Summary
  let driverHtml = '';
  const driverList = (data as any).drivers || (data as any).driverSummary || [];
  if (config.showDriver && driverList.length > 0) {
    driverHtml = `
      <div class="section-title">Driver Summary</div>
      <table class="data-table mb-10">
        <thead>
          <tr>
            <th>Driver</th>
            <th class="text-center">Count</th>
            <th class="text-right">Net</th>
          </tr>
        </thead>
        <tbody>
    `;
    let driverTotal = 0;
    driverList.forEach((d: any) => {
      const name = d.driverName || d.driver || "Unknown";
      const count = d.count || d.totalOrders || 0;
      const total = d.total || d.amount || 0;
      driverTotal += Number(total) || 0;
      driverHtml += `
          <tr>
            <td>${name}</td>
            <td class="text-center">${count}</td>
            <td class="text-right">${fmt(total)}</td>
          </tr>
      `;
    });
    driverHtml += `
          <tr>
            <td colspan="2" class="font-bold">Total</td>
            <td class="text-right font-bold">${fmt(driverTotal)}</td>
          </tr>
        </tbody>
      </table><hr />
    `;
  }

  // Voucher Entries
  let voucherHtml = '';
  const voucherList = (data as any).voucherEntries || (data as any).vouchers || [];
  if (config.showVoucherEntry && voucherList.length > 0) {
    voucherHtml = `
      <div class="section-title">Voucher Entries</div>
      <table class="data-table mb-10">
        <thead>
          <tr>
            <th>Voucher #</th>
            <th class="text-center">Type</th>
            <th class="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
    `;
    let voucherTotal = 0;
    voucherList.forEach((v: any) => {
      const num = v.voucherNo || v.voucherNumber || v.billNo || "-";
      const type = v.voucherType || v.type || "-";
      const amt = v.amount || 0;
      voucherTotal += Number(amt) || 0;
      voucherHtml += `
          <tr>
            <td>${num}</td>
            <td class="text-center">${type}</td>
            <td class="text-right">${fmt(amt)}</td>
          </tr>
      `;
    });
    voucherHtml += `
          <tr>
            <td colspan="2" class="font-bold">Total</td>
            <td class="text-right font-bold">${fmt(voucherTotal)}</td>
          </tr>
        </tbody>
      </table><hr />
    `;
  }

  // Void Items
  let voidHtml = '';
  const voidList = data.voidProducts || (data as any).voidItems || [];
  if (config.showVoidItem && voidList.length > 0) {
    voidHtml = `
      <div class="section-title">Void Items</div>
      <table class="data-table mb-10">
        <thead>
          <tr>
            <th>Product</th>
            <th class="text-center">BillNo</th>
            <th class="text-center">Waiter</th>
            <th class="text-center">Time</th>
            <th class="text-center">Qty</th>
            <th class="text-right">Amt</th>
          </tr>
        </thead>
        <tbody>
    `;
    let voidTotal = 0;
    voidList.forEach((v: any) => {
      const amt = v.amount || 0;
      voidTotal += amt;
      voidHtml += `
          <tr>
            <td>${v.productName || v.product}</td>
            <td class="text-center">${v.billNo || "-"}</td>
            <td class="text-center">${v.waiter || "-"}</td>
            <td class="text-center">${formatTime(v.time)}</td>
            <td class="text-center">${v.qty || 0}</td>
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

  // Denominations
  let denominationHtml = '';
  const denomList = (data as any).denominations || (data as any).cashDenominations || [];
  if (config.showDenomination && denomList.length > 0) {
    denominationHtml = `
      <div class="section-title">Denominations</div>
      <table class="data-table mb-10">
        <thead>
          <tr>
            <th>Denomination</th>
            <th class="text-center">Count</th>
            <th class="text-right">Total</th>
          </tr>
        </thead>
        <tbody>
    `;
    let denomTotal = 0;
    denomList.forEach((d: any) => {
      const count = d.count ?? d.cashCount ?? 0;
      const value = d.denomination ?? d.denominationValue ?? d.name ?? 0;
      const total = d.total ?? (Number(value) * Number(count));
      denomTotal += Number(total) || 0;
      denominationHtml += `
          <tr>
            <td>${value}</td>
            <td class="text-center">${count}</td>
            <td class="text-right">${fmt(total)}</td>
          </tr>
      `;
    });
    denominationHtml += `
          <tr>
            <td colspan="2" class="font-bold">Total</td>
            <td class="text-right font-bold">${fmt(denomTotal)}</td>
          </tr>
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
        ${productHtml}
        ${groupHtml}
        ${driverHtml}
        ${voucherHtml}
        ${voidHtml}
        ${denominationHtml}
        ${paymodeHtml}
        ${taxHtml}
        ${generalSummaryHtml}
        ${cashFlowHtml}
      </body>
    </html>
  `;
};
