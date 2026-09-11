import React from 'react';
import { Eye, Printer } from 'lucide-react';
import { Button, FormInput, Loader } from '../../../../../../../components/common';
import type { DayClosedLog, ShiftClosedLog } from './types';
import { DayEndInfoBanner } from './DayEndInfoBanner';

interface ClosingLogReportViewProps {
  reportType: 'DAY_END' | 'SHIFT_END';
  asOnDate: string;
  onDateChange: (val: string) => void;
  loading: boolean;
  dayLogs: DayClosedLog[];
  shiftLogs: ShiftClosedLog[];
  selectedDayId: number | null;
  selectedShiftId: number | null;
  onSelectDayId: (id: number | null) => void;
  onSelectShiftId: (dayId: number, shiftId: number) => void;
  onPrint: (directPrint: boolean) => void;
  formatDate: (dateStr: string) => string;
  isDayEndChecked?: boolean;
  onDayEndCheckChange?: (checked: boolean) => void;
  dayStartEndInfo?: { startDate?: string; endDate?: string; dayStart?: string; dayEnd?: string } | null;
  dayStartEndLoading?: boolean;
}

export const ClosingLogReportView: React.FC<ClosingLogReportViewProps> = ({
  reportType,
  asOnDate,
  onDateChange,
  loading,
  dayLogs,
  shiftLogs,
  selectedDayId,
  selectedShiftId,
  onSelectDayId,
  onSelectShiftId,
  onPrint,
  formatDate,
  isDayEndChecked = false,
  onDayEndCheckChange,
  dayStartEndInfo = null,
  dayStartEndLoading = false,
}) => {
  const isDayEnd = reportType === 'DAY_END';

  return (
    <div className="flex flex-col gap-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200/80 gap-3">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            {isDayEnd ? 'Day End Closing Logs' : 'Shift End Closing Logs'}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            {isDayEnd
              ? 'Select a day end closing record to preview or print Z-Report'
              : 'Select a shift end closing record to preview or print shift report'}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {isDayEnd && onDayEndCheckChange && (
            <DayEndInfoBanner
              isDayEndChecked={isDayEndChecked}
              onDayEndCheckChange={onDayEndCheckChange}
              dayStartEndInfo={dayStartEndInfo}
              loading={dayStartEndLoading}
            />
          )}

          <div className="w-44">
            <FormInput
              type="date"
              label=""
              value={asOnDate}
              onChange={(e: any) => onDateChange(e.target.value)}
              inputClassName="h-[38px] text-xs font-bold"
              inputMode="none"
            />
          </div>
        </div>
      </div>

      {/* Log Data Table */}
      <div className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-xs">
        <div className="overflow-x-auto max-h-[360px] relative">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100 z-10 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200">Start Date</th>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200">End Date</th>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200">Status</th>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200">Day ID</th>
                {!isDayEnd && (
                  <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200">Shift ID</th>
                )}
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider border-r border-slate-200">Counter</th>
                <th className="py-2.5 px-4 text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">Branch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <Loader text="Loading closing logs..." />
                  </td>
                </tr>
              ) : isDayEnd ? (
                dayLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                      No Day End closing records found
                    </td>
                  </tr>
                ) : (
                  dayLogs.map((log) => {
                    const isSelected = selectedDayId === log.dayId;
                    return (
                      <tr
                        key={log.dayId}
                        onClick={() => onSelectDayId(log.dayId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#49293e]/10 hover:bg-[#49293e]/15' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{formatDate(log.startDate)}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{formatDate(log.endDate)}</td>
                        <td className="py-2.5 px-4 text-xs font-semibold border-r border-slate-100">
                          <span className={log.status === 'Opened' ? 'text-emerald-600' : 'text-slate-600'}>{log.status}</span>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{log.dayId}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{log.counter || '—'}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-600">{log.branch}</td>
                      </tr>
                    );
                  })
                )
              ) : (
                shiftLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                      No Shift End closing records found
                    </td>
                  </tr>
                ) : (
                  shiftLogs.map((log) => {
                    const isSelected = selectedDayId === log.dayId && selectedShiftId === log.shiftId;
                    return (
                      <tr
                        key={`${log.dayId}-${log.shiftId}`}
                        onClick={() => onSelectShiftId(log.dayId, log.shiftId)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#49293e]/10 hover:bg-[#49293e]/15' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{formatDate(log.startDate)}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{formatDate(log.endDate)}</td>
                        <td className="py-2.5 px-4 text-xs font-semibold border-r border-slate-100">
                          <span className={log.status === 'Opened' ? 'text-emerald-600' : 'text-slate-600'}>{log.status}</span>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{log.dayId}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{log.shiftId}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-600 border-r border-slate-100">{log.counter}</td>
                        <td className="py-2.5 px-4 text-xs text-slate-600">{log.branch}</td>
                      </tr>
                    );
                  })
                )
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100 mt-2 p-2 gap-2">
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
    </div>
  );
};
