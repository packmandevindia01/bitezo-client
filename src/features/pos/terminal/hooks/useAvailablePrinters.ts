import { useState, useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import qz from "qz-tray";
import { connectQZ } from "../../services/qzService";
import { printerSettingsApi } from "../../services/printerSettingsApi";
import type { PrinterIpMapItem } from "../../types";

const ESCPOSPlugin = registerPlugin<any>("ESCPOSPlugin");

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
  const [ipMapList, setIpMapList] = useState<PrinterIpMapItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingIpMap, setLoadingIpMap] = useState<boolean>(false);
  const [isAndroidPrinter, setIsAndroidPrinter] = useState<boolean>(() => {
    if (props?.isAndroid !== undefined) return props.isAndroid;
    return localStorage.getItem("androidPrint") === "true";
  });

  // Keep in sync if prop changes from parent
  useEffect(() => {
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

      // Live system printers via QZ Tray (Desktop/Web) or Native plugin (Android/iOS)
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
          await connectQZ();
          const qzPrinters: string[] = await qz.printers.find();
          qzPrinters.forEach((p) => foundSet.add(p));
        } catch (e) {
          console.warn("[useAvailablePrinters] QZ Tray live lookup fallback:", e);
        }
      }

      if (isMounted) {
        setPrinters(Array.from(foundSet));
        setLoading(false);
      }
    };

    // 2. Fetch IP Map printers from backend
    const loadIpMaps = async () => {
      setLoadingIpMap(true);
      try {
        const res = await printerSettingsApi.getPrinterIpMap();
        if (isMounted && res?.isSuccess && Array.isArray(res.data)) {
          setIpMapList(res.data);
        }
      } catch (e) {
        console.error("[useAvailablePrinters] Failed to fetch printer IP maps:", e);
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
          label: `${item.printerName} (${item.ipAddress})`,
          value: item.printerName,
        })),
      ]
    : [
        { label: "No Printer", value: "No Printer" },
        ...printers.map((p) => ({ label: p, value: p })),
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
