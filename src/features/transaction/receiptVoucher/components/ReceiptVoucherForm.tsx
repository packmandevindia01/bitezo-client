import { useState } from "react";
import { Button } from "../../../../components/common";
import { createEmptyReceiptVoucherForm } from "../constants";
import type { ReceiptVoucherForm as ReceiptVoucherFormType } from "../types";
import { Save, RotateCcw, X } from "lucide-react";
import { useCurrency } from "../../../../hooks/useCurrency";

interface Props {
  initialData?: ReceiptVoucherFormType | null;
  onSubmit: (data: ReceiptVoucherFormType) => void;
  onCancel: () => void;
  onClear?: () => void;
  submitting?: boolean;
}

const labelClass = "text-[10px] font-bold uppercase tracking-widest text-slate-600";
const inputClass = "w-full h-10.5 px-3 text-xs rounded-lg border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition disabled:bg-gray-50";

const ReceiptVoucherForm = ({ initialData, onSubmit, onCancel, onClear, submitting }: Props) => {
  const { formatAmount } = useCurrency();
  const [form, setForm] = useState<ReceiptVoucherFormType>(initialData || createEmptyReceiptVoucherForm());

  const setField = (key: keyof ReceiptVoucherFormType, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setForm(createEmptyReceiptVoucherForm());
    if (onClear) onClear();
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Series</label>
          <input 
            id="rv-series"
            autoFocus
            value={form.series} 
            onChange={(e) => setField("series", e.target.value)} 
            onKeyDown={(e) => handleKeyDown(e, "rv-no")}
            placeholder="Enter Series"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Voucher No</label>
          <input 
            id="rv-no"
            value={form.vchNo} 
            onChange={(e) => setField("vchNo", e.target.value)} 
            onKeyDown={(e) => handleKeyDown(e, "rv-account")}
            placeholder="Enter Voucher No"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Account</label>
          <input 
            id="rv-account"
            value={form.account} 
            onChange={(e) => setField("account", e.target.value)} 
            onKeyDown={(e) => handleKeyDown(e, "rv-amount")}
            placeholder="Select Account"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Amount</label>
          <input 
            id="rv-amount"
            type="number"
            value={form.amount} 
            style={{ textAlign: 'right' }}
            onChange={(e) => setField("amount", e.target.value)} 
            onKeyDown={(e) => handleKeyDown(e, "rv-paymode")}
            placeholder={formatAmount(0)}
            className={`${inputClass} font-bold text-[#49293e] bg-[#49293e]/5 border-[#49293e]/10`}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>Paymode</label>
          <input 
            id="rv-paymode"
            value={form.paymode} 
            onChange={(e) => setField("paymode", e.target.value)} 
            onKeyDown={(e) => handleKeyDown(e, "rv-narration")}
            placeholder="Select Paymode"
            className={inputClass}
          />
        </div>
        <div className="md:col-span-2 flex flex-col gap-1.5">
           <label className={labelClass}>Narration</label>
           <textarea 
             id="rv-narration"
             value={form.narration} 
             onChange={(e) => setField("narration", e.target.value)} 
             onKeyDown={(e) => handleKeyDown(e, "rv-save-btn")}
             placeholder="Enter Narration..."
             rows={3}
             className="w-full p-3 text-xs rounded-lg border border-gray-300 bg-white outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition"
           />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button 
          variant="secondary" 
          onClick={onCancel}
          className="h-10.5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 border-none shadow-sm"
        >
          <X size={14} /> Cancel
        </Button>
        <Button 
          variant="secondary" 
          onClick={handleClear}
          className="h-10.5 px-6 text-[10px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 hover:bg-slate-200 border-none shadow-sm"
        >
          <RotateCcw size={14} /> Clear
        </Button>
        <Button 
          id="rv-save-btn"
          onClick={() => onSubmit(form)} 
          disabled={submitting}
          className="h-10.5 px-10 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-pos-primary/20"
        >
          {submitting ? <RotateCcw size={14} className="animate-spin" /> : <Save size={14} />}
          {initialData ? "Update Voucher" : "Save Voucher"}
        </Button>
      </div>
    </div>
  );
};

export default ReceiptVoucherForm;
