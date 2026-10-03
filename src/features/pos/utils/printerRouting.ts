import { Capacitor } from "@capacitor/core";
import type { PosCartItem } from "../types";

const isValidPrinterName = (name?: string | null): boolean => {
  if (!name || typeof name !== "string") return false;
  const s = name.trim();
  return s !== "" && s.toLowerCase() !== "no printer" && s.toLowerCase() !== "none";
};

const pickFirstValidPrinter = (...candidates: (string | null | undefined)[]): string => {
  for (const c of candidates) {
    if (isValidPrinterName(c)) {
      return c!.trim();
    }
  }
  return "";
};

export const executeKotRouting = async (
  items: PosCartItem[], 
  basePrintOptions: any, 
  _selectedSectionId: number,
  printerSettingsApi: any,
  printHtmlReceipt: any,
  generateKotHtml: any,
  isUpdate: boolean = false
) => {
  if (!items || items.length === 0) {
    console.warn("[Printer Routing] executeKotRouting called with empty items, skipping.");
    return;
  }

  const isNative = Capacitor.isNativePlatform();
  const { isKotArabicEnabled } = await import("./alternativeHelpers");
  const kotArabic = isKotArabicEnabled();

  console.log(`[Printer Routing] Starting executeKotRouting: items=${items.length}, isNative=${isNative}, kotArabic=${kotArabic}`);

  // Unified HTML graphic path on all platforms: identical layout, crisp fonts, proper Arabic/English alignment
  const printFn = printHtmlReceipt;
  const generateFn = generateKotHtml;

  let printerData: any = null;
  try {
    const res = await printerSettingsApi.getPrinterData();
    if (res.isSuccess) {
      printerData = res.data;
    }
  } catch (e) {
    console.error("[Printer Routing] Failed to fetch printer data", e);
  }

  // ── UNIFIED SINGLE-PRINTER KOT (NEVER SPLIT ORDERS) ─────────────────────────
  // All items in the order are printed together on a single KOT slip.
  const generalPrinter = printerData?.generalPrinter;
  const isIp = (v?: string | null): boolean => !!v && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v.trim());

  const singlePrinter = isNative
    ? pickFirstValidPrinter(
        generalPrinter?.androidKOTPrinter,
        generalPrinter?.kotPrinter,
        localStorage.getItem('cachedKotPrinter'),
        localStorage.getItem('cachedBillPrinterIp'),
        localStorage.getItem('printerIpAddress')
      ) || ''
    : pickFirstValidPrinter(
        !isIp(generalPrinter?.kotPrinter) ? generalPrinter?.kotPrinter : undefined,
        !isIp(localStorage.getItem('cachedKotPrinter')) ? localStorage.getItem('cachedKotPrinter') : undefined,
        !isIp(generalPrinter?.billPrinter) ? generalPrinter?.billPrinter : undefined,
        !isIp(localStorage.getItem('cachedBillPrinter')) ? localStorage.getItem('cachedBillPrinter') : undefined,
        generalPrinter?.kotPrinter,
        generalPrinter?.billPrinter
      ) || '';

  // Read POS Configuration toggles from cached posConfigs
  let isStandardKotEnabled = true;
  try {
    for (const key of ["posConfigs", "posConfig", "pos_configs", "pos_config"]) {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        const configsObj = parsed?.configs || parsed?.data?.configs || parsed?.data || parsed;
        const rawKotPrint = configsObj?.kotPrint ?? configsObj?.KotPrint;
        if (rawKotPrint !== undefined && rawKotPrint !== null) {
          const str = String(rawKotPrint).trim().toLowerCase();
          isStandardKotEnabled = str === "enable" || str === "true" || str === "1" || rawKotPrint === true;
        }
        break;
      }
    }
  } catch (e) {
    console.error("[Printer Routing] Error parsing cached posConfigs:", e);
  }

  const shouldDispatch = isStandardKotEnabled || Boolean(basePrintOptions?.forcedPrint) || isUpdate;
  console.log(`[Printer Routing] Unified Single-Print KOT: printer="${singlePrinter}", items=${items.length}, shouldDispatch=${shouldDispatch}`);

  if (shouldDispatch) {
    try {
      const headerTitle = basePrintOptions?.headerTitle || (isUpdate ? "UPDATE KOT" : "KOT");
      const kotOutput = await generateFn(items, { ...basePrintOptions, headerTitle });
      await printFn(kotOutput, singlePrinter);
      console.log(`[Printer Routing] Single KOT printed successfully to "${singlePrinter}" for all ${items.length} items.`);
    } catch (err: any) {
      console.error(`[Print Error: Single KOT]`, err);
      throw err;
    }
  } else {
    console.warn("[Printer Routing] Single KOT skipped: kotPrint is disabled in POS config and not forced.");
  }
};

export const executePackagerPrint = async (
  items: PosCartItem[],
  printData: any,
  printerSettingsApi: any,
  printHtmlReceipt: any,
  generateGuestPrintHtml: any,
  _customHeaderLines?: string[]
) => {
  let targetPrinter = pickFirstValidPrinter(
    localStorage.getItem("cachedPackagerPrinter")
  );

  if (!targetPrinter) {
    try {
      const res = await printerSettingsApi.getPrinterData();
      if (res?.isSuccess && isValidPrinterName(res.data?.generalPrinter?.packagerPrinter)) {
        targetPrinter = res.data.generalPrinter.packagerPrinter;
      }
    } catch (e) {
      console.error("[Packager Print] Failed to fetch printer data:", e);
    }
  }

  if (!targetPrinter) {
    targetPrinter = pickFirstValidPrinter(
      localStorage.getItem("cachedBillPrinter"),
      localStorage.getItem("cachedBillPrinterIp"),
      localStorage.getItem("printerIpAddress"),
      "Default"
    );
  }

  console.log(`[Packager Print] Routing to printer: "${targetPrinter || 'Default'}" for ${items.length} items`);

  const html = await generateGuestPrintHtml(items, {
    ...printData,
    isPackager: true
  });

  await printHtmlReceipt(html, targetPrinter);
  console.log(`[Packager Print] Successfully printed (${targetPrinter || 'Default'})`);
};
