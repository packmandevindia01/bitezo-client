import { useEffect, useState } from "react";
import { INITIAL_CONFIG } from "../../../general/configuration/constants";
import type { ConfigurationState, DeliveryCharge } from "../../../general/configuration/types";
import { useToast } from "../../../../app/providers/useToast";
import { getEmployeeNames } from "../../../general/employee/services/employeeService";
import { posConfigApi } from "../../services/posConfigApi";
import type { PosConfigResponseData, PosConfigUpdatePayload } from "../../services/posConfigApi";

export interface ConfigurationEmployeeOption {
  label: string;
  value: string;
}

const mapApiToState = (data: PosConfigResponseData): ConfigurationState => {
  const configs = data?.configs || {};
  return {
    ...INITIAL_CONFIG,
    discCalc: (configs.discountCalc as any) || "Exclusive",
    kotHeader: (configs.kotHeader as any) || "QTY,DESCRIPTION,AMT",
    kotArabic: configs.kotArabic === "Enable",
    billArabic: configs.billArabic === "Enable",
    kotPrintSettle: configs.kotPrintSettle === "Enable",
    billCopies: configs.billCopies || 1,
    packagerPrint: configs.packagerPrint === "Enable",
    callerIdPort: configs.callerIdPort || "",
    priceView: (configs.priceView as any) || "Exclusive",
    cashdrawer: (configs.cashdrawer as any) || "Default",
    recipe: configs.recipe === "Enable",
    itemSeparationAfterEdit: configs.itemSeperationEdit === "Enable",
    multiEmployeeTable: configs.multiEmployeeTable === "Enable",
    customerTakeout: configs.customerTakeout === "Enable",
    kotPrint: configs.kotPrint === "Enable",
    displayPort: configs.displayPort || "",
    printPrice: (configs.printPrice as any) || "Exclusive",
    deliverySettle: configs.deliverySettle === "Enable",
    showDeliveryRecall: configs.showDeliveryRecall === "Enable",
    colorChangeGuestPrint: configs.colorChangeGuestPrint === "Enable",
    masterKot: configs.masterKot === "Enable",
    masterKotBillPrinter: configs.masterKotBillPrinter === "Enable",
    companyNameKOT: configs.companyNameKot === "Enable",
    locationWisePrice: configs.locationWisePrice === "Enable",
    alternativeOrder: (configs.alternativeOrder as any) || "Id",
    packagerHeader: configs.packagerHeader === "Enable",
    serviceCharge: configs.serviceCharges || 0,
    levy: configs.levy || 0,
    defaultDeliveryCharge: configs.deliveryCharge || 0,
    defaultEmployee: configs.defaultEmployee === "Enable",
    employeeId: configs.employeeId ? String(configs.employeeId) : "",
    groupInMenu: configs.showGroup === "Enable",
    providerOwnMenuStatus: configs.providerOwnStatus ?? true,

    dayEnd: {
      category: configs.categoryDayend === "Enable",
      voucherEntry: configs.voucherEntryDayend === "Enable",
      orderType: configs.orderTypeDayend === "Enable",
      employee: configs.employeeDayend === "Enable",
      voidItem: configs.voidItemDayend === "Enable",
      denomination: configs.denominationDayend === "Enable",
      product: configs.productDayend === "Enable",
      group: configs.groupDayend === "Enable",
      driver: configs.driverDayend === "Enable",
    },

    multiDeliveryCharges: Array.isArray(data?.deliverycharges) 
      ? data.deliverycharges.map(d => ({
          id: d.chargeName,
          name: d.chargeName,
          charge: d.chargeValue
        }))
      : []
  };
};

