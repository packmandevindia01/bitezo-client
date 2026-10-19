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
  selectedSectionId?: number,
  printerSettingsApi?: any,
  printHtmlReceipt?: any,
  generateKotHtml?: any,
  isUpdate: boolean = false
) => {
  if (!items || items.length === 0) {
    console.warn("[Printer Routing] executeKotRouting called with empty items, skipping.");
    return;
  }

  const isNative = Capacitor.isNativePlatform();
  const { isKotArabicEnabled, isOtherKitchenItemEnabled } = await import("./alternativeHelpers");
  const kotArabic = isKotArabicEnabled();
  const otherKitchenItemActive = isOtherKitchenItemEnabled();

  console.log(`[Printer Routing] Starting executeKotRouting: items=${items.length}, isNative=${isNative}, kotArabic=${kotArabic}, otherKitchenItem=${otherKitchenItemActive}`);

  // Unified HTML graphic path on all platforms: identical layout, crisp fonts, proper Arabic/English alignment
  const printFn = printHtmlReceipt;
  const generateFn = generateKotHtml;

  let printerData: any = null;
  try {
    if (printerSettingsApi?.getPrinterData) {
      const res = await printerSettingsApi.getPrinterData();
      if (res?.isSuccess) {
        printerData = res.data;
      }
    }
  } catch (e) {
    console.error("[Printer Routing] Failed to fetch printer data", e);
  }

  const generalPrinter = printerData?.generalPrinter;
  const productPrinter = printerData?.productPrinter;
  const categoryPrinter = printerData?.categoryPrinter;
  const sectionPrinter = printerData?.sectionPrinter;
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

  // ── MULTI-STATION ROUTING ─────────────────────────────────────────────────
  const printerGroups = new Map<string, PosCartItem[]>();

  const routeItem = (printerName: string, item: PosCartItem) => {
    if (!isValidPrinterName(printerName)) return;
    const name = printerName.trim();
    if (!printerGroups.has(name)) {
      printerGroups.set(name, []);
    }
    printerGroups.get(name)!.push(item);
  };

  const routeRule = (firstPrinter?: string | null, secondPrinter?: string | null, item?: PosCartItem): boolean => {
    if (!item) return false;
    let routed = false;
    if (isValidPrinterName(firstPrinter)) {
      routeItem(firstPrinter!, item);
      routed = true;
    }
    if (isValidPrinterName(secondPrinter)) {
      routeItem(secondPrinter!, item);
      routed = true;
    }
    return routed;
  };

  items.forEach((item) => {
    let routed = false;

    // 1. Product Level
    if (Array.isArray(productPrinter) && productPrinter.length > 0) {
      const prodRule = productPrinter.find((p: any) => p.productId === item.productId);
      if (prodRule) {
        routed = routeRule(prodRule.firstPrinter, prodRule.secondPrinter, item);
      }
    }

    // 2. Section Level
    if (!routed && selectedSectionId && Array.isArray(sectionPrinter) && sectionPrinter.length > 0) {
      const secRule = sectionPrinter.find((s: any) => s.sectionId === selectedSectionId);
      if (secRule) {
        routed = routeRule(secRule.firstPrinter, secRule.secondPrinter, item);
      }
    }

    // 3. Category Level
    const itemCatId = item.product?.categoryId ?? (item as any).categoryId;
    if (!routed && itemCatId && Array.isArray(categoryPrinter) && categoryPrinter.length > 0) {
      const catRule = categoryPrinter.find((c: any) => c.categoryId === itemCatId);
      if (catRule) {
        routed = routeRule(catRule.firstPrinter, catRule.secondPrinter, item);
      }
    }

    // 4. Fallback Level
    if (!routed) {
      if (singlePrinter) {
        routeItem(singlePrinter, item);
        routed = true;
      }
    }
  });

  // Fallback: If no item was routed to any specific printer group, route all to singlePrinter or Default
  if (printerGroups.size === 0) {
    const fallbackName = singlePrinter || 'Default';
    printerGroups.set(fallbackName, items);
  }

  // Read POS Configuration toggles from cached posConfigs
  let isStandardKotEnabled = true;
  let isMasterKotEnabled = false;
  let isMasterKotBillEnabled = false;
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
        const rawMasterKotBill = configsObj?.masterKotBillPrinter ?? configsObj?.MasterKotBillPrinter;
        if (rawMasterKotBill !== undefined && rawMasterKotBill !== null) {
          const str = String(rawMasterKotBill).trim().toLowerCase();
          isMasterKotBillEnabled = str === "enable" || str === "true" || str === "1" || rawMasterKotBill === true;
        }
        break;
      }
    }
  } catch (e) {
    console.error("[Printer Routing] Error parsing cached posConfigs:", e);
  }

  // 1. Dispatch Standard KOT for each station printer
  const shouldDispatchStandard = isStandardKotEnabled || Boolean(basePrintOptions?.forcedPrint) || isUpdate;
  console.log(`[Printer Routing] Standard KOT: groups=${printerGroups.size}, items=${items.length}, shouldDispatch=${shouldDispatchStandard}, otherKitchenItem=${otherKitchenItemActive}`);

  if (shouldDispatchStandard) {
    for (const [printerName, groupedItems] of printerGroups.entries()) {
      try {
        const headerTitle = basePrintOptions?.headerTitle || (isUpdate ? "UPDATE KOT" : "KOT");

        // When multiple stations exist in the order AND otherKitchenItem is enabled,
        // attach items routed to other stations to this station's print payload.
        const otherKitchenItems = (otherKitchenItemActive && printerGroups.size > 1)
          ? items.filter((it) => !groupedItems.includes(it))
          : [];

        const kotOutput = await generateFn(groupedItems, {
          ...basePrintOptions,
          headerTitle,
          isMaster: false,
          otherKitchenItems,
          otherKitchenItemEnabled: otherKitchenItemActive,
        });

        await printFn(kotOutput, printerName);
        console.log(`[Printer Routing] Standard KOT printed successfully to "${printerName}" for ${groupedItems.length} items (otherItems=${otherKitchenItems.length}).`);
      } catch (err: any) {
        console.error(`[Print Error: Standard KOT - ${printerName}]`, err);
        throw err;
      }
    }
  } else {
    console.warn("[Printer Routing] Standard KOT skipped: kotPrint is disabled in POS config and not forced.");
  }

  // 2. Dispatch Master KOT
  if (isMasterKotEnabled || isMasterKotBillEnabled) {
    const masterTitle = basePrintOptions?.headerTitle && basePrintOptions.headerTitle !== "KOT"
      ? (isUpdate ? `UPDATE ${basePrintOptions.headerTitle}` : basePrintOptions.headerTitle)
      : (isUpdate ? "UPDATE MASTER KOT" : "MASTER KOT");

    let masterPrinter = isMasterKotEnabled
      ? (isNative
          ? pickFirstValidPrinter(
              generalPrinter?.masterKOT,
              localStorage.getItem('cachedMasterKotPrinter'),
              localStorage.getItem('cachedMasterKotPrinterIp'),
              !isMasterKotBillEnabled ? singlePrinter : undefined
            )
          : pickFirstValidPrinter(
              !isIp(generalPrinter?.masterKOT) ? generalPrinter?.masterKOT : undefined,
              !isIp(localStorage.getItem('cachedMasterKotPrinter')) ? localStorage.getItem('cachedMasterKotPrinter') : undefined,
              generalPrinter?.masterKOT,
              localStorage.getItem('cachedMasterKotPrinterIp'),
              !isMasterKotBillEnabled ? singlePrinter : undefined
            ))
      : '';

    const masterKotCount = Math.max(1, Number(generalPrinter?.masterKOTCount) || 1);

    if (isMasterKotEnabled && masterPrinter) {
      try {
        const masterOutput = await generateFn(items, {
          ...basePrintOptions,
          headerTitle: masterTitle,
          isMaster: true,
        });
        for (let i = 0; i < masterKotCount; i++) {
          await printFn(masterOutput, masterPrinter);
        }
        console.log(`[Printer Routing] Master KOT (${masterKotCount}x) printed successfully to "${masterPrinter}".`);
      } catch (err: any) {
        console.error(`[Print Error: Master KOT]`, err);
      }
    }

    if (isMasterKotBillEnabled) {
      const billPrinter = isNative
        ? pickFirstValidPrinter(
            generalPrinter?.billPrinter,
            localStorage.getItem('cachedBillPrinter'),
            localStorage.getItem('cachedBillPrinterIp'),
            singlePrinter
          )
        : pickFirstValidPrinter(
            !isIp(generalPrinter?.billPrinter) ? generalPrinter?.billPrinter : undefined,
            !isIp(localStorage.getItem('cachedBillPrinter')) ? localStorage.getItem('cachedBillPrinter') : undefined,
            generalPrinter?.billPrinter,
            localStorage.getItem('cachedBillPrinterIp'),
            singlePrinter
          );

      const masterKotBillCount = Math.max(1, Number(generalPrinter?.masterKOTBillCount) || 1);

      if (billPrinter && (!isMasterKotEnabled || billPrinter !== masterPrinter)) {
        try {
          const masterOutput = await generateFn(items, {
            ...basePrintOptions,
            headerTitle: masterTitle,
            isMaster: true,
          });
          for (let i = 0; i < masterKotBillCount; i++) {
            await printFn(masterOutput, billPrinter);
          }
          console.log(`[Printer Routing] Master KOT on Bill Printer (${masterKotBillCount}x) printed successfully to "${billPrinter}".`);
        } catch (err: any) {
          console.error(`[Print Error: Master KOT on Bill Printer]`, err);
        }
      }
    }
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
    showCompanyHeader: true,
    isPackager: true
  });

  await printHtmlReceipt(html, targetPrinter);
  console.log(`[Packager Print] Successfully printed (${targetPrinter || 'Default'})`);
};
