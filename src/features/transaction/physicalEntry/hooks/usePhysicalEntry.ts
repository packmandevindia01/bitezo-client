import { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { physicalEntryApi } from "../services/physicalEntryApi";
import { createEmptyPhysicalEntryForm } from "../constants";
import { physicalEntrySchema } from "../types";
import type { PhysicalEntryForm, PhysicalEntryLineItem, PhysicalEntryPayload } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useToast } from "../../../../app/providers/useToast";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import type { SearchableOption } from "../../../../components/common/Searchableselect";
import { generateUUID } from "../../../../utils/uuid";

const toNumber = (value: string | number | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateLine = (item: PhysicalEntryLineItem) => {
  const qty = toNumber(item.qty);
  const cost = toNumber(item.cost);
  const amount = qty * cost;
  return { amount };
};

export const usePhysicalEntry = (id?: string | null) => {
  const queryClient = useQueryClient();
  const { formatAmount } = useCurrency();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const { showToast } = useToast();

  const [saving, setSaving] = useState(false);
  const [categoryUnits, setCategoryUnits] = useState<Record<string, { label: string, value: string, currentValue: number }[]>>({});

  // Always clear cached branchData (refNo + employees) on Add-mode mount so the
  // ref number is fetched fresh from the API, never served from stale cache.
  useEffect(() => {
    if (!id) {
      queryClient.removeQueries({ queryKey: ["physicalEntryBranchData"] });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCategoryUnits = useCallback(async (unitCategory: string) => {
    if (!unitCategory) return;
    setCategoryUnits(prev => {
      if (prev[unitCategory]) return prev;
      physicalEntryApi.getUnitList(unitCategory).then(res => {
        setCategoryUnits(current => ({
          ...current,
          [unitCategory]: res.map((u: any) => ({ label: u.name || u.unitName, value: String(u.unitId), currentValue: Number(u.currentValue ?? u.currentvalue ?? 1) }))
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
    const empty = createEmptyPhysicalEntryForm();
    empty.items = [{
      id: generateUUID(),
      product: "",
      code: "",
      unit: "",
      qty: "1",
      cost: "0",
    }];
    return empty;
  }, []);

  const methods = useForm<any>({
    resolver: zodResolver(physicalEntrySchema),
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
      const line = calculateLine(item as PhysicalEntryLineItem);
      return acc + line.amount;
    }, 0);

    return {
      grandTotal,
    };
  }, [watchedItems]);

  // Master Data Queries
  const { data: branches = [], isLoading: loadingBranches } = useQuery({
    queryKey: ["physicalEntryBranches"],
    queryFn: async () => {
      const res = await physicalEntryApi.getBranchList();
      return (res || []).map((b: any) => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

  // Determine effective branch ID for API calls
  const effectiveBranchId = useMemo(() => {
    if (branches.length === 0) return watchedBranch;
    // When top navbar has a locked branch, prefer initialBranchId
    if (!watchedBranch) {
      if (isBranchLocked && initialBranchId) {
        const lockedExists = branches.some((b: any) => b.value === String(initialBranchId));
        if (lockedExists) return String(initialBranchId);
      }
      return branches[0].value;
    }
    const exists = branches.some((b: any) => b.value === watchedBranch);
    return exists ? watchedBranch : branches[0].value;
  }, [watchedBranch, branches, isBranchLocked, initialBranchId]);

  const { data: branchData = { employees: [], refNo: "" }, isLoading: loadingBranchDetails } = useQuery({
    queryKey: ["physicalEntryBranchData", effectiveBranchId],
    queryFn: async () => {
      if (!effectiveBranchId) return { employees: [], refNo: "" };
      const branchIdNum = parseInt(effectiveBranchId, 10);
      const [empRes, refRes]: [any[], any] = await Promise.all([
        physicalEntryApi.getEmployeeList(branchIdNum),
        !id ? physicalEntryApi.getRefNumber(branchIdNum) : Promise.resolve({ refNo: "" })
      ]);
      const rawRef = typeof refRes === "object" && refRes !== null 
        ? (refRes.refNo ?? refRes.data?.refNo ?? refRes) 
        : refRes;
      const refNoStr = rawRef !== undefined && rawRef !== null && rawRef !== "" ? String(rawRef) : "";

      return {
        employees: (empRes || []).map((e: any) => ({ label: e.empName, value: String(e.empId) })),
        refNo: refNoStr,
      };
    },
    enabled: !!effectiveBranchId,
    staleTime: 0,
    refetchOnMount: true,
  });

  // Load Existing Record
  const { data: recordData, isLoading: loadingRecord } = useQuery({
    queryKey: ["physicalEntryRecord", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        const responseData: any = await physicalEntryApi.getPhysicalEntryById(Number(id));
        const raw = responseData?.data || responseData || {};
        const master = raw?.masterData || raw?.MasterData || raw?.master || raw?.Master || raw || {};
        const details = raw?.detailsData || raw?.DetailsData || raw?.details || raw?.Details || raw?.items || raw?.Items || [];

        const refNo = (master.refNo ?? master.RefNo ?? id ?? "").toString();
        const transDate = master.transDate ?? master.TransDate;
        const date = transDate ? String(transDate).split("T")[0] : new Date().toISOString().split("T")[0];
        const branch = (master.branchId ?? master.BranchId ?? "").toString();
        const salesman = (master.employeeId ?? master.EmployeeId ?? "").toString();
        const narration = (master.narration ?? master.Narration ?? "").toString();

        const detailsList = Array.isArray(details) ? details : [];
        const mappedItems: PhysicalEntryLineItem[] = [];
        const newCategoryUnits: Record<string, { label: string; value: string; currentValue: number }[]> = {};
        const options: SearchableOption[] = [];
        const seenIds = new Set<string>();

        for (const i of detailsList) {
          const productId = String(i.productId ?? i.ProductId ?? i.product ?? "");
          const itemCode = String(i.barcode || i.Barcode || i.code || i.Code || i.productCode || i.ProductCode || "");
          const prodName = String(i.productName || i.ProductName || i.itemName || i.ItemName || (productId ? `Product ${productId}` : ""));
          const unitId = String(i.unitId ?? i.UnitId ?? i.unit ?? "");
          const unitName = String(i.unitName || i.UnitName || (unitId ? "Unit" : ""));
          const uCat = String(i.unitCategory || i.UnitCategory || (unitId ? `cat_${unitId}` : ""));
          const qty = String(i.qty ?? i.Qty ?? "1");
          const cost = formatAmount(i.price ?? i.Price ?? i.cost ?? i.Cost ?? 0);

          if (unitId && uCat) {
            newCategoryUnits[uCat] = [
              { label: unitName || "Unit", value: unitId, currentValue: Number(i.baseQty || 1) }
            ];
          }

          if (productId && !seenIds.has(productId)) {
            seenIds.add(productId);
            options.push({
              label: itemCode ? `[${itemCode}] ${prodName}` : prodName,
              value: productId,
              code: itemCode,
              barcode: itemCode,
            });
          }

          mappedItems.push({
            id: generateUUID(),
            product: productId,
            productName: prodName,
            code: itemCode,
            unit: unitId,
            unitId: Number(unitId) || undefined,
            unitCategory: uCat,
            qty,
            cost,
            stock: "-",
          });
        }

        const formPayload: PhysicalEntryForm = {
          refNo,
          date,
          branch,
          salesman,
          narration,
          items: mappedItems.length > 0 ? mappedItems : [{
            id: generateUUID(),
            product: "",
            code: "",
            unit: "",
            qty: "1",
            cost: "0",
          }],
        };

        const employeeName = master.employeeName || master.EmployeeName || master.salesmanName || master.salesman || master.empName || "";

        return {
          rawData: responseData,
          formPayload,
          productOptions: options,
          employeeName,
          newCategoryUnits,
        };
      } catch (err) {
        console.error("Failed to load physical entry record for editing:", err);
        throw err;
      }
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Apply fetched record data to form
  useEffect(() => {
    if (id && recordData) {
      if (recordData.newCategoryUnits && Object.keys(recordData.newCategoryUnits).length > 0) {
        setCategoryUnits(prev => ({ ...prev, ...recordData.newCategoryUnits }));
      }
      reset(recordData.formPayload);
      setProductOptions(recordData.productOptions);
    } else if (!id) {
      reset(initialForm);
      setProductOptions([]);
    }
  }, [id, recordData, reset, initialForm]);

  // Pre-select first branch when branches finish loading (Add Mode)
  useEffect(() => {
    if (!id && branches.length > 0) {
      if (effectiveBranchId && getValues("branch") !== effectiveBranchId) {
        setValue("branch", effectiveBranchId);
      }
    }
  }, [branches, id, effectiveBranchId, setValue, getValues]);

  // Set refNo and salesman when branch details finish loading (Add Mode)
  useEffect(() => {
    if (!id && branchData.refNo) {
      setValue("refNo", branchData.refNo);
    }
    if (!id && branchData.employees.length > 0) {
      const currentSalesman = getValues("salesman");
      const exists = branchData.employees.some((e: any) => e.value === currentSalesman);
      if (!currentSalesman || !exists) {
        setValue("salesman", branchData.employees[0].value);
      }
    }
  }, [branchData, id, setValue, getValues]);

  // Combined loading state
  const loadingMaster = loadingBranches || loadingBranchDetails || loadingRecord;

  // Merge branch employees with the saved record's salesman if not present (e.g. branch closed)
  const employees = useMemo(() => {
    const list = [...branchData.employees];
    if (id && recordData) {
      const master = (recordData.rawData as any)?.masterData || (recordData.rawData as any)?.data?.masterData || (recordData as any).master || recordData.rawData;
      const empId = String(recordData.formPayload?.salesman || master?.employeeId || master?.EmployeeId || "");
      const empName = (recordData as any).employeeName || master?.employeeName || master?.EmployeeName || master?.salesmanName || master?.empName || master?.salesman;
      if (empId && !list.find(e => e.value === empId)) {
        list.push({
          label: empName || `[${empId}] Unknown`,
          value: empId
        });
      } else if (empId && empName) {
        const existing = list.find(e => e.value === empId);
        if (existing && (existing.label.includes("Unknown") || existing.label === empId)) {
          existing.label = empName;
        }
      }
    }
    return list;
  }, [branchData.employees, id, recordData]);

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
      const [nameResults, costDetail]: [any[], any] = await Promise.all([
        physicalEntryApi.getProductListByName(query).catch(() => []),
        query ? physicalEntryApi.getPurchaseCostData(query).catch(() => null) : Promise.resolve(null)
      ]);

      let mapped = (nameResults || []).map((r: any) => ({
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
      mapped = mapped.filter((item: any) => {
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

  const handleItemProductChange = async (index: number, valStr: string) => {
    setValue(`items.${index}.product`, valStr);
    const option = productOptions.find(o => o.value === valStr);
    if (option) {
      setValue(`items.${index}.productName`, option.label);
      setValue(`items.${index}.code`, option.code || option.barcode || "");
    }
    
    if (!valStr) {
      setValue(`items.${index}.productName`, "");
      setValue(`items.${index}.code`, "");
      setValue(`items.${index}.unit`, "");
      setValue(`items.${index}.cost`, "0");
      setValue(`items.${index}.stock`, "");
      setValue(`items.${index}.unitCategory`, "");
      setValue(`items.${index}.unitId`, undefined);
      return;
    }

    try {
      const barcodeToUse = option?.barcode || option?.code || valStr;
      const details: any = await physicalEntryApi.getPurchaseCostData(barcodeToUse);
      if (details) {
        setValue(`items.${index}.unitCategory`, details.unitCategory || "");
        setValue(`items.${index}.unitId`, details.baseUnitId);
        setValue(`items.${index}.unit`, String(details.baseUnitId));
        setValue(`items.${index}.cost`, formatAmount(details.cost));
        if (details.unitCategory) {
          loadCategoryUnits(details.unitCategory);
        }
      }

      // Fetch as-on-date stock only if not editing past entry
      if (!id) {
        const branchIdStr = getValues("branch");
        const asOnDate = getValues("date");
        if (branchIdStr && valStr) {
          physicalEntryApi.getAsOnDateStock(Number(valStr), Number(branchIdStr), asOnDate)
            .then((res: any) => setValue(`items.${index}.stock`, res.stock || "0"))
            .catch(() => setValue(`items.${index}.stock`, "Error"));
        }
      } else {
        setValue(`items.${index}.stock`, "-");
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
      let details: any = await physicalEntryApi.getPurchaseCostData(barcode).catch(() => null);

      // Fallback: search by name/code if cost-data returns nothing
      if (!details) {
        const nameResults: any[] = await physicalEntryApi.getProductListByName(barcode).catch(() => []);
        if (nameResults && nameResults.length > 0) {
          // Use the first match, then fetch its cost data using its barcode
          const first = nameResults[0];
          const barcodeToUse = first.barcode || first.code || barcode;
          details = await physicalEntryApi.getPurchaseCostData(barcodeToUse).catch(() => null);
          // If still no cost data, create a minimal details object
          if (!details) {
            setProductOptions(prev => {
              if (prev.find((o: any) => o.value === String(first.productId))) return prev;
              const lbl = first.code ? `[${first.code}] ${first.productName}` : first.productName;
              return [...prev, { label: lbl, value: String(first.productId), code: first.code || "", barcode: first.barcode || "" }];
            });
            setValue(`items.${index}.product`, String(first.productId));
            setValue(`items.${index}.productName`, first.code ? `[${first.code}] ${first.productName}` : first.productName);
            setValue(`items.${index}.code`, first.code || "");

            if (!id) {
              const branchIdStr = getValues("branch");
              const asOnDate = getValues("date");
              if (branchIdStr && first.productId) {
                physicalEntryApi.getAsOnDateStock(first.productId, Number(branchIdStr), asOnDate)
                  .then((res: any) => setValue(`items.${index}.stock`, res.stock || "0"))
                  .catch(() => setValue(`items.${index}.stock`, "Error"));
              }
            } else {
              setValue(`items.${index}.stock`, "-");
            }
            return true;
          }
        }
      }

      if (details) {
        const labelWithCode = details.productCode ? `[${details.productCode}] ${details.productName}` : details.productName;
        setProductOptions(prev => {
          if (prev.find((o: any) => o.value === String(details!.productId))) return prev;
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

        if (!id) {
          const branchIdStr = getValues("branch");
          const asOnDate = getValues("date");
          if (branchIdStr && details.productId) {
            physicalEntryApi.getAsOnDateStock(details.productId, Number(branchIdStr), asOnDate)
              .then((res: any) => setValue(`items.${index}.stock`, res.stock || "0"))
              .catch(() => setValue(`items.${index}.stock`, "Error"));
          }
        } else {
          setValue(`items.${index}.stock`, "-");
        }
        return true;
      }
    } catch (e) {
      console.error("Instant barcode lookup failed", e);
      setValue(`items.${index}.stock`, "Error");
    }
    return false;
  }, [id, setValue, getValues, loadCategoryUnits, formatAmount]);

  const handleUnitChange = useCallback(async (index: number, unitId: string) => {
    setValue(`items.${index}.unit`, unitId);
    setValue(`items.${index}.unitId`, Number(unitId));
    const productId = getValues(`items.${index}.product`);
    if (!productId || !unitId) return;
    try {
      const result: any = await physicalEntryApi.getUnitCost(Number(productId), Number(unitId));
      if (result && result.cost !== undefined && result.cost !== null) {
        setValue(`items.${index}.cost`, formatAmount(result.cost));
      }

      if (!id) {
        const branchIdStr = getValues("branch");
        const asOnDate = getValues("date");
        if (branchIdStr && productId) {
          physicalEntryApi.getAsOnDateStock(Number(productId), Number(branchIdStr), asOnDate)
            .then((res: any) => setValue(`items.${index}.stock`, res.stock || "0"))
            .catch(() => setValue(`items.${index}.stock`, "Error"));
        }
      }
    } catch (error) {
      console.error("Failed to fetch unit cost", error);
    }
  }, [id, setValue, getValues, formatAmount]);

  const handleReset = useCallback(() => {
    if (id && recordData) {
      reset(recordData.formPayload);
      setProductOptions(recordData.productOptions);
    } else {
      const resetForm = { ...initialForm };
      if (isBranchLocked && initialBranchId) {
        resetForm.branch = String(initialBranchId);
      } else if (branches.length > 0) {
        resetForm.branch = branches[0].value;
      }
      resetForm.refNo = branchData.refNo || "";
      if (branchData.employees.length > 0) {
        resetForm.salesman = branchData.employees[0].value;
      }
      reset(resetForm);
    }
  }, [id, recordData, reset, initialForm, branches, branchData, isBranchLocked, initialBranchId]);

  const handleFormSubmit = async (data: PhysicalEntryForm) => {
    // Validate minimum items
    if (!data.items || data.items.length === 0) {
      showToast("Please add at least one item", "error");
      return false;
    }
    const hasValidItem = data.items.some(i => i.product && Number(i.qty) > 0);
    if (!hasValidItem) {
      showToast("Please add at least one valid item with physical stock > 0", "error");
      return false;
    }

    try {
      setSaving(true);
      
      const details = data.items.map((item) => {
        const uCat = item.unitCategory || "";
        const uList = categoryUnits[uCat] || [];
        const selectedUnit = uList.find(u => u.value === item.unit);
        const currentValue = selectedUnit ? selectedUnit.currentValue : 1;
        const baseQty = Number(item.qty) * currentValue;

        return {
          productId: Number(item.product),
          unitId: Number(item.unit) || 0,
          qty: Number(item.qty),
          price: Number(item.cost),
          amount: Number(item.qty) * Number(item.cost),
          baseQty: baseQty
        };
      }).filter(i => i.productId && i.qty > 0);

      if (details.length === 0) {
        showToast("No valid items to save", "error");
        setSaving(false);
        return false;
      }

      const payload: PhysicalEntryPayload = {
        transDate: data.date,
        branchId: Number(data.branch),
        employeeId: Number(data.salesman),
        netAmount: totals.grandTotal,
        narration: data.narration || "",
        createdAt: new Date().toISOString(),
        details,
      };

      if (id) {
        payload.transId = Number(id);
        await physicalEntryApi.updatePhysicalEntry(Number(id), payload);
        showToast("Physical entry updated successfully");
      } else {
        await physicalEntryApi.createPhysicalEntry(payload);
        showToast("Physical entry created successfully");
      }

      queryClient.invalidateQueries({ queryKey: ["physicalEntryList"] });
      queryClient.invalidateQueries({ queryKey: ["physicalEntryBranchData"] });
      queryClient.invalidateQueries({ queryKey: ["stockRegisterReport"] });
      queryClient.invalidateQueries({ queryKey: ["productClosingStock"] });
      queryClient.invalidateQueries({ queryKey: ["stockAdjustmentReport"] });
      queryClient.invalidateQueries({ queryKey: ["productWiseStockAdjustmentReport"] });
      queryClient.invalidateQueries({ queryKey: ["productTransactionLogReport"] });
      
      return true;
    } catch (error: any) {
      showToast(error.message || "Failed to save physical entry", "error");
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
    totals,
    branches,
    employees,
    categoryUnits,
    productOptions,
    searchingProducts,
    loadingMaster,
    saving,
    isBranchLocked,
    handleProductSearch,
    handleItemProductChange,
    handleBarcodeScan,
    handleUnitChange,
    handleFormSubmit,
    handleReset,
    getRowOptions
  };
};
