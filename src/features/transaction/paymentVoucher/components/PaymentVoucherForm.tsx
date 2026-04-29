import { useState } from "react";
import { Button, FormInput } from "../../../../components/common";
import { createEmptyPaymentVoucherForm } from "../constants";
import type { PaymentVoucherForm as PaymentVoucherFormType } from "../types";

interface Props {
  initialData?: PaymentVoucherFormType | null;
  onSubmit: (data: PaymentVoucherFormType) => void;
  onCancel: () => void;
  submitting?: boolean;
}

const PaymentVoucherForm = ({ initialData, onSubmit, submitting }: Props) => {

  const [form, setForm] = useState<PaymentVoucherFormType>(initialData || createEmptyPaymentVoucherForm());

  const setField = (key: keyof PaymentVoucherFormType, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setForm(createEmptyPaymentVoucherForm());
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
        <FormInput label="Series" value={form.series} onChange={(e) => setField("series", e.target.value)} />
        <FormInput label="Vch No" value={form.vchNo} onChange={(e) => setField("vchNo", e.target.value)} />
        <FormInput label="Account" value={form.account} onChange={(e) => setField("account", e.target.value)} />
        <FormInput label="Amount" value={form.amount} onChange={(e) => setField("amount", e.target.value)} />
        <FormInput label="Paymode" value={form.paymode} onChange={(e) => setField("paymode", e.target.value)} />
        <div className="md:col-span-2">
           <FormInput label="Narration" value={form.narration} onChange={(e) => setField("narration", e.target.value)} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" className="h-10 px-6" onClick={handleClear}>
          CLEAR
        </Button>
        <Button className="h-10 px-6" onClick={() => onSubmit(form)} loading={submitting}>
          {initialData ? "UPDATE" : "SAVE"}
        </Button>
      </div>


    </>
  );
};

export default PaymentVoucherForm;
