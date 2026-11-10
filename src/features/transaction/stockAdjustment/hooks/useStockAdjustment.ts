import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { stockAdjustmentApi, formatDateOnly } from "../services/stockAdjustmentApi";
import { stockAdjustmentTypeApi } from "../../../inventory/stockAdjustmentType/services/stockAdjustmentTypeApi";
import { productService } from "../../../inventory/product/services/productService";
import { createEmptyStockAdjustmentForm } from "../constants";
import { stockAdjustmentSchema } from "../types";
import type { 
  StockAdjustmentForm, 
  StockAdjustmentLineItem, 
  StockAdjustmentCreatePayload,
  StockAdjustmentUpdatePayload 
} from "../types";

export { formatDateOnly };
import { useCurrency } from "../../../../hooks/useCurrency";
import { useToast } from "../../../../app/providers/useToast";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import type { SearchableOption } from "../../../../components/common/Searchableselect";
import { generateUUID } from "../../../../utils/uuid";
import { subscribeToEmployeeUpdates } from "../../../general/employee/utils/employeeSync";
import { getEmployeeNames } from "../../../general/employee/services/employeeService";
import { stockLineAmount, stockBaseQty, stockNetAmount } from "../../shared/stockCalc";
import { firstRealBranch, useStockBranches } from "../../shared/useStockBranches";
import { useCategoryUnits, useClosingStock, useStockUnitChange } from "../../shared/useStockLineUnits";
import { searchStockProducts, toProductOption, uniqueProductOptions, useStockBarcodeScan, withStoredProduct } from "../../shared/stockProductLookup";
import { getLineUnitValue, type RawUnit } from "../../shared/lineUnits";

