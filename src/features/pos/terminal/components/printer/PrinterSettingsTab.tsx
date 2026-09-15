import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import qz from "qz-tray";
import { connectQZ } from '../../../services/qzService';
import { printerSettingsApi } from '../../../services/printerSettingsApi';
import { SelectInput, Button } from '../../../../../components/common';
import type { GeneralPrinterSettings, PrinterIpMapItem } from '../../../types';
import { AlertTriangle } from 'lucide-react';

interface PrinterSettingsTabProps {
  data: GeneralPrinterSettings;
  onSave: (data: GeneralPrinterSettings) => void;
  loading?: boolean;
}

export const PrinterSettingsTab: React.FC<PrinterSettingsTabProps> = ({ data, onSave, loading }) => {
  const [settings, setSettings] = useState<GeneralPrinterSettings>(data);
  const [livePrinters, setLivePrinters] = useState<string[]>([]);
  const [ipMapList, setIpMapList] = useState<PrinterIpMapItem[]>([]);
  const [loadingIpMap, setLoadingIpMap] = useState<boolean>(false);

  useEffect(() => {
    setSettings(data);

    // 1. Fetch live installed printers from QZ Tray for Desktop Web mode
    const loadQzPrinters = async () => {
      if (Capacitor.isNativePlatform()) return;
      try {
        await connectQZ();
        const foundPrinters = await qz.printers.find();
        setLivePrinters(foundPrinters);
      } catch (e) {
        console.error("[PrinterSettings] Failed to fetch live QZ printers:", e);
      }
    };
    loadQzPrinters();

    // 2. Fetch Printer IP Map data from backend
    const loadIpMaps = async () => {
      setLoadingIpMap(true);
      try {
        const res = await printerSettingsApi.getPrinterIpMap();
        if (res?.isSuccess && Array.isArray(res.data)) {
          setIpMapList(res.data);
        }
      } catch (e) {
        console.error("[PrinterSettings] Failed to fetch printer IP maps:", e);
      } finally {
        setLoadingIpMap(false);
      }
    };
    loadIpMaps();
  }, [data]);

  // Compute printer options based on androidPrint toggle
  const printerOptions = settings.androidPrint
    ? [
        { label: 'No Printer', value: 'No Printer' },
        ...ipMapList.map(item => ({
          label: `${item.printerName} (${item.ipAddress})`,
          value: item.printerName
        }))
      ]
    : [
        { label: 'No Printer', value: 'No Printer' },
        ...livePrinters.map(p => ({ label: p, value: p }))
      ];

  const countOptions = [
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
  ];

  const handleChange = (field: keyof GeneralPrinterSettings, value: string | number | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const Row = ({ label, field, options, isNumeric }: { label: string; field: keyof GeneralPrinterSettings; options: any[]; isNumeric?: boolean }) => (
    <div className="flex flex-col gap-1 py-1 px-1">
      <label className="text-[10px] font-black text-[#49293e]/50 uppercase tracking-[0.15em] ml-1">{label}</label>
      <div className="w-full">
        <SelectInput
          options={options}
          value={String(settings[field] ?? '')}
          onChange={(e) => handleChange(field, isNumeric ? parseInt(e.target.value) : e.target.value)}
          placeholder="Select"
          className="h-9"
        />
      </div>
    </div>
  );

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
            <Row label="Bill Printer" field="billPrinter" options={printerOptions} />
            <Row label="KOT Printer" field="kotPrinter" options={printerOptions} />
            <Row label="Packager Printer" field="packagerPrinter" options={printerOptions} />
            <Row label="Master KOT Printer" field="masterKOT" options={printerOptions} />
            <Row label="Master KOT Count" field="masterKOTCount" options={countOptions} isNumeric />
            <Row label="Bill Count" field="masterKOTBillCount" options={countOptions} isNumeric />
            
            {/* Android Print Toggle */}
            <div className="flex flex-col gap-1 py-1 px-1">
              <label className="text-[10px] font-black text-[#49293e]/50 uppercase tracking-[0.15em] ml-1">Android Printer</label>
              <div className="w-full h-9 flex items-center">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={!!settings.androidPrint}
                    onChange={(e) => handleChange('androidPrint', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#49293e] focus:ring-[#49293e] cursor-pointer"
                  />
                  <span>Enable Android Printer Option</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Warning banner when androidPrint is enabled but no printer IP mappings exist */}
        {settings.androidPrint && !loadingIpMap && ipMapList.length === 0 && (
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
            // Cache printer names so print jobs never need an API call per print
            localStorage.setItem('cachedBillPrinter', settings.billPrinter || '');
            localStorage.setItem('cachedKotPrinter', settings.kotPrinter || '');
            localStorage.setItem('cachedPackagerPrinter', settings.packagerPrinter || '');
            localStorage.setItem('cachedMasterKotPrinter', settings.masterKOT || '');
            onSave(settings);
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
