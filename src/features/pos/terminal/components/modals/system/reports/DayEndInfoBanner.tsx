import React from 'react';
import { Calendar, Clock, Loader2 } from 'lucide-react';

interface DayEndInfoBannerProps {
  isDayEndChecked: boolean;
  onDayEndCheckChange: (checked: boolean) => void;
  dayStartEndInfo: { startDate?: string; endDate?: string; dayStart?: string; dayEnd?: string } | null;
  loading: boolean;
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

export const DayEndInfoBanner: React.FC<DayEndInfoBannerProps> = ({
  isDayEndChecked,
  onDayEndCheckChange,
  dayStartEndInfo,
  loading,
}) => {
  const startDateStr = dayStartEndInfo?.startDate || dayStartEndInfo?.dayStart;
  let endDateStr = dayStartEndInfo?.endDate || dayStartEndInfo?.dayEnd;

  if (isDayEndChecked && dayStartEndInfo && (!endDateStr || endDateStr.startsWith('1900-01-01'))) {
    endDateStr = new Date().toISOString();
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-300 hover:border-[#49293e] transition-colors shadow-2xs select-none">
          <input
            type="checkbox"
            checked={isDayEndChecked}
            onChange={(e) => onDayEndCheckChange(e.target.checked)}
            className="w-4 h-4 text-[#49293e] rounded border-slate-300 focus:ring-[#49293e] cursor-pointer"
          />
          <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Day End</span>
        </label>

        {isDayEndChecked && (
          <div className="flex-1 flex items-center gap-3 bg-[#49293e]/5 border border-[#49293e]/20 px-3.5 py-1.5 rounded-xl text-xs">
            {loading ? (
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#49293e]" />
                <span>Fetching Day Start & End Date Time...</span>
              </div>
            ) : dayStartEndInfo ? (
              <div className="flex flex-wrap items-center gap-4 text-slate-800 font-bold">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#49293e]" />
                  <span className="text-slate-500 font-medium uppercase text-[10px]">Start:</span>
                  <span className="text-[#49293e]">{formatDayDateTime(startDateStr)}</span>
                </div>
                <div className="w-px h-3.5 bg-slate-300 hidden sm:block" />
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-slate-500 font-medium uppercase text-[10px]">End:</span>
                  <span className="text-emerald-700">{formatDayDateTime(endDateStr)}</span>
                </div>
              </div>
            ) : (
              <span className="text-amber-700 font-medium text-[11px]">No Day End data found for selected date.</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
