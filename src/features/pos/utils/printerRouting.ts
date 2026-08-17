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
    ? async (htmlOrMarkup: string, _printerName?: string) => {
        const { printEscPosMarkup } = await import("../services/qzService");
        await printEscPosMarkup(htmlOrMarkup);
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

    items.forEach(item => {
      let routed = false;
      
      // 1. Product Level
      if (productPrinter) {
        const prodRule = productPrinter.find((p: any) => p.productId === item.productId);
        if (prodRule && (prodRule.firstPrinter !== "No Printer" || prodRule.secondPrinter !== "No Printer")) {
          if (prodRule.firstPrinter !== "No Printer") routeItem(prodRule.firstPrinter, item);
          if (prodRule.secondPrinter !== "No Printer") routeItem(prodRule.secondPrinter, item);
          routed = true;
        }
      }
      
      // 2. Section Level
      if (!routed && selectedSectionId && sectionPrinter) {
        const secRule = sectionPrinter.find((s: any) => s.sectionId === selectedSectionId);
        if (secRule && (secRule.firstPrinter !== "No Printer" || secRule.secondPrinter !== "No Printer")) {
          if (secRule.firstPrinter !== "No Printer") routeItem(secRule.firstPrinter, item);
          if (secRule.secondPrinter !== "No Printer") routeItem(secRule.secondPrinter, item);
          routed = true;
        }
      }
      
      // 3. Category Level
      if (!routed && item.product?.categoryId && categoryPrinter) {
        const catRule = categoryPrinter.find((c: any) => c.categoryId === item.product?.categoryId);
        if (catRule && (catRule.firstPrinter !== "No Printer" || catRule.secondPrinter !== "No Printer")) {
          if (catRule.firstPrinter !== "No Printer") routeItem(catRule.firstPrinter, item);
          if (catRule.secondPrinter !== "No Printer") routeItem(catRule.secondPrinter, item);
          routed = true;
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

    // Dispatch routed jobs
    for (const [printerName, groupedItems] of printerGroups.entries()) {
      const kotOutput = await generateFn(groupedItems, { ...basePrintOptions, headerTitle: isUpdate ? "UPDATE KOT" : "KOT" });
      // On native, printerName is ignored (single native printer from localStorage)
      await printFn(kotOutput, isNative ? undefined : printerName)
        .catch((err: any) => console.error(`[Print Error: ${printerName}]`, err));
    }

    // Master KOT
    if (generalPrinter && generalPrinter.masterKOT && generalPrinter.masterKOT !== "No Printer") {
       const masterOutput = await generateFn(items, { ...basePrintOptions, headerTitle: isUpdate ? "UPDATE KOT" : "KOT", isMaster: true });
       await printFn(masterOutput, isNative ? undefined : generalPrinter.masterKOT)
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

  if (isNative) {
    const { printEscPosMarkup } = await import("../services/qzService");
    const { generateBillMarkup } = await import("./escPosGenerator");
    const markup = generateBillMarkup({
      cartDetails: items,
      data: { ...printData, isPackager: true },
      customHeaderLines
    });
    await printEscPosMarkup(markup);
    return;
  }

  // Desktop (QZ Tray)
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

  console.log(`[Packager Print] Routing to printer: "${targetPrinter || 'Default Printer'}" for ${items.length} items`);

  const html = await generateGuestPrintHtml(items, {
    ...printData,
    isPackager: true
  });

  await printHtmlReceipt(html, (targetPrinter && targetPrinter !== "No Printer") ? targetPrinter : undefined);
  console.log(`[Packager Print] Successfully sent to QZ Tray (${targetPrinter || 'Default Printer'})`);
};
