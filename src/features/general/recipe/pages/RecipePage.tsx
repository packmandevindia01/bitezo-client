import { useEffect, useMemo, useRef, useState } from "react";
import { Save, Ban, Trash2, Plus } from "lucide-react";
import { Button, FormInput, PageShell } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { createEmptyRecipeForm } from "../constants";
import type { RecipeLineItem, RecipeForm } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useCurrency } from "../../../../hooks/useCurrency";

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const RecipePage = () => {
  const { hasPermission } = usePermissions();
  const { formatAmount } = useCurrency();
  const initialForm = useMemo(() => {
    const empty = createEmptyRecipeForm();
    empty.cost = formatAmount(0);
    empty.otherCharge = formatAmount(0);
    return empty;
  }, [formatAmount]);

  const [form, setForm] = useState<RecipeForm>(initialForm);
  const [items, setItems] = useState<RecipeLineItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const nextItemId = useRef(1);

  const canAdd = hasPermission("Recipe Master", "Add");
  const canEdit = hasPermission("Recipe Master", "Edit");
  const canDelete = hasPermission("Recipe Master", "Delete");
  const canSave = canAdd || canEdit;

  const setField = (key: keyof RecipeForm, value: string) => {
    if (!canSave) return;
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") { e.preventDefault(); if (nextId) document.getElementById(nextId)?.focus(); }
  };

  useEffect(() => { setTimeout(() => { document.getElementById("rec-finProduct")?.focus(); }, 200); }, []);

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
      cost: formatAmount(0),
    }));
    setTimeout(() => document.getElementById("rec-product")?.focus(), 0);
  };

  const handleReset = () => {
    setForm(initialForm);
    setItems([]);
    setShowClearConfirm(false);
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
    <PageShell title="Recipe">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 120px)" }}>
        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">

        <div className="grid gap-x-4 gap-y-1 md:grid-cols-4 lg:grid-cols-5">
          <FormInput id="rec-finProduct" label="Finished Product" value={form.finishedProduct} onChange={(e) => setField("finishedProduct", e.target.value)} onKeyDown={(e) => hk(e, "rec-finCode")} required readOnly={!canSave} />
          <FormInput id="rec-finCode" label="Code" value={form.finishedProductCode} onChange={(e) => setField("finishedProductCode", e.target.value)} onKeyDown={(e) => hk(e, "rec-finUnit")} required readOnly={!canSave} />
          <FormInput id="rec-finUnit" label="Unit" value={form.finishedProductUnit} onChange={(e) => setField("finishedProductUnit", e.target.value)} onKeyDown={(e) => hk(e, "rec-finQty")} required readOnly={!canSave} />
          <FormInput id="rec-finQty" label="Qty" value={form.finishedProductQty} onChange={(e) => setField("finishedProductQty", e.target.value)} onKeyDown={(e) => hk(e, "rec-product")} required readOnly={!canSave} />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
            <FormInput id="rec-product" label="Product" value={form.product} onChange={(e) => setField("product", e.target.value)} onKeyDown={(e) => hk(e, "rec-code")} readOnly={!canAdd} />
            <FormInput id="rec-code" label="Code" value={form.code} onChange={(e) => setField("code", e.target.value)} onKeyDown={(e) => hk(e, "rec-unit")} readOnly={!canAdd} />
            <FormInput id="rec-unit" label="Unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} onKeyDown={(e) => hk(e, "rec-qty")} readOnly={!canAdd} />
            <FormInput id="rec-qty" label="Qty" value={form.qty} onChange={(e) => setField("qty", e.target.value)} onKeyDown={(e) => hk(e, "rec-cost")} readOnly={!canAdd} />
            <FormInput id="rec-cost" label="Cost" value={form.cost} onChange={(e) => setField("cost", e.target.value)} onKeyDown={(e) => hk(e, "rec-add-btn")} readOnly={!canAdd} />
            <div className="flex items-end pb-1">
              <Button
                id="rec-add-btn"
                onClick={addItem}
                className="h-10.5 w-full px-8"
                disabled={!canAdd}
                icon={<Plus size={18} />}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
              >
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
                    <tr key={item.id} className="group hover:bg-[#49293e]/5 transition-colors">
                      <td className="border-l-[3px] border-l-[#49293e] px-4 py-3 font-medium text-gray-900">
                        {item.product}
                      </td>
                      <td className="px-4 py-3">{item.code || "-"}</td>
                      <td className="px-4 py-3">{item.unit || "-"}</td>
                      <td className="px-4 py-3">{item.qty}</td>
                      <td className="px-4 py-3 font-mono">{formatAmount(item.cost)}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900">{formatAmount(item.amount)}</td>
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
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="pt-2">
            <Button 
              variant="secondary" 
              className="border-gray-200 shadow-sm mb-2 text-gray-700" 
              disabled={!canSave}
              isAction
              icon={<Ban size={18} className="text-gray-500" />}
            >
              Exclude
            </Button>
            <p className="text-[10px] font-medium text-gray-500 max-w-[200px] leading-relaxed">
              Exclude product from some orders (eg: dine in no need container)
            </p>
          </div>

          <div className="w-full md:w-80 rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
            <FormInput
              label="Other Charge"
              value={form.otherCharge}
              inputClassName="text-right"
              onChange={(e) => setField("otherCharge", e.target.value)}
              readOnly={!canSave}
            />
            <div className="mt-2 rounded-xl border border-[#49293e]/15 bg-white px-4 py-3 mb-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Grand Total</p>
              <p className="mt-1 text-2xl font-bold text-[#49293e]">{formatAmount(totals.grandTotal)}</p>
            </div>
            <FormInput
              label="Cost/Unit"
              value={formatAmount(totals.costPerUnit)}
              inputClassName="text-right"
              readOnly
            />
            
          </div>
        </div>
        </div>{/* end scrollable body */}

        {/* ── Sticky Action Footer ── */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 bg-white px-4 py-3 md:px-6 rounded-b-3xl">
          {canAdd && (
            <Button 
              variant="secondary" 
              onClick={handleClearClick} 
              tabIndex={-1}
              isAction
              icon={<Plus size={18} />}
            >
              New
            </Button>
          )}
          {canSave && (
            <Button
              isAction
              icon={<Save size={18} />}
            >
              Save
            </Button>
          )}
          {canDelete && (
            <Button 
              variant="danger" 
              onClick={() => setItems([])}
              isAction
              icon={<Trash2 size={18} />}
            >
              Delete
            </Button>
          )}
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

export default RecipePage;
