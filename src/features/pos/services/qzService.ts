import { Capacitor, registerPlugin } from '@capacitor/core';
import html2canvas from 'html2canvas';
import { generateUUID } from '../../../utils/uuid';

export interface BitezoPrinterPlugin {
  printImage(options: { base64: string; type: string; address: string; port?: number }): Promise<void>;
  /** Fast ESC/POS text print — uses dantsu markup, no image conversion */
  printEscPos(options: { markup: string; type: string; address: string; port?: number }): Promise<void>;
}
const BitezoPrinter = registerPlugin<BitezoPrinterPlugin>('BitezoPrinter');

export interface PrintAgentResponse<T = unknown> {
  requestId: string;
  success: boolean;
  result?: T;
  error?: string | null;
}

export interface ListPrintersResult {
  printers: string[];
  defaultPrinter?: string;
}

const DEFAULT_AGENT_PORTS = [9191, 8181];

class PrintAgentClient {
  private ws: WebSocket | null = null;
  private pending = new Map<string, { resolve: (res: any) => void; reject: (err: any) => void }>();
  private isConnecting = false;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private activeUrl = "ws://localhost:9191/print";
  private defaultPrinter: string | null = null;
  private cachedPrinters: string[] | null = null;

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  public getActiveUrl(): string {
    return this.activeUrl;
  }

  public async connect(): Promise<void> {
    if (this.isConnected()) return;

    if (this.isConnecting) {
      return new Promise<void>((resolve, reject) => {
        const check = setInterval(() => {
          if (this.isConnected()) {
            clearInterval(check);
            resolve();
          }
        }, 100);
        setTimeout(() => {
          clearInterval(check);
          if (this.isConnected()) resolve();
          else reject(new Error("Timeout connecting to Printer Agent."));
        }, 5000);
      });
    }

    this.isConnecting = true;

    const customIp = localStorage.getItem("printServerIp");
    const candidateUrls: string[] = [];

    if (customIp) {
      candidateUrls.push(`ws://${customIp}:9191/print`, `ws://${customIp}:8181/print`);
    }

    // Try local client first (standard cashier setup)
    DEFAULT_AGENT_PORTS.forEach((port) => {
      candidateUrls.push(`ws://localhost:${port}/print`);
    });

    // If accessing via IIS IP/host, also try the host server
    if (typeof window !== "undefined" && window.location?.hostname && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      candidateUrls.push(`ws://${window.location.hostname}:9191/print`, `ws://${window.location.hostname}:8181/print`);
    }

    for (const url of candidateUrls) {
      try {
        await this.tryConnectUrl(url);
        this.activeUrl = url;
        this.isConnecting = false;
        console.log(`[PrintAgent] Connected successfully to ${this.activeUrl}`);
        return;
      } catch {
        // Continue to next candidate port
      }
    }

    this.isConnecting = false;
    throw new Error("Could not reach Printer Agent. Is PrinterAgent.exe running?");
  }

