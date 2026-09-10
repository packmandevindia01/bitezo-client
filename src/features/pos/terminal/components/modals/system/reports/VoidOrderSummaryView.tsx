import React from 'react';
import { Eye, Printer } from 'lucide-react';
import { Button, FormInput, Loader } from '../../../../../../../components/common';
import { formatCurrency } from '../../../../../../../utils/currency';
import type { VoidOrderSummaryItem } from './types';

interface VoidOrderSummaryViewProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (val: string) => void;
  onToDateChange: (val: string) => void;
  loading: boolean;
  logs: VoidOrderSummaryItem[];
  onPrint: (directPrint: boolean) => void;
  formatDate: (dateStr: string) => string;
}

export const VoidOrderSummaryView: React.FC<VoidOrderSummaryViewProps> = ({
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  loading,
  logs,
  onPrint,
  formatDate,
}) => {
  const totalVoidAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header Filter Section */}
      <div className="flex flex-wrap items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/80 gap-3">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Void Order Summary
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Log of voided customer orders, employee details & reason
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
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200 text-center">S.No</th>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200 text-center">Order No</th>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200">Order Type</th>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200">Date & Time</th>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200">Employee</th>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200">Reason</th>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Loader text="Loading void order summary..." />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    No void order records found
                  </td>
                </tr>
              ) : (
                logs.map((row) => (
                  <tr key={row.sNo} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 text-xs font-bold text-slate-600 border-r border-slate-100 text-center">{row.sNo}</td>
                    <td className="py-2.5 px-4 text-xs font-black text-[#49293e] border-r border-slate-100 text-center">#{row.orderNo}</td>
                    <td className="py-2.5 px-4 text-xs font-bold text-slate-700 border-r border-slate-100">{row.orderType}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{formatDate(row.date)}</td>
                    <td className="py-2.5 px-4 text-xs font-bold text-slate-700 border-r border-slate-100">{row.employee}</td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100 italic">"{row.reason}"</td>
                    <td className="py-2.5 px-4 text-xs font-black text-red-600 text-right">{formatCurrency(row.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Total */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between font-black text-xs text-[#49293e]">
          <span>TOTAL RECORDS: {logs.length}</span>
          <div className="flex items-center gap-2 text-sm">
            <span>TOTAL VOID AMOUNT:</span>
            <span className="text-red-600">{formatCurrency(totalVoidAmount)}</span>
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
