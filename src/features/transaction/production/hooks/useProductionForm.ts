/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo, useState, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { productionApi } from "../services/productionApi";
import { productionSchema } from "../types";
import type { ProductionForm, ProductionPayload } from "../types";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useToast } from "../../../../app/providers/useToast";

export const useProductionForm = (initialTransId?: number) => {
  const { decimalPart } = useCurrency();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  // Unit lists for Finished Product and Raw Material rows
  const [finishedProductUnits, setFinishedProductUnits] = useState<{ label: string; value: string }[]>([]);
  const [rawMaterialUnits, setRawMaterialUnits] = useState<{ label: string; value: string }[]>([]);

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
      product: "",
      code: "",
      unit: "",
      qty: "0",
      cost: Number(0).toFixed(decimalPart),
      otherCharge: Number(0).toFixed(decimalPart),
      narration: "",
      items: [],
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
  const watchedOtherCharge = useWatch({ control, name: "otherCharge" });
  const watchedBranchId = useWatch({ control, name: "branchId" });
  const watchedFinishedProductQty = useWatch({ control, name: "finishedProductQty" });

  // 3. Totals Calculation
  const totals = useMemo(() => {
    const currentItems = watchedItems || [];
    const itemTotal = currentItems.reduce((acc, item) => acc + (item.amount || 0), 0);
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
      return fp.map((p: any) => ({ label: p.productName, value: String(p.productId), code: p.barcode || p.code }));
    }
  });

  const { data: rawMaterials = [] } = useQuery({
    queryKey: ["rawMaterials"],
    queryFn: async () => {
      const rm = await productionApi.getRawMaterialProductListByName("");
      return rm.map((p: any) => ({ label: p.productName, value: String(p.productId), code: p.barcode || p.code }));
    }
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const bl = await productionApi.getBranchList();
      return bl.map((b: any) => ({ label: b.branchName, value: String(b.branchId) }));
    }
  });

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
      
      reset({
        branchId: String(master.branchId || ""),
        employeeId: String(master.employeeId || ""),
        finishedProduct: String(master.productId || ""),
        finishedProductUnit: String(master.unitId || ""),
        finishedProductUnitName: master.unitName || String(master.unitId || ""),
        finishedProductQty: String(master.qty || 1),
        otherCharge: Number(master.totalWage || 0).toFixed(decimalPart),
        narration: master.narration || "",
        items: details.map((item: any, idx: number) => ({
          id: idx,
          product: item.productName || String(item.productId),
          code: item.barcode || item.code || "",
          unit: item.unitName || String(item.unitId),
          qty: item.qty,
          cost: item.cost,
          amount: item.amount,
          productId: item.productId,
          unitId: item.unitId
        }))
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

    const branchIdNum = Number(getValues("branchId"));
    if (!branchIdNum) {
      showToast("Please select a branch first.", "error");
      return;
    }

    try {
      const costData = await productionApi.getProductCostData(prod.code);
      const unitsResp = await productionApi.getUnitListByName(costData.unitCategory);

      const unitOptions = unitsResp.map((u: any) => ({ label: u.name, value: String(u.unitId) }));
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

  const handleRawMaterialSelect = async (productId: string) => {
    setValue("product", productId);
    const prod = rawMaterials.find(p => p.value === productId);
    if (!prod) return;
    
    setValue("code", prod.code);
    const branchIdNum = Number(getValues("branchId"));
    if (!branchIdNum) {
      showToast("Please select a branch first.", "error");
      return;
    }

    try {
      const costData = await productionApi.getProductCostData(prod.code);
      const unitsResp = await productionApi.getUnitListByName(costData.unitCategory);

      const unitOptions = unitsResp.map((u: any) => ({ label: u.name, value: String(u.unitId) }));
      setRawMaterialUnits(unitOptions);

      // Default to baseUnitId
      setValue("unit", String(costData.baseUnitId));
      setValue("cost", Number(costData.cost).toFixed(decimalPart));
      setValue("qty", "1");
    } catch (err) {
      showToast("Failed to fetch material details", "error");
    }
  };

  const handleAddItem = () => {
    const vals = getValues();
    if (!vals.product || !vals.qty || !vals.cost || !vals.unit) {
      showToast("Please fill all raw material temporary fields", "warning");
      return;
    }
    const q = Number(vals.qty) || 0;
    const c = Number(vals.cost) || 0;
    const prod = rawMaterials.find(p => p.value === vals.product);
    const unitName = rawMaterialUnits.find(u => u.value === vals.unit)?.label || vals.unit;
    
    append({
      id: Date.now(),
      productId: Number(vals.product),
      product: prod ? prod.label : vals.product,
      code: vals.code || "",
      unitId: Number(vals.unit),
      unit: unitName,
      qty: q,
      cost: c,
      amount: q * c
    });

    // Reset temp fields
    setValue("product", "");
    setValue("code", "");
    setValue("unit", "");
    setValue("qty", "0");
    setValue("cost", Number(0).toFixed(decimalPart));
    setRawMaterialUnits([]);
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
            try {
               const costData = await productionApi.getProductCostData(item.barcode || item.code || String(item.productId));
               itemCost = costData.cost;
            } catch (err) {
               itemCost = item.cost || 0;
            }

            newItems.push({
              id: Date.now() + Math.random(),
              product: item.productName,
              code: item.barcode || item.code || "",
              unit: item.unitName || String(item.unitId),
              qty: item.qty,
              cost: itemCost,
              amount: item.qty * itemCost,
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
      const payload: ProductionPayload = {
        transId: initialTransId || 0,
        productionDate: new Date().toISOString().split('T')[0],
        productId: Number(data.finishedProduct),
        unitId: Number(data.finishedProductUnit),
        qty: Number(data.finishedProductQty),
        cost: totals.grandTotal,
        totalWage: Number(data.otherCharge),
        amount: totals.grandTotal,
        baseQty: Number(data.finishedProductQty),
        branchId: Number(data.branchId),
        employeeId: Number(data.employeeId),
        narration: data.narration || "",
        createdAt: new Date().toISOString(),
        details: data.items.map(item => ({
          productId: item.productId,
          unitId: item.unitId,
          qty: item.qty,
          cost: item.cost,
          amount: item.amount,
          baseQty: item.qty
        }))
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
    isSaving: saveMutation.isPending,
    finishedProducts,
    rawMaterials,
    branches,
    employees,
    finishedProductUnits,
    rawMaterialUnits,
    handleFinishedProductSelect,
    handleRawMaterialSelect,
    handleAddItem,
    loadBom,
    isBomLoading,
    onSubmit
  };
};
