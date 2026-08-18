import { useState, useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import qz from "qz-tray";
import { connectQZ } from "../../services/qzService";

const ESCPOSPlugin = registerPlugin<any>("ESCPOSPlugin");

export interface PrinterOption {
  label: string;
  value: string;
}

export const useAvailablePrinters = () => {
  const [printers, setPrinters] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const loadPrinters = async () => {
      const foundSet = new Set<string>();

      // 1. Load saved printers from general config in localStorage
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

      // 2. Fetch live system printers via QZ Tray (Desktop/Web) or Native plugin (Android/iOS)
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

    loadPrinters();
    return () => {
      isMounted = false;
    };
  }, []);

  const printerOptions: PrinterOption[] = [
    { label: "No Printer", value: "No Printer" },
    ...printers.map((p) => ({ label: p, value: p })),
  ];

  return { printers, printerOptions, loading };
};
