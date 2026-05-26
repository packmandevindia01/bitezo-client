import { useCallback, useEffect, useState } from "react";
import { 
  fetchDenominations, 
  createDenominations,
  updateDenominations
} from "../services/denominationService";
import type { DenominationItem } from "../types";
import { useToast } from "../../../../app/providers/useToast";

export const useDenominationManager = () => {
  const [denominations, setDenominations] = useState<DenominationItem[]>([]);
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
  };

  const updateRow = (index: number, field: keyof DenominationItem, value: string | number) => {
    const updated = [...denominations];
    updated[index] = { ...updated[index], [field]: value };
    setDenominations(updated);
  };

  const handleSave = async () => {
    if (denominations.length === 0) {
      showToast("Please add at least one denomination", "error");
      return;
    }

    const isValid = denominations.every(d => d.name.trim() !== "" && d.value > 0);
    if (!isValid) {
      showToast("Please fill in all names and values must be greater than 0", "error");
      return;
    }

    try {
      setLoading(true);
      // Strip 'id' from objects if the backend doesn't expect them in the PUT/POST payload
      const sanitizedDenominations = denominations.map(({ name, value }) => ({ name: name.trim(), value }));
      const payload = { denominations: sanitizedDenominations };
      
      // If we already have items from backend, use PUT. Otherwise use POST.
      const result = hasExistingData 
        ? await updateDenominations(payload)
        : await createDenominations(payload);

      if (result.isSuccess) {
        showToast(result.message || "Denominations saved successfully", "success");
        loadData();
        return true;
      } else {
        showToast(result.message || "Failed to save denominations", "error");
        return false;
      }
    } catch (error: unknown) {
      console.error("Save error:", error);
      const axErr = error as { response?: { data?: { message?: string } }; message?: string };
      const serverMsg = axErr.response?.data?.message || axErr.message || "Failed to save denominations";
      showToast(serverMsg, "error");
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    denominations,
    loading,
    initialLoading,
    addRow,
    removeRow,
    updateRow,
    handleSave,
    refresh: loadData
  };
};
