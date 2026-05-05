import { useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw, Save, X, FileText, Download } from "lucide-react";
import { Button, FormInput, PageShell } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { createEmptyProductionForm } from "../constants";
import type { ProductionLineItem, ProductionForm } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";

const ProductionPage = () => {
  const { formatAmount } = useCurrency();
  const initialForm = useMemo(() => {
    const empty = createEmptyProductionForm();
    empty.cost = formatAmount(0);
    empty.otherCharge = formatAmount(0);
    return empty;
  }, [formatAmount]);

  const [form, setForm] = useState<ProductionForm>(initialForm);
  const [items, setItems] = useState<ProductionLineItem[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const nextItemId = useRef(1);

  const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const setField = (key: keyof ProductionForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") { e.preventDefault(); if (nextId) document.getElementById(nextId)?.focus(); }
  };

  useEffect(() => { setTimeout(() => { document.getElementById("prod-finProduct")?.focus(); }, 200); }, []);

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
      cost: formatAmount(0),
    }));
    setTimeout(() => document.getElementById("prod-product")?.focus(), 0);
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
    <PageShell title="Production">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 120px)" }}>
        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="mb-5 border-b border-gray-100 pb-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400">
              Transaction
            </p>
            <h1 className="flex items-center gap-2 text-2xl font-bold uppercase tracking-wide text-gray-900">
              <FileText size={24} className="text-[#49293e]" />
              Production
            </h1>
          </div>

        <div className="grid gap-x-4 gap-y-1 md:grid-cols-4 lg:grid-cols-5">
          <FormInput id="prod-finProduct" label="Finished Product" value={form.finishedProduct} onChange={(e) => setField("finishedProduct", e.target.value)} onKeyDown={(e) => hk(e, "prod-finCode")} required />
          <FormInput id="prod-finCode" label="Code" value={form.finishedProductCode} onChange={(e) => setField("finishedProductCode", e.target.value)} onKeyDown={(e) => hk(e, "prod-finUnit")} required />
          <FormInput id="prod-finUnit" label="Unit" value={form.finishedProductUnit} onChange={(e) => setField("finishedProductUnit", e.target.value)} onKeyDown={(e) => hk(e, "prod-finQty")} required />
          <FormInput id="prod-finQty" label="Qty" value={form.finishedProductQty} onChange={(e) => setField("finishedProductQty", e.target.value)} onKeyDown={(e) => hk(e, "prod-product")} required />
        </div>

        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
          <div className="grid gap-x-3 gap-y-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
            <FormInput id="prod-product" label="Finished Product" value={form.product} onChange={(e) => setField("product", e.target.value)} onKeyDown={(e) => hk(e, "prod-code")} />
            <FormInput id="prod-code" label="Code" value={form.code} onChange={(e) => setField("code", e.target.value)} onKeyDown={(e) => hk(e, "prod-unit")} />
            <FormInput id="prod-unit" label="Unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} onKeyDown={(e) => hk(e, "prod-qty")} />
            <FormInput id="prod-qty" label="Qty" value={form.qty} onChange={(e) => setField("qty", e.target.value)} onKeyDown={(e) => hk(e, "prod-cost")} />
            <FormInput id="prod-cost" label="Cost" value={form.cost} onChange={(e) => setField("cost", e.target.value)} onKeyDown={(e) => hk(e, "prod-add-btn")} />
            <div className="flex items-end pb-4">
              <Button id="prod-add-btn" onClick={addItem} className="h-10 w-full px-8"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}>
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
                      <td className="px-4 py-3 font-mono">{formatAmount(item.cost)}</td>
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
              <p className="mt-1 text-2xl font-bold text-[#49293e]">{formatAmount(totals.grandTotal)}</p>
            </div>
            <FormInput
              label="Cost/Unit"
              value={formatAmount(totals.costPerUnit)}
              readOnly
            />
            
          </div>
        </div>
        </div>{/* end scrollable body */}

        {/* ── Sticky Action Footer ── */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-200 bg-white px-4 py-3 md:px-6 rounded-b-3xl">
          <Button variant="secondary" onClick={handleClearClick}>
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

export default ProductionPage;
