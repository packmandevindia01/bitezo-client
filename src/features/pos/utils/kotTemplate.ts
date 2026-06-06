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

  return `
    <html>
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
          .header-title { font-size: 22px; font-weight: bold; margin-bottom: 10px; }
          .sub-title { font-size: 18px; font-weight: bold; margin-bottom: 15px; letter-spacing: 1px; }
          
          table.meta-table {
            width: 100%;
            margin-bottom: 15px;
            font-size: 13px;
            font-weight: bold;
          }
          table.meta-table td {
            padding-bottom: 3px;
          }
          
          table.order-table {
            width: 100%;
            margin-bottom: 10px;
            font-size: 14px;
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
      <body>
        <div class="text-center header-title">${orderTypeStr}</div>
        <div class="text-center sub-title">***${data.headerTitle || "NEW ORDER"}***</div>
        
        <table class="meta-table">
          <tr>
            <td>Date: <span style="font-weight: normal">${dateStr}</span></td>
            <td>Time: <span style="font-weight: normal">${timeStr}</span></td>
          </tr>
          <tr>
            <td>Waiter: <span style="font-weight: normal">${data.waiter}</span></td>
            <td>Counter: <span style="font-weight: normal">${data.counter}</span></td>
          </tr>
          <tr>
            <td>Section: <span style="font-weight: normal">${data.section}</span></td>
            <td>Table: <span style="font-weight: normal">${data.table}</span></td>
          </tr>
        </table>
        
        <table class="order-table">
          <tr>
            <td style="width: 50%;">Order No &nbsp; <span style="font-size: 20px; font-weight: bold;">#${data.orderNo}</span></td>
            <td style="width: 50%;">Ticket No &nbsp; <span style="font-size: 20px; font-weight: bold;">#${data.ticketNo}</span></td>
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
