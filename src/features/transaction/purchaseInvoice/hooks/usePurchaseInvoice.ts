import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCurrency } from "../../../../hooks/useCurrency";
import { calculatePurchaseLine } from "../../shared/purchaseCalc";
import { formatDateOnly, mapStoredPayments, parseStockValue as readStock, paymodesForSave, toNumber } from "../../shared/purchaseDocument";
import { usePurchaseFormCommon } from "../../shared/usePurchaseFormCommon";
import { createEmptyPurchaseInvoiceForm } from "../constants";
import { getPurchaseInvoiceSchema } from "../types";
import type { PurchaseInvoiceForm, PurchaseInvoiceLineItem } from "../types";
import { productService } from "../../../inventory/product/services/productService";
import { purchaseInvoiceApi } from "../services/purchaseInvoiceApi";
import type { PurchaseInvoiceMasterData } from "../services/purchaseInvoiceApi";
import { useToast } from "../../../../app/providers/useToast";
import { generateUUID } from "../../../../utils/uuid";
import { subscribeToEmployeeUpdates } from "../../../general/employee/utils/employeeSync";


/** Line maths shared with purchase return — exact decimal, 14 dp half-up (transaction/shared/purchaseCalc.ts). */
export const calculateLine = (item: PurchaseInvoiceLineItem, grossTotal: number = 0, globalDiscAmount: number = 0) =>
  calculatePurchaseLine(item.qty, item.price, item.vatPercent, grossTotal, globalDiscAmount);

import { useBranchScope } from "../../../../hooks/useBranchScope";

