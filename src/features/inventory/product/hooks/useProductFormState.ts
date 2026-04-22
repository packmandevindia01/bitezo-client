import { useState } from "react";
import { emptyForm } from "../constants";
import type { ProductFormState } from "../types";

export const useProductFormState = () => {
  const [form, setForm] = useState<ProductFormState>(emptyForm);
  const [imagePreview, setImagePreview] = useState<string | undefined>(undefined);
  const [editingId, setEditingId] = useState<number | null>(null);

  const setField = <K extends keyof ProductFormState>(
    key: K, 
    value: ProductFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

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
    setForm((prev) => ({ 
      ...prev, 
      fileName: file.name, 
      filePath: "uploads/" + file.name 
    }));
  };

  const resetFormState = () => {
    setForm(emptyForm);
    setEditingId(null);
    setImagePreview(undefined);
  };

  return {
    form,
    setForm,
    imagePreview,
    setImagePreview,
    editingId,
    setEditingId,
    setField,
    handleImageSelect,
    resetFormState,
  };
};
