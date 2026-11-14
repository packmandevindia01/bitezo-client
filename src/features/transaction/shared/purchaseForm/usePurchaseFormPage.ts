import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useToast } from "../../../../app/providers/useToast";
import { createSupplier } from "../../../general/supplier/services/index";
import { notifySuppliersUpdated } from "../../../general/supplier/utils/supplierSync";
import type { PurchasePrintData } from "../components/PurchasePrintTemplate";
import { calculatePurchaseLine } from "../purchaseCalc";
import { focusOnEnter, makeRowEnter } from "../documentForm/documentKeys";
import type { usePurchaseInvoice } from "../../purchaseInvoice/hooks/usePurchaseInvoice";
import type { usePurchaseReturn } from "../../purchaseReturn/hooks/usePurchaseReturn";

export type PurchaseKind = "invoice" | "return";
export type PurchaseDoc = ReturnType<typeof usePurchaseInvoice> | ReturnType<typeof usePurchaseReturn>;

/** What differs by name only between Purchase Invoice and Purchase Return. */
export const PURCHASE_KIND = {
  invoice: { prefix: "pi", title: "Purchase Invoice", module: "Purchase Invoice", docTitle: "PURCHASE INVOICE", listPath: "/dashboard/purchase-invoice", saveTitle: "Save Purchase Invoice", saveMessage: "Are you sure you want to save this purchase invoice?" },
  return: { prefix: "pr", title: "Purchase Return", module: "Purchase Return", docTitle: "PURCHASE RETURN", listPath: "/dashboard/purchase-return", saveTitle: "Save Purchase Return", saveMessage: "Are you sure you want to save this purchase return?" },
} as const;

/** Line totals shown in the grid and on the print (the same calculation on both documents). */
export const purchaseLineTotals = (item: any, grossTotal: number, discAmount: number) =>
  calculatePurchaseLine(item.qty, item.price, item.vatPercent, grossTotal, discAmount);

/**
 * Page state shared by the Purchase Invoice and Purchase Return forms (2026-11-13; the two pages were copies):
 * save question and save, print after save, new supplier window, paymode window bookkeeping, active line,
 * header options, permissions and Enter-key moves. Where the two documents behave differently it says so.
 */