const mapStateToApi = (state: ConfigurationState, branchId: number): PosConfigUpdatePayload => {
  return {
    branchId,
    discountCalc: state.discCalc,
    kotHeader: state.kotHeader,
    kotArabic: state.kotArabic ? "Enable" : "Disable",
    billArabic: state.billArabic ? "Enable" : "Disable",
    kotPrintSettle: state.kotPrintSettle ? "Enable" : "Disable",
    billCopies: Number(state.billCopies) || 1,
    packagerPrint: state.packagerPrint ? "Enable" : "Disable",
    callerIdPort: state.callerIdPort,
    priceView: state.priceView,
    cashdrawer: state.cashdrawer,
    recipe: state.recipe ? "Enable" : "Disable",
    itemSeperationEdit: state.itemSeparationAfterEdit ? "Enable" : "Disable",
    multiEmployeeTable: state.multiEmployeeTable ? "Enable" : "Disable",
    customerTakeout: state.customerTakeout ? "Enable" : "Disable",
    kotPrint: state.kotPrint ? "Enable" : "Disable",
    displayPort: state.displayPort,
    printPrice: state.printPrice,
    deliverySettle: state.deliverySettle ? "Enable" : "Disable",
    showDeliveryRecall: state.showDeliveryRecall ? "Enable" : "Disable",
    colorChangeGuestPrint: state.colorChangeGuestPrint ? "Enable" : "Disable",
    masterKot: state.masterKot ? "Enable" : "Disable",
    masterKotBillPrinter: state.masterKotBillPrinter ? "Enable" : "Disable",
    companyNameKot: state.companyNameKOT ? "Enable" : "Disable",
    locationWisePrice: state.locationWisePrice ? "Enable" : "Disable",
    alternativeOrder: state.alternativeOrder,
    packagerHeader: state.packagerHeader ? "Enable" : "Disable",
    
    categoryDayend: state.dayEnd.category ? "Enable" : "Disable",
    voucherEntryDayend: state.dayEnd.voucherEntry ? "Enable" : "Disable",
    orderTypeDayend: state.dayEnd.orderType ? "Enable" : "Disable",
    employeeDayend: state.dayEnd.employee ? "Enable" : "Disable",
    voidItemDayend: state.dayEnd.voidItem ? "Enable" : "Disable",
    denominationDayend: state.dayEnd.denomination ? "Enable" : "Disable",
    productDayend: state.dayEnd.product ? "Enable" : "Disable",
    groupDayend: state.dayEnd.group ? "Enable" : "Disable",
    driverDayend: state.dayEnd.driver ? "Enable" : "Disable",

    serviceCharges: Number(state.serviceCharge) || 0,
    levy: Number(state.levy) || 0,
    deliveryCharge: Number(state.defaultDeliveryCharge) || 0,
    defaultEmployee: state.defaultEmployee ? "Enable" : "Disable",
    employeeId: Number(state.employeeId) || 0,
    showGroup: state.groupInMenu ? "Enable" : "Disable",
    providerOwnStatus: state.providerOwnMenuStatus,

    deliveryCharges: state.multiDeliveryCharges.map(d => ({
      chargeName: d.name,
      chargeValue: Number(d.charge) || 0
    }))
  };
};

export const usePosConfiguration = () => {
  const { showToast } = useToast();
  const [form, setForm] = useState<ConfigurationState>(INITIAL_CONFIG);
  const [employeeOptions, setEmployeeOptions] = useState<ConfigurationEmployeeOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const branchId = Number(localStorage.getItem("systemBranchId")) || Number(localStorage.getItem("activeBranchId")) || Number(localStorage.getItem("branchId")) || 0;
        
        // Fetch employees and pos config concurrently
        const [employees, posConfigRes] = await Promise.all([
          getEmployeeNames(branchId).catch((e) => { console.error(e); return []; }),
          posConfigApi.getPosConfig(branchId).catch(() => null)
        ]);

        if (!active) return;

        setEmployeeOptions(
          employees.map((employee: any) => ({
            label: employee.empName,
            value: String(employee.empId),
          }))
        );

        if (posConfigRes?.data) {
          setForm(mapApiToState(posConfigRes.data));
        }
      } catch (error) {
        console.error("Failed to load POS configuration", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();

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
    setSaving(true);
    try {
      const branchId = Number(localStorage.getItem("systemBranchId")) || Number(localStorage.getItem("activeBranchId")) || Number(localStorage.getItem("branchId")) || 0;
      const payload = mapStateToApi(form, branchId);
      
      const res = await posConfigApi.updatePosConfig(payload);
      
      // Based on typical backend pattern, checking for isSuccess / success properties
      if (res && (res.isSuccess !== false)) {
        showToast("POS Configuration saved successfully", "success");
      } else {
        throw new Error(res.message || "Save failed");
      }
    } catch (error) {
      console.error(error);
      showToast("Failed to save POS configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    employeeOptions,
    saving,
    loading,
    setField,
    setDayEndField,
    addDeliveryCharge,
    removeDeliveryCharge,
    handleSave,
  };
};
