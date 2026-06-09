import type { PosCartItem } from "../types";

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
  subTotal: number;
  serviceCharge: number;
  levy: number;
  vatAmount: number;
  netAmount: number;
  enableVat?: boolean;
}

export const generateGuestPrintHtml = (
  cartDetails: PosCartItem[],
  data: GuestPrintData
): string => {
  const now = new Date();
  const dateStr = data.date || now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = data.time || now.toLocaleTimeString('en-US'); // h:mm:ss A

  const isTakeOut = data.orderType?.toLowerCase().includes("take");
  const isDriveThru = data.orderType?.toLowerCase().includes("drive");
  const isDineIn = data.orderType?.toLowerCase().includes("dine");

  let orderTypeLabel = "GUEST";
  if (isTakeOut) orderTypeLabel = "GUEST (TAKE OUT)";
  else if (isDriveThru) orderTypeLabel = "GUEST (DRIVE THRU)";
  else if (isDineIn) orderTypeLabel = "GUEST (DINE IN)";

  const headerTitle = data.enableVat ? `SIMPLIFIED TAX INVOICE<br/>${orderTypeLabel}` : `SIMPLIFIED INVOICE<br/>${orderTypeLabel}`;

  let itemsHtml = "";
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
  });

  return `
    <html>
      <head>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 13px;
            color: #000;
            margin: 0;
            padding: 0;
            width: 100%;
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
        <div class="text-center font-bold" style="font-size: 16px;">GOLD RESTAURANT</div>
        <div class="text-center" style="margin-bottom: 10px;">
          <div>Tea World</div>
          <div>Building:65,Road:2003,Block:320</div>
          <div>HOORA</div>
          <div>CR NO:48622-16</div>
          ${data.enableVat ? '<div>VAT NO:220003229000002</div>' : ''}
          <div>Tel:17311999,Tel:17311999</div>
        </div>

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
        
        ${isDriveThru && (data.vehicleNo || data.customerName) ? `
        <div style="margin-top: 10px; font-weight: bold; font-size: 12px;">
          <div style="text-transform: uppercase; margin-bottom: 5px;">CUSTOMER DETAILS</div>
          ${data.vehicleNo ? `<div><span style="display:inline-block; width: 80px; font-weight: normal;">Vehicle No</span> <span>${data.vehicleNo}</span></div>` : ''}
          ${data.customerName ? `<div><span style="display:inline-block; width: 80px; font-weight: normal;">Customer</span> <span>${data.customerName}</span></div>` : ''}
        </div>
        ` : ''}

        <div class="barcode-container">*${data.orderNo}*</div>
        
        <div style="font-size: 11px; margin-top: 5px;">Print Time : ${dateStr} ${timeStr}</div>
      </body>
    </html>
  `;
};
