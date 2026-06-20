import { useEffect, useMemo, useState } from "react";
import { AlertCircle, X, Save, RotateCcw, Ban, Trash2, Plus, Printer } from "lucide-react";
import { Button, FormInput, PageShell, SelectInput, SearchableSelect } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import StockAdjustmentPrintModal from "../components/StockAdjustmentPrintModal";
import type { StockAdjustmentLineItem } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useStockAdjustment } from "../hooks/useStockAdjustment";
import { useSearchParams } from "react-router-dom";

const StockAdjustmentPage = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const { formatAmount } = useCurrency();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const {
    form,
    setForm,
    items,
    setItems,
    nextItemId,
    loading,
    saving,
    error,
    setError,
    branches,
    employees,
    productOptions,
    barcodeOptions,
    types,
    setField,
    handleProductSelect,
    handleBarcodeSelect,
    handleTypeSelect,
    handleSave,
    initialForm
  } = useStockAdjustment(id);

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") { e.preventDefault(); if (nextId) document.getElementById(nextId)?.focus(); }
  };

  useEffect(() => { setTimeout(() => { document.getElementById("sa-series")?.focus(); }, 200); }, []);

  const toNumber = (value: string) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const currentLine = useMemo<StockAdjustmentLineItem>(
    () => ({
      id: 0,
      productId: parseInt(form.product, 10) || 0,
      product: form.product.trim(),
      code: form.code.trim(),
      unitId: parseInt(form.unit, 10) || 0,
      unit: form.unit.trim(),
      qty: toNumber(form.qty),
      cost: toNumber(form.cost),
      typeId: parseInt(form.type, 10) || 0,
      type: form.type,
      effect: form.effect,
      amount: toNumber(form.qty) * toNumber(form.cost),
    }),
    [form, toNumber]
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
    setTimeout(() => document.getElementById("sa-product")?.focus(), 0);
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

  if (loading) {
    return (
      <PageShell title="Stock Adjustment">
        <div className="flex h-64 items-center justify-center">
          <div className="text-slate-500">Loading master data...</div>
        </div>
      </PageShell>
    );
  }


  return (
    <PageShell title="Stock Adjustment">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ maxHeight: "calc(100vh - 120px)" }}>
        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">

        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 mx-3 md:mx-4 mt-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="shrink-0 rounded p-0.5 hover:bg-red-100">
              <X size={14} />
            </button>
          </div>
        )}

        <div className="grid gap-x-3 gap-y-2 md:grid-cols-5">
          <FormInput id="sa-series" label="Series" value={form.series} onChange={(e) => setField("series", e.target.value)} onKeyDown={(e) => hk(e, "sa-refNo")} required />
          <FormInput id="sa-refNo" label="Ref No" value={form.refNo} onChange={(e) => setField("refNo", e.target.value)} onKeyDown={(e) => hk(e, "sa-date")} readOnly required />
          <FormInput id="sa-date" label="Date" type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} onKeyDown={(e) => hk(e, "sa-branch")} required />
          <SelectInput 
            id="sa-branch" 
            label="Branch" 
            value={form.branch} 
            onChange={(e) => setField("branch", e.target.value)} 
            options={branches}
            required 
          />
          <SelectInput 
            id="sa-salesman" 
            label="Salesman" 
            value={form.salesman} 
            onChange={(e) => setField("salesman", e.target.value)} 
            options={employees}
            required 
          />
        </div>

        <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50/70 p-2">
          <div className="grid gap-x-2 gap-y-1 md:grid-cols-[1.5fr_1fr_1fr_0.6fr_0.6fr_0.8fr_0.8fr_0.8fr_auto]">
            <SearchableSelect 
              id="sa-product" 
              label="Product" 
              value={form.product} 
              onChange={handleProductSelect} 
              options={productOptions}
            />
            <SearchableSelect 
              id="sa-code" 
              label="Code" 
              value={form.code} 
              onChange={handleBarcodeSelect} 
              options={barcodeOptions}
            />
            <FormInput id="sa-unit" label="Unit" value={form.unit} onChange={(e) => setField("unit", e.target.value)} onKeyDown={(e) => hk(e, "sa-qty")} readOnly />
            <FormInput id="sa-qty" label="Qty" type="number" value={form.qty} inputClassName="text-right" onChange={(e) => setField("qty", e.target.value)} onKeyDown={(e) => hk(e, "sa-cost")} />
            <FormInput id="sa-cost" label="Cost" type="number" value={form.cost} inputClassName="text-right" onChange={(e) => setField("cost", e.target.value)} onKeyDown={(e) => hk(e, "sa-type")} />
            <FormInput label="Amt" value={formatAmount(currentLine.amount)} inputClassName="text-right" readOnly />
            
            <SelectInput 
              id="sa-type" 
              label="Type" 
              value={form.type} 
              onChange={(e) => handleTypeSelect(e.target.value)} 
              options={types}
            />

            <div className="flex flex-col gap-1 mb-1 w-full">
              <label htmlFor="sa-effect" className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Effect</label>
              <select 
                id="sa-effect"
                className="w-full px-3 h-10.5 text-sm rounded-md border border-gray-300 bg-white outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20"
                value={form.effect}
                onChange={(e) => setField("effect", e.target.value)}
                onKeyDown={(e) => hk(e, "sa-add-btn")}
              >
                <option value="">+/-</option>
                <option value="+">+</option>
                <option value="-">-</option>
              </select>
            </div>

            <div className="flex items-end pb-1">
              <Button 
                id="sa-add-btn" 
                onClick={addItem} 
                className="h-10.5 w-full"
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addItem(); } }}
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
                  {["Product", "Code", "Unit", "Qty", "Cost", "Type", "Effect", "Amount"].map(
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
                    <td colSpan={8} className="h-28 px-4 text-center text-sm text-gray-400">
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
                      <td className="px-4 py-3">{item.type || "-"}</td>
                      <td className="px-4 py-3 font-bold text-[#49293e]">{item.effect || "-"}</td>
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

        <div className="mt-3 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="pb-4">
            <Button 
              variant="secondary" 
              isAction
              icon={<Ban size={18} />}
            />
          </div>

          <div className="w-full md:w-80 rounded-xl border border-gray-100 bg-gray-50/40 p-3 flex flex-col gap-2">
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
            variant="secondary"
            onClick={() => setIsPrintModalOpen(true)}
            isAction
            icon={<Printer size={18} />}
          >
            Export / Print
          </Button>
          <Button
            onClick={handleSave}
            loading={saving}
            disabled={saving}
            isAction
            icon={<Save size={18} />}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button 
            variant="danger" 
            onClick={() => setItems([])}
            isAction
            icon={<Trash2 size={18} />}
          >
            Clear All
          </Button>
          <Button 
            variant="secondary"
            onClick={handleClearClick}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Clear
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

      <StockAdjustmentPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        form={form}
        items={items}
        branches={branches}
      />
    </PageShell>
  );
};

export default StockAdjustmentPage;
