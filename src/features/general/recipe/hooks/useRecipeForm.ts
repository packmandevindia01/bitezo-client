/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useEffect, useState } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeApi } from "../services/recipeApi";
import { recipeSchema } from "../types";
import type { RecipeForm, RecipePayload } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useToast } from "../../../../app/providers/useToast";
import { useNavigate } from "react-router-dom";

export const useRecipeForm = (initialTransId?: number) => {
  const { decimalPart } = useCurrency();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Unit lists for Finished Product and Raw Material rows
  const [finishedProductUnits, setFinishedProductUnits] = useState<{ label: string; value: string }[]>([]);
  const [rawMaterialUnits, setRawMaterialUnits] = useState<{ label: string; value: string }[]>([]);

  // 1. Initialize React Hook Form
  const form = useForm<RecipeForm>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      branchId: "",
      finishedProduct: "",
      finishedProductCode: "",
      finishedProductUnit: "",
      finishedProductUnitName: "",
      finishedProductQty: "1",
      rawMaterial: "",
      code: "",
      unit: "",
      qty: "0",
      cost: Number(0).toFixed(decimalPart),
      amount: Number(0).toFixed(decimalPart),
      items: [],
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
  const watchedItems = useWatch({ control, name: "items" });
  const watchedFinishedProductQty = useWatch({ control, name: "finishedProductQty" });
  const watchTempQty = useWatch({ control, name: "qty" });
  const watchTempCost = useWatch({ control, name: "cost" });

  useEffect(() => {
    const q = Number(watchTempQty) || 0;
    const c = Number(watchTempCost) || 0;
    setValue("amount", (q * c).toFixed(decimalPart));
  }, [watchTempQty, watchTempCost, decimalPart, setValue]);

  // 3. Totals Calculation
  const totals = useMemo(() => {
    const currentItems = watchedItems || [];
    const grandTotal = currentItems.reduce((acc, item) => acc + (item.amount || 0), 0);
    const finQty = Number(watchedFinishedProductQty) || 0;
    const costPerUnit = finQty > 0 ? grandTotal / finQty : 0;

    return { grandTotal, costPerUnit };
  }, [watchedItems, watchedFinishedProductQty]);

  // 4. React Query Data Fetching
  const { data: finishedProducts = [] } = useQuery({
    queryKey: ["finishedProducts"],
    queryFn: async () => {
      const fp = await recipeApi.getFinishedProductListByName("");
      return fp.map((p: any) => ({ label: p.productName, value: String(p.productId), code: p.barcode || p.code }));
    }
  });

  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["rawMaterials"],
    queryFn: async () => {
      const rm = await recipeApi.getRawMaterialProductListByName("");
      return rm.map((p: any) => ({ label: p.productName, value: String(p.productId), code: p.barcode || p.code }));
    }
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const bl = await recipeApi.getBranchList();
      return bl.map((b: any) => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

  const { data: orderTypes = [] } = useQuery({
    queryKey: ["orderTypes"],
    queryFn: async () => {
      const ol = await recipeApi.getOrderTypes();
      return ol.map((o: any) => ({ label: o.providerName, value: String(o.providerId) }));
    }
  });

  // Fetch initial data if in Edit Mode
  const { isLoading: isLoadingInitialData, isError: isInitialDataError, error: initialDataError } = useQuery({
    queryKey: ["recipeData", initialTransId],
    queryFn: async () => {
      if (!initialTransId) return null;
      const data = await recipeApi.getRecipeById(initialTransId);
      const master = data.masterData || {};
      const details = data.detailsData || [];
      const excludeOrderData = data.excludeOrder || [];
      
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
      
      reset({
        branchId: String(master.branchId || ""),
        finishedProduct: String(master.productId || ""),
        finishedProductUnit: String(master.unitId || ""),
        finishedProductUnitName: (master as any).unitName || String(master.unitId || ""),
        finishedProductQty: String(master.qty || 1),
        items: details.map((item: any, idx: number) => ({
          id: idx,
          product: item.productName || String(item.productId),
          code: item.barcode || item.code || "",
          unit: item.unitName || String(item.unitId),
          qty: item.qty,
          cost: item.cost,
          amount: item.amount,
          productId: item.productId,
          unitId: item.unitId,
          excludeOrders: itemExcludeOrdersMap[`${item.productId}-${item.unitId}`] || []
        })),
        excludeOrders: masterExcludeOrders
      });
      return data;
    },
    enabled: !!initialTransId,
  });

  // 5. Actions & Handlers
  const handleFinishedProductSelect = async (productId: string) => {
    setValue("finishedProduct", productId);
    const prod = finishedProducts.find(p => p.value === productId);
    if (!prod) return;

    setValue("finishedProductCode", prod.code);
    if (!prod.code) return;

    try {
      const costData = await recipeApi.getProductCostData(prod.code);
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

  const handleRawMaterialSelect = async (productId: string) => {
    setValue("rawMaterial", productId);
    const prod = rawMaterials.find(p => p.value === productId);
    if (!prod) return;
    
    setValue("code", prod.code);

    try {
      const costData = await recipeApi.getProductCostData(prod.code);
      const unitsResp = await recipeApi.getUnitListByName(costData.unitCategory);
      
      const unitOptions = unitsResp.map((u: any) => ({ label: u.name, value: String(u.unitId) }));
      setRawMaterialUnits(unitOptions);

      const unitName = unitsResp.find((u: any) => u.unitId === costData.baseUnitId)?.name || costData.unitCategory;

      setValue("unit", String(costData.baseUnitId));
      setValue("unitName", unitName);
      setValue("cost", Number(costData.cost).toFixed(decimalPart));
      setValue("qty", "1");
    } catch (err) {
      showToast("Failed to fetch material details", "error");
    }
  };

  const handleAddItem = () => {
    const vals = getValues();
    if (!vals.rawMaterial || !vals.qty || !vals.cost || !vals.unit) {
      showToast("Please fill all raw material temporary fields", "warning");
      return;
    }
    const q = Number(vals.qty) || 0;
    const c = Number(vals.cost) || 0;
    const prod = rawMaterials.find(p => p.value === vals.rawMaterial);
    const resolvedUnitName = rawMaterialUnits.find(u => u.value === vals.unit)?.label || vals.unitName || vals.unit;
    
    append({
      id: Date.now(),
      productId: Number(vals.rawMaterial),
      product: prod ? prod.label : vals.rawMaterial,
      code: vals.code || "",
      unitId: Number(vals.unit),
      unit: resolvedUnitName,
      qty: q,
      cost: c,
      amount: q * c,
      excludeOrders: []
    });

    // Reset temp fields
    setValue("rawMaterial", "");
    setValue("code", "");
    setValue("unit", "");
    setValue("unitName", "");
    setValue("qty", "0");
    setValue("cost", Number(0).toFixed(decimalPart));
    setValue("amount", Number(0).toFixed(decimalPart));
    setRawMaterialUnits([]);
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
        details: data.items.map(item => ({
          productId: item.productId,
          unitId: item.unitId,
          qty: item.qty,
          cost: item.cost,
          amount: item.amount,
          baseQty: item.qty
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

      data.items.forEach(item => {
        if (item.excludeOrders && item.excludeOrders.length > 0) {
          item.excludeOrders.forEach(orderTypeId => {
            payloadExcludeOrders.push({
              orderTypeId: Number(orderTypeId),
              productId: Number(item.productId),
              unitId: Number(item.unitId)
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
    saveMutation.mutate(data);
  }, (errors) => {
    // Show validation errors via toast
    const firstError = Object.values(errors)[0];
    if (firstError?.message) {
      showToast(firstError.message as string, "error");
    }
  });

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
    rawMaterialUnits,
    handleFinishedProductSelect,
    handleRawMaterialSelect,
    handleAddItem,
    onSubmit
  };
};
