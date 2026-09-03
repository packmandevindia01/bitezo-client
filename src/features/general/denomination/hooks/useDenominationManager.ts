import { useCallback, useEffect, useState } from "react";
import { 
  fetchDenominations, 
  createDenominations,
  updateDenominations
} from "../services/denominationService";
import type { DenominationItem } from "../types";
import { useToast } from "../../../../app/providers/useToast";

export interface DenominationError {
  name?: string;
  value?: string;
}

export const useDenominationManager = () => {
  const [denominations, setDenominations] = useState<DenominationItem[]>([]);
  const [errors, setErrors] = useState<Record<number, DenominationError>>({});
  const [hasExistingData, setHasExistingData] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { showToast } = useToast();

  const loadData = useCallback(async () => {
    try {
      setInitialLoading(true);
      const data = await fetchDenominations();
      const items = data || [];
      setDenominations(items);
      setErrors({});
      setHasExistingData(items.length > 0);
    } catch (error) {
      console.error("Failed to fetch denominations:", error);
      setHasExistingData(false);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addRow = () => {
    setDenominations([...denominations, { name: "", value: 0 }]);
  };

  const removeRow = (index: number) => {
    setDenominations(denominations.filter((_, i) => i !== index));
    setErrors(prev => {
      const next: Record<number, DenominationError> = {};
      Object.keys(prev).forEach((keyStr) => {
        const k = Number(keyStr);
        if (k < index) next[k] = prev[k];
        else if (k > index) next[k - 1] = prev[k];
      });
      return next;
    });
  };

  const updateRow = (index: number, field: keyof DenominationItem, value: string | number) => {
    const updated = [...denominations];
    updated[index] = { ...updated[index], [field]: value };
    setDenominations(updated);

    if ((field === "name" || field === "value") && errors[index]?.[field]) {
      setErrors(prev => {
        const next = { ...prev };
        if (next[index]) {
          next[index] = { ...next[index], [field]: undefined };
          if (!next[index].name && !next[index].value) {
            delete next[index];
          }
        }
        return next;
      });
    }
  };

  const handleSave = async (): Promise<{ success: boolean; firstInvalidIndex?: number; firstInvalidField?: "name" | "value" }> => {
    if (denominations.length === 0) {
      showToast("Please add at least one denomination", "error");
      return { success: false };
    }

    const newErrors: Record<number, DenominationError> = {};
    let firstInvalidIndex = -1;
    let firstInvalidField: "name" | "value" | null = null;

    denominations.forEach((d, index) => {
      const rowErr: DenominationError = {};
      if (!d.name || d.name.trim() === "") {
        rowErr.name = "required";
      }
      if (d.value === undefined || d.value === null || d.value <= 0 || isNaN(Number(d.value))) {
        rowErr.value = "must be > 0";
      }
      if (rowErr.name || rowErr.value) {
        newErrors[index] = rowErr;
        if (firstInvalidIndex === -1) {
          firstInvalidIndex = index;
          firstInvalidField = rowErr.name ? "name" : "value";
        }
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      return { success: false, firstInvalidIndex, firstInvalidField: firstInvalidField || undefined };
    }

    try {
      setLoading(true);
      const sanitizedDenominations = denominations.map(({ name, value }) => ({ name: name.trim(), value }));
      const payload = { denominations: sanitizedDenominations };
      
      const result = hasExistingData 
        ? await updateDenominations(payload)
        : await createDenominations(payload);

      if (result.isSuccess) {
        showToast(result.message || "Denominations saved successfully", "success");
        loadData();
        return { success: true };
      } else {
        showToast(result.message || "Failed to save denominations", "error");
        return { success: false };
      }
    } catch (error: unknown) {
      console.error("Save error:", error);
      const axErr = error as { response?: { data?: { message?: string } }; message?: string };
      const serverMsg = axErr.response?.data?.message || axErr.message || "Failed to save denominations";
      showToast(serverMsg, "error");
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    denominations,
    errors,
    loading,
    initialLoading,
    addRow,
    removeRow,
    updateRow,
    handleSave,
    refresh: loadData
  };
};
