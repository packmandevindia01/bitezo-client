import type { PosCartItem } from "../types";
import { branchApi } from "../../inventory/branches/services/branchApi";
import { getLineStyle } from "../../inventory/branches/utils/lineHelpers";

export interface GuestPrintData {
  orderNo: string;
  ticketNo: string;
  waiter: string;
  counter: string;
  section: string;
  table: string;
  orderType: string;
  date?: string;
  time?: string;
  customerName?: string;
  vehicleNo?: string;
  contactNo?: string;
  flatNo?: string;
  buildingNo?: string;
  blockNo?: string;
  roadNo?: string;
  area?: string;
  providerNo?: string;
  subTotal: number;
  serviceCharge: number;
  levy: number;
  vatAmount: number;
  netAmount: number;
  deliveryCharge?: number;
  enableVat?: boolean;
  payments?: { name: string; amount: number }[];
  changeAmount?: number;
  isSettlement?: boolean;
}

export const generateGuestPrintHtml = async (
  cartDetails: PosCartItem[],
  data: GuestPrintData
): Promise<string> => {
  const now = new Date();
  const dateStr = data.date || now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = data.time || now.toLocaleTimeString('en-US'); // h:mm:ss A

  let customHeadersHtml = "";
  try {
    const isBackoffice = sessionStorage.getItem("tempSystemType") === "backoffice" || localStorage.getItem("systemType") === "backoffice";
    const branchIdStr = isBackoffice
      ? (sessionStorage.getItem("backoffice_activeBranchId") || sessionStorage.getItem("backoffice_branchId"))
      : (localStorage.getItem("activeBranchId") || localStorage.getItem("branchId"));
    
    let branchId = 1;
    if (branchIdStr && branchIdStr !== "null" && branchIdStr !== "undefined") {
      branchId = Number(branchIdStr);
    }
    const branch = await branchApi.fetchBranchById(branchId);
    
    if (branch && branch.lines) {
      const headers = branch.lines.filter(l => l.section === 'header' && l.value);
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

  const isTakeOut = data.orderType?.toLowerCase().includes("take");
  const isDriveThru = data.orderType?.toLowerCase().includes("drive");
  const isDineIn = data.orderType?.toLowerCase().includes("dine");
  const isDelivery = data.orderType?.toLowerCase().includes("delivery");

  let orderTypeLabel = data.isSettlement ? "" : "GUEST";
  if (isTakeOut) orderTypeLabel = data.isSettlement ? "(TAKE OUT)" : "GUEST (TAKE OUT)";
  else if (isDriveThru) orderTypeLabel = data.isSettlement ? "(DRIVE THRU)" : "GUEST (DRIVE THRU)";
  else if (isDineIn) orderTypeLabel = data.isSettlement ? "(DINE IN)" : "GUEST (DINE IN)";
  else if (isDelivery) orderTypeLabel = data.isSettlement ? "(DELIVERY)" : "GUEST (DELIVERY)";

  const headerTitle = data.enableVat 
    ? `SIMPLIFIED TAX INVOICE<br/>${orderTypeLabel}` 
    : `SIMPLIFIED INVOICE<br/>${orderTypeLabel}`;

  let itemsHtml = "";
  let displaySubTotal = 0; // Sum of rounded display amounts for consistency
  cartDetails.forEach((item) => {
    let name = (item.product?.name || `Item #${item.productId}`).toUpperCase();
    if (item.variantName && item.variantName.toLowerCase().trim() !== 'main') {
      name += ` - ${item.variantName.toUpperCase()}`;
    }
    const qty = item.quantity;
    
    let extrasSum = 0;
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => extrasSum += (ex.price * (ex.qty || 1)));
    }
    
    let baseAmt = (item as any).lineTotal;
    if (baseAmt !== undefined) {
      baseAmt -= extrasSum;
    } else {
      baseAmt = (item.price || item.product?.price || 0) * item.quantity;
    }
    
    const rate = (baseAmt / qty).toFixed(3);
    const amt = baseAmt.toFixed(3);
    displaySubTotal += parseFloat(amt);

    itemsHtml += `
      <tr>
        <td style="width: 10%; text-align: left; vertical-align: top; padding: 2px 0;">${qty}</td>
        <td style="width: 45%; text-align: left; vertical-align: top; padding: 2px 0;">${name}</td>
        <td style="width: 20%; text-align: right; vertical-align: top; padding: 2px 0;">${rate}</td>
        <td style="width: 25%; text-align: right; vertical-align: top; padding: 2px 0;">${amt}</td>
      </tr>
    `;

    if (item.extras && item.extras.length > 0) {
      item.extras.forEach((ex) => {
        const exName = (ex.name || "EXTRA").toUpperCase();
        const exRate = ex.price.toFixed(3);
        const exAmt = (ex.price * (ex.qty || 1)).toFixed(3);
        displaySubTotal += parseFloat(exAmt);
        itemsHtml += `
          <tr>
            <td style="text-align: left; vertical-align: top; padding: 2px 0;">${ex.qty || 1}</td>
            <td style="text-align: left; vertical-align: top; padding: 2px 0;">${exName}</td>
            <td style="text-align: right; vertical-align: top; padding: 2px 0;">${exRate}</td>
            <td style="text-align: right; vertical-align: top; padding: 2px 0;">${exAmt}</td>
          </tr>
        `;
      });
    }

    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach((mod) => {
        const modName = (mod.name || "MODIFIER").toUpperCase();
        itemsHtml += `
          <tr>
            <td style="text-align: left; vertical-align: top;"></td>
            <td style="text-align: left; vertical-align: top; font-style: italic;">* ${modName}</td>
            <td style="text-align: right; vertical-align: top;"></td>
            <td style="text-align: right; vertical-align: top;"></td>
          </tr>
        `;
      });
    }

    if (item.messages && item.messages.length > 0) {
      item.messages.forEach((msg) => {
        const msgName = (msg.name || "NOTE").toUpperCase();
        itemsHtml += `
          <tr>
            <td style="text-align: left; vertical-align: top;"></td>
            <td style="text-align: left; vertical-align: top; font-style: italic;">MSG: ${msgName}</td>
            <td style="text-align: right; vertical-align: top;"></td>
            <td style="text-align: right; vertical-align: top;"></td>
          </tr>
        `;
      });
    }
  });

  // Calculate VAT Amount from item cartDetails sum (exact same logic as KOT template)
  const cartVatSum = cartDetails.reduce((sum, item: any) => sum + (item.vatAmount || 0), 0);
  const rawVat = (data.vatAmount && data.vatAmount > 0) ? data.vatAmount : (cartVatSum > 0 ? cartVatSum : 0);

  displaySubTotal = parseFloat(displaySubTotal.toFixed(3));
  if (data.enableVat) {
    data.vatAmount = parseFloat(rawVat.toFixed(3));
    data.subTotal = parseFloat((data.netAmount - data.vatAmount - (data.serviceCharge || 0) - (data.levy || 0) - (data.deliveryCharge || 0)).toFixed(3));
  } else {
    data.subTotal = displaySubTotal;
    data.vatAmount = 0;
  }

  return `
    <html>
      <head>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            color: #000;
            margin: 0 auto;
            padding: 0;
            width: 100%;
            max-width: 576px;
            background-color: #ffffff;
          }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .header-title { font-size: 18px; margin-bottom: 15px; letter-spacing: 1px; }
          
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          
          .dashed-hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
          .solid-hr { border: none; border-top: 1px solid #000; margin: 5px 0; }
          
          table.items-table th {
            text-align: left;
            font-weight: bold;
            text-transform: capitalize;
            padding-bottom: 5px;
          }

          .meta-row { display: flex; justify-content: space-between; margin-bottom: 2px; font-weight: bold;}
          
          .totals-table { margin-top: 5px; font-size: 13px; }
          .totals-table td { padding: 2px 0; }
          .totals-label { text-align: left; }
          .totals-value { text-align: right; }
          
          .grand-total { font-size: 18px; font-weight: bold; }

          .vat-table { margin-top: 8px; font-weight: bold; font-size: 12px; }
          .vat-table th { text-align: left; padding-bottom: 5px; }
          .vat-table td { padding: 3px 0; }
          
          .barcode-container { text-align: center; margin-top: 15px; margin-bottom: 5px; font-family: 'Libre Barcode 39', 'Courier New', Courier, monospace; font-size: 40px;}
        </style>
      </head>
      <body>
          ${customHeadersHtml ? `
            <div style="text-align: center; margin-bottom: 10px; padding: 0 10px; width: 100%; box-sizing: border-box; overflow-x: hidden;">
              ${customHeadersHtml}
            </div>
          ` : `
          <div class="text-center font-bold" style="font-size: 16px;">GOLD RESTAURANT</div>
          <div class="text-center" style="margin-bottom: 10px;">
            <div>Tea World</div>
            <div>Building:65,Road:2003,Block:320</div>
            <div>HOORA</div>
            <div>CR NO:48622-16</div>
            ${data.enableVat ? '<div>VAT NO:220003229000002</div>' : ''}
            <div>Tel:17311999,Tel:17311999</div>
          </div>
          `}
  
          <div class="text-center header-title">${headerTitle}</div>
        
        <div class="dashed-hr" style="border-top: 1px solid #000;"></div>

        <div class="meta-row">
          <div style="width: 50%;">Order No &nbsp; <span style="font-size: 16px; font-weight: bold;">#${data.orderNo}</span></div>
          <div style="width: 50%;">Ticket No &nbsp; <span style="font-size: 16px; font-weight: bold;">#${data.ticketNo}</span></div>
        </div>
        <div class="meta-row">
          <div style="width: 50%;">Date &nbsp; <span style="font-weight: normal">${dateStr}</span></div>
          <div style="width: 50%;">Time &nbsp; <span style="font-weight: normal">${timeStr}</span></div>
        </div>
        <div class="meta-row">
          <div style="width: 50%;">Employee &nbsp; <span style="font-weight: normal">${data.waiter}</span></div>
          <div style="width: 50%;">Counter &nbsp; <span style="font-weight: normal">${data.counter}</span></div>
        </div>
        ${isDineIn ? `
        <div class="meta-row">
          <div style="width: 50%;">Section &nbsp; <span style="font-weight: normal">${data.section}</span></div>
          <div style="width: 50%;">Table &nbsp; <span style="font-weight: normal">${data.table}</span></div>
        </div>
        ` : ''}
        
        <div class="dashed-hr"></div>
        
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 10%;">SNo</th>
              <th style="width: 45%;">Description</th>
              <th style="width: 20%; text-align: right;">Rate</th>
              <th style="width: 25%; text-align: right;">Amt</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="4"><div class="dashed-hr" style="margin: 2px 0 8px 0;"></div></td></tr>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div class="dashed-hr"></div>

        <table class="totals-table">
          <tr>
            <td class="totals-label">Sub Total</td>
            <td class="totals-value">${data.subTotal.toFixed(3)}</td>
          </tr>
          ${data.serviceCharge > 0 ? `
          <tr>
            <td class="totals-label">Service Charge</td>
            <td class="totals-value">${data.serviceCharge.toFixed(3)}</td>
          </tr>
          ` : ''}
          ${data.levy > 0 ? `
          <tr>
            <td class="totals-label">Levy(5%)</td>
            <td class="totals-value">${data.levy.toFixed(3)}</td>
          </tr>
          ` : ''}
          ${(isDelivery || (data.deliveryCharge && data.deliveryCharge > 0)) ? `
          <tr>
            <td class="totals-label">Delivery Charge</td>
            <td class="totals-value">${(data.deliveryCharge || 0).toFixed(3)}</td>
          </tr>
          ` : ''}
          ${data.enableVat ? `
          <tr>
            <td class="totals-label">VAT Amount</td>
            <td class="totals-value">${data.vatAmount.toFixed(3)}</td>
          </tr>
          ` : ''}
          <tr>
            <td class="totals-label grand-total">Grand Total</td>
            <td class="totals-value grand-total">${data.netAmount.toFixed(3)}</td>
          </tr>
          ${data.payments && data.payments.length > 0 ? `
          <tr><td colspan="2"><div class="dashed-hr" style="margin: 5px 0;"></div></td></tr>
          ${data.payments.map(p => `
          <tr>
            <td class="totals-label">${p.name}</td>
            <td class="totals-value">${p.amount.toFixed(3)}</td>
          </tr>
          `).join('')}
          ` : ''}
          ${data.changeAmount !== undefined && data.changeAmount > 0 ? `
          <tr>
            <td class="totals-label font-bold">Change</td>
            <td class="totals-value font-bold">${data.changeAmount.toFixed(3)}</td>
          </tr>
          ` : ''}
        </table>

        ${data.enableVat ? `
        <div class="dashed-hr"></div>
        <table class="vat-table">
          <thead>
            <tr>
              <th>VAT Code</th>
              <th>Excl Amt</th>
              <th>VAT Amt</th>
              <th>Net Amt</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="4"><div class="dashed-hr" style="margin: 0px 0 6px 0;"></div></td></tr>
            <tr>
              <td style="font-weight: normal;">10%</td>
              <td style="font-weight: normal;">${(data.netAmount - data.vatAmount).toFixed(3)}</td>
              <td style="font-weight: normal;">${data.vatAmount.toFixed(3)}</td>
              <td style="font-weight: normal;">${data.netAmount.toFixed(3)}</td>
            </tr>
            <tr><td colspan="4"><div class="dashed-hr" style="margin: 6px 0 0px 0;"></div></td></tr>
          </tbody>
        </table>
        ` : '<div class="dashed-hr"></div>'}
        
        ${(isDriveThru || isDelivery) && (data.vehicleNo || data.customerName || data.contactNo || data.flatNo || data.buildingNo || data.blockNo || data.roadNo || data.area || data.providerNo) ? `
        <div style="margin-top: 10px; font-size: 12px;">
          <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 3px;">${isDelivery ? 'DELIVERY DETAILS' : 'CUSTOMER DETAILS'}</div>
          <div class="solid-hr" style="border-top: 1px solid #000; margin-bottom: 5px;"></div>
          <table style="width: 100%; font-size: 12px; margin-top: 5px;">
            ${data.contactNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Mob No</td><td style="font-weight: bold;">${data.contactNo}</td></tr>` : ''}
            ${data.customerName ? `<tr><td style="width: 35%; padding-bottom: 2px;">Customer</td><td style="font-weight: bold;">${data.customerName}</td></tr>` : ''}
            ${data.flatNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Flat No</td><td style="font-weight: bold;">${data.flatNo}</td></tr>` : ''}
            ${data.buildingNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Building</td><td style="font-weight: bold;">${data.buildingNo}</td></tr>` : ''}
            ${data.blockNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Block</td><td style="font-weight: bold;">${data.blockNo}</td></tr>` : ''}
            ${data.roadNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Road</td><td style="font-weight: bold;">${data.roadNo}</td></tr>` : ''}
            ${data.area ? `<tr><td style="width: 35%; padding-bottom: 2px;">Area</td><td style="font-weight: bold;">${data.area}</td></tr>` : ''}
            ${data.vehicleNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Vehicle No</td><td style="font-weight: bold;">${data.vehicleNo}</td></tr>` : ''}
            ${data.providerNo ? `<tr><td style="width: 35%; padding-bottom: 2px;">Provider No</td><td style="font-weight: bold;">${data.providerNo}</td></tr>` : ''}
          </table>
        </div>
        ` : ''}

        <div class="barcode-container">*${data.orderNo}*</div>
        
        <div style="font-size: 11px; margin-top: 5px;">Print Time : ${dateStr} ${timeStr}</div>
      </body>
    </html>
  `;
};
