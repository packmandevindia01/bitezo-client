import React from 'react';
import { BarChart3, Eye, Printer } from 'lucide-react';
import { Button, FormInput } from '../../../../../../../components/common';
import { useToast } from '../../../../../../../app/providers/useToast';

interface GenericReportViewProps {
  title: string;
  description: string;
  asOnDate: string;
  onDateChange: (val: string) => void;
}

export const GenericReportView: React.FC<GenericReportViewProps> = ({
  title,
  description,
  asOnDate,
  onDateChange,
}) => {
  const { showToast } = useToast();

  return (
    <div className="flex flex-col gap-4 py-4">
      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
        <div>
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
            {title}
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">{description}</p>
        </div>

        <FormInput
          type="date"
          label=""
          value={asOnDate}
          onChange={(e: any) => onDateChange(e.target.value)}
          inputClassName="w-40 h-[40px]"
          inputMode="none"
        />
      </div>

      <div className="border border-slate-200 rounded-2xl p-12 bg-white flex flex-col items-center justify-center text-center min-h-[260px] gap-2">
        <div className="w-12 h-12 rounded-2xl bg-[#49293e]/10 text-[#49293e] flex items-center justify-center">
          <BarChart3 size={24} />
        </div>
        <h4 className="text-sm font-bold text-slate-800">{title} Ready</h4>
        <p className="text-xs text-slate-500 max-w-sm">
          Report records loaded for date <span className="font-semibold text-slate-700">{asOnDate}</span>. Select preview or print to view report logs.
        </p>
        <div className="flex items-center gap-2 mt-4">
          <Button
            variant="secondary"
            className="flex items-center gap-2 h-10 px-5"
            onClick={() => showToast(`${title} preview generated`, 'info')}
          >
            <Eye className="w-4 h-4" />
            Preview
          </Button>
          <Button
            className="flex items-center gap-2 h-10 px-5"
            onClick={() => showToast(`Printing ${title}...`, 'success')}
          >
            <Printer className="w-4 h-4" />
            Print
          </Button>
        </div>
      </div>
    </div>
  );
};
