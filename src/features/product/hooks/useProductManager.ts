import { useMemo, useState } from "react";
import { emptyAlternative, emptyProductForm, initialProducts } from "../constants";
import type { ProductAlternative, ProductForm, ProductRecord } from "../types";

const normalizeProductForm = (form: ProductForm): ProductForm => ({
  productName: form.productName.trim(),
  arabicName: form.arabicName.trim(),
  productCode: form.productCode.trim(),
  category: form.category.trim(),
  subCategory: form.subCategory.trim(),
  type: form.type.trim(),
  unit: form.unit.trim(),
  pVat: form.pVat.trim(),
  sVat: form.sVat.trim(),
  cost: form.cost.trim(),
  branch: form.branch.trim(),
  note: form.note.trim(),
  isActive: form.isActive,
});

export const useProductManager = () => {
  const [products, setProducts] = useState<ProductRecord[]>(initialProducts);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
  const [alternatives, setAlternatives] = useState<ProductAlternative[]>([]);
  const [alternativeDraft, setAlternativeDraft] = useState<Omit<ProductAlternative, "id">>(
    emptyAlternative
  );

  const setField = <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setAlternativeField = <K extends keyof Omit<ProductAlternative, "id">>(
    key: K,
    value: Omit<ProductAlternative, "id">[K]
  ) => {
    setAlternativeDraft((prev) => ({ ...prev, [key]: value }));
  };

  const resetForm = () => {
    setForm(emptyProductForm);
    setEditingId(null);
    setImagePreview(undefined);
    setAlternatives([]);
    setAlternativeDraft(emptyAlternative);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setOpen(true);
  };

  const addAlternative = () => {
    if (!alternativeDraft.branch || !alternativeDraft.altName) {
      return;
    }

    setAlternatives((prev) => [...prev, { id: Date.now(), ...alternativeDraft }]);
    setAlternativeDraft(emptyAlternative);
  };

  const removeAlternative = (id: number) => {
    setAlternatives((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    if (!form.productName || !form.productCode || !form.category || !form.branch) {
      return;
    }

    const payload = normalizeProductForm(form);

    if (editingId) {
      setProducts((prev) =>
        prev.map((item) =>
          item.id === editingId
            ? { ...item, ...payload, alternatives, image: imagePreview }
            : item
        )
      );
    } else {
      setProducts((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...payload,
          alternatives,
          image: imagePreview,
        },
      ]);
    }

    closeModal();
  };

  const handleEdit = (record: ProductRecord) => {
    setEditingId(record.id);
    setForm({
      productName: record.productName,
      arabicName: record.arabicName,
      productCode: record.productCode,
      category: record.category,
      subCategory: record.subCategory,
      type: record.type,
      unit: record.unit,
      pVat: record.pVat,
      sVat: record.sVat,
      cost: record.cost,
      branch: record.branch,
      note: record.note,
      isActive: record.isActive,
    });
    setAlternatives(record.alternatives);
    setImagePreview(record.image);
    setOpen(true);
  };

  const handleDelete = (record: ProductRecord) => {
    setProducts((prev) => prev.filter((item) => item.id !== record.id));

    if (editingId === record.id) {
      resetForm();
    }
  };

  const handleDeactivate = () => {
    if (!editingId) {
      return;
    }

    setProducts((prev) =>
      prev.map((item) => (item.id === editingId ? { ...item, isActive: false } : item))
    );
    setForm((prev) => ({ ...prev, isActive: false }));
  };

  const handleImageSelect = (file: File | null) => {
    if (!file) {
      setImagePreview(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(typeof reader.result === "string" ? reader.result : undefined);
    };
    reader.readAsDataURL(file);
  };

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;

    return products.filter((item) =>
      [item.productName, item.productCode, item.category, item.subCategory, item.branch].some(
        (value) => value.toLowerCase().includes(query)
      )
    );
  }, [products, search]);

  return {
    form,
    open,
    search,
    editingId,
    alternativeDraft,
    alternatives,
    imagePreview,
    filteredProducts,
    setSearch,
    setField,
    setAlternativeField,
    resetForm,
    closeModal,
    openCreateModal,
    addAlternative,
    removeAlternative,
    handleSave,
    handleEdit,
    handleDelete,
    handleDeactivate,
    handleImageSelect,
  };
};
