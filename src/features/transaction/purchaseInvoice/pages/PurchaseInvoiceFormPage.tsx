import React, { useEffect, useState, useMemo, useRef } from "react";
import { Printer, Save, RotateCcw, Plus, Trash2, X as CloseIcon } from "lucide-react";
import { Button, FormInput, PageShell, SearchableSelect, SearchableCombobox, Modal } from "../../../../components/common";
import ConfirmDialog from "../../../../components/common/ConfirmDialog";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useCurrency } from "../../../../hooks/useCurrency";
import { usePurchaseInvoice, calculateLine } from "../hooks/usePurchaseInvoice";
import { BackofficeMultiPayModal } from "../../../transaction/shared/components/BackofficeMultiPayModal";
import { PurchasePrintPreviewModal } from "../../shared/components/PurchasePrintPreviewModal";
import type { PurchasePrintData } from "../../shared/components/PurchasePrintTemplate";
import { useParams, useNavigate } from "react-router-dom";
import { FormProvider, Controller } from "react-hook-form";
import { useToast } from "../../../../app/providers/useToast";
import { generateUUID } from "../../../../utils/uuid";
import SupplierForm from "../../../general/supplier/components/SupplierForm";
import { createSupplier } from "../../../general/supplier/services/index";

const PurchaseInvoiceFormPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const { formatAmount } = useCurrency();
  const { showToast } = useToast();

  const {
    methods,
    items,
    append,
    remove,
    update,
    isBranchLocked,
    watchedItems,
    payments,
    totals,
    showClearConfirm,
    setShowClearConfirm,
    handleReset,
    handleClearClick,
    onSubmit,
    isMultiPayOpen,
    setIsMultiPayOpen,
    handleSettlementSubmit,
    handleSinglePayment,
    paymodeList,
    multiPayId,
    selectedPaymodeId,
    setSelectedPaymodeId,
    masterData,
    loadingMaster,
    masterError,
    productOptions,
    searchingProducts,
    handleBarcodeScan,
    supplierOptions,
    searchingSuppliers,
    handleSupplierSearch,
    handleSupplierCreated,
    handleProductSelect,
    handleUnitChange,
    saving,
    grossTotal,
    watchedDiscAmount,
    categoryUnits,
  } = usePurchaseInvoice(id);

  const { register, control, getValues, formState: { errors } } = methods;

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [shouldResetAfterPrint, setShouldResetAfterPrint] = useState(false);

  // Supplier modal state
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  const handleCreateSupplier = async (payload: any) => {
    try {
      setCreatingSupplier(true);
      const res = await createSupplier(payload);
      const newId = res?.data?.id;
      if (newId) {
        showToast("Supplier created successfully", "success");
        setIsSupplierModalOpen(false);
        handleSupplierCreated(newId, payload.name || "New Supplier");
      }
    } catch (error: any) {
      showToast(error.message || "Failed to create supplier", "error");
    } finally {
      setCreatingSupplier(false);
    }
  };

  // Paymode dropdown state — store previous selection so cancel restores it cleanly
  const previousPaymodeId = useRef<number>(0);
  const [paymodeSelectKey, setPaymodeSelectKey] = useState(0);
  // Tracks whether a product was just selected via Enter (so we don't exit grid accidentally)
  const productSelectedRef = useRef(false);

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);
  const activeItem = watchedItems[activeRowIndex] || watchedItems[0] || {};

  // Show confirm dialog before saving
  const onSaveClick = async () => {
    const headerFields = ["series", "purchaseNo", "purchaseDate", "invoiceNo", "refNo", "invoiceDate", "supplier", "branch", "salesman"];
    const isHeaderValid = await methods.trigger(headerFields as any);
    if (!isHeaderValid) {
      const errs = methods.formState.errors;
      const firstErrorKey = Object.keys(errs).find(k => headerFields.includes(k)) || Object.keys(errs)[0];
      if (firstErrorKey && (errs as any)[firstErrorKey]) {
        const err = (errs as any)[firstErrorKey];
        showToast(err?.message || `Please fill required fields (${firstErrorKey}).`, "error");
        setTimeout(() => {
          const el = document.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement;
          if (el) {
            el.focus();
          } else {
            const elId = document.getElementById(`pi-${firstErrorKey}`);
            if (elId) elId.focus();
          }
        }, 100);
      } else {
        showToast("Please fill all required fields.", "error");
      }
      return;
    }

    const currentItems = getValues("items") || [];
    const validItems = currentItems.filter((i: any) => i.product && i.product.trim() !== "");
    if (validItems.length === 0) {
      showToast("Please add at least one product.", "warning");
      return;
    }

    const isValid = await methods.trigger();
    if (!isValid) {
      const errs = methods.formState.errors;
      const firstErrorKey = Object.keys(errs)[0];
      if (firstErrorKey && (errs as any)[firstErrorKey]) {
        const err = (errs as any)[firstErrorKey];
        showToast(err?.message || `Please check item details and required fields.`, "error");
      } else {
        showToast("Please fill all required fields.", "error");
      }
      return;
    }

    setShowSaveConfirm(true);
  };

  // Actual save — called after user confirms
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
        setShouldResetAfterPrint(true);
      }
    }, (errs) => {
      console.error("Validation failed:", errs);
      const firstErrorKey = Object.keys(errs)[0];
      if (firstErrorKey) {
        const err = (errs as any)[firstErrorKey];
        showToast((err as any)?.message || `Please fill required fields (${firstErrorKey}).`, "error");
        
        setTimeout(() => {
          const el = document.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement;
          if (el) {
            el.focus();
          } else {
            const elId = document.getElementById(`pi-${firstErrorKey}`);
            if (elId) elId.focus();
          }
        }, 100);
      } else {
        showToast("Please fill all required fields.", "error");
      }
    })();
  };

  const handlePrintModalClose = () => {
    setIsPrintModalOpen(false);
    if (shouldResetAfterPrint) {
      handleReset();
      setShouldResetAfterPrint(false);
    }
  };

  const printData = useMemo<Partial<PurchasePrintData>>(() => {
    const taxSummaryMap = new Map<number, { taxCode: string; taxable: number; vatAmount: number; netAmount: number }>();
    const validItems = watchedItems.filter((i: any) => i.product && i.product.trim() !== "");
    
    const currentDiscAmount = Number(watchedDiscAmount) || 0;
    validItems.forEach((item: any) => {
      const line = calculateLine(item, grossTotal, currentDiscAmount);
      const pct = Number(item.vatPercent) || 0;
      if (!taxSummaryMap.has(pct)) {
        taxSummaryMap.set(pct, { taxCode: `${pct}%`, taxable: 0, vatAmount: 0, netAmount: 0 });
      }
      const summary = taxSummaryMap.get(pct)!;
      summary.taxable += line.amount - line.discountAmount;
      summary.vatAmount += line.vatAmount;
      summary.netAmount += line.netAmount;
    });

    const formVals = getValues();

    return {
      docTitle: "PURCHASE INVOICE",
      supplierName: supplierOptions.find((s) => s.value === formVals.supplier)?.label || formVals.supplier,
      supplierAddress: "",
      supplierTrn: "",
      voucherNo: formVals.invoiceNo,
      purchaseNo: formVals.purchaseNo,
      date: formVals.invoiceDate,
      paymode: payments.length > 0 ? payments[0].mode.toUpperCase() : "CASH",
      items: validItems.map((item: any) => {
        const line = calculateLine(item, grossTotal, Number(watchedDiscAmount) || 0);
        const uOpt = masterData?.units?.find((u: any) => u.value === String(item.unit));
        return {
          productName: productOptions.find(p => p.value === item.product)?.label || item.product,
          qty: Number(item.qty),
          foc: Number(item.foc),
          unit: uOpt ? uOpt.label : item.unit,
          price: Number(item.price),
          discount: Number(item.discPercent),
          amount: line.amount,
          netValue: line.amount - line.discountAmount,
          vatPercent: Number(item.vatPercent),
          vatAmt: line.vatAmount,
          netAmount: line.netAmount
        };
      }),
      totals: {
        total: totals.netAmount - totals.vatAmount + totals.discountAmount,
        discount: totals.discountAmount + parseFloat(formVals.discAmount || "0"),
        adjustmentAmount: 0,
        roundOff: parseFloat(formVals.roundOff || "0"),
        vat: totals.vatAmount,
        grandTotal: totals.grandTotal
      },
      taxSummary: Array.from(taxSummaryMap.values())
    };
  }, [watchedItems, payments, supplierOptions, productOptions, totals, getValues]);

  const watchedBranchId = methods.watch("branch");
  const seriesOptions = masterData?.series
    .filter(s => s.branchId.toString() === watchedBranchId)
    .map(s => ({ label: s.seriesName, value: s.seriesId.toString() })) || [];
  const branchOptions = masterData?.branches.map(b => ({ label: b.branchName, value: b.branchId.toString() })) || [];
  const salesmanOptions = masterData?.salesman.map(s => ({ label: s.employeeName, value: s.employeeId.toString() })) || [];

  const canAdd = hasPermission("Purchase Invoice", "Add");
  const canEdit = hasPermission("Purchase Invoice", "Edit");
  const canSave = canAdd || canEdit;

  const hk = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") { e.preventDefault(); if (nextId) document.getElementById(nextId)?.focus(); }
  };

  const handleGridNav = (e: React.KeyboardEvent, rowIndex?: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If the current row's product is empty → exit the grid, go to Disc(%)
      if (rowIndex !== undefined) {
        const rowProduct = methods.getValues(`items.${rowIndex}.product`);
        if (!rowProduct || rowProduct.trim() === "") {
          if (items.length > 1) remove(rowIndex);
          setTimeout(() => document.getElementById("pi-disc-pct")?.focus(), 50);
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

  useEffect(() => { setTimeout(() => { document.getElementById("pi-series")?.focus(); }, 200); }, []);

  return (
    <PageShell title="Purchase Invoice">
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
            onClick={() => navigate("/dashboard/purchase-invoice")}
            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors z-30"
            title="Close"
            tabIndex={-1}
          >
            <CloseIcon size={18} />
          </button>

          {/* ── Static Header Fields ── */}
          <div className="p-2 md:p-3 pb-0 pr-10">

            {/* ── Header Fields ── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-2 gap-y-2 mb-2 items-end">
              <Controller name="series" control={control} render={({ field }) => (
                <SearchableSelect required={true} className="h-8 !px-2 !text-xs" id="pi-series" label="Series" value={field.value} options={seriesOptions} onChange={field.onChange} onKeyDown={(e) => hk(e, "pi-purchaseNo")} disabled={!canSave || loadingMaster} error={errors.series?.message as string} />
              )} />
              <FormInput required={true} inputClassName="!h-8 !px-2 !text-xs cursor-not-allowed text-[#49293e]" id="pi-purchaseNo" label="Purchase No" {...register("purchaseNo")} onKeyDown={(e) => hk(e, "pi-purchaseDate")} readOnly={true} error={errors.purchaseNo?.message as string} />
              <FormInput required={true} inputClassName="!h-8 !px-2 !text-xs" id="pi-purchaseDate" label="Purchase Date" type="date" max={new Date().toLocaleDateString("en-CA")} {...register("purchaseDate")} onKeyDown={(e) => hk(e, "pi-invoiceNo")} readOnly={!canSave} error={errors.purchaseDate?.message as string} />
              <FormInput required={true} maxLength={50} inputClassName="!h-8 !px-2 !text-xs" id="pi-invoiceNo" label="Inv No" {...register("invoiceNo")} onKeyDown={(e) => hk(e, "pi-refNo")} readOnly={!canSave} error={errors.invoiceNo?.message as string} />
              <FormInput maxLength={50} inputClassName="!h-8 !px-2 !text-xs" id="pi-refNo" label="Ref No" {...register("refNo")} onKeyDown={(e) => hk(e, "pi-invoiceDate")} readOnly={!canSave} error={errors.refNo?.message as string} />
              <FormInput required={true} inputClassName="!h-8 !px-2 !text-xs" id="pi-invoiceDate" label="Inv Date" type="date" max={new Date().toLocaleDateString("en-CA")} {...register("invoiceDate")} onKeyDown={(e) => hk(e, "pi-supplier")} readOnly={!canSave} error={errors.invoiceDate?.message as string} />
              <div className="col-span-2 sm:col-span-2 md:col-span-2 lg:col-span-2 flex items-end gap-1">
                <div className="flex-1 min-w-0">
                  <Controller name="supplier" control={control} render={({ field }) => (
                    <SearchableSelect required={true} className="h-8 !px-2 !text-xs" id="pi-supplier" label="Supplier" value={field.value} options={supplierOptions} onSearch={handleSupplierSearch} loading={searchingSuppliers} onChange={field.onChange} onKeyDown={(e) => hk(e, "pi-branch")} disabled={!canSave} error={errors.supplier?.message as string} />
                  )} />
                </div>
                <button type="button" onClick={() => setIsSupplierModalOpen(true)} className="mb-1 shrink-0 h-8 w-8 flex items-center justify-center rounded border border-[#49293e] bg-[#49293e] hover:bg-[#3c2232] hover:border-[#3c2232] text-white transition-colors">
                  <Plus size={16} />
                </button>
              </div>
              <Controller name="branch" control={control} render={({ field }) => (
                <SearchableSelect required={true} className="h-8 !px-2 !text-xs" id="pi-branch" label="Branch" value={field.value} options={branchOptions} onChange={field.onChange} onKeyDown={(e) => hk(e, "pi-salesman")} disabled={!canSave || loadingMaster || isBranchLocked} error={errors.branch?.message as string} />
              )} />
              <Controller name="salesman" control={control} render={({ field }) => (
                <SearchableSelect required={true} className="h-8 !px-2 !text-xs" id="pi-salesman" label="Salesman" value={field.value} options={salesmanOptions} onChange={field.onChange} disabled={!canSave || loadingMaster} error={errors.salesman?.message as string} />
              )} />
            </div>
          </div>

          {/* ── Scrollable DataGrid ── */}
          <div className="flex-1 overflow-y-auto p-2 md:p-3">
            <div className="h-full flex flex-col rounded-xl border border-gray-200 bg-white">
              <div className="flex-1 overflow-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80">
                      {["SL", "Product", "Code", "Unit", "Qty", "FOC", "Price", "Amount", "Disc Amt", "VAT(%)", "VAT Amt", "Net Amount", ""].map(
                        (col, i) => (
                          <th key={i} className="sticky top-0 bg-gray-50 z-10 whitespace-nowrap px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map((field, index) => {
                      const itemWatch = watchedItems[index] || {};
                      const lineTotals = calculateLine(itemWatch as any, grossTotal, Number(watchedDiscAmount) || 0);
                      return (
                        <tr key={field.id} onFocusCapture={() => setActiveRowIndex(index)} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="px-2 py-1 text-[10px] text-gray-400 font-medium text-center border-r border-gray-100 bg-gray-50/30 w-8">{index + 1}</td>
                          <td className="p-0.5 border-r border-gray-100 min-w-[200px] bg-white">
                            <Controller
                              name={`items.${index}.product`}
                              control={control}
                              render={({ field: selectField }) => (
                                <div className="grid-product-select">
                                      <SearchableCombobox
                                        id={`product-select-${index}`}
                                        className="h-7 !px-2 text-xs"
                                        value={selectField.value}
                                        options={productOptions}
                                        loading={searchingProducts}
                                        minQueryLength={0}
                                        forcePlacement="bottom"
                                        onChange={(val) => {
                                        productSelectedRef.current = true; // flag: selection made
                                        selectField.onChange(val);
                                        const opt = productOptions.find(o => o.value === val);
                                        if (opt) {
                                          methods.setValue(`items.${index}.code`, opt.code || "");
                                          handleProductSelect(index, val, opt.barcode || "");
                                          setTimeout(() => {
                                            document.getElementById(`unit-select-${index}`)?.focus();
                                          }, 100);
                                        } else {
                                          methods.setValue(`items.${index}.code`, "");
                                          methods.setValue(`items.${index}.unit`, "");
                                          methods.setValue(`items.${index}.unitCategory`, "");
                                          methods.setValue(`items.${index}.stock`, "0.000");
                                          methods.setValue(`items.${index}.avgCost`, "0.000");
                                          methods.setValue(`items.${index}.qty`, "1");
                                          methods.setValue(`items.${index}.foc`, "0");
                                          methods.setValue(`items.${index}.price`, "0.000");
                                          methods.setValue(`items.${index}.vatId`, "0");
                                          methods.setValue(`items.${index}.vatPercent`, "0");
                                          methods.setValue(`items.${index}.discPercent`, "0");
                                        }
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
                                          if (rawValue && rawValue.trim().length > 0) {
                                            e.preventDefault();
                                            const success = await handleBarcodeScan(index, rawValue.trim());
                                            if (success) {
                                                setTimeout(() => {
                                                  document.getElementById(`unit-select-${index}`)?.focus();
                                                }, 100);
                                            }
                                            return;
                                          }
                                          if (items.length > 1) remove(index);
                                          setTimeout(() => document.getElementById("pi-disc-pct")?.focus(), 50);
                                        }
                                      }}
                                      disabled={!canSave}
                                    />
                                </div>
                              )}
                            />
                          </td>
                          <td className="px-2 py-1 text-[10px] text-gray-500 border-r border-gray-100 bg-gray-50/50 min-w-[80px]">{itemWatch.code || "-"}</td>
                          <td className="p-0 border-r border-gray-100 w-24 relative">
                            <Controller
                              name={`items.${index}.unit`}
                              control={control}
                              render={({ field: selectField }) => (
                                <SearchableSelect
                                  id={`unit-select-${index}`}
                                  className="h-7 !px-2 text-xs border-transparent hover:border-gray-300 focus:border-blue-500 rounded"
                                  value={selectField.value}
                                  options={(() => {
                                    const baseOpts = (itemWatch.unitCategory && categoryUnits[itemWatch.unitCategory]) ? categoryUnits[itemWatch.unitCategory] : (masterData?.units || []);
                                    if (itemWatch.unit && itemWatch.unitName && !baseOpts.some((o: any) => o.value === itemWatch.unit)) {
                                      return [...baseOpts, { label: itemWatch.unitName, value: itemWatch.unit }];
                                    }
                                    return baseOpts;
                                  })()}
                                  onChange={(val) => {
                                    handleUnitChange(index, val);
                                    setTimeout(() => {
                                      const qtyInputs = document.querySelectorAll<HTMLInputElement>(`input[name="items.${index}.qty"]`);
                                      qtyInputs[0]?.focus();
                                    }, 100);
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
                          <td className="p-0 border-r border-gray-100 w-16">
                            <input {...register(`items.${index}.foc`)} type="number" min="0" onFocus={(e) => e.target.select()} onKeyDown={(e) => handleGridNav(e, index)} className="w-full h-7 text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 rounded px-1 py-0 text-xs outline-none" readOnly={!canSave} />
                          </td>
                          <td className="p-0 border-r border-gray-100 w-24">
                            <input
                              {...register(`items.${index}.price`)}
                              type="number" min="0" step="0.001"
                              onFocus={(e) => e.target.select()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const rowProduct = methods.getValues(`items.${index}.product`);
                                  if (rowProduct && rowProduct.trim() !== "" && index === items.length - 1) {
                                    append({ id: generateUUID(), product: "", code: "", unit: "", qty: "1", foc: "0", price: "0", vatId: "0", vatPercent: "0", discPercent: "0" }, { shouldFocus: false });
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
                          <td className="px-2 py-1 text-right font-mono text-xs text-gray-600 bg-gray-50/50 border-r border-gray-100">{formatAmount(lineTotals.amount)}</td>
                          
                          <td className="px-2 py-1 text-right font-mono text-xs text-gray-600 bg-gray-50/50 border-r border-gray-100">{formatAmount(lineTotals.discountAmount)}</td>
                          
                          <td className="px-2 py-1 text-right text-xs text-gray-500 bg-gray-50/50 border-r border-gray-100 tabular-nums">
                            <input {...register(`items.${index}.vatPercent`)} type="hidden" tabIndex={-1} />
                            {itemWatch.vatPercent || "0"}
                          </td>
                          <td className="px-2 py-1 text-right font-mono text-xs text-gray-600 bg-gray-50/50 border-r border-gray-100">{formatAmount(lineTotals.vatAmount)}</td>
                          
                          <td className="px-2 py-1 text-right font-mono font-bold text-[#49293e] bg-[#49293e]/5 border-r border-gray-100">{formatAmount(lineTotals.netAmount)}</td>
                          <td className="px-2 py-1 text-center w-10">
                            <button
                              type="button"
                              tabIndex={-1}
                              onClick={() => {
                                if (items.length > 1) {
                                  remove(index);
                                } else {
                                  update(index, { id: generateUUID(), product: "", code: "", unit: "", qty: "1", foc: "0", price: "0", vatId: "0", vatPercent: "0", discPercent: "0" } as any);
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
                      product: "", code: "", unit: "", qty: "1", foc: "0", price: "0", vatId: "0", vatPercent: "0", discPercent: "0"
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
            
            {/* Top Row: Adjustments */}
            <div className="flex flex-wrap items-end gap-2 w-full">
              <div className="w-16">
                <FormInput id="pi-disc-pct" label="Disc(%)" type="number" step="any" maxLength={6} {...register("globalDiscPercent")} min="0" onFocus={(e) => e.target.select()} onKeyDown={(e) => hk(e, "pi-disc-amt")} inputClassName="text-right !h-8 !text-xs !px-2" readOnly={!canSave} />
              </div>
              <div className="w-24">
                <FormInput id="pi-disc-amt" label="Disc Amt" type="number" step="any" maxLength={12} {...register("discAmount")} min="0" onFocus={(e) => e.target.select()} onKeyDown={(e) => hk(e, "pi-other-chg")} inputClassName="text-right !h-8 !text-xs !px-2" readOnly={!canSave} />
              </div>
              <div className="w-24">
                <FormInput id="pi-other-chg" label="Other Chg" type="number" step="any" maxLength={12} {...register("otherCharge")} min="0" onFocus={(e) => e.target.select()} onKeyDown={(e) => hk(e, "pi-round-off")} inputClassName="text-right !h-8 !text-xs !px-2" readOnly={!canSave} />
              </div>
              <div className="w-20">
                <FormInput id="pi-round-off" label="Round Off" type="number" step="any" maxLength={8} {...register("roundOff")} min="0" onFocus={(e) => e.target.select()} onKeyDown={(e) => hk(e, "pi-narration")} inputClassName="text-right !h-8 !text-xs !px-2" readOnly={!canSave} />
              </div>
              <div className="flex-1 min-w-[80px]">
                <FormInput id="pi-narration" label="Narration" maxLength={200} {...register("narration")} onKeyDown={(e) => hk(e, "pi-paymode")} inputClassName="!h-8 !text-xs !px-2" readOnly={!canSave} />
              </div>
              <div className="flex flex-col gap-0.5 w-24 shrink-0">
                 <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Stock</label>
                 <div className="h-8 px-2 rounded-md border border-gray-200 bg-white flex items-center text-xs font-mono font-bold text-gray-700">
                   {activeItem.stock || "0.000"}
                 </div>
              </div>
              <div className="flex flex-col gap-0.5 w-24 shrink-0">
                 <label className="text-[10px] font-bold text-gray-500 uppercase px-1">Avg Cost</label>
                 <div className="h-8 px-2 rounded-md border border-gray-200 bg-white flex items-center justify-end text-xs font-mono font-bold text-gray-700">
                   {formatAmount(activeItem.avgCost || 0)}
                 </div>
              </div>
              <div className="min-w-[120px] max-w-[200px]">
                <div className="flex flex-col gap-0.5">
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-1">Payments</label>
                  <div className="h-8 px-2 rounded-md border border-gray-200 bg-gray-50 flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide text-xs font-bold text-gray-600">
                    {payments.length > 0 ? (
                      payments.map((p: any, i: number) => (
                        <span key={i} className="capitalize shrink-0">
                          {p.mode}: {formatAmount(Number(p.amount))}
                        </span>
                      ))
                    ) : (
                      <span className="font-mono font-normal text-gray-400">{formatAmount(0)}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Row: Actions & Total */}
            <div className="flex flex-wrap items-center justify-between gap-3 w-full border-t border-gray-200 pt-3">
              {/* Paymode Dropdown + Settle Payments */}
              <div className="flex items-start gap-2">
                <div className="w-36">
                  <SearchableSelect
                    key={paymodeSelectKey}
                    id="pi-paymode"
                    label="Paymode"
                    value={selectedPaymodeId === multiPayId ? String(multiPayId) : String(selectedPaymodeId || "")}
                    forcePlacement="top"
                    onChange={(val) => {
                      const id = Number(val);
                      const paymode = paymodeList.find((p: { paymodeId: number; paymodeName: string }) => p.paymodeId === id);
                      const isMultiPay = paymode?.paymodeName?.toLowerCase().includes("multi") || (multiPayId > 0 && id === multiPayId);
                      if (isMultiPay) {
                        // Save current selection; commit multiPayId only on modal submit
                        previousPaymodeId.current = selectedPaymodeId;
                        if (totals.grandTotal <= 0) {
                          showToast("Please add items with a price to enable MultiPay settlement", "warning");
                        } else {
                          setIsMultiPayOpen(true);
                        }
                      } else if (paymode) {
                        // Single paymode — auto-set full grand total, no modal needed
                        handleSinglePayment(id, paymode.paymodeName, totals.grandTotal);
                        // After paymode selection — focus Save button
                        setTimeout(() => document.getElementById("pi-save-btn")?.focus(), 150);
                      }
                    }}
                    placeholder="Paymode"
                    options={(paymodeList as { paymodeId: number; paymodeName: string }[]).map(p => ({ label: p.paymodeName, value: String(p.paymodeId) }))}
                    disabled={!canSave || saving}
                    className="!h-9"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 justify-end flex-1">
                <div className="flex items-baseline gap-2 bg-white px-4 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Grand Total</span>
                  <span className="text-xl font-bold text-[#49293e] leading-none">{formatAmount(totals.grandTotal)}</span>
                </div>

                <div className="flex items-center gap-1.5 sm:border-l border-gray-300 sm:pl-4">
                  {canAdd && (
                    <Button type="button" variant="secondary" onClick={handleClearClick} tabIndex={-1} isAction icon={<Plus size={16} />}>
                      New
                    </Button>
                  )}
                  {canSave && (
                    <Button id="pi-save-btn" type="button" onClick={onSaveClick} isAction icon={<Save size={16} />} loading={saving} disabled={saving}>
                      Save
                    </Button>
                  )}
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
          title="Save Purchase Invoice"
          message="Are you sure you want to save this purchase invoice?"
          confirmLabel="Save"
          onConfirm={doSave}
          onCancel={() => setShowSaveConfirm(false)}
        />

        <ConfirmDialog
          isOpen={showClearConfirm}
          title="Clear Form"
          message="Are you sure you want to clear the form? All unsaved data will be lost."
          confirmLabel="Clear"
          onConfirm={handleReset}
          onCancel={() => setShowClearConfirm(false)}
        />

        <BackofficeMultiPayModal
          isOpen={isMultiPayOpen}
          paymodes={paymodeList}
          initialPayments={
            payments
              .filter((p: any) => p.paymodeId && parseFloat(p.amount) > 0)
              .map((p: any) => ({ paymodeId: p.paymodeId, amount: parseFloat(p.amount) || 0 }))
          }
          onClose={() => {
            // Restore previous paymode selection; re-mount dropdown to clear stale display
            setIsMultiPayOpen(false);
            setSelectedPaymodeId(previousPaymodeId.current);
            setPaymodeSelectKey(k => k + 1);
            // If reverting to a single paymode, restore its payment amount too
            if (previousPaymodeId.current > 0 && previousPaymodeId.current !== multiPayId) {
              const prev = (paymodeList as { paymodeId: number; paymodeName: string }[]).find(p => p.paymodeId === previousPaymodeId.current);
              if (prev) handleSinglePayment(prev.paymodeId, prev.paymodeName, totals.grandTotal);
            }
          }}
          totalDue={totals.grandTotal}
          onSubmit={(payments) => {
            handleSettlementSubmit(payments);
            // Focus Save button after MultiPay modal submits
            setTimeout(() => document.getElementById("pi-save-btn")?.focus(), 200);
          }}
        />

        <PurchasePrintPreviewModal
          isOpen={isPrintModalOpen}
          onClose={handlePrintModalClose}
          data={printData}
        />

        <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} title="Supplier Creation" size="2xl">
          <div className="p-1">
            <SupplierForm
              onSubmit={handleCreateSupplier}
              onCancel={() => setIsSupplierModalOpen(false)}
              submitting={creatingSupplier}
            />
          </div>
        </Modal>
      </FormProvider>
    </PageShell>
  );
};

export default PurchaseInvoiceFormPage;
