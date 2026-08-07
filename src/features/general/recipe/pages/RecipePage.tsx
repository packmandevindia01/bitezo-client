import { useState, useEffect, useRef } from "react";
import { Save, Ban, Trash2, Plus, Loader2, AlertCircle } from "lucide-react";
import { Button, FormInput, PageShell, SearchableSelect, SearchableCombobox, Checkbox, Modal } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useRecipeForm } from "../hooks/useRecipeForm";
import { useParams, useNavigate } from "react-router-dom";
import { FormProvider, Controller } from "react-hook-form";
import { generateUUID } from "../../../../utils/uuid";
import { X as CloseIcon } from "lucide-react"; // Rename X if it collides

const RecipePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { formatAmount, decimalPart } = useCurrency();
  const step = Math.pow(10, -decimalPart).toString();

  const {
    form,
    items,
    append,
    remove,
    totals,
    isLoadingInitialData,
    isInitialDataError,
    initialDataError,
    isSaving,
    finishedProducts,
    branches,
    orderTypes,
    finishedProductUnits,
    categoryUnits,
    handleFinishedProductSelect,
    handleGridProductSelect,
    handleGridUnitChange,
    handleBarcodeScan,
    getRowOptions,
    onSubmit,
    masterData,
    isBranchLocked,
    handleReset
  } = useRecipeForm(id ? parseInt(id, 10) : undefined);

  const { watch, setValue, control, register } = form;

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const canAdd    = hasPermission("Recipe Master", "Add");
  const canEdit   = hasPermission("Recipe Master", "Edit");
  const canDelete = hasPermission("Recipe Master", "Delete");
  const canSave   = canAdd || canEdit;

  const { isDirty, errors, isSubmitted } = form.formState;
  const showErr = (fieldError: any) => isSubmitted ? fieldError?.message : undefined;

  const handleClearClick = () => {
    const shouldConfirm = isDirty || (!id && items.length > 0 && items[0]?.product !== "");
    if (shouldConfirm) {
      setShowClearConfirm(true);
    } else if (id) {
      navigate("/dashboard/recipe-form");
    } else {
      handleReset();
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
          setTimeout(() => document.getElementById("rec-save-btn")?.focus(), 50);
          return;
        }
      }
      const container = (e.target as HTMLElement).closest('.relative');
      const formElements = container
        ? Array.from(container.querySelectorAll('input:not([tabindex="-1"]):not([type="hidden"]), select:not([tabindex="-1"]), button:not([tabindex="-1"]), [role="combobox"]:not([tabindex="-1"])'))
            .filter(el => !el.hasAttribute('disabled') && !el.hasAttribute('readonly'))
        : [];
      const currentIndex = formElements.indexOf(e.target as Element);
      if (currentIndex > -1 && formElements[currentIndex + 1]) {
        (formElements[currentIndex + 1] as HTMLElement).focus();
      }
    }
  };

  const [excludeOrdersModalOpen, setExcludeOrdersModalOpen] = useState(false);
  const [excludeOrdersTarget, setExcludeOrdersTarget] = useState<"master" | number>("master");
  
  const handleExcludeOrdersClick = (target: "master" | number) => {
    setExcludeOrdersTarget(target);
    setExcludeOrdersModalOpen(true);
  };

  const watchedItems = watch("items") || [];
  const productSelectedRef = useRef(false);

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
      <FormProvider {...form}>
        <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ height: "calc(100vh - 110px)" }}>
          <button
            type="button"
            onClick={() => navigate("/dashboard/recipes")}
            className="absolute top-1.5 right-2.5 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
          >
            <CloseIcon size={20} />
          </button>

          {/* ── Static Header Fields ── */}
          <div className="p-3 md:p-4 pb-0">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-x-3 gap-y-2 mb-3">
              <Controller
                name="finishedProduct"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    id="rec-finProduct"
                    label="Finished Product"
                    className="h-8 !px-2 !text-xs"
                    options={finishedProducts}
                    value={field.value}
                    onChange={(val) => handleFinishedProductSelect(val)}
                    required
                    disabled={!canSave}
                    tabIndex={1}
                    error={showErr(errors.finishedProduct)}
                  />
                )}
              />
              <FormInput
                id="rec-finCode"
                label="Code"
                inputClassName="!h-8 !px-2 !text-xs cursor-not-allowed text-[#49293e]"
                value={watch("finishedProductCode") || ""}
                onChange={(e) => setValue("finishedProductCode", e.target.value)}
                onKeyDown={(e) => hk(e, "rec-finUnit")}
                readOnly={true}
                tabIndex={2}
              />
              <Controller
                name="finishedProductUnit"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    id="rec-finUnit"
                    label="Unit"
                    className="h-8 !px-2 !text-xs"
                    options={finishedProductUnits.length > 0 ? finishedProductUnits : (masterData?.units || [])}
                    value={field.value}
                    onChange={(val) => {
                      setValue("finishedProductUnit", val);
                      const opts = finishedProductUnits.length > 0 ? finishedProductUnits : (masterData?.units || []);
                      const name = opts.find(u => u.value === val)?.label || val;
                      setValue("finishedProductUnitName", name);
                    }}
                    required
                    disabled={!canSave || !watch("finishedProduct")}
                    placeholder={!watch("finishedProduct") ? "Select product first" : "Select unit"}
                    tabIndex={3}
                    error={showErr(errors.finishedProductUnit)}
                  />
                )}
              />
              <FormInput
                id="rec-finQty"
                label="Qty"
                type="number"
                min={0}
                step={step}
                inputClassName="!h-8 !px-2 !text-xs text-right"
                value={watch("finishedProductQty")}
                onChange={(e) => setValue("finishedProductQty", e.target.value)}
                onKeyDown={(e) => hk(e, "rec-branch")}
                required
                readOnly={!canSave}
                tabIndex={4}
                error={showErr(errors.finishedProductQty)}
              />
              <Controller
                name="branchId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    id="rec-branch"
                    label="Branch"
                    className="h-8 !px-2 !text-xs"
                    options={branches}
                    value={field.value}
                    onChange={(val) => {
                      setValue("branchId", val);
                      setTimeout(() => {
                        const target = document.getElementById("product-select-0");
                        if (target) target.focus();
                      }, 100);
                    }}
                    required
                    disabled={!canSave || isBranchLocked}
                    tabIndex={5}
                    placeholder="Select branch"
                    onKeyDown={(e) => hk(e, "product-select-0")}
                    error={showErr(errors.branchId)}
                  />
                )}
              />
            </div>
          </div>

          {/* ── Scrollable DataGrid ── */}
          <div className="flex-1 flex flex-col overflow-y-auto p-2 md:p-3">
            <div className="flex-1 min-h-[200px] flex flex-col rounded-xl border border-gray-200 bg-white">
              <div className="flex-1 overflow-auto">
                <table className="min-w-full table-fixed text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      {[
                        { name: "SL", width: "w-[5%]" },
                        { name: "Raw Material", width: "w-[35%]" },
                        { name: "Code", width: "w-[10%]" },
                        { name: "Unit", width: "w-[12%]" },
                        { name: "Qty", width: "w-[10%]" },
                        { name: "Cost", width: "w-[10%]" },
                        { name: "Amount", width: "w-[12%]" },
                        { name: "", width: "w-[6%]" }
                      ].map((col, i) => (
                        <th key={i} className={`sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 ${col.width} ${col.name === "SL" || col.name === "" ? "text-center" : col.name === "Qty" || col.name === "Cost" || col.name === "Amount" ? "text-right" : "text-center"}`}>
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
                        <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
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
                                      } else if (!val) {
                                        handleGridProductSelect(index, "", "");
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
                                        setTimeout(() => document.getElementById("rec-save-btn")?.focus(), 50);
                                      }
                                    }}
                                    disabled={!canSave}
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
                              render={({ field: selectField }) => (
                                <SearchableSelect
                                  className="h-7 !px-2 text-xs border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
                                  value={selectField.value}
                                  options={itemWatch.product ? ((itemWatch.unitCategory && categoryUnits[itemWatch.unitCategory]) ? categoryUnits[itemWatch.unitCategory] : (masterData?.units || [])) : []}
                                  onChange={(val) => handleGridUnitChange(index, val)}
                                  disabled={!canSave || !itemWatch.product}
                                  placeholder="Unit"
                                  disableAutoOpenOnFocus={true}
                                />
                              )}
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100">
                            <input {...register(`items.${index}.qty`)} type="number" min="0" step="any" onFocus={(e) => e.target.select()} onKeyDown={(e) => handleGridNav(e, index)} className="w-full h-7 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-1 py-0 text-xs outline-none" readOnly={!canSave} />
                          </td>
                          <td className="p-0 border-r border-gray-100">
                            <input
                              {...register(`items.${index}.cost`)}
                              type="number"
                              min="0"
                              step="any"
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const rowProduct = form.getValues(`items.${index}.product`);
                                  if (rowProduct && rowProduct.trim() !== "" && index === items.length - 1) {
                                    append({
                                      id: generateUUID(),
                                      product: "", code: "", unit: "", qty: "1", cost: "0"
                                    }, { shouldFocus: false });
                                    setTimeout(() => document.getElementById(`product-select-${items.length}`)?.focus(), 50);
                                  } else {
                                    handleGridNav(e, index);
                                  }
                                }
                              }}
                              className="w-full h-7 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-1 py-0 text-xs outline-none font-mono"
                              readOnly={!canSave}
                            />
                          </td>
                          <td className="px-2 py-1 text-right font-mono text-xs text-gray-600 bg-gray-50/50 border-r border-gray-100">{formatAmount(lineAmount)}</td>
                          <td className="px-2 py-1 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleExcludeOrdersClick(index)}
                                className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                                title="Exclude order"
                                disabled={!canSave}
                                tabIndex={-1}
                              >
                                <Ban size={14} />
                              </button>
                              <button
                                type="button"
                                tabIndex={-1}
                                onClick={() => items.length > 1 && remove(index)}
                                className={`p-1.5 rounded-md transition-colors ${items.length > 1 ? 'text-gray-400 hover:text-red-500 hover:bg-red-50' : 'text-gray-200 cursor-not-allowed'}`}
                                disabled={!canSave || items.length <= 1}
                                title="Remove item"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Add Row Button & Totals */}
              <div className="flex flex-wrap items-center justify-between px-3 py-2.5 border-t border-gray-200 bg-gray-50/50 rounded-b-xl gap-4">
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
                  disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#49293e] hover:text-[#3a2132] bg-white border border-gray-200 hover:bg-[#49293e]/5 rounded-md transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> Add Item
                </button>

                <div className="flex items-center gap-6 bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Unit Price :</span>
                    <span className="text-sm font-bold text-gray-800 font-mono">{formatAmount(totals.unitPrice)}</span>
                  </div>
                  <div className="h-4 w-px bg-gray-300"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Total Amount :</span>
                    <span className="text-base font-bold text-[#49293e] font-mono">{formatAmount(totals.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Bottom: Exclude Order ── */}
            <div className="mt-3 flex items-center justify-between">
              <div>
                <Button
                  type="button"
                  variant="secondary"
                  className="border-gray-200 shadow-sm mb-1 text-gray-700"
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
            </div>

          </div>{/* end scrollable body */}

          {/* ── Sticky Action Footer ── */}
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 bg-white px-6 py-4 rounded-b-2xl">
            {canAdd && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleClearClick}
                tabIndex={-1}
                isAction
                icon={<Plus size={16} />}
              >
                New
              </Button>
            )}
            {canSave && (
              <Button
                id="rec-save-btn"
                type="button"
                onClick={onSubmit}
                loading={isSaving}
                disabled={isSaving}
                isAction
                icon={<Save size={16} />}
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
                icon={<Trash2 size={16} />}
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
            setShowClearConfirm(false);
            if (id) {
              navigate("/dashboard/recipe-form");
            } else {
              handleReset();
            }
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
      </FormProvider>
    </PageShell>
  );
};

export default RecipePage;
