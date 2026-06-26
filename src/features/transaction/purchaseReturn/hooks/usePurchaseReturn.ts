import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCurrency } from "../../../../hooks/useCurrency";
import { createEmptyPurchaseReturnForm } from "../constants";
import { purchaseReturnSchema } from "../types";
import type { PurchaseReturnLineItem } from "../types";
import { purchaseReturnApi } from "../services/purchaseReturnApi";
import type { PurchaseReturnMasterData } from "../services/purchaseReturnApi";
import { useToast } from "../../../../app/providers/useToast";
import { generateUUID } from "../../../../utils/uuid";


const toNumber = (value: string | number | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateLine = (item: PurchaseReturnLineItem) => {
  const qty = toNumber(item.qty);
  const price = toNumber(item.price);
  const discPercent = toNumber(item.discPercent);
  const vatPercent = toNumber(item.vatPercent);

  const amount = qty * price;
  const discountAmount = amount * (discPercent / 100);
  const vatAmount = (amount - discountAmount) * (vatPercent / 100);
  const netAmount = amount - discountAmount + vatAmount;

  return { amount, discountAmount, vatAmount, netAmount };
};

export const usePurchaseReturn = (invoiceId?: string) => {
  const { showToast } = useToast();
  const { formatAmount, decimalPart } = useCurrency();
  const [masterData, setMasterData] = useState<PurchaseReturnMasterData | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterError, setMasterError] = useState<string | null>(null);
  const [purchaseId, setPurchaseId] = useState<number>(0);
  const [loadedInvoiceText, setLoadedInvoiceText] = useState("");

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isMultiPayOpen, setIsMultiPayOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Search States
  const [productOptions, setProductOptions] = useState<{label: string, value: string, code: string, barcode: string}[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const [supplierOptions, setSupplierOptions] = useState<{label: string, value: string}[]>([]);
  const [searchingSuppliers, setSearchingSuppliers] = useState(false);

  const [invoiceOptions, setInvoiceOptions] = useState<{label: string, value: string}[]>([]);
  const [searchingInvoices, setSearchingInvoices] = useState(false);

  const initialForm = useMemo(() => {
    const empty = createEmptyPurchaseReturnForm();
    empty.discAmount = formatAmount(0);
    empty.otherCharge = formatAmount(0);
    empty.roundOff = formatAmount(0);
    empty.items = [{
        id: generateUUID(),
        product: "",
        code: "",
        unit: "",
        qty: "1",
        foc: "0",
        price: "0",
        vatId: "0",
        vatPercent: "0",
        discPercent: "0",
    }];
    return empty;
  }, [formatAmount]);

  const methods = useForm<any>({
    resolver: zodResolver(purchaseReturnSchema),
    defaultValues: initialForm,
  });

  const { control, setValue, reset, getValues } = methods;

  const { fields: items, append, remove, replace: replaceItems } = useFieldArray({
    control,
    name: "items",
  });

  const { replace: setPayments } = useFieldArray({
    control,
    name: "payments",
  });

  // Watchers for reactive totals
  const watchedItems = useWatch({ control, name: "items" }) || [];
  const watchedDiscAmount = useWatch({ control, name: "discAmount" });
  const watchedOtherCharge = useWatch({ control, name: "otherCharge" });
  const watchedRoundOff = useWatch({ control, name: "roundOff" });
  const watchedPayments = useWatch({ control, name: "payments" }) || [];
  const watchedGlobalDiscPercent = useWatch({ control, name: "globalDiscPercent" });
  const watchedBranch = useWatch({ control, name: "branch" });
  const watchedSupplier = useWatch({ control, name: "supplier" });
  const watchedInvoiceNo = useWatch({ control, name: "invoiceNo" });

  // Clear products if invoice text is manually edited after loading
  useEffect(() => {
    if (loadedInvoiceText !== "" && watchedInvoiceNo !== loadedInvoiceText) {
      setPurchaseId(0);
      setLoadedInvoiceText("");
      replaceItems([{
        id: generateUUID(),
        product: "",
        code: "",
        unit: "",
        qty: "1",
        foc: "0",
        price: "0",
        vatId: "0",
        vatPercent: "0",
        discPercent: "0",
      }]);
      setProductOptions([]);
    }
  }, [watchedInvoiceNo, loadedInvoiceText, purchaseId, replaceItems]);
  
  // Calculate totals
  const totals = useMemo(() => {
    const itemTotals = watchedItems.reduce(
      (acc: any, item: any) => {
        const line = calculateLine(item as PurchaseReturnLineItem);
        acc.discountAmount += line.discountAmount;
        acc.vatAmount += line.vatAmount;
        acc.netAmount += line.netAmount;
        return acc;
      },
      { discountAmount: 0, vatAmount: 0, netAmount: 0 }
    );

    const manualDiscount = toNumber(watchedDiscAmount);
    const otherCharge = toNumber(watchedOtherCharge);
    const roundOff = toNumber(watchedRoundOff);
    const grandTotal = itemTotals.netAmount - manualDiscount + otherCharge + roundOff;

    return {
      ...itemTotals,
      grandTotal,
    };
  }, [watchedDiscAmount, watchedOtherCharge, watchedRoundOff, watchedItems]);

  // Recalculate global discount amount when items change, if a percentage was set
  useEffect(() => {
    if (toNumber(watchedGlobalDiscPercent) > 0 && watchedItems.length > 0) {
      const subTotal = watchedItems.reduce((acc: any, item: any) => acc + calculateLine(item as PurchaseReturnLineItem).netAmount, 0);
      const newDiscAmt = formatAmount(subTotal * (toNumber(watchedGlobalDiscPercent) / 100));
      if (newDiscAmt !== watchedDiscAmount) {
        setValue("discAmount", newDiscAmt);
      }
    }
  }, [watchedItems, watchedGlobalDiscPercent, setValue, formatAmount, watchedDiscAmount]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setMasterError(null);
        const data = await purchaseReturnApi.loadMasterData();
        if (data) {
          setMasterData(data);
          if (!invoiceId) {
             if (data.series.length > 0) {
               setValue("series", data.series[0].seriesId.toString());
               setValue("purchaseNo", `${data.series[0].prefix}${data.series[0].startNo}`);
             }
             if (data.branches.length > 0) {
               setValue("branch", data.branches[0].branchId.toString());
             }
          }
        }
      } catch (error: any) {
        console.error("Failed to load master data", error);
        setMasterError(error?.message || "Failed to load master data");
      } finally {
        setLoadingMaster(false);
      }
    };
    fetchMasterData();
  }, [invoiceId, setValue]);

  const loadInvoiceData = async (id: string) => {
    try {
      setLoadingMaster(true);
      const res = await purchaseReturnApi.getPurchaseReturnById(id);
      const master = res.masterData;
      setPurchaseId(master.purchaseId || 0);
      const rootPaymodeId = res.masterData.paymodeId || 1;
      const rootAmount = (res.masterData.netAmount || 0) - (res.paymodesData || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      
      const formPayload: any = {
        ...initialForm,
        series: master.seriesId?.toString() || "",
        branch: master.branchId?.toString() || "",
        salesman: master.employeeId?.toString() || "",
        supplier: master.supplierId?.toString() || "",
        purchaseNo: master.purchaseReturnNo || "",
        invoiceNo: master.purchaseInvoiceNo || "",
        purchaseDate: master.purchaseReturnDate ? master.purchaseReturnDate.split("T")[0] : "",
        invoiceDate: "",
        refNo: master.refNo || "",
        narration: master.narration || "",
        discAmount: master.discAmount?.toString() || "0",
        roundOff: "0",
        otherCharge: "0",
      };

      if (master.supplierId) {
        setSupplierOptions([{ label: master.supplierName || master.supplierId.toString(), value: master.supplierId.toString() }]);
      }
      if (master.purchaseInvoiceNo) {
         setInvoiceOptions([{ label: master.purchaseInvoiceNo, value: (master.purchaseId || 0).toString() }]);
      }

      const mappedItems = (res.detailsData || []).map((d: any) => ({
        id: generateUUID(),
        product: d.productId?.toString() || "",
        code: d.productId?.toString() || "",
        unit: d.unitId?.toString() || "",
        qty: d.qty?.toString() || "1",
        foc: d.foc?.toString() || "0",
        price: d.price?.toString() || "0",
        discPercent: d.discPer?.toString() || "0",
        vatId: (d.vatId || 0).toString(),
        vatPercent: (d.vatValue || 0).toString(),
      }));
      formPayload.items = mappedItems;

      if (res.paymodesData && res.paymodesData.length > 0) {
        formPayload.payments = [
          {
            mode: rootPaymodeId === 1 ? 'cash' : rootPaymodeId === 2 ? 'card' : 'credit',
            amount: rootAmount.toString(),
          },
          ...res.paymodesData.map((p: any) => ({
            mode: p.paymodeId === 1 ? 'cash' : p.paymodeId === 2 ? 'card' : 'credit',
            amount: (p.amount || 0).toString(),
          }))
        ];
      } else {
        formPayload.payments = [];
      }

      reset(formPayload);
      
      // Load product options for the mapped items
      const productIds = Array.from(new Set(mappedItems.map((i: any) => i.product)));
      const options: any[] = [];
      for (const pId of productIds) {
        if (!pId) continue;
        const searchRes = await purchaseReturnApi.searchProductsByName("");
        const pData = searchRes.find(r => r.productId.toString() === pId);
        if (pData) {
          options.push({
            label: pData.productName,
            value: pData.productId.toString(),
            code: pData.code || "",
            barcode: pData.barcode || ""
          });
        }
      }
      setProductOptions(options);

    } catch (error: any) {
      setMasterError(error.message);
      showToast(error.message || "Failed to load invoice details", "error");
    } finally {
      setLoadingMaster(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceData(invoiceId);
    }
  }, [invoiceId]);

  const handleProductSearch = useCallback(async (query: string) => {
    setSearchingProducts(true);
    try {
      const results = await purchaseReturnApi.searchProductsByName(query || "");
      setProductOptions(
        results.map((r) => ({
          label: r.productName,
          value: r.productId.toString(),
          code: r.code || "",
          barcode: r.barcode || "",
        }))
      );
    } catch (error) {
      console.error("Failed to search products", error);
    } finally {
      setSearchingProducts(false);
    }
  }, []);

  const handleSupplierSearch = useCallback(async (query: string) => {
    setSearchingSuppliers(true);
    try {
      const results = await purchaseReturnApi.searchSuppliers(query || "");
      setSupplierOptions(
        results.map((r) => ({
          label: r.supplierName,
          value: r.supplierId.toString(),
        }))
      );
    } catch (error) {
      console.error("Failed to search suppliers", error);
    } finally {
      setSearchingSuppliers(false);
    }
  }, []);

  const handleInvoiceSearch = useCallback(async (query: string) => {
    if (!watchedBranch || !watchedSupplier) return;
    setSearchingInvoices(true);
    try {
      const results = await purchaseReturnApi.searchPurchaseInvoices(Number(watchedBranch), Number(watchedSupplier), query || "");
      const mapped = results.map((r: any) => {
        const invText = r.invoiceNo || r.purchaseNo || "Unknown";
        return {
          label: invText,
          value: (r.purchaseId || r.id || 0).toString(),
        };
      });
      setInvoiceOptions(mapped);
    } catch (error) {
      console.error("Failed to search invoices", error);
    } finally {
      setSearchingInvoices(false);
    }
  }, [watchedBranch, watchedSupplier]);

  const handleInvoiceSelect = async (purchaseIdStr: string, invoiceNoText: string) => {
    if (!purchaseIdStr || purchaseIdStr === "0") {
      setValue("invoiceNo", invoiceNoText);
      return;
    }
    setValue("invoiceNo", invoiceNoText);
    try {
      const res = await purchaseReturnApi.getPurchaseInvoiceData(purchaseIdStr);
      if (res && res.master) {
        setPurchaseId(res.master.purchaseId || parseInt(purchaseIdStr) || 0);
        setLoadedInvoiceText(invoiceNoText);
        setValue("invoiceDate", res.master.invoiceDate ? res.master.invoiceDate.split("T")[0] : getValues("invoiceDate"));
        setValue("refNo", res.master.refNo || getValues("refNo"));
      }
      if (res && res.detailsData) {
        const mappedItems = res.detailsData.map((d: any) => ({
          id: generateUUID(),
          product: d.productId?.toString() || "",
          code: d.productId?.toString() || "",
          unit: d.unitId?.toString() || "",
          qty: d.qty?.toString() || "1",
          foc: d.foc?.toString() || "0",
          price: d.price?.toString() || "0",
          discPercent: d.discPer?.toString() || "0",
          vatId: (d.vatId || 0).toString(),
          vatPercent: (d.vatValue || 0).toString(),
        }));
        replaceItems(mappedItems);
        
        const productIds = Array.from(new Set(mappedItems.map((i: any) => i.product)));
        const options: any[] = [];
        for (const pId of productIds) {
            if (!pId) continue;
            const searchRes = await purchaseReturnApi.searchProductsByName("");
            const pData = searchRes.find(r => r.productId.toString() === pId);
            if (pData) {
                options.push({
                    label: pData.productName,
                    value: pData.productId.toString(),
                    code: pData.code || "",
                    barcode: pData.barcode || ""
                });
            }
        }
        setProductOptions(options);
      }
    } catch (error: any) {
      console.error("Failed to fetch invoice details", error);
      showToast(error.message || "Failed to load invoice details", "error");
    }
  };

  const handleProductSelect = async (index: number, productId: string, _code: string) => {
    const opt = productOptions.find(o => o.value === productId);
    if (!opt || !opt.barcode) return;
    try {
      const details = await purchaseReturnApi.getProductCostData(opt.barcode);
      const currentQty = getValues(`items.${index}.qty`);
      setValue(`items.${index}.unit`, details.baseUnitId.toString());
      setValue(`items.${index}.price`, formatAmount(details.cost));
      setValue(`items.${index}.vatId`, details.vatId?.toString() || "0");
      setValue(`items.${index}.vatPercent`, details.vatValue.toString());
      if (currentQty === "0" || currentQty === "") {
         setValue(`items.${index}.qty`, "1");
      }
    } catch (error) {
      console.error("Failed to load product details", error);
    }
  };

  const handleReset = () => {
    reset(initialForm);
    setShowClearConfirm(false);
  };

  const handleClearClick = () => {
    const currentItems = getValues("items");
    const isDirty = currentItems.length > 1 || (currentItems[0] && currentItems[0].product !== "");
    if (isDirty) {
      setShowClearConfirm(true);
    } else {
      handleReset();
    }
  };

  const onSubmit = async (data: any): Promise<boolean> => {
    const validItems = data.items.filter((i: any) => i.product && i.product.trim() !== "");
    
    if (validItems.length === 0) {
      showToast("Please add at least one item", "warning");
      return false;
    }
    const totalPaid = watchedPayments.reduce((sum: number, p: any) => sum + toNumber(p.amount), 0);
    const roundedPaid = Number(totalPaid.toFixed(decimalPart));
    const roundedDue = Number(totals.grandTotal.toFixed(decimalPart));
    if (roundedDue > 0) {
      if (watchedPayments.length === 0 || roundedPaid < roundedDue) {
        showToast("Please settle the payment fully before saving", "warning");
        return false;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        seriesId: parseInt(data.series) || 0,
        prefix: "",
        supplierId: parseInt(data.supplier) || 0,
        paymodeId: watchedPayments.length > 1 ? 3 : (watchedPayments.length > 0 ? (watchedPayments[0].mode === 'cash' ? 1 : watchedPayments[0].mode === 'card' ? 2 : 3) : 1),
        branchId: parseInt(data.branch) || 0,
        employeeId: parseInt(data.salesman) || 0,
        dayId: 0,
        shiftId: 0,
        purchaseReturnDate: new Date(data.purchaseDate).toISOString(),
        purchaseId: purchaseId || 0,
        purchaseInvoiceNo: data.invoiceNo,
        refNo: data.refNo,
        narration: data.narration,
        discAmount: toNumber(data.discAmount),
        discPer: 0,
        vatExclAmount: totals.netAmount - totals.vatAmount,
        vatAmount: totals.vatAmount,
        netAmount: totals.grandTotal,
        details: validItems.map((item: any) => {
          const l = calculateLine(item as PurchaseReturnLineItem);
          return {
            productId: parseInt(item.product) || 0,
            unitId: parseInt(item.unit) || 0,
            vatId: parseInt(item.vatId) || 1,
            qty: toNumber(item.qty),
            foc: toNumber(item.foc),
            price: toNumber(item.price),
            discPer: toNumber(item.discPercent),
            discAmount: l.discountAmount,
            vatAmount: l.vatAmount,
            netAmount: l.netAmount,
            baseQty: toNumber(item.qty) + toNumber(item.foc),
          };
        }),
        paymodes: watchedPayments.length <= 1 ? [] : watchedPayments.slice(1).map((p: any) => ({
          paymodeId: p.paymodeId ?? (p.mode === 'cash' ? 1 : p.mode === 'card' ? 2 : 3),
          amount: toNumber(p.amount),
        })),
      };

      if (invoiceId) {
        payload.purchaseReturnId = Number(invoiceId);
        payload.updateAt = new Date().toISOString();
        await purchaseReturnApi.updatePurchaseReturn(invoiceId, payload);
        showToast("Purchase Return updated successfully", "success");
      } else {
        payload.createdAt = new Date().toISOString();
        await purchaseReturnApi.savePurchaseReturn(payload);
        showToast("Purchase Return saved successfully", "success");
      }
      return true;
    } catch (error: any) {
      console.error("Failed to save invoice", error);
      const errMsg = error.response?.data?.message || error.message || "Failed to save invoice";
      showToast(errMsg, "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSettlementSubmit = (newPayments: { mode: string; amount: number }[]) => {
    setPayments(newPayments.map(p => ({ mode: p.mode as any, amount: p.amount.toString() })));
    setIsMultiPayOpen(false);
  };

  return {
    methods,
    items,
    append,
    remove,
    watchedItems,
    payments: watchedPayments,
    totals,
    showClearConfirm,
    setShowClearConfirm,
    handleReset,
    handleClearClick,
    onSubmit,
    isMultiPayOpen,
    setIsMultiPayOpen,
    handleSettlementSubmit,
    masterData,
    loadingMaster,
    masterError,
    productOptions,
    searchingProducts,
    handleProductSearch,
    supplierOptions,
    searchingSuppliers,
    handleSupplierSearch,
    invoiceOptions,
    searchingInvoices,
    handleInvoiceSearch,
    handleInvoiceSelect,
    handleProductSelect,
    saving,
  };
};
