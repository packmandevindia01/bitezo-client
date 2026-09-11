import React from 'react';
import { Eye, Printer } from 'lucide-react';
import { Button, FormInput, Loader } from '../../../../../../../components/common';
import { formatCurrency } from '../../../../../../../utils/currency';
import type { VoidOrderSummaryItem } from './types';

interface VoidOrderSummaryViewProps {
  fromDate: string;
  toDate: string;
  fromTime?: string;
  toTime?: string;
  isDayWiseChecked?: boolean;
  isTimeWiseChecked?: boolean;
  onFromDateChange: (val: string) => void;
  onToDateChange: (val: string) => void;
  onFromTimeChange?: (val: string) => void;
  onToTimeChange?: (val: string) => void;
  onDayWiseCheckChange?: (checked: boolean) => void;
  onTimeWiseCheckChange?: (checked: boolean) => void;
  loading: boolean;
  logs: VoidOrderSummaryItem[];
  onPrint: (directPrint: boolean) => void;
  formatDate: (dateStr: string) => string;
}

export const VoidOrderSummaryView: React.FC<VoidOrderSummaryViewProps> = ({
  fromDate,
  toDate,
  fromTime = "00:00",
  toTime = "23:59",
  isDayWiseChecked = true,
  isTimeWiseChecked = false,
  onFromDateChange,
  onToDateChange,
  onFromTimeChange,
  onToTimeChange,
  onDayWiseCheckChange,
  onTimeWiseCheckChange,
  loading,
  logs,
  onPrint,
  formatDate,
}) => {
  const totalVoidAmount = logs.reduce((sum, item) => sum + (parseFloat(String(item.amount)) || 0), 0);

  return (
    <div className="flex flex-col gap-4">
      {/* Header Filter Section */}
      <div className="flex flex-wrap items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 gap-3">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            Void Order Summary
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            Log of voided customer orders, employee details & reason
          </p>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          {/* Search Mode Checkboxes */}
          <div className="flex flex-col justify-end min-w-0 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5 min-w-0 truncate">
              Filter Mode
            </span>
            <div className="flex items-center gap-2.5 bg-white h-9 px-3 rounded-md border border-gray-300 shadow-2xs select-none">
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 hover:text-[#49293e] transition-colors">
                <input
                  type="checkbox"
                  checked={isDayWiseChecked}
                  onChange={(e) => onDayWiseCheckChange?.(e.target.checked)}
                  className="w-4 h-4 text-[#49293e] rounded border-gray-300 focus:ring-[#49293e] cursor-pointer"
                />
                <span className="whitespace-nowrap">Day Wise</span>
              </label>
              <div className="h-3.5 w-px bg-slate-200" />
              <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-700 hover:text-[#49293e] transition-colors">
                <input
                  type="checkbox"
                  checked={isTimeWiseChecked}
                  onChange={(e) => onTimeWiseCheckChange?.(e.target.checked)}
                  className="w-4 h-4 text-[#49293e] rounded border-gray-300 focus:ring-[#49293e] cursor-pointer"
                />
                <span className="whitespace-nowrap">Time Wise</span>
              </label>
            </div>
          </div>

          <div className="flex items-end gap-2 flex-wrap">
            <div className="w-32">
              <FormInput
                type="date"
                label="From Date"
                value={fromDate}
                onChange={(e: any) => onFromDateChange(e.target.value)}
                disabled={!isDayWiseChecked}
                inputClassName={`h-[36px] text-xs font-bold ${!isDayWiseChecked ? 'cursor-not-allowed opacity-60' : ''}`}
                inputMode="none"
              />
            </div>
            <div className="w-28">
              <FormInput
                type="time"
                label="Start Time"
                value={!isTimeWiseChecked ? "00:00" : fromTime}
                onChange={(e: any) => onFromTimeChange?.(e.target.value)}
                disabled={!isTimeWiseChecked}
                inputClassName={`h-[36px] text-xs font-bold ${!isTimeWiseChecked ? 'cursor-not-allowed opacity-60' : ''}`}
                inputMode="none"
              />
            </div>
            <div className="w-32">
              <FormInput
                type="date"
                label="To Date"
                value={toDate}
                onChange={(e: any) => onToDateChange(e.target.value)}
                disabled={!isDayWiseChecked}
                inputClassName={`h-[36px] text-xs font-bold ${!isDayWiseChecked ? 'cursor-not-allowed opacity-60' : ''}`}
                inputMode="none"
              />
            </div>
            <div className="w-28">
              <FormInput
                type="time"
                label="End Time"
                value={!isTimeWiseChecked ? "23:59" : toTime}
                onChange={(e: any) => onToTimeChange?.(e.target.value)}
                disabled={!isTimeWiseChecked}
                inputClassName={`h-[36px] text-xs font-bold ${!isTimeWiseChecked ? 'cursor-not-allowed opacity-60' : ''}`}
                inputMode="none"
              />
            </div>
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