  private tryConnectUrl(url: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const ws = new WebSocket(url);

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try {
            ws.close();
          } catch {
            // ignore
          }
          reject(new Error(`Timeout connecting to ${url}`));
        }
      }, 2000);

      ws.onopen = () => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          this.ws = ws;
          this.setupWsHandlers(ws);
          resolve();
        }
      };

      ws.onerror = (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      };
    });
  }

  private setupWsHandlers(ws: WebSocket) {
    ws.onclose = () => {
      if (this.ws === ws) {
        this.ws = null;
        console.warn("[PrintAgent] Connection closed. Reconnecting in 3 seconds...");
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
          this.connect().catch(() => {});
        }, 3000);
      }
    };

    ws.onerror = (err) => {
      console.warn("[PrintAgent] WebSocket error:", err);
    };

    ws.onmessage = (evt) => {
      let msg: PrintAgentResponse;
      try {
        msg = JSON.parse(evt.data);
      } catch {
        return;
      }

      if (!msg.requestId) return;
      const handler = this.pending.get(msg.requestId);
      if (handler) {
        this.pending.delete(msg.requestId);
        if (msg.success) {
          handler.resolve(msg.result);
        } else {
          handler.reject(new Error(msg.error || "Printer Agent operation failed"));
        }
      }
    };
  }

  public async send<T = any>(action: string, fields: Record<string, any> = {}): Promise<T> {
    await this.connect();
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("Printer Agent is not connected.");
    }

    const requestId = generateUUID();
    return new Promise<T>((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      this.ws!.send(JSON.stringify({ action, requestId, ...fields }));

      setTimeout(() => {
        if (this.pending.has(requestId)) {
          this.pending.delete(requestId);
          reject(new Error(`Timed out waiting for '${action}' response from Printer Agent.`));
        }
      }, 20000);
    });
  }

  public async listPrinters(forceRefresh = false): Promise<string[]> {
    if (!forceRefresh && this.cachedPrinters && this.cachedPrinters.length > 0) {
      return this.cachedPrinters;
    }

    const res = await this.send<ListPrintersResult | string[]>("listPrinters");
    let list: string[] = [];
    if (Array.isArray(res)) {
      list = res;
    } else if (res && typeof res === "object") {
      if (Array.isArray(res.printers)) {
        list = res.printers;
      }
      if (res.defaultPrinter) {
        this.defaultPrinter = res.defaultPrinter;
      }
    }
    this.cachedPrinters = list;
    return list;
  }

  public async getDefaultPrinter(): Promise<string | null> {
    if (this.defaultPrinter) return this.defaultPrinter;
    await this.listPrinters();
    return this.defaultPrinter;
  }

  public async printImage(printer: string, base64: string, options?: any): Promise<void> {
    return this.send("printImage", { printer, data: base64, options });
  }

  public async printRaw(printer: string, base64OrString: string, options?: any): Promise<void> {
    const data =
      typeof base64OrString === "string" && !isBase64(base64OrString)
        ? btoa(unescape(encodeURIComponent(base64OrString)))
        : base64OrString;
    return this.send("printRaw", { printer, data, options });
  }

  public async printPdf(printer: string, base64OrBuffer: string | ArrayBuffer, options?: any): Promise<void> {
    const data =
      typeof base64OrBuffer === "string"
        ? base64OrBuffer
        : arrayBufferToBase64(base64OrBuffer);
    return this.send("printPdf", { printer, data, options });
  }
}

function isBase64(str: string): boolean {
  if (str.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(str)) return false;
  return true;
}

function arrayBufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const printAgent = new PrintAgentClient();

/**
 * Initializes and connects to the local Printer Agent websocket.
 * (Maintains backward compatibility with legacy connectQZ calls)
 */
export const connectQZ = async (): Promise<void> => {
  await printAgent.connect();
};

export const connectPrinterAgent = connectQZ;

/**
 * Fast ESC/POS native print using dantsu markup.
 * Used on Capacitor (tablet/phone) for ALL POS print jobs:
 * bill receipts, KOT slips, cashier reports, reprints.
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

/**
 * Fetches available desktop printers from the active Printer Agent.
 */
export const getAvailablePrinters = async (): Promise<string[]> => {
  try {
    return await printAgent.listPrinters();
  } catch (err) {
    console.error("[PrintAgent] Failed to fetch printer list:", err);
    return [];
  }
};

import jsPDF from 'jspdf';

/**
 * Prints HTML content via Printer Agent — WEB / DESKTOP path only.
 * Renders HTML inside an isolated iframe, sanitizes away all Tailwind v4 oklch styles,
 * generates a crisp 80mm PDF via jsPDF, and dispatches to PrinterAgent.exe.
 */
