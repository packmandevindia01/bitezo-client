/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo, useState, useEffect, useCallback } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productionApi } from "../services/productionApi";
import { productService } from "../../../inventory/product/services/productService";
import { productionSchema } from "../types";
import type { ProductionForm, ProductionPayload } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useToast } from "../../../../app/providers/useToast";
import { generateUUID } from "../../../../utils/uuid";
import { useBranchScope } from "../../../../hooks/useBranchScope";
export const useProductionForm = (initialTransId?: number) => {
  const { decimalPart } = useCurrency();
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Unit lists for Finished Product and Raw Material rows
  const [finishedProductUnits, setFinishedProductUnits] = useState<{ label: string; value: string; currentValue: number }[]>([]);
  const [categoryUnits, setCategoryUnits] = useState<Record<string, { label: string, value: string, currentValue: number }[]>>({});

  const loadCategoryUnits = useCallback(async (unitCategory: string) => {
    if (!unitCategory) return;
    setCategoryUnits(prev => {
      if (prev[unitCategory]) return prev;
      productionApi.getUnitListByName(unitCategory).then(res => {
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

  // 1. Initialize React Hook Form
  const form = useForm<ProductionForm>({
    resolver: zodResolver(productionSchema),
    defaultValues: {
      branchId: "",
      employeeId: "",
      productionNo: "",
      finishedProduct: "",
      finishedProductCode: "",
      finishedProductUnit: "",
      finishedProductUnitName: "",
      finishedProductQty: "1",
      otherCharge: Number(0).toFixed(decimalPart),
      narration: "",
      items: [{ id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: "0" }],
    },
  });

  const { control, setValue, getValues, handleSubmit, reset } = form;

  // 2. Initialize Field Array for Raw Materials grid
  const { fields: items, append, remove, update } = useFieldArray({
    control,
    name: "items",
  });

  // Watch values for dynamic totals and dependent queries
  const watchedItems = useWatch({ control, name: "items" }) || [];
  const watchedOtherCharge = useWatch({ control, name: "otherCharge" });
  const watchedBranchId = useWatch({ control, name: "branchId" });
  const watchedFinishedProductQty = useWatch({ control, name: "finishedProductQty" });
  const watchedFinishedProduct = useWatch({ control, name: "finishedProduct" });

  // 3. Totals Calculation
  const totals = useMemo(() => {
    const currentItems = watchedItems || [];
    const itemTotal = currentItems.reduce((acc, item) => {
      const q = Number(item.qty) || 0;
      const c = Number(item.cost) || 0;
      return acc + (q * c);
    }, 0);
    const otherCharge = Number(watchedOtherCharge) || 0;
    const grandTotal = itemTotal + otherCharge;
    const finQty = Number(watchedFinishedProductQty) || 0;
    const costPerUnit = finQty > 0 ? grandTotal / finQty : 0;

    return { grandTotal, costPerUnit };
  }, [watchedItems, watchedOtherCharge, watchedFinishedProductQty]);

  // 4. React Query Data Fetching
  const { data: finishedProducts = [] } = useQuery({
    queryKey: ["finishedProducts"],
    queryFn: async () => {
      const fp = await productionApi.getFinishedProductListByName("");
      return fp.map((p: any) => ({
        label: p.barcode || p.code ? `[${p.barcode || p.code}] ${p.productName}` : p.productName,
        value: String(p.productId),
        code: p.barcode || p.code
      }));
    }
  });

  const [scannedRawMaterials, setScannedRawMaterials] = useState<{ label: string; value: string; code?: string; barcode?: string }[]>([]);

  const { data: rawMaterialsQueryData = [] } = useQuery({
    queryKey: ["rawMaterials"],
    queryFn: async () => {
      const rm = await productionApi.getRawMaterialProductListByName("");
      return rm.map((p: any) => ({
        label: p.barcode || p.code ? `[${p.barcode || p.code}] ${p.productName}` : p.productName,
        value: String(p.productId),
        code: p.barcode || p.code || "",
        barcode: p.barcode || ""
      }));
    }
  });

  const rawMaterials = useMemo(() => {
    const combined = [...rawMaterialsQueryData];
    scannedRawMaterials.forEach(item => {
      if (!combined.some(c => c.value === item.value)) {
        combined.push(item as any);
      }
    });
    return combined;
  }, [rawMaterialsQueryData, scannedRawMaterials]);

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const bl = await productionApi.getBranchList();
      return bl.map((b: any) => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

  useEffect(() => {
    if (!initialTransId && branches.length > 0 && !watchedBranchId) {
      if (isBranchLocked) {
        setValue("branchId", initialBranchId);
      } else {
        setValue("branchId", branches[0].value);
      }
    }
  }, [branches, initialTransId, isBranchLocked, initialBranchId, watchedBranchId, setValue]);

  // Dependent Query: Employees (requires branchId)
  const { data: employees = [] } = useQuery({
    queryKey: ["employees", watchedBranchId],
    queryFn: async () => {
      const list = await productionApi.getEmployeeList(Number(watchedBranchId));
      return list.map((e: any) => ({ label: e.empName, value: String(e.empId) }));
    },
    enabled: !!watchedBranchId && !isNaN(Number(watchedBranchId)),
  });

  // Dependent Query: Production Number (requires branchId)
  const { data: prodNoData } = useQuery({
    queryKey: ["productionNumber", watchedBranchId],
    queryFn: () => productionApi.getProductionNumber(Number(watchedBranchId)),
    enabled: !!watchedBranchId && !isNaN(Number(watchedBranchId)) && !initialTransId,
  });

  useEffect(() => {
    if (initialTransId && watchedFinishedProduct && finishedProducts.length > 0 && finishedProductUnits.length === 0) {
      const prod = finishedProducts.find((p: any) => String(p.value) === String(watchedFinishedProduct));
      if (prod && prod.code) {
        productionApi.getProductCostData(prod.code).then(costData => {
          productionApi.getUnitListByName(costData.unitCategory).then(unitsResp => {
            const unitOptions = unitsResp.map((u: any) => ({ label: u.name, value: String(u.unitId), currentValue: Number(u.currentValue ?? u.currentvalue ?? 1) }));
            setFinishedProductUnits(unitOptions);
          });
        }).catch(() => {});
      }
    }
  }, [initialTransId, watchedFinishedProduct, finishedProducts, finishedProductUnits.length]);

  const { data: allUnits = [] } = useQuery({
    queryKey: ["allUnits"],
    queryFn: async () => {
      const pm = await productService.loadMasterData().catch(() => null);
      return (pm?.unit || []).map((u: any) => ({ label: u.name || u.unitName || "", value: String(u.id || u.unitId) }));
    }
  });

  useEffect(() => {
    if (prodNoData?.productionNo && !initialTransId) {
      setValue("productionNo", String(prodNoData.productionNo));
    }
  }, [prodNoData, initialTransId, setValue]);

  // Fetch initial data if in Edit Mode
  const { isLoading: isLoadingInitialData } = useQuery({
    queryKey: ["productionData", initialTransId],
    queryFn: async () => {
      if (!initialTransId) return null;
      const data = await productionApi.getProductionById(initialTransId);
      const master = data.masterData || {};
      const details = data.detailsData || [];
      
      if (details.length > 0) {
        const mappedItems: any[] = [];
        for (const item of details) {
          const barcode = item.barcode || item.code || "";
          let unitCategory = "";
          if (barcode) {
            try {
              const costData = await productionApi.getProductCostData(barcode);
              unitCategory = costData.unitCategory || "";
              if (unitCategory) {
                await loadCategoryUnits(unitCategory);
              }
            } catch (e) {
              console.error("Failed to load unit category", e);
            }
          }
          mappedItems.push({
            id: generateUUID(),
            product: String(item.productId),
            code: item.barcode || item.code || "",
            unit: String(item.unitId),
            unitCategory,
            qty: String(item.qty || "1"),
            cost: Number(item.cost || 0).toFixed(decimalPart),
            productId: item.productId,
            unitId: item.unitId,
          });
        }
        const finishedProdName = master.productName || master.itemName || master.name || "";
        const finishedProdCode = master.barcode || master.productCode || "";
        reset({
          branchId: String(master.branchId || ""),
          employeeId: String(master.employeeId || ""),
          finishedProduct: String(master.productId || ""),
          finishedProductName: finishedProdCode ? `[${finishedProdCode}] ${finishedProdName}` : finishedProdName,
          finishedProductUnit: String(master.unitId || ""),
          finishedProductUnitName: master.unitName || String(master.unitId || ""),
          finishedProductQty: String(master.qty || 1),
          otherCharge: Number(master.totalWage || 0).toFixed(decimalPart),
          narration: master.narration || "",
          items: mappedItems,
        });
      }
      return data;
    },
    enabled: !!initialTransId,
  });

  // 5. Actions & Handlers
  const handleFinishedProductSelect = async (productId: string) => {
    setValue("finishedProduct", productId);
    const prod = finishedProducts.find(p => p.value === productId);
    if (!prod) {
      setValue("finishedProductCode", "");
      setValue("finishedProductName", "");
      setValue("finishedProductUnit", "");
      setValue("finishedProductUnitName", "");
      setFinishedProductUnits([]);
      return;
    }

    setValue("finishedProductCode", prod.code);
    setValue("finishedProductName", prod.label);
    if (!prod.code) return;

    const branchIdNum = Number(getValues("branchId"));
    if (!branchIdNum) {
      showToast("Please select a branch first.", "error");
      return;
    }

    try {
      const costData = await productionApi.getProductCostData(prod.code);
      const unitsResp = await productionApi.getUnitListByName(costData.unitCategory);

      const unitOptions = unitsResp.map((u: any) => ({ label: u.name, value: String(u.unitId), currentValue: Number(u.currentValue ?? u.currentvalue ?? 1) }));
      setFinishedProductUnits(unitOptions);

      // Default to baseUnitId
      setValue("finishedProductUnit", String(costData.baseUnitId));
      const unitName = unitsResp.find((u: any) => u.unitId === costData.baseUnitId)?.name || costData.unitCategory;
      setValue("finishedProductUnitName", unitName);
      setValue("finishedProductQty", "1");
    } catch (err: any) {
      showToast("Failed to fetch product details", "error");
    }
  };

  const handleGridProductSelect = async (index: number, productId: string, barcode: string) => {
    setValue(`items.${index}.product`, productId);
    setValue(`items.${index}.productId`, Number(productId) || undefined);
    if (!barcode) {
      setValue(`items.${index}.code`, "");
      setValue(`items.${index}.productName`, "");
      setValue(`items.${index}.unitCategory`, "");
      setValue(`items.${index}.unitId`, undefined as any);
      setValue(`items.${index}.unit`, "");
      setValue(`items.${index}.cost`, "0");
      setValue(`items.${index}.stock`, "0.000");
      return;
    }

    try {
      setValue(`items.${index}.stock`, "...");

      const costData = await productionApi.getProductCostData(barcode);
      if (costData) {
        setValue(`items.${index}.unitCategory`, costData.unitCategory || "");
        setValue(`items.${index}.unitId`, costData.baseUnitId);
        setValue(`items.${index}.unit`, String(costData.baseUnitId));
        setValue(`items.${index}.cost`, Number(costData.cost).toFixed(decimalPart));
        
        if (costData.unitCategory) {
          loadCategoryUnits(costData.unitCategory);
        }

        const branchIdStr = getValues("branchId");
        if (branchIdStr) {
          const branchId = Number(branchIdStr);
          productService.getClosingStock(Number(productId), branchId)
            .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
            .catch(() => setValue(`items.${index}.stock`, "Error"));
        }
      }
    } catch (err) {
      console.error("Failed to fetch product details", err);
      setValue(`items.${index}.stock`, "Error");
    }
  };

  const handleBarcodeScan = useCallback(async (index: number, barcode: string) => {
    try {
      setValue(`items.${index}.stock`, "...");
      setValue(`items.${index}.avgCost`, "...");

      let details = await productionApi.getProductCostData(barcode).catch(() => null);
      if (!details) {
        const nameResults = await productionApi.getRawMaterialProductListByName(barcode).catch(() => []);
        if (nameResults && nameResults.length > 0) {
          const first = nameResults[0];
          const bcToUse = first.barcode || first.code || barcode;
          details = await productionApi.getProductCostData(bcToUse).catch(() => null);
          if (!details) {
            setScannedRawMaterials(prev => {
              if (prev.some(o => o.value === String(first.productId))) return prev;
              return [...prev, { label: first.productName, value: String(first.productId), code: first.code || "", barcode: first.barcode || "" }];
            });
            setValue(`items.${index}.product`, String(first.productId));
            setValue(`items.${index}.productId`, first.productId);
            setValue(`items.${index}.productName`, first.productName);
            setValue(`items.${index}.code`, first.code || "");
            
            const branchIdStr = getValues("branchId");
            if (branchIdStr && first.productId) {
              const branchId = Number(branchIdStr);
              productService.getClosingStock(first.productId, branchId)
                .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
                .catch(() => setValue(`items.${index}.stock`, "Error"));
            }
            return true;
          }
        }
      }

      if (details) {
        setScannedRawMaterials(prev => {
          if (prev.some(o => o.value === String(details.productId))) return prev;
          return [...prev, { label: details.productName, value: String(details.productId), code: details.productCode || "", barcode }];
        });
        setValue(`items.${index}.product`, String(details.productId));
        setValue(`items.${index}.productId`, details.productId);
        setValue(`items.${index}.productName`, details.productName);
        setValue(`items.${index}.code`, details.productCode || "");
        setValue(`items.${index}.unitCategory`, details.unitCategory || "");
        setValue(`items.${index}.unitId`, details.baseUnitId);
        setValue(`items.${index}.unit`, String(details.baseUnitId));
        setValue(`items.${index}.cost`, Number(details.cost).toFixed(decimalPart));
        if (details.unitCategory) {
          loadCategoryUnits(details.unitCategory);
        }

        const branchIdStr = getValues("branchId");
        if (branchIdStr && details.productId) {
          const branchId = Number(branchIdStr);
          productService.getClosingStock(details.productId, branchId)
            .then(res => setValue(`items.${index}.stock`, res.stock || "0"))
            .catch(() => setValue(`items.${index}.stock`, "Error"));
        }
        return true;
      } else {
        setValue(`items.${index}.stock`, "Error");
      }
    } catch (e) {
      console.error("Production barcode lookup failed", e);
      setValue(`items.${index}.stock`, "Error");
    }
    return false;
  }, [setValue, loadCategoryUnits, decimalPart, getValues]);

  const getRowOptions = useCallback((index: number) => {
    const stored = (watchedItems[index] as any);
    const storedValue = stored?.product;
    const storedName = stored?.productName;
    if (!storedValue || !storedName) return rawMaterials;
    const alreadyPresent = rawMaterials.some((o: any) => o.value === storedValue);
    if (alreadyPresent) return rawMaterials;

    const label = stored.code ? `[${stored.code}] ${storedName}` : storedName;
    return [...rawMaterials, { label, value: storedValue, code: stored.code || "" }];
  }, [rawMaterials, watchedItems]);

  const handleGridUnitChange = async (index: number, unitId: string) => {
    setValue(`items.${index}.unit`, unitId);
    setValue(`items.${index}.unitId`, Number(unitId));
    const productId = getValues(`items.${index}.product`);
    if (!productId || !unitId) return;

    try {
      const result = await productionApi.getUnitCost(Number(productId), Number(unitId)).catch(() => null);
      if (result && result.cost !== undefined && result.cost !== null) {
        setValue(`items.${index}.cost`, Number(result.cost).toFixed(decimalPart));
      }

    } catch (error) {
      console.error("Failed to fetch unit cost", error);
    }
  };

  const [isBomLoading, setIsBomLoading] = useState(false);

  const loadBom = async () => {
    const vals = getValues();
    const formBranchId = Number(vals.branchId);
    if (!vals.finishedProduct || !vals.branchId || isNaN(formBranchId)) {
      showToast("Please select a Branch and Finished Product first.", "error");
      return;
    }
    
    try {
      setIsBomLoading(true);
      const bomCheck = await productionApi.getBomDetails({
        BranchId: formBranchId,
        ProductId: Number(vals.finishedProduct),
        UnitId: Number(vals.finishedProductUnit)
      });

      if (bomCheck && bomCheck.length > 0) {
        const transId = bomCheck[0].transId;
        const bomData = await productionApi.getBomDataById(transId);
        
        if (bomData && bomData.detailsData) {
          remove();
          
          const newItems = [];
          for (const item of bomData.detailsData) {
            let itemCost = 0;
            let unitCategory = "";
            try {
               const costData = await productionApi.getProductCostData(item.barcode || item.code || String(item.productId));
               itemCost = costData.cost;
               unitCategory = costData.unitCategory || "";
               if (unitCategory) {
                 await loadCategoryUnits(unitCategory);
               }
            } catch (err) {
               itemCost = item.cost || 0;
            }

            newItems.push({
              id: generateUUID(),
              product: String(item.productId),
              productName: item.productName || item.itemName || item.name || "",
              code: item.barcode || item.code || "",
              unit: String(item.unitId),
              unitCategory,
              qty: String(item.qty),
              cost: Number(itemCost).toFixed(decimalPart),
              productId: item.productId,
              unitId: item.unitId
            });
          }
          append(newItems);
          showToast("BOM applied and costs updated successfully", "success");
        }
      } else {
        showToast("No BOM found for this product and unit.", "warning");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load BOM", "error");
    } finally {
      setIsBomLoading(false);
    }
  };

  // React Query Mutation for Save
  const saveMutation = useMutation({
    mutationFn: async (data: ProductionForm) => {
      const fpVal = finishedProductUnits.find(u => String(u.value) === String(data.finishedProductUnit))?.currentValue ?? 1;
      const payload: ProductionPayload = {
        transId: initialTransId || 0,
        productionDate: new Date().toISOString().split('T')[0],
        productId: Number(data.finishedProduct),
        unitId: Number(data.finishedProductUnit),
        qty: Number(data.finishedProductQty),
        cost: totals.grandTotal,
        totalWage: Number(data.otherCharge),
        amount: totals.grandTotal,
        baseQty: Number(data.finishedProductQty) * fpVal,
        branchId: Number(data.branchId),
        employeeId: Number(data.employeeId),
        narration: data.narration || "",
        createdAt: new Date().toISOString(),
        details: data.items.filter(item => item.product).map(item => {
          const uId = Number(item.unitId || item.unit);
          const uVal = (() => {
            for (const units of Object.values(categoryUnits)) {
              const found = units.find(u => String(u.value) === String(uId));
              if (found && !isNaN(found.currentValue)) return found.currentValue;
            }
            return 1;
          })();
          return {
            productId: Number(item.productId || item.product),
            unitId: uId,
            qty: Number(item.qty),
            cost: Number(item.cost),
            amount: Number(item.qty) * Number(item.cost),
            baseQty: Number(item.qty) * uVal
          };
        })
      };

      if (initialTransId) {
        payload.transId = initialTransId;
        await productionApi.updateProduction(initialTransId, payload);
      } else {
        await productionApi.createProduction(payload);
      }
    },
    onSuccess: () => {
      showToast(`Production ${initialTransId ? "updated" : "saved"} successfully!`, "success");
      queryClient.invalidateQueries({ queryKey: ["productionList"] });
      if (!initialTransId) {
        reset();
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || "Failed to save production", "error");
    }
  });

  const getFirstErrorMsg = (errObj: any): string | undefined => {
    if (!errObj) return undefined;
    if (typeof errObj === "string") return errObj;
    if (errObj.message && typeof errObj.message === "string") return errObj.message;
    if (Array.isArray(errObj)) {
      for (const item of errObj) {
        const msg = getFirstErrorMsg(item);
        if (msg) return msg;
      }
    }
    if (typeof errObj === "object") {
      for (const key in errObj) {
        const msg = getFirstErrorMsg(errObj[key]);
        if (msg) return msg;
      }
    }
    return undefined;
  };

  const onSubmit = handleSubmit((data) => {
    saveMutation.mutate(data);
  }, (errors) => {
    // Show validation errors via toast
    const msg = getFirstErrorMsg(errors);
    if (msg) {
      showToast(msg, "error");
    } else {
      showToast("Please fill in all required fields properly", "error");
    }
  });

  return {
    form,
    items,
    append,
    remove,
    update,
    totals,
    isLoadingInitialData,
    isSaving: saveMutation.isPending,
    finishedProducts,
    rawMaterials,
    branches,
    employees,
    finishedProductUnits,
    categoryUnits,
    handleFinishedProductSelect,
    handleGridProductSelect,
    handleGridUnitChange,
    handleBarcodeScan,
    getRowOptions,
    loadBom,
    isBomLoading,
    onSubmit,
    masterData: { units: allUnits },
    isBranchLocked,
  };
};
