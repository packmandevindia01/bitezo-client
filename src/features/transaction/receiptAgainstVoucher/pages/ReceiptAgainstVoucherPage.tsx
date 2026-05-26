import { useRef, useState, useEffect, useMemo } from "react";
import { Save, RotateCcw, Plus } from "lucide-react";
import { Button, FormInput, PageShell } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { createEmptyReceiptAgainstVoucherForm } from "../constants";
import type { ReceiptAgainstVoucherLineItem, ReceiptAgainstVoucherForm } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";

const ReceiptAgainstVoucherPage = () => {
  const { formatAmount } = useCurrency();
  const initialForm = useMemo(() => {
    const empty = createEmptyReceiptAgainstVoucherForm();
    empty.invAmnt = formatAmount(0);
    empty.paid = formatAmount(0);
    empty.balance = formatAmount(0);
    empty.amount = formatAmount(0);
    return empty;
  }, [formatAmount]);

  const [form, setForm] = useState<ReceiptAgainstVoucherForm>(initialForm);
  const [items, setItems] = useState<ReceiptAgainstVoucherLineItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const nextItemId = useRef(1);

  useEffect(() => {
    setTimeout(() => {
      document.getElementById("rav-page-series")?.focus();
    }, 200);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextId) document.getElementById(nextId)?.focus();
    }
  };

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
    setTimeout(() => document.getElementById("rav-page-vchType")?.focus(), 0);
  };

  const handleReset = () => {
    setForm(initialForm);
    setItems([]);
    setShowClearConfirm(false);
    setTimeout(() => document.getElementById("rav-page-series")?.focus(), 0);
  };

  const handleClearClick = () => {
    const isDirty = items.length > 0 || JSON.stringify(form) !== JSON.stringify(initialForm);
    if (isDirty) {
      setShowClearConfirm(true);
    } else {
      handleReset();
    }
  };

  return (
    <PageShell title="Receipt Against Voucher">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 120px)" }}>
        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">

        <div className="grid gap-x-3 gap-y-2 md:grid-cols-4 xl:grid-cols-5">
          <FormInput id="rav-page-series" label="Series" value={form.series} onChange={(e) => setField("series", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "rav-page-vchNo")} />
          <FormInput id="rav-page-vchNo" label="Vch No" value={form.vchNo} onChange={(e) => setField("vchNo", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "rav-page-date")} />
          <FormInput id="rav-page-date" label="Date" type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "rav-page-customer")} />
          <div className="md:col-span-2 flex items-end gap-2">
            <div className="flex-1">
              <FormInput id="rav-page-customer" label="Customer" value={form.customer} onChange={(e) => setField("customer", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "rav-page-vchType")} />
            </div>
            <div className="flex items-end pb-1">
              <Button variant="secondary" className="h-10.5 px-3 bg-[#49293e]/5 text-[#49293e] border-[#49293e]/10 hover:bg-[#49293e]/10 text-xs font-bold">
                MULTI
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50/70 p-2">
          <div className="grid gap-x-2 gap-y-1 md:grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr_auto]">
            <FormInput id="rav-page-vchType" label="Vch Type" value={form.vchType} onChange={(e) => setField("vchType", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "rav-page-vchNoInput")} />
            <FormInput id="rav-page-vchNoInput" label="Vch No" value={form.vchNoInput} onChange={(e) => setField("vchNoInput", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "rav-page-invAmnt")} />
            <FormInput id="rav-page-invAmnt" label="Inv Amnt" value={form.invAmnt} inputClassName="text-right" onChange={(e) => setField("invAmnt", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "rav-page-paid")} />
            <FormInput id="rav-page-paid" label="Paid" value={form.paid} inputClassName="text-right" onChange={(e) => setField("paid", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "rav-page-balance")} />
            <FormInput id="rav-page-balance" label="Balance" value={form.balance} inputClassName="text-right" onChange={(e) => setField("balance", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "rav-page-amount")} />
            <FormInput id="rav-page-amount" label="Amount" value={form.amount} inputClassName="text-right font-bold text-[#49293e]" onChange={(e) => setField("amount", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "rav-page-add-btn")} />
            <div className="flex items-end pb-1">
              <Button
                id="rav-page-add-btn"
                onClick={addItem}
                className="h-10.5 w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
                icon={<Plus size={18} />}
              >
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="max-h-[250px] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  {["Vch Type", "Vch No", "Inv Amnt", "Paid", "Balance", "Amount"].map(
                    (column) => (
                      <th
                        key={column}
                        className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400"
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

        <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-2">
            <FormInput id="rav-page-narration" label="Narration" value={form.narration} onChange={(e) => setField("narration", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "rav-page-paymode")} />
            <FormInput id="rav-page-paymode" label="Paymode" value={form.paymode} onChange={(e) => setField("paymode", e.target.value)} onKeyDown={(e) => handleKeyDown(e, "rav-page-save-btn")} />
          </div>
          <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between rounded-lg border border-[#49293e]/10 bg-white px-3 py-2 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total Amount</p>
              <p className="text-xl font-bold text-[#49293e]">
                {formatAmount(items.reduce((acc, item) => acc + item.amount, 0))}
              </p>
            </div>
          </div>
        </div>
        </div>{/* end scrollable body */}

        {/* ── Sticky Action Footer ── */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4 rounded-b-3xl">
          <Button 
            variant="secondary" 
            onClick={handleClearClick} 
            tabIndex={-1}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Clear
          </Button>
          <Button 
            id="rav-page-save-btn"
            isAction
            icon={<Save size={18} />}
          >
            Save
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Form"
        message="Are you sure you want to clear the form? All unsaved data will be lost."
        confirmLabel="Clear"
        onConfirm={handleReset}
        onCancel={() => setShowClearConfirm(false)}
      />
    </PageShell>
  );
};

export default ReceiptAgainstVoucherPage;
