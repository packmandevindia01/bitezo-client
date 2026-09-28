import { useState, useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { getAvailablePrinters } from "../../services/qzService";
import { printerSettingsApi } from "../../services/printerSettingsApi";
import type { PrinterIpMapItem } from "../../types";

const ESCPOSPlugin = registerPlugin<any>("ESCPOSPlugin");

const getCachedIpMap = (): PrinterIpMapItem[] => {
  try {
    const cached = localStorage.getItem('printerIpMap');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    const singleIp = localStorage.getItem('printerIpAddress');
    const singleName = localStorage.getItem('printerMapName') || 'POS Printer';
    if (singleIp) {
      return [{ printerName: singleName, ipAddress: singleIp }];
    }
  } catch (e) {
    // Ignore JSON error
  }
  return [];
};

export interface PrinterOption {
  label: string;
  value: string;
}

export interface UseAvailablePrintersProps {
  isAndroid?: boolean;
  onToggleAndroid?: (val: boolean) => void;
}

export const useAvailablePrinters = (props?: UseAvailablePrintersProps) => {
  const [printers, setPrinters] = useState<string[]>([]);
  const [ipMapList, setIpMapList] = useState<PrinterIpMapItem[]>(() => getCachedIpMap());
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingIpMap, setLoadingIpMap] = useState<boolean>(false);
  const [isAndroidPrinter, setIsAndroidPrinter] = useState<boolean>(() => {
    if (!Capacitor.isNativePlatform()) return false;
    if (props?.isAndroid !== undefined) return props.isAndroid;
    return localStorage.getItem("androidPrint") === "true";
  });

  // Keep in sync if prop changes from parent
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setIsAndroidPrinter(false);
      return;
    }
    if (props?.isAndroid !== undefined) {
      setIsAndroidPrinter(props.isAndroid);
    }
  }, [props?.isAndroid]);

  useEffect(() => {
    let isMounted = true;

    // 1. Fetch live desktop/native printers
    const loadPrinters = async () => {
      const foundSet = new Set<string>();

      // Load saved printers from general config in localStorage
      try {
        const savedGen = localStorage.getItem("generalPrinterSettings");
        if (savedGen) {
          const parsed = JSON.parse(savedGen);
          ["billPrinter", "kotPrinter", "counterPrinter", "kitchenPrinter", "barPrinter"].forEach(
            (key) => {
              if (parsed[key] && typeof parsed[key] === "string" && parsed[key] !== "No Printer") {
                foundSet.add(parsed[key]);
              }
            }
          );
        }
      } catch {
        // Ignore JSON parse errors
      }

      // Live system printers via PrintAgent (Desktop/Web) or Native plugin (Android/iOS)
      if (Capacitor.isNativePlatform()) {
        try {
          const res = await ESCPOSPlugin.listPrinters({ type: "bluetooth" });
          if (res && typeof res === "object" && !("error" in res)) {
            Object.keys(res).forEach((name) => foundSet.add(name));
          }
        } catch {
          // Plugin list fallback
        }
      } else {
        try {
          const livePrinters = await getAvailablePrinters();
          livePrinters.forEach((p) => foundSet.add(p));
        } catch (e) {
          console.warn("[useAvailablePrinters] PrintAgent live lookup fallback:", e);
        }
      }

      if (isMounted) {
        setPrinters(Array.from(foundSet));
        setLoading(false);
      }
    };

    // 2. Fetch IP Map printers from local storage and backend
    const loadIpMaps = async () => {
      const localCached = getCachedIpMap();
      if (isMounted && localCached.length > 0) {
        setIpMapList(localCached);
      }
      setLoadingIpMap(true);
      try {
        const res = await printerSettingsApi.getPrinterIpMap();
        if (isMounted && res?.isSuccess && Array.isArray(res.data) && res.data.length > 0) {
          setIpMapList(res.data);
          localStorage.setItem('printerIpMap', JSON.stringify(res.data));
        }
      } catch (e) {
        console.warn("[useAvailablePrinters] Failed to fetch printer IP maps from server, using local storage:", e);
      } finally {
        if (isMounted) setLoadingIpMap(false);
      }
    };

    loadPrinters();
    loadIpMaps();

    return () => {
      isMounted = false;
    };
  }, []);

  const toggleAndroidPrinter = (enabled: boolean) => {
    setIsAndroidPrinter(enabled);
    localStorage.setItem("androidPrint", String(enabled));
    if (props?.onToggleAndroid) {
      props.onToggleAndroid(enabled);
    }
  };

  const printerOptions: PrinterOption[] = isAndroidPrinter
    ? [
        { label: "No Printer", value: "No Printer" },
        ...ipMapList.map((item) => ({
          label: `${item.printerName || 'Printer'} (${item.ipAddress})`,
          value: item.printerName || item.ipAddress,
        })),
      ]
    : [
        { label: "No Printer", value: "No Printer" },
        ...printers.map((p) => ({ label: p, value: p })),
        ...ipMapList.filter(item => !printers.includes(item.printerName || item.ipAddress)).map((item) => ({
          label: `Network: ${item.printerName || 'Printer'} (${item.ipAddress})`,
          value: item.printerName || item.ipAddress,
        })),
      ];

  return {
    printers,
    printerOptions,
    ipMapList,
    loading,
    loadingIpMap,
    isAndroidPrinter,
    setIsAndroidPrinter,
    toggleAndroidPrinter,
  };
};
