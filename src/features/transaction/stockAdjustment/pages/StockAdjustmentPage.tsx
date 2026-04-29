import { useMemo, useRef, useState } from "react";
import { Plus, RotateCcw, Save, X, FileText, Ban } from "lucide-react";
import { Button, FormInput, PageShell } from "../../../../components/common";
import { createEmptyStockAdjustmentForm } from "../constants";
import type { StockAdjustmentLineItem, StockAdjustmentForm } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";

const StockAdjustmentPage = () => {
  const { formatAmount } = useCurrency();
  const [form, setForm] = useState<StockAdjustmentForm>(() => {
    const empty = createEmptyStockAdjustmentForm();
    empty.cost = formatAmount(0);
    empty.amount = formatAmount(0);
    return empty;
  });
  const [items, setItems] = useState<StockAdjustmentLineItem[]>([]);

  const nextItemId = useRef(1);

  const setField = (key: keyof StockAdjustmentForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const currentLine = useMemo<StockAdjustmentLineItem>(
    () => ({
      id: 0,
      product: form.product.trim(),
      code: form.code.trim(),
      unit: form.unit.trim(),
      qty: toNumber(form.qty),
      cost: toNumber(form.cost),
      type: form.type,
      effect: form.effect,
      amount: toNumber(form.qty) * toNumber(form.cost),
    }),
    [form]
  );

  const totals = useMemo(() => {
    const grandTotal = items.reduce((acc, item) => {
      const multiplier = item.effect === "-" ? -1 : 1;
      return acc + (item.amount * multiplier);
    }, 0);

    return {
      grandTotal,
    };
  }, [items]);

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
      cost: formatAmount(0),
      amount: formatAmount(0),
      type: "",
      effect: "",
    }));
  };

  const resetForm = () => {
    setForm(() => {
      const empty = createEmptyStockAdjustmentForm();
      empty.cost = formatAmount(0);
      empty.amount = formatAmount(0);
      return empty;
    });
    setItems([]);
  };


  return (
    <PageShell title="Stock Adjustment">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Transaction
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wide text-gray-900">
              <FileText size={24} className="text-[#49293e]" />
              Stock Adjustment
            </h1>
          </div>
        </div>

        <div className="grid gap-x-4 gap-y-1 md:grid-cols-5">
          <FormInput 
            label="Series" 
            value={form.series} 
            onChange={(e) => setField("series", e.target.value)} 
            required
          />
          <FormInput 
            label="Ref No" 
            value={form.refNo} 
            onChange={(e) => setField("refNo", e.target.value)} 
            required
          />
          <FormInput 
            label="Date" 
            type="date"
            value={form.date} 
            onChange={(e) => setField("date", e.target.value)} 
            required
          />
          <FormInput 
            label="Branch" 
            value={form.branch} 
            onChange={(e) => setField("branch", e.target.value)} 
            required
          />
          <FormInput 
            label="Salesman" 
            value={form.salesman} 
            onChange={(e) => setField("salesman", e.target.value)} 
            required
          />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-[1.5fr_1fr_1fr_0.8fr_0.8fr_0.8fr_1fr_0.8fr_auto]">
            <FormInput label="Product" value={form.product} onChange={(e) => setField("product", e.target.value)} />
            <FormInput label="Code" value={form.code} onChange={(e) => setField("code", e.target.value)} />
            <FormInput label="Unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} />
            <FormInput label="Qty" value={form.qty} onChange={(e) => setField("qty", e.target.value)} />
            <FormInput label="Cost" value={form.cost} onChange={(e) => setField("cost", e.target.value)} />
            <FormInput label="Amt" value={formatAmount(currentLine.amount)} readOnly />
            
            <div className="flex flex-col gap-1 mb-4 w-full">
              <label className="text-xs md:text-sm font-medium text-gray-700">Type</label>
              <select 
                className="w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-md border border-gray-300 bg-white outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20"
                value={form.type}
                onChange={(e) => setField("type", e.target.value)}
              >
                <option value="">choose</option>
                <option value="Damage">Damage</option>
                <option value="Expiry">Expiry</option>
                <option value="Found">Found</option>
              </select>
            </div>

            <div className="flex flex-col gap-1 mb-4 w-full">
              <label className="text-xs md:text-sm font-medium text-gray-700">Effect</label>
              <select 
                className="w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-md border border-gray-300 bg-white outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20"
                value={form.effect}
                onChange={(e) => setField("effect", e.target.value)}
              >
                <option value="">+/-</option>
                <option value="+">+</option>
                <option value="-">-</option>
              </select>
            </div>

            <div className="flex items-end pb-4">
              <Button onClick={addItem} className="h-10 w-full px-8">
                <Plus size={16} />
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  {["Product", "Code", "Unit", "Qty", "Cost", "Type", "Effect", "Amount"].map(
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
                    <td colSpan={8} className="h-28 px-4 text-center text-sm text-gray-400">
                      No items added
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-[#49293e]/5">
                      <td className="border-l-[3px] border-l-[#49293e] px-4 py-3 font-medium text-gray-900">
                        {item.product}
                      </td>
                      <td className="px-4 py-3">{item.code || "-"}</td>
                      <td className="px-4 py-3">{item.unit || "-"}</td>
                      <td className="px-4 py-3">{item.qty}</td>
                      <td className="px-4 py-3 font-mono">{formatAmount(item.cost)}</td>
                      <td className="px-4 py-3">{item.type || "-"}</td>
                      <td className="px-4 py-3 font-bold text-[#49293e]">{item.effect || "-"}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900">{formatAmount(item.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="pt-2 md:pb-6">
            <Button variant="secondary" className="border-gray-200 shadow-sm mb-2 text-gray-700 min-w-[140px] justify-center">
              <Ban size={16} className="text-gray-500" />
              Stock Zero
            </Button>
          </div>

          <div className="w-full md:w-80 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <div className="rounded-xl border border-[#49293e]/15 bg-white px-4 py-3 mb-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Grand Total</p>
              <p className="mt-1 text-2xl font-bold text-[#49293e]">{formatAmount(totals.grandTotal)}</p>
            </div>
            
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={resetForm}>
                <RotateCcw size={16} />
                New
              </Button>
              <Button>
                <Save size={16} />
                Save
              </Button>
              <Button variant="secondary" className="text-red-500 hover:text-red-600">
                <X size={16} />
                Delete
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default StockAdjustmentPage;
