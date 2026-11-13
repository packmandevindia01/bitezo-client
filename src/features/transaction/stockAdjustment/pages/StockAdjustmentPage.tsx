import { useEffect, useMemo, useState, useRef } from "react";
import { Save, RotateCcw, Trash2, Plus, Printer } from "lucide-react";
import { Button, FormInput, SearchableSelect, SearchableCombobox } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { DocumentFormShell } from "../../shared/documentForm/DocumentFormShell";
import { ClearFormDialog } from "../../shared/documentForm/ClearFormDialog";
import { focusOnEnter, makeRowEnter, focusLineQty, focusLineProduct } from "../../shared/documentForm/documentKeys";
import StockAdjustmentPrintModal from "../components/StockAdjustmentPrintModal";
import type { StockAdjustmentLineItem } from "../types";
import { getLineUnitOptions } from "../../shared/lineUnits";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useStockAdjustment, formatDateOnly } from "../hooks/useStockAdjustment";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Controller } from "react-hook-form";
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

  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);
  const activeItem = watchedItems[activeRowIndex] || watchedItems[0] || {};

  const hk = (e: React.KeyboardEvent, nextId?: string) => focusOnEnter(e, nextId);

  // Enter on an empty line leaves the grid for Save
  const handleGridNav = makeRowEnter({
    getRowProduct: (rowIndex) => methods.getValues(`items.${rowIndex}.product`),
    rowCount: items.length,
    removeRow: remove,
    exitToId: "sa-save-btn",
  });

  const appendBlankLine = () =>
    append({ id: generateUUID(), product: "", code: "", unit: "", unitCategory: "", qty: "1", cost: formatAmount(0), type: "", effect: "" }, { shouldFocus: false });

  /** Enter on the last field of a line: the last filled line gets a new line after it, other lines move on. */
  const addLineOrMoveOn = (e: React.KeyboardEvent, index: number) => {
    const rowProduct = methods.getValues(`items.${index}.product`);
    if (rowProduct && rowProduct.trim() !== "" && index === items.length - 1) {
      handleProductSearch("");
      appendBlankLine();
      focusLineProduct(items.length, 100);
    } else {
      handleGridNav(e, index);
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
      date: vals.date ? formatDateOnly(vals.date) : formatDateOnly(new Date()),
      transDate: vals.date ? formatDateOnly(vals.date) : formatDateOnly(new Date()),
      branch: vals.branch || "",
      salesman: vals.salesman || "",
      product: "",
      code: "",
      unit: "",
      unitName: "",
      qty: "0",
      cost: "0",
      type: "",
      typeName: "",
      effect: "",
      amount: "0",
    };
    // Read again each time the preview opens: the form has no values yet when the page first renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getValues, isPrintModalOpen]);

  const printItems = useMemo<StockAdjustmentLineItem[]>(() => {
    return watchedItems
      .filter((item: any) => item.product && item.product.trim() !== "")
      .map((item: any) => {
        const pOpt = productOptions.find(p => p.value === item.product);
        const uOpt = masterData?.units?.find(u => u.value === String(item.unit));
        const tOpt = masterData?.types?.find(t => t.value === String(item.type));
        return {
          ...item,
          productName: pOpt?.label ?? item.productName ?? item.product,
          unitName: uOpt ? uOpt.label : item.unit,
          typeName: tOpt ? tOpt.label : item.type,
        };
      });
  }, [watchedItems, productOptions, masterData]);

  const handleClearClick = () => {
    if (items.length > 1 || (watchedItems[0] && watchedItems[0].product)) {
      setShowClearConfirm(true);
    } else {
      handleReset();
    }
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
    setShowSaveConfirm(true);
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

  const handleCostBlur = (index: number, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      methods.setValue(`items.${index}.cost`, formatAmount(num));
    } else {
      methods.setValue(`items.${index}.cost`, formatAmount(0));
    }
  };

  const canSave = true; // By default enabled

  const dialogs = (
    <>
      <ConfirmDialog
        isOpen={showSaveConfirm}
        title="Save Stock Adjustment"
        message="Are you sure you want to save this stock adjustment?"
        confirmLabel="Save"
        onConfirm={doSave}
        onCancel={() => setShowSaveConfirm(false)}
      />

      <ClearFormDialog
        isOpen={showClearConfirm}
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
    </>
  );

  return (
    <DocumentFormShell
      title={id ? "Edit Stock Adjustment" : "Create Stock Adjustment"}
      methods={methods}
      closeTo="/dashboard/stock-adjustments"
      masterError={masterError}
      dialogs={dialogs}
    >
          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto p-2 md:p-3">

            {/* ── Header Fields ── Dense padding */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1.5 mb-2">
              <FormInput required={true} inputClassName="!h-8 !px-2 !text-xs font-mono font-bold bg-gray-50 cursor-not-allowed" id="sa-refNo" label="Ref No" type="text" {...register("refNo")} readOnly error={errors.refNo?.message as string} />
              <FormInput required={true} autoFocus inputClassName="!h-8 !px-2 !text-xs" id="sa-date" label="Date" type="date" max={formatDateOnly(new Date())} {...register("date")} onKeyDown={(e) => hk(e, "sa-branch")} readOnly={!canSave} error={errors.date?.message as string} />
              
              <Controller name="branch" control={control} render={({ field }) => (
                <SearchableSelect required={true} className="!h-8 !px-2 !text-xs" id="sa-branch" label="Branch" placeholder="Select Branch" value={field.value} options={masterData.branches} onChange={field.onChange} onKeyDown={(e) => hk(e, "sa-salesman")} disabled={!canSave || loadingMaster || isBranchLocked || Boolean(id)} clearable={!id} error={errors.branch?.message as string} />
              )} />
              <Controller name="salesman" control={control} render={({ field }) => (
                <SearchableSelect required={true} className="!h-8 !px-2 !text-xs" id="sa-salesman" label="Salesman" placeholder="Select Employee" value={field.value} options={masterData.employees} onChange={field.onChange} onKeyDown={(e) => hk(e, "product-select-0")} disabled={!canSave || loadingMaster} error={errors.salesman?.message as string} />
              )} />
            </div>

            {/* ── Inline Editable DataGrid ── */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="max-h-[400px] overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      {[
                        { label: "SL", align: "text-center" },
                        { label: "Product", align: "text-left" },
                        { label: "Code", align: "text-center" },
                        { label: "Unit", align: "text-center" },
                        { label: "Qty", align: "text-right" },
                        { label: "Cost", align: "text-right" },
                        { label: "Type", align: "text-center" },
                        { label: "Effect", align: "text-center" },
                        { label: "Amount", align: "text-right" },
                        { label: "", align: "text-center" },
                      ].map((col, i) => (
                        <th key={i} className={`sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 ${col.align}`}>
                          {col.label}
                        </th>
                      ))}
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
                        <tr key={item.id} onFocusCapture={() => setActiveRowIndex(index)} className="hover:bg-[#49293e]/5 transition-colors">
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
                                      focusLineQty(index, 100);
                                    }}
                                    onKeyDown={async (e) => {
                                      if (e.key === "Enter") {
                                        if (productSelectedRef.current) {
                                          productSelectedRef.current = false;
                                          focusLineQty(index, 100);
                                          return;
                                        }
                                        const rawValue = e.currentTarget.value;
                                        const formProduct = methods.getValues(`items.${index}.product`);
                                        // Avoid treating formatted labels (e.g. "[3] CHICKEN") as barcodes
                                        if (rawValue && rawValue.trim().length > 0 && !rawValue.includes("[")) {
                                          e.preventDefault();
                                          const success = await handleBarcodeScan(index, rawValue.trim());
                                          if (success) {
                                            focusLineQty(index, 100);
                                          }
                                          return;
                                        }
                                        
                                        if (!formProduct || formProduct.trim() === "") {
                                          if (items.length > 1) remove(index);
                                          setTimeout(() => document.getElementById("sa-save-btn")?.focus(), 50);
                                        } else {
                                          e.preventDefault();
                                          focusLineQty(index, 100);
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
                          <td className="px-2 py-1 text-[10px] text-center text-gray-500 border-r border-gray-100 bg-gray-50/50">{itemWatch.code || "-"}</td>
                          <td className="p-0 border-r border-gray-100 w-24 relative">
                            <Controller
                              name={`items.${index}.unit`}
                              control={control}
                              render={({ field: selectField }) => (
                                <SearchableSelect
                                  id={`unit-select-${index}`}
                                  className="h-7 !px-2 text-xs border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
                                  value={selectField.value}
                                  options={getLineUnitOptions(itemWatch, categoryUnits, masterData?.units)}
                                  onChange={(val) => {
                                    handleUnitChange(index, val);
                                    focusLineQty(index, 100);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      focusLineQty(index);
                                    }
                                  }}
                                  disabled={!canSave || !itemWatch.product}
                                  clearable={false}
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
                            <input
                              type="text"
                              inputMode="decimal"
                              {...register(`items.${index}.cost`)}
                              onFocus={(e) => e.target.select()}
                              onBlur={(e) => handleCostBlur(index, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  handleCostBlur(index, e.currentTarget.value);
                                }
                                handleGridNav(e, index);
                              }}
                              className="w-full h-7 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-1 py-0 text-xs outline-none font-mono"
                              readOnly={!canSave}
                            />
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
                                      handleProductSearch("");
                                      // Wait slightly longer than SearchableSelect's internal 50ms handleFocusNextInput
                                      setTimeout(() => {
                                        appendBlankLine();
                                        focusLineProduct(items.length, 50);
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
                                        addLineOrMoveOn(e, index);
                                      }
                                    }
                                  }}
                                  disabled={!canSave}
                                  placeholder="Select Type"
                                />
                              )}
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100 w-20 text-center">
                            {isEffectEditable ? (
                              <select
                                id={`effect-select-${index}`}
                                {...register(`items.${index}.effect`)}
                                className="w-full h-7 bg-transparent border border-transparent rounded px-1 py-0 text-xs font-bold text-center outline-none cursor-pointer text-[#49293e] focus:border-blue-500 focus:ring-0"
                                onFocus={(e) => {
                                  try {
                                    e.target.showPicker();
                                  } catch {
                                    // Fallback for older browsers
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addLineOrMoveOn(e, index);
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
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    addLineOrMoveOn(e, index);
                                  }
                                }}
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
                                  update(index, { id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: formatAmount(0), type: "", effect: "" } as any);
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
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50/80 font-bold">
                      <td colSpan={4} className="px-2 py-1.5 text-left">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              handleProductSearch("");
                              appendBlankLine();
                              focusLineProduct(items.length, 50);
                            }}
                            disabled={!canSave}
                            className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#49293e] hover:text-[#3a2132] hover:bg-[#49293e]/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Plus size={14} /> Add Item
                          </button>
                          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-md border border-gray-200 shadow-sm">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Stock</span>
                            <span className="text-xs font-bold text-gray-700 font-mono">{activeItem.stock || "0.000"}</span>
                          </div>
                        </div>
                      </td>
                      <td colSpan={4} className="px-3 py-1.5 text-right text-[11px] uppercase tracking-wider text-gray-500 font-bold">
                        Grand Total:
                      </td>
                      <td className="px-2 py-1.5 text-right font-bold text-sm text-[#49293e] border-r border-gray-200 bg-[#49293e]/5 font-mono">
                        {formatAmount(totals.grandTotal)}
                      </td>
                      <td className="px-1 py-1.5"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>{/* end scrollable body */}

          {/* ── Compact Action Footer ── */}
          <div className="border-t border-gray-200 bg-gray-50/50 p-3 rounded-b-2xl shrink-0 flex flex-col gap-3">
            <div className="flex flex-wrap items-end justify-between gap-3 w-full">
              <div className="flex items-end gap-3 flex-1 min-w-[280px]">
                <div className="flex-1 max-w-md">
                  <FormInput
                    id="sa-narration"
                    label="Narration"
                    maxLength={200}
                    {...register("narration")}
                    placeholder="Enter narration / remarks..."
                    readOnly={!canSave}
                    error={errors.narration?.message as string}
                    inputClassName="!h-8 !text-xs !px-2 bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:border-l border-gray-300 sm:pl-4">
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
    </DocumentFormShell>
  );
};

export default StockAdjustmentPage;
