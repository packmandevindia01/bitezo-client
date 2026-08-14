import { useState, useEffect } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { stockAdjustmentTypeApi } from "../services/stockAdjustmentTypeApi";
import type { StockAdjustmentType, StockAdjustmentTypePayload } from "../types";

export const useStockAdjustmentType = () => {
  const { showToast } = useToast();
  const [types, setTypes] = useState<StockAdjustmentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setFormState] = useState<StockAdjustmentTypePayload>({
    typeName: "",
    effect: ""
  });

  const [errors, setErrors] = useState<{ typeName?: string; effect?: string }>({});

  const setForm = (newForm: StockAdjustmentTypePayload) => {
    setFormState(newForm);
    // Clear errors immediately when valid value is entered
    setErrors((prev) => {
      const updated = { ...prev };
      if (newForm.typeName.trim() && updated.typeName) {
        delete updated.typeName;
      }
      if (newForm.effect.trim() && updated.effect) {
        delete updated.effect;
      }
      return updated;
    });
  };

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const data = await stockAdjustmentTypeApi.getAll();
      setTypes(data);
    } catch (err: any) {
      showToast(err.message || "Failed to load stock adjustment types", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const handleOpenModal = (typeToEdit?: StockAdjustmentType) => {
    setErrors({});
    if (typeToEdit) {
      setEditingId(typeToEdit.typeId);
      setFormState({
        typeName: typeToEdit.typeName,
        effect: typeToEdit.effect
      });
    } else {
      setEditingId(null);
      setFormState({
        typeName: "",
        effect: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setErrors({});
  };

  const handleClear = () => {
    setFormState({
      typeName: "",
      effect: ""
    });
    setErrors({});
  };

  const handleSave = async () => {
    const newErrors: { typeName?: string; effect?: string } = {};

    if (!form.typeName.trim()) {
      newErrors.typeName = "required";
    } else if (form.typeName.trim().length > 50) {
      newErrors.typeName = "Max 50 characters";
    }

    if (!form.effect.trim()) {
      newErrors.effect = "required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const isDuplicate = types.some(
      t => t.typeName.trim().toLowerCase() === form.typeName.trim().toLowerCase() && t.typeId !== editingId
    );
    if (isDuplicate) {
      setErrors({ typeName: "Already exists" });
      return;
    }

    setIsSaving(true);
    try {
      if (editingId) {
        await stockAdjustmentTypeApi.update(editingId, form);
        showToast("Stock Adjustment Type updated successfully", "success");
      } else {
        await stockAdjustmentTypeApi.create(form);
        showToast("Stock Adjustment Type created successfully", "success");
      }
      handleCloseModal();
      await fetchTypes();
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message || err?.response?.data?.title || err?.message || "Failed to save stock adjustment type";
      let message = typeof serverMsg === "string" ? serverMsg : "Failed to save stock adjustment type";

      if (message.toLowerCase().includes("duplicate") || message.toLowerCase().includes("already exist") || message.toLowerCase().includes("unique")) {
        setErrors({ typeName: "Already exists" });
      } else if (status === 400 || message.includes("400") || message.includes("ID mismatch") || message.includes("validation")) {
        showToast("Validation failed: unable to save Stock Adjustment Type due to invalid input or ID mismatch.", "error");
      } else if (status === 409 || status === 404 || message.includes("in use") || message.includes("conflict")) {
        showToast("This Stock Adjustment Type cannot be modified because it is actively used in transactions.", "error");
      } else {
        showToast(!message.includes("status code") ? message : "Failed to save stock adjustment type. It may be currently in use.", "error");
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (typeId: number) => {
    try {
      await stockAdjustmentTypeApi.delete(typeId);
      showToast("Stock Adjustment Type deleted successfully", "success");
      fetchTypes();
    } catch (err: any) {
      showToast(err.message || "Failed to delete stock adjustment type", "error");
    }
  };

  return {
    types,
    loading,
    form,
    setForm,
    errors,
    editingId,
    isModalOpen,
    isSaving,
    handleOpenModal,
    handleCloseModal,
    handleClear,
    handleSave,
    handleDelete,
  };
};
