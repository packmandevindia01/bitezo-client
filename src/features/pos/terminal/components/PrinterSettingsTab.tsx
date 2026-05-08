import React, { useState } from 'react';
import { SelectInput } from '../../../../components/common';

interface PrinterSettingsTabProps {
  onBack: () => void;
}

export const PrinterSettingsTab: React.FC<PrinterSettingsTabProps> = ({ onBack }) => {
  const [settings, setSettings] = useState({
    billPrinter: 'pos-80c',
    kotPrinter: 'pos-80c',
    packagerPrinter: 'pos-80c',
    masterKotPrinter: 'No Printer',
    masterKotPrintCount: '1',
    masterKotBillCount: '1',
    androidBillPrinter: 'delivery',
    androidKotPrinter: 'delivery',
    androidPackagerPrinter: 'No Printer',
  });

  const printerOptions = [
    { label: 'pos-80c', value: 'pos-80c' },
    { label: 'delivery', value: 'delivery' },
    { label: 'No Printer', value: 'No Printer' },
  ];

  const countOptions = [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
  ];

  const handleChange = (field: string, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const Row = ({ label, field, options }: { label: string; field: string; options: { label: string; value: string }[] }) => (
    <div className="flex items-center gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <label className="text-[12px] font-bold text-[#49293e]/70 w-52 shrink-0 uppercase tracking-wider">{label}</label>
      <div className="flex-1 max-w-xs">
        <div className="[&>div]:mb-0">
          <SelectInput
            options={options}
            value={(settings as any)[field]}
            onChange={(e) => handleChange(field, e.target.value)}
            placeholder="Select"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl">
        <Row label="Bill Printer Name" field="billPrinter" options={printerOptions} />
        <Row label="KOT Printer Name" field="kotPrinter" options={printerOptions} />
        <Row label="Packager Printer" field="packagerPrinter" options={printerOptions} />
        <Row label="Master KOT Printer" field="masterKotPrinter" options={printerOptions} />
        <Row label="Master KOT Print Count" field="masterKotPrintCount" options={countOptions} />
        <Row label="Master KOT Count(Bill)" field="masterKotBillCount" options={countOptions} />
      </div>

      <div className="border-2 border-slate-100 rounded-2xl p-6 relative bg-slate-50/30">
        <span className="absolute -top-3 left-6 bg-white px-3 py-0.5 border-2 border-slate-100 rounded-full text-[10px] font-black text-[#49293e] uppercase tracking-[0.2em]">
          Android Print
        </span>
        <div className="space-y-0.5 mt-2">
          <Row label="Bill Printer Name" field="androidBillPrinter" options={printerOptions} />
          <Row label="KOT Printer Name" field="androidKotPrinter" options={printerOptions} />
          <Row label="Packager Printer" field="androidPackagerPrinter" options={printerOptions} />
        </div>
      </div>
    </div>
  );
};
