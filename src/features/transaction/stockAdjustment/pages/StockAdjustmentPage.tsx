import { useEffect, useMemo, useState, useRef } from "react";
import { Save, RotateCcw, Trash2, Plus, Printer, X } from "lucide-react";
import { Button, FormInput, PageShell, SearchableSelect, SearchableCombobox } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import StockAdjustmentPrintModal from "../components/StockAdjustmentPrintModal";
import type { StockAdjustmentLineItem } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useStockAdjustment } from "../hooks/useStockAdjustment";
import { useSearchParams, useNavigate } from "react-router-dom";
import { FormProvider, Controller } from "react-hook-form";
import { useToast } from "../../../../app/providers/useToast";
import { generateUUID } from "../../../../utils/uuid";

const toNumber = (val: any) => {
  const n = Number(val);
  return isNaN(n) ? 0 : n;
};

const StockAdjustmentPage = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { showToast } = useToast();

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [shouldResetAfterPrint, setShouldResetAfterPrint] = useState(false);

  // Tracks whether a product was just selected via Enter (so we don't exit grid accidentally)
  const productSelectedRef = useRef(false);

  const {
    methods,
    items,
    append,
    remove,
    update,
    watchedItems,
    totals,
    handleReset,
    onSubmit,
    masterData,
    loadingMaster,
    masterError,
    productOptions,
    searchingProducts,
    handleProductSearch,
    handleBarcodeScan,
    handleProductSelect,
    handleTypeSelect,
    handleUnitChange,
    saving,
    categoryUnits,
    getRowOptions,
    isBranchLocked,
  } = useStockAdjustment(id);

  const { register, control, getValues, formState: { errors } } = methods;

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextId) document.getElementById(nextId)?.focus();
    }
  };

  const handleGridNav = (e: React.KeyboardEvent, rowIndex?: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If the current row's product is empty → exit the grid, go to Save
      if (rowIndex !== undefined) {
        const rowProduct = methods.getValues(`items.${rowIndex}.product`);
        if (!rowProduct || rowProduct.trim() === "") {
          if (items.length > 1) remove(rowIndex);
          setTimeout(() => document.getElementById("sa-save-btn")?.focus(), 50);
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

  useEffect(() => {
    setTimeout(() => {
      document.getElementById("sa-date")?.focus();
    }, 200);
  }, []);

  // Map forms/items to display names for the print template
  const printForm = useMemo(() => {
    const vals = getValues();
    return {
      series: vals.series || "",
      refNo: vals.refNo || "",
      date: vals.date || "",
      branch: vals.branch || "",
      salesman: vals.salesman || "",
      product: "",
      code: "",
      unit: "",
      qty: "0",
      cost: "0",
      amount: "0",
      type: "",
      effect: ""
    };
  }, [getValues]);

  const printItems = useMemo<StockAdjustmentLineItem[]>(() => {
    return watchedItems
      .filter((item: any) => item.product && item.product.trim() !== "")
      .map((item: any) => {
        const pOpt = productOptions.find(p => p.value === item.product);
        const uOpt = masterData?.units?.find((u: any) => u.value === String(item.unit));
        return {
          ...item,
          product: pOpt ? pOpt.label : item.product,
          unit: uOpt ? uOpt.label : item.unit,
        };
      });
  }, [watchedItems, productOptions]);

  const handleClearClick = () => {
    if (items.length > 1 || (watchedItems[0] && watchedItems[0].product)) {
      setShowClearConfirm(true);
    } else {
      handleReset();
    }
  };

  const getFirstError = (obj: any): string | null => {
    if (!obj) return null;
    if (obj.message) return obj.message;
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const msg = getFirstError(item);
        if (msg) return msg;
      }
    } else if (typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        const msg = getFirstError(obj[key]);
        if (msg) return msg;
      }
    }
    return null;
  };

  const onSaveClick = () => {
    const currentItems = getValues("items") || [];
    const validItems = currentItems.filter((i: any) => i.product && i.product.trim() !== "");
    if (validItems.length === 0) {
      showToast("Please add at least one product.", "warning");
      return;
    }
    if (validItems.length !== currentItems.length) {
      methods.setValue("items", validItems);
    }
    
    // Trigger validation before showing confirm dialog
    methods.handleSubmit(
      () => {
        setShowSaveConfirm(true);
      },
      (errs) => {
        console.error("Validation failed:", errs);
        const firstErrorKey = Object.keys(errs)[0];
        if (firstErrorKey) {
          const errMsg = getFirstError((errs as any)[firstErrorKey]) || `Please fill required fields (${firstErrorKey}).`;
          showToast(errMsg, "error");
          
          setTimeout(() => {
            const el = document.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement;
            if (el) {
              el.focus();
            } else {
              const elId = document.getElementById(`sa-${firstErrorKey}`);
              if (elId) elId.focus();
            }
          }, 100);
        } else {
          showToast("Please fill all required fields.", "error");
        }
      }
    )();
  };

  const doSave = async () => {
    setShowSaveConfirm(false);
    methods.handleSubmit(async (data) => {
      const success = await onSubmit(data);
      if (success) {
        setIsPrintModalOpen(true);
        setShouldResetAfterPrint(true);
      }
    })();
  };

  const canSave = true; // By default enabled

  return (
    <PageShell title={id ? "Edit Stock Adjustment" : "Create Stock Adjustment"}>
      <FormProvider {...methods}>
        {masterError && (
          <div className="mb-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200">
            Error loading master data: {masterError}
          </div>
        )}

        <div className="relative rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ height: "calc(100vh - 110px)" }}>
          
          {/* Close Button in top right */}
          <button
            type="button"
            onClick={() => navigate("/dashboard/stock-adjustment")}
            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
            tabIndex={-1}
          >
            <X size={18} />
          </button>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto p-2 md:p-3">

            {/* ── Header Fields ── Extremely dense padding to save space */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1.5 mb-2">
              <FormInput inputClassName="!h-8 !px-2 !text-xs cursor-not-allowed text-[#49293e]" id="sa-refNo" label="Ref No" {...register("refNo")} readOnly={true} tabIndex={-1} error={errors.refNo?.message as string} />
              <FormInput inputClassName="!h-8 !px-2 !text-xs" id="sa-date" label="Date" type="date" {...register("date")} onKeyDown={(e) => hk(e, "sa-branch")} readOnly={!canSave} error={errors.date?.message as string} />
              
              <Controller name="branch" control={control} render={({ field }) => (
                <SearchableSelect className="h-8 !px-2 !text-xs" id="sa-branch" label="Branch" value={field.value} options={masterData.branches} onChange={field.onChange} onKeyDown={(e) => hk(e, "sa-salesman")} disabled={!canSave || loadingMaster || isBranchLocked || !!id} error={errors.branch?.message as string} />
              )} />
              <Controller name="salesman" control={control} render={({ field }) => (
                <SearchableSelect className="h-8 !px-2 !text-xs" id="sa-salesman" label="Salesman" value={field.value} options={masterData.employees} onChange={field.onChange} onKeyDown={(e) => hk(e, "product-select-0")} disabled={!canSave || loadingMaster} error={errors.salesman?.message as string} />
              )} />
            </div>

            {/* ── Inline Editable DataGrid ── */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="max-h-[350px] overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      {["SL", "Product", "Code", "Stock", "Unit", "Qty", "Cost", "Type", "Effect", "Amount", ""].map(
                        (col, i) => (
                          <th key={i} className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {items.map((item, index) => {
                      const itemWatch = watchedItems[index] || {};
                      const qty = toNumber(itemWatch.qty);
                      const cost = toNumber(itemWatch.cost);
                      const lineAmount = qty * cost;

                      const rawType = (masterData as any).typesRaw?.find((t: any) => String(t.typeId) === String(itemWatch.type));
                      const isEffectEditable = rawType && (rawType.effect === "All" || rawType.effect === "all" || rawType.effect === "*");

                      return (
                        <tr key={item.id} className="hover:bg-[#49293e]/5 transition-colors">
                          <td className="px-2 py-1 text-center font-bold text-gray-400 border-r border-gray-100 w-10">{index + 1}</td>
                          <td className="p-0 border-r border-gray-100 min-w-[200px] max-w-xs">
                            <Controller
                              name={`items.${index}.product`}
                              control={control}
                              render={({ field: selectField }) => {
                                const rowOptions = getRowOptions(index);
                                return (
                                  <div className="relative">
                                    <SearchableCombobox
                                      id={`product-select-${index}`}
                                      className="h-7 !px-2 text-xs"
                                      value={selectField.value}
                                      options={rowOptions}
                                      onSearch={handleProductSearch}
                                      loading={searchingProducts}
                                      minQueryLength={0}
                                      forcePlacement="bottom"
                                      onChange={(val) => {
                                        productSelectedRef.current = true;
                                        selectField.onChange(val);
                                        const opt = rowOptions.find(o => o.value === val) as any;
                                        if (opt) {
                                          methods.setValue(`items.${index}.productName`, opt.label);
                                          methods.setValue(`items.${index}.code`, opt["code"] || "");
                                          handleProductSelect(index, val, opt["barcode"] || opt["code"] || "");
                                        } else {
                                          methods.setValue(`items.${index}.productName`, "");
                                          methods.setValue(`items.${index}.code`, "");
                                          methods.setValue(`items.${index}.unit`, "");
                                          methods.setValue(`items.${index}.unitCategory`, "");
                                          methods.setValue(`items.${index}.stock`, "");
                                          methods.setValue(`items.${index}.qty`, "1");
                                          methods.setValue(`items.${index}.cost`, "0");
                                          methods.setValue(`items.${index}.type`, "");
                                        }
                                      setTimeout(() => {
                                        document.getElementById(`unit-select-${index}`)?.focus();
                                      }, 100);
                                    }}
                                    onKeyDown={async (e) => {
                                      if (e.key === "Enter") {
                                        if (productSelectedRef.current) {
                                          productSelectedRef.current = false;
                                          setTimeout(() => {
                                            document.getElementById(`unit-select-${index}`)?.focus();
                                          }, 100);
                                          return;
                                        }
                                        const rawValue = e.currentTarget.value;
                                        const formProduct = methods.getValues(`items.${index}.product`);
                                        // Avoid treating formatted labels (e.g. "[3] CHICKEN") as barcodes
                                        if (rawValue && rawValue.trim().length > 0 && !rawValue.includes("[")) {
                                          e.preventDefault();
                                          const success = await handleBarcodeScan(index, rawValue.trim());
                                          if (success) {
                                            setTimeout(() => {
                                              document.getElementById(`unit-select-${index}`)?.focus();
                                            }, 100);
                                          }
                                          return;
                                        }
                                        
                                        if (!formProduct || formProduct.trim() === "") {
                                          if (items.length > 1) remove(index);
                                          setTimeout(() => document.getElementById("sa-save-btn")?.focus(), 50);
                                        } else {
                                          e.preventDefault();
                                          setTimeout(() => {
                                            document.getElementById(`unit-select-${index}`)?.focus();
                                          }, 100);
                                        }
                                      }
                                    }}
                                    disabled={!canSave}
                                  />
                                  </div>
                                );
                              }}
                            />
                          </td>
                          <td className="px-2 py-1 text-[10px] text-gray-500 border-r border-gray-100 bg-gray-50/50">{itemWatch.code || "-"}</td>
                          <td className="px-2 py-1 text-[10px] text-gray-500 border-r border-gray-100 bg-gray-50/50 font-mono text-center">{itemWatch.stock || "-"}</td>
                          <td className="p-0 border-r border-gray-100 w-24 relative">
                            <Controller
                              name={`items.${index}.unit`}
                              control={control}
                              render={({ field: selectField }) => (
                                <SearchableSelect
                                  className="h-7 !px-2 text-xs border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
                                  value={selectField.value}
                                  options={(itemWatch.unitCategory && categoryUnits[itemWatch.unitCategory]) ? categoryUnits[itemWatch.unitCategory] : (masterData?.units || [])}
                                  onChange={(val) => {
                                    handleUnitChange(index, val);
                                    setTimeout(() => {
                                      const qtyInputs = document.querySelectorAll<HTMLInputElement>(`input[name="items.${index}.qty"]`);
                                      qtyInputs[0]?.focus();
                                    }, 100);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const qtyInputs = document.querySelectorAll<HTMLInputElement>(`input[name="items.${index}.qty"]`);
                                      qtyInputs[0]?.focus();
                                    }
                                  }}
                                  disabled={!canSave}
                                  placeholder="Unit"
                                  disableAutoOpenOnFocus={true}
                                />
                              )}
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100 w-20">
                            <input {...register(`items.${index}.qty`)} type="number" min="0" onFocus={(e) => e.target.select()} onKeyDown={(e) => handleGridNav(e, index)} className="w-full h-7 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-1 py-0 text-xs outline-none" readOnly={!canSave} />
                          </td>
                          <td className="p-0 border-r border-gray-100 w-24">
                            <input {...register(`items.${index}.cost`)} type="number" min="0" step="any" onFocus={(e) => e.target.select()} onKeyDown={(e) => handleGridNav(e, index)} className="w-full h-7 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-1 py-0 text-xs outline-none font-mono" readOnly={!canSave} />
                          </td>
                          
                          <td className="p-0 border-r border-gray-100 w-32 relative">
                            <Controller
                              name={`items.${index}.type`}
                              control={control}
                              render={({ field: selectField }) => (
                                <SearchableSelect
                                  className="h-7 !px-2 text-xs border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
                                  value={selectField.value}
                                  options={masterData.types}
                                  onChange={(val) => {
                                    selectField.onChange(val);
                                    handleTypeSelect(index, val);
                                    
                                    // Check if the selected type has an editable effect (All)
                                    const rawType = (masterData as any).typesRaw?.find((t: any) => String(t.typeId) === String(val));
                                    const isEditable = rawType && (rawType.effect === "All" || rawType.effect === "all" || rawType.effect === "*");
                                    
                                    if (isEditable) {
                                      setTimeout(() => {
                                        document.getElementById(`effect-select-${index}`)?.focus();
                                      }, 100);
                                      return;
                                    }

                                    const rowProduct = methods.getValues(`items.${index}.product`);
                                    if (rowProduct && rowProduct.trim() !== "" && index === items.length - 1) {
                                      // Wait slightly longer than SearchableSelect's internal 50ms handleFocusNextInput 
                                      setTimeout(() => {
                                        append({ id: generateUUID(), product: "", code: "", unit: "", unitCategory: "", qty: "1", cost: "0", type: "", effect: "" }, { shouldFocus: false });
                                        setTimeout(() => document.getElementById(`product-select-${items.length}`)?.focus(), 50);
                                      }, 60);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      const rawType = (masterData as any).typesRaw?.find((t: any) => String(t.typeId) === String(selectField.value));
                                      const isEditable = rawType && (rawType.effect === "All" || rawType.effect === "all" || rawType.effect === "*");
                                      if (isEditable) {
                                        document.getElementById(`effect-select-${index}`)?.focus();
                                      } else {
                                        const rowProduct = methods.getValues(`items.${index}.product`);
                                        if (rowProduct && rowProduct.trim() !== "" && index === items.length - 1) {
                                          append({ id: generateUUID(), product: "", code: "", unit: "", unitCategory: "", qty: "1", cost: "0", type: "", effect: "" }, { shouldFocus: false });
                                          setTimeout(() => document.getElementById(`product-select-${items.length}`)?.focus(), 100);
                                        } else {
                                          handleGridNav(e, index);
                                        }
                                      }
                                    }
                                  }}
                                  disabled={!canSave}
                                  placeholder="Select Type"
                                />
                              )}
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100 w-20">
                            {isEffectEditable ? (
                              <select
                                id={`effect-select-${index}`}
                                {...register(`items.${index}.effect`)}
                                className="w-full h-7 bg-transparent border border-transparent rounded px-1 py-0 text-xs font-bold text-center outline-none cursor-pointer text-[#49293e] focus:border-blue-500 focus:ring-0"
                                onFocus={(e) => {
                                  try {
                                    e.target.showPicker();
                                  } catch (err) {
                                    // Fallback for older browsers
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    
                                    const rowProduct = methods.getValues(`items.${index}.product`);
                                    if (rowProduct && rowProduct.trim() !== "" && index === items.length - 1) {
                                      append({ id: generateUUID(), product: "", code: "", unit: "", unitCategory: "", qty: "1", cost: "0", type: "", effect: "" }, { shouldFocus: false });
                                      setTimeout(() => {
                                        document.getElementById(`product-select-${items.length}`)?.focus();
                                      }, 100);
                                    } else {
                                      handleGridNav(e, index);
                                    }
                                  }
                                }}
                              >
                                <option value="+">+</option>
                                <option value="-">-</option>
                              </select>
                            ) : (
                              <input
                                {...register(`items.${index}.effect`)}
                                className={`w-full h-7 bg-transparent border border-transparent rounded px-1 py-0 text-xs font-bold text-center outline-none cursor-not-allowed ${itemWatch.effect === '-' ? 'text-red-500' : itemWatch.effect === '+' ? 'text-green-600' : 'text-[#49293e]'}`}
                                readOnly
                                tabIndex={-1}
                              />
                            )}
                          </td>
                          <td className="px-2 py-1 text-right font-mono text-xs text-gray-600 bg-gray-50/50 border-r border-gray-100">{formatAmount(lineAmount)}</td>
                          <td className="px-2 py-1 text-center w-10">
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => {
                                if (items.length > 1) {
                                  remove(index);
                                } else {
                                  update(index, { id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: "0", type: "", effect: "" } as any);
                                }
                              }}
                              className="p-1.5 rounded-md transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50"
                              disabled={!canSave}
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
                      product: "", code: "", unit: "", qty: "1", cost: "0", type: "", effect: ""
                    }, { shouldFocus: false });
                    
                    setTimeout(() => {
                      document.getElementById(`product-select-${items.length}`)?.focus();
                    }, 50);
                  }}
                  disabled={!canSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#49293e] hover:text-[#3a2132] hover:bg-[#49293e]/5 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>
            </div>

          </div>{/* end scrollable body */}

          {/* ── Compact Action Footer ── */}
          <div className="border-t border-gray-200 bg-gray-50/50 p-3 rounded-b-2xl shrink-0 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2">
                {/* Placeholder for standard left alignment spacing */}
              </div>

              <div className="flex flex-wrap items-center gap-4 justify-end flex-1">
                <div className="flex items-baseline gap-2 bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Grand Total</span>
                  <span className="text-xl font-bold text-[#49293e] leading-none">{formatAmount(totals.grandTotal)}</span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:border-l border-gray-300 sm:pl-4">
                  <Button type="button" variant="secondary" onClick={() => {
                    if (id) {
                      navigate("/dashboard/stock-adjustment");
                    } else {
                      handleClearClick();
                    }
                  }} tabIndex={-1} isAction icon={<Plus size={16} />}>
                    New
                  </Button>
                  <Button id="sa-save-btn" type="button" onClick={onSaveClick} isAction icon={<Save size={16} />} loading={saving} disabled={saving}>
                    Save
                  </Button>
                  <Button type="button" variant="secondary" isAction icon={<Printer size={16} />} onClick={() => setIsPrintModalOpen(true)} disabled={watchedItems.length === 0 || watchedItems[0]?.product === ""}>
                    Print
                  </Button>
                  <Button type="button" variant="secondary" onClick={handleClearClick} isAction icon={<RotateCcw size={16} />}>
                    Clear
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ConfirmDialog
          isOpen={showSaveConfirm}
          title="Save Stock Adjustment"
          message="Are you sure you want to save this stock adjustment?"
          confirmLabel="Save"
          onConfirm={doSave}
          onCancel={() => setShowSaveConfirm(false)}
        />

        <ConfirmDialog
          isOpen={showClearConfirm}
          title="Clear Form"
          message="Are you sure you want to clear the form? All unsaved data will be lost."
          confirmLabel="Clear"
          onConfirm={() => {
            handleReset();
            setShowClearConfirm(false);
          }}
          onCancel={() => setShowClearConfirm(false)}
        />

        <StockAdjustmentPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            if (shouldResetAfterPrint) {
              if (id) {
                navigate("/dashboard/stock-adjustment");
              } else {
                handleReset();
                setShouldResetAfterPrint(false);
              }
            }
          }}
          form={printForm as any}
          items={printItems}
          branches={masterData.branches}
        />
      </FormProvider>
    </PageShell>
  );
};

export default StockAdjustmentPage;
