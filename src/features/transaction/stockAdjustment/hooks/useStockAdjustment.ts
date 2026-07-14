import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { stockAdjustmentApi } from "../services/stockAdjustmentApi";
import { stockAdjustmentTypeApi } from "../../../inventory/stockAdjustmentType/services/stockAdjustmentTypeApi";
import { productService } from "../../../inventory/product/services/productService";
import { createEmptyStockAdjustmentForm } from "../constants";
import { stockAdjustmentSchema } from "../types";
import type { StockAdjustmentForm, StockAdjustmentLineItem, StockAdjustmentPayload } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useToast } from "../../../../app/providers/useToast";
import { useBranchScope } from "../../../../hooks/useBranchScope";
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
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [categoryUnits, setCategoryUnits] = useState<Record<string, { label: string, value: string }[]>>({});

  const loadCategoryUnits = useCallback(async (unitCategory: string) => {
    if (!unitCategory) return;
    setCategoryUnits(prev => {
      if (prev[unitCategory]) return prev;
      stockAdjustmentApi.getUnitList(unitCategory).then(res => {
        setCategoryUnits(current => ({
          ...current,
          [unitCategory]: res.map((u: any) => ({ label: u.name || u.unitName, value: String(u.unitId) }))
        }));
      }).catch(err => {
        console.error("Failed to load units for category", unitCategory, err);
      });
      return prev;
    });
  }, []);

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
        const [typeRes, productMaster] = await Promise.all([
          stockAdjustmentTypeApi.getAll(),
          productService.loadMasterData().catch(() => null),
        ]);
        const unitsRes = productMaster?.unit || [];
        return {
          options: typeRes.map((t: any) => ({ label: t.typeName, value: String(t.typeId) })),
          raw: typeRes,
          units: unitsRes.map((u: any) => ({ label: u.name || u.unitName || "", value: String(u.id || u.unitId) })),
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
            label: pData.code ? `[${pData.code}] ${pData.productName}` : pData.productName,
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
      if (isBranchLocked && initialBranchId) {
        setValue("branch", String(initialBranchId));
      } else {
        setValue("branch", branches[0].value);
      }
    }
  }, [branches, id, setValue, getValues, isBranchLocked, initialBranchId]);

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

  // Build per-row options: always include the stored product label so the
  // combobox can display the name even before/after a barcode scan
  const getRowOptions = useCallback((index: number) => {
    const stored = (watchedItems[index] as any);
    const storedValue = stored?.product;
    const storedName = stored?.productName;
    if (!storedValue || !storedName) return productOptions;
    const alreadyPresent = productOptions.some((o: any) => o.value === storedValue);
    if (alreadyPresent) return productOptions;
    return [{ label: storedName, value: storedValue }, ...productOptions];
  }, [productOptions, watchedItems]);

  // 5. Product Search with Barcode Fallback and deduplication
  const handleProductSearch = useCallback(async (query: string) => {
    setSearchingProducts(true);
    try {
      // When query is empty, fetch all products so the dropdown is populated on first click
      const [nameResults, costDetail] = await Promise.all([
        stockAdjustmentApi.getProductListByName(query).catch(() => []),
        query ? stockAdjustmentApi.getPurchaseCostData(query).catch(() => null) : Promise.resolve(null)
      ]);

      let mapped = nameResults.map((r) => ({
        label: r.code ? `[${r.code}] ${r.productName}` : r.productName,
        value: r.productId.toString(),
        code: r.code || "",
        barcode: r.barcode || "",
      }));

      if (costDetail) {
        const costOption = {
          label: costDetail.productCode ? `[${costDetail.productCode}] ${costDetail.productName}` : costDetail.productName,
          value: costDetail.productId.toString(),
          code: costDetail.productCode || "",
          barcode: query,
        };
        // Prepend matched code result for instant display at the top of options list
        mapped = [costOption, ...mapped];
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
      const branchIdStr = getValues("branch");
      if (branchIdStr && val) {
        productService.getClosingStock(Number(val), Number(branchIdStr))
          .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
          .catch(() => setValue(`items.${index}.stock`, "Error"));
      }
    } catch (error) {
      console.error("Failed to load product details", error);
      setValue(`items.${index}.stock`, "Error");
    }
  };

  const handleBarcodeScan = useCallback(async (index: number, barcode: string) => {
    try {
      setValue(`items.${index}.stock`, "...");
      // Try barcode/code via cost-data endpoint first
      let details = await stockAdjustmentApi.getPurchaseCostData(barcode).catch(() => null);

      // Fallback: search by name/code if cost-data returns nothing
      if (!details) {
        const nameResults = await stockAdjustmentApi.getProductListByName(barcode).catch(() => []);
        if (nameResults && nameResults.length > 0) {
          // Use the first match, then fetch its cost data using its barcode
          const first = nameResults[0];
          const barcodeToUse = first.barcode || first.code || barcode;
          details = await stockAdjustmentApi.getPurchaseCostData(barcodeToUse).catch(() => null);
          // If still no cost data, create a minimal details object
          if (!details) {
            setProductOptions(prev => {
              if (prev.find(o => o.value === String(first.productId))) return prev;
              const lbl = first.code ? `[${first.code}] ${first.productName}` : first.productName;
              return [...prev, { label: lbl, value: String(first.productId), code: first.code || "", barcode: first.barcode || "" }];
            });
            setValue(`items.${index}.product`, String(first.productId));
            setValue(`items.${index}.productName`, first.code ? `[${first.code}] ${first.productName}` : first.productName);
            setValue(`items.${index}.code`, first.code || "");

            const branchIdStr = getValues("branch");
            if (branchIdStr && first.productId) {
              productService.getClosingStock(first.productId, Number(branchIdStr))
                .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
                .catch(() => setValue(`items.${index}.stock`, "Error"));
            }

            return true;
          }
        }
      }

      if (details) {
        const labelWithCode = details.productCode ? `[${details.productCode}] ${details.productName}` : details.productName;
        setProductOptions(prev => {
          if (prev.find(o => o.value === String(details!.productId))) return prev;
          return [...prev, { label: labelWithCode, value: String(details!.productId), code: details!.productCode || "", barcode }];
        });
        setValue(`items.${index}.product`, String(details.productId));
        setValue(`items.${index}.productName`, labelWithCode);
        setValue(`items.${index}.code`, details.productCode || "");
        setValue(`items.${index}.unitCategory`, details.unitCategory || "");
        setValue(`items.${index}.unitId`, details.baseUnitId);
        setValue(`items.${index}.unit`, String(details.baseUnitId));
        setValue(`items.${index}.cost`, formatAmount(details.cost));
        if (details.unitCategory) {
          loadCategoryUnits(details.unitCategory);
        }

        const branchIdStr = getValues("branch");
        if (branchIdStr && details.productId) {
          productService.getClosingStock(details.productId, Number(branchIdStr))
            .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
            .catch(() => setValue(`items.${index}.stock`, "Error"));
        }

        return true;
      }
    } catch (e) {
      console.error("Instant barcode lookup failed", e);
      setValue(`items.${index}.stock`, "Error");
    }
    return false;
  }, [setValue, loadCategoryUnits, formatAmount]);

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

  const handleUnitChange = useCallback(async (index: number, unitId: string) => {
    setValue(`items.${index}.unit`, unitId);
    setValue(`items.${index}.unitId`, Number(unitId));
    const productId = getValues(`items.${index}.product`);
    if (!productId || !unitId) return;
    try {
      const result = await stockAdjustmentApi.getUnitCost(Number(productId), Number(unitId));
      if (result.cost !== undefined && result.cost !== null) {
        setValue(`items.${index}.cost`, formatAmount(result.cost));
      }

      const branchIdStr = getValues("branch");
      if (branchIdStr && productId) {
        productService.getClosingStock(Number(productId), Number(branchIdStr))
          .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
          .catch(() => setValue(`items.${index}.stock`, "Error"));
      }
    } catch (error) {
      console.error("Failed to fetch unit cost", error);
    }
  }, [setValue, getValues, formatAmount]);

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

      console.log("Saving Stock Adjustment payload:", JSON.stringify(payload, null, 2));

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
    update,
    watchedItems,
    totals,
    handleReset,
    onSubmit,
    masterData: { branches, employees: branchData.employees, types: typesData.options, typesRaw: typesData.raw, units: typesData.units || [] },
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
