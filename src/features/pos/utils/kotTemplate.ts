import type { PosCartItem } from "../types";
import { branchApi } from "../../inventory/branches/services/branchApi";
import { getLineStyle } from "../../inventory/branches/utils/lineHelpers";

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

export const generateKotHtml = async (
  cartDetails: PosCartItem[], 
  data: KotPrintData
): Promise<string> => {
  // Use current date/time as fallback
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

  // Map internal camelCase/PascalCase names → human-readable display
  const orderTypeIdMap: Record<number, string> = {
    1: "DINE IN", 2: "TAKE OUT", 3: "DRIVE THRU",
    4: "DELIVERY", 5: "PROVIDERS", 6: "COMING"
  };
  const orderTypeNameMap: Record<string, string> = {
    "dinein": "DINE IN", "takein": "DINE IN",
    "takeout": "TAKE OUT", "takeaway": "TAKE OUT",
    "drivethru": "DRIVE THRU", "drivethrough": "DRIVE THRU",
    "delivery": "DELIVERY",
    "providers": "PROVIDERS",
    "coming": "COMING"
  };
  const rawOrderType = data.orderType || "";
  const normalizedKey = rawOrderType.toLowerCase().replace(/[\s_-]/g, "");
  const orderTypeStr = orderTypeNameMap[normalizedKey]
    || (data as any).orderTypeIdMap?.[(data as any).orderTypeId]
    || orderTypeIdMap[(data as any).orderTypeId as number]
    || (rawOrderType ? rawOrderType.replace(/([A-Z])/g, " $1").trim().toUpperCase() : "DINE IN");
  const isDineIn = orderTypeStr === "DINE IN";

  let itemsHtml = "";
  let totalVat = 0;
  let grandTotal = 0;
  let serialNo = 0;

  cartDetails.forEach((item) => {
    // Determine the product name
    let name = (item.product?.name || `Item #${item.productId}`).toUpperCase();
    if (item.variantName && item.variantName.toLowerCase().trim() !== 'main') {
      name += ` - ${item.variantName.toUpperCase()}`;
    }
    const qty = item.quantity;
    
    let extrasSum = 0;
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach(ex => extrasSum += (ex.price * (ex.qty || 1)));
    }
    
    // Subtract extrasSum because the extras are printed separately below
    let baseAmt = (item as any).lineTotal;
    if (baseAmt !== undefined) {
      baseAmt -= extrasSum;
    } else {
      baseAmt = (item.price || item.product?.price || 0) * item.quantity;
    }
    const amt = baseAmt.toFixed(3);

    serialNo++;
    itemsHtml += `
      <div style="display:flex; width:100%; align-items:flex-start; padding: 1px 0;">
        <div style="flex: 0 0 30px; min-width:30px; text-align:center; font-weight:bold; font-size:11px;">${serialNo}</div>
        <div style="flex: 0 0 36px; min-width:36px; text-align:center; font-weight:bold; font-size:11px;">${qty}</div>
        <div style="flex: 1 1 auto; text-align:left; font-weight:bold; font-size:11px; overflow:hidden;">${name}</div>
        <div style="flex: 0 0 48px; min-width:48px; text-align:right; font-weight:bold; font-size:11px;">${amt}</div>
      </div>
    `;

    // Print extras
    if (item.extras && item.extras.length > 0) {
      item.extras.forEach((ex) => {
          const exName = (ex.name || "EXTRA").toUpperCase();
          const exAmt = (ex.price * ex.qty).toFixed(3);
          itemsHtml += `
            <div style="display:flex; width:100%; align-items:flex-start; padding: 1px 0;">
              <div style="flex: 0 0 30px;"></div>
              <div style="flex: 0 0 36px;"></div>
              <div style="flex: 1 1 auto; text-align:left; font-size:10px; padding-left:6px;">+ ${exName}</div>
              <div style="flex: 0 0 48px; min-width:48px; text-align:right; font-weight:bold; font-size:10px;">${exAmt}</div>
            </div>
          `;
        });
    }

    // Print modifiers
    if (item.modifiers && item.modifiers.length > 0) {
      item.modifiers.forEach((mod) => {
          const modName = (mod.name || "MODIFIER").toUpperCase();
          itemsHtml += `
            <div style="display:flex; width:100%; align-items:flex-start; padding: 1px 0;">
              <div style="flex: 0 0 30px;"></div>
              <div style="flex: 0 0 36px;"></div>
              <div style="flex: 1 1 auto; text-align:left; font-style:italic; font-size:10px; padding-left:6px;">* ${modName}</div>
              <div style="flex: 0 0 48px; min-width:48px;"></div>
            </div>
          `;
        });
    }
    
    // Accumulate totals
    const itemVat = (item as any).vatAmount || 0;
    // lineTotal (from posSelectors) is lineNetAmount = vatBase + vatAmount, so it ALREADY includes VAT.
    // Do NOT add vatAmount again or it will be double-counted.
    let itemNet = (item as any).lineTotal;
    if (itemNet === undefined) {
      itemNet = baseAmt + extrasSum + itemVat;
    }
    totalVat += itemVat;
    grandTotal += itemNet;
  });

  const styles = `
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            color: #000;
            margin: 0;
            padding: 4px;
            width: 100%;
          }
          table { border-collapse: collapse; width: 100%; table-layout: fixed; }
          .text-center { text-align: center; }
          .font-bold { font-weight: bold; }
          .dashed-line { border: none; border-top: 1px dashed #000; margin: 5px 0; }
          .solid-line { border: none; border-top: 2px solid #000; margin: 5px 0; }
        </style>
      </head>
  `;

  // ─── Build meta rows (label : value pairs in a 2-column grid) ──────
  const metaRow = (label1: string, val1: string, label2: string, val2: string) => `
    <tr>
      <td style="width: 50%; padding: 1px 0; font-size: 11px;">
        <span style="font-weight: bold;">${label1} :</span> ${val1}
      </td>
      <td style="width: 50%; padding: 1px 0; font-size: 11px;">
        <span style="font-weight: bold;">${label2} :</span> ${val2}
      </td>
    </tr>
  `;

  // Common meta rows
  let metaHtml = metaRow("Date", dateStr, "Time", timeStr);
  metaHtml += metaRow("Waiter", data.waiter, "Counter", data.counter);
  if (isDineIn) {
    metaHtml += metaRow("Section", data.section, "Table", data.table);
  }
  if (data.vehicleNo || data.customerName) {
    metaHtml += metaRow(
      data.vehicleNo ? "Vehicle" : "", data.vehicleNo || "",
      data.customerName ? "Customer" : "", data.customerName || ""
    );
  }

  // ─── Order No / Ticket No row ──────
  const orderTicketHtml = `
    <table>
      <tr>
        <td style="width: 50%; text-align: left; padding: 4px 0; font-size: 12px;">
          <span style="font-weight: bold;">Order No</span>&nbsp;
          <span style="font-size: 18px; font-weight: bold;">#${data.orderNo}</span>
        </td>
        <td style="width: 50%; text-align: right; padding: 4px 0; font-size: 12px;">
          <span style="font-weight: bold;">Ticket No</span>&nbsp;
          <span style="font-size: 18px; font-weight: bold;">#${data.ticketNo}</span>
        </td>
      </tr>
    </table>
  `;

  // ─── Items section (flex-based for reliable column separation on thermal printers) ──────
  const itemsTableHtml = `
    <div>
      <div style="display:flex; width:100%; align-items:center; padding-bottom:3px;">
        <div style="flex: 0 0 30px; min-width:30px; text-align:center; font-weight:bold; font-size:10px;">SNo</div>
        <div style="flex: 0 0 36px; min-width:36px; text-align:center; font-weight:bold; font-size:10px;">QTY</div>
        <div style="flex: 1 1 auto; text-align:left; font-weight:bold; font-size:10px;">DESCRIPTION</div>
        <div style="flex: 0 0 48px; min-width:48px; text-align:right; font-weight:bold; font-size:10px;">AMT</div>
      </div>
      <hr class="dashed-line" style="margin: 2px 0 4px 0;" />
      ${itemsHtml}
    </div>
  `;

  // ─── Totals ──────
  const totalsHtml = grandTotal > 0 ? `
    <hr class="dashed-line" />
    <table>
      ${totalVat > 0 ? `
      <tr>
        <td style="text-align: right; padding: 3px 8px 3px 0; font-size: 13px; font-weight: bold;">VAT Amount:</td>
        <td style="text-align: right; width: 30%; padding: 3px 0; font-size: 13px; font-weight: bold;">${totalVat.toFixed(3)}</td>
      </tr>
      ` : ''}
      <tr>
        <td style="text-align: right; padding: 3px 8px 3px 0; font-size: 14px; font-weight: bold;">Total:</td>
        <td style="text-align: right; width: 30%; padding: 3px 0; font-size: 14px; font-weight: bold;">${grandTotal.toFixed(3)}</td>
      </tr>
    </table>
  ` : '';

  // ─── MASTER KOT layout ──────
  if (data.isMaster) {
    return `
      <html>
        ${styles}
        <body>
          ${customHeadersHtml ? `
            <div style="text-align: center; margin-bottom: 8px; padding: 0 4px; width: 100%; overflow-x: hidden;">
              ${customHeadersHtml}
            </div>
          ` : ''}

          <div class="text-center" style="font-size: 18px; font-weight: bold; margin-bottom: 5px;">${orderTypeStr}</div>

          ${orderTicketHtml}

          <hr class="solid-line" />

          <table>${metaHtml}</table>

          ${isDineIn ? `<div class="text-center" style="font-size: 20px; font-weight: bold; margin: 8px 0;">Table : ${data.table}</div>` : ''}

          <hr class="solid-line" />
          <div class="text-center" style="font-size: 22px; font-weight: bold; margin: 8px 0;">***${data.headerTitle || "KOT"}***</div>
          <hr class="solid-line" />

          ${itemsTableHtml}

          ${totalsHtml}
          
          <div class="text-center" style="font-size: 11px; margin-top: 8px;">Print On : ${dateStr} ${timeStr}</div>
        </body>
      </html>
    `;
  }

  // ─── STATION KOT layout ──────
  return `
    <html>
      ${styles}
      <body>
        ${customHeadersHtml ? `
            <div style="text-align: center; margin-bottom: 8px; padding: 0 4px; width: 100%; overflow-x: hidden;">
              ${customHeadersHtml}
            </div>
          ` : ''}

        <div class="text-center" style="font-size: 20px; font-weight: bold; margin-bottom: 4px;">${orderTypeStr}</div>
        <div class="text-center" style="font-size: 22px; font-weight: bold; margin-bottom: 8px; letter-spacing: 1px;">***${data.headerTitle || "KOT"}***</div>

        <hr class="solid-line" />

        <table>${metaHtml}</table>

        ${orderTicketHtml}

        <hr class="solid-line" />

        ${itemsTableHtml}

        ${totalsHtml}
      </body>
    </html>
  `;
};
