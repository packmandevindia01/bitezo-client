import { useState, useCallback, useMemo, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bomApi } from "../services/bomApi";
import { productService } from "../../../inventory/product/services/productService";
import { bomSchema } from "../types";
import type { BomForm, BomPayload } from "../types";
import { useToast } from "../../../../app/providers/useToast";
import { generateUUID } from "../../../../utils/uuid";

export const useBom = (initialTransId?: number) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [finishedProductUnits, setFinishedProductUnits] = useState<{ label: string; value: string }[]>([]);
  const [categoryUnits, setCategoryUnits] = useState<Record<string, { label: string; value: string }[]>>({});

  const loadCategoryUnits = useCallback(async (unitCategory: string) => {
    if (!unitCategory) return;
    setCategoryUnits(prev => {
      if (prev[unitCategory] !== undefined) return prev;
      
      bomApi.getUnitListByName(unitCategory).then(res => {
        setCategoryUnits(current => ({
          ...current,
          [unitCategory]: (res || []).map((u: any) => ({ label: u.name || u.unitName, value: String(u.unitId) }))
        }));
      }).catch(err => {
        console.error("Failed to load units for category", unitCategory, err);
      });
      
      return { ...prev, [unitCategory]: [] };
    });
  }, []);

  const form = useForm<BomForm>({
    resolver: zodResolver(bomSchema),
    defaultValues: {
      bomName: "",
      branchId: "",
      finishedProduct: "",
      finishedProductCode: "",
      finishedProductUnit: "",
      finishedProductUnitName: "",
      finishedProductQty: "1",
      items: [{ id: generateUUID(), product: "", code: "", unit: "", qty: "1" }],
    },
  });

  const { control, setValue, getValues, handleSubmit, reset } = form;

  const { fields: items, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedItems = useWatch({ control, name: "items" }) || [];
  const watchedFinishedProduct = useWatch({ control, name: "finishedProduct" });
  const watchedFinishedProductUnit = useWatch({ control, name: "finishedProductUnit" });


  const { data: finishedProducts = [] } = useQuery({
    queryKey: ["finishedProducts"],
    queryFn: async () => {
      const fp = await bomApi.getFinishedProductListByName("");
      return fp.map((p: any) => ({
        label: p.barcode || p.code ? `[${p.barcode || p.code}] ${p.productName}` : p.productName,
        value: String(p.productId),
        code: p.barcode || p.code
      }));
    }
  });

  const [scannedRawMaterials, setScannedRawMaterials] = useState<{ label: string; value: string; code?: string; barcode?: string }[]>([]);

  const { data: rawMaterialsQueryData = [] } = useQuery({
    queryKey: ["bomRawMaterials"],
    queryFn: async () => {
      const rm = await bomApi.getRawMaterialProductListByName("");
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
      const bl = await bomApi.getBranchList();
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

  // Load record in Edit mode
  const { isLoading: loadingRecord } = useQuery({
    queryKey: ["bomData", initialTransId],
    queryFn: async () => {
      if (!initialTransId) return null;
      const data = await bomApi.getBomById(initialTransId);
      const master = data.masterData || {};
      const details = data.detailsData || [];

      if (details.length > 0) {
        const mappedItems: any[] = [];
        for (const item of details) {
          const barcode = item.barcode || item.code || "";
          let unitCategory = "";
          if (barcode) {
            try {
              const costData = await bomApi.getProductCostData(barcode);
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
            productName: item.productName || item.name || item.productCode || "",
            code: item.barcode || item.code || "",
            unit: String(item.unitId),
            unitCategory,
            qty: String(item.qty || "1"),
            productId: item.productId,
            unitId: item.unitId,
          });
        }
        reset({
          bomName: master.bomName || "",
          branchId: String(master.branchId || ""),
          finishedProduct: String(master.productId || ""),
          finishedProductUnit: String(master.unitId || ""),
          finishedProductUnitName: master.unitName || String(master.unitId),
          finishedProductQty: String(master.qty || "1"),
          items: mappedItems,
        });
      }
      return data;
    },
    enabled: !!initialTransId,
  });

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
            const costData = await bomApi.getProductCostData(identifier);
            if (costData && costData.unitCategory) {
              const unitsResp = await bomApi.getUnitListByName(costData.unitCategory);
              const unitOptions = unitsResp.map((u: any) => ({ label: u.name, value: String(u.unitId) }));
              setFinishedProductUnits(unitOptions);

              if (watchedFinishedProductUnit) {
                const foundUnit = unitsResp.find((u: any) => String(u.unitId) === String(watchedFinishedProductUnit));
                if (foundUnit) {
                  setValue("finishedProductUnitName", foundUnit.name);
                }
              }
            }
          } catch (e) {
            console.error("Failed to sync edit mode units in BOM", e);
          }
        }
      }
    };
    syncEditModeData();
  }, [initialTransId, watchedFinishedProduct, watchedFinishedProductUnit, finishedProducts, finishedProductUnits.length, setValue, getValues]);

  const handleFinishedProductSelect = async (productId: string) => {
    setValue("finishedProduct", productId);
    const prod = finishedProducts.find(p => p.value === productId);
    if (!prod) return;

    const branchIdVal = getValues("branchId");
    if (!branchIdVal) {
      showToast("Please select a Branch first to load unit.", "warning");
      return;
    }

    try {
      const unitData = await bomApi.getProductUnitData(Number(branchIdVal), prod.code);
      
      setValue("finishedProductCode", prod.code || "-");
      
      const unitsResp = await bomApi.getUnitListByName(unitData.unitCategory);
      const unitOptions = unitsResp.map((u: any) => ({ label: u.name, value: String(u.unitId) }));
      setFinishedProductUnits(unitOptions);

      setValue("finishedProductUnit", String(unitData.unitId));
      const unitName = unitsResp.find((u: any) => u.unitId === unitData.unitId)?.name || unitData.unitCategory;
      setValue("finishedProductUnitName", unitName);
    } catch (err) {
      showToast("Failed to fetch product unit data", "error");
    }
  };

  const handleGridProductSelect = async (index: number, productId: string, barcode: string) => {
    setValue(`items.${index}.product`, productId);
    setValue(`items.${index}.productId`, Number(productId));

    const branchIdVal = getValues("branchId");
    if (!branchIdVal || !barcode) return;

    try {
      const unitData = await bomApi.getProductUnitData(Number(branchIdVal), barcode);
      if (unitData) {
        setValue(`items.${index}.code`, barcode || "-");
        setValue(`items.${index}.unitCategory`, unitData.unitCategory || "");
        setValue(`items.${index}.unitId`, unitData.unitId);
        setValue(`items.${index}.unit`, String(unitData.unitId));
        
        if (unitData.unitCategory) {
          loadCategoryUnits(unitData.unitCategory);
        }
      }
    } catch (err) {
      console.error("Failed to fetch product details", err);
    }
  };

  const handleBarcodeScan = useCallback(async (index: number, barcode: string) => {
    try {
      // Try barcode lookup first via cost data endpoint
      let details = await bomApi.getProductCostData(barcode).catch(() => null);
      
      // Fallback: search by name/code if barcode lookup fails
      if (!details) {
        const nameResults = await bomApi.getRawMaterialProductListByName(barcode).catch(() => []);
        if (nameResults && nameResults.length > 0) {
          const first = nameResults[0];
          const bcToUse = first.barcode || first.code || barcode;
          details = await bomApi.getProductCostData(bcToUse).catch(() => null);
          if (!details) {
            setScannedRawMaterials(prev => {
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
        if (details.unitCategory) {
          loadCategoryUnits(details.unitCategory);
        }
        return true;
      }
    } catch (e) {
      console.error("BOM barcode lookup failed", e);
    }
    return false;
  }, [setValue, loadCategoryUnits]);

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
  };

  const saveMutation = useMutation({
    mutationFn: async (data: BomForm) => {
      const payload: BomPayload = {
        bomName: data.bomName || "BOM",
        productId: Number(data.finishedProduct),
        unitId: Number(data.finishedProductUnit),
        qty: Number(data.finishedProductQty),
        branchId: Number(data.branchId),
        details: data.items.filter(item => item.product && item.product.trim() !== "").map(item => ({
          productId: Number(item.productId || item.product),
          unitId: Number(item.unitId || item.unit),
          qty: Number(item.qty),
          baseQty: Number(item.qty),
        }))
      };

      if (initialTransId) {
        payload.transId = initialTransId;
        payload.updatedAt = new Date().toISOString();
        await bomApi.updateBom(initialTransId, payload);
      } else {
        payload.createdAt = new Date().toISOString();
        await bomApi.createBom(payload);
      }
    },
    onSuccess: () => {
      showToast(`BOM ${initialTransId ? "updated" : "saved"} successfully!`, "success");
      queryClient.invalidateQueries({ queryKey: ["bomList"] });
      if (!initialTransId) {
        reset();
      }
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || "Failed to save BOM", "error");
    }
  });

  const onSubmit = handleSubmit((data) => {
    saveMutation.mutate(data);
  }, (errors) => {
    console.error("Validation errors:", errors);
    const hasMainErrors = errors.bomName || errors.branchId || errors.finishedProduct || errors.finishedProductUnit || errors.finishedProductQty;
    if (!hasMainErrors && errors.items) {
      showToast("Please add at least one raw material.", "warning");
    }
  });

  return {
    form,
    items,
    append,
    remove,
    loading: loadingRecord,
    saving: saveMutation.isPending,
    branches,
    finishedProducts,
    rawMaterials,
    finishedProductUnits,
    categoryUnits,
    handleFinishedProductSelect,
    handleGridProductSelect,
    handleGridUnitChange,
    handleBarcodeScan,
    getRowOptions,
    onSubmit,
    masterData: { units: allUnits },
  };
};
