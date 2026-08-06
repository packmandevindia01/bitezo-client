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
      return res.map(b => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

  const { data: branchData = { employees: [], refNo: "" }, isLoading: loadingBranchDetails } = useQuery({
    queryKey: ["physicalEntryBranchData", watchedBranch],
    queryFn: async () => {
      if (!watchedBranch) return { employees: [], refNo: "" };
      const branchIdNum = parseInt(watchedBranch, 10);
      const [empRes, refRes] = await Promise.all([
        physicalEntryApi.getEmployeeList(branchIdNum),
        !id ? physicalEntryApi.getRefNumber(branchIdNum) : Promise.resolve({ refNo: "" })
      ]);
      return {
        employees: empRes.map((e: any) => ({ label: e.empName, value: String(e.empId) })),
        refNo: String(refRes.refNo || ""),
      };
    },
    enabled: !!watchedBranch,
  });

  // Load Existing Record
  const { data: recordData, isLoading: loadingRecord } = useQuery({
    queryKey: ["physicalEntryRecord", id],
    queryFn: async () => {
      if (!id) return null;
      const responseData = await physicalEntryApi.getPhysicalEntryById(Number(id));
      const master = responseData.masterData || responseData;
      const details = responseData.detailsData || responseData.details || [];

      const formPayload: PhysicalEntryForm = {
        refNo: master.refNo?.toString() || "",
        date: master.transDate ? master.transDate.split("T")[0] : new Date().toISOString().split("T")[0],
        branch: master.branchId?.toString() || "",
        salesman: master.employeeId?.toString() || "",
        narration: master.narration || "",
        items: []
      };

      if (details && details.length > 0) {
        const mappedItems = [];
        for (const i of details) {
          let uCat = i.unitCategory || "";
          const itemCode = i.barcode || i.code || i.productCode || "";
          
          if (!uCat && itemCode) {
            try {
              const costData = await physicalEntryApi.getPurchaseCostData(itemCode);
              uCat = costData.unitCategory || "";
            } catch (e) {
              console.warn("Could not fetch unitCategory for item code", itemCode);
            }
          }

          if (uCat) loadCategoryUnits(uCat);
          
          mappedItems.push({
            id: generateUUID(),
            product: i.productId?.toString() || "",
            productName: i.productName || "",
            code: itemCode,
            unit: i.unitId?.toString() || "",
            unitId: i.unitId,
            unitCategory: uCat,
            qty: i.qty?.toString() || "0",
            cost: i.price?.toString() || "0",
            stock: "-", // Do not show real-time stock when editing past records
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
        const searchRes = await physicalEntryApi.getProductListByName("");
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
      return { rawData: responseData, formPayload, productOptions: options };
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
      setProductOptions([]);
    }
  }, [id, recordData, reset, initialForm]);

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
  const loadingMaster = loadingBranches || loadingBranchDetails || loadingRecord;

  // Merge branch employees with the saved record's salesman if not present (e.g. branch closed)
  const employees = useMemo(() => {
    const list = [...branchData.employees];
    if (id && recordData) {
      const master = (recordData.rawData as any).masterData || recordData.rawData;
      const empId = String(master.employeeId || "");
      if (empId && !list.find(e => e.value === empId)) {
        list.push({
          label: master.employeeName || master.empName || master.salesmanName || `[${empId}] Unknown`,
          value: empId
        });
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
      const [nameResults, costDetail] = await Promise.all([
        physicalEntryApi.getProductListByName(query).catch(() => []),
        query ? physicalEntryApi.getPurchaseCostData(query).catch(() => null) : Promise.resolve(null)
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
      const details = await physicalEntryApi.getPurchaseCostData(barcodeToUse);
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
            .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
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
      let details = await physicalEntryApi.getPurchaseCostData(barcode).catch(() => null);

      // Fallback: search by name/code if cost-data returns nothing
      if (!details) {
        const nameResults = await physicalEntryApi.getProductListByName(barcode).catch(() => []);
        if (nameResults && nameResults.length > 0) {
          // Use the first match, then fetch its cost data using its barcode
          const first = nameResults[0];
          const barcodeToUse = first.barcode || first.code || barcode;
          details = await physicalEntryApi.getPurchaseCostData(barcodeToUse).catch(() => null);
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

            if (!id) {
              const branchIdStr = getValues("branch");
              const asOnDate = getValues("date");
              if (branchIdStr && first.productId) {
                physicalEntryApi.getAsOnDateStock(first.productId, Number(branchIdStr), asOnDate)
                  .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
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

        if (!id) {
          const branchIdStr = getValues("branch");
          const asOnDate = getValues("date");
          if (branchIdStr && details.productId) {
            physicalEntryApi.getAsOnDateStock(details.productId, Number(branchIdStr), asOnDate)
              .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
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
      const result = await physicalEntryApi.getUnitCost(Number(productId), Number(unitId));
      if (result.cost !== undefined && result.cost !== null) {
        setValue(`items.${index}.cost`, formatAmount(result.cost));
      }

      if (!id) {
        const branchIdStr = getValues("branch");
        const asOnDate = getValues("date");
        if (branchIdStr && productId) {
          physicalEntryApi.getAsOnDateStock(Number(productId), Number(branchIdStr), asOnDate)
            .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
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
    handleProductSearch,
    handleItemProductChange,
    handleBarcodeScan,
    handleUnitChange,
    handleFormSubmit,
    handleReset,
    getRowOptions
  };
};
