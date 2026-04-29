import { useRef, useState } from "react";
import { FileText, Plus } from "lucide-react";
import { Button, FormInput, PageShell } from "../../../../components/common";
import { createEmptyReceiptAgainstVoucherForm } from "../constants";
import type { ReceiptAgainstVoucherLineItem, ReceiptAgainstVoucherForm } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";

const ReceiptAgainstVoucherPage = () => {
  const { formatAmount } = useCurrency();
  const [form, setForm] = useState<ReceiptAgainstVoucherForm>(() => {
    const empty = createEmptyReceiptAgainstVoucherForm();
    empty.invAmnt = formatAmount(0);
    empty.paid = formatAmount(0);
    empty.balance = formatAmount(0);
    empty.amount = formatAmount(0);
    return empty;
  });
  const [items, setItems] = useState<ReceiptAgainstVoucherLineItem[]>([]);

  const nextItemId = useRef(1);

  const setField = (key: keyof ReceiptAgainstVoucherForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
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

  const handleReset = () => {
    setForm(createEmptyReceiptAgainstVoucherForm());
    setItems([]);
  };

  return (
    <PageShell title="Receipt Against Voucher">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Transaction
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wide text-gray-900">
              <FileText size={24} className="text-[#49293e]" />
              Receipt Against Voucher
            </h1>
          </div>
        </div>

        <div className="grid gap-x-4 gap-y-1 md:grid-cols-4 xl:grid-cols-5">
          <FormInput label="Series" value={form.series} onChange={(e) => setField("series", e.target.value)} />
          <FormInput label="Vch No" value={form.vchNo} onChange={(e) => setField("vchNo", e.target.value)} />
          <FormInput label="Date" type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} />
          <div className="md:col-span-2 xl:col-span-2 flex items-end gap-2">
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

        <div className="mt-2 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto]">
            <FormInput label="Vch Type" value={form.vchType} onChange={(e) => setField("vchType", e.target.value)} />
            <FormInput label="Vch No" value={form.vchNoInput} onChange={(e) => setField("vchNoInput", e.target.value)} />
            <FormInput label="Inv Amnt" value={form.invAmnt} onChange={(e) => setField("invAmnt", e.target.value)} />
            <FormInput label="Paid" value={form.paid} onChange={(e) => setField("paid", e.target.value)} />
            <FormInput label="Balance" value={form.balance} onChange={(e) => setField("balance", e.target.value)} />
            <FormInput label="Amount" value={form.amount} onChange={(e) => setField("amount", e.target.value)} />
            <div className="flex items-end pb-4">
              <Button onClick={addItem} className="h-10 w-full px-8">
                <Plus size={16} />
                ADD
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white min-h-[250px]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Vch Type", "Vch No", "Inv Amnt", "Paid", "Balance", "Amount"].map(
                    (column) => (
                      <th
                        key={column}
                        className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500"
                      >
                        {column}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="h-40 px-4 text-center text-sm text-gray-400">
                      No vouchers added
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#49293e]/5">
                      <td className="border-l-[3px] border-l-[#49293e] px-4 py-3 font-medium text-gray-900">
                        {item.vchType}
                      </td>
                      <td className="px-4 py-3">{item.vchNo}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatAmount(item.invAmnt)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatAmount(item.paid)}</td>
                      <td className="px-4 py-3 text-right font-mono">{formatAmount(item.balance)}</td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">{formatAmount(item.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_350px]">
          <div className="grid gap-x-4 gap-y-1 md:grid-cols-2">
            <FormInput label="Narration" value={form.narration} onChange={(e) => setField("narration", e.target.value)} />
            <FormInput label="Paymode" value={form.paymode} onChange={(e) => setField("paymode", e.target.value)} />
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
              <div className="rounded-xl border border-[#49293e]/15 bg-white px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Total Amount</p>
                <p className="mt-1 text-2xl font-bold text-[#49293e]">
                  {formatAmount(items.reduce((acc, item) => acc + item.amount, 0))}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="secondary" className="h-10 px-6" onClick={handleReset}>
                CLEAR
              </Button>
              <Button className="h-10 px-6">
                SAVE
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ReceiptAgainstVoucherPage;
