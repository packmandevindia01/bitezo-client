import React, { useState, useEffect } from 'react';
import { Button, FormInput } from '../../../../../components/common';
import { printerSettingsApi } from '../../../services/printerSettingsApi';
import { useToast } from '../../../../../app/providers/useToast';
import type { PrinterIpMapItem } from '../../../types';
import { Plus, RefreshCw, Printer, Trash2 } from 'lucide-react';

export const PrinterIpMapTab: React.FC = () => {
  const { showToast } = useToast();
  const [ipMapList, setIpMapList] = useState<PrinterIpMapItem[]>([]);
  const [loadingList, setLoadingList] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  const fetchIpMaps = async () => {
    setLoadingList(true);
    try {
      const res = await printerSettingsApi.getPrinterIpMap();
      if (res?.isSuccess && Array.isArray(res.data) && res.data.length > 0) {
        setIpMapList(res.data);
      } else {
        // Default with 1 empty row for immediate editing if list is empty
        setIpMapList([{ printerName: '', ipAddress: '' }]);
      }
    } catch (err) {
      console.error('Failed to load printer IP maps:', err);
      setIpMapList([{ printerName: '', ipAddress: '' }]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchIpMaps();
  }, []);

  const handleAddRow = () => {
    setIpMapList(prev => [...prev, { printerName: '', ipAddress: '' }]);
  };

  const handleRemoveRow = (index: number) => {
    setIpMapList(prev => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length > 0 ? updated : [{ printerName: '', ipAddress: '' }];
    });
  };

  const handleRowChange = (index: number, field: keyof PrinterIpMapItem, value: string) => {
    setIpMapList(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // Filter valid rows
    const validRows = ipMapList.filter(item => item.printerName.trim() !== '' || item.ipAddress.trim() !== '');
    if (validRows.length === 0) {
      showToast('Please enter at least one printer name and IP address', 'error');
      return;
    }

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      if (!row.printerName.trim()) {
        showToast(`Row #${i + 1}: Please enter a printer name`, 'error');
        return;
      }
      if (!row.ipAddress.trim()) {
        showToast(`Row #${i + 1}: Please enter an IP address for "${row.printerName}"`, 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await printerSettingsApi.savePrinterIpMap(validRows);
      showToast(res?.message || 'Printer IP mappings saved successfully!', 'success');
      fetchIpMaps();
    } catch (err: any) {
      console.error('Failed to save Printer IP Maps:', err);
      const errMsg = err?.response?.data?.message || err?.message || 'Failed to save Printer IP Maps';
      showToast(errMsg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex-1 overflow-auto space-y-6 pr-2">
        {/* Header & Controls Section */}
        <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black text-[#49293e] uppercase tracking-[0.2em] flex items-center gap-2">
              <Printer size={14} className="text-[#49293e]" />
              Printer IP Address Mappings (Multiple Printers)
            </h3>
            <button
              onClick={fetchIpMaps}
              disabled={loadingList}
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#49293e] transition-colors"
            >
              <RefreshCw size={14} className={loadingList ? 'animate-spin' : ''} />
              Refresh Mappings
            </button>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Map thermal printer names directly to network IP addresses for TCP network direct printing across multiple stations (e.g. Kitchen, Bar, Counter).
          </p>

          <form onSubmit={handleSaveAll} className="space-y-3 pt-2">
            <div className="overflow-x-auto rounded-xl border border-gray-100 bg-white">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-gray-100">
                    <th className="py-3 px-4 text-center w-12">#</th>
                    <th className="py-3 px-4 text-center">Printer Name</th>
                    <th className="py-3 px-4 text-center">Network IP Address</th>
                    <th className="py-3 px-4 text-center w-16">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loadingList ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        Loading mapped printers...
                      </td>
                    </tr>
                  ) : (
                    ipMapList.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4 text-center text-slate-400 font-mono align-middle">
                          {index + 1}
                        </td>
                        <td className="py-2 px-4 text-center">
                          <FormInput
                            placeholder="e.g. Kitchen Printer or POS-80C"
                            value={item.printerName}
                            onChange={(e) => handleRowChange(index, 'printerName', e.target.value)}
                            className="h-9 text-center"
                            autoFocus={index === 0 && !item.printerName}
                          />
                        </td>
                        <td className="py-2 px-4 text-center">
                          <FormInput
                            placeholder="e.g. 192.168.1.100"
                            value={item.ipAddress}
                            onChange={(e) => handleRowChange(index, 'ipAddress', e.target.value)}
                            className="h-9 text-center font-mono"
                          />
                        </td>
                        <td className="py-2 px-4 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(index)}
                            className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                            title="Remove Printer Row"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="pt-3 flex items-center justify-between gap-4">
              <Button
                type="button"
                variant="secondary"
                onClick={handleAddRow}
                icon={<Plus size={16} />}
                className="px-6 uppercase tracking-widest font-black text-[10px]"
              >
                Add Printer Row
              </Button>

              <Button
                type="submit"
                variant="primary"
                loading={saving}
                disabled={saving}
                className="px-10 uppercase tracking-widest font-black text-[10px]"
              >
                Save All Printer IP Mappings
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
