import React, { useState } from 'react';
import { Button, FormInput } from '../../../../../components/common';
import { printerSettingsApi } from '../../../services/printerSettingsApi';
import { useToast } from '../../../../../app/providers/useToast';

export const PrinterIpMapTab: React.FC = () => {
  const { showToast } = useToast();
  const [ipAddress, setIpAddress] = useState<string>(() => localStorage.getItem('printerIpAddress') || '');
  const [printerName, setPrinterName] = useState<string>(() => localStorage.getItem('printerMapName') || '');
  const [saving, setSaving] = useState<boolean>(false);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!printerName.trim()) {
      showToast('Please enter a printer name', 'error');
      return;
    }
    if (!ipAddress.trim()) {
      showToast('Please enter an IP address', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await printerSettingsApi.savePrinterIpMap({
        ipAddress: ipAddress.trim(),
        printerName: printerName.trim(),
      });

      localStorage.setItem('printerIpAddress', ipAddress.trim());
      localStorage.setItem('printerMapName', printerName.trim());
      
      const successMsg = res?.message || 'Printer IP Map saved successfully!';
      showToast(successMsg, 'success');
    } catch (err: any) {
      console.error('Failed to save Printer IP Map:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to save Printer IP Map';
      showToast(errMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex-1 overflow-auto space-y-4 pr-2">
        <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.2em] flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#49293e] rounded-full" />
              Printer IP Address Mapping
            </h3>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Map thermal printer names directly to network IP addresses for TCP/network direct printing.
          </p>

          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-2">
            <div className="flex flex-col gap-1 py-1 px-1">
              <FormInput
                label="Printer Name"
                placeholder="e.g. POS-80C or Kitchen Printer"
                value={printerName}
                onChange={(e) => setPrinterName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-1 py-1 px-1">
              <FormInput
                label="IP Address"
                placeholder="e.g. 192.168.1.100"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
              />
            </div>
          </form>
        </div>
      </div>

      <div className="pt-4 border-t border-slate-100 flex justify-start">
        <Button
          variant="primary"
          onClick={() => handleSave()}
          loading={saving}
          disabled={saving}
          className="px-16 uppercase tracking-widest font-black text-[10px]"
        >
          Save Printer IP Map
        </Button>
      </div>
    </div>
  );
};
