import { Capacitor, registerPlugin } from '@capacitor/core';
import qz from "qz-tray";
// html2canvas removed — native printing now uses ESC/POS via printEscPosMarkup()

export interface BitezoPrinterPlugin {
  printImage(options: { base64: string; type: string; address: string; port?: number }): Promise<void>;
  /** Fast ESC/POS text print — uses dantsu markup, no image conversion */
  printEscPos(options: { markup: string; type: string; address: string; port?: number }): Promise<void>;
}
const BitezoPrinter = registerPlugin<BitezoPrinterPlugin>('BitezoPrinter');

let isConnected = false;

/**
 * Initializes and connects to the local QZ Tray websocket.
 */
export const connectQZ = async (): Promise<void> => {
  if (isConnected || qz.websocket.isActive()) {
    isConnected = true;
    return;
  }
  
  try {
    const printServerIp = localStorage.getItem('printServerIp');
    const connectOptions = printServerIp ? { host: printServerIp } : undefined;
    await qz.websocket.connect(connectOptions);
    isConnected = true;
    console.log("[QZ Tray] Connected successfully.");
  } catch (err) {
    console.error("[QZ Tray] Failed to connect:", err);
    throw err;
  }
};

/**
 * Fast ESC/POS native print using dantsu markup.
 * Used on Capacitor (tablet/phone) for ALL POS print jobs:
 * bill receipts, KOT slips, cashier reports, reprints.
 *
 * @param markup            dantsu-formatted markup string (from escPosGenerator.ts)
 * @param targetPrinterName optional target printer name to resolve IP address
 */
export const printEscPosMarkup = async (markup: string, targetPrinterName?: string): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    console.warn("[printEscPosMarkup] Called on non-native platform — skipping.");
    return;
  }

  let targetIp = "";
  const targetName = targetPrinterName || localStorage.getItem('cachedBillPrinter') || "";

  if (targetName && targetName !== 'No Printer') {
    try {
      const { printerSettingsApi } = await import("./printerSettingsApi");
      const ipMapRes = await printerSettingsApi.getPrinterIpMap();
      if (ipMapRes?.isSuccess && Array.isArray(ipMapRes.data)) {
        const found = ipMapRes.data.find(item => item.printerName.toLowerCase() === targetName.toLowerCase());
        if (found && found.ipAddress) {
          targetIp = found.ipAddress;
        }
      }
    } catch (e) {
      console.error("[Native ESC/POS] Failed to fetch printer IP map:", e);
    }
  }

  if (!targetIp) {
    targetIp = localStorage.getItem('printerIpAddress') || "";
  }

  if (!targetIp) {
    const errorMsg = targetName 
      ? `IP address not found for printer "${targetName}". Please configure IP mapping in Printer Settings.`
      : "No printer IP address mapped. Please configure Printer IP Mapping in POS Settings.";
    throw new Error(errorMsg);
  }

  console.log(`[Native ESC/POS] Sending markup for printer "${targetName}" to IP ${targetIp}`);

  await BitezoPrinter.printEscPos({
    markup,
    type: 'tcp',
    address: targetIp,
    port: 9100,
  });

  console.log("[Native ESC/POS] Print job sent successfully.");
};

let cachedPrinterList: string[] | null = null;

export const getAvailablePrinters = async (): Promise<string[]> => {
  if (cachedPrinterList && cachedPrinterList.length > 0) {
    return cachedPrinterList;
  }
  await connectQZ();
  try {
    const list = await qz.printers.find();
    cachedPrinterList = Array.isArray(list) ? list : [];
  } catch (err) {
    console.error("[QZ Tray] Failed to fetch printer list:", err);
    cachedPrinterList = [];
  }
  return cachedPrinterList;
};

/**
 * Prints HTML content via QZ Tray — WEB / DESKTOP path only.
 * Routes HTML receipts to local installed Windows printer drivers via QZ Tray.
 */
export const printHtmlReceipt = async (htmlContent: string, printerName?: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    // Safety guard — native callers must use printEscPosMarkup()
    throw new Error("[Native] printHtmlReceipt() is not supported on mobile. Use printEscPosMarkup() instead.");
  }

  // Web Browser / Desktop — route to QZ Tray
  console.log("[Web Browser] Routing print job to QZ Tray...");
  await connectQZ();

  let targetPrinter: string | null = null;

  try {
    if (printerName) {
      const printers = await getAvailablePrinters();
      const exactMatch = printers.find((p: string) => p.toLowerCase() === printerName.toLowerCase());
      if (exactMatch) {
        targetPrinter = exactMatch;
      } else {
        console.warn(`[QZ Tray] Printer "${printerName}" not found in list (${printers.join(', ')}). Falling back to default.`);
      }
    }
    
    if (!targetPrinter) {
      targetPrinter = await qz.printers.getDefault();
    }
    
    if (!targetPrinter) {
      throw new Error("No default printer found on this system.");
    }

    console.log(`[QZ Tray Local Driver] Printing to local driver "${targetPrinter}"`);

    const config = qz.configs.create(targetPrinter, {
      margins: 0,
      spool: { size: 1 }
    });

    const data = [
      {
        type: 'html',
        format: 'plain',
        data: htmlContent
      }
    ];

    await qz.print(config, data);
    console.log(`[QZ Tray] Successfully sent HTML receipt to ${targetPrinter}`);
  } catch (err) {
    console.error("[QZ Tray] Print failed:", err);
    throw err;
  }
};
