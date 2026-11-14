import { useEffect, useMemo, useState } from "react";
import { Controller } from "react-hook-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Save, Plus, Trash2, RotateCcw } from "lucide-react";
import GridFindBar from "../../../../components/common/GridFindBar";
import { useGridFind, gridFindRowClass } from "../../../../hooks/useGridFind";
import type { GridFindLine, GridFindOption } from "../../../../utils/gridFind";
import {
  FormInput,
  Button,
  SearchableSelect,
  ConfirmDialog
} from "../../../../components/common";
import { DocumentFormShell } from "../../shared/documentForm/DocumentFormShell";
import { ClearFormDialog } from "../../shared/documentForm/ClearFormDialog";
import { focusOnEnter, makeRowEnter } from "../../shared/documentForm/documentKeys";
import { usePhysicalEntry, calculateLine } from "../hooks/usePhysicalEntry";
import { formatDateOnly } from "../services/physicalEntryApi";
import { useCurrency } from "../../../../hooks/useCurrency";
import type { PhysicalEntryLineItem } from "../types";
import { useToast } from "../../../../app/providers/useToast";
import { generateUUID } from "../../../../utils/uuid";

const PhysicalEntryPage = () => {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const { showToast } = useToast();

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const {
    methods,
    items,
    append,
    remove,
    update,
    totals,
    branches,
    employees,
    categoryUnits,
    searchingProducts,
    saving,
    isBranchLocked,
    loadingMaster,
    handleProductSearch,
    handleItemProductChange,
    handleBarcodeScan,
    handleUnitChange,
    handleFormSubmit,
    handleReset,
    getRowOptions,
  } = usePhysicalEntry(id);

  const { control, watch, register, getValues, formState: { errors } } = methods;
  
  const canSave = true; // By default enabled
  const peItems = watch("items") || [];

  // Find a product in the lines (same box as Provider Settings): name as shown in the product box, or the code
  const findRows = useMemo(
    () =>
      (peItems as GridFindLine[]).map((it, i) => ({
        productId: it?.product || 0,
        productName: getRowOptions(i).find((o: GridFindOption) => String(o.value) === String(it?.product))?.label ?? it?.productName,
        productCode: it?.code,
      })),
    [peItems, getRowOptions]
  );
  const find = useGridFind(findRows, "pe-line-row");
  
  // Custom focus navigation handler
  const hk = (e: React.KeyboardEvent, nextId: string) => focusOnEnter(e, nextId, 50);

  // Enter on an empty line leaves the grid for Save
  const handleGridNav = makeRowEnter({
    getRowProduct: (rowIndex) => methods.getValues(`items.${rowIndex}.product`),
    rowCount: items.length,
    removeRow: remove,
    exitToId: "pe-save-btn",
  });

  useEffect(() => {
    setTimeout(() => {
      document.getElementById("pe-date")?.focus();
    }, 200);
  }, []);

  const handleClearClick = () => {
    const currentItems = getValues("items") || [];
    if (currentItems.length > 1 || (currentItems[0] && currentItems[0].product)) {
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
              const elId = document.getElementById(`pe-${firstErrorKey}`);
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
      const success = await handleFormSubmit(data);
      if (success) {
        navigate("/dashboard/physical-entries");
      }
    })();
  };




  const isEditMode = !!id;
  const hasProductsAdded = items.some((item: any) => item.product && String(item.product).trim() !== "");

  const dialogs = (
    <>
      <ConfirmDialog
        isOpen={showSaveConfirm}
        title="Save Physical Entry"
        message="Are you sure you want to save this physical entry? This will replace current stock."
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
    </>
  );

  return (
    <DocumentFormShell
      title={isEditMode ? "Edit Physical Entry" : "New Physical Entry"}
      methods={methods}
      closeTo="/dashboard/physical-entries"
      dialogs={dialogs}
    >
          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto p-2 md:p-3">

            {/* ── Header Fields ── Extremely dense padding to save space */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-2 gap-y-1.5 mb-2">
              <FormInput inputClassName="!h-8 !px-2 !text-xs cursor-not-allowed text-[#49293e]" id="pe-refNo" label="Ref No" {...register("refNo")} readOnly={true} tabIndex={-1} error={errors.refNo?.message as string} />
              <FormInput inputClassName="!h-8 !px-2 !text-xs" id="pe-date" label="Date" type="date" {...register("date")} onKeyDown={(e) => hk(e, "pe-branch")} readOnly={!canSave || loadingMaster} error={errors.date?.message as string} max={formatDateOnly(new Date())} />
              
              <Controller name="branch" control={control} render={({ field }) => (
                <SearchableSelect className="!h-8 !px-2 !text-xs" id="pe-branch" label="Branch" placeholder="Select Branch" value={field.value} options={branches} onChange={field.onChange} onKeyDown={(e) => hk(e, "pe-salesman")} disabled={!canSave || loadingMaster || isEditMode || isBranchLocked || hasProductsAdded} error={errors.branch?.message as string} />
              )} />
              <Controller name="salesman" control={control} render={({ field }) => (
                <SearchableSelect className="!h-8 !px-2 !text-xs" id="pe-salesman" label="Salesman" placeholder="Select Employee" value={field.value} options={employees} onChange={field.onChange} onKeyDown={(e) => hk(e, "product-select-0")} disabled={!canSave || loadingMaster} error={errors.salesman?.message as string} />
              )} />
            </div>

            {/* ── Inline Editable DataGrid ── */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <GridFindBar find={find} id="pe-line-find" />
              <div className="max-h-[350px] overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      <th className="px-2 py-1.5 font-bold text-gray-500 text-[10px] uppercase tracking-wider w-8 text-center">SL</th>
                      <th className="px-2 py-1.5 font-bold text-gray-500 text-[10px] uppercase tracking-wider min-w-[200px]">Product</th>
                      <th className="px-2 py-1.5 font-bold text-gray-500 text-[10px] uppercase tracking-wider w-24">Code</th>
                      <th className="px-2 py-1.5 font-bold text-gray-500 text-[10px] uppercase tracking-wider w-24">Curr Stock</th>
                      <th className="px-2 py-1.5 font-bold text-gray-500 text-[10px] uppercase tracking-wider w-24">Unit</th>
                      <th className="px-2 py-1.5 font-bold text-gray-500 text-[10px] uppercase tracking-wider text-right w-24">Physical Stock</th>
                      <th className="px-2 py-1.5 font-bold text-gray-500 text-[10px] uppercase tracking-wider text-right w-24">Cost</th>
                      <th className="px-2 py-1.5 font-bold text-gray-500 text-[10px] uppercase tracking-wider text-right w-28 border-l border-gray-100">Amount</th>
                      <th className="px-2 py-1.5 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loadingMaster && isEditMode ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-xs text-gray-500">
                          <div className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-[#49293e] border-t-transparent rounded-full animate-spin" />
                            <span>Loading entry details...</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      items.map((field, index) => {
                      const itemWatch = watch(`items.${index}`);
                      const lineAmount = calculateLine(itemWatch as PhysicalEntryLineItem).amount;
                      const rowOptions = getRowOptions(index);
                      const unitCat = watch(`items.${index}.unitCategory`);
                      const rawUnitList = categoryUnits[unitCat] || [];
                      const curUnit = watch(`items.${index}.unit`);
                      const unitOptions = (curUnit && !rawUnitList.some(u => u.value === curUnit))
                        ? [{ label: (itemWatch as any)?.unitName || "Unit", value: curUnit, currentValue: 1 }, ...rawUnitList]
                        : rawUnitList;

                      return (
                        <tr key={field.id} id={`pe-line-row-${index}`} data-find={find.rowState(index)} className={`transition-colors group ${gridFindRowClass(find.rowState(index)) || "hover:bg-gray-50/30"}`}>
                          <td className="px-2 py-1 text-center font-mono text-gray-400 border-r border-gray-100">{index + 1}</td>
                          <td className="px-2 py-1 relative">
                            <Controller
                              name={`items.${index}.product`}
                              control={control}
                              render={({ field: f }) => (
                                <SearchableSelect
                                  id={`product-select-${index}`}
                                  value={f.value}
                                  options={rowOptions}
                                  onSearch={handleProductSearch}
                                  loading={searchingProducts}
                                  onChange={(val) => {
                                    handleItemProductChange(index, val);
                                    if (val) setTimeout(() => document.getElementById(`qty-input-${index}`)?.focus(), 50);
                                  }}
                                  onBarcodeScan={async (barcode) => {
                                    const success = await handleBarcodeScan(index, barcode);
                                    if (success) {
                                      setTimeout(() => document.getElementById(`qty-input-${index}`)?.focus(), 50);
                                    }
                                  }}
                                  onKeyDown={(e) => handleGridNav(e, index)}
                                  disabled={!canSave}
                                  placeholder="Search or scan..."
                                  allowClear
                                  className="!h-7 !text-xs !border-transparent hover:!border-gray-200"
                                />
                              )}
                            />
                          </td>
                          <td className="px-2 py-1 text-gray-600 font-mono text-[11px] truncate" title={itemWatch.code}>{itemWatch.code || "-"}</td>
                          <td className="px-2 py-1 text-gray-600 font-mono text-[11px] truncate">{itemWatch.stock || "-"}</td>
                          <td className="px-2 py-1">
                            <Controller
                              name={`items.${index}.unit`}
                              control={control}
                              render={({ field: f }) => (
                                <select
                                  id={`unit-select-${index}`}
                                  {...f}
                                  className={`w-full h-7 border rounded px-1 py-0 text-xs outline-none transition-colors
                                    ${!itemWatch.product || unitOptions.length <= 1
                                      ? "bg-gray-50 border-transparent text-gray-400 cursor-not-allowed"
                                      : "bg-transparent border-transparent hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-gray-700 cursor-pointer"
                                    }`}
                                  disabled={!canSave || !itemWatch.product || unitOptions.length <= 1}
                                  tabIndex={unitOptions.length > 1 && !!itemWatch.product ? 0 : -1}
                                  onChange={(e) => {
                                    f.onChange(e);
                                    handleUnitChange(index, e.target.value);
                                    setTimeout(() => document.getElementById(`qty-input-${index}`)?.focus(), 50);
                                  }}
                                  onKeyDown={(e) => handleGridNav(e, index)}
                                >
                                  <option value="">Unit</option>
                                  {unitOptions.map(u => (
                                    <option key={u.value} value={u.value}>{u.label}</option>
                                  ))}
                                </select>
                              )}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              id={`qty-input-${index}`}
                              type="number"
                              min="0"
                              step="any"
                              {...register(`items.${index}.qty`)}
                              className="w-full h-7 bg-transparent border border-transparent hover:border-gray-200 focus:bg-white rounded px-1 py-0 text-xs font-mono text-right outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              placeholder="0"
                              readOnly={!canSave}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => handleGridNav(e, index)}
                            />
                          </td>
                          <td className="px-2 py-1">
                            <input
                              id={`cost-input-${index}`}
                              type="number"
                              min="0"
                              step="any"
                              {...register(`items.${index}.cost`)}
                              className="w-full h-7 bg-transparent border border-transparent hover:border-gray-200 focus:bg-white rounded px-1 py-0 text-xs font-mono text-right outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              placeholder="0.000"
                              readOnly={!canSave}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const rowProduct = getValues(`items.${index}.product`);
                                  if (rowProduct && rowProduct.trim() !== "" && index === items.length - 1) {
                                    append({ id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: "0" }, { shouldFocus: false });
                                    setTimeout(() => document.getElementById(`product-select-${items.length}`)?.focus(), 100);
                                  } else {
                                    handleGridNav(e, index);
                                  }
                                }
                              }}
                            />
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
                                  update(index, { id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: "0" } as any);
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
                    }))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50/90 font-bold text-xs">
                      <td colSpan={5} className="px-2 py-1.5 text-left">
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
                          className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-[#49293e] hover:text-[#3a2132] hover:bg-[#49293e]/10 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Plus size={14} /> Add Item
                        </button>
                      </td>
                      <td colSpan={2} className="px-3 py-1.5 text-right text-gray-500 uppercase text-[10px] tracking-wider font-extrabold">
                        Grand Total
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-sm text-[#49293e] font-black bg-gray-100/80 border-r border-gray-100">
                        {formatAmount(totals.grandTotal)}
                      </td>
                      <td className="px-2 py-1.5 w-10"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

          </div>{/* end scrollable body */}

          {/* ── Compact Action Footer ── */}
          <div className="border-t border-gray-200 bg-gray-50/50 p-3 rounded-b-2xl shrink-0 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-4 w-full">
              <div className="flex-1 min-w-[250px]">
                <FormInput
                  id="pe-narration"
                  label="Narration"
                  {...register("narration")}
                  placeholder="Enter any notes or details..."
                  readOnly={!canSave}
                  error={errors.narration?.message as string}
                  inputClassName="!h-9 !text-xs bg-white w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => {
                  if (id) {
                    navigate("/dashboard/physical-entry");
                  } else {
                    handleClearClick();
                  }
                }} tabIndex={-1} isAction icon={<Plus size={16} />}>
                  New
                </Button>
                <Button id="pe-save-btn" type="button" onClick={onSaveClick} isAction icon={<Save size={16} />} loading={saving} disabled={saving}>
                  Save Entry
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

export default PhysicalEntryPage;
