import { useState, useMemo, useEffect, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { internalStockTransferApi } from "../services/internalStockTransferApi";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { productService } from "../../../inventory/product/services/productService";
import { useToast } from "../../../../app/providers/useToast";
import { generateUUID } from "../../../../utils/uuid";
import { formatAmount } from "../../../../utils/currency";
import { InternalStockTransferFormSchema, type InternalStockTransferForm, type InternalStockTransferLineItem, type InternalStockTransferPayload } from "../types";
import { fetchBranches, fetchBranchNames } from "../../../inventory/branches/services/branchApi";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { useAppSelector, useAppDispatch } from "../../../../app/hooks";
import { fetchGlobalBranches } from "../../../inventory/shared/store/masterDataSlice";

const toNumber = (val: any): number => {
  if (typeof val === "number") return val;
  const parsed = parseFloat(String(val).replace(/,/g, ""));
  return isNaN(parsed) ? 0 : parsed;
};

const calculateLine = (item: any) => {
  const qty = toNumber(item.qty);
  const cost = toNumber(item.cost);
  return { amount: qty * cost };
};

export const initialTransferForm: InternalStockTransferForm = {
  refNo: "",
  date: new Date().toISOString().split("T")[0],
  fromBranch: "",
  toBranch: "",
  salesman: "",
  narration: "",
  items: [{ id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: formatAmount(0) }],
};

export const useInternalStockTransfer = (id?: string) => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const reduxBranches = useAppSelector((state: any) => state.masterData.branches);
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [categoryUnits, setCategoryUnits] = useState<Record<string, { label: string, value: string, currentValue: number }[]>>({});

  const loadCategoryUnits = useCallback(async (unitCategory: string) => {
    if (!unitCategory) return;
    setCategoryUnits(prev => {
      if (prev[unitCategory]) return prev;
      internalStockTransferApi.getUnits(unitCategory).then(res => {
        setCategoryUnits(current => ({
          ...current,
          [unitCategory]: (res || []).map((u: any) => ({ label: u.name || u.unitName, value: String(u.unitId), currentValue: Number(u.currentValue ?? u.currentvalue ?? 1) }))
        }));
      }).catch(err => {
        console.error("Failed to load units for category", unitCategory, err);
      });
      return prev;
    });
  }, []);

  const methods = useForm<InternalStockTransferForm>({
    resolver: zodResolver(InternalStockTransferFormSchema),
    defaultValues: initialTransferForm,
    mode: "onChange",
  });

  const { control, reset, setValue, getValues, watch } = methods;

  const { fields: items, append, remove, update } = useFieldArray({
    control,
    name: "items",
  });

  const watchedBranch = watch("fromBranch");
  const watchedItems = useWatch({ control, name: "items" }) || [];
  
  // 1. Fetch Branches concurrently across all endpoints + Redux master
  const { data: allBranches = [], isLoading: loadingBranches, refetch: refetchBranches } = useQuery({
    queryKey: ["internalStockTransferBranches"],
    queryFn: async () => {
      const branchMap = new Map<string, string>();

      const [branchMasterRes, directBranchesTrueRes, directBranchesFalseRes, istBranchesRes] = await Promise.allSettled([
        fetchBranches(),
        fetchBranchNames(true),
        fetchBranchNames(false),
        internalStockTransferApi.getFromBranches(),
      ]);

      if (branchMasterRes.status === "fulfilled" && Array.isArray(branchMasterRes.value)) {
        branchMasterRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? b.BranchId ?? b.Id ?? "");
          const name = String(b.branchName ?? b.BranchName ?? b.name ?? b.Name ?? "");
          if (id && id !== "0" && name) {
            branchMap.set(id, name);
          }
        });
      }

      if (directBranchesTrueRes.status === "fulfilled" && Array.isArray(directBranchesTrueRes.value)) {
        directBranchesTrueRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? b.BranchId ?? b.Id ?? "");
          const name = String(b.branchName ?? b.BranchName ?? b.name ?? b.Name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      if (directBranchesFalseRes.status === "fulfilled" && Array.isArray(directBranchesFalseRes.value)) {
        directBranchesFalseRes.value.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? b.BranchId ?? b.Id ?? "");
          const name = String(b.branchName ?? b.BranchName ?? b.name ?? b.Name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      if (istBranchesRes.status === "fulfilled" && Array.isArray(istBranchesRes.value)) {
        istBranchesRes.value.forEach((b: any) => {
          const id = String(b.branchId ?? b.BranchId ?? b.id ?? b.Id ?? "");
          const name = String(b.branchName ?? b.BranchName ?? b.name ?? b.Name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      // Merge Redux branches (from addMasterBranch)
      if (Array.isArray(reduxBranches)) {
        reduxBranches.forEach((b: any) => {
          const id = String(b.id ?? b.branchId ?? b.BranchId ?? b.Id ?? "");
          const name = String(b.name ?? b.branchName ?? b.BranchName ?? b.Name ?? "");
          if (id && id !== "0" && name && !branchMap.has(id)) {
            branchMap.set(id, name);
          }
        });
      }

      return Array.from(branchMap.entries()).map(([value, label]) => ({
        label,
        value,
      }));
    },
    initialData: () => {
      if (Array.isArray(reduxBranches) && reduxBranches.length > 0) {
        return reduxBranches
          .map((b: any) => ({
            label: b.name || b.branchName || b.BranchName || "",
            value: String(b.id || b.branchId || b.BranchId || ""),
          }))
          .filter((b: any) => b.value && b.value !== "0");
      }
      return [];
    },
    initialDataUpdatedAt: 0,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Always re-fetch branches on mount so newly created branches appear immediately
  useEffect(() => {
    void dispatch(fetchGlobalBranches());
    void queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranches"], refetchType: "all" });
    void queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranchSpecific"], refetchType: "all" });
    void refetchBranches();
  }, [dispatch, queryClient, refetchBranches]);

  // Real-time synchronization for branch creation/updates across tabs and same window
  useEffect(() => {
    return subscribeToBranchUpdates(() => {
      void dispatch(fetchGlobalBranches());
      void queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranches"], refetchType: "all" });
      void queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranchSpecific"], refetchType: "all" });
      void refetchBranches();
    });
  }, [dispatch, queryClient, refetchBranches]);

  // 2. Master Data Lookups (Products & Units)
  const { data: masterLookupData, isLoading: loadingMaster } = useQuery({
    queryKey: ["internalStockTransferMaster"],
    queryFn: async () => {
      const [prodRes, productMaster] = await Promise.all([
        internalStockTransferApi.getProductsByName(""),
        productService.loadMasterData().catch(() => null),
      ]);
      const unitsRes = productMaster?.unit || [];
      return {
        products: prodRes,
        productOptions: (prodRes || []).map((p: any) => ({ label: p.productName, value: String(p.productId ?? p.id) })),
        units: unitsRes.map((u: any) => ({ label: u.name || u.unitName || "", value: String(u.id || u.unitId) })),
      };
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  // 3. Branch-dependent data (Employees, Destination Branches, Ref No)
  const { data: branchSpecificData, isLoading: loadingBranchSpecific } = useQuery({
    queryKey: ["internalStockTransferBranchSpecific", watchedBranch],
    queryFn: async () => {
      if (!watchedBranch) return { employees: [], toBranches: [], refNo: "" };
      const branchId = parseInt(watchedBranch, 10);
      const [empRes, toBranchRes, refRes] = await Promise.allSettled([
        internalStockTransferApi.getEmployees(branchId),
        internalStockTransferApi.getToBranches(branchId),
        internalStockTransferApi.getRefNumber(branchId)
      ]);

      const toBranchMap = new Map<string, string>();
      if (toBranchRes.status === "fulfilled" && Array.isArray(toBranchRes.value)) {
        toBranchRes.value.forEach((b: any) => {
          const id = String(b.branchId ?? b.id ?? "");
          const name = String(b.branchName ?? b.name ?? "");
          if (id && id !== "0" && name) {
            toBranchMap.set(id, name);
          }
        });
      }

      // Also ensure all other active branches are available as destination branches
      allBranches.forEach((b) => {
        if (b.value !== String(branchId) && !toBranchMap.has(b.value)) {
          toBranchMap.set(b.value, b.label);
        }
      });

      const empList = empRes.status === "fulfilled" && Array.isArray(empRes.value) ? empRes.value : [];
      const refNoStr = refRes.status === "fulfilled" ? String(refRes.value || "") : "";

      return {
        employees: empList.map((e: any) => ({
          label: e.empName || e.employeeName || e.name,
          value: String(e.empId ?? e.employeeId ?? e.id)
        })),
        toBranches: Array.from(toBranchMap.entries()).map(([value, label]) => ({ label, value })),
        refNo: refNoStr,
      };
    },
    enabled: !!watchedBranch,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // 3. Load existing record (Edit Mode)
  const { isLoading: loadingRecord } = useQuery({
    queryKey: ["internalStockTransferRecord", id],
    queryFn: async () => {
      if (!id) return null;
      const transId = parseInt(id, 10);
      const responseData = await internalStockTransferApi.getTransferById(transId);
      
      const master = responseData.masterData || responseData;
      const details = responseData.detailsData || responseData.details || [];
      
      const formPayload: any = {
        refNo: String(master.refNo || transId || ""),
        date: master.transDate ? master.transDate.split("T")[0] : new Date().toISOString().split("T")[0],
        fromBranch: String(master.fromBranchId || master.branchId || ""),
        toBranch: String(master.toBranchId || ""),
        salesman: String(master.employeeId || ""),
        narration: String(master.narration || ""),
      };

      if (details.length > 0) {
        const mappedItems: InternalStockTransferLineItem[] = [];
        for (const d of details) {
          const barcode = d.barcode || d.productCode || "";
          let unitCategory = "";
          if (barcode) {
            try {
              const costData = await internalStockTransferApi.getProductCostData(barcode);
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
            productId: d.productId,
            product: String(d.productId),
            productName: d.productName || d.name || "",
            code: d.barcode || d.productCode || "",
            unitId: d.unitId,
            unit: String(d.unitId || ""),
            unitCategory,
            qty: String(d.qty || "1"),
            cost: formatAmount(d.cost || d.price || 0)
          });
        }
        formPayload.items = mappedItems;
      } else {
        formPayload.items = [initialTransferForm.items[0]];
      }

      reset(formPayload);
      return responseData;
    },
    enabled: !!id,
  });

  const fallbackBranches = useMemo(() => {
    if (Array.isArray(reduxBranches) && reduxBranches.length > 0) {
      return reduxBranches
        .map((b: any) => ({
          label: b.name || b.branchName || b.BranchName || "",
          value: String(b.id || b.branchId || b.BranchId || "")
        }))
        .filter((b: any) => b.value && b.value !== "0");
    }
    return [];
  }, [reduxBranches]);

  const resolvedBranches = useMemo(() => {
    const branchMap = new Map<string, string>();
    (allBranches || []).forEach((b: any) => {
      const id = String(b.value ?? b.id ?? "");
      const label = String(b.label ?? b.name ?? b.branchName ?? "");
      if (id && id !== "0" && label) {
        branchMap.set(id, label);
      }
    });
    (fallbackBranches || []).forEach((b: any) => {
      const id = String(b.value ?? b.id ?? "");
      const label = String(b.label ?? b.name ?? b.branchName ?? "");
      if (id && id !== "0" && label && !branchMap.has(id)) {
        branchMap.set(id, label);
      }
    });
    return Array.from(branchMap.entries()).map(([value, label]) => ({ value, label }));
  }, [allBranches, fallbackBranches]);

  // Auto-set first branch and RefNo for new records
  useEffect(() => {
    if (!id && resolvedBranches && resolvedBranches.length > 0 && !getValues("fromBranch")) {
      if (isBranchLocked && initialBranchId) {
        setValue("fromBranch", String(initialBranchId));
      } else {
        setValue("fromBranch", resolvedBranches[0].value);
      }
    }
  }, [resolvedBranches, id, setValue, getValues, isBranchLocked, initialBranchId]);

  useEffect(() => {
    if (!id && branchSpecificData?.refNo && !getValues("refNo")) {
      setValue("refNo", branchSpecificData.refNo);
    }
    if (!id && branchSpecificData?.employees && branchSpecificData.employees.length > 0 && !getValues("salesman")) {
      setValue("salesman", branchSpecificData.employees[0].value);
    }
  }, [branchSpecificData, id, setValue, getValues]);

  // Product Selection Logic
  const handleProductSelect = async (index: number, productIdStr: string) => {
    if (!masterLookupData?.products) return;
    const product = masterLookupData.products.find((p: any) => String(p.productId) === productIdStr);
    
    if (product) {
      const code = product.barcode || product.code || "";
      setValue(`items.${index}.code`, code);
      setValue(`items.${index}.productName`, product.productName || "");
      setValue(`items.${index}.cost`, "0");
      
      try {
        setValue(`items.${index}.stock`, "...");
        const costData = await internalStockTransferApi.getProductCostData(code);
        if (costData) {
          setValue(`items.${index}.unitCategory`, costData.unitCategory || "");
          setValue(`items.${index}.unitId`, costData.baseUnitId);
          setValue(`items.${index}.unit`, String(costData.baseUnitId));
          setValue(`items.${index}.cost`, formatAmount(costData.cost || 0));
          if (costData.unitCategory) {
            loadCategoryUnits(costData.unitCategory);
          }
        }
        
        const branchIdStr = getValues("fromBranch");
        if (branchIdStr && productIdStr) {
          productService.getClosingStock(Number(productIdStr), Number(branchIdStr))
            .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
            .catch(() => setValue(`items.${index}.stock`, "Error"));
        }
      } catch (err) {
        console.error("Failed to load product details", err);
        setValue(`items.${index}.stock`, "Error");
      }
    }
  };


  const handleUnitChange = useCallback(async (index: number, unitId: string) => {
    setValue(`items.${index}.unit`, unitId);
    setValue(`items.${index}.unitId`, Number(unitId));
    const productId = getValues(`items.${index}.product`);
    if (!productId || !unitId) return;
    try {
      const cost = await internalStockTransferApi.getUnitCost(Number(productId), Number(unitId));
      if (cost !== undefined && cost !== null) {
        setValue(`items.${index}.cost`, formatAmount(cost));
      }
      
      const branchIdStr = getValues("fromBranch");
      if (branchIdStr && productId) {
        productService.getClosingStock(Number(productId), Number(branchIdStr))
          .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
          .catch(() => setValue(`items.${index}.stock`, "Error"));
      }
    } catch (error) {
      console.error("Failed to fetch unit cost", error);
    }
  }, [setValue, getValues]);

  const handleReset = () => {
    reset(initialTransferForm);
  };

  const onSubmit = async (data: InternalStockTransferForm): Promise<boolean> => {
    const validItems = data.items.filter(item => item.product && item.product.trim() !== "");
    if (validItems.length === 0) {
      showToast("Please add at least one product.", "warning");
      return false;
    }

    setSaving(true);
    try {
      const netAmount = validItems.reduce((acc, item) => {
        const line = calculateLine(item as any);
        return acc + line.amount;
      }, 0);

      const payload: InternalStockTransferPayload = {
        transDate: data.date,
        fromBranchId: parseInt(data.fromBranch, 10),
        toBranchId: parseInt(data.toBranch, 10),
        employeeId: parseInt(data.salesman || "", 10) || 0,
        netAmount,
        narration: data.narration || "",
        createdAt: new Date().toISOString(),
        details: validItems.map(item => {
          const unitId = item.unitId || parseInt(item.unit || "1", 10) || 1;
          const unitCurrentValue = (() => {
            for (const units of Object.values(categoryUnits)) {
              const found = units.find(u => String(u.value) === String(unitId));
              if (found && !isNaN(found.currentValue)) return found.currentValue;
            }
            return 1;
          })();
          return {
            productId: parseInt(item.product, 10) || 0,
            unitId,
            qty: toNumber(item.qty),
            price: toNumber(item.cost),
            amount: toNumber(item.qty) * toNumber(item.cost),
            baseQty: toNumber(item.qty) * unitCurrentValue
          };
        })
      };

      if (id) {
        payload.transId = Number(id);
        await internalStockTransferApi.updateTransfer(Number(id), payload);
        showToast("Stock transfer updated successfully", "success");
      } else {
        await internalStockTransferApi.createTransfer(payload);
        showToast("Stock transfer saved successfully", "success");
      }

      return true;
    } catch (err: any) {
      console.error("Save error:", err);
      showToast(err.message || "Failed to save stock transfer", "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const toBranchOptions = useMemo(() => {
    const map = new Map<string, string>();
    (branchSpecificData?.toBranches || []).forEach((b: any) => {
      const id = String(b.value ?? b.id ?? "");
      const label = String(b.label ?? b.name ?? b.branchName ?? "");
      if (id && id !== "0" && id !== watchedBranch && label) {
        map.set(id, label);
      }
    });
    resolvedBranches.forEach((b) => {
      const id = String(b.value ?? "");
      const label = String(b.label ?? "");
      if (id && id !== "0" && id !== watchedBranch && label && !map.has(id)) {
        map.set(id, label);
      }
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [branchSpecificData?.toBranches, resolvedBranches, watchedBranch]);

  const masterData = {
    fromBranches: resolvedBranches,
    toBranches: toBranchOptions,
    employees: branchSpecificData?.employees || [],
    products: masterLookupData?.products || [],
    productOptions: masterLookupData?.productOptions || [],
    units: masterLookupData?.units || [],
  };

  const grandTotal = useMemo(() => {
    return watchedItems.reduce((sum: number, item: any) => {
      const line = calculateLine(item as any);
      return sum + line.amount;
    }, 0);
  }, [watchedItems]);

  return {
    methods,
    fields: items,
    append,
    remove,
    update,
    masterData,
    loadingMaster: loadingBranches || loadingMaster || loadingBranchSpecific || loadingRecord,
    saving,
    grandTotal,
    handleProductSelect,
    handleUnitChange,
    handleReset,
    onSubmit,
    watchedItems,
    isPrintModalOpen,
    setIsPrintModalOpen,
    categoryUnits,
    isBranchLocked,
  };
};
