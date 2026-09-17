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

      let headers = branchLines.filter(l => isDayEnd(l) && l.value && String(l.value).trim() !== "");
      if (headers.length === 0) {
        // Fallback to standard receipt headers (H1..H7) if no specific day-end headers configured
        const isHeader = (l: any) => {
          const sec = String(l.section || "").toLowerCase();
          const code = String(l.code || l.id || "").toUpperCase();
          return sec === "header" || (code.startsWith("H") && !code.startsWith("EH"));
        };
        headers = branchLines.filter(l => isHeader(l) && l.value && String(l.value).trim() !== "");
      }

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

  const h = (data.header || {}) as any;
  const gs = data.generalSummary || {} as any;
  const cf = data.cashFlow || {} as any;

  // Helper to conditionally render headers (ignoring dummy "string" from swagger/API)
  const renderHeader = (text?: string) => {
    if (!text || text.toLowerCase() === 'string') return '';
    return `<div>${text}</div>`;
  };

  const renderHeaderItem = (item: any) => {
    if (!item || !item.value || String(item.value).toLowerCase() === 'string') return '';
    try {
      const styleObj = getLineStyle(item) as any;
      const styleStr = Object.entries(styleObj).map(([k, v]) => {
        const kebab = k.replace(/[A-Z]/g, m => "-" + m.toLowerCase());
        return `${kebab}:${v}`;
      }).join(";");
      return `<div style="${styleStr}">${item.value}</div>`;
    } catch {
      return `<div>${item.value}</div>`;
    }
  };

  // Build the Header
  let fallbackHeaderContent = '';
  if (Array.isArray(data.header)) {
    fallbackHeaderContent = data.header.map(renderHeaderItem).join("");
  } else if (h.value && String(h.value).toLowerCase() !== 'string') {
    fallbackHeaderContent = renderHeaderItem(h);
  } else if (h.dayEndHeader1 || h.dayEndHeader2) {
    fallbackHeaderContent = `
      <div style="font-size: 16px; font-weight: bold;">${h.dayEndHeader1 && h.dayEndHeader1.toLowerCase() !== 'string' ? h.dayEndHeader1 : ''}</div>
      ${renderHeader(h.dayEndHeader2)}
      ${renderHeader(h.dayEndHeader3)}
      ${renderHeader(h.dayEndHeader4)}
      ${renderHeader(h.dayEndHeader5)}
      ${renderHeader(h.dayEndHeader6)}
      ${renderHeader(h.dayEndHeader7)}
    `;
  }

  const headerHtml = customHeadersHtml ? `
    <div style="text-align: center; margin-bottom: 6px; padding: 0 10px; width: 100%; box-sizing: border-box; overflow-x: hidden;">
      ${customHeadersHtml}
      <div style="font-size: 14px; margin-top: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
        ${reportType === 'DAYEND' ? 'DAYEND REPORT' : 'SHIFTEND REPORT'}
      </div>
    </div>
  ` : `
    <div style="text-align: center; margin-bottom: 6px;">
      ${fallbackHeaderContent}
      <div style="font-size: 14px; margin-top: 8px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
        ${reportType === 'DAYEND' ? 'DAYEND REPORT' : 'SHIFTEND REPORT'}
      </div>
    </div>
  `;

  // Start / End Dates — two-column label:value layout matching model
  const datesHtml = `
    <div class="dashed-line"></div>
    <table style="width: 100%; margin: 4px 0;">
      <tbody>
        <tr><td style="width: 45%;">Start Date</td><td>${formatDate(gs.startDate)}</td></tr>
        <tr><td>Start Time</td><td>${formatTime(gs.startDate)}</td></tr>
        <tr><td>End Date</td><td>${formatDate(gs.endDate)}</td></tr>
        <tr><td>End Time</td><td>${formatTime(gs.endDate)}</td></tr>
      </tbody>
    </table>
  `;

  // Order Summary — bordered box per order type with Amount/Tax/Charge/Disc/Total row
  let orderSummaryHtml = '';
  if (config.showOrderType && data.orderTypes && data.orderTypes.length > 0) {
    let grandOrderTotal = 0;
    let grandOrderQty = 0;
    let orderRowsHtml = '';
    data.orderTypes.forEach(o => {
      grandOrderTotal += o.total;
      grandOrderQty += o.count || 0;
      const amount = (o as any).amount ?? o.total;
      const tax = (o as any).tax ?? (o as any).vatAmount ?? 0;
      const charge = (o as any).charge ?? (o as any).deliveryCharge ?? 0;
      const disc = (o as any).disc ?? (o as any).discount ?? 0;
      orderRowsHtml += `
        <tr>
          <td colspan="5" style="padding: 3px 0 1px 0;">
            <table style="width: 100%; border: 1px solid #000; border-collapse: collapse; margin-bottom: 2px;">
              <tr>
                <td style="font-weight: bold; padding: 2px 4px; border-right: 1px solid #000; width: 40%;">${o.orderType}</td>
                <td style="padding: 2px 4px; border-right: 1px solid #000; text-align: center;">Count : ${o.count || 0}</td>
                <td style="padding: 2px 4px; text-align: right; font-weight: bold;">Total : ${fmt(o.total)}</td>
              </tr>
            </table>
          </td>
        </tr>
        <tr class="sub-header-row">
          <td>Amount</td>
          <td class="tc">Tax</td>
          <td class="tc">Charge</td>
          <td class="tc">Disc</td>
          <td class="tr">Total</td>
        </tr>
        <tr>
          <td>${fmt(amount)}</td>
          <td class="tc">${fmt(tax)}</td>
          <td class="tc">${fmt(charge)}</td>
          <td class="tc">${fmt(disc)}</td>
          <td class="tr">${fmt(o.total)}</td>
        </tr>
        <tr><td colspan="5"><div class="dashed-line" style="margin: 3px 0;"></div></td></tr>
      `;
    });
    orderSummaryHtml = `
      <div class="section-title">Order Summary</div>
      <div class="dashed-line"></div>
      <table style="width: 100%; font-size: 11px;">
        <tbody>
          ${orderRowsHtml}
          <tr>
            <td style="font-weight: bold;">${fmt(grandOrderQty)}</td>
            <td colspan="3"></td>
            <td class="tr font-bold">Total : ${fmt(grandOrderTotal)}</td>
          </tr>
        </tbody>
      </table>
      <div class="dashed-line"></div>
    `;
  }

  // Sales Details
  const salesDetails = (data as any).salesDetails || {};
  const saleAmount = salesDetails.saleAmount ?? data.salesSummary?.sales ?? 0;
  const complimentary = salesDetails.complimentary ?? (data as any).complimentary ?? 0;
  const discount = salesDetails.discount ?? (data as any).discount ?? 0;
  const totalSale = salesDetails.totalSale ?? (saleAmount + (data.salesSummary?.deliveryCharge || 0) + (data.salesSummary?.vatAmount || 0));

  const salesDetailsHtml = `
    <div class="section-title">Sales Details</div>
    <div class="dashed-line"></div>
    <table style="width: 100%;">
      <tbody>
        <tr><td>Sale Amount</td><td class="tr">${fmt(saleAmount)}</td></tr>
        <tr><td>Complimentary</td><td class="tr">${fmt(complimentary)}</td></tr>
        <tr><td>Discount</td><td class="tr">${fmt(discount)}</td></tr>
        <tr><td class="font-bold">Total Sale</td><td class="tr font-bold">${fmt(totalSale)}</td></tr>
      </tbody>
    </table>
    <div class="dashed-line"></div>
  `;

  // Waiter Summary (Employee)
  let waiterHtml = '';
  const waitersList = data.waiters || (data as any).employees || [];
  if (config.showEmployee && waitersList.length > 0) {
    let waiterTotal = 0;
    let waiterRows = '';
    waitersList.forEach((w: any) => {
      const name = w.waiter || w.employeeName || w.employee || "Unknown";
      const total = w.total || 0;
      waiterTotal += total;
      waiterRows += `<tr><td>${name}</td><td class="tr">${fmt(total)}</td></tr>`;
    });
    waiterHtml = `
      <div class="section-title">Waiter Summary</div>
      <div class="dashed-line"></div>
      <table style="width: 100%;">
        <tbody>
          ${waiterRows}
          <tr><td class="font-bold">Total</td><td class="tr font-bold">${fmt(waiterTotal)}</td></tr>
        </tbody>
      </table>
      <div class="dashed-line"></div>
    `;
  }

  // Sales By Product (simple: product name | amount)
  let productHtml = '';
  const prodList = (data as any).products || (data as any).productSummary || [];
  if (config.showProduct && prodList.length > 0) {
    let prodTotal = 0;
    let prodRows = '';
    prodList.forEach((p: any) => {
      const name = p.productName || p.product || "Unknown";
      const total = p.total || p.amount || 0;
      prodTotal += Number(total) || 0;
      prodRows += `<tr><td>${name}</td><td class="tr">${fmt(total)}</td></tr>`;
    });
    productHtml = `
      <div class="section-title">Product</div>
      <div class="dashed-line"></div>
      <table style="width: 100%;">
        <tbody>
          ${prodRows}
          <tr><td class="font-bold">Total</td><td class="tr font-bold">${fmt(prodTotal)}</td></tr>
        </tbody>
      </table>
      <div class="dashed-line"></div>
    `;
  }

  // Delivery Summary
  let deliveryHtml = '';
  const deliveryList = (data as any).deliverySummary || (data as any).deliveries || [];
  if (deliveryList.length > 0) {
    let deliveryTotal = 0;
    let deliveryRows = '';
    deliveryList.forEach((d: any) => {
      const name = d.deliveryBoy || d.driver || d.name || "Unknown";
      const count = d.count || d.totalOrders || 0;
      const total = d.total || d.amount || 0;
      deliveryTotal += Number(total) || 0;
      deliveryRows += `<tr><td>${name}</td><td class="tc">${count}</td><td class="tr">${fmt(total)}</td></tr>`;
    });
    deliveryHtml = `
      <div class="section-title">Delivery Summary</div>
      <div class="dashed-line"></div>
      <table style="width: 100%;">
        <thead>
          <tr>
            <th style="text-align:left;">Delivery Boy</th>
            <th class="tc">Count</th>
            <th class="tr">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${deliveryRows}
          <tr><td colspan="2" class="font-bold">Total</td><td class="tr font-bold">${fmt(deliveryTotal)}</td></tr>
        </tbody>
      </table>
      <div class="dashed-line"></div>
    `;
  }

  // Sales By Category — 5 columns: Category | Qty | Amt | Disc | Net
  let categoryHtml = '';
  if (config.showCategory && data.categories && data.categories.length > 0) {
    let catQtyTotal = 0, catAmtTotal = 0, catDiscTotal = 0, catNetTotal = 0;
    let catRows = '';
    data.categories.forEach(c => {
      const qty = c.qty || 0;
      const amt = (c as any).amount ?? c.total;
      const disc = (c as any).discount ?? (c as any).disc ?? 0;
      const net = c.total;
      catQtyTotal += Number(qty) || 0;
      catAmtTotal += Number(amt) || 0;
      catDiscTotal += Number(disc) || 0;
      catNetTotal += Number(net) || 0;
      catRows += `
        <tr>
          <td>${c.categoryName}</td>
          <td class="tc">${qty}</td>
          <td class="tr">${fmt(amt)}</td>
          <td class="tr">${fmt(disc)}</td>
          <td class="tr">${fmt(net)}</td>
        </tr>
      `;
    });
    categoryHtml = `
      <div class="section-title">Sales By Category</div>
      <div class="dashed-line"></div>
      <table style="width: 100%; font-size: 11px;">
        <thead>
          <tr>
            <th style="text-align:left;">Category</th>
            <th class="tc">Qty</th>
            <th class="tr">Amt</th>
            <th class="tr">Disc</th>
            <th class="tr">Net</th>
          </tr>
        </thead>
        <tbody>
          ${catRows}
          <tr>
            <td class="font-bold"></td>
            <td class="tc font-bold">${catQtyTotal}</td>
            <td class="tr font-bold">${fmt(catAmtTotal)}</td>
            <td class="tr font-bold">${fmt(catDiscTotal)}</td>
            <td class="tr font-bold">${fmt(catNetTotal)}</td>
          </tr>
        </tbody>
      </table>
      <div class="dashed-line"></div>
    `;
  }

  // Sales By Group — same 5-column layout
  let groupHtml = '';
  const groupList = (data as any).groups || (data as any).groupSummary || [];
  if (config.showGroup && groupList.length > 0) {
    let grpQtyTotal = 0, grpAmtTotal = 0, grpDiscTotal = 0, grpNetTotal = 0;
    let grpRows = '';
    groupList.forEach((g: any) => {
      const name = g.groupName || g.group || "Unknown";
      const qty = g.qty || g.quantity || 0;
      const amt = (g as any).amount ?? g.total;
      const disc = (g as any).discount ?? (g as any).disc ?? 0;
      const net = g.total;
      grpQtyTotal += Number(qty) || 0;
      grpAmtTotal += Number(amt) || 0;
      grpDiscTotal += Number(disc) || 0;
      grpNetTotal += Number(net) || 0;
      grpRows += `
        <tr>
          <td>${name}</td>
          <td class="tc">${qty}</td>
          <td class="tr">${fmt(amt)}</td>
          <td class="tr">${fmt(disc)}</td>
          <td class="tr">${fmt(net)}</td>
        </tr>
      `;
    });
    groupHtml = `
      <div class="section-title">Sales By Group</div>
      <div class="dashed-line"></div>
      <table style="width: 100%; font-size: 11px;">
        <thead>
          <tr>
            <th style="text-align:left;">Group</th>
            <th class="tc">Qty</th>
            <th class="tr">Amt</th>
            <th class="tr">Disc</th>
            <th class="tr">Net</th>
          </tr>
        </thead>
        <tbody>
          ${grpRows}
          <tr>
            <td class="font-bold"></td>
            <td class="tc font-bold">${grpQtyTotal}</td>
            <td class="tr font-bold">${fmt(grpAmtTotal)}</td>
            <td class="tr font-bold">${fmt(grpDiscTotal)}</td>
            <td class="tr font-bold">${fmt(grpNetTotal)}</td>
          </tr>
        </tbody>
      </table>
      <div class="dashed-line"></div>
    `;
  }

  // Void Items
  let voidHtml = '';
  const voidList = data.voidProducts || (data as any).voidItems || [];
  if (config.showVoidItem && voidList.length > 0) {
    let voidTotal = 0;
    let voidRows = '';
    voidList.forEach((v: any) => {
      const amt = v.amount || 0;
      voidTotal += amt;
      voidRows += `
        <tr>
          <td>${v.productName || v.product}</td>
          <td class="tc">${v.billNo || "-"}</td>
          <td class="tc">${v.waiter || "-"}</td>
          <td class="tc">${formatTime(v.time)}</td>
          <td class="tc">${v.qty || 0}</td>
          <td class="tr">${fmt(amt)}</td>
        </tr>
      `;
    });
    voidHtml = `
      <div class="section-title">Void Items</div>
      <div class="dashed-line"></div>
      <table style="width: 100%; font-size: 11px;">
        <thead>
          <tr>
            <th style="text-align:left;">Product</th>
            <th class="tc">Bill No</th>
            <th class="tc">Waiter</th>
            <th class="tc">Time</th>
            <th class="tc">Qty</th>
            <th class="tr">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${voidRows}
          <tr>
            <td colspan="5" class="tr font-bold">Total</td>
            <td class="tr font-bold">${fmt(voidTotal)}</td>
          </tr>
        </tbody>
      </table>
      <div class="dashed-line"></div>
    `;
  }

  // Payment Summary — Paymode | Count | Amount
  let paymodeTotal = 0;
  let paymodeRows = '';
  (data.paymodes || []).forEach(p => {
    const count = (p as any).count ?? (p as any).transactionCount ?? 0;
    paymodeTotal += p.amount;
    paymodeRows += `<tr><td>${p.paymodeName}</td><td class="tc">${count}</td><td class="tr">${fmt(p.amount)}</td></tr>`;
  });
  const paymodeHtml = `
    <div class="section-title">Payment Summary</div>
    <div class="dashed-line"></div>
    <table style="width: 100%;">
      <thead>
        <tr>
          <th style="text-align:left;">Paymode</th>
          <th class="tc">Count</th>
          <th class="tr">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${paymodeRows}
        <tr><td colspan="2" class="font-bold">Total</td><td class="tr font-bold">${fmt(paymodeTotal)}</td></tr>
      </tbody>
    </table>
    <div class="dashed-line"></div>
  `;

  // Tax Summary
  let vatTotal = 0;
  let taxRows = '';
  (data.taxSummary || []).forEach(t => {
    vatTotal += t.vatAmount;
    taxRows += `<tr><td>${t.vatName}</td><td class="tr">${fmt(t.exclAmount)}</td><td class="tr">${fmt(t.vatAmount)}</td></tr>`;
  });
  const taxHtml = `
    <div class="section-title">Tax Summary</div>
    <div class="dashed-line"></div>
    <table style="width: 100%;">
      <thead>
        <tr>
          <th style="text-align:left;">Rate</th>
          <th class="tr">Amount</th>
          <th class="tr">VAT Amount</th>
        </tr>
      </thead>
      <tbody>
        ${taxRows}
        <tr><td colspan="2"></td><td class="tr font-bold">${fmt(vatTotal)}</td></tr>
      </tbody>
    </table>
    <div class="dashed-line"></div>
  `;

  // Pay-Out section
  const payOutList = (data as any).payOuts || (data as any).payoutDetails || [];
  let payOutHtml = '';
  if (payOutList.length > 0) {
    let payOutTotal = 0;
    let payOutRows = '';
    payOutList.forEach((po: any) => {
      const ledger = po.ledger || po.ledgerName || po.description || "-";
      const remarks = po.remarks || po.remark || "";
      const amount = po.amount || 0;
      payOutTotal += Number(amount) || 0;
      payOutRows += `<tr><td>${ledger}</td><td class="tc">${remarks}</td><td class="tr">${fmt(amount)}</td></tr>`;
    });
    payOutHtml = `
      <div class="section-title">Pay-Out</div>
      <div class="dashed-line"></div>
      <table style="width: 100%; font-size: 11px;">
        <thead>
          <tr>
            <th style="text-align:left;">Ledger</th>
            <th class="tc">Remarks</th>
            <th class="tr">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${payOutRows}
          <tr><td colspan="2"></td><td class="tr font-bold">${fmt(payOutTotal)}</td></tr>
        </tbody>
      </table>
      <div class="dashed-line"></div>
    `;
  } else if (cf.payOut != null) {
    // Fallback: just show the total payout if no detail records
    payOutHtml = `
      <div class="section-title">Pay-Out</div>
      <div class="dashed-line"></div>
      <table style="width: 100%; font-size: 11px;">
        <thead>
          <tr>
            <th style="text-align:left;">Ledger</th>
            <th class="tc">Remarks</th>
            <th class="tr">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="2"></td><td class="tr font-bold">${fmt(cf.payOut)}</td></tr>
        </tbody>
      </table>
      <div class="dashed-line"></div>
    `;
  }

  // Tips Summary
  const tipsList = (data as any).tips || (data as any).tipsSummary || [];
  let tipsTotal = 0;
  let tipsRows = '';
  tipsList.forEach((t: any) => {
    const paymode = t.paymodeName || t.paymode || "-";
    const amount = t.amount || 0;
    tipsTotal += Number(amount) || 0;
    tipsRows += `<tr><td>${paymode}</td><td class="tr">${fmt(amount)}</td></tr>`;
  });
  const tipsHtml = `
    <div class="section-title">Tips Summary</div>
    <div class="dashed-line"></div>
    <table style="width: 100%;">
      <thead>
        <tr>
          <th style="text-align:left;">Paymode</th>
          <th class="tr">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${tipsRows.length > 0 ? tipsRows : '<tr><td colspan="2" class="tr">0</td></tr>'}
        ${tipsRows.length > 0 ? `<tr><td class="font-bold">Total</td><td class="tr font-bold">${fmt(tipsTotal)}</td></tr>` : ''}
      </tbody>
    </table>
    <div class="dashed-line"></div>
  `;

  // Driver Summary
  let driverHtml = '';
  const driverList = (data as any).drivers || (data as any).driverSummary || [];
  if (config.showDriver && driverList.length > 0) {
    let driverTotal = 0;
    let driverRows = '';
    driverList.forEach((d: any) => {
      const name = d.driverName || d.driver || "Unknown";
      const count = d.count || d.totalOrders || 0;
      const total = d.total || d.amount || 0;
      driverTotal += Number(total) || 0;
      driverRows += `<tr><td>${name}</td><td class="tc">${count}</td><td class="tr">${fmt(total)}</td></tr>`;
    });
    driverHtml = `
      <div class="section-title">Driver Summary</div>
      <div class="dashed-line"></div>
      <table style="width: 100%;">
        <thead>
          <tr><th style="text-align:left;">Driver</th><th class="tc">Count</th><th class="tr">Net</th></tr>
        </thead>
        <tbody>
          ${driverRows}
          <tr><td colspan="2" class="font-bold">Total</td><td class="tr font-bold">${fmt(driverTotal)}</td></tr>
        </tbody>
      </table>
      <div class="dashed-line"></div>
    `;
  }

  // Voucher Entries
  let voucherHtml = '';
  const voucherList = (data as any).voucherEntries || (data as any).vouchers || [];
  if (config.showVoucherEntry && voucherList.length > 0) {
    let voucherTotal = 0;
    let voucherRows = '';
    voucherList.forEach((v: any) => {
      const num = v.voucherNo || v.voucherNumber || v.billNo || "-";
      const type = v.voucherType || v.type || "-";
      const amt = v.amount || 0;
      voucherTotal += Number(amt) || 0;
      voucherRows += `<tr><td>${num}</td><td class="tc">${type}</td><td class="tr">${fmt(amt)}</td></tr>`;
    });
    voucherHtml = `
      <div class="section-title">Voucher Entries</div>
      <div class="dashed-line"></div>
      <table style="width: 100%;">
        <thead>
          <tr><th style="text-align:left;">Voucher #</th><th class="tc">Type</th><th class="tr">Amount</th></tr>
        </thead>
        <tbody>
          ${voucherRows}
          <tr><td colspan="2" class="font-bold">Total</td><td class="tr font-bold">${fmt(voucherTotal)}</td></tr>
        </tbody>
      </table>
      <div class="dashed-line"></div>
    `;
  }

  // Denominations
  let denominationHtml = '';
  const denomList = (data as any).denominations || (data as any).cashDenominations || [];
  if (config.showDenomination && denomList.length > 0) {
    let denomTotal = 0;
    let denomRows = '';
    denomList.forEach((d: any) => {
      const count = d.count ?? d.cashCount ?? 0;
      const value = d.denomination ?? d.denominationValue ?? d.name ?? 0;
      const total = d.total ?? (Number(value) * Number(count));
      denomTotal += Number(total) || 0;
      denomRows += `<tr><td>${value}</td><td class="tc">${count}</td><td class="tr">${fmt(total)}</td></tr>`;
    });
    denominationHtml = `
      <div class="section-title">Denominations</div>
      <div class="dashed-line"></div>
      <table style="width: 100%;">
        <thead>
          <tr><th style="text-align:left;">Denomination</th><th class="tc">Count</th><th class="tr">Total</th></tr>
        </thead>
        <tbody>
          ${denomRows}
          <tr><td colspan="2" class="font-bold">Total</td><td class="tr font-bold">${fmt(denomTotal)}</td></tr>
        </tbody>
      </table>
      <div class="dashed-line"></div>
    `;
  }

  // Sales Summary — matches the physical receipt layout
  const grandTotal = (data.salesSummary?.sales || 0) + vatTotal + (data.salesSummary?.deliveryCharge || 0);
  const refund = (data as any).refund ?? (gs as any).refund ?? 0;
  const totalDiscount = (data as any).totalDiscount ?? (gs as any).totalDiscount ?? 0;
  const driverDiscount = (data as any).driverDiscount ?? (gs as any).driverDiscount ?? 0;

  const salesSummaryHtml = `
    <div class="section-title">Sales Summary</div>
    <div class="dashed-line"></div>
    <table style="width: 100%;">
      <tbody>
        <tr><td>Sale</td><td class="tr">${fmt(data.salesSummary?.sales)}</td></tr>
        <tr><td>Delivery Charge</td><td class="tr">${fmt(data.salesSummary?.deliveryCharge)}</td></tr>
        <tr><td>VAT Amount</td><td class="tr">${fmt(data.salesSummary?.vatAmount)}</td></tr>
        <tr><td class="font-bold">Grand Total</td><td class="tr font-bold">${fmt(grandTotal)}</td></tr>
        <tr><td>Refund</td><td class="tr">${fmt(refund)}</td></tr>
        <tr><td>Cancelled Sales</td><td class="tr">${fmt(gs.voidSales)}</td></tr>
        <tr><td>Cancelled Order</td><td class="tr">${fmt(gs.voidOrders)}</td></tr>
        <tr><td class="font-bold">Total Discount</td><td class="tr font-bold">${fmt(totalDiscount)}</td></tr>
        <tr><td>Driver Discount</td><td class="tr">${fmt(driverDiscount)}</td></tr>
        <tr><td>Pending Order</td><td class="tr">${fmt(gs.pendingOrder)}</td></tr>
      </tbody>
    </table>
    <div class="dashed-line"></div>
  `;

  // Cash Flow — matches physical receipt: CASH, Pay In, Total Cash In, Pay Out, Purchase, Total Cash Out, Net Cash, Closing Balance, Difference
  const purchase = (cf as any).purchase ?? 0;
  const totalCashIn = (cf.cashSales || 0) + (cf.payIn || 0);
  const totalCashOut = (cf.payOut || 0) + (purchase || 0);
  const netCash = totalCashIn - totalCashOut;
  const difference = (cf.closingBal || 0) - netCash;

  const cashFlowHtml = `
    <div class="section-title">Cash Flow</div>
    <div class="dashed-line"></div>
    <table style="width: 100%;">
      <tbody>
        <tr><td>CASH</td><td class="tr">${fmt(cf.cashSales)}</td></tr>
        <tr><td>Pay In</td><td class="tr">${fmt(cf.payIn)}</td></tr>
        <tr><td class="font-bold">Total Cash In</td><td class="tr font-bold">${fmt(totalCashIn)}</td></tr>
        <tr><td>Pay Out</td><td class="tr">${fmt(cf.payOut)}</td></tr>
        <tr><td>Purchase</td><td class="tr">${fmt(purchase)}</td></tr>
        <tr><td class="font-bold">Total Cash Out</td><td class="tr font-bold">${fmt(totalCashOut)}</td></tr>
        <tr><td class="font-bold">Net Cash</td><td class="tr font-bold">${fmt(netCash)}</td></tr>
        <tr><td class="font-bold">Closing Balance</td><td class="tr font-bold">${fmt(cf.closingBal)}</td></tr>
        <tr><td class="font-bold">Difference</td><td class="tr font-bold">${fmt(difference)}</td></tr>
      </tbody>
    </table>
    <div class="dashed-line"></div>
  `;

  // Printed On footer
  const printedOn = new Date().toLocaleString('en-GB');
  const footerHtml = `
    <div style="text-align: center; margin-top: 8px; font-size: 10px;">
      Printed On : ${printedOn}
    </div>
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
            font-size: 12px;
            color: #000;
            padding: 0;
          }
          .tc { text-align: center; }
          .tr { text-align: right; }
          .font-bold { font-weight: bold; }
          .section-title { font-weight: bold; margin: 8px 0 2px 0; font-size: 12px; }
          .dashed-line { border-top: 1px dashed #000; margin: 3px 0; }
          .sub-header-row td { font-size: 10px; color: #333; padding-bottom: 1px; }

          table { width: 100%; font-size: 12px; border-collapse: collapse; }
          th { text-align: left; font-weight: bold; padding-bottom: 2px; }
          td { padding: 1px 0; vertical-align: top; }
        </style>
      </head>
      <body>
        ${headerHtml}
        ${datesHtml}
        ${orderSummaryHtml}
        ${salesDetailsHtml}
        ${waiterHtml}
        ${productHtml}
        ${deliveryHtml}
        ${categoryHtml}
        ${groupHtml}
        ${voidHtml}
        ${denominationHtml}
        ${paymodeHtml}
        ${taxHtml}
        ${payOutHtml}
        ${tipsHtml}
        ${driverHtml}
        ${voucherHtml}
        ${salesSummaryHtml}
        ${cashFlowHtml}
        ${footerHtml}
      </body>
    </html>
  `;
};