export const usePurchaseFormPage = (kind: PurchaseKind, doc: PurchaseDoc) => {
  const cfg = PURCHASE_KIND[kind];
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const { methods, items, remove, watchedItems, payments, totals, onSubmit, handleReset, masterData, supplierOptions, productOptions, grossTotal, watchedDiscAmount, handleSupplierCreated, selectedPaymodeId, savedAt, setSavedAt } = doc;
  const { getValues } = methods as any;

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
        notifySuppliersUpdated();
      }
    } catch (error: any) {
      showToast(error.message || "Failed to create supplier", "error");
    } finally {
      setCreatingSupplier(false);
    }
  };

  // Paymode dropdown state — store previous selection so cancel restores it cleanly
  const previousPaymodeIdRef = useRef<number>(0);
  const [paymodeSelectKey, setPaymodeSelectKey] = useState(0);

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [activeRowIndex, setActiveRowIndex] = useState<number>(0);
  const activeItem = watchedItems[activeRowIndex] || watchedItems[0] || {};

  /** Invoice: a failed field is named in a toast and focused. */
  const reportFirstError = (errs: Record<string, any>, fieldKeys: string[] | null, fallback: string) => {
    const firstErrorKey = (fieldKeys ? Object.keys(errs).find(k => fieldKeys.includes(k)) : undefined) || Object.keys(errs)[0];
    if (firstErrorKey && errs[firstErrorKey]) {
      const err = errs[firstErrorKey];
      showToast(err?.message || fallback.replace("{field}", firstErrorKey), "error");
      setTimeout(() => {
        const el = document.querySelector(`[name="${firstErrorKey}"]`) as HTMLElement;
        if (el) {
          el.focus();
        } else {
          const elId = document.getElementById(`${cfg.prefix}-${firstErrorKey}`);
          if (elId) elId.focus();
        }
      }, 100);
    } else {
      showToast("Please fill all required fields.", "error");
    }
  };

  const hasProductLine = () => {
    const currentItems = getValues("items") || [];
    return currentItems.some((i: any) => i.product && i.product.trim() !== "");
  };

  // Show confirm dialog before saving
  const onSaveClick = async () => {
    if (kind === "invoice") {
      const headerFields = ["series", "purchaseNo", "purchaseDate", "invoiceNo", "refNo", "invoiceDate", "supplier", "branch", "salesman"];
      const isHeaderValid = await methods.trigger(headerFields as any);
      if (!isHeaderValid) {
        reportFirstError(methods.formState.errors as any, headerFields, "Please fill required fields ({field}).");
        return;
      }
      if (!hasProductLine()) {
        showToast("Please add at least one product.", "warning");
        return;
      }
      const isValid = await methods.trigger();
      if (!isValid) {
        const errs = methods.formState.errors as any;
        const firstErrorKey = Object.keys(errs)[0];
        if (firstErrorKey && errs[firstErrorKey]) {
          showToast(errs[firstErrorKey]?.message || `Please check item details and required fields.`, "error");
        } else {
          showToast("Please fill all required fields.", "error");
        }
        return;
      }
    } else {
      // Return: the paymode is required; header errors show on the fields only.
      const { setPaymodeError } = doc as ReturnType<typeof usePurchaseReturn>;
      let hasPaymodeErr = false;
      if (!selectedPaymodeId || selectedPaymodeId <= 0 || payments.length === 0) {
        setPaymodeError("required");
        hasPaymodeErr = true;
      } else {
        setPaymodeError("");
      }
      const headerFields = ["series", "purchaseNo", "purchaseDate", "supplier", "branch", "salesman"];
      const isHeaderValid = await methods.trigger(headerFields as any);
      if (!isHeaderValid || hasPaymodeErr) {
        return;
      }
      if (!hasProductLine()) {
        showToast("Please add at least one product.", "warning");
        return;
      }
    }
    setShowSaveConfirm(true);
  };

  // Actual save — called after user confirms
  const doSave = async () => {
    setShowSaveConfirm(false);
    const currentItems = getValues("items") || [];
    const validItems = currentItems.filter((i: any) => i.product && i.product.trim() !== "");
    if (validItems.length !== currentItems.length) {
      (methods as any).setValue("items", validItems);
    }
    (methods as any).handleSubmit(async (data: any) => {
      const success = await onSubmit(data);
      if (success) {
        setSavedAt(new Date().toISOString()); // the print after Save shows the time it was saved
        setIsPrintModalOpen(true);
        setShouldResetAfterPrint(true);
      }
    }, (errs: any) => {
      console.error("Validation failed:", errs);
      if (kind === "invoice") reportFirstError(errs, null, "Please fill required fields ({field}).");
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
      const line = purchaseLineTotals(item, grossTotal, currentDiscAmount);
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
      docTitle: cfg.docTitle,
      supplierName: supplierOptions.find((s) => s.value === formVals.supplier)?.label || formVals.supplier,
      supplierAddress: "",
      supplierTrn: "",
      voucherNo: formVals.invoiceNo,
      purchaseNo: formVals.purchaseNo,
      // Invoice prints the supplier's invoice date, Return its own return date.
      date: kind === "invoice" ? formVals.invoiceDate : formVals.purchaseDate,
      savedAt,
      paymode: payments.length > 0 ? payments[0].mode.toUpperCase() : "CASH",
      items: validItems.map((item: any) => {
        const line = purchaseLineTotals(item, grossTotal, Number(watchedDiscAmount) || 0);
        const uOpt = (masterData as any)?.units?.find((u: any) => u.value === String(item.unit));
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- same inputs as the pages had
  }, [watchedItems, payments, supplierOptions, productOptions, totals, getValues, savedAt]);

  const watchedBranchId = (methods as any).watch("branch");
  const seriesOptions = ((masterData as any)?.series || [])
    .filter((s: any) => s.branchId.toString() === watchedBranchId)
    .map((s: any) => ({ label: s.seriesName, value: s.seriesId.toString() }));
  const branchOptions = ((masterData as any)?.branches || []).map((b: any) => ({ label: b.branchName, value: b.branchId.toString() }));
  const salesmanOptions = ((masterData as any)?.salesman || []).map((s: any) => ({ label: s.employeeName, value: s.employeeId.toString() }));

  const canAdd = hasPermission(cfg.module, "Add");
  const canEdit = hasPermission(cfg.module, "Edit");
  const canSave = canAdd || canEdit;

  const hk = (e: React.KeyboardEvent, nextId?: string) => focusOnEnter(e, nextId);

  // Enter on an empty line leaves the grid for Disc(%)
  const handleGridNav = makeRowEnter({
    getRowProduct: (rowIndex) => (methods as any).getValues(`items.${rowIndex}.product`),
    rowCount: items.length,
    removeRow: remove,
    exitToId: `${cfg.prefix}-disc-pct`,
  });

  useEffect(() => { setTimeout(() => { document.getElementById(`${cfg.prefix}-series`)?.focus(); }, 200); }, [cfg.prefix]);

  return {
    cfg,
    canAdd,
    canSave,
    hk,
    handleGridNav,
    seriesOptions,
    branchOptions,
    salesmanOptions,
    activeItem,
    setActiveRowIndex,
    onSaveClick,
    doSave,
    showSaveConfirm,
    setShowSaveConfirm,
    isPrintModalOpen,
    setIsPrintModalOpen,
    handlePrintModalClose,
    printData,
    isSupplierModalOpen,
    setIsSupplierModalOpen,
    creatingSupplier,
    handleCreateSupplier,
    previousPaymodeIdRef,
    paymodeSelectKey,
    setPaymodeSelectKey,
  };
};

export type PurchaseFormPage = ReturnType<typeof usePurchaseFormPage>;
