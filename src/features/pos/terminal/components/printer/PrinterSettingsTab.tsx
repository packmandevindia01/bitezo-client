import React, { useState, useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

const ESCPOSPlugin = registerPlugin<any>('ESCPOSPlugin');
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
  const [nativePrinterType, setNativePrinterType] = useState<string>('tcp');
  const [nativePrinterAddress, setNativePrinterAddress] = useState<string>('');
  const [discoveredPrinters, setDiscoveredPrinters] = useState<{name: string, address: string}[]>([]);

  useEffect(() => {
    setSettings(data);
    setPrintServerIp(localStorage.getItem('printServerIp') || '');
    setNativePrinterType(localStorage.getItem('nativePrinterType') || 'tcp');
    setNativePrinterAddress(localStorage.getItem('nativePrinterAddress') || '');
    
    // Fetch live installed printers from QZ Tray
    const loadPrinters = async () => {
      if (Capacitor.isNativePlatform()) return;
      
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

  const discoverBluetoothPrinters = async () => {
    try {
      const hasPerm = await ESCPOSPlugin.bluetoothHasPermissions();
      if (!hasPerm.result) {
        // Will prompt if missing, handled by plugin internally or listPrinters
      }
      const res = await ESCPOSPlugin.listPrinters({ type: 'bluetooth' });
      if (res && typeof res === 'object' && !('error' in res)) {
         const list = Object.keys(res).map(key => ({ name: key, address: res[key].address }));
         setDiscoveredPrinters(list);
         if (list.length > 0 && !nativePrinterAddress) {
            setNativePrinterAddress(list[0].address);
         }
      } else if (res && 'error' in res) {
         alert("Bluetooth Error: " + (res as any).error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to discover Bluetooth printers. Ensure Bluetooth is on.");
    }
  };

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



        {/* Native Tablet Print Section */}
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm mt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Native Direct Printing (Tablet/Mobile)
            </h3>
            {nativePrinterType === 'bluetooth' && Capacitor.isNativePlatform() && (
              <button 
                onClick={discoverBluetoothPrinters}
                className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold uppercase hover:bg-blue-100 transition-colors"
              >
                Discover Bluetooth Devices
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
            <div className="flex flex-col gap-1 py-1 px-1">
              <label className="text-[10px] font-black text-[#49293e]/50 uppercase tracking-[0.15em] ml-1">Connection Type</label>
              <SelectInput
                options={[
                  { label: 'Network / Wi-Fi (TCP)', value: 'tcp' },
                  { label: 'Bluetooth', value: 'bluetooth' }
                ]}
                value={nativePrinterType}
                onChange={(e) => {
                  setNativePrinterType(e.target.value);
                  setNativePrinterAddress(''); // Reset address when switching type
                }}
                className="h-9"
              />
            </div>
            
            <div className="flex flex-col gap-1 py-1 px-1">
              <label className="text-[10px] font-black text-[#49293e]/50 uppercase tracking-[0.15em] ml-1">
                {nativePrinterType === 'tcp' ? 'IP Address & Port' : 'Printer Address'}
              </label>
              {nativePrinterType === 'bluetooth' && discoveredPrinters.length > 0 ? (
                <SelectInput
                  options={discoveredPrinters.map(p => ({ label: p.name, value: p.address }))}
                  value={nativePrinterAddress}
                  onChange={(e) => setNativePrinterAddress(e.target.value)}
                  className="h-9"
                  placeholder="Select paired printer..."
                />
              ) : (
                <FormInput
                  placeholder={nativePrinterType === 'tcp' ? 'e.g. 192.168.1.100' : 'Select a printer or enter MAC address'}
                  value={nativePrinterAddress}
                  onChange={(e) => setNativePrinterAddress(e.target.value)}
                  className="h-9"
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-start">
        <Button 
          variant="primary" 
          onClick={() => {
            localStorage.setItem('printServerIp', printServerIp);
            localStorage.setItem('nativePrinterType', nativePrinterType);
            localStorage.setItem('nativePrinterAddress', nativePrinterAddress);
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
