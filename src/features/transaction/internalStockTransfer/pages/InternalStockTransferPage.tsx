import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { FormProvider, Controller } from "react-hook-form";
import PageShell from "../../../../components/common/PageShell";
import Button from "../../../../components/common/Button";
import FormInput from "../../../../components/common/FormInput";
import SearchableSelect from "../../../../components/common/Searchableselect";
import SearchableCombobox from "../../../../components/common/SearchableCombobox";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { Trash2, Printer, Plus, Save, RotateCcw, ShieldAlert } from "lucide-react";
import { useInternalStockTransfer } from "../hooks/useInternalStockTransfer";
import InternalStockTransferPrintModal from "../components/InternalStockTransferPrintModal";
import { formatAmount } from "../../../../utils/currency";
import { internalStockTransferApi } from "../services/internalStockTransferApi";
import type { InternalStockTransferLineItem } from "../types";
import { generateUUID } from "../../../../utils/uuid";

const InternalStockTransferPage = () => {
  const { id } = useParams();

  const {
    methods,
    fields: items,
    append,
    remove,
    masterData,
    loadingMaster,
    saving,
    grandTotal,
    handleProductSelect,
    handleReset,
    onSubmit,
    watchedItems,
    isPrintModalOpen,
    setIsPrintModalOpen
  } = useInternalStockTransfer(id);

  const { register, control, getValues, formState: { errors } } = methods;

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Dynamic search state
  const [productOptions, setProductOptions] = useState<any[]>(masterData.productOptions || []);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const productSelectedRef = useRef(false);

  useEffect(() => {
    if (masterData.productOptions?.length > 0) {
      setProductOptions(masterData.productOptions);
    }
  }, [masterData.productOptions]);

  const handleProductSearch = useCallback(async (query: string) => {
    if (!query) {
      setProductOptions(masterData.productOptions || []);
      return;
    }
    setSearchingProducts(true);
    try {
      const results = await internalStockTransferApi.getProductsByName(query);
      let mapped = (results || []).map((p: any) => ({
        label: p.productName,
        value: String(p.productId),
        code: p.productCode,
        barcode: p.barcode
      }));

      // Fallback: if name search returns nothing, query by barcode
      if (mapped.length === 0) {
        try {
          const detail = await internalStockTransferApi.getProductCostData(query).catch(() => null);
          if (detail) {
            mapped = [{
              label: detail.productName,
              value: detail.productId.toString(),
              code: detail.productCode || "",
              barcode: query,
            }];
          }
        } catch (e) {
          console.error("Failed to lookup barcode", e);
        }
      }
      
      const seenIds = new Set<string>();
      mapped = mapped.filter((item: any) => {
        if (seenIds.has(item.value)) return false;
        seenIds.add(item.value);
        return true;
      });

      setProductOptions(mapped);
    } catch (e) {
      setProductOptions([]);
    } finally {
      setSearchingProducts(false);
    }
  }, [masterData.productOptions]);

  // Keyboard navigation logic
  const handleGridNav = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, index: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    
    const target = e.currentTarget as HTMLInputElement;
    const name = target.name; 
    if (!name) return;
    
    const parts = name.split("."); // e.g. ["items", "0", "qty"]
    if (parts.length < 3) return;
    const fieldName = parts[2];
    
    // Order: qty -> cost -> append new row
    const order = ["qty", "cost"];
    const fieldIndex = order.indexOf(fieldName);
    
    if (fieldIndex >= 0 && fieldIndex < order.length - 1) {
      const nextFieldName = order[fieldIndex + 1];
      const nextInput = document.querySelectorAll<HTMLInputElement>(`input[name="items.${index}.${nextFieldName}"]`)[0];
      if (nextInput) nextInput.focus();
    } else if (fieldIndex === order.length - 1) {
      const rowProduct = methods.getValues(`items.${index}.product`);
      if (rowProduct && rowProduct.trim() !== "" && index === items.length - 1) {
        append({ id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: "0" }, { shouldFocus: false });
        setTimeout(() => document.getElementById(`product-select-${items.length}`)?.focus(), 50);
      }
    }
  };

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextId) document.getElementById(nextId)?.focus();
    }
  };

  // Map forms/items to display names for the print template
  const printForm = useMemo(() => {
    const vals = getValues();
    return {
      series: vals.series || "",
      refNo: vals.refNo || "",
      date: vals.date || "",
      fromBranch: vals.fromBranch || "",
      toBranch: vals.toBranch || "",
      salesman: vals.salesman || "",
      product: "",
      code: "",
      unit: "",
      unitName: "",
      qty: "0",
      cost: "0",
      amount: "0",
    };
  }, [getValues]);

  const printItems = useMemo<InternalStockTransferLineItem[]>(() => {
    return watchedItems
      .filter((item: any) => item.product && item.product.trim() !== "")
      .map((item: any) => {
        const pOpt = productOptions.find(p => p.value === item.product);
        const uOpt = masterData?.units?.find((u: any) => u.value === String(item.unit));
        return {
          ...item,
          product: pOpt ? pOpt.label : item.product,
          productName: pOpt ? pOpt.label : item.product,
          unitName: uOpt ? uOpt.label : item.unit,
          unit: uOpt ? uOpt.label : item.unit
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

  const onSaveClick = () => {
    const currentItems = getValues("items") || [];
    const validItems = currentItems.filter((i: any) => i.product && i.product.trim() !== "");
    if (validItems.length === 0) {
      methods.setError("items", { message: "Please add at least one product." });
      return;
    }
    setShowSaveConfirm(true);
  };

  const doSave = async () => {
    setShowSaveConfirm(false);
    const currentItems = getValues("items") || [];
    const validItems = currentItems.filter((i: any) => i.product && i.product.trim() !== "");
    if (validItems.length !== currentItems.length) {
      methods.setValue("items", validItems);
    }
    methods.handleSubmit(async (data) => {
      const success = await onSubmit(data);
      if (success) {
        setIsPrintModalOpen(true);
      }
    })();
  };

  const canSave = true; 

  return (
    <PageShell title={id ? "Edit Stock Transfer" : "Create Stock Transfer"}>
      <FormProvider {...methods}>
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm flex flex-col" style={{ height: "calc(100vh - 110px)" }}>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto p-2 md:p-3">

            {/* ── Header Fields ── Extremely dense padding to save space */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 lg:grid-cols-[1fr_0.7fr_1.1fr_1.2fr_1.2fr_1.2fr] gap-x-2 gap-y-1.5 mb-2">
              <FormInput autoFocus inputClassName="!h-8 !px-2 !text-xs text-[#49293e]" id="st-series" label="Series" {...register("series")} onKeyDown={(e) => hk(e, "st-date")} readOnly={!canSave} error={errors.series?.message as string} />
              <FormInput inputClassName="!h-8 !px-2 !text-xs cursor-not-allowed text-[#49293e]" id="st-refNo" label="Ref No" {...register("refNo")} readOnly={true} tabIndex={-1} error={errors.refNo?.message as string} />
              <FormInput inputClassName="!h-8 !px-2 !text-xs" id="st-date" label="Date" type="date" {...register("date")} onKeyDown={(e) => hk(e, "st-fromBranch")} readOnly={!canSave} error={errors.date?.message as string} />
              
              <Controller name="fromBranch" control={control} render={({ field }) => (
                <SearchableSelect className="h-8 !px-2 !text-xs" id="st-fromBranch" label="From Branch" value={field.value} options={masterData.fromBranches} onChange={field.onChange} onKeyDown={(e) => hk(e, "st-toBranch")} disabled={!canSave || loadingMaster} error={errors.fromBranch?.message as string} />
              )} />
              <Controller name="toBranch" control={control} render={({ field }) => (
                <SearchableSelect className="h-8 !px-2 !text-xs" id="st-toBranch" label="To Branch" value={field.value} options={masterData.toBranches} onChange={field.onChange} onKeyDown={(e) => hk(e, "st-salesman")} disabled={!canSave || loadingMaster} error={errors.toBranch?.message as string} />
              )} />
              <Controller name="salesman" control={control} render={({ field }) => (
                <SearchableSelect className="h-8 !px-2 !text-xs" id="st-salesman" label="Salesman" value={field.value} options={masterData.employees} onChange={field.onChange} disabled={!canSave || loadingMaster} error={errors.salesman?.message as string} />
              )} />
            </div>

            {/* ── Inline Editable DataGrid ── */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <div className="max-h-[400px] overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      {["SL", "Product", "Code", "Unit", "Qty", "Cost", "Amount", ""].map(
                        (col, i) => (
                          <th key={i} className={`sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 ${col === "Qty" || col === "Cost" || col === "Amount" ? "text-right" : ""}`}>
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {items.map((item, index) => {
                      const itemWatch = watchedItems[index] || {};
                      const qty = Number(itemWatch.qty) || 0;
                      const cost = Number(itemWatch.cost) || 0;
                      const lineAmount = qty * cost;

                      return (
                        <tr key={item.id} className="hover:bg-[#49293e]/5 transition-colors">
                          <td className="px-2 py-1 text-center font-bold text-gray-400 border-r border-gray-100 w-10">{index + 1}</td>
                          <td className="p-0 border-r border-gray-100 min-w-[200px] max-w-sm">
                            <Controller
                              name={`items.${index}.product`}
                              control={control}
                              render={({ field: selectField }) => (
                                <div className="relative">
                                  <SearchableCombobox
                                    id={`product-select-${index}`}
                                    className="h-7 !px-2 text-xs"
                                    value={selectField.value}
                                    options={productOptions}
                                    onSearch={handleProductSearch}
                                    loading={searchingProducts}
                                    minQueryLength={1}
                                    forcePlacement="bottom"
                                    onChange={(val) => {
                                      productSelectedRef.current = true;
                                      selectField.onChange(val);
                                      const opt = productOptions.find(o => o.value === val);
                                      if (opt) {
                                        methods.setValue(`items.${index}.code`, opt["code"] || "");
                                        handleProductSelect(index, val);
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
                                          try {
                                            const bcRes = await internalStockTransferApi.getProductsByBarcode(rawValue.trim());
                                            if (bcRes && bcRes.length > 0) {
                                              const p = bcRes[0];
                                              setProductOptions(prev => {
                                                if (prev.find(o => o.value === String(p.productId))) return prev;
                                                return [...prev, { label: p.productName, value: String(p.productId), code: p.productCode, barcode: p.barcode }];
                                              });
                                              methods.setValue(`items.${index}.product`, String(p.productId));
                                              methods.setValue(`items.${index}.code`, p.productCode || "");
                                              handleProductSelect(index, String(p.productId));
                                              setTimeout(() => {
                                                const qtyInputs = document.querySelectorAll<HTMLInputElement>(`input[name="items.${index}.qty"]`);
                                                qtyInputs[0]?.focus();
                                              }, 100);
                                              return;
                                            }
                                          } catch (err) {}
                                          return;
                                        }
                                        if (items.length > 1) remove(index);
                                        setTimeout(() => document.getElementById("st-save-btn")?.focus(), 50);
                                      }
                                    }}
                                    disabled={!canSave}
                                  />
                                </div>
                              )}
                            />
                          </td>
                          <td className="px-2 py-1 text-[10px] text-gray-500 border-r border-gray-100 bg-gray-50/50">{itemWatch.code || "-"}</td>
                          <td className="p-0 border-r border-gray-100 w-24 relative">
                            <Controller
                              name={`items.${index}.unit`}
                              control={control}
                              render={({ field: selectField }) => (
                                <SearchableSelect
                                  className="h-7 !px-2 text-xs border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
                                  value={selectField.value}
                                  options={masterData?.units || []}
                                  onChange={(val) => selectField.onChange(val)}
                                  disabled={!canSave}
                                  placeholder="Unit"
                                  disableAutoOpenOnFocus={true}
                                />
                              )}
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100 w-24">
                            <input
                              type="number"
                              step="any"
                              {...register(`items.${index}.qty`)}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => handleGridNav(e, index)}
                              className="w-full h-7 bg-transparent text-right border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-2 py-0 text-xs font-medium text-gray-900 outline-none transition-colors"
                              readOnly={!canSave}
                            />
                          </td>
                          <td className="p-0 border-r border-gray-100 w-24">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              {...register(`items.${index}.cost`)}
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => handleGridNav(e, index)}
                              className="w-full h-7 bg-transparent text-right border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-2 py-0 text-xs text-gray-600 outline-none transition-colors"
                              readOnly={!canSave}
                            />
                          </td>

                          <td className="px-2 py-1 text-right font-bold text-gray-900 border-r border-gray-100 bg-gray-50/50 w-28">
                            {formatAmount(lineAmount)}
                          </td>
                          <td className="px-1 py-1 text-center w-10">
                            <button
                              type="button"
                              onClick={() => {
                                if (items.length === 1) {
                                  methods.setValue(`items.${index}`, { id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: "0" });
                                } else {
                                  remove(index);
                                }
                              }}
                              disabled={!canSave}
                              className="inline-flex rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 transition-colors mx-auto"
                              tabIndex={-1}
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
                    append({ id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: "0" }, { shouldFocus: false });
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
            
            {errors.items?.message && (
              <p className="mt-1 text-xs text-red-500">{errors.items.message as string}</p>
            )}

          </div>

          {/* ── Compact Action Footer ── */}
          <div className="border-t border-gray-200 bg-gray-50/50 p-3 rounded-b-2xl shrink-0 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div className="flex items-baseline gap-2 bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Grand Total</span>
                <span className="text-xl font-bold text-[#49293e] leading-none">{formatAmount(grandTotal)}</span>
              </div>

              <div className="flex items-center gap-1.5 sm:border-l border-gray-300 sm:pl-4">
                {id && (
                  <Button type="button" variant="danger" icon={<ShieldAlert size={16} />} onClick={() => {}} disabled={true} tabIndex={-1}>
                    Cancel Transfer
                  </Button>
                )}
                <Button type="button" variant="secondary" onClick={handleClearClick} tabIndex={-1} isAction icon={<Plus size={16} />}>
                  New
                </Button>
                <Button id="st-save-btn" type="button" onClick={onSaveClick} isAction icon={<Save size={16} />} loading={saving} disabled={saving || !canSave}>
                  Save
                </Button>
                <Button type="button" variant="secondary" isAction icon={<Printer size={16} />} onClick={() => setIsPrintModalOpen(true)} disabled={items.length === 0 || items[0]?.product === ""}>
                  Print
                </Button>
                <Button type="button" variant="secondary" onClick={handleClearClick} isAction icon={<RotateCcw size={16} />}>
                  Clear
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Confirmation Modals ── */}
        <ConfirmDialog
          isOpen={showClearConfirm}
          title="Clear Form"
          message="Are you sure you want to clear the form? All unsaved data will be lost."
          confirmLabel="Clear Data"
          confirmVariant="danger"
          onConfirm={() => {
            handleReset();
            setShowClearConfirm(false);
          }}
          onCancel={() => setShowClearConfirm(false)}
        />

        <ConfirmDialog
          isOpen={showSaveConfirm}
          title="Save Stock Transfer"
          message={`Are you sure you want to save this internal stock transfer with ${items.length} item(s)?`}
          confirmLabel="Save"
          onConfirm={doSave}
          onCancel={() => setShowSaveConfirm(false)}
        />

        <InternalStockTransferPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => {
            setIsPrintModalOpen(false);
            if (!id) handleReset();
          }}
          form={printForm as any}
          items={printItems as any}
          branches={masterData.fromBranches}
          toBranches={masterData.toBranches}
        />
      </FormProvider>
    </PageShell>
  );
};

export default InternalStockTransferPage;
