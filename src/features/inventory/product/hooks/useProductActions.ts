import { useState } from "react";
import { productService } from "../services/productService";
import { useToast } from "../../../../app/providers/useToast";

interface ProductActionsDeps {
  formState: any;
  altState: any;
  productList: any;
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
        const actualProductId = p.productId ?? (p as any).id;
        if (actualProductId) formState.setEditingId(actualProductId);

        formState.setForm({
          code: p.code ?? "",
          name: p.name ?? "",
          arabicName: p.arabicName ?? "",
          categoryId: String(p.categoryId ?? ""),
          subCatId: String(p.subCatId ?? (p as any).subcatId ?? ""),
          groupId: String(p.groupId ?? ""),
          typeId: String(p.typeId ?? "1"),
          unitId: String(p.unitId ?? ""),
          pVatId: String(p.pVatId ?? (p as any).pvatId ?? ""),
          sVatId: String(p.sVatId ?? (p as any).svatId ?? ""),
          cost: String(p.cost ?? "0"),
          branchId: String(p.branchId ?? ""),
          isActive: p.isActive ?? true,
          fileName: p.fileName ?? "",
          filePath: p.filePath ?? "",
        });
      }
      
      const altData = (detail as any).altProducts ?? (detail as any).altproduct;
      if (altData && Array.isArray(altData)) {
        altState.setAlternatives(
          altData.map((alt: any, idx: number) => ({
            ...alt,
            id: (alt as any).id || Date.now() + idx,
            price: String(alt.price ?? "0"),
          }))
        );
      }
    } catch (err: any) {
      showToast(err.apiStatus === 409 ? "Conflict detected." : "Failed to load product details.", "error");
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
      const isNew = !editingId;
      if (isNew) {
        const exists = await productService.checkCodeExists(form.code.trim());
        if (exists > 0) {
          showToast(`Code "${form.code}" already exists.`, "error");
          setSaving(false);
          return;
        }
      }

      const payload = {
        ...form,
        categoryId: parseInt(form.categoryId),
        subCatId: parseInt(form.subCatId) || 0,
        groupId: parseInt(form.groupId) || 1,
        typeId: parseInt(form.typeId) || 1,
        unitId: parseInt(form.unitId),
        pVatId: parseInt(form.pVatId) || 0,
        sVatId: parseInt(form.sVatId) || 0,
        cost: parseFloat(form.cost) || 0,
        branchId: parseInt(form.branchId) || 1,
        altProducts: alternatives.map((alt: any) => ({
          ...alt,
          price: parseFloat(alt.price) || 0
        })),
      };

      if (editingId) {
        await productService.update(editingId, {
          ...payload,
          productId: editingId,
          updatedAt: new Date().toISOString(),
        });
        showToast("Product updated successfully.", "success");
      } else {
        await productService.create({
          ...payload,
          createdAt: new Date().toISOString(),
        });
        showToast("Product created successfully.", "success");
      }

      if (onSuccess) onSuccess();
      else resetForm();
      productList.fetchProducts();
    } catch (err: any) {
      showToast(err.message || "Failed to save product.", "error");
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
    } catch (err: any) {
      showToast(err.message || "Failed to delete product.", "error");
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
          altProducts: (detail.altProducts ?? []).map((alt: any) => ({ 
            ...alt, 
            price: alt.price ?? 0, 
            isIncl: alt.isIncl ?? true 
          }))
        });
        showToast("Product deactivated.", "success");
        formState.setField("isActive", false);
        productList.fetchProducts();
      }
    } catch (err: any) {
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
