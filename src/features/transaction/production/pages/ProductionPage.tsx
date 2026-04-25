import { useMemo, useRef, useState } from "react";
import { Plus, RotateCcw, Save, X, FileText, Download } from "lucide-react";
import { Button, FormInput, PageShell } from "../../../../components/common";
import { createEmptyProductionForm } from "../constants";
import type { ProductionLineItem, ProductionForm } from "../types";

const currency = (value: number) => value.toFixed(3);

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const ProductionPage = () => {
  const [form, setForm] = useState<ProductionForm>(createEmptyProductionForm());
  const [items, setItems] = useState<ProductionLineItem[]>([]);
  const nextItemId = useRef(1);

  const setField = (key: keyof ProductionForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const currentLine = useMemo<ProductionLineItem>(
    () => ({
      id: 0,
      product: form.product.trim(),
      code: form.code.trim(),
      unit: form.unit.trim(),
      qty: toNumber(form.qty),
      cost: toNumber(form.cost),
      amount: toNumber(form.qty) * toNumber(form.cost),
    }),
    [form]
  );

  const totals = useMemo(() => {
    const itemTotal = items.reduce((acc, item) => acc + item.amount, 0);
    const otherCharge = toNumber(form.otherCharge);
    const grandTotal = itemTotal + otherCharge;
    const costPerUnit = toNumber(form.finishedProductQty) > 0 ? grandTotal / toNumber(form.finishedProductQty) : 0;

    return {
      grandTotal,
      costPerUnit,
    };
  }, [items, form.otherCharge, form.finishedProductQty]);

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
      cost: "0.000",
    }));
  };

  const resetForm = () => {
    setForm(createEmptyProductionForm());
    setItems([]);
  };

  return (
    <PageShell title="Production">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Transaction
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wide text-gray-900">
              <FileText size={24} className="text-[#49293e]" />
              Production
            </h1>
          </div>
        </div>

        <div className="grid gap-x-4 gap-y-1 md:grid-cols-4 lg:grid-cols-5">
          <FormInput 
            label="Finished Product" 
            value={form.finishedProduct} 
            onChange={(e) => setField("finishedProduct", e.target.value)} 
            required
          />
          <FormInput 
            label="Code" 
            value={form.finishedProductCode} 
            onChange={(e) => setField("finishedProductCode", e.target.value)} 
            required
          />
          <FormInput 
            label="Unit" 
            value={form.finishedProductUnit} 
            onChange={(e) => setField("finishedProductUnit", e.target.value)} 
            required
          />
          <FormInput 
            label="Qty" 
            value={form.finishedProductQty} 
            onChange={(e) => setField("finishedProductQty", e.target.value)} 
            required
          />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
            <FormInput label="Finished Product" value={form.product} onChange={(e) => setField("product", e.target.value)} />
            <FormInput label="Code" value={form.code} onChange={(e) => setField("code", e.target.value)} />
            <FormInput label="Unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} />
            <FormInput label="Qty" value={form.qty} onChange={(e) => setField("qty", e.target.value)} />
            <FormInput label="Cost" value={form.cost} onChange={(e) => setField("cost", e.target.value)} />
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
                  {["Product", "Code", "Unit", "Qty", "Cost", "Amount"].map(
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
                    <td colSpan={6} className="h-28 px-4 text-center text-sm text-gray-400">
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
                      <td className="px-4 py-3">{currency(item.cost)}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{currency(item.amount)}</td>
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
              <Download size={16} className="text-gray-500" />
              Load BOM
            </Button>
          </div>

          <div className="w-full md:w-80 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <FormInput
              label="Other Charge"
              value={form.otherCharge}
              onChange={(e) => setField("otherCharge", e.target.value)}
            />
            <div className="mt-2 rounded-xl border border-[#49293e]/15 bg-white px-4 py-3 mb-2">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-gray-500">Grand Total</p>
              <p className="mt-1 text-2xl font-bold text-[#49293e]">{currency(totals.grandTotal)}</p>
            </div>
            <FormInput
              label="Cost/Unit"
              value={currency(totals.costPerUnit)}
              readOnly
            />
            
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

export default ProductionPage;
