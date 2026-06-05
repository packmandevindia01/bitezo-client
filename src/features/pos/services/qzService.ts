import qz from "qz-tray";

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
    await qz.websocket.connect();
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
