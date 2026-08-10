import { Capacitor, registerPlugin } from '@capacitor/core';
import qz from "qz-tray";
import html2canvas from "html2canvas";

export interface BitezoPrinterPlugin {
  printImage(options: { base64: string, type: string, address: string, port?: number }): Promise<void>;
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
 * Prints HTML content to a specific printer.
 * If printerName is omitted or not found, it falls back to the default printer.
 */
export const printHtmlReceipt = async (htmlContent: string, printerName?: string): Promise<void> => {
  // 1. Check if we are running as a Native App on a tablet
  if (Capacitor.isNativePlatform()) {
    console.log("[Mobile App] Routing print job to Native Plugin...");
    try {
      // Create a hidden iframe to isolate CSS so html2canvas doesn't crash on Tailwind's oklch variables
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.top = '-9999px';
      iframe.style.left = '-9999px';
      iframe.style.width = '288px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!iframeDoc) throw new Error("Could not access iframe document");

      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // Wait for images inside the iframe to load (reduced for speed)
      await new Promise(resolve => setTimeout(resolve, 200));

      // Size iframe perfectly to the content to avoid printing endless white space, but add a 40px padding buffer to prevent clipping
      const contentHeight = (iframeDoc.body.scrollHeight || iframeDoc.documentElement.scrollHeight) + 40;
      iframe.style.height = `${contentHeight}px`;

      // Optimized for speed: Lower scale slightly, use JPEG compression, and force white background
      const canvas = await html2canvas(iframeDoc.body, { 
        scale: 1.5,
        windowWidth: 288,
        windowHeight: contentHeight,
        logging: false,
        backgroundColor: '#ffffff'
      });
      
      // Use JPEG with 0.6 quality for massive payload size reduction over TCP
      const base64 = canvas.toDataURL('image/jpeg', 0.6);
      document.body.removeChild(iframe);

      // We will pull the configured Native printer from local storage
      const nativePrinterType = localStorage.getItem('nativePrinterType') || 'tcp'; // 'tcp' or 'bluetooth'
      const nativePrinterAddress = localStorage.getItem('nativePrinterAddress'); // IP or MAC Address

      if (!nativePrinterAddress) {
        throw new Error("No native printer configured. Please go to Printer Settings.");
      }

      await BitezoPrinter.printImage({
        base64: base64,
        type: nativePrinterType,
        address: nativePrinterAddress,
        port: 9100
      });
      console.log("[Mobile App] Successfully sent image to Native Printer!");
    } catch (err) {
      console.error("[Mobile App] Native Print failed:", err);
      throw err;
    }
    return;
  }
  
  // 2. Fallback to existing Web Browser Logic for desktop cashiers
  console.log("[Web Browser] Routing print job to QZ Tray...");
  await connectQZ();

  let targetPrinter: string | null = null;

  try {
    if (printerName) {
      const printers = await qz.printers.find();
      const exactMatch = printers.find((p: string) => p.toLowerCase() === printerName.toLowerCase());
      if (exactMatch) {
        targetPrinter = exactMatch;
      } else {
        console.warn(`[QZ Tray] Printer "${printerName}" not found. Falling back to default.`);
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
