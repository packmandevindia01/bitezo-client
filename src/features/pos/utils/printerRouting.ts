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
  selectedSectionId: number,
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

  // When on mobile without Arabic: use ultra-fast ESC/POS text markup.
  // When Arabic IS present (or on desktop): use HTML raster printing via printHtmlReceipt.
  const useNativeEscPos = isNative && !kotArabic;
  console.log(`[Printer Routing] Starting executeKotRouting: items=${items.length}, isNative=${isNative}, kotArabic=${kotArabic}, useNativeEscPos=${useNativeEscPos}`);

  const printFn = useNativeEscPos
    ? async (htmlOrMarkup: string, printerName?: string) => {
        const { printEscPosMarkup } = await import("../services/qzService");
        await printEscPosMarkup(htmlOrMarkup, printerName);
      }
    : printHtmlReceipt;

  const generateFn = useNativeEscPos
    ? async (kotItems: PosCartItem[], data: any) => {
        const { generateKotMarkup } = await import("./escPosGenerator");
        return generateKotMarkup({ cartDetails: kotItems, data });
      }
    : generateKotHtml;

  let printerData: any = null;
  try {
    const res = await printerSettingsApi.getPrinterData();
    if (res.isSuccess) {
      printerData = res.data;
    }
  } catch (e) {
    console.error("[Printer Routing] Failed to fetch printer data", e);
  }

  // ── ANDROID SINGLE-PRINTER FAST PATH ─────────────────────────────────────────
  // On Android there is ONE physical thermal printer. Running the full multi-station routing
  // logic creates separate printerGroups (one per category/product rule), causing multiple
  // separate print jobs to be dispatched — one KOT print per group for the same order.
  // Fix: On Android, skip routing and send ALL items in a single KOT print job.
  if (isNative) {
    const generalPrinter = printerData?.generalPrinter;
    const singlePrinter = pickFirstValidPrinter(
      generalPrinter?.androidKOTPrinter,
      generalPrinter?.kotPrinter,
      localStorage.getItem('cachedKotPrinter'),
      localStorage.getItem('cachedBillPrinterIp'),
      localStorage.getItem('printerIpAddress'),
    ) || 'Default';

    let isStandardKotEnabled = true;
    let isMasterKotEnabled = false;
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
          const rawMasterKot = configsObj?.masterKot ?? configsObj?.MasterKot;
          if (rawMasterKot !== undefined && rawMasterKot !== null) {
            const str = String(rawMasterKot).trim().toLowerCase();
            isMasterKotEnabled = str === "enable" || str === "true" || str === "1" || rawMasterKot === true;
          }
          break;
        }
      }
    } catch (e) {
      console.error("[Printer Routing] Error parsing cached posConfigs:", e);
    }

    const shouldDispatch = isStandardKotEnabled || Boolean(basePrintOptions?.forcedPrint) || isUpdate;
    console.log(`[Printer Routing] Android Single-Print KOT: printer="${singlePrinter}", items=${items.length}, shouldDispatch=${shouldDispatch}`);

    if (shouldDispatch) {
      try {
        const kotOutput = await generateFn(items, { ...basePrintOptions, headerTitle: isUpdate ? "UPDATE KOT" : "KOT" });
        await printFn(kotOutput, singlePrinter);
        console.log(`[Printer Routing] Android KOT printed successfully to "${singlePrinter}"`);
      } catch (err: any) {
        console.error(`[Print Error: Android KOT]`, err);
        throw err;
      }
    } else {
      console.warn("[Printer Routing] Android KOT skipped: kotPrint is disabled in POS config and not forced.");
    }

    // Android Master KOT (separate slip)
    const masterPrinter = pickFirstValidPrinter(generalPrinter?.masterKOT, localStorage.getItem('cachedMasterKotPrinter'));
    if (isMasterKotEnabled && masterPrinter) {
      try {
        const masterOutput = await generateFn(items, { ...basePrintOptions, headerTitle: isUpdate ? "UPDATE KOT" : "KOT", isMaster: true });
        await printFn(masterOutput, masterPrinter);
        console.log(`[Printer Routing] Android Master KOT printed to "${masterPrinter}"`);
      } catch (err: any) {
        console.error("[Print Error: Android Master KOT]", err);
      }
    }
    return;
  }

  // ── DESKTOP WEB: MULTI-STATION ROUTING ──────────────────────────────────────

  const printerGroups = new Map<string, PosCartItem[]>();

  const routeItem = (printerName: string, item: PosCartItem) => {
    if (!isValidPrinterName(printerName)) return;
    const name = printerName.trim();
    if (!printerGroups.has(name)) {
      printerGroups.set(name, []);
    }
    printerGroups.get(name)!.push(item);
  };

  const routeRule = (firstPrinter: string, secondPrinter: string, item: PosCartItem): boolean => {
    let routed = false;
    if (isValidPrinterName(firstPrinter)) {
      routeItem(firstPrinter, item);
      routed = true;
    }
    if (isValidPrinterName(secondPrinter)) {
      routeItem(secondPrinter, item);
      routed = true;
    }
    return routed;
  };

  const generalPrinter = printerData?.generalPrinter;
  const productPrinter = printerData?.productPrinter;
  const categoryPrinter = printerData?.categoryPrinter;
  const sectionPrinter = printerData?.sectionPrinter;

  items.forEach(item => {
    let routed = false;
    
    // 1. Product Level
    if (productPrinter) {
      const prodRule = productPrinter.find((p: any) => p.productId === item.productId);
      if (prodRule) {
        routed = routeRule(prodRule.firstPrinter, prodRule.secondPrinter, item);
      }
    }
    
    // 2. Section Level
    if (!routed && selectedSectionId && sectionPrinter) {
      const secRule = sectionPrinter.find((s: any) => s.sectionId === selectedSectionId);
      if (secRule) {
        routed = routeRule(secRule.firstPrinter, secRule.secondPrinter, item);
      }
    }
    
    // 3. Category Level
    if (!routed && item.product?.categoryId && categoryPrinter) {
      const catRule = categoryPrinter.find((c: any) => c.categoryId === item.product?.categoryId);
      if (catRule) {
        routed = routeRule(catRule.firstPrinter, catRule.secondPrinter, item);
      }
    }
    
    // 4. Fallback Level: Safely find the first valid configured printer
    if (!routed) {
      const isIp = (v?: string | null): boolean => !!v && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v.trim());
      const fallback = isNative
        ? pickFirstValidPrinter(
            generalPrinter?.androidKOTPrinter,
            generalPrinter?.kotPrinter,
            localStorage.getItem('cachedKotPrinter'),
            localStorage.getItem('cachedBillPrinterIp'),
            localStorage.getItem('printerIpAddress')
          )
        : pickFirstValidPrinter(
            !isIp(generalPrinter?.kotPrinter) ? generalPrinter?.kotPrinter : undefined,
            !isIp(localStorage.getItem('cachedKotPrinter')) ? localStorage.getItem('cachedKotPrinter') : undefined,
            !isIp(generalPrinter?.billPrinter) ? generalPrinter?.billPrinter : undefined,
            !isIp(localStorage.getItem('cachedBillPrinter')) ? localStorage.getItem('cachedBillPrinter') : undefined,
            generalPrinter?.kotPrinter,
            generalPrinter?.billPrinter
          );
      if (fallback) {
        routeItem(fallback, item);
        routed = true;
      }
    }
  });

  // Safe Fallback: If items weren't routed to any printer, route to the default available printer
  if (printerGroups.size === 0) {
    const isIp = (v?: string | null): boolean => !!v && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v.trim());
    const fallbackPrinter = isNative
      ? pickFirstValidPrinter(
          generalPrinter?.androidKOTPrinter,
          generalPrinter?.kotPrinter,
          localStorage.getItem('cachedKotPrinter'),
          localStorage.getItem('cachedBillPrinterIp'),
          localStorage.getItem('printerIpAddress'),
          'Default'
        )
      : pickFirstValidPrinter(
          !isIp(generalPrinter?.kotPrinter) ? generalPrinter?.kotPrinter : undefined,
          !isIp(localStorage.getItem('cachedKotPrinter')) ? localStorage.getItem('cachedKotPrinter') : undefined,
          !isIp(generalPrinter?.billPrinter) ? generalPrinter?.billPrinter : undefined,
          !isIp(localStorage.getItem('cachedBillPrinter')) ? localStorage.getItem('cachedBillPrinter') : undefined,
          'Default'
        );
    printerGroups.set(fallbackPrinter || 'Default', items);
  }

  // Read POS Configuration toggles from cached posConfigs
  let isStandardKotEnabled = true;
  let isMasterKotEnabled = false;
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
        const rawMasterKot = configsObj?.masterKot ?? configsObj?.MasterKot;
        if (rawMasterKot !== undefined && rawMasterKot !== null) {
          const str = String(rawMasterKot).trim().toLowerCase();
          isMasterKotEnabled = str === "enable" || str === "true" || str === "1" || rawMasterKot === true;
        }
        break;
      }
    }
  } catch (e) {
    console.error("[Printer Routing] Error parsing cached posConfigs:", e);
  }

  const shouldDispatchStandard = isStandardKotEnabled || Boolean(basePrintOptions?.forcedPrint) || isUpdate;
  console.log(`[Printer Routing] Dispatching KOT: isStandardKotEnabled=${isStandardKotEnabled}, forced=${basePrintOptions?.forcedPrint}, isUpdate=${isUpdate}, groups=${printerGroups.size}`);

  // Dispatch standard KOT jobs if enabled or explicitly requested
  if (shouldDispatchStandard) {
    for (const [printerName, groupedItems] of printerGroups.entries()) {
      try {
        console.log(`[Printer Routing] Generating & Printing KOT for printer "${printerName}" with ${groupedItems.length} items`);
        const kotOutput = await generateFn(groupedItems, { ...basePrintOptions, headerTitle: isUpdate ? "UPDATE KOT" : "KOT" });
        await printFn(kotOutput, printerName);
        console.log(`[Printer Routing] KOT printed successfully to "${printerName}"`);
      } catch (err: any) {
        console.error(`[Print Error: ${printerName}]`, err);
      }
    }
  } else {
    console.warn("[Printer Routing] Standard KOT skipped: kotPrint is disabled in POS config and not forced.");
  }

  // Dispatch Master KOT if Master KOT is enabled in POS Configuration AND printer is assigned
  const masterPrinter = pickFirstValidPrinter(generalPrinter?.masterKOT, localStorage.getItem('cachedMasterKotPrinter'));
  if (isMasterKotEnabled && masterPrinter) {
    try {
      console.log(`[Printer Routing] Generating Master KOT for "${masterPrinter}"`);
      const masterOutput = await generateFn(items, { ...basePrintOptions, headerTitle: isUpdate ? "UPDATE KOT" : "KOT", isMaster: true });
      await printFn(masterOutput, masterPrinter);
      console.log(`[Printer Routing] Master KOT printed successfully to "${masterPrinter}"`);
    } catch (err: any) {
      console.error("[Print Error: Master]", err);
    }
  }
};

export const executePackagerPrint = async (
  items: PosCartItem[],
  printData: any,
  printerSettingsApi: any,
  printHtmlReceipt: any,
  generateGuestPrintHtml: any,
  customHeaderLines?: string[]
) => {
  const isNative = Capacitor.isNativePlatform();

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

  const { isBillArabicEnabled } = await import("./alternativeHelpers");
  const billArabic = isBillArabicEnabled();

  if (isNative && !billArabic) {
    const { printEscPosMarkup } = await import("../services/qzService");
    const { generateBillMarkup } = await import("./escPosGenerator");
    const markup = generateBillMarkup({
      cartDetails: items,
      data: { ...printData, isPackager: true },
      customHeaderLines
    });
    await printEscPosMarkup(markup, targetPrinter);
    return;
  }

  console.log(`[Packager Print] Routing to printer: "${targetPrinter || 'Default'}" for ${items.length} items`);

  const html = await generateGuestPrintHtml(items, {
    ...printData,
    isPackager: true
  });

  await printHtmlReceipt(html, targetPrinter);
  console.log(`[Packager Print] Successfully printed (${targetPrinter || 'Default'})`);
};
