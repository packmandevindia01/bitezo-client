import { useEffect, useState, useRef } from "react";
import { Save, Trash2, Plus, PackagePlus, Loader2, X as CloseIcon } from "lucide-react";
import { Button, FormInput, PageShell, SearchableSelect, SearchableCombobox } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { useProductionForm } from "../hooks/useProductionForm";
import { useParams, useNavigate } from "react-router-dom";
import { useCurrency } from "../../../../hooks/useCurrency";
import { FormProvider, Controller } from "react-hook-form";
import { generateUUID } from "../../../../utils/uuid";

const ProductionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { formatAmount, decimalPart } = useCurrency();
  const step = Math.pow(10, -decimalPart).toString();
  const productSelectedRef = useRef(false);
  
  const {
    form,
    items,
    append,
    remove,
    update,
    totals,
    isLoadingInitialData,
    isSaving,
    finishedProducts,
    branches,
    employees,
    finishedProductUnits,
    categoryUnits,
    handleFinishedProductSelect,
    handleGridProductSelect,
    handleGridUnitChange,
    handleBarcodeScan,
    getRowOptions,
    loadBom,
    isBomLoading,
    onSubmit,
    masterData,
    isBranchLocked
  } = useProductionForm(id ? parseInt(id, 10) : undefined);

  const { watch, setValue, control, register } = form;

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

  const handleGridNav = (e: React.KeyboardEvent, rowIndex?: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (rowIndex !== undefined) {
        const rowProduct = form.getValues(`items.${rowIndex}.product`);
        if (!rowProduct || rowProduct.trim() === "") {
          if (items.length > 1) remove(rowIndex);
          setTimeout(() => document.getElementById("prod-save-btn")?.focus(), 50);
          return;
        }
      }
      const formElements = Array.from(document.querySelectorAll('input:not([tabindex="-1"]):not([type="hidden"]), select:not([tabindex="-1"]), button:not([tabindex="-1"]), [role="combobox"]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled') && !el.hasAttribute('readonly'));
      const currentIndex = formElements.indexOf(e.target as Element);
      if (currentIndex > -1 && formElements[currentIndex + 1]) {
        (formElements[currentIndex + 1] as HTMLElement).focus();
      }
    }
  };

  useEffect(() => { setTimeout(() => { document.getElementById("prod-branch")?.focus(); }, 200); }, []);

  const watchedItems = watch("items") || [];
  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);
  const activeItem = watchedItems[activeRowIndex] || watchedItems[0] || {};

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
      <FormProvider {...form}>
        <div className="relative rounded-3xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
          
          {/* Close Button in top right */}
          <button
            type="button"
            onClick={() => navigate("/dashboard/production-list")}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
          >
            <CloseIcon size={20} />
          </button>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4">
          
            <div className="mb-2 grid gap-x-2 gap-y-1.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-5 border-b border-gray-100 pb-2">
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    id="prod-branch"
                    label="Branch"
                    className="h-8 !px-2 !text-xs"
                    required
                    options={branches}
                    value={field.value}
                    onChange={(val) => {
                      setValue("branchId", val);
                      setTimeout(() => {
                        const target = document.getElementById("prod-employee");
                        if (target) target.focus();
                      }, 100);
                    }}
                    onKeyDown={(e) => hk(e, "prod-employee")}
                    disabled={!!id || isBranchLocked}
                    placeholder="Select branch"
                  />
                )}
              />
              <Controller
                name="employeeId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    id="prod-employee"
                    label="Employee"
                    className="h-8 !px-2 !text-xs"
                    required
                    options={employees}
                    value={field.value}
                    onChange={(val) => {
                      setValue("employeeId", val);
                      setTimeout(() => {
                        const target = document.getElementById("prod-finProduct");
                        if (target) target.focus();
                      }, 100);
                    }}
                    onKeyDown={(e) => hk(e, "prod-finProduct")}
                    placeholder={!watch("branchId") ? "Select branch first" : "Select employee"}
                    disabled={!watch("branchId")}
                  />
                )}
              />
              <FormInput id="prod-no" label="Production No" inputClassName="!h-8 !px-2 !text-xs bg-gray-50 cursor-not-allowed font-mono text-gray-600" value={watch("productionNo") || ""} disabled />
            </div>

            <div className="grid gap-x-2 gap-y-1.5 grid-cols-2 sm:grid-cols-4 mb-3 pb-2 border-b border-gray-100">
              <Controller
                name="finishedProduct"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    id="prod-finProduct"
                    label="Finished Product"
                    className="h-8 !px-2 !text-xs"
                    options={finishedProducts}
                    value={field.value}
                    onChange={(val) => {
                      handleFinishedProductSelect(val);
                      setTimeout(() => {
                        const target = document.getElementById("prod-finUnit");
                        if (target) target.focus();
                      }, 100);
                    }}
                    onKeyDown={(e) => hk(e, "prod-finUnit")}
                    required
                  />
                )}
              />
              <FormInput
                id="prod-finCode"
                label="Product Code"
                inputClassName="!h-8 !px-2 !text-xs bg-gray-50 cursor-not-allowed text-gray-600 font-mono"
                value={watch("finishedProductCode") || ""}
                disabled
                readOnly
              />
              <Controller
                name="finishedProductUnit"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    id="prod-finUnit"
                    label="Unit"
                    className="h-8 !px-2 !text-xs"
                    required
                    options={finishedProductUnits}
                    value={field.value}
                    onChange={(val) => {
                      setValue("finishedProductUnit", val);
                      const name = finishedProductUnits.find(u => u.value === val)?.label || val;
                      setValue("finishedProductUnitName", name);
                      setTimeout(() => {
                        const target = document.getElementById("prod-finQty");
                        if (target) target.focus();
                      }, 100);
                    }}
                    onKeyDown={(e) => hk(e, "prod-finQty")}
                    placeholder={finishedProductUnits.length === 0 ? "Select product first" : "Select unit"}
                    disabled={finishedProductUnits.length === 0}
                  />
                )}
              />
              <FormInput id="prod-finQty" label="Output Qty" inputClassName="!h-8 !px-2 !text-xs text-right" value={watch("finishedProductQty")} onChange={(e) => setValue("finishedProductQty", e.target.value)} onKeyDown={(e) => hk(e, "product-select-0")} required />
            </div>

            {/* ── Inline Editable Ingredients Table ── */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="max-h-[350px] overflow-auto">
                <table className="min-w-full table-fixed text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      {[
                        { name: "SL", width: "w-[5%]" },
                        { name: "Raw Material / Ingredient", width: "w-[33%]" },
                        { name: "Code", width: "w-[8%]" },
                        { name: "Unit", width: "w-[12%]" },
                        { name: "Qty", width: "w-[10%]" },
                        { name: "Cost", width: "w-[10%]" },
                        { name: "Amount", width: "w-[12%]" },
                        { name: "", width: "w-[6%]" }
                      ].map((col, i) => (
                        <th key={i} className={`sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-600 ${col.width} ${col.name === "SL" || col.name === "" ? "text-center" : col.name === "Qty" || col.name === "Cost" || col.name === "Amount" ? "text-right" : "text-left"}`}>
                          {col.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {items.map((item, index) => {
                      const itemWatch = watchedItems[index] || {};
                      const qty = Number(itemWatch.qty) || 0;
                      const cost = Number(itemWatch.cost) || 0;
                      const lineAmount = qty * cost;
                      const rowOptions = getRowOptions(index);

                      return (
                        <tr key={item.id} onFocusCapture={() => setActiveRowIndex(index)} className="transition-colors hover:bg-[#49293e]/5">
                          <td className="px-2 py-1 text-center font-bold text-gray-400 border-r border-gray-100 bg-gray-50/30">{index + 1}</td>
                          <td className="p-0.5 border-r border-gray-100 bg-white">
                            <Controller
                              name={`items.${index}.product`}
                              control={control}
                              render={({ field: selectField }) => (
                                <div className="grid-product-select">
                                  <SearchableCombobox
                                    id={`product-select-${index}`}
                                    className="h-7 !px-2 text-xs"
                                    value={selectField.value}
                                    options={rowOptions}
                                    onChange={(val) => {
                                      productSelectedRef.current = true;
                                      selectField.onChange(val);
                                      const opt = rowOptions.find(o => o.value === val) as any;
                                      if (opt) {
                                        setValue(`items.${index}.productName`, opt.label);
                                        setValue(`items.${index}.code`, opt.code || "");
                                        handleGridProductSelect(index, val, opt.code || "");
                                      } else {
                                        setValue(`items.${index}.productName`, "");
                                        setValue(`items.${index}.code`, "");
                                        setValue(`items.${index}.unit`, "");
                                        setValue(`items.${index}.unitCategory`, "");
                                        setValue(`items.${index}.qty`, "1");
                                        setValue(`items.${index}.cost`, "0");
                                      }
                                      setTimeout(() => {
                                        const qtyInputs = document.querySelectorAll<HTMLInputElement>(`input[name="items.${index}.qty"]`);
                                        qtyInputs[0]?.focus();
                                      }, 100);
                                    }}
                                    onKeyDown={async (e) => {
                                      if (e.key === "Enter") {
                                        if (productSelectedRef.current) {
                                          productSelectedRef.current = false;
                                          return;
                                        }
                                        const rawValue = e.currentTarget.value;
                                        if (rawValue && rawValue.trim().length > 0) {
                                          e.preventDefault();
                                          const success = await handleBarcodeScan(index, rawValue.trim());
                                          if (success) {
                                            setTimeout(() => {
                                              const qtyInputs = document.querySelectorAll<HTMLInputElement>(`input[name="items.${index}.qty"]`);
                                              qtyInputs[0]?.focus();
                                            }, 100);
                                          }
                                          return;
                                        }
                                        if (items.length > 1) remove(index);
                                        setTimeout(() => document.getElementById("prod-save-btn")?.focus(), 50);
                                      }
                                    }}
                                    minQueryLength={0}
                                  />
                                </div>
                              )}
                            />
                          </td>
                          <td className="px-2 py-1 text-[10px] text-gray-500 border-r border-gray-100 bg-gray-50/50 text-center">{itemWatch.code || "-"}</td>
                          <td className="p-0 border-r border-gray-100 relative">
                            <Controller
                              name={`items.${index}.unit`}
                              control={control}
                              render={({ field: selectField }) => {
                                const isProductSelected = Boolean(itemWatch.product && itemWatch.product.trim() !== "");
                                const rowUnits = isProductSelected
                                  ? ((itemWatch.unitCategory && categoryUnits[itemWatch.unitCategory]) ? categoryUnits[itemWatch.unitCategory] : (masterData?.units || []))
                                  : [];
                                return (
                                  <SearchableSelect
                                    className="h-7 !px-2 text-xs border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
                                    value={selectField.value}
                                    options={rowUnits}
                                    onChange={(val) => handleGridUnitChange(index, val)}
                                    placeholder={isProductSelected ? "Unit" : ""}
                                    disabled={!isProductSelected}
                                    disableAutoOpenOnFocus={true}
                                  />
                                );
                              }}
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100">
                            <input {...register(`items.${index}.qty`)} type="number" min="0" step="any" onFocus={(e) => e.target.select()} onKeyDown={(e) => handleGridNav(e, index)} className="w-full h-7 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-1 py-0 text-xs outline-none" />
                          </td>
                          <td className="p-0 border-r border-gray-100">
                            <input {...register(`items.${index}.cost`)} type="number" min="0" step="any" onFocus={(e) => e.target.select()} onKeyDown={(e) => handleGridNav(e, index)} className="w-full h-7 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-1 py-0 text-xs outline-none font-mono" />
                          </td>
                          <td className="px-2 py-1 text-right font-mono text-xs text-gray-600 bg-gray-50/50 border-r border-gray-100">{formatAmount(lineAmount)}</td>
                          <td className="px-2 py-1 text-center">
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => {
                                if (items.length > 1) {
                                  remove(index);
                                } else {
                                  update(index, { id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: "0" } as any);
                                }
                              }}
                              className="p-1.5 rounded-md transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50"
                              title={items.length > 1 ? "Remove item" : "Clear item"}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Add Row Button */}
              <div className="flex justify-start px-2 py-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    append({
                      id: generateUUID(),
                      product: "", code: "", unit: "", qty: "1", cost: "0"
                    }, { shouldFocus: false });

                    setTimeout(() => {
                      document.getElementById(`product-select-${items.length}`)?.focus();
                    }, 50);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#49293e] hover:text-[#3a2132] hover:bg-[#49293e]/5 rounded-md transition-colors disabled:opacity-50"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
            </div>

            <div className="mt-3 flex justify-end">
              <div className="flex items-center gap-6 rounded-xl border border-gray-200 bg-white px-5 h-[52px] shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">Stock :</p>
                    <p className="text-sm font-bold text-gray-700 font-mono pr-2">{activeItem.stock || "0.000"}</p>
                  </div>
                  <div className="h-6 w-px bg-gray-200"></div>
                  <label htmlFor="prod-otherCharge" className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5 pl-1">Other Charge :</label>
                  <input
                    id="prod-otherCharge"
                    type="number"
                    step={step}
                    value={watch("otherCharge") || ""}
                    onChange={(e) => setValue("otherCharge", e.target.value)}
                    onBlur={(e) => handleMoneyBlur("otherCharge", e.target.value)}
                    disabled={isSaving}
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
              icon={<Plus size={18} />}
            >
              New
            </Button>
            <Button
              id="prod-save-btn"
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
          </div>
        </div>
      </FormProvider>

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
