import { useState, useMemo, useEffect } from "react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { internalStockTransferApi } from "../services/internalStockTransferApi";
import { useToast } from "../../../../app/providers/useToast";
import { generateUUID } from "../../../../utils/uuid";
import { formatAmount } from "../../../../utils/currency";
import { InternalStockTransferFormSchema, type InternalStockTransferForm, type InternalStockTransferLineItem, type InternalStockTransferPayload } from "../types";

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
  series: "",
  date: new Date().toISOString().split("T")[0],
  fromBranch: "",
  toBranch: "",
  salesman: "",
  items: [{ id: generateUUID(), product: "", code: "", unit: "", qty: "1", cost: "0" }],
};

export const useInternalStockTransfer = (id?: string) => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const methods = useForm<InternalStockTransferForm>({
    resolver: zodResolver(InternalStockTransferFormSchema),
    defaultValues: initialTransferForm,
    mode: "onChange",
  });

  const { control, reset, setValue, getValues, watch } = methods;

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const watchedBranch = watch("fromBranch");
  const watchedItems = useWatch({ control, name: "items" }) || [];
  
  // 1. Master Data Lookups
  const { data: branchesData, isLoading: loadingMaster } = useQuery({
    queryKey: ["internalStockTransferMaster"],
    queryFn: async () => {
      const [fromBranchRes, prodRes, unitsRes] = await Promise.all([
        internalStockTransferApi.getFromBranches(),
        internalStockTransferApi.getProductsByName(""),
        internalStockTransferApi.getUnits("Quantity").catch(() => []),
      ]);
      return {
        fromBranches: fromBranchRes.map((b: any) => ({ label: b.branchName, value: String(b.branchId) })),
        products: prodRes,
        productOptions: prodRes.map((p: any) => ({ label: p.productName, value: String(p.productId) })),
        units: unitsRes.map((u: any) => ({ label: u.name || u.unitName, value: String(u.unitId) })),
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  // 2. Branch-dependent data
  const { data: branchSpecificData, isLoading: loadingBranchSpecific } = useQuery({
    queryKey: ["internalStockTransferBranchSpecific", watchedBranch],
    queryFn: async () => {
      if (!watchedBranch) return { employees: [], toBranches: [], refNo: "" };
      const branchId = parseInt(watchedBranch, 10);
      const [empRes, toBranchRes, refRes] = await Promise.all([
        internalStockTransferApi.getEmployees(branchId).catch(() => []),
        internalStockTransferApi.getToBranches(branchId).catch(() => []),
        internalStockTransferApi.getRefNumber(branchId).catch(() => "")
      ]);
      return {
        employees: empRes.map((e: any) => ({ label: e.empName, value: String(e.empId) })),
        toBranches: toBranchRes.map((b: any) => ({ label: b.branchName, value: String(b.branchId) })),
        refNo: String(refRes || "")
      };
    },
    enabled: !!watchedBranch,
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
        series: master.narration || master.series || master.seriesName || "",
        refNo: String(master.refNo || transId || ""),
        date: master.transDate ? master.transDate.split("T")[0] : new Date().toISOString().split("T")[0],
        fromBranch: String(master.fromBranchId || master.branchId || ""),
        toBranch: String(master.toBranchId || ""),
        salesman: String(master.employeeId || ""),
      };

      if (details.length > 0) {
        const mappedItems: InternalStockTransferLineItem[] = details.map((d: any) => ({
          id: generateUUID(),
          productId: d.productId,
          product: String(d.productId),
          code: d.barcode || d.productCode || "",
          unitId: d.unitId,
          unit: d.unitName || String(d.unitId || ""),
          qty: String(d.qty || "1"),
          cost: formatAmount(d.cost || d.price || 0)
        }));
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
    if (!id && branchesData?.fromBranches && branchesData.fromBranches.length > 0 && !getValues("fromBranch")) {
      setValue("fromBranch", branchesData.fromBranches[0].value);
    }
  }, [branchesData, id, setValue, getValues]);

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
    if (!branchesData?.products) return;
    const product = branchesData.products.find((p: any) => String(p.productId) === productIdStr);
    
    if (product) {
      const code = product.barcode || product.code || "";
      setValue(`items.${index}.code`, code);
      setValue(`items.${index}.cost`, "0");
      
      try {
        const costData = await internalStockTransferApi.getProductCostData(code);
        if (costData) {
          setValue(`items.${index}.unitId`, costData.baseUnitId);
          setValue(`items.${index}.unit`, String(costData.baseUnitId));
          setValue(`items.${index}.cost`, formatAmount(costData.cost || 0));
        }
      } catch (err) {
        console.error("Failed to load product details", err);
      }
    }
  };

  const handleBarcodeScan = async (index: number, barcode: string) => {
    try {
      const pRes = await internalStockTransferApi.getProductsByBarcode(barcode);
      if (pRes && pRes.length > 0) {
        const pIdStr = String(pRes[0].productId);
        setValue(`items.${index}.product`, pIdStr);
        await handleProductSelect(index, pIdStr);
      }
    } catch (err) {
      console.error("Barcode scan failed", err);
    }
  };

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
        narration: data.series || "",
        createdAt: new Date().toISOString(),
        details: validItems.map(item => ({
          productId: parseInt(item.product, 10) || 0,
          unitId: item.unitId || parseInt(item.unit || "1", 10) || 1,
          qty: toNumber(item.qty),
          price: toNumber(item.cost),
          amount: toNumber(item.qty) * toNumber(item.cost),
          baseQty: toNumber(item.qty)
        }))
      };

      if (id) {
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

  const masterData = {
    fromBranches: branchesData?.fromBranches || [],
    toBranches: branchSpecificData?.toBranches || [],
    employees: branchSpecificData?.employees || [],
    products: branchesData?.products || [],
    productOptions: branchesData?.productOptions || [],
    units: branchesData?.units || [],
  };

  const grandTotal = useMemo(() => {
    return watchedItems.reduce((sum: number, item: any) => {
      const line = calculateLine(item as any);
      return sum + line.amount;
    }, 0);
  }, [watchedItems]);

  return {
    methods,
    fields,
    append,
    remove,
    masterData,
    loadingMaster: loadingMaster || loadingBranchSpecific || loadingRecord,
    saving,
    grandTotal,
    handleProductSelect,
    handleBarcodeScan,
    handleReset,
    onSubmit,
    watchedItems,
    isPrintModalOpen,
    setIsPrintModalOpen
  };
};
