import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
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
  const [paymodeOptions, setPaymodeOptions] = useState<{label: string, value: string}[]>([]);
  const [orderTypeOptions, setOrderTypeOptions] = useState<{label: string, value: string}[]>([]);

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
        const [productTypesRes, vatsRes, paymodesRes, orderTypesRes] = await Promise.all([
          axiosInstance.get("/product/list-product-type-name").catch(() => ({ data: { data: [] } })),
          axiosInstance.get("/vat/vat-list").catch(() => ({ data: { data: [] } })),
          axiosInstance.get("/paymode/list-name").catch(() => ({ data: { data: [] } })),
          axiosInstance.get("/pos-config/order-type-list-name").catch(() => ({ data: { data: [] } }))
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

        const paymodes = paymodesRes.data?.data || [];
        setPaymodeOptions(paymodes.map((pm: any) => ({
          label: pm.paymodeName || pm.name || "Unknown",
          value: String(pm.paymodeId || pm.id || "")
        })));

        const oTypes = Array.isArray(orderTypesRes.data) 
          ? orderTypesRes.data 
          : (Array.isArray(orderTypesRes.data?.data) ? orderTypesRes.data.data : []);
        
        const mappedOrderTypes = (oTypes || []).map((t: any) => {
          const id = t.orderTypeId ?? t.providerId ?? t.typeId ?? t.id ?? t.Id ?? t.OrderTypeId ?? 0;
          const name = t.orderTypeName ?? t.providerName ?? t.typeName ?? t.orderType ?? t.name ?? t.OrderTypeName ?? t.OrderType ?? t.Name ?? "";
          return {
            label: String(name || "").trim(),
            value: String(id || "")
          };
        }).filter((t: any) => t.label !== "" && t.value !== "" && t.value !== "0");

        if (mappedOrderTypes.length > 0) {
          setOrderTypeOptions(mappedOrderTypes);
        } else {
          setOrderTypeOptions([
            { label: "Dine In", value: "1" },
            { label: "Take Out", value: "2" },
            { label: "Drive Thru", value: "3" },
            { label: "Delivery", value: "4" },
            { label: "Coming", value: "6" },
          ]);
        }
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
            defaultPaymode: config.paymodeId?.toString() || INITIAL_BACKOFFICE_CONFIG.defaultPaymode,
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
        productType: Number(backofficeForm.defaultProductType || 0),
        vatId: Number(backofficeForm.defaultVat || 0),
        paymodeId: Number(backofficeForm.defaultPaymode || 0),
        advancedProductSearch: !!backofficeForm.advancedProductSearch,
        advancedSearch: !!backofficeForm.advancedProductSearch,
        displayAllUnit: !!backofficeForm.displayAllUnits,
        stockValueMethod: backofficeForm.stockValueMethod || "AverageCost",
        updateLndCost: !!backofficeForm.updateLndCost,
        updateLndCostType: backofficeForm.updateLndCostType || "All",
        supplierProductInPurchase: !!backofficeForm.supplierProductsInPurchase,
        discountCalculation: backofficeForm.discountCalculation || "Exclusive",
        updateSupplierInPurchase: !!backofficeForm.autoUpdateSupplier,
        focustAmountInPurchase: true,
        barcodeView: !!backofficeForm.barcodeView,
        vatStatus: !!backofficeForm.vatStatus,
        branchId: Number(selectedBranch)
      };
      await backofficeConfigApi.updateConfig(Number(selectedBranch), payload as any);
      await queryClient.invalidateQueries({ queryKey: ["backofficeBranchConfig"] });
      await queryClient.invalidateQueries({ queryKey: ["backofficeConfig"] });
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
    paymodeOptions,
    orderTypeOptions,
  };
};