export const usePurchaseInvoice = (invoiceId?: string) => {
  const { showToast } = useToast();
  const { formatAmount, decimalPart } = useCurrency();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  
  const [masterData, setMasterData] = useState<PurchaseInvoiceMasterData | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterError, setMasterError] = useState<string | null>(null);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Product Search State
  const [productOptions, setProductOptions] = useState<{label: string, value: string, code: string, barcode: string}[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [categoryUnits, setCategoryUnits] = useState<Record<string, { label: string, value: string, currentValue: number }[]>>({});
  const [masterUnits, setMasterUnits] = useState<{ label: string; value: string; category?: string; currentValue: number }[]>([]);

  // Load all system units on mount to ensure conversion factors are always available
  useEffect(() => {
    purchaseInvoiceApi.getAllUnits().then(units => {
      if (units && units.length > 0) {
        const mapped = units.map((u: any) => ({
          label: u.name,
          value: String(u.unitId),
          category: u.category,
          currentValue: Number(u.currentValue ?? 1)
        }));
        setMasterUnits(prev => {
          const existingIds = new Set(prev.map(p => p.value));
          const newEntries = mapped.filter((m: any) => !existingIds.has(m.value));
          return [...prev, ...newEntries];
        });
        setCategoryUnits(prev => {
          const updated = { ...prev };
          mapped.forEach((u: any) => {
            const cat = u.category || "Quantity";
            if (!updated[cat]) updated[cat] = [];
            if (!updated[cat].some((x: any) => x.value === u.value)) {
              updated[cat].push(u);
            }
          });
          return updated;
        });
      }
    }).catch(err => console.error("Failed to load all units", err));
  }, []);

  const getUnitCurrentValue = useCallback((unitId: string | number | undefined | null, loadedUnits?: { value: string, currentValue: number }[]): number => {
    if (unitId === undefined || unitId === null) return 1;
    const uStr = String(unitId);
    if (!uStr || uStr === "0") return 1;

    if (loadedUnits && loadedUnits.length > 0) {
      const found = loadedUnits.find(u => String(u.value) === uStr);
      if (found && !isNaN(found.currentValue) && found.currentValue > 0) return found.currentValue;
    }

    const foundMaster = masterUnits.find(u => String(u.value) === uStr);
    if (foundMaster && !isNaN(foundMaster.currentValue) && foundMaster.currentValue > 0) return foundMaster.currentValue;

    for (const units of Object.values(categoryUnits)) {
      const found = units.find(u => String(u.value) === uStr);
      if (found && !isNaN(found.currentValue) && found.currentValue > 0) return found.currentValue;
    }

    return 1;
  }, [masterUnits, categoryUnits]);

  const loadCategoryUnits = useCallback(async (unitCategory: string) => {
    if (!unitCategory) return;
    setCategoryUnits(prev => {
      if (prev[unitCategory]) return prev;
      purchaseInvoiceApi.getUnitsByCategory(unitCategory).then(res => {
        setCategoryUnits(current => ({
          ...current,
          [unitCategory]: res.map((u: any) => ({ label: u.name, value: String(u.unitId), currentValue: Number(u.currentValue ?? u.currentvalue ?? 1) }))
        }));
      }).catch(console.error);
      return prev;
    });
  }, []);


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

  const schema = useMemo(() => getPurchaseInvoiceSchema(decimalPart), [decimalPart]);

  const methods = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: initialForm,
    mode: "onChange",
    reValidateMode: "onChange",
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

  const {
    watchedItems, watchedDiscAmount, watchedPayments, watchedBranch,
    grossTotal, totals,
    paymodeList, multiPayId, selectedPaymodeId, setSelectedPaymodeId, isMultiPayOpen, setIsMultiPayOpen,
    supplierOptions, searchingSuppliers, handleSupplierSearch, handleSupplierCreated,
    handleSinglePayment, handleSettlementSubmit,
  } = usePurchaseFormCommon({
    methods, invoiceId, paymodes: masterData?.paymodes, decimalPart, formatAmount,
    searchSuppliers: purchaseInvoiceApi.searchSuppliers, setPayments: setPayments as never,
  });
  const watchedSeries = useWatch({ control, name: "series" });

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

  const parseStockValue = useCallback((res: unknown) => readStock(res, formatAmount), [formatAmount]);

  const handleProductSelect = async (index: number, _val: string, barcode: string) => {
    if (!_val && !barcode) return;
    try {
      setValue(`items.${index}.stock`, "...");
      setValue(`items.${index}.avgCost`, "...");
      
      let details;
      const branchId = Number(methods.getValues("branch")) || 0;
      
      if (barcode) {
         details = await purchaseInvoiceApi.getProductCostData(branchId, barcode).catch(() => null);
      }

      if (!details && _val) {
        details = await purchaseInvoiceApi.getProductCostDataById(Number(_val)).catch(() => null);
      }
      
      if (!details) {
         throw new Error("Could not fetch product cost data");
      }
      setValue(`items.${index}.unitCategory`, details.unitCategory || "");
      setValue(`items.${index}.unit`, details.baseUnitId?.toString() || "");
      setValue(`items.${index}.price`, formatAmount(details.cost));
      setValue(`items.${index}.vatId`, details.vatId?.toString() || "0");
      setValue(`items.${index}.vatPercent`, details.vatValue?.toString() || "0");
      
      if (details.unitCategory) {
        loadCategoryUnits(details.unitCategory);
      }

      // Async fetch for stock and average cost
      const branchIdStr = methods.getValues("branch");
      if (branchIdStr && details.productId) {
        const branchId = Number(branchIdStr);
        productService.getClosingStock(details.productId, branchId)
          .then(res => setValue(`items.${index}.stock`, parseStockValue(res)))
          .catch((err) => {
            console.error(`Failed to fetch closing stock for productId: ${details.productId}, branchId: ${branchId}`, err);
            setValue(`items.${index}.stock`, "0.000");
          });

        productService.getAverageCost(details.productId, details.baseUnitId, branchId)
          .then(res => setValue(`items.${index}.avgCost`, res.avgCost || 0))
          .catch(() => setValue(`items.${index}.avgCost`, "Error"));
      }

    } catch (error) {
      console.error("Failed to load product details", error);
      setValue(`items.${index}.avgCost`, "Error");
      // Try to fetch stock anyway if we have _val
      const branchIdStr = methods.getValues("branch");
      if (branchIdStr && _val) {
        const branchId = Number(branchIdStr);
        productService.getClosingStock(Number(_val), branchId)
          .then(res => setValue(`items.${index}.stock`, parseStockValue(res)))
          .catch(() => setValue(`items.${index}.stock`, "0.000"));
      } else {
        setValue(`items.${index}.stock`, "0.000");
      }
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

      const branchId = Number(methods.getValues("branch")) || 0;
      const details = await purchaseInvoiceApi.getProductCostData(branchId, barcode).catch(() => null);
      if (details) {
        setProductOptions(prev => {
          if (prev.find(o => o.value === String(details.productId))) return prev;
          return [...prev, { label: details.productName, value: String(details.productId), code: details.productCode || "", barcode }];
        });
        setValue(`items.${index}.product`, String(details.productId));
        setValue(`items.${index}.code`, details.productCode || "");
        setValue(`items.${index}.unitCategory`, details.unitCategory || "");
        setValue(`items.${index}.unit`, details.baseUnitId?.toString() || "");
        setValue(`items.${index}.price`, formatAmount(details.cost));
        setValue(`items.${index}.vatId`, details.vatId?.toString() || "0");
        setValue(`items.${index}.vatPercent`, details.vatValue?.toString() || "0");
        
        if (details.unitCategory) {
          loadCategoryUnits(details.unitCategory);
        }

        const branchIdStr = methods.getValues("branch");
        if (branchIdStr && details.productId) {
          const branchId = Number(branchIdStr);
          productService.getClosingStock(details.productId, branchId)
            .then(res => setValue(`items.${index}.stock`, parseStockValue(res)))
            .catch((err) => {
              console.error(`Failed to fetch closing stock for productId: ${details.productId}, branchId: ${branchId}`, err);
              setValue(`items.${index}.stock`, "0.000");
            });

          productService.getAverageCost(details.productId, details.baseUnitId, branchId)
            .then(res => setValue(`items.${index}.avgCost`, res.avgCost || 0))
            .catch(() => setValue(`items.${index}.avgCost`, "Error"));
        }

        return true;
      } else {
        setValue(`items.${index}.avgCost`, "Error");
        // Try to fetch stock anyway if we know the product from options
        const branchIdStr = methods.getValues("branch");
        const opt = productOptions.find(o => o.code === barcode || o.barcode === barcode);
        if (branchIdStr && opt) {
          productService.getClosingStock(Number(opt.value), Number(branchIdStr))
            .then(res => setValue(`items.${index}.stock`, parseStockValue(res)))
            .catch(() => setValue(`items.${index}.stock`, "0.000"));
        } else {
          setValue(`items.${index}.stock`, "0.000");
        }
      }
    } catch (e) {
      console.error("Instant barcode lookup failed", e);
      setValue(`items.${index}.stock`, "0.000");
      setValue(`items.${index}.avgCost`, "Error");
    }
    return false;
  }, [setValue, methods]);

  const fetchMasterData = useCallback(async () => {
    try {
      setMasterError(null);
      const [data, productMaster] = await Promise.all([
        purchaseInvoiceApi.loadMasterData(),
        productService.loadMasterData().catch(() => null),
      ]);
      if (data) {
        const unitsRes = productMaster?.unit || [];
        const mappedUnits = unitsRes.map((u: any) => ({
          label: u.name || u.unitName,
          value: String(u.id || u.unitId),
          category: u.category,
          currentValue: Number(u.currentvalue ?? u.currentValue ?? 1)
        }));
        setMasterUnits(prev => {
          const existingIds = new Set(prev.map(p => p.value));
          const newEntries = mappedUnits.filter((m: any) => !existingIds.has(m.value));
          return [...prev, ...newEntries];
        });
        setCategoryUnits(prev => {
          const updated = { ...prev };
          mappedUnits.forEach((u: any) => {
            const cat = u.category || "Quantity";
            if (!updated[cat]) updated[cat] = [];
            if (!updated[cat].some((x: any) => x.value === u.value)) {
              updated[cat].push(u);
            }
          });
          return updated;
        });
        const enrichedData = {
          ...data,
          units: mappedUnits,
        };
        setMasterData(enrichedData as any);
        // Pre-select first series and branch if available
        if (data.series.length > 0 && !methods.getValues("series")) {
          setValue("series", data.series[0].seriesId.toString());
        }
        if (data.branches.length > 0 && !methods.getValues("branch")) {
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
  }, [setValue, methods, isBranchLocked, initialBranchId]);

  useEffect(() => {
    fetchMasterData();
  }, [fetchMasterData]);

  // Real-time synchronization: update master data (employees/salesman) when employees are updated
  useEffect(() => {
    return subscribeToEmployeeUpdates(() => {
      void fetchMasterData();
    });
  }, [fetchMasterData]);

  const fetchPurchaseNumber = useCallback(async (seriesId: string) => {
      try {
        const res = await purchaseInvoiceApi.getPurchaseNumber(Number(seriesId));
        const selectedSeries = masterData?.series.find(s => s.seriesId.toString() === seriesId);
        const prefix = selectedSeries ? selectedSeries.prefix : "";
        setValue("purchaseNo", `${prefix}${res.purchaseNo}`);
      } catch (error) {
        console.error("Failed to load next purchase number", error);
        // Fallback to startNo if API fails
        const selectedSeries = masterData?.series.find(s => s.seriesId.toString() === seriesId);
        if (selectedSeries) {
          setValue("purchaseNo", `${selectedSeries.prefix}${selectedSeries.startNo}`);
        }
      }
    }, [masterData, setValue]);

    // Dynamically fetch and set the next purchase number when series changes
    useEffect(() => {
      if (!invoiceId && watchedSeries) {
        fetchPurchaseNumber(watchedSeries);
      }
    }, [invoiceId, watchedSeries, fetchPurchaseNumber]);

  const loadInvoiceData = async (id: string) => {
    try {
      setLoadingMaster(true);
      const res = await purchaseInvoiceApi.getPurchaseInvoiceById(id);
      const master = res.masterData;
      const rootPaymodeId = res.masterData.paymodeId || 1;
      
      const branchId = Number(master.branchId) || 0;
      
      const mappedItems = await Promise.all((res.detailsData || []).map(async (d: any) => {
        let stock = "0.000";
        let avgCost: number | string = 0;
        if (d.productId && branchId) {
          try {
            const [stockRes, costRes] = await Promise.allSettled([
              productService.getClosingStock(Number(d.productId), branchId),
              productService.getAverageCost(Number(d.productId), Number(d.unitId || 1), branchId)
            ]);
            if (stockRes.status === "fulfilled") {
              stock = parseStockValue(stockRes.value);
            }
            if (costRes.status === "fulfilled") {
              avgCost = Number((costRes.value as any)?.avgCost) || 0;
            }
          } catch (e) {
            console.error("Failed to fetch stock/cost for item", d.productId, e);
          }
        }

        return {
          id: generateUUID(),
          product: d.productId?.toString() || "",
          code: d.barcode || d.productId?.toString() || "",
          unit: d.unitId?.toString() || "",
          unitName: d.unitName || "",
          qty: d.qty?.toString() || "1",
          foc: d.foc?.toString() || "0",
          price: d.price?.toString() || "0",
          discPercent: d.discPer?.toString() || "0",
          vatId: d.vatId?.toString() || "0",
          vatPercent: d.vatValue?.toString() || "0",
          stock,
          avgCost,
        };
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

      const mappedPayments = mapStoredPayments({
        rootPaymodeId, multiPayId, netAmount: res.masterData.netAmount, stored: res.paymodesData,
        paymodes: masterData?.paymodes, decimalPart,
      });

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
        roundOff: master.roundOff?.toString() || "0",
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
    const branchToSet = isBranchLocked ? initialBranchId : (masterData?.branches?.[0]?.branchId?.toString() || "");
    const seriesToSet = masterData?.series?.[0]?.seriesId?.toString() || "";
    reset({
      ...initialForm,
      branch: branchToSet,
      series: seriesToSet,
    });
    if (seriesToSet) {
      fetchPurchaseNumber(seriesToSet);
    }
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

  const [saving, setSaving] = useState(false);

  const onSubmit = async (data: PurchaseInvoiceForm): Promise<boolean> => {
    const validItems = data.items.filter(item => item.product.trim() !== "");
    if (validItems.length === 0) {
      showToast("Please add at least one product.", "warning");
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
      const finalPaymodeId = (selectedPaymodeId === (multiPayId || 3) || data.payments.length > 1)
        ? (multiPayId || 3)
        : (selectedPaymodeId || (data.payments.length > 0 ? Number((data.payments[0] as any).paymodeId) || 1 : 1));

      const payload: any = {
        seriesId: parseInt(data.series || "") || 0,
        prefix: "",
        supplierId: parseInt(data.supplier || "") || 0,
        paymodeId: finalPaymodeId,
        branchId: parseInt(data.branch || "") || 0,
        employeeId: parseInt(data.salesman || "") || 0,
        dayId: 0,
        shiftId: 0,
        purchaseDate: formatDateOnly(data.purchaseDate),
        invoiceNo: data.invoiceNo,
        invoiceDate: formatDateOnly(data.invoiceDate),
        refNo: data.refNo,
        narration: data.narration,
        discAmount: toNumber(data.discAmount),
        discPer: toNumber(data.globalDiscPercent),
        vatExclAmount: totals.vatExclAmount,
        vatAmount: totals.vatAmount,
        roundOff: toNumber(data.roundOff),
        netAmount: totals.grandTotal,
        details: validItems.map((item) => {
          const l = calculateLine(item as PurchaseInvoiceLineItem, grossTotal, toNumber(data.discAmount));
          const unitCurrentValue = getUnitCurrentValue(item.unit);
          return {
            productId: parseInt(item.product || "") || 0,
            unitId: parseInt(item.unit || "") || 0,
            vatId: item.vatId !== undefined && item.vatId !== "" ? parseInt(item.vatId) : 1,
            qty: toNumber(item.qty),
            foc: toNumber(item.foc),
            price: toNumber(item.price),
            discPer: toNumber(item.discPercent),
            // 14 dp (same values the header totals are summed from)
            discAmount: l.discountAmount,
            vatAmount: l.vatAmount,
            netAmount: l.netAmount,
            baseQty: Number(((toNumber(item.qty) + toNumber(item.foc)) * unitCurrentValue).toFixed(decimalPart)),
          };
        }),
        paymodes: paymodesForSave({ rootPaymodeId: finalPaymodeId, multiPayId, payments: data.payments as never, fallbackPaymodeId: 1, decimalPart }),
      };

      console.log("Purchase Invoice Payload:", JSON.stringify(payload, null, 2));

      if (invoiceId) {
        payload.purchaseId = Number(invoiceId);
        payload.updateAt = new Date().toISOString();
        delete payload.createdAt;
        await purchaseInvoiceApi.updatePurchaseInvoice(invoiceId, payload);
        showToast("Purchase Invoice updated successfully", "success");
      } else {
        payload.createdAt = new Date().toISOString();
        delete payload.updateAt;
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
    handleSupplierCreated,
    handleProductSelect,
    handleUnitChange,
    categoryUnits,
    masterUnits,
    getUnitCurrentValue,
    saving,
  };
};
