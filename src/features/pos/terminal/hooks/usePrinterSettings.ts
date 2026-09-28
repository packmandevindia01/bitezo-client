import { useState, useEffect, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { printerSettingsApi } from '../../services/printerSettingsApi';
import { useToast } from '../../../../app/providers/useToast';
import type { 
  GeneralPrinterSettings, 
  CategoryPrinterSetting, 
  ProductPrinterSetting, 
  SectionPrinterSetting, 
  OrderTypePrinterSetting 
} from '../../types';

const getInitialGeneralSettings = (): GeneralPrinterSettings => {
  const isNative = Capacitor.isNativePlatform();
  const storedAndroid = isNative && localStorage.getItem('androidPrint') === 'true';

  try {
    const cached = localStorage.getItem('generalPrinterSettings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed === 'object') {
        const bill = parsed.billPrinter || parsed.androidBillPrinter || localStorage.getItem('cachedBillPrinter') || 'No Printer';
        const kot = parsed.kotPrinter || parsed.androidKOTPrinter || localStorage.getItem('cachedKotPrinter') || 'No Printer';
        const packager = parsed.packagerPrinter || parsed.androidPackagerPrinter || localStorage.getItem('cachedPackagerPrinter') || 'No Printer';
        const master = parsed.masterKOT || localStorage.getItem('cachedMasterKotPrinter') || 'No Printer';

        return {
          billPrinter: bill,
          kotPrinter: kot,
          packagerPrinter: packager,
          masterKOT: master,
          masterKOTCount: Number(parsed.masterKOTCount) || 1,
          masterKOTBillCount: Number(parsed.masterKOTBillCount) || 1,
          androidPrint: isNative ? (Boolean(parsed.androidPrint) || storedAndroid) : false,
          androidBillPrinter: parsed.androidBillPrinter || bill,
          androidKOTPrinter: parsed.androidKOTPrinter || kot,
          androidPackagerPrinter: parsed.androidPackagerPrinter || packager,
        };
      }
    }
  } catch (e) {
    // Ignore JSON parse error
  }

  const bill = localStorage.getItem('cachedBillPrinter') || 'No Printer';
  const kot = localStorage.getItem('cachedKotPrinter') || 'No Printer';
  const packager = localStorage.getItem('cachedPackagerPrinter') || 'No Printer';
  const master = localStorage.getItem('cachedMasterKotPrinter') || 'No Printer';

  return {
    billPrinter: bill,
    kotPrinter: kot,
    packagerPrinter: packager,
    masterKOT: master,
    masterKOTCount: 1,
    masterKOTBillCount: 1,
    androidPrint: isNative,
    androidBillPrinter: bill,
    androidKOTPrinter: kot,
    androidPackagerPrinter: packager,
  };
};

