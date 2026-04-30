import { useState } from "react";
import { productService } from "../services/productService";
import { useToast } from "../../../../app/providers/useToast";

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
}

export const useProductActions = ({ formState, altState, productList }: ProductActionsDeps) => {
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
          cost: String(p.cost ?? "0"),
          branchId: String(p.branchId ?? ""),
          isActive: p.isActive ?? true,
          fileName: p.fileName ?? "",
          filePath: p.filePath ?? "",
        });

        if (p.filePath) {
          // Calculate base URL from API URL (strip /api)
          const apiUrl = import.meta.env.VITE_API_BASE_URL || "";
          const baseUrl = apiUrl 
            ? apiUrl.replace(/\/api\/?$/, "") 
            : "http://84.255.173.131:8068";
            
          // Strip /api if it exists at the start of the filePath returned by server
          const cleanPath = p.filePath.replace(/^\/?api\//i, "").replace(/^\//, "");
          
          let fullUrl = p.filePath.startsWith("http") 
            ? p.filePath 
            : `${baseUrl}/${cleanPath}`;
            
          // Clean up any other potential double slashes
          fullUrl = fullUrl.replace(/([^:]\/)\/+/g, "$1");
          
          console.log("[Product Image Debug] Full URL:", fullUrl);
          formState.setImagePreview(fullUrl);
        }
      }
      
      const detailRecord = detail as unknown as Record<string, unknown>;
      const altData = detailRecord.altProducts ?? detailRecord.altproduct;
      if (altData && Array.isArray(altData)) {
        altState.setAlternatives(
          altData.map((alt: Record<string, unknown>, idx: number) => ({
            ...alt,
            id: (alt.id as number) || Date.now() + idx,
            price: String(alt.price ?? "0"),
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
        branchId: parseInt(String(form.branchId)) || 1,
        isActive: form.isActive !== false,
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
