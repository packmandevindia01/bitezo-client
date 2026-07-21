import type { PosCartItem } from "../types";

export interface KotPrintData {
  orderNo: string;
  ticketNo: string;
  waiter: string;
  counter: string;
  section: string;
  table: string;
  orderType: string;
  date?: string;
  time?: string;
  headerTitle?: string;
  isMaster?: boolean;
  vehicleNo?: string;
  customerName?: string;
}

export const generateKotHtml = (
  cartDetails: PosCartItem[], 
  data: KotPrintData
): string => {
  // Use current date/time as fallback
  const now = new Date();
  const dateStr = data.date || now.toLocaleDateString('en-GB'); // DD/MM/YYYY
  const timeStr = data.time || now.toLocaleTimeString('en-US'); // h:mm:ss A

  const orderTypeStr = (data.orderType || "DINE IN").toUpperCase();
  const isDineIn = data.orderType?.toLowerCase().includes("dine");

  let itemsHtml = "";
  cartDetails.forEach((item) => {
    // Determine the product name (using English name for POS receipt as per image)
    let name = (item.product?.name || `Item #${item.productId}`).toUpperCase();
    if (item.variantName && item.variantName.toLowerCase().trim() !== 'main') {
      name += ` - ${item.variantName.toUpperCase()}`;
    }
    const qty = item.quantity;
    
    let extrasSum = 0;
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => extrasSum += (ex.price * (ex.qty || 1)));
    }
    
    // In POS system, line amount might be lineTotal. Format to 3 decimals as per BHD standard in Bitezo.
    // Subtract extrasSum because the extras are printed separately below
    let baseAmt = (item as any).lineTotal;
    if (baseAmt !== undefined) {
      baseAmt -= extrasSum;
    } else {
      baseAmt = (item.price || item.product?.price || 0) * item.quantity;
    }
    const amt = baseAmt.toFixed(3);

    itemsHtml += `
      <tr>
        <td style="width: 15%; text-align: left; vertical-align: top; font-weight: bold;">${qty}</td>
        <td style="width: 60%; text-align: left; vertical-align: top; font-weight: bold;">${name}</td>
        <td style="width: 25%; text-align: right; vertical-align: top; font-weight: bold;">${amt}</td>
      </tr>
    `;

    // Print extras or modifiers if they exist
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach((ex) => {
        const exName = (ex.name || "EXTRA").toUpperCase();
        const exAmt = (ex.price * ex.qty).toFixed(3);
        itemsHtml += `
          <tr>
            <td style="text-align: left; vertical-align: top;"></td>
            <td style="text-align: left; vertical-align: top; padding-left: 10px;">+ ${exName}</td>
            <td style="text-align: right; vertical-align: top; font-weight: bold;">${exAmt}</td>
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
            <td style="text-align: left; vertical-align: top; padding-left: 10px; font-style: italic;">* ${modName}</td>
            <td style="text-align: right; vertical-align: top;"></td>
          </tr>
        `;
      });
    }
  });

  const headStyle = `
      <head>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 13px;
            color: #000;
            margin: 0;
            padding: 0;
            width: 100%;
          }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          
          table.meta-table {
            width: 100%;
            margin-bottom: 15px;
            font-size: 14px;
            font-weight: bold;
          }
          table.meta-table td {
            padding-bottom: 3px;
          }
          
          hr {
            border: none;
            border-top: 2px solid #000;
            margin: 5px 0;
          }

          table.items-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            margin-top: 10px;
          }
          
          table.items-table th {
            text-align: left;
            font-weight: bold;
            text-transform: uppercase;
            padding-bottom: 5px;
          }
          table.items-table td {
            padding: 2px 0;
          }
        </style>
      </head>
  `;

  if (data.isMaster) {
    return `
      <html>
        ${headStyle}
        <body>
          <table style="width: 100%; font-size: 22px; font-weight: bold; margin-bottom: 15px;">
            <tr>
              <td style="text-align: left;">Order &nbsp; #${data.orderNo}</td>
              <td style="text-align: right;">${orderTypeStr}</td>
            </tr>
          </table>
          
          <table class="meta-table">
            <tr>
              <td style="width: 50%;">Date : <span style="font-weight: normal">${dateStr}</span></td>
              <td style="width: 50%;">Time : <span style="font-weight: normal">${timeStr}</span></td>
            </tr>
            <tr>
              <td>Waiter : <span style="font-weight: normal">${data.waiter}</span></td>
              <td>Terminal : <span style="font-weight: normal">${data.counter}</span></td>
            </tr>
            ${isDineIn ? `
            <tr>
              <td></td>
              <td>Section : <span style="font-weight: normal">${data.section}</span></td>
            </tr>
            ` : ''}
          </table>
          
          ${isDineIn ? `<div class="text-center" style="font-size: 24px; font-weight: bold; margin: 15px 0;">Table : ${data.table}</div>` : ''}
          ${data.vehicleNo ? `<div class="text-center" style="font-size: 20px; font-weight: bold; margin: 10px 0;">Vehicle No : ${data.vehicleNo}</div>` : ''}
          ${data.customerName ? `<div class="text-center" style="font-size: 18px; font-weight: bold; margin: 5px 0;">Customer : ${data.customerName}</div>` : ''}
          
          <hr />
          <div class="text-center" style="font-size: 24px; font-weight: bold; margin: 10px 0;">***${data.headerTitle || "KOT"}***</div>
          <hr />
          
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 15%;">QTY</th>
                <th style="width: 60%;">DESCRIPTION</th>
                <th style="width: 25%; text-align: right;">AMT</th>
              </tr>
            </thead>
            <tbody>
              <tr><td colspan="3"><hr style="border-top: 1px solid #000; margin: 2px 0 8px 0;" /></td></tr>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div class="text-center" style="font-size: 24px; font-weight: bold; margin-top: 30px;">Ticket No #${data.ticketNo}</div>
          <div class="text-center" style="font-size: 12px; margin-top: 5px;">Print On : ${dateStr} ${timeStr}</div>
        </body>
      </html>
    `;
  }

  return `
    <html>
      ${headStyle}
      <body>
        <div class="text-center" style="font-size: 22px; font-weight: bold; margin-bottom: 10px;">${orderTypeStr}</div>
        <div class="text-center" style="font-size: 24px; font-weight: bold; margin-bottom: 15px; letter-spacing: 1px;">***${data.headerTitle || "KOT"}***</div>
        
        <table class="meta-table">
          <tr>
            <td style="width: 50%;">Date &nbsp;&nbsp;&nbsp; <span style="font-weight: normal">${dateStr}</span></td>
            <td style="width: 50%;">Time &nbsp;&nbsp;&nbsp; <span style="font-weight: normal">${timeStr}</span></td>
          </tr>
          <tr>
            <td>Waiter : <span style="font-weight: normal">${data.waiter}</span></td>
            <td>Counter : <span style="font-weight: normal">${data.counter}</span></td>
          </tr>
          ${isDineIn ? `
          <tr>
            <td>Section : <span style="font-weight: normal">${data.section}</span></td>
            <td>Table : <span style="font-weight: normal">${data.table}</span></td>
          </tr>
          ` : ''}
          ${data.vehicleNo || data.customerName ? `
          <tr>
            <td>${data.vehicleNo ? `Vehicle : <span style="font-weight: normal">${data.vehicleNo}</span>` : ''}</td>
            <td>${data.customerName ? `Customer : <span style="font-weight: normal">${data.customerName}</span>` : ''}</td>
          </tr>
          ` : ''}
        </table>
        
        <table style="width: 100%; margin-top: 15px; font-size: 16px;">
          <tr>
            <td style="width: 50%; text-align: left;">Order No &nbsp; <span style="font-size: 22px; font-weight: bold;">#${data.orderNo}</span></td>
            <td style="width: 50%; text-align: right;">Ticket No &nbsp; <span style="font-size: 22px; font-weight: bold;">#${data.ticketNo}</span></td>
          </tr>
        </table>
        
        <hr />
        
        <table class="items-table">
          <thead>
            <tr>
              <th style="width: 15%;">QTY</th>
              <th style="width: 60%;">DESCRIPTION</th>
              <th style="width: 25%; text-align: right;">AMT</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="3"><hr style="border-top: 1px solid #000; margin: 2px 0 8px 0;" /></td></tr>
            ${itemsHtml}
          </tbody>
        </table>
      </body>
    </html>
  `;
};
