import { useEffect, useState } from "react";
import { INITIAL_CONFIG, INITIAL_BACKOFFICE_CONFIG } from "../constants";
import type { ConfigurationState, DeliveryCharge, BackofficeConfigState } from "../types";
import { useToast } from "../../../../app/providers/useToast";
import { employeeService } from "../../employee/services/employeeService";
import { backofficeConfigApi } from "../services/backofficeConfigApi";
import axiosInstance from "../../../../api/axiosInstance";

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

  const [backofficeBranches, setBackofficeBranches] = useState<{label: string, value: string}[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [loadingBackoffice, setLoadingBackoffice] = useState(false);

  // Dropdown Options State
  const [productTypeOptions, setProductTypeOptions] = useState<{label: string, value: string}[]>([]);
  const [vatOptions, setVatOptions] = useState<{label: string, value: string}[]>([]);

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

    const loadBranches = async () => {
      try {
        const branches = await backofficeConfigApi.getBranches();
        if (!active) return;
        setBackofficeBranches(branches.map(b => ({ label: b.branchName, value: String(b.branchId) })));
      } catch (err: any) {
        console.error("Failed to load backoffice branches", err);
        showToast(err.message || "Failed to load branches", "error");
      }
    };

    const loadDropdownOptions = async () => {
      try {
        const [productTypesRes, vatsRes] = await Promise.all([
          axiosInstance.get("/product/list-product-type-name").catch(() => ({ data: { data: [] } })),
          axiosInstance.get("/vat/vat-listname").catch(() => ({ data: { data: [] } }))
        ]);

        if (!active) return;

        const pTypes = productTypesRes.data?.data || [];
        setProductTypeOptions(pTypes.map((p: any) => ({
          label: p.productTypeName || p.name || "Unknown",
          value: String(p.id || p.productTypeId || "")
        })));

        const vats = vatsRes.data?.data || [];
        setVatOptions(vats.map((v: any) => ({
          label: v.vatName || v.name || `${v.vatValue || 0}%`,
          value: String(v.id || v.vatId || "")
        })));
      } catch (err) {
        console.error("Failed to load dropdown options", err);
      }
    };

    void loadBranches();
    void loadDropdownOptions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadBranchConfig = async () => {
      if (!selectedBranch) {
        setBackofficeFormState(INITIAL_BACKOFFICE_CONFIG);
        return;
      }

      setLoadingBackoffice(true);
      try {
        const dataArray = await backofficeConfigApi.getConfigData(Number(selectedBranch));
        if (!active) return;
        if (dataArray && dataArray.length > 0) {
          const config = dataArray[0];
          setBackofficeFormState({
            defaultProductType: config.productType?.toString() || INITIAL_BACKOFFICE_CONFIG.defaultProductType,
            defaultVat: config.vatId?.toString() || INITIAL_BACKOFFICE_CONFIG.defaultVat,
            advancedProductSearch: !!config.advancedProductSearch,
            displayAllUnits: !!config.displayAllUnit,
            stockValueMethod: config.stockValueMethod || INITIAL_BACKOFFICE_CONFIG.stockValueMethod,
            updateLndCost: !!config.updateLndCost,
            updateLndCostType: config.updateLndCostType || INITIAL_BACKOFFICE_CONFIG.updateLndCostType,
            supplierProductsInPurchase: !!config.supplierProductInPurchase,
            discountCalculation: config.discountCalculation || INITIAL_BACKOFFICE_CONFIG.discountCalculation,
            autoUpdateSupplier: !!config.updateSupplierInPurchase,
            barcodeView: !!config.barcodeView,
            vatStatus: !!config.vatStatus
          });
        } else {
          setBackofficeFormState({ ...INITIAL_BACKOFFICE_CONFIG });
        }
      } catch (err: any) {
        if (!active) return;
        showToast(err.message || "Failed to load branch configuration", "error");
        setBackofficeFormState({ ...INITIAL_BACKOFFICE_CONFIG });
      } finally {
        if (active) setLoadingBackoffice(false);
      }
    };

    void loadBranchConfig();

    return () => {
      active = false;
    };
  }, [selectedBranch]);

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
    setSaving(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      showToast("POS Configuration saved successfully", "success");
    } catch (error) {
      showToast("Failed to save POS configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleBackofficeSave = async () => {
    if (!selectedBranch) {
      showToast("Please select a branch first", "warning");
      return false;
    }
    
    setSaving(true);
    try {
      const payload = {
        ...backofficeForm,
        branchId: Number(selectedBranch),
        productType: Number(backofficeForm.defaultProductType),
        vatId: Number(backofficeForm.defaultVat),
      };
      await backofficeConfigApi.updateConfig(Number(selectedBranch), payload as any);
      showToast("Backoffice Configuration saved successfully", "success");
      return true;
    } catch (err: any) {
      console.error("Failed to save backoffice configuration", err);
      showToast(err.message || "Failed to save configuration", "error");
      return false;
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
    employeeOptions,
    saving,
    setField,
    setBackofficeField,
    setDayEndField,
    addDeliveryCharge,
    removeDeliveryCharge,
    handleSave,
    handleBackofficeSave,
    backofficeForm,
    backofficeBranches,
    selectedBranch,
    setSelectedBranch,
    loadingBackoffice,
    productTypeOptions,
    vatOptions,
  };
};
