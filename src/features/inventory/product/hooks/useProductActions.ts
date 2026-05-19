import { useState } from "react";
import { productService } from "../services/productService";
import { useToast } from "../../../../app/providers/useToast";
import { getConfig } from "../../../../config";
import { formatAmount, getDecimalPart } from "../../../../utils/formatters";

interface ProductActionsDeps {
  formState: {
    form: any;
    editingId: number | null;
    resetFormState: () => void;
    setEditingId: (id: number) => void;
    setForm: (form: any) => void;
    setField: (key: any, value: any) => void;
    setImagePreview: (url: string | undefined) => void;
  };
  altState: {
    alternatives: any[];
    resetAlternatives: () => void;
    setAlternatives: (alts: any[]) => void;
  };
  productList: {
    fetchProducts: () => void;
  };
  branches: any[];
}

export const useProductActions = ({ formState, altState, productList, branches }: ProductActionsDeps) => {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ productId: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const resetForm = () => {
    formState.resetFormState();
    altState.resetAlternatives();
  };

  const handleEditById = async (id: number) => {
    resetForm();
    formState.setEditingId(id);
    setDetailLoading(true);
    try {
      const detail = await productService.getById(id);
      const productArr = Array.isArray(detail.product) ? detail.product : detail.product ? [detail.product] : [];
      const p = productArr[0];
      
      if (p) {
        const actualProductId = p.productId ?? (p as Record<string, unknown>).id;
        if (actualProductId) formState.setEditingId(actualProductId);

        formState.setForm({
          code: p.code ?? "",
          name: p.name ?? "",
          arabicName: p.arabicName ?? "",
          categoryId: String(p.categoryId ?? ""),
          subCatId: String(p.subCatId ?? (p as Record<string, unknown>).subcatId ?? ""),
          groupId: String(p.groupId ?? ""),
          typeId: String(p.typeId ?? "1"),
          unitId: String(p.unitId ?? ""),
          pVatId: String(p.pVatId ?? (p as Record<string, unknown>).pvatId ?? ""),
          sVatId: String(p.sVatId ?? (p as Record<string, unknown>).svatId ?? ""),
          cost: formatAmount(p.cost ?? 0, getDecimalPart()),
          price: formatAmount(p.price ?? 0, getDecimalPart()),
          barcode: p.barcode ?? "",
          branchId: String(p.branchId ?? ""),
          isActive: p.isActive ?? true,
          priceIsIncl: p.priceIsIncl ?? true,
          colorCode: p.colorCode ?? "#49293e",
          productColors: (detail.productColors ?? []).map((pc: any) => ({
            branchId: Number(pc.branchId),
            colorCode: pc.colorCode || "#49293e"
          })),
          fileName: p.fileName ?? "",
          filePath: p.filePath ?? "",
        });

        if (p.fileUrl || p.fileurl || p.filePath) {
          const rawUrl = p.fileUrl || p.fileurl || p.filePath;
          
          if (rawUrl.startsWith("http")) {
            formState.setImagePreview(rawUrl);
          } else {
            // Fallback for relative paths
            const apiUrl = getConfig().apiBaseUrl || "";
            const baseUrl = apiUrl.replace(/\/api\/?$/, "");
            const cleanPath = rawUrl.replace(/^\/?api\//i, "").replace(/^\//, "");
            let fullUrl = `${baseUrl}/${cleanPath}`;
            fullUrl = fullUrl.replace(/([^:]\/)\/+/g, "$1");
            formState.setImagePreview(fullUrl);
          }
        }
      }
      
      const detailRecord = detail as unknown as Record<string, unknown>;
      const altData = detailRecord.altProducts ?? detailRecord.altproduct;
      if (altData && Array.isArray(altData)) {
        altState.setAlternatives(
          altData.map((alt: Record<string, unknown>, idx: number) => ({
            ...alt,
            id: (alt.id as number) || Date.now() + idx,
            price: formatAmount((alt.price as string | number) ?? 0, getDecimalPart()),
          }))
        );
      }
    } catch (err: unknown) {
      const axErr = err as { apiStatus?: number };
      showToast(axErr.apiStatus === 409 ? "Conflict detected." : "Failed to load product details.", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async (onSuccess?: () => void) => {
    const { form, editingId } = formState;
    const { alternatives } = altState;

    if (!form.name || !form.code || !form.categoryId || !form.unitId || !form.branchId) {
      showToast("Please fill in all required fields.", "warning");
      return;
    }

    // ─── Custom Validation Rules ──────────────────────────────────────────
    // 1. Each unit must be unique per branch.
    // 2. 'All' branch units/barcodes restricted from individual branches.
    
    const ALL_BRANCH_ID = branches.find(b => 
      b.name?.toLowerCase() === "all" || b.branchName?.toLowerCase() === "all"
    )?.id ?? null;
    
    const unitBranchPairs = [
      { unitId: parseInt(String(form.unitId)), branchId: parseInt(String(form.branchId)), source: "Main Product" },
      ...alternatives.map((alt, i) => ({ 
        unitId: parseInt(alt.unitId), 
        branchId: parseInt(alt.branchId), 
        source: `Alternative Row ${i + 1}` 
      }))
    ];

    const barcodeBranchPairs = [
      { code: String(form.code || "").trim(), branchId: parseInt(String(form.branchId)), source: "Main Product" },
      ...alternatives.map((alt, i) => ({ 
        code: String(alt.barcode || "").trim(), 
        branchId: parseInt(alt.branchId), 
        source: `Alternative Row ${i + 1}` 
      }))
    ];

    // Validate Units (Ignore main product vs alternatives for the same branch, only check for duplicates within alternatives themselves)
    for (let i = 1; i < unitBranchPairs.length; i++) {
      const current = unitBranchPairs[i];
      for (let j = i + 1; j < unitBranchPairs.length; j++) {
        const other = unitBranchPairs[j];
        if (current.unitId === other.unitId) {
          // Rule 1: Unique per branch
          if (current.branchId === other.branchId) {
            showToast(`Validation Error: Unit assigned multiple times to the same branch in alternative products (${current.source} & ${other.source}).`, "warning");
            return;
          }
          // Rule 2: 'All' branch restriction
          if (ALL_BRANCH_ID !== null && (current.branchId === ALL_BRANCH_ID || other.branchId === ALL_BRANCH_ID)) {
            showToast(`Validation Error: Unit assigned to 'All' branch cannot be assigned to individual branches.`, "warning");
            return;
          }
        }
      }
    }

    // Validate Barcodes
    for (let i = 0; i < barcodeBranchPairs.length; i++) {
      const current = barcodeBranchPairs[i];
      if (!current.code) continue;
      
      for (let j = i + 1; j < barcodeBranchPairs.length; j++) {
        const other = barcodeBranchPairs[j];
        if (!other.code) continue;

        if (current.code.toLowerCase() === other.code.toLowerCase()) {
          // Rule 1: Unique per branch
          if (current.branchId === other.branchId) {
            showToast(`Validation Error: Barcode "${current.code}" assigned multiple times to the same branch.`, "warning");
            return;
          }
          // Rule 2: 'All' branch restriction
          if (ALL_BRANCH_ID !== null && (current.branchId === ALL_BRANCH_ID || other.branchId === ALL_BRANCH_ID)) {
            showToast(`Validation Error: Barcode "${current.code}" assigned to 'All' branch cannot be assigned to individual branches.`, "warning");
            return;
          }
        }
      }
    }

    setSaving(true);
    try {

      const basePayload = {
        code: String(form.code || "").trim(),
        name: String(form.name || "").trim(),
        arabicName: String(form.arabicName || "").trim(),
        categoryId: parseInt(String(form.categoryId)) || 1,
        subCatId: parseInt(String(form.subCatId)) || 0,
        groupId: parseInt(String(form.groupId)) || 1,
        typeId: parseInt(String(form.typeId)) || 1,
        unitId: parseInt(String(form.unitId)) || 1,
        pVatId: parseInt(String(form.pVatId)) || 0,
        sVatId: parseInt(String(form.sVatId)) || 0,
        cost: parseFloat(String(form.cost)) || 0,
        price: parseFloat(String(form.price)) || 0,
        barcode: String(form.barcode || "").trim(),
        branchId: parseInt(String(form.branchId)) || 1,
        isActive: form.isActive !== false,
        priceIsIncl: form.priceIsIncl !== false,
        colorCode: form.colorCode || "#49293e",
        productColors: form.productColors.map((pc: any) => ({
          branchId: parseInt(String(pc.branchId)) || 0,
          colorCode: pc.colorCode || "#49293e"
        })),
        altProducts: alternatives.map((alt: any) => ({
          unitId: parseInt(alt.unitId) || 0,
          barcode: alt.barcode || "",
          isIncl: alt.isIncl !== false,
          price: parseFloat(alt.price) || 0,
          altName: alt.altName || "",
          altArabic: alt.altArabic || "",
          branchId: parseInt(alt.branchId) || 1,
        })),
        imageFile: form.imageFile,
      };

      if (editingId) {
        await productService.update(editingId, {
          ...basePayload,
          productId: editingId,
          updatedAt: new Date().toISOString(),
          oldPath: form.filePath || "",
        } as any);
        showToast("Product updated successfully.", "success");
      } else {
        await productService.create({
          ...basePayload,
          createdAt: new Date().toISOString(),
        } as any);
        showToast("Product created successfully.", "success");
      }

      if (onSuccess) onSuccess();
      else resetForm();
      productList.fetchProducts();
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { message?: string; errors?: { message?: string }[] } }; message?: string };
      const apiMsg = axErr.response?.data?.message || axErr.response?.data?.errors?.[0]?.message;
      showToast(apiMsg || axErr.message || "Failed to save product.", "error");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await productService.remove(pendingDelete.productId);
      showToast("Product deleted successfully.", "success");
      setPendingDelete(null);
      productList.fetchProducts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete product.";
      showToast(msg, "error");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeactivate = async () => {
    const { editingId } = formState;
    if (!editingId) return;
    try {
      const detail = await productService.getById(editingId);
      const productArr = Array.isArray(detail.product) ? detail.product : detail.product ? [detail.product] : [];
      const p = productArr[0];
      if (p) {
        await productService.update(editingId, {
          ...p,
          isActive: false,
          updatedAt: new Date().toISOString(),
          altProducts: ((detail.altProducts as any[]) ?? []).map((alt: any) => ({ 
            ...alt, 
            price: alt.price ?? 0, 
            isIncl: alt.isIncl ?? true 
          })) as any
        });
        showToast("Product deactivated.", "success");
        formState.setField("isActive", false);
        productList.fetchProducts();
      }
    } catch {
      showToast("Deactivation failed.", "error");
    }
  };

  return {
    saving,
    detailLoading,
    deleting,
    pendingDelete,
    setPendingDelete,
    resetForm,
    handleEditById,
    handleSave,
    confirmDelete,
    handleDeactivate,
  };
};
