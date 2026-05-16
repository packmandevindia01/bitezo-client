import { useEffect, useMemo, useRef, useState } from "react";
import { Printer, Save, Trash2, Plus } from "lucide-react";
import { Button, FormInput, PageShell } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { createEmptyPurchaseReturnForm } from "../constants";
import type { PurchaseReturnLineItem, PurchaseReturnForm } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";



const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const calculateLine = (item: PurchaseReturnLineItem) => {
  const amount = item.qty * item.price;
  const discountAmount = amount * (item.discPercent / 100);
  const vatAmount = (amount - discountAmount) * (item.vatPercent / 100);
  const netAmount = amount - discountAmount + vatAmount;

  return {
    amount,
    discountAmount,
    vatAmount,
    netAmount,
  };
};

const PurchaseReturnPage = () => {
  const { formatAmount } = useCurrency();
  const initialForm = useMemo(() => {
    const empty = createEmptyPurchaseReturnForm();
    empty.price = formatAmount(0);
    empty.discAmount = formatAmount(0);
    empty.otherCharge = formatAmount(0);
    empty.roundOff = formatAmount(0);
    return empty;
  }, [formatAmount]);

  const [form, setForm] = useState<PurchaseReturnForm>(initialForm);
  const [items, setItems] = useState<PurchaseReturnLineItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const nextItemId = useRef(1);



  const setField = (key: keyof PurchaseReturnForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") { e.preventDefault(); if (nextId) document.getElementById(nextId)?.focus(); }
  };

  useEffect(() => { setTimeout(() => { document.getElementById("pr-series")?.focus(); }, 200); }, []);

  const currentLine = useMemo<PurchaseReturnLineItem>(
    () => ({
      id: 0,
      product: form.product.trim(),
      code: form.code.trim(),
      unit: form.unit.trim(),
      qty: toNumber(form.qty),
      foc: toNumber(form.foc),
      price: toNumber(form.price),
      vatPercent: toNumber(form.vatPercent),
      discPercent: toNumber(form.discPercent),
    }),
    [form],
  );

  const currentLineTotals = calculateLine(currentLine);

  const totals = useMemo(() => {
    const itemTotals = items.reduce(
      (acc, item) => {
        const line = calculateLine(item);
        acc.discountAmount += line.discountAmount;
        acc.vatAmount += line.vatAmount;
        acc.netAmount += line.netAmount;
        return acc;
      },
      { discountAmount: 0, vatAmount: 0, netAmount: 0 },
    );

    const manualDiscount = toNumber(form.discAmount);
    const otherCharge = toNumber(form.otherCharge);
    const roundOff = toNumber(form.roundOff);
    const grandTotal = itemTotals.netAmount - manualDiscount + otherCharge + roundOff;

    return {
      ...itemTotals,
      grandTotal,
    };
  }, [form.discAmount, form.otherCharge, form.roundOff, items]);

  const addItem = () => {
    if (!currentLine.product) return;

    const itemId = nextItemId.current;
    nextItemId.current += 1;
    setItems((prev) => [...prev, { ...currentLine, id: itemId }]);
    setForm((prev) => ({
      ...prev,
      product: "",
      code: "",
      unit: "",
      qty: "0",
      foc: "0",
      price: formatAmount(0),
      vatPercent: "0",
      discPercent: "0",
    }));
    setTimeout(() => document.getElementById("pr-product")?.focus(), 0);
  };

  const resetForm = () => {
    setForm(initialForm);
    setItems([]);
    setShowClearConfirm(false);
  };

  const handleClearClick = () => {
    const isDirty = items.length > 0 || JSON.stringify(form) !== JSON.stringify(initialForm);
    if (isDirty) {
      setShowClearConfirm(true);
    } else {
      resetForm();
    }
  };




  return (
    <PageShell title="Purchase Return">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 120px)" }}>
        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">

        <div className="grid gap-x-3 gap-y-2 md:grid-cols-5 xl:grid-cols-8">
          <FormInput id="pr-series" label="Series" value={form.series} onChange={(e) => setField("series", e.target.value)} onKeyDown={(e) => hk(e, "pr-purchaseNo")} required />
          <FormInput id="pr-purchaseNo" label="PR No" value={form.purchaseNo} onChange={(e) => setField("purchaseNo", e.target.value)} onKeyDown={(e) => hk(e, "pr-purchaseDate")} required />
          <FormInput id="pr-purchaseDate" label="P Date" type="date" value={form.purchaseDate} onChange={(e) => setField("purchaseDate", e.target.value)} onKeyDown={(e) => hk(e, "pr-invoiceNo")} required />
          <FormInput id="pr-invoiceNo" label="P Inv No" value={form.invoiceNo} onChange={(e) => setField("invoiceNo", e.target.value)} onKeyDown={(e) => hk(e, "pr-supplier")} />
          <FormInput id="pr-supplier" label="Supplier" value={form.supplier} onChange={(e) => setField("supplier", e.target.value)} onKeyDown={(e) => hk(e, "pr-branch")} required />
          <FormInput id="pr-branch" label="Branch" value={form.branch} onChange={(e) => setField("branch", e.target.value)} onKeyDown={(e) => hk(e, "pr-salesman")} required />
          <FormInput id="pr-salesman" label="Salesman" value={form.salesman} onChange={(e) => setField("salesman", e.target.value)} onKeyDown={(e) => hk(e, "pr-product")} required />
        </div>

        <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50/70 p-2">
          <div className="grid gap-x-2 gap-y-1 md:grid-cols-[1.5fr_1fr_1fr_0.6fr_0.6fr_0.8fr_0.7fr_0.7fr_0.8fr_0.9fr_auto]">
            <FormInput id="pr-product" label="Product" value={form.product} onChange={(e) => setField("product", e.target.value)} onKeyDown={(e) => hk(e, "pr-code")} />
            <FormInput id="pr-code" label="Code" value={form.code} onChange={(e) => setField("code", e.target.value)} onKeyDown={(e) => hk(e, "pr-unit")} />
            <FormInput id="pr-unit" label="Unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} onKeyDown={(e) => hk(e, "pr-qty")} />
            <FormInput id="pr-qty" label="Qty" value={form.qty} inputClassName="text-right" onChange={(e) => setField("qty", e.target.value)} onKeyDown={(e) => hk(e, "pr-foc")} />
            <FormInput id="pr-foc" label="FOC" value={form.foc} inputClassName="text-right" onChange={(e) => setField("foc", e.target.value)} onKeyDown={(e) => hk(e, "pr-price")} />
            <FormInput id="pr-price" label="Price" value={form.price} inputClassName="text-right" onChange={(e) => setField("price", e.target.value)} onKeyDown={(e) => hk(e, "pr-vatPercent")} />
            <FormInput id="pr-vatPercent" label="VAT(%)" value={form.vatPercent} inputClassName="text-right" onChange={(e) => setField("vatPercent", e.target.value)} onKeyDown={(e) => hk(e, "pr-discPercent")} />
            <FormInput id="pr-discPercent" label="Disc(%)" value={form.discPercent} inputClassName="text-right" onChange={(e) => setField("discPercent", e.target.value)} onKeyDown={(e) => hk(e, "pr-add-btn")} />
            <FormInput label="Disc Amt" value={formatAmount(currentLineTotals.discountAmount)} inputClassName="text-right" readOnly />
            <FormInput label="Amount" value={formatAmount(currentLineTotals.netAmount)} inputClassName="text-right font-bold text-[#49293e]" readOnly />
            <div className="flex items-end pb-4">
              <Button id="pr-add-btn" onClick={addItem} className="h-[38px] w-full"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}>
                <Plus size={18} />
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  {["Product", "Code", "Unit", "Qty", "FOC", "Price", "Amount", "Disc Amt", "VAT Amt", "Net Amount"].map(
                    (column) => (
                      <th
                        key={column}
                        className="whitespace-nowrap px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400"
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
                    <td colSpan={10} className="h-28 px-4 text-center text-sm text-gray-400">
                      No items added
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const line = calculateLine(item);
                    return (
                      <tr key={item.id} className="group hover:bg-[#49293e]/5 transition-colors">
                        <td className="border-l-[3px] border-l-[#49293e] px-4 py-3 font-medium text-gray-900">
                          {item.product}
                        </td>
                        <td className="px-4 py-3">{item.code || "-"}</td>
                        <td className="px-4 py-3">{item.unit || "-"}</td>
                        <td className="px-4 py-3">{item.qty}</td>
                        <td className="px-4 py-3">{item.foc}</td>
                        <td className="px-4 py-3 font-mono">{formatAmount(item.price)}</td>
                        <td className="px-4 py-3 font-mono">{formatAmount(line.amount)}</td>
                        <td className="px-4 py-3 font-mono">{formatAmount(line.discountAmount)}</td>
                        <td className="px-4 py-3 font-mono">{formatAmount(line.vatAmount)}</td>
                        <td className="px-4 py-3 font-mono font-semibold text-gray-900">{formatAmount(line.netAmount)}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setItems(prev => prev.filter(i => i.id !== item.id))}
                            onDoubleClick={(e) => e.stopPropagation()}
                            className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-2 grid gap-3 lg:grid-cols-[1fr_300px]">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-2 lg:grid-cols-3">
            <FormInput label="Paymode" value={form.paymode} onChange={(e) => setField("paymode", e.target.value)} />
            <FormInput label="Disc(%)" value={form.discPercent} inputClassName="text-right" onChange={(e) => setField("discPercent", e.target.value)} />
            <FormInput label="Disc Amt" value={form.discAmount} inputClassName="text-right" onChange={(e) => setField("discAmount", e.target.value)} />
            <div className="md:col-span-2 lg:col-span-3">
              <FormInput label="Narration" value={form.narration} onChange={(e) => setField("narration", e.target.value)} />
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/40 p-3 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <FormInput label="Other Charge" value={form.otherCharge} inputClassName="text-right" onChange={(e) => setField("otherCharge", e.target.value)} />
              <FormInput label="Round Off" value={form.roundOff} inputClassName="text-right" onChange={(e) => setField("roundOff", e.target.value)} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#49293e]/10 bg-white px-3 py-2 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Grand Total</p>
              <p className="text-xl font-bold text-[#49293e]">{formatAmount(totals.grandTotal)}</p>
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
            icon={<Plus size={18} />}
          >
            New
          </Button>
          <Button
            onClick={() => {}} // TODO: Implement save
            isAction
            icon={<Save size={18} />}
          >
            Save
          </Button>
          <Button 
            variant="secondary"
            onClick={() => {}} // TODO: Implement print
            isAction
            icon={<Printer size={18} />}
          >
            Print
          </Button>
          <Button 
            variant="danger" 
            onClick={() => setItems([])}
            isAction
            icon={<Trash2 size={18} />}
          >
            Clear All
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Form"
        message="Are you sure you want to clear the form? All unsaved data will be lost."
        confirmLabel="Clear"
        onConfirm={resetForm}
        onCancel={() => setShowClearConfirm(false)}
      />
    </PageShell>
  );
};

export default PurchaseReturnPage;
