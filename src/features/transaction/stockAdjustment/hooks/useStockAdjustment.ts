import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { stockAdjustmentApi } from "../services/stockAdjustmentApi";
import { stockAdjustmentTypeApi } from "../../../inventory/stockAdjustmentType/services/stockAdjustmentTypeApi";
import { createEmptyStockAdjustmentForm } from "../constants";
import { stockAdjustmentSchema } from "../types";
import type { StockAdjustmentForm, StockAdjustmentLineItem, StockAdjustmentPayload } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useToast } from "../../../../app/providers/useToast";
import type { SearchableOption } from "../../../../components/common/Searchableselect";
import { generateUUID } from "../../../../utils/uuid";

const toNumber = (value: string | number | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateLine = (item: StockAdjustmentLineItem) => {
  const qty = toNumber(item.qty);
  const cost = toNumber(item.cost);
  const amount = qty * cost;
  return { amount };
};

export const useStockAdjustment = (id?: string | null) => {
  const { formatAmount } = useCurrency();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);

  // Product Search State
  const [productOptions, setProductOptions] = useState<SearchableOption[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

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
    defaultValues: initialForm,
  });

  const { control, setValue, reset, getValues } = methods;

  const { fields: items, append, remove } = useFieldArray({
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

  // 1. React Query: Fetch Branches
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const bl = await stockAdjustmentApi.getBranchList();
      return bl.map((b: any) => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

  // 2. React Query: Fetch Stock Adjustment Types
  const { data: typesData = { options: [], raw: [] }, isLoading: loadingTypes } = useQuery({
    queryKey: ["stockAdjustmentTypes"],
    queryFn: async () => {
      try {
        const [typeRes, unitRes] = await Promise.all([
          stockAdjustmentTypeApi.getAll(),
          stockAdjustmentApi.getUnitList("Quantity").catch(() => []),
        ]);
        return {
          options: typeRes.map((t: any) => ({ label: t.typeName, value: String(t.typeId) })),
          raw: typeRes,
          units: unitRes.map((u: any) => ({ label: u.name || u.unitName, value: String(u.unitId) })),
        };
      } catch (err: any) {
        showToast("Error loading Types: " + (err.message || "Unknown error"), "error");
        return { options: [], raw: [] };
      }
    }
  });

  // 3. React Query: Fetch Employees & Reference Number (dependent on Branch selection)
  const { data: branchData = { employees: [], refNo: "" }, isLoading: loadingBranchDetails } = useQuery({
    queryKey: ["branchData", watchedBranch],
    queryFn: async () => {
      if (!watchedBranch) return { employees: [], refNo: "" };
      const branchId = parseInt(watchedBranch, 10);
      const [empRes, refRes] = await Promise.all([
        stockAdjustmentApi.getEmployeeList(branchId),
        stockAdjustmentApi.getRefNumber(branchId)
      ]);
      return {
        employees: empRes.map((e: any) => ({ label: e.empName, value: String(e.empId) })),
        refNo: String(refRes.refNo)
      };
    },
    enabled: !!watchedBranch,
  });

  // 4. React Query: Load existing record (Edit Mode)
  const { isLoading: loadingRecord } = useQuery({
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
        date: master.transDate ? master.transDate.split("T")[0] : new Date().toISOString().split("T")[0],
        branch: String(master.branchId || ""),
        salesman: String(master.employeeId || ""),
      };

      if (details.length > 0) {
        const mappedItems: StockAdjustmentLineItem[] = details.map((d: any) => ({
          id: generateUUID(),
          productId: d.productId,
          product: String(d.productId),
          code: d.barcode || d.productCode || "",
          unitId: d.unitId,
          unit: d.unitName || String(d.unitId || ""),
          qty: String(d.qty || "1"),
          cost: formatAmount(d.cost || d.price || 0),
          type: String(d.typeId || ""),
          typeId: d.typeId || 0,
          typeName: d.typeName || "",
          effect: d.effect || "",
        }));
        formPayload.items = mappedItems;
      } else {
        formPayload.items = [];
      }

      reset(formPayload);

      // Pre-populate product options for existing items
      const productIds = Array.from(new Set(details.map((i: any) => i.productId)));
      const options: SearchableOption[] = [];
      for (const pId of productIds) {
        if (!pId) continue;
        const searchRes = await stockAdjustmentApi.getProductListByName("");
        const pData = searchRes.find(r => r.productId === pId);
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
      return responseData;
    },
    enabled: !!id,
  });

  // Pre-select first branch when branches finish loading (Add Mode)
  useEffect(() => {
    if (!id && branches.length > 0 && !getValues("branch")) {
      setValue("branch", branches[0].value);
    }
  }, [branches, id, setValue, getValues]);

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

  // 5. Product Search with Barcode Fallback and deduplication
  const handleProductSearch = useCallback(async (query: string) => {
    if (!query) {
      setProductOptions([]);
      return;
    }
    setSearchingProducts(true);
    try {
      const results = await stockAdjustmentApi.getProductListByName(query);
      let mapped = results.map((r) => ({
        label: r.productName,
        value: r.productId.toString(),
        code: r.code || "",
        barcode: r.barcode || "",
      }));

      // Fallback to barcode search
      if (mapped.length === 0) {
        try {
          const detail = await stockAdjustmentApi.getPurchaseCostData(query).catch(() => null);
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
      mapped = mapped.filter(item => {
        if (seenIds.has(item.value)) return false;
        seenIds.add(item.value);
        return true;
      });

      setProductOptions(mapped);
    } catch (error) {
      console.error("Failed to search products", error);
    } finally {
      setSearchingProducts(false);
    }
  }, []);

  // 6. Select details from product
  const handleProductSelect = async (index: number, _val: string, barcode: string) => {
    if (!barcode) return;
    try {
      const details = await stockAdjustmentApi.getPurchaseCostData(barcode);
      setValue(`items.${index}.unitId`, details.baseUnitId);
      setValue(`items.${index}.unit`, String(details.baseUnitId));
      setValue(`items.${index}.cost`, formatAmount(details.cost));
    } catch (error) {
      console.error("Failed to load product details", error);
    }
  };

  const handleBarcodeScan = useCallback(async (index: number, barcode: string) => {
    try {
      const details = await stockAdjustmentApi.getPurchaseCostData(barcode).catch(() => null);
      if (details) {
        setProductOptions(prev => {
          if (prev.find(o => o.value === String(details.productId))) return prev;
          return [...prev, { label: details.productName, value: String(details.productId), code: details.productCode || "", barcode }];
        });
        setValue(`items.${index}.product`, String(details.productId));
        setValue(`items.${index}.code`, details.productCode || "");
        setValue(`items.${index}.unitId`, details.baseUnitId);
        setValue(`items.${index}.unit`, String(details.baseUnitId));
        setValue(`items.${index}.cost`, formatAmount(details.cost));
        return true;
      }
    } catch (e) {
      console.error("Instant barcode lookup failed", e);
    }
    return false;
  }, [setValue]);

  const handleTypeSelect = (index: number, typeIdStr: string) => {
    const t = typesData.raw.find((t: any) => String(t.typeId) === typeIdStr);
    if (t) {
      setValue(`items.${index}.effect`, t.effect || "");
      setValue(`items.${index}.typeId`, t.typeId);
      setValue(`items.${index}.typeName`, t.typeName);
    }
  };

  const handleReset = () => {
    reset(initialForm);
  };

  // Submit / Save handler
  const onSubmit = async (data: StockAdjustmentForm): Promise<boolean> => {
    const validItems = data.items.filter(item => item.product && item.product.trim() !== "");
    if (validItems.length === 0) {
      showToast("Please add at least one product.", "warning");
      return false;
    }

    setSaving(true);
    try {
      const netAmount = validItems.reduce((acc, item) => {
        const line = calculateLine(item as StockAdjustmentLineItem);
        const effect = item.effect === "-" ? -1 : 1;
        return acc + (line.amount * effect);
      }, 0);

      const payload: StockAdjustmentPayload = {
        transDate: data.date,
        branchId: parseInt(data.branch, 10),
        employeeId: parseInt(data.salesman || "", 10) || 0,
        netAmount,
        narration: data.series || "",
        createdAt: new Date().toISOString(),
        details: validItems.map(item => ({
          productId: parseInt(item.product, 10) || 0,
          unitId: item.unitId || parseInt(item.unit || "1", 10) || 1,
          qty: toNumber(item.qty),
          price: toNumber(item.cost),
          amount: toNumber(item.qty) * toNumber(item.cost),
          baseQty: toNumber(item.qty),
          typeId: item.typeId || parseInt(item.type, 10) || 0,
          effect: item.effect || "+",
        }))
      };

      if (id) {
        await stockAdjustmentApi.updateStockAdjustment(Number(id), payload);
        showToast("Stock adjustment updated successfully", "success");
      } else {
        await stockAdjustmentApi.createStockAdjustment(payload);
        showToast("Stock adjustment saved successfully", "success");
      }

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
    watchedItems,
    totals,
    handleReset,
    onSubmit,
    masterData: { branches, employees: branchData.employees, types: typesData.options, units: typesData.units || [] },
    loadingMaster,
    masterError: null, // React Query handles separate error states or transparent fallback
    productOptions,
    searchingProducts,
    handleProductSearch,
    handleBarcodeScan,
    handleProductSelect,
    handleTypeSelect,
    saving,
  };
};
