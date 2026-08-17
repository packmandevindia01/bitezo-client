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
 * @param markup  dantsu-formatted markup string (from escPosGenerator.ts)
 */
export const printEscPosMarkup = async (markup: string): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    console.warn("[printEscPosMarkup] Called on non-native platform — skipping.");
    return;
  }

  const nativePrinterType    = localStorage.getItem('nativePrinterType') || 'tcp';
  const nativePrinterAddress = localStorage.getItem('nativePrinterAddress');

  if (!nativePrinterAddress) {
    throw new Error("No native printer configured. Please go to POS Settings → Printer Settings.");
  }

  console.log(`[Native ESC/POS] Sending markup to ${nativePrinterType} printer at ${nativePrinterAddress}`);

  await BitezoPrinter.printEscPos({
    markup,
    type: nativePrinterType,
    address: nativePrinterAddress,
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
 * On native Capacitor, use printEscPosMarkup() instead.
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
