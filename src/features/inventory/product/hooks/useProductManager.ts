import { useCallback, useEffect, useMemo, useState } from "react";
import { productService } from "../services/productService";
import { subCategoryService } from "../../subcategory/services/subCategoryService";
import { useToast } from "../../../../app/providers/useToast";
import type {
  AltProductDraft,
  AltProductItem,
  MasterItem,
  ProductFormState,
  ProductListItem,
} from "../types";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalMasterData } from "../../shared/store/masterDataSlice";

// ─── Constants ────────────────────────────────────────────────────────────────

const emptyForm: ProductFormState = {
  code: "",
  name: "",
  arabicName: "",
  categoryId: "",
  subCatId: "",
  groupId: "",
  typeId: "1",
  unitId: "",
  pVatId: "",
  sVatId: "",
  cost: "0",
  branchId: "",
  isActive: true,
};

const emptyAltDraft: Omit<AltProductDraft, "id"> = {
  unitId: 0,
  barcode: "",
  isIncl: true,
  price: "0",
  altName: "",
  altArabic: "",
  branchId: 0,
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export const useProductManager = () => {
  const { showToast } = useToast();

  // ── List ────────────────────────────────────────────────────────────────────
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // ── Master data (Redux) ───────────────────────────────────────────────────
  const { data: masterData, branches } = useAppSelector((state) => state.masterData);
  const dispatch = useAppDispatch();
  const [subCategories, setSubCategories] = useState<MasterItem[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);

  // ── Search ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");

  // ── Form ────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [alternatives, setAlternatives] = useState<AltProductDraft[]>([]);
  const [altDraft, setAltDraft] = useState<Omit<AltProductDraft, "id">>(emptyAltDraft);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);

  // ── Confirm delete ──────────────────────────────────────────────────────────
  const [pendingDelete, setPendingDelete] = useState<ProductListItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ─── Fetch product list ───────────────────────────────────────────────────

  const fetchProducts = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const data = await productService.list();
      setProducts(data);
    } catch (err) {
      setListError(err instanceof Error ? err.message : "Failed to load products.");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!masterData || branches.length === 0) {
      dispatch(fetchGlobalMasterData());
    }
    fetchProducts();
  }, [fetchProducts, dispatch, masterData, branches.length]);

  // ─── Category → SubCategory sync ─────────────────────────────────────────

  useEffect(() => {
    const catId = parseInt(form.categoryId);
    if (!catId) {
      setSubCategories([]);
      return;
    }

    setLoadingSubs(true);
    subCategoryService
      .getSubCategories(undefined, undefined, catId)
      .then((subs) => setSubCategories(subs.map((s) => ({ id: s.id, name: s.name }))))
      .catch(() => showToast("Failed to load sub categories.", "error"))
      .finally(() => setLoadingSubs(false));
  }, [form.categoryId, showToast]);

  // ─── Form helpers ─────────────────────────────────────────────────────────

  const setField = <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setAlternativeField = <K extends keyof Omit<AltProductDraft, "id">>(
    key: K,
    value: Omit<AltProductDraft, "id">[K]
  ) => {
    setAltDraft((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setAlternatives([]);
    setAltDraft(emptyAltDraft);
    setEditingId(null);
    setImagePreview(undefined);
  };

  const openCreateModal = () => {
    resetForm();
  };

  const closeModal = () => {
    resetForm();
  };

  // ─── Alternatives ─────────────────────────────────────────────────────────

  const addAlternative = () => {
    if (!altDraft.branchId || !altDraft.altName) {
      showToast("Please provide Branch and Alternative Name.", "warning");
      return;
    }
    setAlternatives((prev) => [...prev, { ...altDraft, id: Date.now() }]);
    setAltDraft(emptyAltDraft);
  };

  const removeAlternative = (id: number) => {
    setAlternatives((prev) => prev.filter((item) => item.id !== id));
  };

  const handleEditById = async (id: number) => {
    resetForm();
    setEditingId(id);
    setDetailLoading(true);
    try {
      const detail = await productService.getById(id);
      // API returns product as an array — take the first element
      const productArr = Array.isArray(detail.product) ? detail.product : detail.product ? [detail.product] : [];
      const p = productArr[0];
      if (p) {
        // Ensure we capture the ID even if the API returns 'id' instead of 'productId'
        const actualProductId = p.productId ?? (p as any).id;
        if (actualProductId) setEditingId(actualProductId);

        setForm({
          code: p.code ?? "",
          name: p.name ?? "",
          arabicName: p.arabicName ?? "",
          categoryId: String(p.categoryId ?? ""),
          // Handle both subCatId and subcatId
          subCatId: String(p.subCatId ?? (p as any).subcatId ?? ""),
          groupId: String(p.groupId ?? ""),
          typeId: String(p.typeId ?? "1"),
          unitId: String(p.unitId ?? ""),
          // Handle both pVatId/pvatId and sVatId/svatId
          pVatId: String(p.pVatId ?? (p as any).pvatId ?? ""),
          sVatId: String(p.sVatId ?? (p as any).svatId ?? ""),
          cost: String(p.cost ?? "0"),
          branchId: String(p.branchId ?? ""),
          isActive: p.isActive ?? true,
          fileName: p.fileName ?? "",
          filePath: p.filePath ?? "",
        });
      }
      const altProductsData = (detail as any).altProducts ?? (detail as any).altproduct;
      if (altProductsData && Array.isArray(altProductsData)) {
        setAlternatives(
          altProductsData.map((alt: any, idx: number) => ({
            ...alt,
            id: (alt as any).id || Date.now() + idx,
            branchId: alt.branchId ?? 0,
            barcode: alt.barcode ?? "",
            unitId: alt.unitId ?? 0,
            price: String(alt.price ?? "0"),
            altName: alt.altName ?? "",
            altArabic: alt.altArabic ?? "",
          }))
        );
      } else {
        setAlternatives([]);
      }
    } catch (err: any) {
      if (err.apiStatus === 409) {
        showToast("Conflict: A product with this code or barcode already exists.", "error");
      } else {
        showToast("Failed to load product details.", "error");
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEdit = (record: ProductListItem) => {
    handleEditById(record.productId);
  };

  const handleSave = async (onSuccess?: () => void) => {
    if (
      !form.name || 
      !form.code || 
      !form.categoryId || 
      !form.unitId || 
      !form.pVatId || 
      !form.sVatId || 
      !form.groupId || 
      !form.branchId || 
      !form.typeId || 
      form.cost === ""
    ) {
      showToast("Please fill in all required fields marked with *.", "warning");
      return;
    }

    // ─── Validation ────────────────────────────────────────────────────────
    
    // 1. Check for Duplicate Barcodes within the same branch
    const branchBarcodeMap = new Map<string, number[]>(); // key: branchId-barcode, value: row indices
    alternatives.forEach((alt, idx) => {
      const barcode = alt.barcode.trim();
      if (!barcode) return;
      
      const key = `${alt.branchId}-${barcode}`;
      if (branchBarcodeMap.has(key)) {
        branchBarcodeMap.get(key)?.push(idx + 1);
      } else {
        branchBarcodeMap.set(key, [idx + 1]);
      }
    });

    for (const [key, rows] of branchBarcodeMap.entries()) {
      if (rows.length > 1) {
        const branchId = key.split("-")[0];
        const branchName = branches.find(b => String(b.id) === branchId)?.name || `Branch ${branchId}`;
        showToast(`Duplicate barcode "${key.split("-")[1]}" found in ${branchName} (Rows: ${rows.join(", ")}).`, "error");
        return;
      }
    }

    // 2. Check for Duplicate Unit + Branch combinations
    // Include the main product in this check
    const mainBranchId = parseInt(form.branchId) || 0;
    const mainUnitId = parseInt(form.unitId) || 0;
    
    // Set of "branchId-unitId"
    const seenUnits = new Set<string>();
    seenUnits.add(`${mainBranchId}-${mainUnitId}`);

    for (let i = 0; i < alternatives.length; i++) {
      const alt = alternatives[i];
      const key = `${alt.branchId}-${alt.unitId}`;
      
      if (seenUnits.has(key)) {
        const branchName = branches.find(b => String(b.id) === String(alt.branchId))?.name || `Branch ${alt.branchId}`;
        const unitName = masterData?.unit.find(u => String(u.id) === String(alt.unitId))?.name || `Unit ${alt.unitId}`;
        
        if (alt.branchId === mainBranchId && alt.unitId === mainUnitId) {
          showToast(`The unit "${unitName}" for branch "${branchName}" is already defined as the main product unit.`, "error");
        } else {
          showToast(`Duplicate unit "${unitName}" found for branch "${branchName}" in alternative products.`, "error");
        }
        return;
      }
      seenUnits.add(key);
    }

    setSaving(true);
    try {
      // Explicitly map only required fields to avoid sending extra data (like 'unit' or 'branch' strings)
      const altProducts: AltProductItem[] = alternatives.map((alt) => ({
        unitId: alt.unitId,
        barcode: alt.barcode,
        isIncl: alt.isIncl,
        price: parseFloat(alt.price) || 0,
        altName: alt.altName,
        altArabic: alt.altArabic ?? "",
        branchId: alt.branchId,
      }));

      const payload = {
        code: form.code,
        name: form.name,
        arabicName: form.arabicName,
        categoryId: parseInt(form.categoryId),
        subCatId: parseInt(form.subCatId) || 0,
        groupId: parseInt(form.groupId) || 1,
        typeId: parseInt(form.typeId) || 1,
        unitId: parseInt(form.unitId),
        pVatId: parseInt(form.pVatId) || 0,
        sVatId: parseInt(form.sVatId) || 0,
        cost: parseFloat(form.cost) || 0,
        branchId: parseInt(form.branchId) || 1,
        fileName: form.fileName ?? "",
        filePath: form.filePath ?? "",
        isActive: form.isActive,
        altProducts,
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

      if (onSuccess) {
        onSuccess();
      } else {
        resetForm();
      }
      fetchProducts();
    } catch (err: any) {
      const msg = err.message || "Failed to save product.";
      if (err.apiStatus === 409) {
        showToast("Duplicate Value Error: This Code or Barcode is already in use.", "error");
      } else {
        showToast(msg, "error");
      }
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete (two-step confirm) ────────────────────────────────────────────

  /** Step 1: Trash icon click → open confirm dialog */
  const requestDelete = (record: ProductListItem) => {
    setPendingDelete(record);
  };

  /** Step 2a: User cancels */
  const cancelDelete = () => {
    setPendingDelete(null);
  };

  /** Step 2b: User confirms → call API */
  const confirmDelete = async () => {
    if (!pendingDelete) return;

    setDeleting(true);
    try {
      await productService.remove(pendingDelete.productId);
      showToast("Product deleted successfully.", "success");
      setPendingDelete(null);
      fetchProducts();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete product.";
      showToast(msg, "error");
      // Keep dialog open so user sees the error via toast; close anyway
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Deactivate ───────────────────────────────────────────────────────────

  const handleDeactivate = async () => {
    if (!editingId) return;
    try {
      const detail = await productService.getById(editingId);
      const productArr = Array.isArray(detail.product) ? detail.product : detail.product ? [detail.product] : [];
      const p = productArr[0];
      if (p) {
        await productService.update(editingId, {
          productId: p.productId,
          code: p.code,
          name: p.name,
          arabicName: p.arabicName ?? "",
          categoryId: p.categoryId,
          subCatId: p.subCatId,
          groupId: p.groupId,
          typeId: p.typeId,
          unitId: p.unitId,
          pVatId: p.pVatId,
          sVatId: p.sVatId,
          cost: p.cost,
          branchId: p.branchId,
          fileName: p.fileName,
          filePath: p.filePath,
          isActive: false,
          updatedAt: new Date().toISOString(),
          altProducts: (detail.altProducts ?? []).map(alt => ({
            ...alt,
            price: alt.price ?? 0,
            isIncl: alt.isIncl ?? true
          }))
        });
        showToast("Product deactivated.", "success");
        setForm((prev) => ({ ...prev, isActive: false }));
        fetchProducts();
      }
    } catch (err: any) {
      showToast("Deactivation failed: " + (err.message || "Unknown error"), "error");
    }
  };

  // ─── Image ────────────────────────────────────────────────────────────────

  const handleImageSelect = (file: File | null) => {
    if (!file) {
      setImagePreview(undefined);
      setForm((prev) => ({ ...prev, fileName: "", filePath: "" }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(typeof reader.result === "string" ? reader.result : undefined);
    };
    reader.readAsDataURL(file);
    setForm((prev) => ({ ...prev, fileName: file.name, filePath: "uploads/" + file.name }));
  };

  // ─── Search filter ────────────────────────────────────────────────────────

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    
    // 1. Filter
    const filtered = query
      ? products.filter((p) =>
          [p.name, p.code, p.category, p.group].some((v) =>
            v?.toLowerCase().includes(query)
          )
        )
      : [...products];

    // 2. Sort by productId descending (Latest first)
    // and Map to sequential S.No (1, 2, 3...)
    return filtered
      .sort((a, b) => b.productId - a.productId)
      .map((p, index) => ({
        ...p,
        sNo: index + 1,
      }));
  }, [products, search]);

  // ─── Public API ───────────────────────────────────────────────────────────

  return {
    form,
    search,
    editingId,
    alternativeDraft: altDraft,
    alternatives,
    imagePreview,
    filteredProducts,

    // UI state
    saving,
    detailLoading,
    listLoading,
    listError,

    // Master data
    masterData,
    branches,
    subCategories,
    loadingSubs,

    // Delete confirm
    pendingDelete,
    deleting,

    // Actions
    setSearch,
    setField,
    setAlternativeField,
    setAlternatives,
    resetForm,
    closeModal,
    openCreateModal,
    addAlternative,
    removeAlternative,
    handleSave,
    handleEdit,
    handleEditById,
    requestDelete,
    cancelDelete,
    confirmDelete,
    handleDeactivate,
    handleImageSelect,
    fetchProducts,
  } as const;
};