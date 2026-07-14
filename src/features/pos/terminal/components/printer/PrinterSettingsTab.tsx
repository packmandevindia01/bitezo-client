import React, { useState, useEffect } from 'react';
import qz from "qz-tray";
import { connectQZ } from '../../../services/qzService';
import { SelectInput, Button, FormInput } from '../../../../../components/common';
import type { GeneralPrinterSettings } from '../../../types';

interface PrinterSettingsTabProps {
  data: GeneralPrinterSettings;
  onSave: (data: GeneralPrinterSettings) => void;
  loading?: boolean;
}

export const PrinterSettingsTab: React.FC<PrinterSettingsTabProps> = ({ data, onSave, loading }) => {
  const [settings, setSettings] = useState<GeneralPrinterSettings>(data);
  const [printServerIp, setPrintServerIp] = useState<string>('');
  const [livePrinters, setLivePrinters] = useState<string[]>([]);

  useEffect(() => {
    setSettings(data);
    setPrintServerIp(localStorage.getItem('printServerIp') || '');
    
    // Fetch live installed printers from QZ Tray
    const loadPrinters = async () => {
      try {
        await connectQZ();
        const foundPrinters = await qz.printers.find();
        setLivePrinters(foundPrinters);
      } catch (e) {
        console.error("[PrinterSettings] Failed to fetch live printers:", e);
      }
    };
    loadPrinters();
  }, [data]);

  const printerOptions = [
    { label: 'No Printer', value: 'No Printer' },
    ...livePrinters.map(p => ({ label: p, value: p }))
  ];

  const countOptions = [
    { label: '1', value: 1 },
    { label: '2', value: 2 },
    { label: '3', value: 3 },
  ];

  const handleChange = (field: keyof GeneralPrinterSettings, value: string | number) => {
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
          </div>
        </div>

        {/* Network Print Server Section */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <h3 className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            Network Print Server
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex flex-col gap-1 py-1 px-1">
              <label className="text-[10px] font-black text-[#49293e]/50 uppercase tracking-[0.15em] ml-1">Print Server IP Address</label>
              <div className="w-full">
                <FormInput
                  id="print-server-ip"
                  placeholder="e.g. 192.168.1.100 (Leave empty for localhost)"
                  value={printServerIp}
                  onChange={(e) => setPrintServerIp(e.target.value)}
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex items-center text-xs text-slate-500 italic px-1 pt-4">
              * Set this on tablets so they route print jobs to the laptop.
            </div>
          </div>
        </div>

        {/* Android Print Section */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <h3 className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
            Android Mobile Printing
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
            <Row label="Mobile Bill Printer" field="androidBillPrinter" options={printerOptions} />
            <Row label="Mobile KOT Printer" field="androidKOTPrinter" options={printerOptions} />
            <Row label="Mobile Packager" field="androidPackagerPrinter" options={printerOptions} />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-start">
        <Button 
          variant="primary" 
          onClick={() => {
            localStorage.setItem('printServerIp', printServerIp);
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
