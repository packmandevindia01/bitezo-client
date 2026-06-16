import { useEffect, useState } from "react";
import { INITIAL_CONFIG, INITIAL_BACKOFFICE_CONFIG } from "../constants";
import type { ConfigurationState, DeliveryCharge, BackofficeConfigState } from "../types";
import { useToast } from "../../../../app/providers/useToast";
import { employeeService } from "../../employee/services/employeeService";

export interface ConfigurationEmployeeOption {
  label: string;
  value: string;
}

export const useConfigurationManager = () => {
  const { showToast } = useToast();
  const [form, setForm] = useState<ConfigurationState>(INITIAL_CONFIG);
  const [backofficeForm, setBackofficeFormState] = useState<BackofficeConfigState>(INITIAL_BACKOFFICE_CONFIG);
  const [employeeOptions, setEmployeeOptions] = useState<ConfigurationEmployeeOption[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadEmployees = async () => {
      try {
        const employees = await employeeService.getEmployees();
        if (!active) return;
        setEmployeeOptions(
          employees.map((employee) => ({
            label: employee.empName,
            value: String(employee.empId),
          }))
        );
      } catch {
        if (active) setEmployeeOptions([]);
      }
    };

    void loadEmployees();

    return () => {
      active = false;
    };
  }, []);

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
    } catch {
      showToast("Failed to save configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  const setBackofficeField = <K extends keyof BackofficeConfigState>(
    key: K,
    value: BackofficeConfigState[K]
  ) => {
    setBackofficeFormState((prev) => ({ ...prev, [key]: value }));
  };

  return {
    form,
    backofficeForm,
    employeeOptions,
    saving,
    setField,
    setBackofficeField,
    setDayEndField,
    addDeliveryCharge,
    removeDeliveryCharge,
    handleSave,
  };
};
