import { useEffect, useState, useCallback } from "react";
import { INITIAL_CONFIG } from "../../../general/configuration/constants";
import type { ConfigurationState, DeliveryCharge } from "../../../general/configuration/types";
import { useToast } from "../../../../app/providers/useToast";
import { getEmployeeNames, employeeService } from "../../../general/employee/services/employeeService";
import { subscribeToEmployeeUpdates } from "../../../general/employee/utils/employeeSync";
import { posConfigApi } from "../../services/posConfigApi";
import type { PosConfigResponseData, PosConfigUpdatePayload } from "../../services/posConfigApi";
import { branchApi } from "../../../inventory/branches/services/branchApi";
import { clearAllPosCache } from "./usePosProducts";
import { disableDefaultEmployeeConfig } from "../../utils/defaultEmployee";

export interface ConfigurationEmployeeOption {
  label: string;
  value: string;
}

export const mapApiToState = (data: PosConfigResponseData): ConfigurationState => {
  const configs = data?.configs || {};
  return {
    ...INITIAL_CONFIG,
    discCalc: (localStorage.getItem("discCalc") as any) || (configs.discCalc as any) || (configs.discountCalc as any) || "Exclusive",
    kotHeader: (configs.kotHeader as any) || "QTY,DESCRIPTION,AMT",
    kotArabic: configs.kotArabic === "Enable",
    billArabic: configs.billArabic === "Enable",
    kotPrintSettle: configs.kotPrintSettle === "Enable",
    billCopies: configs.billCopies || 1,
    packagerPrint: configs.packagerPrint === "Enable",
    callerIdPort: configs.callerIdPort || "",
    priceView: (localStorage.getItem("priceView") as any) || (configs.priceView as any) || "Exclusive",
    cashdrawer: (configs.cashdrawer as any) || "Default",
    recipe: configs.recipe === "Enable",
    dayDate: (configs.dayDate ?? configs.DayDate) === "Enable",
    itemSeperation: configs.itemSeperation === true || String(configs.itemSeperation).trim().toLowerCase() === "enable" || String(configs.itemSeperation).trim().toLowerCase() === "true" || (configs.itemSeperation as any) === 1,
    itemSeparationAfterEdit: configs.itemSeperationEdit === "Enable",
    otherKitchenItem: configs.otherKitchenItem === true || String(configs.otherKitchenItem).trim().toLowerCase() === "enable" || String(configs.otherKitchenItem).trim().toLowerCase() === "true" || (configs.otherKitchenItem as any) === 1,
    multiEmployeeTable: configs.multiEmployeeTable === "Enable",
    customerTakeout: configs.customerTakeout === "Enable",
    kotPrint: configs.kotPrint === "Enable",
    displayPort: configs.displayPort || "",
    printPrice: (localStorage.getItem("printPrice") as any) || (configs.printPrice as any) || "Exclusive",
    deliverySettle: configs.deliverySettle === "Enable",
    showDeliveryRecall: configs.showDeliveryRecall === "Enable",
    colorChangeGuestPrint: configs.colorChangeGuestPrint === "Enable",
    masterKot: configs.masterKot === "Enable",
    masterKotBillPrinter: configs.masterKotBillPrinter === "Enable",
    companyNameKOT: (() => {
      const stored = localStorage.getItem("companyNameKot") || localStorage.getItem("companyNameKOT");
      if (stored !== null) return stored === "Enable" || stored === "true" || stored === "1";
      const val = configs.companyNameKot ?? (configs as any)?.CompanyNameKot ?? (configs as any)?.companyNameKOT;
      return val === "Enable" || val === true || String(val).toLowerCase() === "true" || String(val).toLowerCase() === "enable";
    })(),
    locationWisePrice: configs.locationWisePrice === "Enable",
    alternativeOrder: (configs.alternativeOrder as any) || "Id",
    packagerHeader: configs.packagerHeader === "Enable",
    serviceCharge: configs.serviceCharges || 0,
    levy: configs.levy || 0,
    defaultDeliveryCharge: configs.deliveryCharge || 0,
    defaultEmployee: configs.defaultEmployee === "Enable",
    employeeId: configs.employeeId ? String(configs.employeeId) : "",
    defaultOrderTypeId: String(configs.defaultOrderTypeId ? configs.defaultOrderTypeId : 1),
    groupInMenu: configs.showGroup === "Enable",
    providerOwnMenuStatus: configs.providerOwnStatus ?? true,
    posLanguage: (() => {
      const stored = localStorage.getItem("posLanguage") || ((configs as any)?.posLanguage as any) || ((configs as any)?.PosLanguage as any);
      return stored === "Arabic" ? "Arabic" : stored === "Thai" ? "Thai" : "English";
    })(),
    productView: localStorage.getItem("productView") || ((configs as any)?.productView as any) || ((configs as any)?.ProductView as any) || "English",

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

export const mapStateToApi = (state: ConfigurationState, branchId: number): PosConfigUpdatePayload => {
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
    dayDate: state.dayDate ? "Enable" : "Disable",
    itemSeperation: Boolean(state.itemSeperation),
    itemSeperationEdit: state.itemSeparationAfterEdit ? "Enable" : "Disable",
    otherKitchenItem: Boolean(state.otherKitchenItem),
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
    isRecipeEnable: state.recipe,
    isDayDateEnable: state.dayDate,
    defaultOrderTypeId: Number(state.defaultOrderTypeId) || 1,

    posLanguage: state.posLanguage || "English",
    PosLanguage: state.posLanguage || "English",
    productView: state.productView || "English",
    ProductView: state.productView || "English",

    deliveryCharges: state.multiDeliveryCharges.map(d => ({
      chargeName: d.name,
      chargeValue: Number(d.charge) || 0
    }))
  };
};

export const usePosConfiguration = () => {
  const { showToast } = useToast();
  const [form, setForm] = useState<ConfigurationState>(() => ({
    ...INITIAL_CONFIG,
    posLanguage: (["Arabic", "Thai"].includes(localStorage.getItem("posLanguage") || "") ? (localStorage.getItem("posLanguage") as any) : "English"),
    productView: ((localStorage.getItem("productView") as any) || "English"),
  }));
  const [employeeOptions, setEmployeeOptions] = useState<ConfigurationEmployeeOption[]>([]);
  const [orderTypeOptions, setOrderTypeOptions] = useState<{ label: string; value: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshEmployees = useCallback(async (): Promise<{ empId: number; empName: string }[]> => {
    try {
      const branchId =
        Number(localStorage.getItem("systemBranchId")) ||
        Number(localStorage.getItem("activeBranchId")) ||
        Number(localStorage.getItem("branchId")) ||
        0;

      let employees = await getEmployeeNames(branchId).catch((e) => {
        console.error("Failed to fetch branch employee names:", e);
        return [];
      });

      if ((!employees || employees.length === 0) && branchId > 0) {
        employees = await getEmployeeNames().catch(() => []);
      }

      if (!employees || employees.length === 0) {
        const fullList = await employeeService.getEmployees().catch(() => []);
        employees = fullList.map((e: any) => ({
          empId: e.empId,
          empName: e.empName,
        }));
      }

      const empNameMap: Record<string, string> = {};
      employees.forEach((employee: any) => {
        const id = employee.empId ?? employee.id;
        const name = employee.empName ?? employee.name;
        if (id) {
          empNameMap[String(id)] = name || "";
        }
      });
      localStorage.setItem("posEmpNameMap", JSON.stringify(empNameMap));

      setEmployeeOptions(
        employees.map((employee: any) => ({
          label: employee.empName || employee.name,
          value: String(employee.empId || employee.id),
        }))
      );

      return employees;
    } catch (err) {
      console.error("Failed to refresh employees in POS Configuration:", err);
      return [];
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const branchId = Number(localStorage.getItem("systemBranchId")) || Number(localStorage.getItem("activeBranchId")) || Number(localStorage.getItem("branchId")) || 0;
        
        // Fetch employees, order types, pos config, and branch print layout concurrently
        const [employees, orderTypesRes, posConfigRes, printLinesRes] = await Promise.all([
          refreshEmployees(),
          posConfigApi.getOrderTypeList().catch((e) => { console.error(e); return []; }),
          posConfigApi.getPosConfig(branchId).catch(() => null),
          branchApi.fetchBranchPrintData(branchId).catch(() => null)
        ]);

        if (printLinesRes && Array.isArray(printLinesRes) && printLinesRes.length > 0) {
          localStorage.setItem("branchPrintData", JSON.stringify(printLinesRes));
        }

        if (!active) return;

        const empNameMap: Record<string, string> = {};
        employees.forEach((employee: any) => {
          if (employee.empId) {
            empNameMap[String(employee.empId)] = employee.empName || "";
          }
        });
        localStorage.setItem("posEmpNameMap", JSON.stringify(empNameMap));

        setEmployeeOptions(
          employees.map((employee: any) => ({
            label: employee.empName,
            value: String(employee.empId),
          }))
        );

        if (orderTypesRes && orderTypesRes.length > 0) {
          setOrderTypeOptions(
            orderTypesRes.map((t) => ({
              label: t.orderTypeName,
              value: String(t.orderTypeId),
            }))
          );
        } else {
          setOrderTypeOptions([
            { label: "Dine In", value: "1" },
            { label: "Take Out", value: "2" },
            { label: "Drive Thru", value: "3" },
            { label: "Delivery", value: "4" },
            { label: "Coming", value: "6" },
          ]);
        }

        if (posConfigRes?.data) {
          const stateData = mapApiToState(posConfigRes.data);
          try {
            const overrideRaw = localStorage.getItem("posDefaultEmployeeOverride");
            if (overrideRaw) {
              const override = JSON.parse(overrideRaw);
              if (override?.defaultEmployee === "Enable" && override?.employeeId) {
                stateData.defaultEmployee = true;
                stateData.employeeId = String(override.employeeId);
              }
            }
          } catch {}

          if (stateData.defaultEmployee && stateData.employeeId) {
            const exists = employees.some((e: any) => String(e.empId ?? e.id) === String(stateData.employeeId));
            if (!exists) {
              stateData.defaultEmployee = false;
              stateData.employeeId = "";
              disableDefaultEmployeeConfig("Default employee ID not found in branch employees during POS config load");
            }
          }
          setForm(stateData);
          if (stateData.kotHeader) {
            localStorage.setItem("kotHeader", stateData.kotHeader);
          }
          if (stateData.posLanguage) {
            localStorage.setItem("posLanguage", stateData.posLanguage);
          }
          if (stateData.productView) {
            localStorage.setItem("productView", stateData.productView);
          }
          if (stateData.companyNameKOT !== undefined) {
            localStorage.setItem("companyNameKot", stateData.companyNameKOT ? "Enable" : "Disable");
          }
        }
      } catch (error) {
        console.error("Failed to load POS configuration", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadData();

    // 1. Real-time cross-tab and local employee sync listener
    const unsubscribeEmployees = subscribeToEmployeeUpdates(() => {
      if (active) void refreshEmployees();
    });

    // 2. Refetch when switching back to this tab/window
    const handleFocus = () => {
      if (active && document.visibilityState === "visible") {
        void refreshEmployees();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      active = false;
      unsubscribeEmployees();
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [refreshEmployees]);

  const setField = <K extends keyof ConfigurationState>(key: K, value: ConfigurationState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "defaultEmployee" && value === true) {
      void refreshEmployees();
    }
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
      
      if (payload.kotHeader) {
        localStorage.setItem("kotHeader", payload.kotHeader);
      }
      if (payload.kotArabic) {
        localStorage.setItem("kotArabic", payload.kotArabic);
      }
      if (payload.billArabic) {
        localStorage.setItem("billArabic", payload.billArabic);
      }
      if (form.posLanguage) {
        localStorage.setItem("posLanguage", form.posLanguage);
      }
      if (form.productView) {
        localStorage.setItem("productView", form.productView);
      }
      if (form.priceView || payload.priceView) {
        localStorage.setItem("priceView", form.priceView || payload.priceView || "Exclusive");
      }
      if (form.printPrice || payload.printPrice) {
        localStorage.setItem("printPrice", form.printPrice || payload.printPrice || "Exclusive");
      }
      if (form.discCalc || payload.discountCalc) {
        localStorage.setItem("discCalc", form.discCalc || payload.discountCalc || "Exclusive");
        localStorage.setItem("discountCalc", form.discCalc || payload.discountCalc || "Exclusive");
      }
      if (payload.companyNameKot !== undefined) {
        localStorage.setItem("companyNameKot", payload.companyNameKot);
      }

      // ─── Frontend override for default employee ───────────────────────────────
      // The backend does not persist defaultEmployee/employeeId to the DB.
      // We store them locally and merge them into the config at runtime.
      if (form.defaultEmployee && form.employeeId) {
        const match = employeeOptions.find(e => e.value === form.employeeId);
        localStorage.setItem("posDefaultEmployeeOverride", JSON.stringify({
          defaultEmployee: "Enable",
          employeeId: Number(form.employeeId),
          employeeName: match?.label || ""
        }));
        if (match) {
          localStorage.setItem("defaultEmployeeName", match.label);
        }
      } else {
        localStorage.removeItem("posDefaultEmployeeOverride");
        localStorage.removeItem("defaultEmployeeName");
      }

      // Update local storage runtime posConfigs
      try {
        const saved = localStorage.getItem("posConfigs");
        const parsed = saved ? JSON.parse(saved) : {};
        if (parsed.configs) {
          parsed.configs.kotHeader = payload.kotHeader;
          parsed.configs.kotPrint = payload.kotPrint;
          parsed.configs.kotArabic = payload.kotArabic;
          parsed.configs.billArabic = payload.billArabic;
          parsed.configs.masterKot = payload.masterKot;
          parsed.configs.masterKotBillPrinter = payload.masterKotBillPrinter;
          parsed.configs.defaultOrderTypeId = payload.defaultOrderTypeId;
          parsed.configs.isRecipeEnable = payload.isRecipeEnable;
          parsed.configs.isDayDateEnable = payload.isDayDateEnable;
          parsed.configs.deliveryCharge = payload.deliveryCharge;
          parsed.configs.defaultDeliveryCharge = payload.deliveryCharge;
          parsed.configs.serviceCharges = payload.serviceCharges;
          parsed.configs.levy = payload.levy;
          parsed.configs.packagerPrint = payload.packagerPrint;
          parsed.configs.packagerHeader = payload.packagerHeader;

          parsed.configs.categoryDayend = payload.categoryDayend;
          parsed.configs.voucherEntryDayend = payload.voucherEntryDayend;
          parsed.configs.orderTypeDayend = payload.orderTypeDayend;
          parsed.configs.employeeDayend = payload.employeeDayend;
          parsed.configs.voidItemDayend = payload.voidItemDayend;
          parsed.configs.denominationDayend = payload.denominationDayend;
          parsed.configs.productDayend = payload.productDayend;
          parsed.configs.groupDayend = payload.groupDayend;
          parsed.configs.driverDayend = payload.driverDayend;
          parsed.configs.alternativeOrder = payload.alternativeOrder;
          parsed.configs.defaultEmployee = payload.defaultEmployee;
          parsed.configs.employeeId = payload.employeeId;
          parsed.configs.itemSeperation = payload.itemSeperation;
          parsed.configs.otherKitchenItem = payload.otherKitchenItem;
          parsed.configs.posLanguage = form.posLanguage || "English";
          parsed.configs.productView = form.productView || "English";
          parsed.configs.priceView = form.priceView || payload.priceView;
          parsed.configs.printPrice = form.printPrice || payload.printPrice;
          parsed.configs.discCalc = form.discCalc || payload.discountCalc;
          parsed.configs.discountCalc = form.discCalc || payload.discountCalc;
          parsed.configs.companyNameKot = payload.companyNameKot;
        }
        parsed.itemSeperation = payload.itemSeperation;
        parsed.otherKitchenItem = payload.otherKitchenItem;
        parsed.posLanguage = form.posLanguage || "English";
        parsed.productView = form.productView || "English";
        parsed.priceView = form.priceView || payload.priceView;
        parsed.printPrice = form.printPrice || payload.printPrice;
        parsed.discCalc = form.discCalc || payload.discountCalc;
        parsed.discountCalc = form.discCalc || payload.discountCalc;
        parsed.companyNameKot = payload.companyNameKot;
        localStorage.setItem("itemSeperation", payload.itemSeperation ? "true" : "false");
        localStorage.setItem("otherKitchenItem", payload.otherKitchenItem ? "true" : "false");
        parsed.kotHeader = payload.kotHeader;
        parsed.kotPrint = payload.kotPrint;
        parsed.kotArabic = payload.kotArabic;
        parsed.billArabic = payload.billArabic;
        parsed.masterKot = payload.masterKot;
        parsed.masterKotBillPrinter = payload.masterKotBillPrinter;
        if (payload.masterKot) {
          localStorage.setItem("masterKot", payload.masterKot);
        }
        if (payload.masterKotBillPrinter) {
          localStorage.setItem("masterKotBillPrinter", payload.masterKotBillPrinter);
        }
        parsed.deliveryCharge = payload.deliveryCharge;
        parsed.defaultDeliveryCharge = payload.deliveryCharge;
        parsed.deliverycharges = payload.deliveryCharges;
        parsed.serviceCharges = payload.serviceCharges;
        parsed.levy = payload.levy;
        parsed.packagerPrint = payload.packagerPrint;
        parsed.packagerHeader = payload.packagerHeader;

        parsed.categoryDayend = payload.categoryDayend;
        parsed.voucherEntryDayend = payload.voucherEntryDayend;
        parsed.orderTypeDayend = payload.orderTypeDayend;
        parsed.employeeDayend = payload.employeeDayend;
        parsed.voidItemDayend = payload.voidItemDayend;
        parsed.denominationDayend = payload.denominationDayend;
        parsed.productDayend = payload.productDayend;
        parsed.groupDayend = payload.groupDayend;
        parsed.driverDayend = payload.driverDayend;
        parsed.alternativeOrder = payload.alternativeOrder;

        localStorage.setItem("posConfigs", JSON.stringify(parsed));
        clearAllPosCache();
      } catch (e) {
        console.error("Failed to update cached posConfigs:", e);
      }

      if (res && (res.isSuccess !== false)) {
        showToast("POS Configuration saved successfully", "success");
      } else {
        throw new Error(res.message || "Save failed");
      }
    } catch (error: any) {
      console.error(error);
      showToast(error?.message || "Failed to save POS configuration", "error");
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    employeeOptions,
    orderTypeOptions,
    saving,
    loading,
    setField,
    setDayEndField,
    addDeliveryCharge,
    removeDeliveryCharge,
    handleSave,
    refreshEmployees,
  };
};
