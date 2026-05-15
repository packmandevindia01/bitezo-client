import { useState, useRef } from "react";
import { Plus, RotateCcw, Save } from "lucide-react";
import { Button, FormInput } from "../../../../components/common";
import { createEmptyReceiptAgainstVoucherForm } from "../constants";
import type { ReceiptAgainstVoucherForm as ReceiptAgainstVoucherFormType, ReceiptAgainstVoucherLineItem } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

interface Props {
  initialData?: ReceiptAgainstVoucherFormType | null;
  initialItems?: ReceiptAgainstVoucherLineItem[];
  onSubmit: (data: ReceiptAgainstVoucherFormType, items: ReceiptAgainstVoucherLineItem[]) => void;
  onCancel: () => void;
  submitting?: boolean;
}

const ReceiptAgainstVoucherForm = ({ initialData, initialItems = [], onSubmit, submitting }: Props) => {
  const { formatAmount } = useCurrency();
  const [form, setForm] = useState<ReceiptAgainstVoucherFormType>(initialData || createEmptyReceiptAgainstVoucherForm());
  const [items, setItems] = useState<ReceiptAgainstVoucherLineItem[]>(initialItems);
  const nextItemId = useRef(initialItems.length > 0 ? Math.max(...initialItems.map(i => i.id)) + 1 : 1);

  const setField = (key: keyof ReceiptAgainstVoucherFormType, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addItem = () => {
    if (!form.vchType) return;
    const itemId = nextItemId.current;
    nextItemId.current += 1;
    
    const newItem: ReceiptAgainstVoucherLineItem = {
      id: itemId,
      vchType: form.vchType,
      vchNo: form.vchNoInput,
      invAmnt: toNumber(form.invAmnt),
      paid: toNumber(form.paid),
      balance: toNumber(form.balance),
      amount: toNumber(form.amount),
    };

    setItems((prev) => [...prev, newItem]);
    setForm((prev) => ({
      ...prev,
      vchType: "",
      vchNoInput: "",
      invAmnt: formatAmount(0),
      paid: formatAmount(0),
      balance: formatAmount(0),
      amount: formatAmount(0),
    }));
  };

  const handleClear = () => {
    setForm(createEmptyReceiptAgainstVoucherForm());
    setItems([]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
        <FormInput label="Series" value={form.series} onChange={(e) => setField("series", e.target.value)} />
        <FormInput label="Vch No" value={form.vchNo} onChange={(e) => setField("vchNo", e.target.value)} />
        <FormInput label="Date" type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
        <div className="flex items-end gap-2">
            <div className="flex-1">
              <FormInput label="Customer" value={form.customer} onChange={(e) => setField("customer", e.target.value)} />
            </div>
            <div className="pb-4">
              <Button variant="secondary" className="h-10 px-3 bg-[#49293e]/10 text-[#49293e] border-[#49293e]/20 hover:bg-[#49293e]/20">
                MULTI
              </Button>
            </div>

        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-x-3 gap-y-1">
            <FormInput label="Vch Type" value={form.vchType} onChange={(e) => setField("vchType", e.target.value)} />
            <FormInput label="Vch No" value={form.vchNoInput} onChange={(e) => setField("vchNoInput", e.target.value)} />
            <FormInput label="Inv Amnt" value={form.invAmnt} onChange={(e) => setField("invAmnt", e.target.value)} />
            <FormInput label="Paid" value={form.paid} onChange={(e) => setField("paid", e.target.value)} />
            <FormInput label="Balance" value={form.balance} onChange={(e) => setField("balance", e.target.value)} />
            <FormInput label="Amount" value={form.amount} onChange={(e) => setField("amount", e.target.value)} />
            <div className="flex items-end pb-4">
              <Button onClick={addItem} className="h-10 w-full" disabled={submitting}>
                <Plus size={16} />
                ADD
              </Button>
            </div>

          </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 min-h-[150px]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Vch Type", "Vch No", "Inv Amnt", "Paid", "Balance", "Amount"].map(col => (
                      <th key={col} className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {items.length === 0 ? (
                    <tr><td colSpan={6} className="h-20 text-center text-gray-400 italic">No vouchers</td></tr>
                  ) : (
                    items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-4 py-2">{item.vchType}</td>
                        <td className="px-4 py-2">{item.vchNo}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatAmount(item.invAmnt)}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatAmount(item.paid)}</td>
                        <td className="px-4 py-2 text-right font-mono">{formatAmount(item.balance)}</td>
                        <td className="px-4 py-2 text-right font-mono font-semibold">{formatAmount(item.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
            </table>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <FormInput label="Narration" value={form.narration} onChange={(e) => setField("narration", e.target.value)} />
            <FormInput label="Paymode" value={form.paymode} onChange={(e) => setField("paymode", e.target.value)} />
          </div>
          <div className="flex justify-end items-end gap-3 pb-4">
            <Button 
              variant="secondary" 
              onClick={handleClear} 
              tabIndex={-1}
              isAction
              icon={<RotateCcw size={18} />}
            />
            <Button 
              onClick={() => onSubmit(form, items)} 
              loading={submitting}
              isAction
              icon={<Save size={18} />}
            />
          </div>
      </div>
    </div>
  );
};

export default ReceiptAgainstVoucherForm;