export const printHtmlReceipt = async (htmlContent: string, printerName?: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    throw new Error("[Native] printHtmlReceipt() is not supported on mobile. Use printEscPosMarkup() instead.");
  }

  console.log("[Web Browser] Routing print job to Printer Agent...");
  await printAgent.connect();

  let targetPrinter: string | null = null;
  const available = await printAgent.listPrinters();

  if (printerName && printerName !== "No Printer") {
    const exactMatch = available.find((p) => p.toLowerCase() === printerName.toLowerCase());
    if (exactMatch) {
      targetPrinter = exactMatch;
    } else {
      console.warn(`[PrintAgent] Printer "${printerName}" not found in list (${available.join(', ')}). Falling back to default.`);
    }
  }

  if (!targetPrinter) {
    targetPrinter = await printAgent.getDefaultPrinter();
  }

  if (!targetPrinter && available.length > 0) {
    targetPrinter = available[0];
  }

  if (!targetPrinter) {
    throw new Error("No printer available on this system. Please check PrinterAgent.exe.");
  }

  console.log(`[PrintAgent] Rendering HTML receipt for target printer "${targetPrinter}"`);

  // Strip any inline oklch strings before writing
  const sanitizedHtml = htmlContent.replace(/oklch\([^)]+\)/gi, "#000000");

  // Render in an isolated hidden iframe to prevent inheriting Tailwind CSS v4 oklch styles
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "285px"; // 285px * 2 = 570 dots, perfectly fills full 72mm printable width of 80mm roll
  iframe.style.height = "auto";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      throw new Error("Unable to create isolated render context for receipt.");
    }

    doc.open();
    doc.write(sanitizedHtml);
    doc.close();

    // Give iframe DOM and custom fonts a moment to layout
    await new Promise((r) => setTimeout(r, 200));

    const renderTarget = doc.body;

    const canvas = await html2canvas(renderTarget, {
      scale: 2, // 2x resolution: 285px * 2 = 570 dots (1:1 dot precision on 576-dot thermal head)
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      windowWidth: 285,
      onclone: (clonedDoc) => {
        // 1. Wipe out any adopted stylesheets from modern browser/bundler
        try {
          if ('adoptedStyleSheets' in clonedDoc) {
            (clonedDoc as any).adoptedStyleSheets = [];
          }
        } catch {
          // ignore if adoptedStyleSheets is readonly
        }

        // 2. Remove external stylesheet links to avoid Tailwind oklch
        clonedDoc.querySelectorAll('link[rel="stylesheet"], link[as="style"]').forEach((el) => el.remove());

        // 3. DO NOT delete the receipt template's own <style> tag!
        // Instead, sanitize any oklch color references inside style tags
        clonedDoc.querySelectorAll('style').forEach((styleEl) => {
          if (styleEl.textContent && styleEl.textContent.includes('oklch')) {
            styleEl.textContent = styleEl.textContent.replace(/oklch\([^)]+\)/gi, '#000000');
          }
        });

        // 4. Sanitize any inline styles that might contain oklch
        clonedDoc.querySelectorAll('*').forEach((el: any) => {
          if (el.style) {
            for (let i = el.style.length - 1; i >= 0; i--) {
              const prop = el.style[i];
              const val = el.style.getPropertyValue(prop);
              if (val && typeof val === 'string' && val.includes('oklch')) {
                el.style.setProperty(prop, '#000000');
              }
            }
          }
        });
      },
    });

    // High-Contrast Solid Black Binarization:
    // Thermal printers cannot print anti-aliased gray pixels (they dither them into fuzzy dots).
    // Converting all stroke pixels (< 235) to 100% solid jet-black preserves thin Arabic cursive and bold English text!
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx) {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = imgData.data;
      for (let i = 0; i < d.length; i += 4) {
        const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const v = lum < 235 ? 0 : 255;
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
        d[i + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // Auto-Cutter Clearance Margin & Aspect Protection:
    // Thermal receipt printers physically place the auto-cut knife ~15-25mm (120-160 dots at 203 DPI) below the thermal print head.
    // Padding the bottom with white ensures the paper feeds completely past the cutter blade so footers are never sliced off!
    let finalCanvas: HTMLCanvasElement = canvas;
    const cutterFeedMargin = 160;
    const finalHeight = Math.max(canvas.height + cutterFeedMargin, Math.round(canvas.width * 1.05));
    const padded = document.createElement("canvas");
    padded.width = canvas.width;
    padded.height = finalHeight;
    const padCtx = padded.getContext("2d");
    if (padCtx) {
      padCtx.fillStyle = "#ffffff";
      padCtx.fillRect(0, 0, padded.width, padded.height);
      padCtx.drawImage(canvas, 0, 0);
      finalCanvas = padded;
    }

    const dataUrl = finalCanvas.toDataURL("image/png");
    const rawBase64 = dataUrl.replace(/^data:image\/png;base64,/, "");

    // Inject 203 DPI (8000 pixels/meter) pHYs chunk into PNG so Windows GDI sees 203 DPI and never auto-rotates to Landscape!
    const dpiInjectedBase64 = injectPngDpi(rawBase64, 203);

    // Dispatch print job via PrinterAgent:
    console.log(`[PrintAgent] Dispatching crisp 203-DPI portrait thermal receipt to "${targetPrinter}"...`);
    await printAgent.printImage(targetPrinter, dpiInjectedBase64, { landscape: false });
    console.log(`[PrintAgent] Successfully printed receipt on ${targetPrinter}`);
  } catch (err) {
    console.error("[PrintAgent] Print failed:", err);
    throw err;
  } finally {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }
};

/**
 * Directly prints a jsPDF Document instance via PrinterAgent.
 * Allows components like PurchasePrintPreviewModal and pdfGenerator to bypass the browser print dialog.
 */
export const printJsPdfReceipt = async (doc: jsPDF, printerName?: string): Promise<void> => {
  await printAgent.connect();
  let targetPrinter = printerName;
  if (!targetPrinter || targetPrinter === "No Printer") {
    targetPrinter = await printAgent.getDefaultPrinter() || (await printAgent.listPrinters())[0];
  }
  if (!targetPrinter) {
    throw new Error("No printer available on this system. Please check PrinterAgent.exe.");
  }
  const pdfArrayBuffer = doc.output("arraybuffer");
  await printAgent.printPdf(targetPrinter, pdfArrayBuffer);
};

// Precomputed CRC table for fast PNG chunk calculation
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC_TABLE[i] = c;
}

