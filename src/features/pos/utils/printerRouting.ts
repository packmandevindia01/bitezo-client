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
      const kotHtml = generateKotHtml(groupedItems, { ...basePrintOptions, headerTitle: isUpdate ? "UPDATE KOT" : "KOT" });
      await printHtmlReceipt(kotHtml, printerName).catch((err: any) => console.error(`[Print Error: ${printerName}]`, err));
    }

    // Master KOT
    if (generalPrinter && generalPrinter.masterKOT && generalPrinter.masterKOT !== "No Printer") {
       const masterHtml = generateKotHtml(items, { ...basePrintOptions, headerTitle: isUpdate ? "UPDATE KOT" : "KOT", isMaster: true });
       await printHtmlReceipt(masterHtml, generalPrinter.masterKOT).catch((err: any) => console.error("[Print Error: Master]", err));
    }
    
  } else {
    // Legacy fallback if API fails
    const kotHtml = generateKotHtml(items, { ...basePrintOptions, headerTitle: isUpdate ? "UPDATE KOT" : "KOT" });
    await printHtmlReceipt(kotHtml, undefined).catch((err: any) => console.error("[Print Error: Legacy]", err));
  }
};
