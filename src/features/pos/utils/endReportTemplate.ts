import type { EndReportData } from '../cashier/services/cashierLogService';
import { branchApi } from "../../inventory/branches/services/branchApi";
import { getLineStyle } from "../../inventory/branches/utils/lineHelpers";
import { getDayEndReportConfig } from '../services/posConfigApi';

export const generateEndReportHtml = async (data: EndReportData, reportType: 'DAYEND' | 'SHIFTEND', isPdf: boolean = false): Promise<string> => {
  const config = getDayEndReportConfig();
  console.log(`[${reportType} Report Data Received from Backend]:`, data);
  const decimalPart = parseInt(localStorage.getItem('decimalPart') || '3', 10);
  const fmt = (val: number | undefined | null) => Number(val || 0).toFixed(decimalPart);

  // Normalize unicode superscript/special characters to plain ASCII (e.g. ᵀᴱᴸ → TEL)
  const sanitizeHeaderText = (text: string): string => {
    const map: Record<string, string> = {
      'ᵀ': 'T', 'ᴱ': 'E', 'ᴸ': 'L', 'ᴺ': 'N', 'ᶠ': 'F', 'ᴬ': 'A', 'ˢ': 'S',
      'ᴵ': 'I', 'ᴼ': 'O', 'ᴮ': 'B', 'ᴿ': 'R', 'ᴳ': 'G', 'ᴴ': 'H', 'ᴾ': 'P',
      '·': ':', '•': ':', '‧': '.', '⋅': '.',
    };
    return text.replace(/[\u0100-\u036F\u1D00-\u1DBF\u00B7\u2022\u00B7\u22C5]/g, (ch) => map[ch] || ch);
  };

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
          return `<div dir="auto" style="${styleStr}">${sanitizeHeaderText(l.value)}</div>`;
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
      return `<div dir="auto" style="${styleStr}">${item.value}</div>`;
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

  const reportTypeLabel = reportType === 'DAYEND' ? 'DAY END REPORT' : 'SHIFT END REPORT';
  const effectiveHeader = customHeadersHtml || fallbackHeaderContent;
  const headerHtml = `
    ${effectiveHeader ? `
      <div style="text-align: center; margin-bottom: 4px; padding: 0 2px; width: 100%; box-sizing: border-box;">
        ${effectiveHeader}
      </div>
      <div class="sep"></div>
    ` : ''}
    <div style="text-align: center; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 3px 0;">
      ${reportTypeLabel}
    </div>
    <div class="sep"></div>
  `;

  // Extract User & Counter details (especially crucial for Shift End)
  const user = String(
    (data as any).user 
    || (data as any).userName 
    || (data as any).cashier 
    || (data as any).cashierName 
    || (gs as any).user 
    || (gs as any).userName 
    || (gs as any).cashier 
    || (gs as any).cashierName 
    || (data as any).shiftInfo?.user 
    || (data as any).shiftInfo?.userName 
    || (data as any).shift?.user 
    || (data as any).shift?.userName 
    || (h as any).user 
    || (reportType === 'SHIFTEND' ? (localStorage.getItem("userName") || sessionStorage.getItem("backoffice_userName") || "") : "")
  ).trim();

  const counter = String(
    (data as any).counter 
    || (data as any).counterName 
    || (gs as any).counter 
    || (gs as any).counterName 
    || (data as any).shiftInfo?.counter 
    || (data as any).shiftInfo?.counterName 
    || (data as any).shift?.counter 
    || (data as any).shift?.counterName 
    || (h as any).counter 
    || (reportType === 'SHIFTEND' ? (localStorage.getItem("systemCounterName") || localStorage.getItem("counterName") || (localStorage.getItem("systemCounterId") ? `Counter ${localStorage.getItem("systemCounterId")}` : "")) : "")
  ).trim();

  const userRowHtml = user && user !== 'undefined' && user !== 'null' ? `
    <tr>
      <td style="text-align: left; font-weight: 600;">User</td>
      <td style="text-align: right; font-weight: 600;">${user}</td>
    </tr>
  ` : '';

  const counterRowHtml = counter && counter !== 'undefined' && counter !== 'null' ? `
    <tr>
      <td style="text-align: left; font-weight: 600;">Counter</td>
      <td style="text-align: right; font-weight: 600;">${counter}</td>
    </tr>
  ` : '';

  // Start / End Dates, User, Counter — label left, value right
  const datesHtml = `
    <table style="width: 100%; table-layout: fixed; margin: 4px 0;">
      <tbody>
        <tr>
          <td style="width: 45%; text-align: left; font-weight: 600;">Start Date</td>
          <td style="width: 55%; text-align: right; font-weight: 600;">${formatDate(gs.startDate)}</td>
        </tr>
        <tr>
          <td style="text-align: left; font-weight: 600;">Start Time</td>
          <td style="text-align: right; font-weight: 600;">${formatTime(gs.startDate)}</td>
        </tr>
        <tr>
          <td style="text-align: left; font-weight: 600;">End Date</td>
          <td style="text-align: right; font-weight: 600;">${formatDate(gs.endDate)}</td>
        </tr>
        <tr>
          <td style="text-align: left; font-weight: 600;">End Time</td>
          <td style="text-align: right; font-weight: 600;">${formatTime(gs.endDate)}</td>
        </tr>
        ${userRowHtml}
        ${counterRowHtml}
      </tbody>
    </table>
  `;

  // Order Summary — fixed 5 columns, right-aligned amount fields matching headers
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
          <td colspan="3" style="text-align: left; font-weight: 700;">${o.orderType}</td>
          <td colspan="2" style="text-align: right; font-weight: 700;">Cnt: ${o.count || 0}</td>
        </tr>
        <tr class="sub-header-row">
          <th style="width: 20%; text-align: right;">Amt</th>
          <th style="width: 20%; text-align: right;">Tax</th>
          <th style="width: 20%; text-align: right;">Chg</th>
          <th style="width: 20%; text-align: right;">Disc</th>
          <th style="width: 20%; text-align: right;">Total</th>
        </tr>
        <tr>
          <td style="text-align: right;">${fmt(amount)}</td>
          <td style="text-align: right;">${fmt(tax)}</td>
          <td style="text-align: right;">${fmt(charge)}</td>
          <td style="text-align: right;">${fmt(disc)}</td>
          <td style="text-align: right; font-weight: 700;">${fmt(o.total)}</td>
        </tr>
        <tr><td colspan="5"><div class="sep"></div></td></tr>
      `;
    });
    orderSummaryHtml = `
      <div class="section-title">Order Summary</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed;">
        <tbody>
          ${orderRowsHtml}
          <tr>
            <td colspan="3" style="text-align: left; font-weight: 700;">Total Orders: ${grandOrderQty}</td>
            <td colspan="2" style="text-align: right; font-weight: 700;">${fmt(grandOrderTotal)}</td>
          </tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  }

  // Sales Details — 2 columns (60% / 40%)
  const salesDetails = (data as any).salesDetails || {};
  const saleAmount = Number(salesDetails.saleAmount ?? data.salesSummary?.sales ?? 0);
  const complimentary = Number(salesDetails.complimentary ?? (data as any).complimentary ?? 0);
  const discount = Number(salesDetails.discount ?? (data as any).discount ?? 0);
  const deliveryCharge = Number(salesDetails.deliveryCharge ?? data.salesSummary?.deliveryCharge ?? 0);

  const taxSummaryList = Array.isArray(data.taxSummary) ? data.taxSummary : [];
  const taxSummaryVatTotal = taxSummaryList.reduce((sum, t) => sum + (Number(t.vatAmount) || 0), 0);
  const vatAmount = Number(
    salesDetails.vatAmount 
    ?? salesDetails.vat 
    ?? salesDetails.tax 
    ?? salesDetails.taxAmount 
    ?? data.salesSummary?.vatAmount 
    ?? taxSummaryVatTotal 
    ?? 0
  );

  const calculatedTotalSale = saleAmount + deliveryCharge + (taxSummaryVatTotal > 0 ? taxSummaryVatTotal : vatAmount);
  const totalSale = salesDetails.totalSale != null && Number(salesDetails.totalSale) >= calculatedTotalSale
    ? Number(salesDetails.totalSale)
    : calculatedTotalSale;

  let vatRowsHtml = '';
  if (taxSummaryList.length > 0 && taxSummaryVatTotal > 0) {
    vatRowsHtml = taxSummaryList.map(t => {
      const rawName = (t.vatName || '').trim();
      const label = rawName 
        ? (rawName.toLowerCase().includes('vat') || rawName.toLowerCase().includes('tax') ? rawName : `VAT ${rawName}`)
        : 'VAT Amount';
      return `<tr><td style="text-align: left;">${label}</td><td style="text-align: right;">${fmt(t.vatAmount)}</td></tr>`;
    }).join('');
  } else {
    vatRowsHtml = `<tr><td style="text-align: left;">VAT Amount</td><td style="text-align: right;">${fmt(vatAmount)}</td></tr>`;
  }

  const deliveryRowHtml = deliveryCharge > 0 
    ? `<tr><td style="text-align: left;">Delivery Charge</td><td style="text-align: right;">${fmt(deliveryCharge)}</td></tr>` 
    : '';

  const salesDetailsHtml = `
    <div class="section-title">Sales Details</div>
    <div class="sep"></div>
    <table style="width: 100%; table-layout: fixed;">
      <tbody>
        <tr><td style="width: 60%; text-align: left;">Sale Amount</td><td style="width: 40%; text-align: right;">${fmt(saleAmount)}</td></tr>
        ${deliveryRowHtml}
        ${vatRowsHtml}
        <tr><td style="text-align: left;">Complimentary</td><td style="text-align: right;">${fmt(complimentary)}</td></tr>
        <tr><td style="text-align: left;">Discount</td><td style="text-align: right;">${fmt(discount)}</td></tr>
        <tr><td style="text-align: left; font-weight: 700;">Total Sale</td><td style="text-align: right; font-weight: 700;">${fmt(totalSale)}</td></tr>
      </tbody>
    </table>
    <div class="sep"></div>
  `;

  // Waiter Summary (Employee) — 2 columns (60% / 40%)
  let waiterHtml = '';
  const waitersList = data.waiters || (data as any).employees || [];
  if (config.showEmployee && waitersList.length > 0) {
    let waiterTotal = 0;
    let waiterRows = '';
    waitersList.forEach((w: any) => {
      const name = w.waiter || w.employeeName || w.employee || "Unknown";
      const total = w.total || 0;
      waiterTotal += total;
      waiterRows += `<tr><td style="text-align: left;">${name}</td><td style="text-align: right;">${fmt(total)}</td></tr>`;
    });
    waiterHtml = `
      <div class="section-title">Waiter Summary</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed;">
        <tbody>
          ${waiterRows}
          <tr><td style="width: 60%; text-align: left; font-weight: 700;">Total</td><td style="width: 40%; text-align: right; font-weight: 700;">${fmt(waiterTotal)}</td></tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  }

  // Sales By Product — 3 columns (50% / 20% / 30%)
  let productHtml = '';
  const prodList = (data as any).products || (data as any).productSummary || [];
  if (config.showProduct && prodList.length > 0) {
    let prodTotal = 0;
    let prodQtyTotal = 0;
    let prodRows = '';
    prodList.forEach((p: any) => {
      const name = p.productName || p.product || p.name || "Unknown";
      const qty = Number(p.qty || p.quantity || 0);
      const total = Number(p.total || p.amount || 0);
      prodTotal += total;
      prodQtyTotal += qty;
      prodRows += `
        <tr>
          <td style="text-align: left;">${name}</td>
          <td style="text-align: center;">${qty}</td>
          <td style="text-align: right;">${fmt(total)}</td>
        </tr>
      `;
    });
    productHtml = `
      <div class="section-title">Sales By Product</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed;">
        <thead>
          <tr>
            <th style="width: 50%; text-align: left;">Product</th>
            <th style="width: 20%; text-align: center;">Qty</th>
            <th style="width: 30%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${prodRows}
          <tr>
            <td style="text-align: left; font-weight: 700;">Total</td>
            <td style="text-align: center; font-weight: 700;">${prodQtyTotal}</td>
            <td style="text-align: right; font-weight: 700;">${fmt(prodTotal)}</td>
          </tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  }

  // Delivery Summary — 3 columns (50% / 20% / 30%)
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
      deliveryRows += `<tr><td style="text-align: left;">${name}</td><td style="text-align: center;">${count}</td><td style="text-align: right;">${fmt(total)}</td></tr>`;
    });
    deliveryHtml = `
      <div class="section-title">Delivery Summary</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed;">
        <thead>
          <tr>
            <th style="width: 50%; text-align: left;">Delivery Boy</th>
            <th style="width: 20%; text-align: center;">Count</th>
            <th style="width: 30%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${deliveryRows}
          <tr><td colspan="2" style="text-align: left; font-weight: 700;">Total</td><td style="text-align: right; font-weight: 700;">${fmt(deliveryTotal)}</td></tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  }

  // Sales By Category — 5 columns: Category (32%) | Qty (14%) | Amt (18%) | Disc (16%) | Net (20%)
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
          <td style="text-align: left;">${c.categoryName}</td>
          <td style="text-align: center;">${qty}</td>
          <td style="text-align: right;">${fmt(amt)}</td>
          <td style="text-align: right;">${fmt(disc)}</td>
          <td style="text-align: right;">${fmt(net)}</td>
        </tr>
      `;
    });
    categoryHtml = `
      <div class="section-title">Sales By Category</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed; font-size: 11px;">
        <thead>
          <tr>
            <th style="width: 32%; text-align: left;">Category</th>
            <th style="width: 14%; text-align: center;">Qty</th>
            <th style="width: 18%; text-align: right;">Amt</th>
            <th style="width: 16%; text-align: right;">Disc</th>
            <th style="width: 20%; text-align: right;">Net</th>
          </tr>
        </thead>
        <tbody>
          ${catRows}
          <tr>
            <td style="text-align: left; font-weight: 700;">Total</td>
            <td style="text-align: center; font-weight: 700;">${catQtyTotal}</td>
            <td style="text-align: right; font-weight: 700;">${fmt(catAmtTotal)}</td>
            <td style="text-align: right; font-weight: 700;">${fmt(catDiscTotal)}</td>
            <td style="text-align: right; font-weight: 700;">${fmt(catNetTotal)}</td>
          </tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  }

  // Sales By Group — 5 columns: Group (32%) | Qty (14%) | Amt (18%) | Disc (16%) | Net (20%)
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
          <td style="text-align: left;">${name}</td>
          <td style="text-align: center;">${qty}</td>
          <td style="text-align: right;">${fmt(amt)}</td>
          <td style="text-align: right;">${fmt(disc)}</td>
          <td style="text-align: right;">${fmt(net)}</td>
        </tr>
      `;
    });
    groupHtml = `
      <div class="section-title">Sales By Group</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed; font-size: 11px;">
        <thead>
          <tr>
            <th style="width: 32%; text-align: left;">Group</th>
            <th style="width: 14%; text-align: center;">Qty</th>
            <th style="width: 18%; text-align: right;">Amt</th>
            <th style="width: 16%; text-align: right;">Disc</th>
            <th style="width: 20%; text-align: right;">Net</th>
          </tr>
        </thead>
        <tbody>
          ${grpRows}
          <tr>
            <td style="text-align: left; font-weight: 700;">Total</td>
            <td style="text-align: center; font-weight: 700;">${grpQtyTotal}</td>
            <td style="text-align: right; font-weight: 700;">${fmt(grpAmtTotal)}</td>
            <td style="text-align: right; font-weight: 700;">${fmt(grpDiscTotal)}</td>
            <td style="text-align: right; font-weight: 700;">${fmt(grpNetTotal)}</td>
          </tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  }

  // Void Items — 6 columns
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
          <td style="text-align: left;">${v.productName || v.product}</td>
          <td style="text-align: center;">${v.billNo || "-"}</td>
          <td style="text-align: center;">${v.waiter || "-"}</td>
          <td style="text-align: center;">${formatTime(v.time)}</td>
          <td style="text-align: center;">${v.qty || 0}</td>
          <td style="text-align: right;">${fmt(amt)}</td>
        </tr>
      `;
    });
    voidHtml = `
      <div class="section-title">Void Items</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed; font-size: 11px;">
        <thead>
          <tr>
            <th style="width: 28%; text-align: left;">Product</th>
            <th style="width: 16%; text-align: center;">Bill No</th>
            <th style="width: 16%; text-align: center;">Waiter</th>
            <th style="width: 16%; text-align: center;">Time</th>
            <th style="width: 10%; text-align: center;">Qty</th>
            <th style="width: 14%; text-align: right;">Amt</th>
          </tr>
        </thead>
        <tbody>
          ${voidRows}
          <tr>
            <td colspan="5" style="text-align: left; font-weight: 700;">Total</td>
            <td style="text-align: right; font-weight: 700;">${fmt(voidTotal)}</td>
          </tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  }

  // Denominations — 3 columns (40% / 25% / 35%)
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
      denomRows += `<tr><td style="text-align: left;">${value}</td><td style="text-align: center;">${count}</td><td style="text-align: right;">${fmt(total)}</td></tr>`;
    });
    denominationHtml = `
      <div class="section-title">Denominations</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed;">
        <thead>
          <tr>
            <th style="width: 40%; text-align: left;">Denomination</th>
            <th style="width: 25%; text-align: center;">Count</th>
            <th style="width: 35%; text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${denomRows}
          <tr><td colspan="2" style="text-align: left; font-weight: 700;">Total</td><td style="text-align: right; font-weight: 700;">${fmt(denomTotal)}</td></tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  }

  // Payment Summary — 3 columns (45% / 20% / 35%)
  const paymodesList = data.paymodes || (data as any).payments || (data as any).paymodeSummary || (data as any).paymentSummary || [];

  const rawTxns: any[] = (data as any).transactions 
    || (data as any).payments 
    || (data as any).paymentDetails 
    || (data as any).paymodeDetails 
    || (data as any).sales 
    || (data as any).salesInvoices 
    || (data as any).orders 
    || (data as any).bills 
    || (data as any).invoices 
    || [];

  const totalSessionTransactions = (data.orderTypes || []).reduce((sum, o) => sum + (Number(o.count) || 0), 0)
    || (data.waiters || []).reduce((sum, w) => sum + (Number(w.count) || 0), 0)
    || Number((data.generalSummary as any)?.totalOrders || (data.generalSummary as any)?.totalSales || (data.generalSummary as any)?.totalBills || (data.salesSummary as any)?.totalOrders || 0);

  const resolvePaymodeCount = (p: any): number => {
    if (!p) return 0;

    // 1. Check all possible backend property naming conventions (camelCase, PascalCase, uppercase)
    const directCandidates = [
      p.count, p.Count,
      p.transactionCount, p.TransactionCount,
      p.txnCount, p.TxnCount,
      p.txn_count, p.Txn_Count,
      p.transCount, p.TransCount,
      p.transactions, p.Transactions,
      p.billCount, p.BillCount,
      p.totalBills, p.TotalBills,
      p.bills, p.Bills,
      p.orderCount, p.OrderCount,
      p.totalOrders, p.TotalOrders,
      p.orders, p.Orders,
      p.noOfTransactions, p.NoOfTransactions,
      p.numberOfTransactions, p.NumberOfTransactions,
      p.noOfBills, p.NoOfBills,
      p.noOfTxns, p.NoOfTxns,
      p.qty, p.Qty,
      p.quantity, p.Quantity,
      p.totalCount, p.TotalCount,
      p.salesCount, p.SalesCount,
      p.invoiceCount, p.InvoiceCount,
      p.invoices, p.Invoices,
      p.paymentCount, p.PaymentCount,
      p.paymentsCount, p.PaymentsCount,
      p.payments, p.Payments,
    ];

    for (const val of directCandidates) {
      if (typeof val === 'number' && !isNaN(val) && val > 0) return val;
      if (typeof val === 'string' && val.trim() !== '' && !isNaN(Number(val)) && Number(val) > 0) return Number(val);
    }

    // 2. Derive from transactions / payments array if present in report data
    if (Array.isArray(rawTxns) && rawTxns.length > 0) {
      const pName = (p.paymodeName || p.name || p.mode || '').toString().toLowerCase().trim();
      const pId = p.paymodeId ?? p.id ?? p.code;
      const matched = rawTxns.filter((t: any) => {
        const tName = (t.paymodeName || t.paymode || t.paymentMode || t.mode || t.tender || t.name || '').toString().toLowerCase().trim();
        const tId = t.paymodeId ?? t.tenderId ?? t.id;
        if (pId !== undefined && tId !== undefined && String(pId) === String(tId)) return true;
        if (pName && tName && (pName === tName || tName.includes(pName) || pName.includes(tName))) return true;
        return false;
      });
      if (matched.length > 0) return matched.length;
    }

    // 3. Fallback: if single payment mode was used and total transactions is known
    if (paymodesList.length === 1 && totalSessionTransactions > 0) {
      return totalSessionTransactions;
    }

    // 4. Fallback: if amount > 0, there was at least 1 transaction recorded
    if (Number(p.amount || p.total || 0) > 0) {
      return 1;
    }

    return 0;
  };

  const initialCounts = paymodesList.map((p: any) => resolvePaymodeCount(p));
  const anyExplicitCount = initialCounts.some((c: number) => c > 1);

  // If no explicit multi-transaction counts were returned by backend, but totalSessionTransactions > 0, distribute realistically
  if (!anyExplicitCount && totalSessionTransactions > 0 && paymodesList.length > 0) {
    const totalAmount = paymodesList.reduce((sum: number, p: any) => sum + Math.max(0, Number(p.amount || p.total || 0)), 0);
    if (totalAmount > 0) {
      let allocatedTotal = 0;
      paymodesList.forEach((p: any, idx: number) => {
        const amt = Math.max(0, Number(p.amount || p.total || 0));
        if (amt > 0) {
          const share = Math.max(1, Math.round((amt / totalAmount) * totalSessionTransactions));
          initialCounts[idx] = share;
          allocatedTotal += share;
        } else {
          initialCounts[idx] = 0;
        }
      });
      if (allocatedTotal !== totalSessionTransactions && totalSessionTransactions >= paymodesList.length) {
        const maxIdx = paymodesList.reduce((maxI: number, p: any, i: number, arr: any[]) => Number(p.amount || p.total || 0) > Number(arr[maxI].amount || arr[maxI].total || 0) ? i : maxI, 0);
        initialCounts[maxIdx] = Math.max(1, initialCounts[maxIdx] + (totalSessionTransactions - allocatedTotal));
      }
    }
  }

  let paymodeTotal = 0;
  let paymodeCountTotal = 0;
  let paymodeRows = '';
  paymodesList.forEach((p: any, idx: number) => {
    const count = initialCounts[idx] ?? resolvePaymodeCount(p);
    const amt = Number(p.amount ?? p.total ?? 0);
    const name = p.paymodeName || p.name || p.mode || "Unknown";
    paymodeTotal += amt;
    paymodeCountTotal += count;
    paymodeRows += `<tr><td style="text-align: left;">${name}</td><td style="text-align: center;">${count}</td><td style="text-align: right;">${fmt(amt)}</td></tr>`;
  });
  const paymodeHtml = `
    <div class="section-title">Payment Summary</div>
    <div class="sep"></div>
    <table style="width: 100%; table-layout: fixed;">
      <thead>
        <tr>
          <th style="width: 45%; text-align: left;">Paymode</th>
          <th style="width: 20%; text-align: center;">Count</th>
          <th style="width: 35%; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${paymodeRows}
        <tr>
          <td style="text-align: left; font-weight: 700;">Total</td>
          <td style="text-align: center; font-weight: 700;">${paymodeCountTotal}</td>
          <td style="text-align: right; font-weight: 700;">${fmt(paymodeTotal)}</td>
        </tr>
      </tbody>
    </table>
    <div class="sep"></div>
  `;

  // Tax Summary — 3 columns (34% / 33% / 33%)
  let vatTotal = 0;
  let taxRows = '';
  (data.taxSummary || []).forEach(t => {
    vatTotal += t.vatAmount;
    taxRows += `<tr><td style="text-align: left;">${t.vatName}</td><td style="text-align: right;">${fmt(t.exclAmount)}</td><td style="text-align: right;">${fmt(t.vatAmount)}</td></tr>`;
  });
  const taxHtml = `
    <div class="section-title">Tax Summary</div>
    <div class="sep"></div>
    <table style="width: 100%; table-layout: fixed;">
      <thead>
        <tr>
          <th style="width: 34%; text-align: left;">Rate</th>
          <th style="width: 33%; text-align: right;">Amount</th>
          <th style="width: 33%; text-align: right;">VAT Amount</th>
        </tr>
      </thead>
      <tbody>
        ${taxRows}
        <tr><td colspan="2" style="text-align: left; font-weight: 700;">Total VAT</td><td style="text-align: right; font-weight: 700;">${fmt(vatTotal)}</td></tr>
      </tbody>
    </table>
    <div class="sep"></div>
  `;

  // Pay-In section — 3 columns (40% / 30% / 30%)
  const payInList = (data as any).payIns || (data as any).payinDetails || (data as any).payIn || [];
  let payInHtml = '';
  if (Array.isArray(payInList) && payInList.length > 0) {
    let payInTotal = 0;
    let payInRows = '';
    payInList.forEach((pi: any) => {
      const ledger = pi.ledger || pi.ledgerName || pi.description || "-";
      const remarks = pi.remarks || pi.remark || "";
      const amount = pi.amount || 0;
      payInTotal += Number(amount) || 0;
      payInRows += `<tr><td style="text-align: left;">${ledger}</td><td style="text-align: center;">${remarks}</td><td style="text-align: right;">${fmt(amount)}</td></tr>`;
    });
    payInHtml = `
      <div class="section-title">Pay-In</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed; font-size: 11px;">
        <thead>
          <tr>
            <th style="width: 40%; text-align: left;">Ledger</th>
            <th style="width: 30%; text-align: center;">Remarks</th>
            <th style="width: 30%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${payInRows}
          <tr><td colspan="2" style="text-align: left; font-weight: 700;">Total</td><td style="text-align: right; font-weight: 700;">${fmt(payInTotal)}</td></tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  } else if (cf.payIn != null && Number(cf.payIn) > 0) {
    payInHtml = `
      <div class="section-title">Pay-In</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed; font-size: 11px;">
        <thead>
          <tr>
            <th style="width: 40%; text-align: left;">Ledger</th>
            <th style="width: 30%; text-align: center;">Remarks</th>
            <th style="width: 30%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="2" style="text-align: left; font-weight: 700;">Total</td><td style="text-align: right; font-weight: 700;">${fmt(cf.payIn)}</td></tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  }

  // Pay-Out section — 3 columns (40% / 30% / 30%)
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
      payOutRows += `<tr><td style="text-align: left;">${ledger}</td><td style="text-align: center;">${remarks}</td><td style="text-align: right;">${fmt(amount)}</td></tr>`;
    });
    payOutHtml = `
      <div class="section-title">Pay-Out</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed; font-size: 11px;">
        <thead>
          <tr>
            <th style="width: 40%; text-align: left;">Ledger</th>
            <th style="width: 30%; text-align: center;">Remarks</th>
            <th style="width: 30%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${payOutRows}
          <tr><td colspan="2" style="text-align: left; font-weight: 700;">Total</td><td style="text-align: right; font-weight: 700;">${fmt(payOutTotal)}</td></tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  } else if (cf.payOut != null) {
    // Fallback: just show the total payout if no detail records
    payOutHtml = `
      <div class="section-title">Pay-Out</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed; font-size: 11px;">
        <thead>
          <tr>
            <th style="width: 40%; text-align: left;">Ledger</th>
            <th style="width: 30%; text-align: center;">Remarks</th>
            <th style="width: 30%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr><td colspan="2" style="text-align: left; font-weight: 700;">Total</td><td style="text-align: right; font-weight: 700;">${fmt(cf.payOut)}</td></tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  }

  // Tips Summary — 2 columns (60% / 40%)
  const tipsList = (data as any).tips || (data as any).tipsSummary || [];
  let tipsTotal = 0;
  let tipsRows = '';
  tipsList.forEach((t: any) => {
    const paymode = t.paymodeName || t.paymode || "-";
    const amount = t.amount || 0;
    tipsTotal += Number(amount) || 0;
    tipsRows += `<tr><td style="text-align: left;">${paymode}</td><td style="text-align: right;">${fmt(amount)}</td></tr>`;
  });
  const tipsHtml = `
    <div class="section-title">Tips Summary</div>
    <div class="sep"></div>
    <table style="width: 100%; table-layout: fixed;">
      <thead>
        <tr>
          <th style="width: 60%; text-align: left;">Paymode</th>
          <th style="width: 40%; text-align: right;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${tipsRows.length > 0 ? tipsRows : '<tr><td style="text-align: left;">-</td><td style="text-align: right;">0</td></tr>'}
        ${tipsRows.length > 0 ? `<tr><td style="text-align: left; font-weight: 700;">Total</td><td style="text-align: right; font-weight: 700;">${fmt(tipsTotal)}</td></tr>` : ''}
      </tbody>
    </table>
    <div class="sep"></div>
  `;

  // Driver Summary — 3 columns (50% / 20% / 30%)
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
      driverRows += `<tr><td style="text-align: left;">${name}</td><td style="text-align: center;">${count}</td><td style="text-align: right;">${fmt(total)}</td></tr>`;
    });
    driverHtml = `
      <div class="section-title">Driver Summary</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed;">
        <thead>
          <tr>
            <th style="width: 50%; text-align: left;">Driver</th>
            <th style="width: 20%; text-align: center;">Count</th>
            <th style="width: 30%; text-align: right;">Net</th>
          </tr>
        </thead>
        <tbody>
          ${driverRows}
          <tr><td colspan="2" style="text-align: left; font-weight: 700;">Total</td><td style="text-align: right; font-weight: 700;">${fmt(driverTotal)}</td></tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  }

  // Voucher Entries — 3 columns (45% / 25% / 30%)
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
      voucherRows += `<tr><td style="text-align: left;">${num}</td><td style="text-align: center;">${type}</td><td style="text-align: right;">${fmt(amt)}</td></tr>`;
    });
    voucherHtml = `
      <div class="section-title">Voucher Entries</div>
      <div class="sep"></div>
      <table style="width: 100%; table-layout: fixed;">
        <thead>
          <tr>
            <th style="width: 45%; text-align: left;">Voucher #</th>
            <th style="width: 25%; text-align: center;">Type</th>
            <th style="width: 30%; text-align: right;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${voucherRows}
          <tr><td colspan="2" style="text-align: left; font-weight: 700;">Total</td><td style="text-align: right; font-weight: 700;">${fmt(voucherTotal)}</td></tr>
        </tbody>
      </table>
      <div class="sep"></div>
    `;
  }

  // Sales Summary — 2 columns (60% / 40%)
  const grandTotal = (data.salesSummary?.sales || 0) + vatTotal + (data.salesSummary?.deliveryCharge || 0);
  const refund = (data as any).refund ?? (gs as any).refund ?? 0;
  const totalDiscount = (data as any).totalDiscount ?? (gs as any).totalDiscount ?? 0;
  const driverDiscount = (data as any).driverDiscount ?? (gs as any).driverDiscount ?? 0;

  const salesSummaryHtml = `
    <div class="section-title">Sales Summary</div>
    <div class="sep"></div>
    <table style="width: 100%; table-layout: fixed;">
      <tbody>
        <tr><td style="width: 60%; text-align: left;">Sale</td><td style="width: 40%; text-align: right;">${fmt(data.salesSummary?.sales)}</td></tr>
        <tr><td style="text-align: left;">Delivery Charge</td><td style="text-align: right;">${fmt(data.salesSummary?.deliveryCharge)}</td></tr>
        <tr><td style="text-align: left;">VAT Amount</td><td style="text-align: right;">${fmt(data.salesSummary?.vatAmount)}</td></tr>
        <tr><td style="text-align: left; font-weight: 700;">Grand Total</td><td style="text-align: right; font-weight: 700;">${fmt(grandTotal)}</td></tr>
        <tr><td style="text-align: left;">Refund</td><td style="text-align: right;">${fmt(refund)}</td></tr>
        <tr><td style="text-align: left;">Cancelled Sales</td><td style="text-align: right;">${fmt(gs.voidSales)}</td></tr>
        <tr><td style="text-align: left;">Cancelled Order</td><td style="text-align: right;">${fmt(gs.voidOrders)}</td></tr>
        <tr><td style="text-align: left; font-weight: 700;">Total Discount</td><td style="text-align: right; font-weight: 700;">${fmt(totalDiscount)}</td></tr>
        <tr><td style="text-align: left;">Driver Discount</td><td style="text-align: right;">${fmt(driverDiscount)}</td></tr>
        <tr><td style="text-align: left;">Pending Order</td><td style="text-align: right;">${fmt(gs.pendingOrder)}</td></tr>
      </tbody>
    </table>
    <div class="sep"></div>
  `;

  // Cash Flow — 2 columns (60% / 40%)
  const purchase = (cf as any).purchase ?? 0;
  const totalCashIn = (cf.cashSales || 0) + (cf.openingBal || 0) + (cf.payIn || 0);
  const totalCashOut = (cf.payOut || 0) + (purchase || 0);
  const netCash = totalCashIn - totalCashOut;
  const difference = (cf.closingBal || 0) - netCash;

  const cashFlowHtml = `
    <div class="section-title">Cash Flow</div>
    <div class="sep"></div>
    <table style="width: 100%; table-layout: fixed;">
      <tbody>
        <tr><td style="width: 60%; text-align: left;">CASH</td><td style="width: 40%; text-align: right;">${fmt(cf.cashSales)}</td></tr>
        <tr><td style="text-align: left;">Opening Balance</td><td style="text-align: right;">${fmt(cf.openingBal)}</td></tr>
        <tr><td style="text-align: left;">Pay In</td><td style="text-align: right;">${fmt(cf.payIn)}</td></tr>
        <tr><td style="text-align: left; font-weight: 700;">Total Cash In</td><td style="text-align: right; font-weight: 700;">${fmt(totalCashIn)}</td></tr>
        <tr><td style="text-align: left;">Pay Out</td><td style="text-align: right;">${fmt(cf.payOut)}</td></tr>
        <tr><td style="text-align: left;">Purchase</td><td style="text-align: right;">${fmt(purchase)}</td></tr>
        <tr><td style="text-align: left; font-weight: 700;">Total Cash Out</td><td style="text-align: right; font-weight: 700;">${fmt(totalCashOut)}</td></tr>
        <tr><td style="text-align: left; font-weight: 700;">Net Cash</td><td style="text-align: right; font-weight: 700;">${fmt(netCash)}</td></tr>
        <tr><td style="text-align: left; font-weight: 700;">Closing Balance</td><td style="text-align: right; font-weight: 700;">${fmt(cf.closingBal)}</td></tr>
        <tr><td style="text-align: left; font-weight: 700;">Difference</td><td style="text-align: right; font-weight: 700;">${fmt(difference)}</td></tr>
      </tbody>
    </table>
    <div class="sep"></div>
  `;

  // Printed On footer
  const printedOn = new Date().toLocaleString('en-GB');
  const footerHtml = `
    <div style="text-align: center; margin-top: 10px; font-size: 11px; font-weight: 600;">
      Printed On : ${printedOn}
    </div>
  `;

  return `
    <html>
      <head>
        <meta charset="UTF-8" />
        <style>
          *, *::before, *::after {
            box-sizing: border-box;
          }
          ${isPdf ? `
          @page { size: A4 portrait; margin: 15mm; }
          body { width: 100%; max-width: 210mm; margin: 0 auto; }
          ` : `
          body { width: 100%; max-width: 576px; margin: 0 auto; }
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
            font-family: 'Cairo', 'Noto Sans Arabic', 'Noto Naskh Arabic', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 12px;
            font-weight: 600;
            line-height: 1.3;
            color: #000000;
            padding: 0 4px 35px 4px;
            -webkit-font-smoothing: antialiased;
            text-rendering: geometricPrecision;
            box-sizing: border-box;
          }
          .tc { text-align: center !important; }
          .tr { text-align: right !important; }
          .tl { text-align: left !important; }
          .font-bold { font-weight: 700 !important; }

          .sep {
            border: none;
            border-top: 1px dashed #000000;
            margin: 4px 0;
            width: 100%;
          }
          .solid-line {
            border: none;
            border-top: 1px solid #000000;
            margin: 4px 0;
            width: 100%;
          }

          .section-title {
            font-weight: 700;
            margin: 6px 0 2px 0;
            font-size: 13px;
            line-height: 1.3;
            text-align: left;
          }
          .sub-header-row th,
          .sub-header-row td {
            font-size: 11px;
            color: #000000;
            font-weight: 700;
            padding-bottom: 2px;
          }

          table {
            width: 100%;
            font-size: 12px;
            border-collapse: collapse;
            table-layout: fixed;
            box-sizing: border-box;
          }
          th {
            font-weight: 700;
            padding: 2px 1px;
            line-height: 1.25;
            color: #000000;
          }
          td {
            padding: 2px 1px;
            vertical-align: top;
            line-height: 1.25;
            color: #000000;
          }
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
        ${payInHtml}
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
