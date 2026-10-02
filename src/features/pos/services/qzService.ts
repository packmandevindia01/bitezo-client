import { Capacitor, registerPlugin } from '@capacitor/core';
import html2canvas from 'html2canvas';
import { generateUUID } from '../../../utils/uuid';

export interface BitezoPrinterPlugin {
  printImage(options: { base64: string; type: string; address: string; port?: number }): Promise<void>;
  /** Fast ESC/POS text print — uses dantsu markup, no image conversion */
  printEscPos(options: { markup: string; type: string; address: string; port?: number; charsPerLine?: number }): Promise<void>;
  /** Direct 1:1 hardware ESC/POS raster print over raw TCP/Bluetooth socket — ultra-fast */
  printRaw(options: { data: string; type?: string; address: string; port?: number }): Promise<void>;
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
 * Resolves the target printer IP address synchronously from local storage caches,
 * or asynchronously via the backend API.
 */
export const resolveTargetIp = async (targetPrinterName?: string): Promise<string> => {
  let targetIp = "";
  const rawTarget = (targetPrinterName || "").trim();
  const isTargetNoPrinter = !rawTarget || rawTarget.toLowerCase() === "no printer" || rawTarget.toLowerCase() === "none" || rawTarget.toLowerCase() === "default";
  const targetName = isTargetNoPrinter ? (localStorage.getItem('cachedBillPrinter') || localStorage.getItem('cachedKotPrinter') || "").trim() : rawTarget;

  // 1. Direct IP Check: if targetName itself is an IP address (e.g. "192.168.1.100")
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(rawTarget)) {
    return rawTarget;
  }
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(targetName)) {
    return targetName;
  }

  // 2. Direct Station-Specific Cache Check
  const billName = (localStorage.getItem('cachedBillPrinter') || '').trim().toLowerCase();
  const kotName = (localStorage.getItem('cachedKotPrinter') || '').trim().toLowerCase();
  const packagerName = (localStorage.getItem('cachedPackagerPrinter') || '').trim().toLowerCase();
  const masterKotName = (localStorage.getItem('cachedMasterKotPrinter') || '').trim().toLowerCase();

  if (targetName) {
    const lower = targetName.toLowerCase();
    if (billName && lower === billName) {
      targetIp = localStorage.getItem('cachedBillPrinterIp') || "";
    } else if (kotName && lower === kotName) {
      targetIp = localStorage.getItem('cachedKotPrinterIp') || "";
    } else if (packagerName && lower === packagerName) {
      targetIp = localStorage.getItem('cachedPackagerPrinterIp') || "";
    } else if (masterKotName && lower === masterKotName) {
      targetIp = localStorage.getItem('cachedMasterKotPrinterIp') || "";
    }
  }

  // 3. Local Storage printerIpMap Lookup (Immediate & Synchronous)
  if (!targetIp && targetName && targetName.toLowerCase() !== 'no printer') {
    try {
      const cached = localStorage.getItem('printerIpMap');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const found = parsed.find((item: any) => 
            (item.printerName && item.printerName.toLowerCase() === targetName.toLowerCase()) ||
            item.ipAddress === targetName
          );
          if (found && found.ipAddress) {
            targetIp = found.ipAddress.trim();
          }
        }
      }
    } catch (e) {
      console.warn("[Native IP Lookup] Error reading local printerIpMap:", e);
    }
  }

  // 4. Fallback to API IP map lookup if not found locally
  if (!targetIp) {
    try {
      const { printerSettingsApi } = await import("./printerSettingsApi");
      const ipMapRes = await printerSettingsApi.getPrinterIpMap();
      if (ipMapRes?.isSuccess && Array.isArray(ipMapRes.data) && ipMapRes.data.length > 0) {
        localStorage.setItem('printerIpMap', JSON.stringify(ipMapRes.data));
        if (targetName && targetName.toLowerCase() !== 'no printer') {
          const found = ipMapRes.data.find((item: any) => 
            (item.printerName && item.printerName.toLowerCase() === targetName.toLowerCase()) ||
            item.ipAddress === targetName
          );
          if (found && found.ipAddress) {
            targetIp = found.ipAddress.trim();
          }
        }
        // If still no targetIp, pick first entry from printerIpMap that has an IP
        if (!targetIp) {
          const firstValid = ipMapRes.data.find((item: any) => item?.ipAddress && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(item.ipAddress.trim()));
          if (firstValid) {
            targetIp = firstValid.ipAddress.trim();
          }
        }
      }
    } catch (e) {
      console.warn("[Native IP Lookup] Fallback API lookup for printer IP map failed:", e);
    }
  }

  // 5. Check General Settings from API
  if (!targetIp) {
    try {
      const { printerSettingsApi } = await import("./printerSettingsApi");
      const genRes = await printerSettingsApi.getGeneral();
      const genData = genRes?.data;
      const candidates = [
        genData?.androidBillPrinter,
        genData?.billPrinter,
        genData?.androidKOTPrinter,
        genData?.kotPrinter
      ];
      for (const cand of candidates) {
        if (cand && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cand.trim())) {
          targetIp = cand.trim();
          break;
        }
      }
    } catch (e) {
      console.warn("[Native IP Lookup] Fallback general printer settings lookup failed:", e);
    }
  }

  // 6. Global Default / Fallback IPs from all known localStorage caches
  if (!targetIp) {
    const fallbackIps = [
      localStorage.getItem('cachedBillPrinterIp'),
      localStorage.getItem('cachedKotPrinterIp'),
      localStorage.getItem('printerIpAddress'),
      localStorage.getItem('cachedPackagerPrinterIp'),
      localStorage.getItem('cachedMasterKotPrinterIp'),
    ];
    for (const item of fallbackIps) {
      if (item && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(item.trim())) {
        targetIp = item.trim();
        break;
      }
    }
  }

  // 7. If still no IP, check any entry in cached printerIpMap
  if (!targetIp) {
    try {
      const cached = localStorage.getItem('printerIpMap');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          const firstWithIp = parsed.find((item: any) => item?.ipAddress && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(item.ipAddress.trim()));
          if (firstWithIp) {
            targetIp = firstWithIp.ipAddress.trim();
          }
        }
      }
    } catch {}
  }

  if (!targetIp) {
    const errorMsg = targetName && targetName.toLowerCase() !== 'no printer'
      ? `IP address not found for printer "${targetName}". Please configure IP mapping in Printer Settings.`
      : "No printer IP address mapped. Please configure Printer IP Mapping in POS Settings.";
    throw new Error(errorMsg);
  }

  return targetIp;
};

