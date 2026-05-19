import { useState } from "react";
import { Button, FormInput } from "../../../../components/common";
import { createEmptyReceiptVoucherForm } from "../constants";
import type { ReceiptVoucherForm as ReceiptVoucherFormType } from "../types";
import { Save, RotateCcw } from "lucide-react";
import { useCurrency } from "../../../../hooks/useCurrency";

interface Props {
  initialData?: ReceiptVoucherFormType | null;
  onSubmit: (data: ReceiptVoucherFormType) => void;
  onClear?: () => void;
  submitting?: boolean;
}

const ReceiptVoucherForm = ({ initialData, onSubmit, onClear, submitting }: Props) => {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
        <FormInput 
          id="rv-series"
          label="Series"
          autoFocus
          value={form.series} 
          onChange={(e) => setField("series", e.target.value)} 
          onKeyDown={(e) => handleKeyDown(e, "rv-no")}
        />
        <FormInput 
          id="rv-no"
          label="Voucher No"
          value={form.vchNo} 
          onChange={(e) => setField("vchNo", e.target.value)} 
          onKeyDown={(e) => handleKeyDown(e, "rv-account")}
        />
        <FormInput 
          id="rv-account"
          label="Account"
          value={form.account} 
          onChange={(e) => setField("account", e.target.value)} 
          onKeyDown={(e) => handleKeyDown(e, "rv-amount")}
        />
        <FormInput 
          id="rv-amount"
          label="Amount"
          type="number"
          value={form.amount} 
          inputClassName="text-right font-bold text-[#49293e] bg-[#49293e]/5"
          onChange={(e) => setField("amount", e.target.value)} 
          onKeyDown={(e) => handleKeyDown(e, "rv-paymode")}
          placeholder={formatAmount(0)}
        />
        <FormInput 
          id="rv-paymode"
          label="Paymode"
          value={form.paymode} 
          onChange={(e) => setField("paymode", e.target.value)} 
          onKeyDown={(e) => handleKeyDown(e, "rv-narration")}
        />
        <div className="lg:col-span-3">
          <FormInput 
            id="rv-narration"
            label="Narration"
            value={form.narration} 
            onChange={(e) => setField("narration", e.target.value)} 
            onKeyDown={(e) => handleKeyDown(e, "rv-save-btn")}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-3 pt-4 border-t border-gray-100">
        <Button 
          variant="secondary" 
          onClick={handleClear}
          tabIndex={-1}
          isAction
          icon={<RotateCcw size={18} />}
        >
          Clear
        </Button>
        <Button 
          id="rv-save-btn"
          onClick={() => onSubmit(form)} 
          disabled={submitting}
          isAction
          loading={submitting}
          icon={<Save size={18} />}
        >
          Save
        </Button>
      </div>
    </div>
  );
};

export default ReceiptVoucherForm;
