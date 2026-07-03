import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCurrency } from "../../../../hooks/useCurrency";
import { createEmptyPurchaseReturnForm } from "../constants";
import { purchaseReturnSchema } from "../types";
import type { PurchaseReturnLineItem } from "../types";
import { purchaseReturnApi } from "../services/purchaseReturnApi";
import type { PurchaseReturnMasterData } from "../services/purchaseReturnApi";
import { productService } from "../../../inventory/product/services/productService";
import { useToast } from "../../../../app/providers/useToast";
import { generateUUID } from "../../../../utils/uuid";


const toNumber = (value: string | number | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateLine = (item: PurchaseReturnLineItem, decimals: number = 3, grossTotal: number = 0, globalDiscAmount: number = 0) => {
  const qty = toNumber(item.qty);
  const price = toNumber(item.price);
  const vatPercent = toNumber(item.vatPercent);

  const amount = qty * price;
  // Pro-rate global discount based on this item's share of the gross total
  const discountAmount = grossTotal > 0 ? (amount / grossTotal) * globalDiscAmount : 0;
  
  const vatAmount = (amount - discountAmount) * (vatPercent / 100);
  const netAmount = amount - discountAmount + vatAmount;

  return {
    amount: Number(amount.toFixed(decimals)),
    discountAmount: Number(discountAmount.toFixed(decimals)),
    vatAmount: Number(vatAmount.toFixed(decimals)),
    netAmount: Number(netAmount.toFixed(decimals))
  };
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
  const [selectedPaymodeId, setSelectedPaymodeId] = useState<number>(0);
  const [saving, setSaving] = useState(false);

  // Search States
  const [productOptions, setProductOptions] = useState<{label: string, value: string, code: string, barcode: string}[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [supplierOptions, setSupplierOptions] = useState<{label: string, value: string}[]>([]);
  const [searchingSuppliers, setSearchingSuppliers] = useState(false);
  const [searchingInvoices, setSearchingInvoices] = useState(false);
  const [categoryUnits, setCategoryUnits] = useState<Record<string, { label: string, value: string, currentValue: number }[]>>({});

  const loadCategoryUnits = useCallback(async (unitCategory: string) => {
    if (!unitCategory) return;
    setCategoryUnits(prev => {
      if (prev[unitCategory]) return prev;
      purchaseReturnApi.getUnitsByCategory(unitCategory).then(res => {
        setCategoryUnits(current => ({
          ...current,
          [unitCategory]: res.map((u: any) => ({ label: u.name, value: String(u.unitId), currentValue: u.currentValue ?? 1 }))
        }));
      }).catch(console.error);
      return prev;
    });
  }, []);

  const [invoiceOptions, setInvoiceOptions] = useState<{label: string, value: string}[]>([]);

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
  const watchedSeries = useWatch({ control, name: "series" });

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
  const grossTotal = useMemo(() => {
    return watchedItems.reduce((acc: number, item: any) => acc + (toNumber(item.qty) * toNumber(item.price)), 0);
  }, [watchedItems]);

  const totals = useMemo(() => {
    const globalDiscAmount = toNumber(watchedDiscAmount);

    const itemTotals = watchedItems.reduce(
      (acc: any, item: any) => {
        const line = calculateLine(item as PurchaseReturnLineItem, decimalPart, grossTotal, globalDiscAmount);
        acc.discountAmount += line.discountAmount;
        acc.vatAmount += line.vatAmount;
        acc.netAmount += line.netAmount;
        return acc;
      },
      { discountAmount: 0, vatAmount: 0, netAmount: 0 }
    );

    const otherCharge = toNumber(watchedOtherCharge);
    const roundOff = toNumber(watchedRoundOff);
    const grandTotal = itemTotals.netAmount + otherCharge + roundOff;

    return {
      discountAmount: Number(itemTotals.discountAmount.toFixed(decimalPart)),
      vatAmount: Number(itemTotals.vatAmount.toFixed(decimalPart)),
      netAmount: Number(itemTotals.netAmount.toFixed(decimalPart)),
      grandTotal: Number(grandTotal.toFixed(decimalPart)),
    };
  }, [watchedDiscAmount, watchedOtherCharge, watchedRoundOff, watchedItems, decimalPart, grossTotal]);

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
      const subTotal = watchedItems.reduce((acc: any, item: any) => acc + calculateLine(item as PurchaseReturnLineItem, decimalPart).netAmount, 0);
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
        const [data, productMaster] = await Promise.all([
          purchaseReturnApi.loadMasterData(),
          productService.loadMasterData().catch(() => null),
        ]);
        if (data) {
          const unitsRes = productMaster?.unit || [];
          const enrichedData = {
            ...data,
            units: unitsRes.map((u: any) => ({ label: u.name || u.unitName, value: String(u.id || u.unitId) })),
          };
          setMasterData(enrichedData as any);
          if (!invoiceId) {
             if (data.series.length > 0) {
                setValue("series", data.series[0].seriesId.toString());
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

  // Dynamically fetch next purchase return number when series changes
  useEffect(() => {
    if (!invoiceId && watchedSeries) {
      const fetchPurchaseReturnNumber = async () => {
        try {
          const res = await purchaseReturnApi.getPurchaseReturnNumber(Number(watchedSeries));
          const selectedSeries = masterData?.series.find(s => s.seriesId.toString() === watchedSeries);
          const prefix = selectedSeries ? selectedSeries.prefix : "";
          setValue("purchaseNo", `${prefix}${res.purchaseReturnNo}`);
        } catch (error) {
          console.error("Failed to load next purchase return number", error);
          // Fallback to startNo if API fails or seriesId has DB errors (like seriesId=3)
          const selectedSeries = masterData?.series.find(s => s.seriesId.toString() === watchedSeries);
          if (selectedSeries) {
            setValue("purchaseNo", `${selectedSeries.prefix}${selectedSeries.startNo}`);
          }
        }
      };
      fetchPurchaseReturnNumber();
    }
  }, [invoiceId, watchedSeries, masterData, setValue]);

  const loadInvoiceData = async (id: string) => {
    try {
      setLoadingMaster(true);
      const res = await purchaseReturnApi.getPurchaseReturnById(id);
      const master = res.masterData;
      setPurchaseId(master.purchaseId || 0);
      const rootPaymodeId = res.masterData.paymodeId || 1;
      
      const formPayload: any = {
        ...initialForm,
        series: master.seriesId?.toString() || "",
        branch: master.branchId?.toString() || "",
        salesman: master.employeeId?.toString() || "",
        supplier: master.supplierId?.toString() || "",
        purchaseNo: master.purchaseReturnNo || "",
        invoiceNo: master.purchaseInvoiceNo || master.invoiceNo || "",
        purchaseDate: master.purchaseReturnDate ? master.purchaseReturnDate.split("T")[0] : "",
        invoiceDate: master.purchaseInvoiceDate ? master.purchaseInvoiceDate.split("T")[0] : (master.invoiceDate ? master.invoiceDate.split("T")[0] : ""),
        refNo: master.refNo || "",
        narration: master.narration || "",
        discAmount: master.discAmount?.toString() || "0",
        globalDiscPercent: master.discPer?.toString() || "0",
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

      // Helper to map a paymodeId to a mode name using master paymodes list
      const paymodeIdToMode = (pid: number): string => {
        const found = masterData?.paymodes?.find((pm: any) => pm.paymodeId === pid);
        if (found) return found.paymodeName.toLowerCase();
        return pid === 1 ? 'cash' : pid === 2 ? 'card' : 'credit';
      };

      if (rootPaymodeId === (multiPayId || 3) && res.paymodesData && res.paymodesData.length > 0) {
        const storedTotal = res.paymodesData.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
        const remainder = Number(((res.masterData.netAmount || 0) - storedTotal).toFixed(decimalPart));

        formPayload.payments = res.paymodesData.map((p: any) => ({
          mode: paymodeIdToMode(p.paymodeId),
          amount: p.amount?.toString() || "0",
          paymodeId: p.paymodeId,
        }));

        if (remainder > 0) {
          formPayload.payments = [
            { mode: 'cash', amount: remainder.toString(), paymodeId: 1 },
            ...formPayload.payments,
          ];
        }
      } else if (res.paymodesData && res.paymodesData.length > 0) {
        formPayload.payments = res.paymodesData.map((p: any) => ({
          mode: paymodeIdToMode(p.paymodeId),
          amount: p.amount?.toString() || "0",
          paymodeId: p.paymodeId,
        }));
      } else if (rootPaymodeId && rootPaymodeId !== (multiPayId || 3)) {
        formPayload.payments = [{
          mode: paymodeIdToMode(rootPaymodeId),
          amount: (res.masterData.netAmount || 0).toString(),
          paymodeId: rootPaymodeId,
        }];
      } else {
        formPayload.payments = [];
      }

      setSelectedPaymodeId(rootPaymodeId || 1);

      reset(formPayload);
      
      // Load product options for the mapped items
      const productIds = Array.from(new Set(mappedItems.map((i: any) => i.product)));
      const options: any[] = [];
      for (const pId of productIds) {
        if (!pId) continue;
        try {
          const pData = await productService.getById(Number(pId));
          if (pData && pData.product) {
            options.push({
              label: pData.product.code ? `[${pData.product.code}] ${pData.product.name}` : pData.product.name,
              value: pData.product.productId.toString(),
              code: pData.product.code || "",
              barcode: pData.product.barcode || ""
            });
          }
        } catch (err) {
          console.error("Failed to load product", err);
        }
      }
      setProductOptions(prev => {
        const newOpts = [...prev];
        options.forEach(o => {
          if (!newOpts.find(n => n.value === o.value)) newOpts.push(o);
        });
        return newOpts;
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

  // Fetch products by branch to allow local combobox search by name and code
  useEffect(() => {
    if (!watchedBranch) return;
    setSearchingProducts(true);
    purchaseReturnApi.searchProductsByName(Number(watchedBranch), "")
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
    if (!query) {
      setInvoiceOptions([]);
      return;
    }
    setSearchingInvoices(true);
    try {
      const results = await purchaseReturnApi.searchPurchaseInvoices(Number(watchedBranch), Number(watchedSupplier), query);
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
      if (res && res.masterData) {
        setPurchaseId(res.masterData.purchaseId || parseInt(purchaseIdStr) || 0);
        setLoadedInvoiceText(invoiceNoText);
        setValue("invoiceDate", res.masterData.invoiceDate ? res.masterData.invoiceDate.split("T")[0] : getValues("invoiceDate"));
        setValue("refNo", res.masterData.refNo || getValues("refNo"));
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
            try {
              const pData = await productService.getById(Number(pId));
              if (pData && pData.product) {
                options.push({
                  label: pData.product.code ? `[${pData.product.code}] ${pData.product.name}` : pData.product.name,
                  value: pData.product.productId.toString(),
                  code: pData.product.code || "",
                  barcode: pData.product.barcode || ""
                });
              }
            } catch (err) {
              console.error("Failed to load product", err);
            }
        }
        setProductOptions(prev => {
          const newOpts = [...prev];
          options.forEach(o => {
            if (!newOpts.find(n => n.value === o.value)) newOpts.push(o);
          });
          return newOpts;
        });
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
      setValue(`items.${index}.unitCategory`, details.unitCategory || "");
      setValue(`items.${index}.unit`, details.baseUnitId.toString());
      setValue(`items.${index}.price`, formatAmount(details.cost));
      setValue(`items.${index}.vatId`, details.vatId?.toString() || "0");
      setValue(`items.${index}.vatPercent`, details.vatValue.toString());
      if (currentQty === "0" || currentQty === "") {
         setValue(`items.${index}.qty`, "1");
      }
      if (details.unitCategory) {
        loadCategoryUnits(details.unitCategory);
      }
    } catch (error) {
      console.error("Failed to load product details", error);
    }
  };

  // When user changes unit on a line — fetch updated cost for that product+unit combination
  const handleUnitChange = useCallback(async (index: number, unitId: string) => {
    setValue(`items.${index}.unit`, unitId);
    const productId = methods.getValues(`items.${index}.product`);
    if (!productId || !unitId) return;
    try {
      const result = await purchaseReturnApi.getUnitCost(Number(productId), Number(unitId));
      if (result.cost !== undefined && result.cost !== null) {
        setValue(`items.${index}.price`, formatAmount(result.cost));
      }
    } catch (error) {
      console.error("Failed to fetch unit cost", error);
    }
  }, [methods, setValue, formatAmount]);

  const handleBarcodeScan = useCallback(async (index: number, barcode: string) => {
    try {
      const details = await purchaseReturnApi.getProductCostData(barcode).catch(() => null);
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
        const currentQty = getValues(`items.${index}.qty`);
        if (currentQty === "0" || currentQty === "") {
           setValue(`items.${index}.qty`, "1");
        }
        if (details.unitCategory) {
          loadCategoryUnits(details.unitCategory);
        }
        return true;
      }
    } catch (e) {
      console.error("Instant barcode lookup failed", e);
    }
    return false;
  }, [setValue, getValues, loadCategoryUnits]);

  const handleReset = () => {
    reset(initialForm);
    setShowClearConfirm(false);
    setSelectedPaymodeId(0);
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
  // Set a single paymode as the full payment — no modal needed
  const handleSinglePayment = useCallback((paymodeId: number, paymodeName: string, grandTotal: number) => {
    setPayments([{
      mode: paymodeName.toLowerCase(),
      amount: grandTotal.toFixed(decimalPart),
      paymodeId,
    } as any]);
    setSelectedPaymodeId(paymodeId);
  }, [setPayments, decimalPart]);

  const onSubmit = async (data: any): Promise<boolean> => {
    const validItems = data.items.filter((i: any) => i.product && i.product.trim() !== "");
    
    if (validItems.length === 0) {
      showToast("Please add at least one item", "warning");
      return false;
    }
    
    if (totals.grandTotal <= 0) {
      showToast("Transaction amount cannot be zero or negative", "warning");
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
        paymodeId: watchedPayments.length > 1 ? (multiPayId || 3) : (watchedPayments.length > 0 ? (watchedPayments[0].paymodeId || 1) : 1),
        branchId: parseInt(data.branch) || 0,
        employeeId: parseInt(data.salesman) || 0,
        dayId: 0,
        shiftId: 0,
        purchaseReturnDate: new Date(data.purchaseDate).toISOString(),
        purchaseId: purchaseId || 0,
        refNo: data.refNo || "",
        narration: data.narration || "",
        discAmount: toNumber(data.discAmount),
        discPer: toNumber(data.globalDiscPercent),
        vatExclAmount: Number((totals.netAmount - totals.vatAmount).toFixed(decimalPart)),
        vatAmount: Number(totals.vatAmount.toFixed(decimalPart)),
        netAmount: Number(totals.grandTotal.toFixed(decimalPart)),
        createdAt: new Date().toISOString(),
        details: validItems.map((item: any) => {
          const l = calculateLine(item as PurchaseReturnLineItem, decimalPart, grossTotal, toNumber(data.discAmount));
          // Find the unit's currentValue from loaded categoryUnits
          const unitCurrentValue = (() => {
            for (const units of Object.values(categoryUnits)) {
              const found = units.find(u => u.value === item.unit);
              if (found) return found.currentValue;
            }
            return 1; // default to 1 (base unit)
          })();
          return {
            productId: parseInt(item.product) || 0,
            unitId: parseInt(item.unit) || 0,
            vatId: parseInt(item.vatId) || 1,
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
          if (watchedPayments.length <= 1) return [];
          // Deduplicate by paymodeId — sum amounts if same paymodeId appears more than once
          const map = new Map<number, number>();
          for (const p of watchedPayments as any[]) {
            const pid = p.paymodeId || 1;
            map.set(pid, (map.get(pid) || 0) + toNumber(p.amount));
          }
          return Array.from(map.entries()).map(([paymodeId, amount]) => ({ paymodeId, amount }));
        })(),
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

  const handleSettlementSubmit = (newPayments: { mode: string; paymodeId: number; amount: number }[]) => {
    setPayments(newPayments.map(p => ({ mode: p.mode as any, amount: p.amount.toString(), paymodeId: p.paymodeId })));
    setSelectedPaymodeId(multiPayId || 3);
    setIsMultiPayOpen(false);
  };

  return {
    methods,
    items,
    append,
    remove,
    setPayments,
    categoryUnits,
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
    selectedPaymodeId,
    setSelectedPaymodeId,
    handleSinglePayment,
    masterData,
    loadingMaster,
    masterError,
    multiPayId,
    paymodeList,
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
    invoiceOptions,
    searchingInvoices,
    handleInvoiceSearch,
    handleInvoiceSelect,
    handleProductSelect,
    handleUnitChange,
    saving,
    purchaseId,
  };
};
