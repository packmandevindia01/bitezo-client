import { useState } from "react";
import { INITIAL_CONFIG } from "../constants";
import type { ConfigurationState, DeliveryCharge } from "../types";
import { useToast } from "../../../../app/providers/useToast";

export const useConfigurationManager = () => {
  const { showToast } = useToast();
  const [form, setForm] = useState<ConfigurationState>(INITIAL_CONFIG);
  const [saving, setSaving] = useState(false);

  const setField = <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const setDayEndField = (key: keyof ConfigurationState["dayEnd"], value: boolean) => {
    setForm((prev) => ({
      ...prev,
      dayEnd: { ...prev.dayEnd, [key]: value },
    }));
  };

  const addDeliveryCharge = (name: string, charge: number) => {
    if (!name || charge <= 0) {
      showToast("Please provide a name and a positive charge amount.", "warning");
      return;
    }

    const newCharge: DeliveryCharge = {
      id: Date.now().toString(),
      name,
      charge,
    };

    setForm((prev) => ({
      ...prev,
      multiDeliveryCharges: [...prev.multiDeliveryCharges, newCharge],
    }));
    showToast(`Added delivery charge: ${name}`, "success");
  };

  const removeDeliveryCharge = (id: string) => {
    setForm((prev) => ({
      ...prev,
      multiDeliveryCharges: prev.multiDeliveryCharges.filter((c) => c.id !== id),
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      showToast("Configuration saved successfully", "success");
    } catch (error) {
      showToast("Failed to save configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    saving,
    setField,
    setDayEndField,
    addDeliveryCharge,
    removeDeliveryCharge,
    handleSave,
  };
};
