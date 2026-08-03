/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useCallback, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeApi } from "../services/recipeApi";
import { productService } from "../../../inventory/product/services/productService";
import { recipeSchema } from "../types";
import type { RecipeForm, RecipePayload } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useToast } from "../../../../app/providers/useToast";
import { useNavigate } from "react-router-dom";
import { generateUUID } from "../../../../utils/uuid";
import { useBranchScope } from "../../../../hooks/useBranchScope";

export const useRecipeForm = (initialTransId?: number) => {
  const { isBranchLocked, initialBranchId } = useBranchScope();
  const { decimalPart } = useCurrency();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Unit lists for Finished Product and Raw Material rows
  const [finishedProductUnits, setFinishedProductUnits] = useState<{ label: string; value: string }[]>([]);
  const [categoryUnits, setCategoryUnits] = useState<Record<string, { label: string, value: string }[]>>({});

  const loadCategoryUnits = useCallback(async (unitCategory: string) => {
    if (!unitCategory) return;
    setCategoryUnits(prev => {
      if (prev[unitCategory]) return prev;
      recipeApi.getUnitListByName(unitCategory).then(res => {
        setCategoryUnits(current => ({
          ...current,
          [unitCategory]: (res || []).map((u: any) => ({ label: u.name || u.unitName, value: String(u.unitId) }))
        }));
      }).catch(err => {
        console.error("Failed to load units for category", unitCategory, err);
      });
      return prev;
    });
  }, []);

  // 1. Initialize React Hook Form
  const form = useForm<RecipeForm>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      branchId: isBranchLocked ? initialBranchId : "",
      finishedProduct: "",
      finishedProductCode: "",
      finishedProductUnit: "",
      finishedProductUnitName: "",
      finishedProductQty: "1",
      items: [{ id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: "0" }],
      excludeOrders: [],
    },
  });

  const { control, setValue, getValues, handleSubmit, reset } = form;

  // 2. Initialize Field Array for Raw Materials grid
  const { fields: items, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  // Watch values for dynamic totals and dependent queries
  const watchedItems = useWatch({ control, name: "items" }) || [];
  const watchedFinishedProductQty = useWatch({ control, name: "finishedProductQty" });
  const watchedFinishedProduct = useWatch({ control, name: "finishedProduct" });
  const watchedFinishedProductUnit = useWatch({ control, name: "finishedProductUnit" });

  // 3. Totals Calculation
  const totals = useMemo(() => {
    const currentItems = watchedItems || [];
    const grandTotal = currentItems.reduce((acc, item) => {
      const q = Number(item.qty) || 0;
      const c = Number(item.cost) || 0;
      return acc + (q * c);
    }, 0);
    const finQty = Number(watchedFinishedProductQty) || 0;
    const costPerUnit = finQty > 0 ? grandTotal / finQty : 0;

    return { grandTotal, costPerUnit };
  }, [watchedItems, watchedFinishedProductQty]);

  // 4. React Query Data Fetching
  const { data: finishedProducts = [] } = useQuery({
    queryKey: ["finishedProducts"],
    queryFn: async () => {
      const fp = await recipeApi.getFinishedProductListByName("");
      return fp.map((p: any) => ({
        label: p.barcode || p.code ? `[${p.barcode || p.code}] ${p.productName}` : p.productName,
        value: String(p.productId),
        code: p.barcode || p.code
      }));
    }
  });

  const [rawMaterials, setRawMaterials] = useState<{ label: string; value: string; code?: string; barcode?: string }[]>([]);
  const [searchingRawMaterials, setSearchingRawMaterials] = useState(false);

  const handleRawMaterialSearch = useCallback(async (query: string) => {
    setSearchingRawMaterials(true);
    try {
      const rm = await recipeApi.getRawMaterialProductListByName(query);
      const mapped = rm.map((p: any) => ({
        label: p.barcode || p.code ? `[${p.barcode || p.code}] ${p.productName}` : p.productName,
        value: String(p.productId),
        code: p.barcode || p.code || "",
        barcode: p.barcode || ""
      }));
      setRawMaterials(mapped);
    } catch (e) {
      console.error("Failed to search raw materials", e);
    } finally {
      setSearchingRawMaterials(false);
    }
  }, []);

  useQuery({
    queryKey: ["rawMaterialsInit"],
    queryFn: async () => {
      const rm = await recipeApi.getRawMaterialProductListByName("");
      const mapped = rm.map((p: any) => ({
        label: p.barcode || p.code ? `[${p.barcode || p.code}] ${p.productName}` : p.productName,
        value: String(p.productId),
        code: p.barcode || p.code || "",
        barcode: p.barcode || ""
      }));
      setRawMaterials(mapped);
      return mapped;
    }
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const bl = await recipeApi.getBranchList();
      return bl.map((b: any) => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

  const { data: allUnits = [] } = useQuery({
    queryKey: ["allUnits"],
    queryFn: async () => {
      const pm = await productService.loadMasterData().catch(() => null);
      return (pm?.unit || []).map((u: any) => ({ label: u.name || u.unitName || "", value: String(u.id || u.unitId) }));
    }
  });

  const { data: orderTypes = [] } = useQuery({
    queryKey: ["orderTypes"],
    queryFn: async () => {
      const ol = await recipeApi.getOrderTypes();
      return ol.map((o: any) => ({ label: o.providerName, value: String(o.providerId) }));
    }
  });

  const { data: recipeData, isLoading: isLoadingInitialData, isError: isInitialDataError, error: initialDataError } = useQuery({
    queryKey: ["recipeData", initialTransId],
    queryFn: async () => {
      if (!initialTransId) return null;
      const data = await recipeApi.getRecipeById(initialTransId);
      return data;
    },
    enabled: !!initialTransId,
  });

  useEffect(() => {
    const loadRecipeData = async () => {
      if (recipeData && initialTransId) {
        const master = recipeData.masterData || {};
        const details = recipeData.detailsData || [];
        const excludeOrderData = recipeData.excludeOrder || [];
        
        const masterExcludeOrders: number[] = [];
        const itemExcludeOrdersMap: Record<string, number[]> = {};

        excludeOrderData.forEach((eo: any) => {
          if (eo.productId === master.productId && eo.unitId === master.unitId) {
            masterExcludeOrders.push(eo.orderTypeId);
          } else {
            const key = `${eo.productId}-${eo.unitId}`;
            if (!itemExcludeOrdersMap[key]) itemExcludeOrdersMap[key] = [];
            itemExcludeOrdersMap[key].push(eo.orderTypeId);
          }
        });
        
        if (details.length > 0) {
          const mappedItems: any[] = [];
          for (const item of details) {
            const barcode = item.barcode || item.code || item.productCode || "";
            let unitCategory = "";
            if (barcode || item.productId) {
              try {
                const costData = await recipeApi.getProductCostData(barcode || String(item.productId));
                unitCategory = costData.unitCategory || "";
                if (unitCategory) {
                  await loadCategoryUnits(unitCategory);
                }
              } catch (e) {
                console.error("Failed to load unit category for detail item", item, e);
              }
            }
            mappedItems.push({
              id: generateUUID(),
              product: String(item.productId),
              productName: item.productName || item.name || "",
              code: barcode,
              unit: String(item.unitId),
              unitCategory,
              qty: String(item.qty || "1"),
              cost: Number(item.cost || 0).toFixed(decimalPart),
              productId: item.productId,
              unitId: item.unitId,
              excludeOrders: itemExcludeOrdersMap[`${item.productId}-${item.unitId}`] || []
            });
          }
          reset({
            branchId: String(master.branchId || ""),
            finishedProduct: String(master.productId || ""),
            finishedProductCode: master.barcode || master.productCode || master.code || "",
            finishedProductUnit: String(master.unitId || ""),
            finishedProductUnitName: (master as any).unitName || String(master.unitId || ""),
            finishedProductQty: String(master.qty || 1),
            items: mappedItems,
            excludeOrders: masterExcludeOrders
          });
        }
      }
    };
    
    loadRecipeData();
  }, [recipeData, initialTransId, reset]);

  useEffect(() => {
    if (!initialTransId && !getValues("branchId")) {
      if (isBranchLocked && initialBranchId) {
        setValue("branchId", initialBranchId);
      } else if (branches.length > 0) {
        setValue("branchId", branches[0].value);
      }
    }
  }, [initialTransId, isBranchLocked, initialBranchId, branches, setValue, getValues]);

  useEffect(() => {
    const syncEditModeData = async () => {
      if (initialTransId && watchedFinishedProduct && finishedProducts.length > 0) {
         const currentCode = getValues("finishedProductCode");
         const prod = finishedProducts.find(p => p.value === watchedFinishedProduct);
         if (prod && prod.code && !currentCode) {
           setValue("finishedProductCode", prod.code);
         }
         
         if (finishedProductUnits.length === 0) {
           try {
             const identifier = prod?.code || watchedFinishedProduct;
             const costData = await recipeApi.getProductCostData(identifier);
             const unitsResp = await recipeApi.getUnitListByName(costData.unitCategory);
             const unitOptions = unitsResp.map((u: any) => ({ label: u.name, value: String(u.unitId) }));
             setFinishedProductUnits(unitOptions);
             
             if (watchedFinishedProductUnit) {
               const foundUnit = unitsResp.find((u: any) => String(u.unitId) === String(watchedFinishedProductUnit));
               if (foundUnit) {
                 setValue("finishedProductUnitName", foundUnit.name);
               }
             }
           } catch (e) {
             console.error("Failed to sync edit mode units", e);
           }
         }
      }
    };
    syncEditModeData();
  }, [initialTransId, watchedFinishedProduct, watchedFinishedProductUnit, finishedProducts, finishedProductUnits.length, setValue, getValues]);

  // 5. Actions & Handlers
  const handleFinishedProductSelect = async (productId: string) => {
    setValue("finishedProduct", productId);
    const prod = finishedProducts.find(p => p.value === productId);
    if (!prod || !productId) {
      setValue("finishedProductCode", "");
      setValue("finishedProductUnit", "");
      setValue("finishedProductUnitName", "");
      setFinishedProductUnits([]);
      return;
    }

    setValue("finishedProductCode", prod.code || "");
    const identifier = prod.code || productId;

    try {
      const costData = await recipeApi.getProductCostData(identifier);
      const unitsResp = await recipeApi.getUnitListByName(costData.unitCategory);
      
      const unitOptions = unitsResp.map((u: any) => ({ label: u.name, value: String(u.unitId) }));
      setFinishedProductUnits(unitOptions);

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
    if (!productId || productId === "0") {
      setValue(`items.${index}.productId`, 0);
      setValue(`items.${index}.productName`, "");
      setValue(`items.${index}.code`, "");
      setValue(`items.${index}.unit`, "");
      setValue(`items.${index}.unitId`, 0);
      setValue(`items.${index}.unitCategory`, "");
      setValue(`items.${index}.cost`, "0");
      setValue(`items.${index}.amount`, 0);
      return;
    }

    setValue(`items.${index}.productId`, Number(productId));
    setValue(`items.${index}.code`, barcode || "");
    const identifier = barcode || productId;

    try {
      const costData = await recipeApi.getProductCostData(identifier);
      if (costData) {
        setValue(`items.${index}.unitCategory`, costData.unitCategory || "");
        setValue(`items.${index}.unitId`, costData.baseUnitId);
        setValue(`items.${index}.unit`, String(costData.baseUnitId));
        setValue(`items.${index}.cost`, Number(costData.cost).toFixed(decimalPart));
        
        if (costData.unitCategory) {
          loadCategoryUnits(costData.unitCategory);
        }
      }
    } catch (err) {
      console.error("Failed to fetch product details", err);
    }
  };

  const handleBarcodeScan = useCallback(async (index: number, barcode: string) => {
    try {
      let details = await recipeApi.getProductCostData(barcode).catch(() => null);
      if (!details) {
        const nameResults = await recipeApi.getRawMaterialProductListByName(barcode).catch(() => []);
        if (nameResults && nameResults.length > 0) {
          const first = nameResults[0];
          const bcToUse = first.barcode || first.code || barcode;
          details = await recipeApi.getProductCostData(bcToUse).catch(() => null);
          if (!details) {
            setRawMaterials(prev => {
              if (prev.some(o => o.value === String(first.productId))) return prev;
              return [...prev, { label: first.productName, value: String(first.productId), code: first.code || "", barcode: first.barcode || "" }];
            });
            setValue(`items.${index}.product`, String(first.productId));
            setValue(`items.${index}.productId`, first.productId);
            setValue(`items.${index}.productName`, first.productName);
            setValue(`items.${index}.code`, first.code || "");
            return true;
          }
        }
      }

      if (details) {
        setRawMaterials(prev => {
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
        return true;
      }
    } catch (e) {
      console.error("Recipe barcode lookup failed", e);
    }
    return false;
  }, [setValue, loadCategoryUnits, decimalPart]);

  const getRowOptions = useCallback((index: number) => {
    const stored = (watchedItems[index] as any);
    const storedValue = stored?.product;
    const storedName = stored?.productName;
    if (!storedValue || !storedName) return rawMaterials;
    const alreadyPresent = rawMaterials.some((o: any) => o.value === storedValue);
    if (alreadyPresent) return rawMaterials;
    return [{ label: storedName, value: storedValue }, ...rawMaterials];
  }, [rawMaterials, watchedItems]);

  const handleGridUnitChange = async (index: number, unitId: string) => {
    setValue(`items.${index}.unit`, unitId);
    setValue(`items.${index}.unitId`, Number(unitId));
    const productId = getValues(`items.${index}.product`);
    if (!productId || !unitId) return;

    try {
      // Try to fetch updated unit cost, fall back if API endpoint doesn't exist
      const result = await recipeApi.getUnitCost(Number(productId), Number(unitId)).catch(() => null);
      if (result && result.cost !== undefined && result.cost !== null) {
        setValue(`items.${index}.cost`, Number(result.cost).toFixed(decimalPart));
      }
    } catch (error) {
      console.error("Failed to fetch unit cost", error);
    }
  };

  // React Query Mutation for Save
  const saveMutation = useMutation({
    mutationFn: async (data: RecipeForm) => {
      const payload: RecipePayload = {
        productId: Number(data.finishedProduct),
        unitId: Number(data.finishedProductUnit),
        qty: Number(data.finishedProductQty),
        cost: totals.grandTotal,
        amount: totals.grandTotal,
        baseQty: Number(data.finishedProductQty),
        branchId: Number(data.branchId),
        details: data.items.filter(item => item.product).map(item => ({
          productId: Number(item.productId || item.product),
          unitId: Number(item.unitId || item.unit),
          qty: Number(item.qty),
          cost: Number(item.cost),
          amount: Number(item.qty) * Number(item.cost),
          baseQty: Number(item.qty)
        }))
      };

      const payloadExcludeOrders: any[] = [];
      if (data.excludeOrders && data.excludeOrders.length > 0) {
        data.excludeOrders.forEach(orderTypeId => {
          payloadExcludeOrders.push({
            orderTypeId: Number(orderTypeId),
            productId: Number(data.finishedProduct),
            unitId: Number(data.finishedProductUnit)
          });
        });
      }

      data.items.filter(item => item.product).forEach(item => {
        if (item.excludeOrders && item.excludeOrders.length > 0) {
          item.excludeOrders.forEach(orderTypeId => {
            payloadExcludeOrders.push({
              orderTypeId: Number(orderTypeId),
              productId: Number(item.productId || item.product),
              unitId: Number(item.unitId || item.unit)
            });
          });
        }
      });

      payload.excludeOrders = payloadExcludeOrders;

      if (initialTransId) {
        payload.transId = initialTransId;
        payload.updateAt = new Date().toISOString();
        await recipeApi.updateRecipe(initialTransId, payload);
      } else {
        payload.createdAt = new Date().toISOString();
        await recipeApi.createRecipe(payload);
      }
    },
    onSuccess: () => {
      showToast(`Recipe ${initialTransId ? "updated" : "saved"} successfully!`, "success");
      queryClient.invalidateQueries({ queryKey: ["recipeList"] });
      navigate("/dashboard/recipes");
    },
    onError: (err: any) => {
      let errorMsg = "Failed to save recipe";
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const firstKey = Object.keys(errors)[0];
        if (firstKey && errors[firstKey].length > 0) {
          errorMsg = errors[firstKey][0];
        }
      } else if (err.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err.message) {
        errorMsg = err.message;
      }
      showToast(errorMsg, "error");
    }
  });

  const onSubmit = handleSubmit((data) => {
    const validItems = data.items.filter(item => item.product);
    if (validItems.length === 0) {
      showToast("Please select at least one Raw Material.", "warning");
      return;
    }
    saveMutation.mutate(data);
  }, (errors) => {
    // Show validation errors via toast (supporting nested arrays like items)
    const findFirstError = (obj: any): string | undefined => {
      if (!obj) return undefined;
      if (obj.message) return obj.message as string;
      if (Array.isArray(obj)) {
        for (const item of obj) {
          const msg = findFirstError(item);
          if (msg) return msg;
        }
      } else if (typeof obj === "object") {
        for (const key in obj) {
          const msg = findFirstError(obj[key]);
          if (msg) return msg;
        }
      }
      return undefined;
    };
    
    const msg = findFirstError(errors);
    if (msg) {
      showToast(msg, "error");
    }
  });

  const handleReset = useCallback(() => {
    reset({
      branchId: isBranchLocked ? initialBranchId : "",
      finishedProduct: "",
      finishedProductCode: "",
      finishedProductUnit: "",
      finishedProductUnitName: "",
      finishedProductQty: "1",
      items: [{ id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: "0" }],
      excludeOrders: [],
    });
  }, [reset, isBranchLocked, initialBranchId]);

  return {
    form,
    items,
    append,
    remove,
    totals,
    isLoadingInitialData,
    isInitialDataError,
    initialDataError,
    isSaving: saveMutation.isPending,
    finishedProducts,
    rawMaterials,
    branches,
    orderTypes,
    finishedProductUnits,
    categoryUnits,
    handleFinishedProductSelect,
    handleGridProductSelect,
    handleGridUnitChange,
    handleBarcodeScan,
    getRowOptions,
    handleRawMaterialSearch,
    searchingRawMaterials,
    handleReset,
    onSubmit,
    masterData: { units: allUnits },
    isBranchLocked
  };
};
