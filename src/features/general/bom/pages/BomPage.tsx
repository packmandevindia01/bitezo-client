import { useMemo, useRef, useState } from "react";
import { Plus, RotateCcw, Save, X, FileText } from "lucide-react";
import { Button, FormInput, PageShell } from "../../../../components/common";
import { createEmptyBomForm } from "../constants";
import type { BomLineItem, BomForm } from "../types";

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const BomPage = () => {
  const [form, setForm] = useState<BomForm>(createEmptyBomForm());
  const [items, setItems] = useState<BomLineItem[]>([]);
  const nextItemId = useRef(1);

  const setField = (key: keyof BomForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const currentLine = useMemo<BomLineItem>(
    () => ({
      id: 0,
      product: form.product.trim(),
      code: form.code.trim(),
      unit: form.unit.trim(),
      qty: toNumber(form.qty),
    }),
    [form]
  );

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
    }));
  };

  const resetForm = () => {
    setForm(createEmptyBomForm());
    setItems([]);
  };

  return (
    <PageShell title="BOM">
      <div className="mx-auto max-w-5xl rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Master
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wide text-gray-900">
              <FileText size={24} className="text-[#49293e]" />
              BOM
            </h1>
          </div>
        </div>

        <div className="grid gap-x-4 gap-y-1 md:grid-cols-4">
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
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-[2fr_1fr_1fr_1fr_auto]">
            <FormInput label="Raw Materials" value={form.product} onChange={(e) => setField("product", e.target.value)} />
            <FormInput label="Code" value={form.code} onChange={(e) => setField("code", e.target.value)} />
            <FormInput label="Unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} />
            <FormInput label="Qty" value={form.qty} onChange={(e) => setField("qty", e.target.value)} />
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
                  {["Product", "Code", "Unit", "Qty"].map(
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
                    <td colSpan={4} className="h-28 px-4 text-center text-sm text-gray-400">
                      No materials added
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={resetForm} className="min-w-[120px] justify-center">
            <RotateCcw size={16} />
            New
          </Button>
          <Button className="min-w-[120px] justify-center">
            <Save size={16} />
            Save
          </Button>
          <Button variant="secondary" className="min-w-[120px] justify-center text-red-500 hover:text-red-600">
            <X size={16} />
            Delete
          </Button>
        </div>
      </div>
    </PageShell>
  );
};

export default BomPage;
