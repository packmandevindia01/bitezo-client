import React from 'react';
import { BarChart3 } from 'lucide-react';
import { FormInput } from '../../../../../../../components/common';
import type { ReportCardItem, ReportType } from './types';

interface PosReportsHubViewProps {
  reportCards: ReportCardItem[];
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
  onSelectReport: (id: ReportType) => void;
}

export const PosReportsHubView: React.FC<PosReportsHubViewProps> = ({
  reportCards,
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
  onSelectReport,
}) => {
  return (
    <div className="flex flex-col gap-4">
      {/* Centralized Date & Time Range Header */}
      <div className="flex flex-wrap items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#49293e]/10 text-[#49293e] flex items-center justify-center shadow-xs">
            <BarChart3 size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              POS Reports Hub
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              Set report period below or select a report card to view logs
            </p>
          </div>
        </div>

        {/* Search Mode Checkboxes & Pickers */}
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

          {/* Centralized Date & Time Range Pickers */}
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

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 max-w-6xl mx-auto w-full gap-3 py-2">
        {reportCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelectReport(card.id)}
              className="group relative flex flex-col items-center justify-between p-3.5 rounded-3xl border-2 border-slate-200/80 bg-white hover:border-[#49293e] hover:bg-gradient-to-b hover:from-[#49293e]/10 hover:via-white hover:to-[#49293e]/5 hover:shadow-xl hover:-translate-y-1.5 active:scale-95 transition-all duration-300 text-center cursor-pointer aspect-square w-full overflow-hidden"
            >
              {/* Top Badge */}
              <span className={`text-[8px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full ${card.badgeBg} ${card.badgeTextColor} border border-black/5`}>
                {card.badge}
              </span>

              {/* Center Icon Box */}
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${card.iconBg} ${card.iconColor} shadow-md border border-black/5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 my-1`}>
                <Icon size={22} strokeWidth={2.2} />
              </div>

              {/* Title & Description */}
              <div className="flex flex-col items-center gap-0.5 min-h-0">
                <h4 className="text-[11px] font-black text-slate-900 group-hover:text-[#49293e] tracking-tight leading-tight uppercase">
                  {card.title}
                </h4>
                <p className="text-[9px] text-slate-500 font-medium leading-tight line-clamp-2 px-1">
                  {card.description}
                </p>
              </div>

              {/* Action Button Hover */}
              <div className="w-full mt-1.5 py-1 px-2.5 rounded-xl bg-slate-100 group-hover:bg-[#49293e] text-slate-700 group-hover:text-white font-extrabold text-[9.5px] uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1 shadow-2xs group-hover:shadow-md">
                <span>Open Report</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
