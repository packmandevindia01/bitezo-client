import { useMemo, useRef, useState } from "react";
import { Plus, RotateCcw, Save, X, Ban, FileText } from "lucide-react";
import { Button, FormInput, PageShell } from "../../../../components/common";
import { createEmptyRecipeForm } from "../constants";
import type { RecipeLineItem, RecipeForm } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const currency = (value: number) => value.toFixed(3);

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const RecipePage = () => {
  const { hasPermission } = usePermissions();
  const [form, setForm] = useState<RecipeForm>(createEmptyRecipeForm());
  const [items, setItems] = useState<RecipeLineItem[]>([]);
  const nextItemId = useRef(1);

  const canAdd = hasPermission("Recipe Master", "Add");
  const canEdit = hasPermission("Recipe Master", "Edit");
  const canDelete = hasPermission("Recipe Master", "Delete");
  const canSave = canAdd || canEdit;

  const setField = (key: keyof RecipeForm, value: string) => {
    if (!canSave) return;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const currentLine = useMemo<RecipeLineItem>(
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
    if (!canAdd || !currentLine.product) return;

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
    setForm(createEmptyRecipeForm());
    setItems([]);
  };

  return (
    <PageShell title="Recipe">
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-gray-100 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Master
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wide text-gray-900">
              <FileText size={24} className="text-[#49293e]" />
              Recipe
            </h1>
          </div>
          {/* Action buttons moved to the bottom */}
        </div>

        <div className="grid gap-x-4 gap-y-1 md:grid-cols-4 lg:grid-cols-5">
          <FormInput 
            label="Finished Product" 
            value={form.finishedProduct} 
            onChange={(e) => setField("finishedProduct", e.target.value)} 
            required
            readOnly={!canSave}
          />
          <FormInput 
            label="Code" 
            value={form.finishedProductCode} 
            onChange={(e) => setField("finishedProductCode", e.target.value)} 
            required
            readOnly={!canSave}
          />
          <FormInput 
            label="Unit" 
            value={form.finishedProductUnit} 
            onChange={(e) => setField("finishedProductUnit", e.target.value)} 
            required
            readOnly={!canSave}
          />
          <FormInput 
            label="Qty" 
            value={form.finishedProductQty} 
            onChange={(e) => setField("finishedProductQty", e.target.value)} 
            required
            readOnly={!canSave}
          />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
            <FormInput label="Product" value={form.product} onChange={(e) => setField("product", e.target.value)} readOnly={!canAdd} />
            <FormInput label="Code" value={form.code} onChange={(e) => setField("code", e.target.value)} readOnly={!canAdd} />
            <FormInput label="Unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} readOnly={!canAdd} />
            <FormInput label="Qty" value={form.qty} onChange={(e) => setField("qty", e.target.value)} readOnly={!canAdd} />
            <FormInput label="Cost" value={form.cost} onChange={(e) => setField("cost", e.target.value)} readOnly={!canAdd} />
            <div className="flex items-end pb-4">
              <Button onClick={addItem} className="h-10 w-full px-8" disabled={!canAdd}>
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

        <div className="mt-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="pt-2">
            <Button variant="secondary" className="border-gray-200 shadow-sm mb-2 text-gray-700" disabled={!canSave}>
              <Ban size={16} className="text-gray-500" />
              Exclude Order
            </Button>
            <p className="text-xs text-gray-500 max-w-xs">
              Exclude product from some orders (eg: dine in no need container)
            </p>
          </div>

          <div className="w-full md:w-80 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <FormInput
              label="Other Charge"
              value={form.otherCharge}
              onChange={(e) => setField("otherCharge", e.target.value)}
              readOnly={!canSave}
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
              {canAdd && (
                <Button variant="secondary" onClick={resetForm}>
                  <RotateCcw size={16} />
                  New
                </Button>
              )}
              {canSave && (
                <Button>
                  <Save size={16} />
                  Save
                </Button>
              )}
              {canDelete && (
                <Button variant="secondary" className="text-red-500 hover:text-red-600">
                  <X size={16} />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default RecipePage;