function crc32(bytes: Uint8Array, start: number, length: number): number {
  let crc = -1;
  for (let i = start; i < start + length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Injects a pHYs chunk into a base64 PNG string to specify native printer DPI (203 DPI).
 * This ensures Windows GDI and thermal printer drivers map pixels 1:1 without auto-rotating to Landscape.
 */
function injectPngDpi(base64Png: string, dpi = 203): string {
  const binaryString = atob(base64Png);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // PNG signature: 8 bytes. IHDR: 4 (len) + 4 ("IHDR") + 13 (data) + 4 (crc) = 25 bytes.
  // Insertion point is immediately after IHDR at index 33.
  if (len < 33) return base64Png;

  // Pixels per meter = DPI / 0.0254
  const ppm = Math.round(dpi / 0.0254);

  const physChunk = new Uint8Array(21);
  const view = new DataView(physChunk.buffer);
  view.setUint32(0, 9, false); // Length = 9
  physChunk[4] = 0x70; // 'p'
  physChunk[5] = 0x48; // 'H'
  physChunk[6] = 0x59; // 'Y'
  physChunk[7] = 0x73; // 's'
  view.setUint32(8, ppm, false); // X pixels per unit
  view.setUint32(12, ppm, false); // Y pixels per unit
  physChunk[16] = 1; // Unit: meter

  const crc = crc32(physChunk, 4, 13);
  view.setUint32(17, crc, false);

  const result = new Uint8Array(len + 21);
  result.set(bytes.subarray(0, 33), 0);
  result.set(physChunk, 33);
  result.set(bytes.subarray(33), 33 + 21);

  let binary = "";
  const chunk = 8192;
  for (let i = 0; i < result.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(result.subarray(i, i + chunk)));
  }
  return btoa(binary);
}


