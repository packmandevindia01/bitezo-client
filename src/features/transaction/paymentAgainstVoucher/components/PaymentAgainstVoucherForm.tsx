import { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { Button, FormInput } from "../../../../components/common";
import { createEmptyPaymentAgainstVoucherForm } from "../constants";
import type { PaymentAgainstVoucherForm as PaymentAgainstVoucherFormType, PaymentAgainstVoucherLineItem } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { BackofficeMultiPayModal } from "../../shared/components/BackofficeMultiPayModal";

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

interface Props {
  initialData?: PaymentAgainstVoucherFormType | null;
  initialItems?: PaymentAgainstVoucherLineItem[];
  onSubmit: (data: PaymentAgainstVoucherFormType, items: PaymentAgainstVoucherLineItem[]) => void;
  onCancel: () => void;
  submitting?: boolean;
}

const PaymentAgainstVoucherForm = ({ initialData, initialItems = [], onSubmit, submitting }: Props) => {
  const { formatAmount } = useCurrency();
  const [form, setForm] = useState<PaymentAgainstVoucherFormType>(initialData || createEmptyPaymentAgainstVoucherForm());
  const [items, setItems] = useState<PaymentAgainstVoucherLineItem[]>(initialItems);
  const [isMultiPayOpen, setIsMultiPayOpen] = useState(false);
  const nextItemId = useRef(initialItems.length > 0 ? Math.max(...initialItems.map(i => i.id)) + 1 : 1);

  const setField = (key: keyof PaymentAgainstVoucherFormType, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const addItem = () => {
    if (!form.vchType) return;
    const itemId = nextItemId.current;
    nextItemId.current += 1;
    
    const newItem: PaymentAgainstVoucherLineItem = {
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

  useEffect(() => {
    // Explicit focus on mount for reliability
    setTimeout(() => {
      document.getElementById("pav-series")?.focus();
    }, 200);
  }, []);

  const handleClear = () => {
    setForm(createEmptyPaymentAgainstVoucherForm());
    setItems([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  const handleSave = () => {
    onSubmit(form, items);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1">
        <FormInput 
            id="pav-series"
            label="Series" 
            value={form.series} 
            onChange={(e) => setField("series", e.target.value)} 
            onKeyDown={(e) => handleKeyDown(e, "pav-vchNo")}
            autoFocus
        />
        <FormInput 
            id="pav-vchNo"
            label="Vch No" 
            value={form.vchNo} 
            onChange={(e) => setField("vchNo", e.target.value)} 
            onKeyDown={(e) => handleKeyDown(e, "pav-date")}
        />
        <FormInput 
            id="pav-date"
            label="Date" 
            type="date" 
            value={form.date} 
            onChange={(e) => setField("date", e.target.value)} 
            onKeyDown={(e) => handleKeyDown(e, "pav-supplier")}
        />
        <div className="flex items-end gap-2">
            <div className="flex-1">
              <FormInput 
                id="pav-supplier"
                label="Supplier" 
                value={form.supplier} 
                onChange={(e) => setField("supplier", e.target.value)} 
                onKeyDown={(e) => handleKeyDown(e, "pav-vchType")}
              />
            </div>
            <div className="flex items-end pb-1">
              <Button variant="secondary" className="h-10.5 px-3 bg-[#49293e]/10 text-[#49293e] border-[#49293e]/20 hover:bg-[#49293e]/20" onClick={() => setIsMultiPayOpen(true)}>
                MULTI
              </Button>
            </div>

        </div>
      </div>

      <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-3">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-x-3 gap-y-1">
            <FormInput 
                id="pav-vchType"
                label="Vch Type" 
                value={form.vchType} 
                onChange={(e) => setField("vchType", e.target.value)} 
                onKeyDown={(e) => handleKeyDown(e, "pav-vchNoInput")}
            />
            <FormInput 
                id="pav-vchNoInput"
                label="Vch No" 
                value={form.vchNoInput} 
                onChange={(e) => setField("vchNoInput", e.target.value)} 
                onKeyDown={(e) => handleKeyDown(e, "pav-invAmnt")}
            />
            <FormInput 
                id="pav-invAmnt"
                label="Inv Amnt" 
                value={form.invAmnt} 
                onChange={(e) => setField("invAmnt", e.target.value)} 
                onKeyDown={(e) => handleKeyDown(e, "pav-paid")}
            />
            <FormInput 
                id="pav-paid"
                label="Paid" 
                value={form.paid} 
                onChange={(e) => setField("paid", e.target.value)} 
                onKeyDown={(e) => handleKeyDown(e, "pav-balance")}
            />
            <FormInput 
                id="pav-balance"
                label="Balance" 
                value={form.balance} 
                onChange={(e) => setField("balance", e.target.value)} 
                onKeyDown={(e) => handleKeyDown(e, "pav-amount")}
            />
            <FormInput 
                id="pav-amount"
                label="Amount" 
                value={form.amount} 
                onChange={(e) => setField("amount", e.target.value)} 
                onKeyDown={(e) => handleKeyDown(e, "pav-add-btn")}
            />
            <div className="flex items-end pb-1">
              <Button 
                id="pav-add-btn"
                onClick={addItem} 
                className="h-10.5 w-full" 
                disabled={submitting}
                icon={<Plus size={18} />}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        addItem();
                        setTimeout(() => document.getElementById("pav-vchType")?.focus(), 0);
                    }
                }}
              >
                Add
              </Button>
            </div>

          </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200">
          <div className="max-h-[250px] overflow-auto">
            <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {["Vch Type", "Vch No", "Inv Amnt", "Paid", "Balance", "Amount"].map(col => (
                      <th key={col} className="sticky top-0 bg-gray-50 z-10 px-4 py-2 text-xs font-semibold text-gray-500 uppercase">{col}</th>
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
            <FormInput 
                id="pav-narration"
                label="Narration" 
                value={form.narration} 
                onChange={(e) => setField("narration", e.target.value)} 
                onKeyDown={(e) => handleKeyDown(e, "pav-paymode")}
            />
            <FormInput 
                id="pav-paymode"
                label="Paymode" 
                value={form.paymode} 
                onChange={(e) => setField("paymode", e.target.value)} 
                onKeyDown={(e) => handleKeyDown(e, "pav-save-btn")}
                disabled={form.paymode === "MULTI-PAY (SPLIT)"}
            />
          </div>
          <div className="flex justify-end items-end gap-3 pb-4">
            <Button variant="secondary" className="h-10 px-8 uppercase" onClick={handleClear} tabIndex={-1}>
              Clear
            </Button>
            <Button 
                id="pav-save-btn"
                className="h-10 px-8 uppercase" 
                onClick={handleSave} 
                loading={submitting}
                onKeyDown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        handleSave();
                    }
                }}
            >
              {initialData ? "Update" : "Save"}
            </Button>
          </div>
      </div>

      <BackofficeMultiPayModal
        isOpen={isMultiPayOpen}
        onClose={() => setIsMultiPayOpen(false)}
        totalDue={items.reduce((acc, item) => acc + item.amount, 0)}
        onSubmit={(payments) => {
          setIsMultiPayOpen(false);
          setForm(prev => ({
            ...prev,
            payments: payments,
            paymode: "MULTI-PAY (SPLIT)"
          }));
          setTimeout(() => document.getElementById("pav-save-btn")?.focus(), 100);
        }}
      />
    </div>
  );
};

export default PaymentAgainstVoucherForm;
