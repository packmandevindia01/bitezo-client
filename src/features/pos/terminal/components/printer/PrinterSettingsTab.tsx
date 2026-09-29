import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { getAvailablePrinters } from '../../../services/qzService';
import { printerSettingsApi } from '../../../services/printerSettingsApi';
import { SelectInput, Button } from '../../../../../components/common';
import { useToast } from '../../../../../app/providers/useToast';
import type { GeneralPrinterSettings, PrinterIpMapItem } from '../../../types';
import { AlertTriangle } from 'lucide-react';

interface PrinterSettingsTabProps {
  data: GeneralPrinterSettings;
  onSave: (data: GeneralPrinterSettings) => void;
  loading?: boolean;
  onToggleAndroidPrinter?: (enabled: boolean) => void;
}

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

export const PrinterSettingsTab: React.FC<PrinterSettingsTabProps> = ({ 
  data, 
  onSave, 
  loading,
  onToggleAndroidPrinter,
}) => {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<GeneralPrinterSettings>(data);
  const [livePrinters, setLivePrinters] = useState<string[]>([]);
  const [ipMapList, setIpMapList] = useState<PrinterIpMapItem[]>(() => getCachedIpMap());
  const [loadingIpMap, setLoadingIpMap] = useState<boolean>(false);
  const [testingPrint, setTestingPrint] = useState<boolean>(false);

  useEffect(() => {
    setSettings(data);

    // 1. Fetch live installed printers from PrintAgent for Desktop Web mode
    const loadDesktopPrinters = async () => {
      if (Capacitor.isNativePlatform()) return;
      try {
        const foundPrinters = await getAvailablePrinters();
        setLivePrinters(foundPrinters);
        // On Desktop Web: If current billPrinter or kotPrinter is an IP address or 'No Printer',
        // auto-detect the thermal POS printer (e.g. POS-80C) from installed Windows printers
        const isIp = (v?: string) => !!v && /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v.trim());
        const thermalPos = foundPrinters.find(p => {
          const l = p.toLowerCase();
          return l.includes('pos') || l.includes('80') || l.includes('thermal') || l.includes('receipt') || l.includes('xprinter');
        });
        if (thermalPos) {
          setSettings(prev => {
            const needBill = !prev.billPrinter || prev.billPrinter === 'No Printer' || isIp(prev.billPrinter);
            const needKot = !prev.kotPrinter || prev.kotPrinter === 'No Printer' || isIp(prev.kotPrinter);
            if (needBill || needKot) {
              return {
                ...prev,
                billPrinter: needBill ? thermalPos : prev.billPrinter,
                kotPrinter: needKot ? thermalPos : prev.kotPrinter,
              };
            }
            return prev;
          });
        }
      } catch (e) {
        console.error("[PrinterSettings] Failed to fetch live PrintAgent printers:", e);
      }
    };
    loadDesktopPrinters();

    // 2. Hydrate from local storage and sync with backend
    const loadIpMaps = async () => {
      const localCached = getCachedIpMap();
      if (localCached.length > 0) {
        setIpMapList(localCached);
      }
      setLoadingIpMap(true);
      try {
        const res = await printerSettingsApi.getPrinterIpMap();
        if (res?.isSuccess && Array.isArray(res.data) && res.data.length > 0) {
          setIpMapList(res.data);
          localStorage.setItem('printerIpMap', JSON.stringify(res.data));
        }
      } catch (e) {
        console.warn("[PrinterSettings] Failed to fetch printer IP maps from server, using local storage:", e);
      } finally {
        setLoadingIpMap(false);
      }
    };
    loadIpMaps();
  }, [data]);

  // Helper to resolve IP address from printer name or direct IP
  const findIp = (nameOrIp?: string): string => {
    if (!nameOrIp || nameOrIp === 'No Printer') return '';
    const trimmed = nameOrIp.trim();
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) return trimmed;
    const match = ipMapList.find(m => 
      m.printerName.toLowerCase() === trimmed.toLowerCase() || 
      m.ipAddress.toLowerCase() === trimmed.toLowerCase()
    );
    return match ? match.ipAddress.trim() : '';
  };

  // Compute printer options: strictly Native mobile is Android mode, Desktop Web is Windows PrintAgent mode
  const isAndroidMode = Capacitor.isNativePlatform();

  const baseOptions: { label: string; value: string }[] = [{ label: 'No Printer', value: 'No Printer' }];

  if (!isAndroidMode) {
    // 1. Desktop Web Mode: Put local Windows printers from PrintAgent FIRST
    livePrinters.forEach(p => {
      if (!baseOptions.some(opt => opt.value.toLowerCase() === p.toLowerCase())) {
        baseOptions.push({ label: `${p} (Windows Printer)`, value: p });
      }
    });

    // 2. Also list Network IP mapped printers
    if (ipMapList.length > 0) {
      ipMapList.forEach(item => {
        if (item.printerName || item.ipAddress) {
          const val = item.printerName || item.ipAddress;
          if (!baseOptions.some(opt => opt.value === val)) {
            baseOptions.push({ label: `Network: ${val} (${item.ipAddress})`, value: val });
          }
        }
      });
    }
  } else {
    // Android / Tablet Mode: Show IP Mapped printers
    ipMapList.forEach(item => {
      if (item.printerName || item.ipAddress) {
        const displayName = item.printerName && item.ipAddress
          ? `${item.printerName} (${item.ipAddress})`
          : item.printerName || item.ipAddress;
        const val = item.printerName || item.ipAddress;
        if (!baseOptions.some(opt => opt.value === val)) {
          baseOptions.push({ label: displayName, value: val });
        }
        if (item.printerName && item.ipAddress && item.printerName !== item.ipAddress) {
          if (!baseOptions.some(opt => opt.value === item.ipAddress)) {
            baseOptions.push({ label: `${item.ipAddress} (${item.printerName})`, value: item.ipAddress });
          }
        }
      }
    });
  }

  // Ensures any saved value is ALWAYS present in the options list so HTML <select> never drops to "No Printer"
  const getOptionsForField = (fieldValue?: string) => {
    const opts = [...baseOptions];
    if (fieldValue && fieldValue !== 'No Printer' && !opts.some(o => o.value.toLowerCase() === fieldValue.toLowerCase())) {
      opts.push({ label: `${fieldValue} (Saved)`, value: fieldValue });
    }
    return opts;
  };

  const countOptions = [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
  ];

  const handleChange = (field: keyof GeneralPrinterSettings, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
    if (field === 'androidPrint') {
      const boolVal = !!value;
      localStorage.setItem('androidPrint', String(boolVal));
      onToggleAndroidPrinter?.(boolVal);
    }
  };

  const handleTestPrint = async () => {
    const billP = settings.billPrinter || 'No Printer';

    setTestingPrint(true);
    try {
      const { printHtmlReceipt } = await import('../../../services/qzService');
      const targetPrinter = (billP && billP !== 'No Printer') ? billP : undefined;
      
      const testHtml = `
        <div style="font-family: 'Cairo', 'Segoe UI', Tahoma, sans-serif; font-size: 13px; text-align: center; width: 280px; padding: 10px; margin: 0 auto; color: #000;">
          <h2 style="margin: 4px 0; font-size: 16px; font-weight: bold;">TEST PRINT SUCCESS</h2>
          <div style="border-top: 2px dashed #000; margin: 8px 0;"></div>
          <p style="margin: 4px 0; font-weight: bold;">Bitezo POS Cloud System</p>
          <div style="text-align: left; margin: 8px 0; font-size: 12px; line-height: 1.6;">
            <div>Terminal: #${localStorage.getItem("terminalId") || localStorage.getItem("systemCounterId") || "1"}</div>
            <div>Printer: ${targetPrinter || "Default Thermal Printer"}</div>
            <div>Mode: Direct Thermal Print</div>
            <div>Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
            <div>Status: Connected &amp; Verified OK!</div>
          </div>
          <div style="border-top: 2px dashed #000; margin: 8px 0;"></div>
          <p style="margin: 8px 0 0 0; font-size: 11px;">Bitezo Cloud-Based POS</p>
        </div>
      `;
      
      await printHtmlReceipt(testHtml, targetPrinter);
      showToast(`Test print sent to ${targetPrinter || "Default Printer"}!`, "success");
    } catch (err: any) {
      console.error("[TestPrint] Failed:", err);
      showToast(`Test print failed: ${err?.message || err}`, "error");
    } finally {
      setTestingPrint(false);
    }
  };

  const Row = ({ label, field, isNumeric }: { label: string; field: keyof GeneralPrinterSettings; isNumeric?: boolean }) => {
    const opts = isNumeric ? countOptions : getOptionsForField(String(settings[field] ?? ''));
    return (
      <div className="flex flex-col gap-1 py-1 px-1">
        <label className="text-[10px] font-black text-[#49293e]/50 uppercase tracking-[0.15em] ml-1">{label}</label>
        <div className="w-full">
          <SelectInput
            options={opts}
            value={String(settings[field] ?? '')}
            onChange={(e) => handleChange(field, isNumeric ? parseInt(e.target.value) : e.target.value)}
            placeholder="Select"
            className="h-9"
          />
        </div>
      </div>
    );
  };

  const billResolvedIp = findIp(settings.billPrinter);
  const kotResolvedIp = findIp(settings.kotPrinter);

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex-1 overflow-auto space-y-4 pr-2">
        {/* Main Settings Section */}
        <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
          <h3 className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#49293e] rounded-full" />
            General Printing
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
            <Row label="Bill Printer" field="billPrinter" />
            <Row label="KOT Printer" field="kotPrinter" />
            <Row label="Packager Printer" field="packagerPrinter" />
            <Row label="Master KOT Printer" field="masterKOT" />
            <Row label="Master KOT Count" field="masterKOTCount" isNumeric />
            <Row label="Bill Count" field="masterKOTBillCount" isNumeric />
            
            {/* Android Print Toggle (Native Mobile Tablet Only) */}
            {Capacitor.isNativePlatform() && (
              <div className="flex flex-col gap-1 py-1 px-1">
                <label className="text-[10px] font-black text-[#49293e]/50 uppercase tracking-[0.15em] ml-1">Android Printer</label>
                <div className="w-full h-9 flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                    <input
                      type="checkbox"
                      checked={isAndroidMode}
                      onChange={(e) => handleChange('androidPrint', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-[#49293e] focus:ring-[#49293e] cursor-pointer"
                    />
                    <span>Enable Android Printer Option</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Hardware Diagnostics & Status Banner */}
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.15em] flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Device Hardware Diagnostics & Status
            </h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
              {Capacitor.isNativePlatform() ? "Android Tablet (Native)" : "Desktop Web Mode"}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Terminal ID</div>
              <div className="font-mono font-bold text-slate-700 mt-0.5">
                #{localStorage.getItem("terminalId") || localStorage.getItem("systemCounterId") || "0"}
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                {isAndroidMode ? "Bill Printer IP" : "Bill Printer"}
              </div>
              <div className="font-mono font-bold text-[#49293e] mt-0.5 truncate" title={settings.billPrinter || "None"}>
                {isAndroidMode 
                  ? (billResolvedIp || (settings.billPrinter && settings.billPrinter !== 'No Printer' ? "IP Mapped" : "Not Mapped"))
                  : (settings.billPrinter || "Default")}
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">
                {isAndroidMode ? "KOT Printer IP" : "KOT Printer"}
              </div>
              <div className="font-mono font-bold text-[#49293e] mt-0.5 truncate" title={settings.kotPrinter || "None"}>
                {isAndroidMode 
                  ? (kotResolvedIp || (settings.kotPrinter && settings.kotPrinter !== 'No Printer' ? "IP Mapped" : "Not Mapped"))
                  : (settings.kotPrinter || "Default")}
              </div>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Printer Mode</div>
                <div className="font-bold text-emerald-600 mt-0.5">
                  {isAndroidMode ? "TCP / ESC-POS" : "PrintAgent (Active)"}
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleTestPrint}
                disabled={testingPrint}
                loading={testingPrint}
                className="text-[9px] font-black uppercase tracking-wider py-1 px-2.5 h-7"
              >
                Test Print
              </Button>
            </div>
          </div>
        </div>

        {/* Warning banner when androidPrint is enabled but no printer IP mappings exist */}
        {isAndroidMode && !loadingIpMap && ipMapList.length === 0 && (
          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200 flex items-start gap-3 text-amber-800">
            <AlertTriangle className="shrink-0 mt-0.5 text-amber-600" size={18} />
            <div className="text-xs">
              <p className="font-bold">No Printer IP Mappings Saved</p>
              <p className="text-amber-700 mt-0.5">
                Android Direct Printing is enabled, but no printer IP addresses are currently saved.
                Please navigate to the <strong>IP MAP</strong> tab to configure your thermal printer IP mappings.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-start">
        <Button 
          variant="primary" 
          onClick={() => {
            const billP = settings.billPrinter || 'No Printer';
            const kotP = settings.kotPrinter || 'No Printer';
            const packagerP = settings.packagerPrinter || 'No Printer';
            const masterP = settings.masterKOT || 'No Printer';

            // 1. Cache printer names so print jobs never need an API call per print
            localStorage.setItem('cachedBillPrinter', billP);
            localStorage.setItem('cachedKotPrinter', kotP);
            localStorage.setItem('cachedPackagerPrinter', packagerP);
            localStorage.setItem('cachedMasterKotPrinter', masterP);

            // 2. Resolve and cache direct IP addresses for each selected printer
            const billIp = findIp(billP);
            const kotIp = findIp(kotP);
            const packagerIp = findIp(packagerP);
            const masterKotIp = findIp(masterP);

            if (billIp) localStorage.setItem('cachedBillPrinterIp', billIp);
            if (kotIp) localStorage.setItem('cachedKotPrinterIp', kotIp);
            if (packagerIp) localStorage.setItem('cachedPackagerPrinterIp', packagerIp);
            if (masterKotIp) localStorage.setItem('cachedMasterKotPrinterIp', masterKotIp);

            const primaryIp = billIp || kotIp || ipMapList[0]?.ipAddress || '';
            if (primaryIp) localStorage.setItem('printerIpAddress', primaryIp);

            // 3. Prepare synchronized settings object for both desktop & android
            const syncedSettings: GeneralPrinterSettings = {
              ...settings,
              billPrinter: billP,
              kotPrinter: kotP,
              packagerPrinter: packagerP,
              masterKOT: masterP,
              androidBillPrinter: billP,
              androidKOTPrinter: kotP,
              androidPackagerPrinter: packagerP,
              androidPrint: !!(Capacitor.isNativePlatform() || settings.androidPrint)
            };

            // 4. Cache locally immediately for offline-first resilience
            localStorage.setItem('generalPrinterSettings', JSON.stringify(syncedSettings));

            // 5. Trigger onSave to persist to backend
            onSave(syncedSettings);
          }}
          loading={loading}
          className="px-16 uppercase tracking-widest font-black text-[10px]"
        >
          Save Hardware Settings
        </Button>
      </div>
    </div>
  );
};