/**
 * Fast ESC/POS native print using dantsu markup.
 * Used on Capacitor (tablet/phone) for ALL pure ASCII/English POS print jobs:
 * bill receipts, KOT slips, cashier reports, reprints.
 */
export const printEscPosMarkup = async (markup: string, targetPrinterName?: string): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    console.warn("[printEscPosMarkup] Called on non-native platform — skipping.");
    return;
  }

  const targetIp = await resolveTargetIp(targetPrinterName);

  console.log(`[Native ESC/POS] Sending markup for printer "${targetPrinterName || targetIp}" to IP ${targetIp}:9100`);

  await BitezoPrinter.printEscPos({
    markup,
    type: 'tcp',
    address: targetIp,
    port: 9100,
    charsPerLine: 48,
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
 * Checks if a target printer name corresponds to an ESC/POS thermal receipt printer.
 * Returns true for all POS receipt printers (POS-80C, Epson, Xprinter, etc.).
 * Returns false only for known non-thermal printers like Microsoft Print to PDF, XPS, Fax.
 */
export function isThermalPosPrinter(printerName: string): boolean {
  if (!printerName) return true;
  const lower = printerName.toLowerCase();
  const nonPosPrinters = [
    "pdf",
    "onenote",
    "fax",
    "xps",
    "document writer",
    "snagit",
  ];
  if (nonPosPrinters.some((p) => lower.includes(p))) {
    return false;
  }
  return true;
}

/**
 * Encodes a 576-pixel wide canvas directly into 1:1 ESC/POS raster bit image commands (GS v 0).
 * Every bit directly drives one physical heating pin on the 203 DPI thermal print head.
 * Bypasses Windows GDI scaling and driver halftoning completely for razor-sharp vector clarity!
 */
export function canvasToEscPosRaster(canvas: HTMLCanvasElement): Uint8Array {
  const width = 576;
  const cutterPaddingDots = 80; // ~10mm bottom white margin so physical cutter blade never slices through footer text
  const scaledHeight = canvas.width === 576 ? canvas.height : Math.round((canvas.height * 576) / canvas.width);
  const height = scaledHeight + cutterPaddingDots;

  const fixedCanvas = document.createElement("canvas");
  fixedCanvas.width = width;
  fixedCanvas.height = height;
  const fCtx = fixedCanvas.getContext("2d");
  if (fCtx) {
    fCtx.fillStyle = "#ffffff";
    fCtx.fillRect(0, 0, width, height);
    fCtx.drawImage(canvas, 0, 0, width, scaledHeight);
  }
  const srcCanvas = fixedCanvas;

  const bytesPerLine = width / 8; // 72 bytes per row

  // ESC/POS raster header:
  // ESC @: 0x1B 0x40 (Initialize)
  // GS v 0 m xL xH yL yH: 0x1D 0x76 0x30 0x00 xL xH yL yH
  const xL = bytesPerLine & 0xff;
  const xH = (bytesPerLine >> 8) & 0xff;
  const yL = height & 0xff;
  const yH = (height >> 8) & 0xff;

  const header = [0x1b, 0x40, 0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH];
  // Post-print: ESC d 8 (feed 8 lines so paper clears cutter knife), GS V 66 0 (feed to cutter & partial cut)
  const footer = [0x1b, 0x64, 0x08, 0x1d, 0x56, 0x42, 0x00];

  const totalBytes = header.length + bytesPerLine * height + footer.length;
  const result = new Uint8Array(totalBytes);
  result.set(header, 0);

  const ctx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (ctx) {
    const imgData = ctx.getImageData(0, 0, width, height).data;
    let offset = header.length;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < bytesPerLine; x++) {
        let byte = 0;
        for (let b = 0; b < 8; b++) {
          const pixelX = x * 8 + b;
          const pixelIndex = (y * width + pixelX) * 4;
          const r = imgData[pixelIndex];
          const g = imgData[pixelIndex + 1];
          const bl = imgData[pixelIndex + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * bl;

          // Thermal pin rule: 1 = heat pin (burn black), 0 = no heat (white paper)
          // Threshold 195 captures full font stems and anti-aliased curves with dark, crisp clarity
          if (lum < 195) {
            byte |= 1 << (7 - b);
          }
        }
        result[offset++] = byte;
      }
    }
  }

  result.set(footer, header.length + bytesPerLine * height);
  return result;
}

export const uint8ArrayToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  return btoa(binary);
};

