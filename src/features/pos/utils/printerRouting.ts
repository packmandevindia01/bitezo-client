import { Capacitor } from "@capacitor/core";
import type { PosCartItem } from "../types";

export const executeKotRouting = async (
  items: PosCartItem[], 
  basePrintOptions: any, 
  selectedSectionId: number,
  printerSettingsApi: any,
  printHtmlReceipt: any,
  generateKotHtml: any,
  isUpdate: boolean = false
) => {
  const isNative = Capacitor.isNativePlatform();

  // On native, we use the fast ESC/POS path instead of html
  const printFn = isNative
    ? async (htmlOrMarkup: string, printerName?: string) => {
        const { printEscPosMarkup } = await import("../services/qzService");
        await printEscPosMarkup(htmlOrMarkup, printerName);
      }
    : printHtmlReceipt;

  // On native, generate ESC/POS markup instead of HTML
  const generateFn = isNative
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

  if (printerData) {
    const { generalPrinter, productPrinter, categoryPrinter, sectionPrinter } = printerData;
    
    const printerGroups = new Map<string, PosCartItem[]>();
    
    const routeItem = (printerName: string, item: PosCartItem) => {
      if (!printerName || printerName === "No Printer") return;
      if (!printerGroups.has(printerName)) {
        printerGroups.set(printerName, []);
      }
      printerGroups.get(printerName)!.push(item);
    };

    const routeRule = (firstPrinter: string, secondPrinter: string, item: PosCartItem): boolean => {
      const targetPrinters = new Set<string>();
      if (firstPrinter && firstPrinter !== "No Printer") targetPrinters.add(firstPrinter);
      if (secondPrinter && secondPrinter !== "No Printer") targetPrinters.add(secondPrinter);
      
      targetPrinters.forEach(printerName => routeItem(printerName, item));
      return targetPrinters.size > 0;
    };

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
      
      // 4. Fallback Level
      if (!routed && generalPrinter) {
        const fallback = generalPrinter.kotPrinter;
        if (fallback && fallback !== "No Printer") {
          routeItem(fallback, item);
        }
      }
    });

    // Read POS Configuration toggles from cached posConfigs
    let isStandardKotEnabled = true;
    let isMasterKotEnabled = false;
    try {
      const posConfigsStr = localStorage.getItem("posConfigs");
      if (posConfigsStr) {
        const parsed = JSON.parse(posConfigsStr);
        const configsObj = parsed?.configs || parsed;
        if (configsObj?.kotPrint !== undefined) {
          isStandardKotEnabled = configsObj.kotPrint === "Enable";
        }
        if (configsObj?.masterKot !== undefined) {
          isMasterKotEnabled = configsObj.masterKot === "Enable";
        }
      }
    } catch (e) {
      console.error("[Printer Routing] Error parsing cached posConfigs:", e);
    }

    // Dispatch standard KOT jobs if Standard KOT Print is enabled
    if (isStandardKotEnabled) {
      for (const [printerName, groupedItems] of printerGroups.entries()) {
        const kotOutput = await generateFn(groupedItems, { ...basePrintOptions, headerTitle: isUpdate ? "UPDATE KOT" : "KOT" });
        await printFn(kotOutput, printerName)
          .catch((err: any) => console.error(`[Print Error: ${printerName}]`, err));
      }
    }

    // Dispatch Master KOT if Master KOT is enabled in POS Configuration AND printer is assigned
    if (isMasterKotEnabled && generalPrinter && generalPrinter.masterKOT && generalPrinter.masterKOT !== "No Printer") {
       const masterOutput = await generateFn(items, { ...basePrintOptions, headerTitle: isUpdate ? "UPDATE KOT" : "KOT", isMaster: true });
       await printFn(masterOutput, generalPrinter.masterKOT)
         .catch((err: any) => console.error("[Print Error: Master]", err));
    }
    
  } else {
    // Legacy fallback if API fails
    const kotOutput = await generateFn(items, { ...basePrintOptions, headerTitle: isUpdate ? "UPDATE KOT" : "KOT" });
    await printFn(kotOutput, undefined)
      .catch((err: any) => console.error("[Print Error: Legacy]", err));
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

  // Desktop (QZ Tray) or Native lookup
  let targetPrinter = localStorage.getItem("cachedPackagerPrinter") || "";
  if (!targetPrinter || targetPrinter === "No Printer") {
    try {
      const res = await printerSettingsApi.getPrinterData();
      if (res?.isSuccess && res.data?.generalPrinter?.packagerPrinter && res.data.generalPrinter.packagerPrinter !== "No Printer") {
        targetPrinter = res.data.generalPrinter.packagerPrinter;
      }
    } catch (e) {
      console.error("[Packager Print] Failed to fetch printer data:", e);
    }
  }

  // Fallback to bill printer or default if packager printer not explicitly selected
  if (!targetPrinter || targetPrinter === "No Printer") {
    targetPrinter = localStorage.getItem("cachedBillPrinter") || "";
  }

  if (isNative) {
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

  console.log(`[Packager Print] Routing to printer: "${targetPrinter || 'Default Printer'}" for ${items.length} items`);

  const html = await generateGuestPrintHtml(items, {
    ...printData,
    isPackager: true
  });

  await printHtmlReceipt(html, (targetPrinter && targetPrinter !== "No Printer") ? targetPrinter : undefined);
  console.log(`[Packager Print] Successfully sent to QZ Tray (${targetPrinter || 'Default Printer'})`);
};
