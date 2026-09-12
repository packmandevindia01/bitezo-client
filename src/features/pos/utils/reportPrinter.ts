import { Capacitor } from '@capacitor/core';
import { printEscPosMarkup, printHtmlReceipt } from '../services/qzService';

export interface PrintReportOptions {
  html: string;
  markup: string;
  directPrint: boolean;
  title: string;
}

/**
 * Unified 80mm thermal printer handler for all POS reports.
 * - Handles native Capacitor ESC/POS 80mm printing (TCP / Bluetooth).
 * - Handles web browser QZ Tray 80mm HTML thermal printing.
 * - Provides window print preview fallback when direct print server is unavailable.
 */
export const printPosReport = async (options: PrintReportOptions): Promise<boolean> => {
  const { html, markup, directPrint } = options;

  if (!directPrint) {
    return false;
  }

  // 1. Native Capacitor (Android/iOS Tablet/Mobile Hardware)
  if (Capacitor.isNativePlatform()) {
    await printEscPosMarkup(markup);
    return true;
  }

  // 2. Web / Desktop (QZ Tray / Network Printer)
  let defaultPrinter: string | undefined = undefined;
  try {
    const pData = JSON.parse(localStorage.getItem("posPrinterData") || "{}");
    defaultPrinter = pData?.billPrinter !== "No Printer" ? pData.billPrinter : undefined;
  } catch (e) {}

  try {
    await printHtmlReceipt(html, defaultPrinter);
    return true;
  } catch (err) {
    console.warn("[reportPrinter] QZ Tray print failed, opening print window fallback...", err);
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 300);
      return true;
    }
    throw err;
  }
};