const toNumber = (value: string | number | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateLine = (item: StockAdjustmentLineItem) => {
  const qty = toNumber(item.qty);
  const cost = toNumber(item.cost);
  const amount = stockLineAmount(qty, cost);
  return { amount };
};

/** One shared array: a new [] on every render made the reset effect below loop until the products arrived. */
const NO_PRODUCTS: SearchableOption[] = [];

export const useStockAdjustment = (id?: string | null) => {
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);

  const { categoryUnits, loadCategoryUnits } = useCategoryUnits(stockAdjustmentApi.getUnitList);

  // Product Search State
  const [productOptions, setProductOptions] = useState<SearchableOption[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const defaultProductOptionsRef = useRef<SearchableOption[]>([]);

  const initialForm = useMemo(() => {
    const empty = createEmptyStockAdjustmentForm();
    empty.items = [{
      id: generateUUID(),
      product: "",
      code: "",
      unit: "",
      qty: "1",
      cost: "0",
      type: "",
      effect: "",
    }];
    return empty;
  }, []);

  const methods = useForm<any>({
    resolver: zodResolver(stockAdjustmentSchema),
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: initialForm,
  });

  const { control, setValue, reset, getValues } = methods;

  const { fields: items, append, remove, update } = useFieldArray({
    control,
    name: "items",
  });

  // Watchers
  const watchedItems = useWatch({ control, name: "items" }) || [];
  const watchedBranch = useWatch({ control, name: "branch" });

  // Calculate totals
  const totals = useMemo(() => {
    const grandTotal = watchedItems.reduce((acc: number, item: any) => {
      const line = calculateLine(item as StockAdjustmentLineItem);
      const effect = item.effect === "-" ? -1 : 1;
      return acc + (line.amount * effect);
    }, 0);

    return {
      grandTotal,
    };
  }, [watchedItems]);

  const { branches: resolvedBranches, loadingBranches } = useStockBranches({
    queryPrefix: "stockAdjustment",
    getBranchList: stockAdjustmentApi.getBranchList,
  });

  // 2. React Query: Fetch Stock Adjustment Types
  const { data: typesData = { options: [], raw: [] }, isLoading: loadingTypes } = useQuery({
    queryKey: ["stockAdjustmentTypes"],
    queryFn: async () => {
      try {
        const [typeRes, productMaster] = await Promise.all([
          stockAdjustmentTypeApi.getAll(),
          productService.loadMasterData().catch(() => null),
        ]);
        const unitsRes = productMaster?.unit || [];
        return {
          options: typeRes.map((t: any) => ({ label: t.typeName, value: String(t.typeId) })),
          raw: typeRes,
          units: unitsRes.map((u: RawUnit) => ({
            label: u.name || u.unitName || "",
            value: String(u.id || u.unitId),
            currentValue: Number(u.currentValue ?? u.currentvalue ?? 1),
            category: u.category,
          })),
        };
      } catch (err: any) {
        showToast("Error loading Types: " + (err.message || "Unknown error"), "error");
        return { options: [], raw: [] };
      }
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  // 3. React Query: Fetch Employees & Reference Number (dependent on Branch selection)
  const { data: branchData = { employees: [], refNo: "" }, isLoading: loadingBranchDetails, refetch: refetchBranchData } = useQuery({
    queryKey: ["branchData", watchedBranch],
    queryFn: async () => {
      if (!watchedBranch) return { employees: [], refNo: "" };
      const branchId = parseInt(watchedBranch, 10);
      const [empRes, empNamesRes, refRes] = await Promise.allSettled([
        stockAdjustmentApi.getEmployeeList(branchId),
        getEmployeeNames(branchId),
        stockAdjustmentApi.getRefNumber(branchId)
      ]);

      const empMap = new Map<string, string>();
      if (empRes.status === "fulfilled" && Array.isArray(empRes.value)) {
        empRes.value.forEach((e: any) => {
          const id = String(e.empId ?? e.id ?? "");
          const name = String(e.empName ?? e.name ?? "");
          if (id && id !== "0" && name) {
            empMap.set(id, name);
          }
        });
      }
      if (empNamesRes.status === "fulfilled" && Array.isArray(empNamesRes.value)) {
        empNamesRes.value.forEach((e: any) => {
          const id = String(e.empId ?? e.id ?? "");
          const name = String(e.empName ?? e.name ?? "");
          if (id && id !== "0" && name && !empMap.has(id)) {
            empMap.set(id, name);
          }
        });
      }

      const rawRef = refRes.status === "fulfilled" ? refRes.value : null;
      const refNoStr = rawRef && typeof rawRef === "object"
        ? String(rawRef.refNo ?? (rawRef as any).data?.refNo ?? "")
        : rawRef !== null && rawRef !== undefined ? String(rawRef) : "";

      return {
        employees: Array.from(empMap.entries()).map(([value, label]) => ({ label, value })),
        refNo: refNoStr
      };
    },
    enabled: !!watchedBranch,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Always refresh cached branchData (refNo + employees) on Add-mode mount so newly created salesmen are always fresh
  useEffect(() => {
    if (!id) {
      void queryClient.invalidateQueries({ queryKey: ["branchData"], refetchType: "all" });
      if (watchedBranch) {
        void refetchBranchData();
      }
    }
  }, [id, queryClient, watchedBranch, refetchBranchData]);

  // Cross-tab and local real-time listener for employee updates
  // Real-time synchronization for branch-specific data on employee updates
  useEffect(() => {
    return subscribeToEmployeeUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["branchData"], refetchType: "all" });
      void refetchBranchData();
    });
  }, [queryClient, refetchBranchData]);

  // 3a. React Query: Fetch Initial Default Products
  const { data: defaultProductList = NO_PRODUCTS } = useQuery({
    queryKey: ["stockAdjustmentDefaultProducts"],
    queryFn: async () => {
      try {
        const results = await stockAdjustmentApi.getProductListByName("");
        if (Array.isArray(results) && results.length > 0) {
          return uniqueProductOptions(results.map(toProductOption));
        }
        return [];
      } catch (err) {
        console.error("Failed to load initial stock adjustment products", err);
        return [];
      }
    },
    staleTime: 60 * 1000,
    refetchOnMount: true,
  });

  useEffect(() => {
    if (defaultProductList && defaultProductList.length > 0) {
      defaultProductOptionsRef.current = defaultProductList;
      setProductOptions(prev => {
        if (prev.length === 0) {
          return defaultProductList;
        }
        return prev;
      });
    }
  }, [defaultProductList]);

  // 4. React Query: Load existing record (Edit Mode)
  const { data: recordData, isLoading: loadingRecord } = useQuery({
    queryKey: ["stockAdjustmentRecord", id],
    queryFn: async () => {
      if (!id) return null;
      const transId = parseInt(id, 10);
      const responseData = await stockAdjustmentApi.getStockAdjustmentById(transId);
      
      const master = responseData.masterData || responseData;
      const details = responseData.detailsData || responseData.details || [];
      
      const formPayload: any = {
        series: master.narration || master.series || master.seriesName || "",
        refNo: String(master.refNo || transId || ""),
        date: master.transDate ? formatDateOnly(master.transDate) : formatDateOnly(new Date()),
        branch: String(master.branchId || ""),
        salesman: String(master.employeeId || ""),
        narration: master.narration || master.series || "",
      };

      if (details.length > 0) {
        const mappedItems: StockAdjustmentLineItem[] = [];
        for (const d of details) {
          const barcode = d.barcode || d.productCode || "";
          let unitCategory = "";
          if (barcode) {
            try {
              const costData = await stockAdjustmentApi.getPurchaseCostData(barcode);
              unitCategory = costData.unitCategory || "";
              if (unitCategory) {
                await loadCategoryUnits(unitCategory);
              }
            } catch (e) {
              console.error("Failed to fetch product cost data for detail item", d, e);
            }
          }
          mappedItems.push({
            id: generateUUID(),
            product: String(d.productId),
            code: d.barcode || d.productCode || "",
            unitId: d.unitId,
            unit: String(d.unitId || ""),
            unitCategory,
            qty: String(d.qty || "1"),
            cost: formatAmount(d.cost || d.price || 0),
            type: String(d.typeId || ""),
            typeId: d.typeId || 0,
            typeName: d.typeName || "",
            effect: d.effect || "",
          });
        }
        formPayload.items = mappedItems;
      } else {
        formPayload.items = [];
      }

      // Pre-populate product options for existing items
      const productIds = Array.from(new Set(details.map((i: any) => i.productId)));
      const options: SearchableOption[] = [];
      for (const pId of productIds) {
        if (!pId) continue;
        const searchRes = await stockAdjustmentApi.getProductListByName("");
        const pData = searchRes.find(r => r.productId === pId);
        if (pData) {
          options.push({
            label: pData.code ? `[${pData.code}] ${pData.productName}` : pData.productName,
            value: pData.productId.toString(),
            code: pData.code || "",
            barcode: pData.barcode || ""
          });
        }
      }

      // Pre-fetch employee name if needed
      const branchIdForEmp = master.branchId;
      let employeeName = master.employeeName || master.empName || master.salesmanName || master.salesman || "";
      if (branchIdForEmp && master.employeeId && !employeeName) {
        try {
          const empList = await stockAdjustmentApi.getEmployeeList(Number(branchIdForEmp)).catch(() => []);
          const foundEmp = empList.find((e) => String(e.empId) === String(master.employeeId));
          if (foundEmp) {
            employeeName = foundEmp.empName || "";
          }
        } catch (e) {
          console.error("Failed to fetch employee name for stock adjustment", e);
        }
      }

      return { rawData: responseData, formPayload, productOptions: options, employeeName };
    },
    enabled: !!id,
  });

  // Apply fetched record data to form
  useEffect(() => {
    if (id && recordData) {
      reset(recordData.formPayload);
      setProductOptions(recordData.productOptions);
    } else if (!id) {
      reset(initialForm);
      setProductOptions(defaultProductOptionsRef.current.length > 0 ? defaultProductOptionsRef.current : defaultProductList);
    }
  }, [id, recordData, reset, initialForm, defaultProductList]);

  const defaultBranch = useMemo(
    () => resolvedBranches.find(b => b.label.toLowerCase() === "branch 1") ?? firstRealBranch(resolvedBranches),
    [resolvedBranches]
  );

  // Pre-select first branch when branches finish loading (Add Mode)
  useEffect(() => {
    if (!id && resolvedBranches.length > 0 && !getValues("branch")) {
      if (isBranchLocked && initialBranchId) {
        setValue("branch", String(initialBranchId));
      } else if (defaultBranch) {
        setValue("branch", defaultBranch.value);
      }
    }
  }, [resolvedBranches, defaultBranch, id, setValue, getValues, isBranchLocked, initialBranchId]);

  // Set refNo and salesman when branch details finish loading (Add Mode)
  useEffect(() => {
    if (!id && branchData.refNo) {
      setValue("refNo", branchData.refNo);
    }
    if (!id && branchData.employees.length > 0 && !getValues("salesman")) {
      setValue("salesman", branchData.employees[0].value);
    }
  }, [branchData, id, setValue, getValues]);

  // Combined loading state
  const loadingMaster = loadingBranches || loadingTypes || loadingBranchDetails || loadingRecord;

  // Merge branch employees with the saved record's salesman if not present (e.g. branch closed)
  const employees = useMemo(() => {
    const list = [...branchData.employees];
    if (id && recordData) {
      const master = (recordData.rawData as any).masterData || recordData.rawData;
      const empId = String(master.employeeId || master.empId || "");
      const empName = (recordData as any).employeeName || master.employeeName || master.empName || master.salesmanName || master.salesman || "";
      if (empId) {
        const existing = list.find(e => e.value === empId);
        if (!existing) {
          list.push({
            label: empName || `[${empId}] Unknown`,
            value: empId
          });
        } else if (empName && (existing.label.includes("Unknown") || existing.label === empId)) {
          existing.label = empName;
        }
      }
    }
    return list;
  }, [branchData.employees, id, recordData]);

  // Build per-row options: always include the stored product label so the
  // combobox can display the name even before/after a barcode scan
  const getRowOptions = useCallback((index: number) => {
    const baseOptions = productOptions.length > 0 ? productOptions : defaultProductOptionsRef.current;
    return withStoredProduct(baseOptions, watchedItems[index]);
  }, [productOptions, watchedItems]);

  // 5. Product Search with Barcode Fallback and deduplication
  const handleProductSearch = useCallback(async (query: string) => {
    const trimmed = (query || "").trim();
    if (!trimmed) {
      if (defaultProductOptionsRef.current.length > 0) {
        setProductOptions(defaultProductOptionsRef.current);
        return;
      }
    }
    setSearchingProducts(true);
    try {
      const mapped = await searchStockProducts(stockAdjustmentApi, trimmed);

      if (!trimmed && defaultProductOptionsRef.current.length === 0 && mapped.length > 0) {
        defaultProductOptionsRef.current = mapped;
      }

      setProductOptions(mapped);
    } catch (error) {
      console.error("Failed to search products", error);
    } finally {
      setSearchingProducts(false);
    }
  }, []);

  const loadStock = useClosingStock("branch", getValues, setValue);

  // 6. Select details from product
  const handleProductSelect = async (index: number, val: string, barcode: string) => {
    setValue(`items.${index}.product`, val);
    if (!barcode) return;
    try {
      setValue(`items.${index}.stock`, "...");
      const details = await stockAdjustmentApi.getPurchaseCostData(barcode);
      setValue(`items.${index}.unitCategory`, details.unitCategory || "");
      setValue(`items.${index}.unitId`, details.baseUnitId);
      setValue(`items.${index}.unit`, String(details.baseUnitId));
      setValue(`items.${index}.cost`, formatAmount(details.cost));
      if (details.unitCategory) {
        loadCategoryUnits(details.unitCategory);
      }
      loadStock(index, Number(val));
    } catch (error) {
      console.error("Failed to load product details", error);
      setValue(`items.${index}.stock`, "Error");
    }
  };

  const handleBarcodeScan = useStockBarcodeScan({ api: stockAdjustmentApi, setValue, setProductOptions, loadCategoryUnits, formatAmount, loadStock });

  const handleTypeSelect = (index: number, typeIdStr: string) => {
    const t = typesData.raw.find((t: any) => String(t.typeId) === typeIdStr);
    if (t) {
      // Default to '+' for types with 'All' effect, allowing user interaction in the dropdown
      const effectVal = (t.effect === "All" || t.effect === "all" || t.effect === "*") ? "+" : (t.effect || "");
      setValue(`items.${index}.effect`, effectVal);
      setValue(`items.${index}.typeId`, t.typeId);
      setValue(`items.${index}.typeName`, t.typeName);
    }
  };

  const handleUnitChange = useStockUnitChange({ getUnitCost: stockAdjustmentApi.getUnitCost, getValues, setValue, formatAmount, showToast, loadStock });

  const handleReset = useCallback(() => {
    if (id && recordData) {
      reset(recordData.formPayload);
      setProductOptions(recordData.productOptions);
    } else {
      const resetForm = { ...initialForm };
      if (isBranchLocked && initialBranchId) {
        resetForm.branch = String(initialBranchId);
      } else if (defaultBranch) {
        resetForm.branch = defaultBranch.value;
      }
      if (branchData.refNo) resetForm.refNo = branchData.refNo;
      if (branchData.employees.length > 0) resetForm.salesman = branchData.employees[0].value;
      
      reset(resetForm);
      setProductOptions([]);
    }
  }, [id, recordData, reset, initialForm, isBranchLocked, initialBranchId, defaultBranch, branchData]);

  // Submit / Save handler
  const onSubmit = async (data: StockAdjustmentForm): Promise<boolean> => {
    const validItems = data.items.filter(item => item.product && item.product.trim() !== "");
    if (validItems.length === 0) {
      showToast("Please add at least one product.", "warning");
      return false;
    }

    setSaving(true);
    try {
      const netAmount = stockNetAmount(validItems.map((item) => ({
        amount: calculateLine(item as StockAdjustmentLineItem).amount,
        sign: item.effect === "-" ? -1 : 1,
      })));

      const vDate = formatDateOnly(data.date);
      const detailsPayload = validItems.map(item => {
        const unitId = item.unitId || parseInt(item.unit || "1", 10) || 1;
        const unitCurrentValue = getLineUnitValue(unitId, categoryUnits, typesData.units);
        return {
          productId: parseInt(item.product, 10) || 0,
          unitId,
          qty: toNumber(item.qty),
          price: toNumber(item.cost),
          amount: stockLineAmount(item.qty, item.cost),
          baseQty: stockBaseQty(item.qty, unitCurrentValue),
          typeId: item.typeId || parseInt(item.type, 10) || 0,
          effect: item.effect || "+",
        };
      });

      if (id) {
        const updatePayload: StockAdjustmentUpdatePayload = {
          transId: Number(id),
          transDate: vDate,
          branchId: parseInt(data.branch, 10),
          employeeId: parseInt(data.salesman || "", 10) || 0,
          netAmount,
          narration: data.narration || data.series || "",
          updatedAt: new Date().toISOString(),
          details: detailsPayload,
        };
        console.log("Saving Stock Adjustment update payload:", JSON.stringify(updatePayload, null, 2));
        await stockAdjustmentApi.updateStockAdjustment(Number(id), updatePayload);
        showToast("Stock adjustment updated successfully", "success");
      } else {
        const createPayload: StockAdjustmentCreatePayload = {
          transDate: vDate,
          branchId: parseInt(data.branch, 10),
          employeeId: parseInt(data.salesman || "", 10) || 0,
          netAmount,
          narration: data.narration || data.series || "",
          createdAt: new Date().toISOString(),
          details: detailsPayload,
        };
        console.log("Saving Stock Adjustment create payload:", JSON.stringify(createPayload, null, 2));
        await stockAdjustmentApi.createStockAdjustment(createPayload);
        showToast("Stock adjustment saved successfully", "success");
      }

      queryClient.invalidateQueries({ queryKey: ["stockAdjustmentList"] });
      queryClient.invalidateQueries({ queryKey: ["branchData"] });
      queryClient.invalidateQueries({ queryKey: ["productWiseStockAdjustmentReport"] });
      queryClient.invalidateQueries({ queryKey: ["stockAdjustmentReport"] });
      queryClient.invalidateQueries({ queryKey: ["productTransactionLogReport"] });
      queryClient.invalidateQueries({ queryKey: ["stockRegisterReport"] });
      queryClient.invalidateQueries({ queryKey: ["productClosingStock"] });
      return true;
    } catch (err: any) {
      console.error("Save error:", err);
      const errMsg = err.response?.data?.message || err.message || "Failed to save stock adjustment";
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
    watchedItems,
    totals,
    handleReset,
    onSubmit,
    masterData: { branches: resolvedBranches, employees, types: typesData.options, typesRaw: typesData.raw, units: typesData.units || [] },
    loadingMaster,
    masterError: null, // React Query handles separate error states or transparent fallback
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
  };
};
