import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCurrency } from "../../../../hooks/useCurrency";
import { createEmptyPurchaseInvoiceForm } from "../constants";
import { purchaseInvoiceSchema } from "../types";
import type { PurchaseInvoiceForm, PurchaseInvoiceLineItem } from "../types";
import { productService } from "../../../inventory/product/services/productService";
import { purchaseInvoiceApi } from "../services/purchaseInvoiceApi";
import type { PurchaseInvoiceMasterData } from "../services/purchaseInvoiceApi";
import { useToast } from "../../../../app/providers/useToast";
import { generateUUID } from "../../../../utils/uuid";


const toNumber = (value: string | number | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateLine = (item: PurchaseInvoiceLineItem, grossTotal: number = 0, globalDiscAmount: number = 0) => {
  const qty = toNumber(item.qty);
  const price = toNumber(item.price);
  const vatPercent = toNumber(item.vatPercent);

  const amount = qty * price;
  // Pro-rate global discount based on this item's share of the gross total
  const discountAmount = grossTotal > 0 ? (amount / grossTotal) * globalDiscAmount : 0;
  
  const vatAmount = (amount - discountAmount) * (vatPercent / 100);
  const netAmount = amount - discountAmount + vatAmount;

  return { amount, discountAmount, vatAmount, netAmount };
};

import { useBranchScope } from "../../../../hooks/useBranchScope";

export const usePurchaseInvoice = (invoiceId?: string) => {
  const { showToast } = useToast();
  const { formatAmount, decimalPart } = useCurrency();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  
  const [masterData, setMasterData] = useState<PurchaseInvoiceMasterData | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterError, setMasterError] = useState<string | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isMultiPayOpen, setIsMultiPayOpen] = useState(false);
  const [selectedPaymodeId, setSelectedPaymodeId] = useState<number>(0);

  // Product Search State
  const [productOptions, setProductOptions] = useState<{label: string, value: string, code: string, barcode: string}[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [searchingSuppliers, setSearchingSuppliers] = useState(false);
  const [categoryUnits, setCategoryUnits] = useState<Record<string, { label: string, value: string, currentValue: number }[]>>({});

  const loadCategoryUnits = useCallback(async (unitCategory: string) => {
    if (!unitCategory) return;
    setCategoryUnits(prev => {
      if (prev[unitCategory]) return prev;
      purchaseInvoiceApi.getUnitsByCategory(unitCategory).then(res => {
        setCategoryUnits(current => ({
          ...current,
          [unitCategory]: res.map((u: any) => ({ label: u.name, value: String(u.unitId), currentValue: u.currentValue ?? 1 }))
        }));
      }).catch(console.error);
      return prev;
    });
  }, []);

  const [supplierOptions, setSupplierOptions] = useState<{label: string, value: string}[]>([]);

  const initialForm = useMemo(() => {
    const empty = createEmptyPurchaseInvoiceForm();
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
    resolver: zodResolver(purchaseInvoiceSchema),
    defaultValues: initialForm,
  });

  const { control, setValue, reset } = methods;

  const { fields: items, append, remove, update } = useFieldArray({
    control,
    name: "items",
  });

  const { replace: setPayments } = useFieldArray({
    control,
    name: "payments",
  });

  // Watchers for reactive totals and series
  const watchedItems = useWatch({ control, name: "items" }) || [];
  const watchedDiscAmount = useWatch({ control, name: "discAmount" });
  const watchedOtherCharge = useWatch({ control, name: "otherCharge" });
  const watchedRoundOff = useWatch({ control, name: "roundOff" });
  const watchedPayments = useWatch({ control, name: "payments" }) || [];
  const watchedGlobalDiscPercent = useWatch({ control, name: "globalDiscPercent" });
  const watchedSeries = useWatch({ control, name: "series" });
  const watchedBranch = useWatch({ control, name: "branch" });
  
  // Calculate totals
  const grossTotal = useMemo(() => {
    return watchedItems.reduce((acc: number, item: any) => acc + (toNumber(item.qty) * toNumber(item.price)), 0);
  }, [watchedItems]);

  const totals = useMemo(() => {
    const globalDiscAmount = toNumber(watchedDiscAmount);

    const itemTotals = watchedItems.reduce(
      (acc: any, item: any) => {
        const line = calculateLine(item as PurchaseInvoiceLineItem, grossTotal, globalDiscAmount);
        acc.discountAmount += line.discountAmount;
        acc.vatAmount += line.vatAmount;
        acc.netAmount += line.netAmount;
        return acc;
      },
      { discountAmount: 0, vatAmount: 0, netAmount: 0 }
    );

    const otherCharge = toNumber(watchedOtherCharge);
    const roundOff = toNumber(watchedRoundOff);
    // discount is already subtracted from netAmount in calculateLine
    const grandTotal = itemTotals.netAmount + otherCharge + roundOff;

    return {
      ...itemTotals,
      grandTotal,
    };
  }, [watchedDiscAmount, watchedOtherCharge, watchedRoundOff, watchedItems, grossTotal]);

  // Paymode list from master data — show all available paymodes as provided by the API.
  // MultiPay (detected by name) is handled specially in the UI (opens the modal).
  // BackofficeMultiPayModal has its own filter to exclude Credit/MultiPay from split options.
  const paymodeList = useMemo(() => {
    if (!masterData?.paymodes) return [];
    return masterData.paymodes as { paymodeId: number; paymodeName: string }[];
  }, [masterData]);

  const multiPayId = useMemo(() => {
    const multi = paymodeList.find(p => p.paymodeName.toLowerCase().includes("multi"));
    return multi ? multi.paymodeId : 0;
  }, [paymodeList]);

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

  // Fetch products by branch to allow local combobox search by name and code
  useEffect(() => {
    if (!watchedBranch) return;
    setSearchingProducts(true);
    purchaseInvoiceApi.searchProductsByName(Number(watchedBranch), "")
      .then(results => {
        const mapped = results.map((r) => ({
          label: r.code ? `[${r.code}] ${r.productName}` : r.productName,
          value: r.productId.toString(),
          code: r.code || "",
          barcode: r.barcode || "",
        }));
        const seenIds = new Set<string>();
        const unique = mapped.filter(item => {
          if (seenIds.has(item.value)) return false;
          seenIds.add(item.value);
          return true;
        });
        setProductOptions(unique);
      })
      .catch(e => console.error("Failed to load products", e))
      .finally(() => setSearchingProducts(false));
  }, [watchedBranch]);

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
      setValue(`items.${index}.stock`, "...");
      setValue(`items.${index}.avgCost`, "...");
      
      const details = await purchaseInvoiceApi.getProductCostData(barcode);
      setValue(`items.${index}.unitCategory`, details.unitCategory || "");
      setValue(`items.${index}.unit`, details.baseUnitId.toString());
      setValue(`items.${index}.price`, formatAmount(details.cost));
      setValue(`items.${index}.vatId`, details.vatId?.toString() || "0");
      setValue(`items.${index}.vatPercent`, details.vatValue.toString());
      
      if (details.unitCategory) {
        loadCategoryUnits(details.unitCategory);
      }

      // Async fetch for stock and average cost
      const branchIdStr = methods.getValues("branch");
      if (branchIdStr && details.productId) {
        const branchId = Number(branchIdStr);
        productService.getClosingStock(details.productId, branchId)
          .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
          .catch(() => setValue(`items.${index}.stock`, "Error"));

        productService.getAverageCost(details.productId, details.baseUnitId, branchId)
          .then(res => setValue(`items.${index}.avgCost`, res.avgCost || 0))
          .catch(() => setValue(`items.${index}.avgCost`, "Error"));
      }

    } catch (error) {
      console.error("Failed to load product details", error);
      setValue(`items.${index}.stock`, "Error");
      setValue(`items.${index}.avgCost`, "Error");
    }
  };

  // When user changes unit on a line — fetch updated cost for that product+unit combination
  const handleUnitChange = useCallback(async (index: number, unitId: string) => {
    setValue(`items.${index}.unit`, unitId);
    const productId = methods.getValues(`items.${index}.product`);
    if (!productId || !unitId) return;
    try {
      setValue(`items.${index}.avgCost`, "...");
      const result = await purchaseInvoiceApi.getUnitCost(Number(productId), Number(unitId));
      if (result.cost !== undefined && result.cost !== null) {
        setValue(`items.${index}.price`, formatAmount(result.cost));
      }

      const branchIdStr = methods.getValues("branch");
      if (branchIdStr) {
        const branchId = Number(branchIdStr);
        productService.getAverageCost(Number(productId), Number(unitId), branchId)
          .then(res => setValue(`items.${index}.avgCost`, res.avgCost || 0))
          .catch(() => setValue(`items.${index}.avgCost`, "Error"));
      }

    } catch (error) {
      console.error("Failed to fetch unit cost", error);
      setValue(`items.${index}.avgCost`, "Error");
    }
  }, [methods, setValue, formatAmount]);

  const handleBarcodeScan = useCallback(async (index: number, barcode: string) => {
    try {
      setValue(`items.${index}.stock`, "...");
      setValue(`items.${index}.avgCost`, "...");

      const details = await purchaseInvoiceApi.getProductCostData(barcode).catch(() => null);
      if (details) {
        setProductOptions(prev => {
          if (prev.find(o => o.value === String(details.productId))) return prev;
          return [...prev, { label: details.productName, value: String(details.productId), code: details.productCode || "", barcode }];
        });
        setValue(`items.${index}.product`, String(details.productId));
        setValue(`items.${index}.code`, details.productCode || "");
        setValue(`items.${index}.unitCategory`, details.unitCategory || "");
        setValue(`items.${index}.unit`, details.baseUnitId.toString());
        setValue(`items.${index}.price`, formatAmount(details.cost));
        setValue(`items.${index}.vatId`, details.vatId?.toString() || "0");
        setValue(`items.${index}.vatPercent`, details.vatValue.toString());
        
        if (details.unitCategory) {
          loadCategoryUnits(details.unitCategory);
        }

        const branchIdStr = methods.getValues("branch");
        if (branchIdStr && details.productId) {
          const branchId = Number(branchIdStr);
          productService.getClosingStock(details.productId, branchId)
            .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
            .catch(() => setValue(`items.${index}.stock`, "Error"));

          productService.getAverageCost(details.productId, details.baseUnitId, branchId)
            .then(res => setValue(`items.${index}.avgCost`, res.avgCost || 0))
            .catch(() => setValue(`items.${index}.avgCost`, "Error"));
        }

        return true;
      } else {
        setValue(`items.${index}.stock`, "Error");
        setValue(`items.${index}.avgCost`, "Error");
      }
    } catch (e) {
      console.error("Instant barcode lookup failed", e);
      setValue(`items.${index}.stock`, "Error");
      setValue(`items.${index}.avgCost`, "Error");
    }
    return false;
  }, [setValue, methods]);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setMasterError(null);
        const [data, productMaster] = await Promise.all([
          purchaseInvoiceApi.loadMasterData(),
          productService.loadMasterData().catch(() => null),
        ]);
        if (data) {
          const unitsRes = productMaster?.unit || [];
          const enrichedData = {
            ...data,
            units: unitsRes.map((u: any) => ({ label: u.name || u.unitName, value: String(u.id || u.unitId) })),
          };
          setMasterData(enrichedData as any);
          // Pre-select first series and branch if available
          if (data.series.length > 0) {
            setValue("series", data.series[0].seriesId.toString());
          }
          if (data.branches.length > 0) {
            if (isBranchLocked) {
              setValue("branch", initialBranchId);
            } else {
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
  }, [setValue]);

  // Dynamically fetch and set the next purchase number when series changes
  useEffect(() => {
    if (!invoiceId && watchedSeries) {
      const fetchPurchaseNumber = async () => {
        try {
          const res = await purchaseInvoiceApi.getPurchaseNumber(Number(watchedSeries));
          const selectedSeries = masterData?.series.find(s => s.seriesId.toString() === watchedSeries);
          const prefix = selectedSeries ? selectedSeries.prefix : "";
          setValue("purchaseNo", `${prefix}${res.purchaseNo}`);
        } catch (error) {
          console.error("Failed to load next purchase number", error);
          // Fallback to startNo if API fails
          const selectedSeries = masterData?.series.find(s => s.seriesId.toString() === watchedSeries);
          if (selectedSeries) {
            setValue("purchaseNo", `${selectedSeries.prefix}${selectedSeries.startNo}`);
          }
        }
      };
      fetchPurchaseNumber();
    }
  }, [invoiceId, watchedSeries, masterData, setValue]);

  const loadInvoiceData = async (id: string) => {
    try {
      setLoadingMaster(true);
      const res = await purchaseInvoiceApi.getPurchaseInvoiceById(id);
      const master = res.masterData;
      const rootPaymodeId = res.masterData.paymodeId || 1;
      
      const mappedItems = (res.detailsData || []).map((d: any) => ({
        id: generateUUID(),
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
      // Merge initial products into existing options to preserve the "[code] name" format if already loaded
      setProductOptions(prev => {
        const newOpts = [...prev];
        const existingIds = new Set(prev.map(p => p.value));
        initialProducts.forEach((p: any) => {
          if (!existingIds.has(p.value)) {
            newOpts.push({ ...p, label: p.code ? `[${p.code}] ${p.label}` : p.label });
          }
        });
        return newOpts;
      });

      // Helper to map a paymodeId to a mode name using master paymodes list
      const paymodeIdToMode = (pid: number): string => {
        const found = masterData?.paymodes?.find((pm: any) => pm.paymodeId === pid);
        if (found) return found.paymodeName.toLowerCase();
        return pid === 1 ? 'cash' : pid === 2 ? 'card' : 'credit';
      };

      let mappedPayments: any[] = [];

      if (rootPaymodeId === (multiPayId || 3) && res.paymodesData && res.paymodesData.length > 0) {
        // MultiPay: with new save fix, ALL payments are stored in paymodesData
        // With old save bug, only payments[1..n] were stored, so we also add the remainder as first entry
        const storedTotal = res.paymodesData.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const remainder = Number(((res.masterData.netAmount || 0) - storedTotal).toFixed(decimalPart));

        mappedPayments = res.paymodesData.map((p: any) => ({
          mode: paymodeIdToMode(p.paymodeId),
          amount: p.amount?.toString() || "0",
          paymodeId: p.paymodeId,
        }));

        // If there's a remainder (old save format had slice(1) bug), prepend it as Cash
        if (remainder > 0) {
          mappedPayments = [
            { mode: 'cash', amount: remainder.toString(), paymodeId: 1 },
            ...mappedPayments,
          ];
        }
      } else if (res.paymodesData && res.paymodesData.length > 0) {
        // Single payment stored in paymodesData
        mappedPayments = res.paymodesData.map((p: any) => ({
          mode: paymodeIdToMode(p.paymodeId),
          amount: p.amount?.toString() || "0",
          paymodeId: p.paymodeId,
        }));
      } else if (rootPaymodeId && rootPaymodeId !== (multiPayId || 3)) {
        // Single pay — only master has the paymode, no paymodesData entries
        mappedPayments = [{
          mode: paymodeIdToMode(rootPaymodeId),
          amount: (res.masterData.netAmount || 0).toString(),
          paymodeId: rootPaymodeId,
        }];
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
        globalDiscPercent: master.discPer?.toString() || "0",
        roundOff: "0",
        otherCharge: "0",
        items: mappedItems,
        payments: mappedPayments,
      });

      // Restore the selected paymode button state
      setSelectedPaymodeId(rootPaymodeId || 1);

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
    setSelectedPaymodeId(0);
  };

  const handleClearClick = () => {
    const isDirty = watchedItems.length > 1 || watchedItems[0]?.product !== "";
    if (isDirty) {
      setShowClearConfirm(true);
    } else {
      handleReset();
    }
  };

  // Set a single paymode as the full payment — no modal needed
  const handleSinglePayment = useCallback((paymodeId: number, paymodeName: string, grandTotal: number) => {
    setPayments([{
      mode: paymodeName.toLowerCase(),
      amount: grandTotal.toFixed(decimalPart),
      paymodeId,
    } as any]);
    setSelectedPaymodeId(paymodeId);
  }, [setPayments, decimalPart]);

  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: PurchaseInvoiceForm): Promise<boolean> => {
    const validItems = data.items.filter(item => item.product.trim() !== "");
    if (validItems.length === 0) {
      showToast("Please add at least one item", "warning");
      return false;
    }
    
    if (totals.grandTotal <= 0) {
      showToast("Transaction amount cannot be zero or negative", "warning");
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
        // master paymodeId: multiPayId if multi-payment, otherwise use stored paymodeId from first payment
        paymodeId: data.payments.length > 1 ? (multiPayId || 3) : (data.payments.length > 0 ? ((data.payments[0] as any).paymodeId || 1) : 1),
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
        discPer: toNumber(data.globalDiscPercent),
        vatExclAmount: totals.netAmount - totals.vatAmount,
        vatAmount: totals.vatAmount,
        netAmount: totals.grandTotal,
        details: validItems.map((item) => {
          const l = calculateLine(item as PurchaseInvoiceLineItem, grossTotal, toNumber(data.discAmount));
          // Find the unit's currentValue from loaded categoryUnits
          const unitCurrentValue = (() => {
            for (const units of Object.values(categoryUnits)) {
              const found = units.find(u => u.value === item.unit);
              if (found) return found.currentValue;
            }
            return 1; // default to 1 (base unit)
          })();
          return {
            productId: parseInt(item.product || "") || 0,
            unitId: parseInt(item.unit || "") || 0,
            vatId: parseInt(item.vatId || "") || 1,
            qty: toNumber(item.qty),
            foc: toNumber(item.foc),
            price: toNumber(item.price),
            discPer: 0,
            discAmount: l.discountAmount,
            vatAmount: l.vatAmount,
            netAmount: l.netAmount,
            baseQty: (toNumber(item.qty) + toNumber(item.foc)) * unitCurrentValue,
          };
        }),
        paymodes: (() => {
          if (data.payments.length <= 1) return [];
          // Deduplicate by paymodeId — sum amounts if same paymodeId appears more than once
          const map = new Map<number, number>();
          for (const p of data.payments as any[]) {
            const pid = p.paymodeId || 1;
            map.set(pid, (map.get(pid) || 0) + toNumber(p.amount));
          }
          return Array.from(map.entries()).map(([paymodeId, amount]) => ({ paymodeId, amount }));
        })(),
      };

      console.log("Purchase Invoice Payload:", JSON.stringify(payload, null, 2));

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

  const handleSettlementSubmit = (newPayments: { mode: string; paymodeId: number; amount: number }[]) => {
    setPayments(newPayments.map(p => ({ mode: p.mode as any, amount: p.amount.toString(), paymodeId: p.paymodeId })));
    setSelectedPaymodeId(multiPayId || 3); // master paymodeId for multi-payment
    setIsMultiPayOpen(false);
  };

  return {
    methods,
    items,
    append,
    remove,
    update,
    isBranchLocked,
    watchedItems,
    payments: watchedPayments,
    watchedDiscAmount,
    grossTotal,
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
    handleSupplierCreated: useCallback((id: number, name: string) => {
      setSupplierOptions(prev => [...prev, { label: name, value: String(id) }]);
      methods.setValue("supplier", String(id), { shouldValidate: true });
    }, [methods]),
    handleProductSelect,
    handleUnitChange,
    categoryUnits,
    saving,
  };
};