/**
 * Prints HTML content via Printer Agent — WEB / DESKTOP path only.
 * Renders HTML inside an isolated iframe, sanitizes away all Tailwind v4 oklch styles,
 * generates 1:1 hardware ESC/POS raster for thermal printers (100% razor sharp),
 * or falls back to printImage for non-thermal document printers.
 */
/**
 * Renders HTML content inside an isolated iframe, sanitizes away Tailwind v4 oklch styles,
 * and captures it to a high-resolution 576-dot canvas (1:1 matching 80mm thermal printers).
 */
export const renderHtmlToCanvas = async (htmlContent: string): Promise<HTMLCanvasElement> => {
  // Strip any inline oklch strings before writing
  const sanitizedHtml = htmlContent.replace(/oklch\([^)]+\)/gi, "#000000");

  // Render in an isolated hidden iframe to prevent inheriting Tailwind CSS v4 oklch styles
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-9999px";
  iframe.style.top = "0";
  iframe.style.width = "288px"; // 288px * 2 = 576 dots, exactly 1:1 hardware match for 576-dot 80mm thermal print head
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
    try {
      if ((doc as any).fonts?.ready) {
        await (doc as any).fonts.ready;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 300));

    // Measure exact content height and add a safe bottom buffer (80px) to ensure Arabic descenders and footer text are never clipped
    const rawContentHeight = Math.max(
      doc.body.scrollHeight,
      doc.body.offsetHeight,
      doc.documentElement.scrollHeight,
      doc.documentElement.offsetHeight
    );
    const contentHeight = rawContentHeight + 80;
    iframe.style.height = `${contentHeight + 100}px`;

    const renderTarget = doc.body;

    const canvas = await html2canvas(renderTarget, {
      scale: 2, // 2x resolution: 288px * 2 = 576 dots (exact 1:1 dot precision on 576-dot thermal head)
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 288,
      windowWidth: 288,
      height: contentHeight,
      windowHeight: contentHeight + 100,
      scrollY: 0,
      scrollX: 0,
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

    return canvas;
  } finally {
    if (iframe.parentNode) {
      document.body.removeChild(iframe);
    }
  }
};