export const usePrinterSettings = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Hydrate initial states from localStorage so settings are immediately available
  const [general, setGeneral] = useState<GeneralPrinterSettings>(() => getInitialGeneralSettings());
  
  const [categories, setCategories] = useState<CategoryPrinterSetting[]>([]);
  const [products, setProducts] = useState<ProductPrinterSetting[]>([]);
  const [sections, setSections] = useState<SectionPrinterSetting[]>([]);
  const [orderTypes, setOrderTypes] = useState<OrderTypePrinterSetting[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await printerSettingsApi.getPrinterData();
      if (res.isSuccess && res.data) {
        const isNative = Capacitor.isNativePlatform();
        const gen = res.data.generalPrinter;
        if (gen) {
          // Native mobile tablet is Android Mode; Desktop Web is ALWAYS Windows PrintAgent mode
          const resolvedAndroid = isNative;

          const isIp = (v?: string): boolean => {
            if (!v) return false;
            return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v.trim());
          };

          const localGen = getInitialGeneralSettings();

          let billP: string;
          let kotP: string;
          let packagerP: string;

          if (resolvedAndroid) {
            // Android Tablet Mode: Prioritize Android IP printer settings
            billP = (gen.androidBillPrinter && gen.androidBillPrinter !== 'No Printer')
              ? gen.androidBillPrinter
              : (localGen.androidBillPrinter && localGen.androidBillPrinter !== 'No Printer'
                ? localGen.androidBillPrinter
                : (isIp(gen.billPrinter) ? gen.billPrinter : (localGen.billPrinter !== 'No Printer' ? localGen.billPrinter : 'No Printer')));

            kotP = (gen.androidKOTPrinter && gen.androidKOTPrinter !== 'No Printer')
              ? gen.androidKOTPrinter
              : (localGen.androidKOTPrinter && localGen.androidKOTPrinter !== 'No Printer'
                ? localGen.androidKOTPrinter
                : (isIp(gen.kotPrinter) ? gen.kotPrinter : (localGen.kotPrinter !== 'No Printer' ? localGen.kotPrinter : 'No Printer')));

            packagerP = (gen.androidPackagerPrinter && gen.androidPackagerPrinter !== 'No Printer')
              ? gen.androidPackagerPrinter
              : (localGen.androidPackagerPrinter && localGen.androidPackagerPrinter !== 'No Printer'
                ? localGen.androidPackagerPrinter
                : (isIp(gen.packagerPrinter) ? gen.packagerPrinter : (localGen.packagerPrinter !== 'No Printer' ? localGen.packagerPrinter : 'No Printer')));
          } else {
            // Desktop Web Mode: Prioritize Windows desktop printer names, reject pure IP addresses from Android
            const cachedBill = localStorage.getItem('cachedBillPrinter');
            billP = (gen.billPrinter && gen.billPrinter !== 'No Printer' && !isIp(gen.billPrinter))
              ? gen.billPrinter
              : (cachedBill && cachedBill !== 'No Printer' && !isIp(cachedBill)
                ? cachedBill
                : (localGen.billPrinter && localGen.billPrinter !== 'No Printer' && !isIp(localGen.billPrinter)
                  ? localGen.billPrinter
                  : 'No Printer'));

            const cachedKot = localStorage.getItem('cachedKotPrinter');
            kotP = (gen.kotPrinter && gen.kotPrinter !== 'No Printer' && !isIp(gen.kotPrinter))
              ? gen.kotPrinter
              : (cachedKot && cachedKot !== 'No Printer' && !isIp(cachedKot)
                ? cachedKot
                : (localGen.kotPrinter && localGen.kotPrinter !== 'No Printer' && !isIp(localGen.kotPrinter)
                  ? localGen.kotPrinter
                  : 'No Printer'));

            const cachedPackager = localStorage.getItem('cachedPackagerPrinter');
            packagerP = (gen.packagerPrinter && gen.packagerPrinter !== 'No Printer' && !isIp(gen.packagerPrinter))
              ? gen.packagerPrinter
              : (cachedPackager && cachedPackager !== 'No Printer' && !isIp(cachedPackager)
                ? cachedPackager
                : (localGen.packagerPrinter && localGen.packagerPrinter !== 'No Printer' && !isIp(localGen.packagerPrinter)
                  ? localGen.packagerPrinter
                  : 'No Printer'));
          }

          const masterP = (gen.masterKOT && gen.masterKOT !== 'No Printer')
            ? gen.masterKOT
            : (localGen.masterKOT !== 'No Printer' ? localGen.masterKOT : 'No Printer');

          const merged: GeneralPrinterSettings = {
            ...gen,
            billPrinter: billP,
            kotPrinter: kotP,
            packagerPrinter: packagerP,
            masterKOT: masterP,
            masterKOTCount: Number(gen.masterKOTCount) || localGen.masterKOTCount || 1,
            masterKOTBillCount: Number(gen.masterKOTBillCount) || localGen.masterKOTBillCount || 1,
            androidPrint: resolvedAndroid,
            androidBillPrinter: gen.androidBillPrinter || (resolvedAndroid ? billP : 'No Printer'),
            androidKOTPrinter: gen.androidKOTPrinter || (resolvedAndroid ? kotP : 'No Printer'),
            androidPackagerPrinter: gen.androidPackagerPrinter || (resolvedAndroid ? packagerP : 'No Printer'),
          };

          setGeneral(merged);
          localStorage.setItem('generalPrinterSettings', JSON.stringify(merged));
          localStorage.setItem('androidPrint', String(resolvedAndroid));
          if (billP && billP !== 'No Printer') localStorage.setItem('cachedBillPrinter', billP);
          if (kotP && kotP !== 'No Printer') localStorage.setItem('cachedKotPrinter', kotP);
          if (packagerP && packagerP !== 'No Printer') localStorage.setItem('cachedPackagerPrinter', packagerP);
          if (masterP && masterP !== 'No Printer') localStorage.setItem('cachedMasterKotPrinter', masterP);
        }
        setCategories(res.data.categoryPrinter || []);
        setProducts(res.data.productPrinter || []);
        setSections(res.data.sectionPrinter || []);
        setOrderTypes(res.data.ordertypePrinter || []);
      }
    } catch (error: any) {
      console.warn("[usePrinterSettings] Failed to load server printer data, using device local settings:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveGeneral = async (data: GeneralPrinterSettings) => {
    const isNative = Capacitor.isNativePlatform();
    const isAndroid = isNative;

    const isIp = (v?: string): boolean => {
      if (!v) return false;
      return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(v.trim());
    };

    // 1. Immediately update state and device storage (Offline-first / Instant UI feedback)
    setGeneral(data);
    localStorage.setItem('generalPrinterSettings', JSON.stringify(data));
    localStorage.setItem('androidPrint', String(isAndroid));
    if (data.billPrinter && data.billPrinter !== 'No Printer') localStorage.setItem('cachedBillPrinter', data.billPrinter);
    if (data.kotPrinter && data.kotPrinter !== 'No Printer') localStorage.setItem('cachedKotPrinter', data.kotPrinter);
    if (data.packagerPrinter && data.packagerPrinter !== 'No Printer') localStorage.setItem('cachedPackagerPrinter', data.packagerPrinter);
    if (data.masterKOT && data.masterKOT !== 'No Printer') localStorage.setItem('cachedMasterKotPrinter', data.masterKOT);

    // 2. Build cross-device payload that isolates Desktop Windows settings from Android Tablet settings
    const payload: GeneralPrinterSettings = {
      ...data,
      // Desktop Windows fields
      billPrinter: isAndroid 
        ? (general.billPrinter && !isIp(general.billPrinter) ? general.billPrinter : data.billPrinter)
        : data.billPrinter,
      kotPrinter: isAndroid 
        ? (general.kotPrinter && !isIp(general.kotPrinter) ? general.kotPrinter : data.kotPrinter)
        : data.kotPrinter,
      packagerPrinter: isAndroid 
        ? (general.packagerPrinter && !isIp(general.packagerPrinter) ? general.packagerPrinter : data.packagerPrinter)
        : data.packagerPrinter,
      masterKOT: data.masterKOT,
      masterKOTCount: Number(data.masterKOTCount) || 1,
      masterKOTBillCount: Number(data.masterKOTBillCount) || 1,
      androidPrint: isAndroid ? true : (general.androidPrint ?? true), // Preserve Android print flag for tablet
      // Android Tablet fields
      androidBillPrinter: isAndroid 
        ? data.billPrinter 
        : (data.androidBillPrinter || general.androidBillPrinter || 'No Printer'),
      androidKOTPrinter: isAndroid 
        ? data.kotPrinter 
        : (data.androidKOTPrinter || general.androidKOTPrinter || 'No Printer'),
      androidPackagerPrinter: isAndroid 
        ? data.packagerPrinter 
        : (data.androidPackagerPrinter || general.androidPackagerPrinter || 'No Printer'),
    };

    setLoading(true);
    try {
      const res = await printerSettingsApi.updateGeneral(payload);
      if (res?.isSuccess !== false) {
        showToast("General printer settings saved successfully!", "success");
        return true;
      }
      showToast(res?.message || "Saved on this device (Server returned warning)", "warning");
      return true;
    } catch (error: any) {
      console.warn("[usePrinterSettings] Server save returned error, but preserved locally on device:", error);
      showToast("Saved locally on this device!", "success");
      return true;
    } finally {
      setLoading(false);
    }
  };

  const saveCategoryMappings = async (data: CategoryPrinterSetting[]) => {
    setLoading(true);
    try {
      const res = await printerSettingsApi.saveCategories(data);
      if (res.isSuccess) {
        setCategories(data);
        showToast("Category printer mappings saved", "success");
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveProductMappings = async (data: ProductPrinterSetting[]) => {
    setLoading(true);
    try {
      const res = await printerSettingsApi.saveProducts(data);
      if (res.isSuccess) {
        setProducts(data);
        showToast("Product printer mappings saved", "success");
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveSectionMappings = async (data: SectionPrinterSetting[]) => {
    setLoading(true);
    try {
      const res = await printerSettingsApi.saveSections(data);
      if (res.isSuccess) {
        setSections(data);
        showToast("Section printer mappings saved", "success");
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const saveOrderTypeMappings = async (data: OrderTypePrinterSetting[]) => {
    setLoading(true);
    try {
      const res = await printerSettingsApi.saveOrderTypes(data);
      if (res.isSuccess) {
        setOrderTypes(data);
        showToast("Order type printer mappings saved", "success");
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleAndroidPrint = async (enabled: boolean) => {
    if (!Capacitor.isNativePlatform()) return;
    localStorage.setItem('androidPrint', String(enabled));
    setGeneral((prev) => {
      const updated = { ...prev, androidPrint: enabled };
      printerSettingsApi.updateGeneral(updated).catch((err) => {
        console.error("Failed to update androidPrint setting in backend:", err);
      });
      return updated;
    });
    showToast(`Android printer option ${enabled ? 'enabled' : 'disabled'}`, "info");
  };

  return {
    loading,
    general,
    categories,
    products,
    sections,
    orderTypes,
    saveGeneral,
    toggleAndroidPrint,
    saveCategoryMappings,
    saveProductMappings,
    saveSectionMappings,
    saveOrderTypeMappings,
    refresh: fetchAll
  };
};
