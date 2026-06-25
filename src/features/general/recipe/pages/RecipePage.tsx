import { useState, useEffect } from "react";
import { Save, Ban, Trash2, Plus, Loader2, AlertCircle } from "lucide-react";
import { Button, FormInput, PageShell, SearchableSelect, SelectInput, Checkbox, Modal } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useRecipeForm } from "../hooks/useRecipeForm";
import { useParams } from "react-router-dom";

const RecipePage = () => {
  const { id } = useParams();
  const { hasPermission } = usePermissions();
  const { formatAmount, decimalPart } = useCurrency();
  const step = Math.pow(10, -decimalPart).toString();

  const {
    form,
    items,
    remove,
    totals,
    isLoadingInitialData,
    isInitialDataError,
    initialDataError,
    isSaving,
    finishedProducts,
    rawMaterials,
    branches,
    orderTypes,
    handleFinishedProductSelect,
    handleRawMaterialSelect,
    handleAddItem,
    onSubmit
  } = useRecipeForm(id ? parseInt(id, 10) : undefined);

  const { watch, setValue } = form;

  const handleMoneyBlur = (field: Parameters<typeof setValue>[0], value: string) => {
    const num = Number(value);
    if (!isNaN(num)) {
      setValue(field, num.toFixed(decimalPart));
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const canAdd    = hasPermission("Recipe Master", "Add");
  const canEdit   = hasPermission("Recipe Master", "Edit");
  const canDelete = hasPermission("Recipe Master", "Delete");
  const canSave   = canAdd || canEdit;

  const handleClearClick = () => {
    if (items.length > 0) {
      setShowClearConfirm(true);
    } else {
      form.reset();
    }
  };

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") { e.preventDefault(); if (nextId) document.getElementById(nextId)?.focus(); }
  };

  const [excludeOrdersModalOpen, setExcludeOrdersModalOpen] = useState(false);
  const [excludeOrdersTarget, setExcludeOrdersTarget] = useState<"master" | number>("master");
  
  const handleExcludeOrdersClick = (target: "master" | number) => {
    setExcludeOrdersTarget(target);
    setExcludeOrdersModalOpen(true);
  };

  useEffect(() => { setTimeout(() => { document.getElementById("rec-finProduct")?.focus(); }, 200); }, []);

  if (isLoadingInitialData) {
    return (
      <PageShell title="Recipe">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#49293e]" />
        </div>
      </PageShell>
    );
  }

  if (isInitialDataError) {
    return (
      <PageShell title="Recipe">
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle size={24} />
            <span className="text-lg font-medium">Failed to load Recipe Data</span>
          </div>
          <p className="text-sm text-gray-500">
            {initialDataError instanceof Error ? initialDataError.message : "The recipe could not be found or the server returned an error."}
          </p>
          <Button onClick={() => window.history.back()} variant="secondary">Go Back</Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title={id ? "Edit Recipe" : "Add Recipe"}>
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ height: "calc(100vh - 120px)" }}>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">

          {/* ── Row 1: Finished Product Header (5 cols) ── */}
          <div className="grid gap-x-4 gap-y-3 grid-cols-1 md:grid-cols-3 lg:grid-cols-5 border-b border-gray-100 pb-4 mb-4">
            <SearchableSelect
              id="rec-finProduct"
              label="Finished Product"
              options={finishedProducts}
              value={watch("finishedProduct")}
              onChange={(val) => handleFinishedProductSelect(val)}
              required
              disabled={!canSave}
              tabIndex={1}
            />
            <FormInput
              id="rec-finCode"
              label="Code"
              value={watch("finishedProductCode") || ""}
              onChange={(e) => setValue("finishedProductCode", e.target.value)}
              onKeyDown={(e) => hk(e, "rec-finUnit")}
              required
              readOnly={!canSave}
              tabIndex={2}
            />
            <FormInput
              id="rec-finUnit"
              label="Unit"
              value={watch("finishedProductUnitName") || watch("finishedProductUnit")}
              onChange={(e) => setValue("finishedProductUnitName", e.target.value)}
              required
              disabled
              className="bg-gray-50 cursor-not-allowed"
              tabIndex={3}
            />
            <FormInput
              id="rec-finQty"
              label="Qty"
              type="number"
              min={0}
              step={step}
              inputClassName="text-right"
              value={watch("finishedProductQty")}
              onChange={(e) => setValue("finishedProductQty", e.target.value)}
              onKeyDown={(e) => hk(e, "rec-branch")}
              required
              readOnly={!canSave}
              tabIndex={4}
            />
            <SelectInput
              id="rec-branch"
              label="Branch"
              options={branches}
              value={watch("branchId")}
              onChange={(e) => setValue("branchId", e.target.value)}
              required
              disabled={!canSave}
              tabIndex={5}
            />
          </div>

          {/* ── Row 2: Raw Material Entry Row ── */}
          <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50/70 p-3">
            <div className="grid gap-x-3 gap-y-3 grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto]">
              <SearchableSelect
                id="rec-rawMaterial"
                label="Raw Material"
                options={rawMaterials}
                value={watch("rawMaterial") || ""}
                onChange={(val) => handleRawMaterialSelect(val)}
                disabled={!canAdd}
                tabIndex={6}
              />
              <FormInput
                id="rec-code"
                label="Code"
                value={watch("code") || ""}
                onChange={(e) => setValue("code", e.target.value)}
                onKeyDown={(e) => hk(e, "rec-unit")}
                readOnly={!canAdd}
                tabIndex={7}
              />
              <FormInput
                id="rec-unit"
                label="Unit"
                value={watch("unitName") || watch("unit") || ""}
                onChange={(e) => setValue("unitName", e.target.value)}
                onKeyDown={(e) => hk(e, "rec-qty")}
                disabled
                className="bg-gray-50 cursor-not-allowed"
                tabIndex={8}
              />
              <FormInput
                id="rec-qty"
                label="Qty"
                type="number"
                min={0}
                step={step}
                inputClassName="text-right"
                value={watch("qty") || ""}
                onChange={(e) => setValue("qty", e.target.value)}
                onKeyDown={(e) => hk(e, "rec-cost")}
                readOnly={!canAdd}
                tabIndex={9}
              />
              <FormInput
                id="rec-cost"
                label="Cost"
                type="number"
                min={0}
                step={step}
                inputClassName="text-right"
                value={watch("cost") || ""}
                onChange={(e) => setValue("cost", e.target.value)}
                onBlur={(e) => handleMoneyBlur("cost", e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleAddItem(); }
                }}
                readOnly={!canAdd}
                tabIndex={10}
              />
              <FormInput
                id="rec-amount"
                label="Amount"
                type="number"
                step={step}
                inputClassName="text-right font-mono font-bold text-[#49293e]"
                value={watch("amount") || ""}
                disabled
                className="bg-gray-50/50 cursor-not-allowed"
                tabIndex={-1}
              />
              <div className="flex items-end pb-1">
                <Button
                  id="rec-add-btn"
                  onClick={handleAddItem}
                  className="h-10.5 w-full px-6"
                  disabled={!canAdd}
                  icon={<Plus size={18} />}
                  tabIndex={11}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAddItem(); }
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* ── Item Table ── */}
          <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            <div className="max-h-[250px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-left">Product</th>
                    <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">Code</th>
                    <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-center">Unit</th>
                    <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Qty</th>
                    <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Cost</th>
                    <th className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 text-right">Amount</th>
                    <th className="sticky top-0 bg-gray-50 z-10 px-4 py-3 text-center w-12" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="h-28 px-4 text-center text-sm text-gray-400">
                        No items added yet
                      </td>
                    </tr>
                  ) : (
                    items.map((item, index) => (
                      <tr key={item.id} className="group hover:bg-[#49293e]/5 transition-colors">
                        <td className="border-l-[3px] border-l-[#49293e] px-4 py-3 font-medium text-gray-900 text-left">
                          {item.product}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{item.code || "—"}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{item.unit || "—"}</td>
                        <td className="px-4 py-3 text-right text-gray-700">{item.qty}</td>
                        <td className="px-4 py-3 text-right font-mono text-gray-700">{formatAmount(item.cost)}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900">{formatAmount(item.amount)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleExcludeOrdersClick(index)}
                              className="inline-flex rounded-lg p-2 text-gray-500 hover:bg-gray-100 transition-colors"
                              title="Exclude order"
                            >
                              <Ban size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Bottom: Exclude Order + Totals ── */}
          <div className="mt-4 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            {/* Left: Exclude Order button + description */}
            <div className="pt-2">
              <Button
                type="button"
                variant="secondary"
                className="border-gray-200 shadow-sm mb-2 text-gray-700"
                disabled={!canSave}
                onClick={() => handleExcludeOrdersClick("master")}
                isAction
                icon={<Ban size={18} className="text-gray-500" />}
                tabIndex={-1}
              >
                Exclude Order
              </Button>
              <p className="text-[10px] font-medium text-gray-500 max-w-[220px] leading-relaxed">
                Exclude product from some orders (eg: dine in no need container)
              </p>
            </div>

            {/* Right: Totals Box */}
            <div className="flex items-center gap-6 rounded-xl border border-gray-200 bg-white px-5 h-[52px] shadow-sm">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">Cost / Unit :</p>
                <p className="text-sm font-bold text-gray-700 font-mono">{formatAmount(totals.costPerUnit)}</p>
              </div>
              <div className="h-6 w-px bg-gray-200"></div>
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">Grand Total :</p>
                <p className="text-lg font-bold text-[#49293e] font-mono">{formatAmount(totals.grandTotal)}</p>
              </div>
            </div>
          </div>

        </div>{/* end scrollable body */}

        {/* ── Sticky Action Footer ── */}
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4 rounded-b-3xl">
          {canAdd && (
            <Button
              type="button"
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
              type="button"
              onClick={onSubmit}
              loading={isSaving}
              disabled={isSaving}
              isAction
              icon={<Save size={18} />}
              tabIndex={12}
            >
              Save
            </Button>
          )}
          {canDelete && (
            <Button
              type="button"
              variant="danger"
              onClick={() => {
                if (items.length > 0) setShowClearConfirm(true);
              }}
              isAction
              icon={<Trash2 size={18} />}
              tabIndex={13}
            >
              Delete
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={showClearConfirm}
        title="Clear Recipe"
        message="Are you sure you want to clear all data? Any unsaved changes will be lost."
        confirmLabel="Yes, Clear Data"
        onConfirm={() => {
          form.reset();
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />

      <Modal 
        isOpen={excludeOrdersModalOpen} 
        onClose={() => setExcludeOrdersModalOpen(false)} 
        title={`Exclude Orders (${excludeOrdersTarget === "master" ? "Entire Recipe" : "Current Raw Material"})`}
      >
        <div className="p-4 space-y-3">
          <p className="text-sm text-gray-500 mb-2">Select the order types where this item should be excluded.</p>
          {orderTypes.map((ot: any) => {
            const currentSelected = excludeOrdersTarget === "master" 
              ? (watch("excludeOrders") || []) 
              : (watch(`items.${excludeOrdersTarget}.excludeOrders`) || []);
            const isChecked = currentSelected.includes(Number(ot.value));
            return (
              <div key={ot.value} className="flex items-center space-x-2">
                <Checkbox 
                  id={`ot-${ot.value}`} 
                  checked={isChecked} 
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const current = [...currentSelected];
                    if (checked) {
                      if (!current.includes(Number(ot.value))) current.push(Number(ot.value));
                    } else {
                      const idx = current.indexOf(Number(ot.value));
                      if (idx > -1) current.splice(idx, 1);
                    }
                    if (excludeOrdersTarget === "master") {
                      setValue("excludeOrders", current);
                      // Sync to all items as requested
                      const currentItems = watch("items") || [];
                      const updatedItems = currentItems.map(item => {
                        const itemOrders = [...(item.excludeOrders || [])];
                        if (checked) {
                          if (!itemOrders.includes(Number(ot.value))) itemOrders.push(Number(ot.value));
                        } else {
                          const idx = itemOrders.indexOf(Number(ot.value));
                          if (idx > -1) itemOrders.splice(idx, 1);
                        }
                        return { ...item, excludeOrders: itemOrders };
                      });
                      setValue("items", updatedItems);
                    } else {
                      setValue(`items.${excludeOrdersTarget}.excludeOrders`, current);
                    }
                  }} 
                />
                <label htmlFor={`ot-${ot.value}`} className="text-sm cursor-pointer">{ot.label}</label>
              </div>
            );
          })}
          <div className="mt-4 flex justify-end">
            <Button onClick={() => setExcludeOrdersModalOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
};

export default RecipePage;