/**
 * Prints HTML content via Printer Agent (Web / Desktop) OR native BitezoPrinter (Mobile / Tablet).
 * On mobile/tablet: renders HTML to 576-dot canvas (with Cairo font, RTL Arabic, and crisp formatting)
 * and dispatches it directly to the printer over TCP port 9100.
 */
export const printHtmlReceipt = async (htmlContent: string, printerName?: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    console.log(`[Native Print] Rendering HTML receipt to 1:1 ESC/POS raster for "${printerName || 'default'}"`);
    const targetIp = await resolveTargetIp(printerName);
    const canvas = await renderHtmlToCanvas(htmlContent);
    const rasterBytes = canvasToEscPosRaster(canvas);
    const base64Data = uint8ArrayToBase64(rasterBytes);

    try {
      await BitezoPrinter.printRaw({
        data: base64Data,
        type: "tcp",
        address: targetIp,
        port: 9100,
      });
      console.log(`[Native Print] 1:1 ESC/POS raster job sent to ${targetIp}:9100 successfully.`);
      return;
    } catch (rawErr: any) {
      console.warn("[Native Print] printRaw failed, falling back to printImage:", rawErr);
      const dataUrl = canvas.toDataURL("image/png");
      await BitezoPrinter.printImage({
        base64: dataUrl,
        type: "tcp",
        address: targetIp,
        port: 9100,
      });
      return;
    }
  }

  console.log("[Web Browser] Routing print job to Printer Agent...");
  await printAgent.connect();

  let targetPrinter: string | null = null;
  const available = await printAgent.listPrinters();

  if (printerName && printerName !== "No Printer" && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(printerName.trim())) {
    const exactMatch = available.find((p) => p.toLowerCase() === printerName.toLowerCase());
    if (exactMatch) {
      targetPrinter = exactMatch;
    } else {
      console.warn(`[PrintAgent] Printer "${printerName}" not found in list (${available.join(', ')}). Falling back to default.`);
    }
  }

  // If no targetPrinter resolved, check cachedBillPrinter if it's a valid Windows printer name
  if (!targetPrinter) {
    const cachedBill = localStorage.getItem('cachedBillPrinter');
    if (cachedBill && cachedBill !== 'No Printer' && !/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(cachedBill.trim())) {
      targetPrinter = available.find(p => p.toLowerCase() === cachedBill.toLowerCase()) || null;
    }
  }

  // Look for any standard POS thermal printer first (like POS-80C) before arbitrary Windows default
  if (!targetPrinter) {
    const posThermal = available.find(p => {
      const l = p.toLowerCase();
      return (l.includes("pos") || l.includes("80") || l.includes("thermal") || l.includes("receipt") || l.includes("tm-t") || l.includes("xprinter")) && isThermalPosPrinter(p);
    });
    if (posThermal) {
      targetPrinter = posThermal;
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

  try {
    const canvas = await renderHtmlToCanvas(htmlContent);

    // 1:1 Hardware Dot-Precision Dispatch:
    // If target printer is a POS thermal printer (like POS-80C), send 1:1 hardware ESC/POS raster via printRaw.
    // This completely bypasses Windows GDI scaling and driver halftoning, delivering 100% razor-sharp TrueType edges!
    if (isThermalPosPrinter(targetPrinter)) {
      console.log(`[PrintAgent] Dispatching 1:1 hardware ESC/POS raster to "${targetPrinter}" (100% razor sharp, zero GDI scaling)...`);
      const rasterBytes = canvasToEscPosRaster(canvas);
      const base64Raster = arrayBufferToBase64(rasterBytes);
      await printAgent.printRaw(targetPrinter, base64Raster);
      console.log(`[PrintAgent] Successfully printed 1:1 hardware raster on ${targetPrinter}`);
    } else {
      // Non-thermal document printer fallback (e.g. PDF/XPS printer):
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const v = lum < 210 ? 0 : 255;
          d[i] = v;
          d[i + 1] = v;
          d[i + 2] = v;
          d[i + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
      }

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
      const dpiInjectedBase64 = injectPngDpi(rawBase64, 203);

      console.log(`[PrintAgent] Dispatching image to non-thermal printer "${targetPrinter}"...`);
      await printAgent.printImage(targetPrinter, dpiInjectedBase64, { landscape: false });
      console.log(`[PrintAgent] Successfully printed receipt on ${targetPrinter}`);
    }
  } catch (err) {
    console.error("[PrintAgent] Print failed:", err);
    throw err;
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


