import React from 'react';
import { Eye, Printer } from 'lucide-react';
import { Button, FormInput, Loader } from '../../../../../../../components/common';
import { formatCurrency } from '../../../../../../../utils/currency';
import type { DriverSummaryItem } from './types';

interface DriverSummaryViewProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (val: string) => void;
  onToDateChange: (val: string) => void;
  loading: boolean;
  logs: DriverSummaryItem[];
  onPrint: (directPrint: boolean) => void;
  formatDate: (dateStr: string) => string;
}

export const DriverSummaryView: React.FC<DriverSummaryViewProps> = ({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  loading,
  logs,
  onPrint,
}) => {
  const totalAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header Filter Section */}
      <div className="flex flex-wrap items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/80 gap-3">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Driver Summary Report
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Log of delivery driver sales totals & order amounts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-36">
            <FormInput
              type="date"
              label="From Date"
              value={fromDate}
              onChange={(e: any) => onFromDateChange(e.target.value)}
              inputClassName="h-[38px] text-xs font-bold"
              inputMode="none"
            />
          </div>
          <div className="w-36">
            <FormInput
              type="date"
              label="To Date"
              value={toDate}
              onChange={(e: any) => onToDateChange(e.target.value)}
              inputClassName="h-[38px] text-xs font-bold"
              inputMode="none"
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs min-h-[300px] flex flex-col justify-between">
        <div className="overflow-x-auto max-h-[360px] relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200 text-center w-16">S.No</th>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200">Driver / Waiter Name</th>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center">
                    <Loader text="Loading driver summary..." />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-16 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    No driver summary records found
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.sNo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-xs font-bold text-slate-600 border-r border-slate-100 text-center">{row.sNo}</td>
                    <td className="py-2.5 px-4 text-xs font-black text-cyan-800 border-r border-slate-100">{row.driver || '—'}</td>
                    <td className="py-2.5 px-4 text-xs font-black text-cyan-700 text-right">{formatCurrency(row.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Total */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between font-black text-xs text-[#49293e]">
          <span>TOTAL DRIVERS: {logs.length}</span>
          <div className="flex items-center gap-2 text-sm">
            <span>TOTAL AMOUNT:</span>
            <span className="text-cyan-700">{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-end pt-2 border-t border-slate-100 mt-1 gap-2">
        <Button
          variant="secondary"
          className="flex items-center gap-2 h-10"
          onClick={() => onPrint(false)}
        >
          <Eye className="w-4 h-4" />
          Preview
        </Button>
        <Button
          className="flex items-center gap-2 h-10 bg-[#49293e] hover:bg-[#381f30] text-white"
          onClick={() => onPrint(true)}
        >
          <Printer className="w-4 h-4" />
          Print
        </Button>
      </div>
    </div>
  );
};
