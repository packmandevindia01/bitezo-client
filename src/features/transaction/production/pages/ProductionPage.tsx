import { useEffect, useState } from "react";
import { Save, Trash2, RotateCcw, PackagePlus, Loader2 } from "lucide-react";
import { Button, FormInput, PageShell, SearchableSelect, SelectInput } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { useProductionForm } from "../hooks/useProductionForm";
import { useParams } from "react-router-dom";
import { useCurrency } from "../../../../hooks/useCurrency";

const ProductionPage = () => {
  const { id } = useParams();
  const { formatAmount, decimalPart } = useCurrency();
  const step = Math.pow(10, -decimalPart).toString();
  
  const {
    form,
    items,
    remove,
    totals,
    isLoadingInitialData,
    isSaving,
    finishedProducts,
    rawMaterials,
    branches,
    employees,
    handleFinishedProductSelect,
    handleRawMaterialSelect,
    handleAddItem,
    loadBom,
    isBomLoading,
    onSubmit
  } = useProductionForm(id ? parseInt(id, 10) : undefined);

  const { watch, setValue } = form;

  const handleMoneyBlur = (field: Parameters<typeof setValue>[0], value: string) => {
    const num = Number(value);
    if (!isNaN(num)) {
      setValue(field, num.toFixed(decimalPart));
    }
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  useEffect(() => { setTimeout(() => { document.getElementById("prod-finProduct")?.focus(); }, 200); }, []);

  if (isLoadingInitialData) {
    return (
      <PageShell title="Production">
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[#49293e]" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Production">
      <div className="rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
        
        <div className="mb-2 grid gap-x-3 gap-y-2 md:grid-cols-3 lg:grid-cols-5 border-b border-gray-100 pb-2">
          <SelectInput id="prod-branch" label="Branch" options={branches} value={watch("branchId")} onChange={(e) => setValue("branchId", e.target.value)} required />
          <SelectInput id="prod-employee" label="Employee" options={employees} value={watch("employeeId")} onChange={(e) => setValue("employeeId", e.target.value)} required />
          <FormInput id="prod-no" label="Production No" value={watch("productionNo") || ""} disabled className="bg-gray-50 cursor-not-allowed font-mono text-gray-600" />
        </div>

        <div className="grid gap-x-3 gap-y-2 md:grid-cols-4 lg:grid-cols-4">
          <SearchableSelect id="prod-finProduct" label="Finished Product" options={finishedProducts} value={watch("finishedProduct")} onChange={(val) => handleFinishedProductSelect(val)} required />
          <FormInput id="prod-finCode" label="Product Code" value={watch("finishedProductCode") || ""} onChange={(e) => setValue("finishedProductCode", e.target.value)} onKeyDown={(e) => { hk(e, "prod-finUnit"); }} required />
          <FormInput id="prod-finUnit" label="Unit" value={watch("finishedProductUnitName") || watch("finishedProductUnit")} onChange={(e) => setValue("finishedProductUnitName", e.target.value)} disabled className="cursor-not-allowed bg-gray-50" required />
          <FormInput id="prod-finQty" label="Output Qty" value={watch("finishedProductQty")} inputClassName="text-right" onChange={(e) => setValue("finishedProductQty", e.target.value)} onKeyDown={(e) => hk(e, "prod-product")} required />
        </div>

        <div className="mt-1 rounded-xl border border-gray-200 bg-gray-50/70 p-2">
          <div className="grid gap-x-2 gap-y-1 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
            <SearchableSelect id="prod-product" label="Raw Material / Ingredient" options={rawMaterials} value={watch("product") || ""} onChange={(val) => handleRawMaterialSelect(val)} />
            <FormInput id="prod-code" label="Code" value={watch("code") || ""} onChange={(e) => setValue("code", e.target.value)} onKeyDown={(e) => hk(e, "prod-unit")} />
            <FormInput id="prod-unit" label="Unit" value={watch("unit") || ""} disabled className="cursor-not-allowed bg-gray-50" />
            <FormInput id="prod-qty" label="Qty" value={watch("qty") || ""} inputClassName="text-right" onChange={(e) => setValue("qty", e.target.value)} onKeyDown={(e) => hk(e, "prod-cost")} />
            <FormInput id="prod-cost" label="Cost" type="number" step={step} value={watch("cost") || ""} inputClassName="text-right" onChange={(e) => setValue("cost", e.target.value)} onBlur={(e) => handleMoneyBlur("cost", e.target.value)} onKeyDown={(e) => hk(e, "prod-add-btn")} />
            <div className="flex items-end pb-1">
              <Button
                id="prod-add-btn"
                onClick={handleAddItem}
                variant="primary"
                className="h-10.5 w-full"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddItem();
                  }
                }}
              >
                ADD
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="max-h-[250px] overflow-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/50">
                  {["Product", "Code", "Unit", "Qty", "Cost", "Amount"].map(
                    (column) => (
                      <th
                        key={column}
                        className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 text-center"
                      >
                        {column}
                      </th>
                    ),
                  )}
                  <th className="sticky top-0 bg-gray-50 z-10 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 px-4 text-center text-sm text-gray-400">
                      No items added
                    </td>
                  </tr>
                ) : (
                  items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-[#49293e]/5">
                      <td className="border-l-[3px] border-l-[#49293e] px-4 py-3 font-medium text-gray-900 text-center">
                        {item.product}
                      </td>
                      <td className="px-4 py-3 text-center">{item.code || "-"}</td>
                      <td className="px-4 py-3 text-center">{item.unit || "-"}</td>
                      <td className="px-4 py-3 text-right">{item.qty}</td>
                      <td className="px-4 py-3 font-mono text-right">{formatAmount(item.cost)}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-gray-900 text-right">{formatAmount(item.amount)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="inline-flex rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-2 flex justify-end">
          <div className="flex items-center gap-6 rounded-xl border border-gray-200 bg-white px-5 h-[52px] shadow-sm">
            <div className="flex items-center gap-3">
              <label htmlFor="prod-otherCharge" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">Other Charge :</label>
              <input
                id="prod-otherCharge"
                type="number"
                step={step}
                value={watch("otherCharge") || ""}
                onChange={(e) => setValue("otherCharge", e.target.value)}
                onBlur={(e) => handleMoneyBlur("otherCharge", e.target.value)}
                readOnly={isSaving}
                className="w-24 text-right text-sm font-bold text-gray-700 font-mono border-b border-gray-300 focus:border-[#49293e] focus:outline-none bg-transparent transition-colors pb-0.5"
              />
            </div>
            <div className="h-6 w-px bg-gray-200"></div>
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
          <Button onClick={loadBom} variant="secondary" loading={isBomLoading} disabled={isSaving || isBomLoading} icon={<PackagePlus size={18} />}>
            Load BOM
          </Button>
          <Button 
            variant="secondary" 
            onClick={handleClearClick} 
            tabIndex={-1}
            isAction
            icon={<RotateCcw size={18} />}
          >
            New
          </Button>
          <Button
            variant="primary"
            onClick={onSubmit}
            loading={isSaving}
            disabled={isSaving}
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
        onConfirm={async () => {
          form.reset();
          setShowClearConfirm(false);
        }}
        onCancel={() => setShowClearConfirm(false)}
      />
    </PageShell>
  );
};

export default ProductionPage;
