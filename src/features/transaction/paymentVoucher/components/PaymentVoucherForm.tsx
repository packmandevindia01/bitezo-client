import { useState } from "react";
import { Button, FormInput } from "../../../../components/common";
import { createEmptyPaymentVoucherForm } from "../constants";
import type { PaymentVoucherForm as PaymentVoucherFormType } from "../types";
import { Save, RotateCcw, X } from "lucide-react";
import { useCurrency } from "../../../../hooks/useCurrency";

interface Props {
  initialData?: PaymentVoucherFormType | null;
  onSubmit: (data: PaymentVoucherFormType) => void;
  onCancel: () => void;
  onClear?: () => void;
  submitting?: boolean;
}

const PaymentVoucherForm = ({ initialData, onSubmit, onCancel, onClear, submitting }: Props) => {
  const { formatAmount } = useCurrency();
  const [form, setForm] = useState<PaymentVoucherFormType>(initialData || createEmptyPaymentVoucherForm());

  const setField = (key: keyof PaymentVoucherFormType, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setForm(createEmptyPaymentVoucherForm());
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
          id="vch-series"
          label="Series"
          autoFocus
          value={form.series} 
          onChange={(e) => setField("series", e.target.value)} 
          onKeyDown={(e) => handleKeyDown(e, "vch-no")}
        />
        <FormInput 
          id="vch-no"
          label="Voucher No"
          value={form.vchNo} 
          onChange={(e) => setField("vchNo", e.target.value)} 
          onKeyDown={(e) => handleKeyDown(e, "vch-account")}
        />
        <FormInput 
          id="vch-account"
          label="Account"
          value={form.account} 
          onChange={(e) => setField("account", e.target.value)} 
          onKeyDown={(e) => handleKeyDown(e, "vch-amount")}
        />
        <FormInput 
          id="vch-amount"
          label="Amount"
          type="number"
          value={form.amount} 
          inputClassName="text-right font-bold text-[#49293e] bg-[#49293e]/5"
          onChange={(e) => setField("amount", e.target.value)} 
          onKeyDown={(e) => handleKeyDown(e, "vch-paymode")}
          placeholder={formatAmount(0)}
        />
        <FormInput 
          id="vch-paymode"
          label="Paymode"
          value={form.paymode} 
          onChange={(e) => setField("paymode", e.target.value)} 
          onKeyDown={(e) => handleKeyDown(e, "vch-narration")}
        />
        <div className="lg:col-span-3">
          <FormInput 
            id="vch-narration"
            label="Narration"
            value={form.narration} 
            onChange={(e) => setField("narration", e.target.value)} 
            onKeyDown={(e) => handleKeyDown(e, "vch-save-btn")}
          />
        </div>
      </div>

      <div className="mt-4 flex justify-end gap-2 pt-4 border-t border-slate-100">
        <Button 
          variant="secondary" 
          onClick={onCancel}
          tabIndex={-1}
          isAction
          icon={<X size={18} />}
        />
        <Button 
          variant="secondary" 
          onClick={handleClear}
          tabIndex={-1}
          isAction
          icon={<RotateCcw size={18} />}
        />
        <Button 
          id="vch-save-btn"
          onClick={() => onSubmit(form)} 
          disabled={submitting}
          isAction
          loading={submitting}
          icon={<Save size={18} />}
        />
      </div>
    </div>
  );
};
  );
};

export default PaymentVoucherForm;
