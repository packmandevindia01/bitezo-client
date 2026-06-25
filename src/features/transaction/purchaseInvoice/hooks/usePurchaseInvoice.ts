import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCurrency } from "../../../../hooks/useCurrency";
import { createEmptyPurchaseInvoiceForm } from "../constants";
import { purchaseInvoiceSchema } from "../types";
import type { PurchaseInvoiceForm, PurchaseInvoiceLineItem } from "../types";
import { purchaseInvoiceApi } from "../services/purchaseInvoiceApi";
import type { PurchaseInvoiceMasterData } from "../services/purchaseInvoiceApi";
import { useToast } from "../../../../app/providers/useToast";

const toNumber = (value: string | number | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateLine = (item: PurchaseInvoiceLineItem) => {
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

export const usePurchaseInvoice = (invoiceId?: string) => {
  const { showToast } = useToast();
  const { formatAmount, decimalPart } = useCurrency();
  const [masterData, setMasterData] = useState<PurchaseInvoiceMasterData | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterError, setMasterError] = useState<string | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isMultiPayOpen, setIsMultiPayOpen] = useState(false);

  // Product Search State
  const [productOptions, setProductOptions] = useState<{label: string, value: string, code: string, barcode: string}[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const [supplierOptions, setSupplierOptions] = useState<{label: string, value: string}[]>([]);
  const [searchingSuppliers, setSearchingSuppliers] = useState(false);

  const initialForm = useMemo(() => {
    const empty = createEmptyPurchaseInvoiceForm();
    empty.discAmount = formatAmount(0);
    empty.otherCharge = formatAmount(0);
    empty.roundOff = formatAmount(0);
    empty.items = [{
        id: crypto.randomUUID(),
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
    resolver: zodResolver(purchaseInvoiceSchema),
    defaultValues: initialForm,
  });

  const { control, setValue, reset } = methods;

  const { fields: items, append, remove } = useFieldArray({
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
  
  // Calculate totals
  const totals = useMemo(() => {
    const itemTotals = watchedItems.reduce(
      (acc: any, item: any) => {
        const line = calculateLine(item as PurchaseInvoiceLineItem);
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
      const subTotal = watchedItems.reduce((acc: any, item: any) => acc + calculateLine(item as PurchaseInvoiceLineItem).netAmount, 0);
      const newDiscAmt = formatAmount(subTotal * (toNumber(watchedGlobalDiscPercent) / 100));
      if (newDiscAmt !== watchedDiscAmount) {
        setValue("discAmount", newDiscAmt);
      }
    }
  }, [watchedItems, watchedGlobalDiscPercent, setValue, formatAmount, watchedDiscAmount]);

  const handleProductSearch = useCallback(async (query: string) => {
    setSearchingProducts(true);
    try {
      const results = await purchaseInvoiceApi.searchProductsByName(query || "");
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
      const results = await purchaseInvoiceApi.searchSuppliers(query || "");
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

  const handleProductSelect = async (index: number, _val: string, barcode: string) => {
    if (!barcode) return;
    try {
      const details = await purchaseInvoiceApi.getProductCostData(barcode);
      setValue(`items.${index}.unit`, details.baseUnitId.toString());
      setValue(`items.${index}.price`, formatAmount(details.cost));
      setValue(`items.${index}.vatId`, details.vatId?.toString() || "0");
      setValue(`items.${index}.vatPercent`, details.vatValue.toString());
    } catch (error) {
      console.error("Failed to load product details", error);
    }
  };

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setMasterError(null);
        const data = await purchaseInvoiceApi.loadMasterData();
        if (data) {
          setMasterData(data);
          // Pre-select first series and branch if available
          if (data.series.length > 0) {
            setValue("series", data.series[0].seriesId.toString());
            setValue("purchaseNo", `${data.series[0].prefix}${data.series[0].startNo}`);
          }
          if (data.branches.length > 0) {
            setValue("branch", data.branches[0].branchId.toString());
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
  }, [setValue]);

  const loadInvoiceData = async (id: string) => {
    try {
      setLoadingMaster(true);
      const res = await purchaseInvoiceApi.getPurchaseInvoiceById(id);
      const master = res.masterData;
      const rootPaymodeId = res.masterData.paymodeId || 1;
      const rootAmount = (res.masterData.netAmount || 0) - (res.paymodesData || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      
      const mappedItems = (res.detailsData || []).map((d: any) => ({
        id: crypto.randomUUID(),
        product: d.productId?.toString() || "",
        code: d.productId?.toString() || "",
        unit: d.unitId?.toString() || "",
        qty: d.qty?.toString() || "1",
        foc: d.foc?.toString() || "0",
        price: d.price?.toString() || "0",
        discPercent: d.discPer?.toString() || "0",
        vatId: d.vatId?.toString() || "0",
        vatPercent: d.vatValue?.toString() || "0",
      }));

      // Do not auto-append empty row in edit mode

      // Populate productOptions with loaded items so labels display correctly
      const initialProducts = (res.detailsData || []).filter((d: any) => d.productId).map((d: any) => ({
        label: d.productName || d.productNameEng || d.productNameAr || d.productId?.toString(),
        value: d.productId?.toString() || "",
        code: d.productId?.toString() || "",
        barcode: d.barcode || ""
      }));
      // De-duplicate based on value
      const uniqueProducts = Array.from(new Map<string, { label: string; value: string; code: string; barcode: string; }>(
        initialProducts.map((item: any) => [item.value, item])
      ).values());
      setProductOptions(uniqueProducts);

      let mappedPayments: any[] = [];
      if (res.paymodesData && res.paymodesData.length > 0) {
        mappedPayments = [
          {
            mode: rootPaymodeId === 1 ? 'cash' : rootPaymodeId === 2 ? 'card' : 'credit',
            amount: rootAmount.toString(),
          },
          ...res.paymodesData.map((p: any) => ({
            mode: p.paymodeId === 1 ? 'cash' : p.paymodeId === 2 ? 'card' : 'credit',
            amount: p.amount?.toString() || "0",
          }))
        ];
      }

      reset({
        ...initialForm,
        series: master.seriesId?.toString() || "",
        branch: master.branchId?.toString() || "",
        salesman: master.employeeId?.toString() || "",
        supplier: master.supplierId?.toString() || "",
        purchaseNo: master.purchaseNo || "",
        invoiceNo: master.invoiceNo || "",
        purchaseDate: master.purchaseDate ? master.purchaseDate.split("T")[0] : "",
        invoiceDate: master.invoiceDate ? master.invoiceDate.split("T")[0] : "",
        refNo: master.refNo || "",
        narration: master.narration || "",
        discAmount: master.discAmount?.toString() || "0",
        roundOff: "0",
        otherCharge: "0",
        items: mappedItems,
        payments: mappedPayments,
      });

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

  const handleReset = () => {
    reset(initialForm);
    setShowClearConfirm(false);
  };

  const handleClearClick = () => {
    const isDirty = watchedItems.length > 1 || watchedItems[0]?.product !== "";
    if (isDirty) {
      setShowClearConfirm(true);
    } else {
      handleReset();
    }
  };

  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: PurchaseInvoiceForm): Promise<boolean> => {
    // Filter out empty rows
    const validItems = data.items.filter(item => item.product.trim() !== "");
    if (validItems.length === 0) {
      showToast("Please add at least one item", "warning");
      return false;
    }
    
    const totalPaid = data.payments.reduce((sum, p) => sum + toNumber(p.amount), 0);
    const roundedPaid = Number(totalPaid.toFixed(decimalPart));
    const roundedDue = Number(totals.grandTotal.toFixed(decimalPart));
    if (roundedDue > 0) {
      if (data.payments.length === 0 || roundedPaid < roundedDue) {
        showToast("Please settle the payment fully before saving", "warning");
        return false;
      }
    }

    setSaving(true);
    try {
      const payload: any = {
        seriesId: parseInt(data.series || "") || 0,
        prefix: "",
        supplierId: parseInt(data.supplier || "") || 0,
        paymodeId: data.payments.length > 0 ? ((data.payments[0].mode || 'cash') === 'cash' ? 1 : (data.payments[0].mode || 'cash') === 'card' ? 2 : 3) : 1,
        branchId: parseInt(data.branch || "") || 0,
        employeeId: parseInt(data.salesman || "") || 0,
        dayId: 0,
        shiftId: 0,
        purchaseDate: new Date(data.purchaseDate).toISOString(),
        invoiceNo: data.invoiceNo,
        invoiceDate: new Date(data.invoiceDate).toISOString(),
        refNo: data.refNo,
        narration: data.narration,
        discAmount: toNumber(data.discAmount),
        discPer: 0,
        vatExclAmount: totals.netAmount - totals.vatAmount,
        vatAmount: totals.vatAmount,
        netAmount: totals.grandTotal,
        details: validItems.map((item) => {
          const l = calculateLine(item as PurchaseInvoiceLineItem);
          return {
            productId: parseInt(item.product || "") || 0,
            unitId: parseInt(item.unit || "") || 0,
            vatId: parseInt(item.vatId || "") || 1,
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
        paymodes: data.payments.length <= 1 ? [] : data.payments.slice(1).map((p) => ({
          paymodeId: (p.mode || 'cash') === 'cash' ? 1 : (p.mode || 'cash') === 'card' ? 2 : 3,
          amount: toNumber(p.amount),
        })),
      };

      if (invoiceId) {
        payload.purchaseId = Number(invoiceId);
        payload.updateAt = new Date().toISOString();
        await purchaseInvoiceApi.updatePurchaseInvoice(invoiceId, payload);
        showToast("Purchase Invoice updated successfully", "success");
      } else {
        payload.createdAt = new Date().toISOString();
        await purchaseInvoiceApi.savePurchaseInvoice(payload);
        showToast("Purchase Invoice saved successfully", "success");
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
    watchedDiscAmount,
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
    handleProductSelect,
    saving,
  };
};
