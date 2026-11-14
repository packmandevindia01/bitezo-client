import { useState, useMemo, useEffect } from "react";
import { pickSavedAt } from "../../../../utils/printDateTime";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { internalStockTransferApi, formatDateOnly } from "../services/internalStockTransferApi";
import { useBranchScope } from "../../../../hooks/useBranchScope";
import { productService } from "../../../inventory/product/services/productService";
import { useToast } from "../../../../app/providers/useToast";
import { generateUUID } from "../../../../utils/uuid";
import { formatAmount } from "../../../../utils/currency";
import {
  InternalStockTransferFormSchema,
  type InternalStockTransferForm,
  type InternalStockTransferLineItem,
  type InternalStockTransferCreatePayload,
  type InternalStockTransferUpdatePayload
} from "../types";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { firstRealBranch, formBranchOptions, useStockBranches } from "../../shared/useStockBranches";
import { useCategoryUnits, useClosingStock, useStockUnitChange } from "../../shared/useStockLineUnits";
import { stockBaseQty, stockLineAmount, stockNetAmount } from "../../shared/stockCalc";
import { getLineUnitValue, type RawUnit } from "../../shared/lineUnits";

const toNumber = (val: any): number => {
  if (typeof val === "number") return val;
  const parsed = parseFloat(String(val).replace(/,/g, ""));
  return isNaN(parsed) ? 0 : parsed;
};

const calculateLine = (item: any) => {
  const qty = toNumber(item.qty);
  const cost = toNumber(item.cost);
  return { amount: stockLineAmount(qty, cost) };
};

export const initialTransferForm: InternalStockTransferForm = {
  refNo: "",
  date: formatDateOnly(new Date()),
  fromBranch: "",
  toBranch: "",
  salesman: "",
  narration: "",
  items: [{ id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: formatAmount(0) }],
};

export const useInternalStockTransfer = (id?: string) => {
  const queryClient = useQueryClient();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  // When the open document was saved (backend created time, or the moment Save succeeded): the print's time, AM/PM
  const [savedAt, setSavedAt] = useState("");

  const { categoryUnits, loadCategoryUnits } = useCategoryUnits(internalStockTransferApi.getUnits);

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
  const watchedToBranch = watch("toBranch");
  const watchedItems = useWatch({ control, name: "items" }) || [];
  
  const { branches: resolvedBranches, loadingBranches } = useStockBranches({
    queryPrefix: "internalStockTransfer",
    getBranchList: internalStockTransferApi.getFromBranches,
  });

  // The To Branch list depends on the branches, so it follows them.
  useEffect(() => {
    const refreshToBranches = () => void queryClient.invalidateQueries({ queryKey: ["internalStockTransferBranchSpecific"], refetchType: "all" });
    refreshToBranches();
    return subscribeToBranchUpdates(refreshToBranches);
  }, [queryClient]);

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
        units: unitsRes.map((u: RawUnit) => ({
          label: u.name || u.unitName || "",
          value: String(u.id || u.unitId),
          currentValue: Number(u.currentvalue ?? u.currentValue ?? 1),
          category: u.category,
        })),
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
      resolvedBranches.forEach((b) => {
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
      setSavedAt(pickSavedAt(master));
      const details = responseData.detailsData || responseData.details || [];
      
      const formPayload: any = {
        refNo: String(master.refNo || transId || ""),
        date: master.transDate ? formatDateOnly(master.transDate) : formatDateOnly(new Date()),
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

  // Auto-set first branch and RefNo for new records
  useEffect(() => {
    if (!id && resolvedBranches && resolvedBranches.length > 0 && !getValues("fromBranch")) {
      if (isBranchLocked && initialBranchId) {
        setValue("fromBranch", String(initialBranchId));
      } else {
        setValue("fromBranch", firstRealBranch(resolvedBranches)?.value ?? "");
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

  const loadStock = useClosingStock("fromBranch", getValues, setValue);

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
        
        loadStock(index, Number(productIdStr));
      } catch (err) {
        console.error("Failed to load product details", err);
        setValue(`items.${index}.stock`, "Error");
      }
    }
  };


  const handleUnitChange = useStockUnitChange({ getUnitCost: internalStockTransferApi.getUnitCost, getValues, setValue, formatAmount, showToast, loadStock });

  const handleReset = () => {
    setSavedAt("");
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
      const netAmount = stockNetAmount(validItems.map((item) => ({ amount: calculateLine(item as any).amount })));

      const vDate = formatDateOnly(data.date);
      const details = validItems.map(item => {
        const unitId = item.unitId || parseInt(item.unit || "1", 10) || 1;
        const unitCurrentValue = getLineUnitValue(unitId, categoryUnits, masterLookupData?.units);
        return {
          productId: parseInt(item.product, 10) || 0,
          unitId,
          qty: toNumber(item.qty),
          price: toNumber(item.cost),
          amount: stockLineAmount(item.qty, item.cost),
          baseQty: stockBaseQty(item.qty, unitCurrentValue)
        };
      });

      if (id) {
        const updatePayload: InternalStockTransferUpdatePayload = {
          transId: Number(id),
          transDate: vDate,
          fromBranchId: parseInt(data.fromBranch, 10),
          toBranchId: parseInt(data.toBranch, 10),
          employeeId: parseInt(data.salesman || "", 10) || 0,
          netAmount,
          narration: data.narration || "",
          updatedAt: new Date().toISOString(),
          details
        };
        await internalStockTransferApi.updateTransfer(Number(id), updatePayload);
        showToast("Stock transfer updated successfully", "success");
      } else {
        const createPayload: InternalStockTransferCreatePayload = {
          transDate: vDate,
          fromBranchId: parseInt(data.fromBranch, 10),
          toBranchId: parseInt(data.toBranch, 10),
          employeeId: parseInt(data.salesman || "", 10) || 0,
          netAmount,
          narration: data.narration || "",
          createdAt: new Date().toISOString(),
          details
        };
        await internalStockTransferApi.createTransfer(createPayload);
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
    return formBranchOptions(Array.from(map.entries()).map(([value, label]) => ({ value, label })), watchedToBranch);
  }, [branchSpecificData?.toBranches, resolvedBranches, watchedBranch, watchedToBranch]);

  const masterData = {
    fromBranches: formBranchOptions(resolvedBranches, watchedBranch),
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
    savedAt,
    setSavedAt,
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
