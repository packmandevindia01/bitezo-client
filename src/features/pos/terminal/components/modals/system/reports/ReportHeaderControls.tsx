import React from 'react';
import { FormInput } from '../../../../../../../components/common';
import { Loader2 } from 'lucide-react';

interface ReportHeaderControlsProps {
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
  fromDate: string;
  toDate: string;
  onFromDateChange: (val: string) => void;
  onToDateChange: (val: string) => void;
  isDayEndChecked: boolean;
  onDayEndCheckChange: (checked: boolean) => void;
  dayStartEndInfo: { startDate?: string; endDate?: string; dayStart?: string; dayEnd?: string } | null;
  dayStartEndLoading: boolean;
}

export const formatDayDateTime = (dateStr?: string): string => {
  if (!dateStr) return '—';
  if (dateStr.startsWith('1900-01-01') || dateStr.includes('1900-01-01')) {
    const now = new Date();
    return now.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const ReportHeaderControls: React.FC<ReportHeaderControlsProps> = ({
  title,
  subtitle,
  icon,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  isDayEndChecked,
  onDayEndCheckChange,
  dayStartEndInfo,
  dayStartEndLoading,
}) => {
  const startDateRaw = dayStartEndInfo?.startDate || dayStartEndInfo?.dayStart;
  let endDateRaw = dayStartEndInfo?.endDate || dayStartEndInfo?.dayEnd;

  if (isDayEndChecked && (!endDateRaw || endDateRaw.startsWith('1900-01-01'))) {
    endDateRaw = new Date().toISOString();
  }

  const startFormatted = dayStartEndLoading
    ? 'Loading...'
    : dayStartEndInfo
    ? formatDayDateTime(startDateRaw)
    : 'No Day Start Found';

  const endFormatted = dayStartEndLoading
    ? 'Loading...'
    : dayStartEndInfo
    ? formatDayDateTime(endDateRaw)
    : 'No Day End Found';

  return (
    <div className="flex flex-wrap items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 gap-3">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            {title}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-34">
          <FormInput
            type="date"
            label={isDayEndChecked ? "Date" : "To Date"}
            value={toDate}
            onChange={(e: any) => onToDateChange(e.target.value)}
            inputClassName="h-[36px] text-xs font-bold"
            inputMode="none"
          />
        </div>

        {!isDayEndChecked && (
          <div className="w-34">
            <FormInput
              type="date"
              label="From Date"
              value={fromDate}
              onChange={(e: any) => onFromDateChange(e.target.value)}
              inputClassName="h-[36px] text-xs font-bold"
              inputMode="none"
            />
          </div>
        )}

        {/* Day End Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2 rounded-xl border border-slate-300 hover:border-[#49293e] transition-colors shadow-2xs select-none">
          <input
            type="checkbox"
            checked={isDayEndChecked}
            onChange={(e) => onDayEndCheckChange(e.target.checked)}
            className="w-4 h-4 text-[#49293e] rounded border-slate-300 focus:ring-[#49293e] cursor-pointer"
          />
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Day End</span>
        </label>

        {isDayEndChecked && (
          <div className="flex items-center gap-2">
            {dayStartEndLoading ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#49293e]" />
                <span>Fetching Day Dates...</span>
              </div>
            ) : (
              <>
                <div className="w-44 sm:w-48">
                  <FormInput
                    label="Start Date Time"
                    value={startFormatted}
                    readOnly
                    disabled
                    inputClassName="h-[36px] text-xs font-bold text-[#49293e] bg-slate-100/80 cursor-not-allowed"
                  />
                </div>
                <div className="w-44 sm:w-48">
                  <FormInput
                    label="End Date Time"
                    value={endFormatted}
                    readOnly
                    disabled
                    inputClassName="h-[36px] text-xs font-bold text-emerald-700 bg-slate-100/80 cursor-not-allowed"
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
