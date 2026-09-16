import { useState, useEffect, useCallback } from 'react';
import { printerSettingsApi } from '../../services/printerSettingsApi';
import { useToast } from '../../../../app/providers/useToast';
import type { 
  GeneralPrinterSettings, 
  CategoryPrinterSetting, 
  ProductPrinterSetting, 
  SectionPrinterSetting, 
  OrderTypePrinterSetting 
} from '../../types';

export const usePrinterSettings = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Initial empty states that match the Swagger/Backend structure
  const [general, setGeneral] = useState<GeneralPrinterSettings>(() => ({
    billPrinter: 'No Printer',
    kotPrinter: 'No Printer',
    packagerPrinter: 'No Printer',
    masterKOT: 'No Printer',
    masterKOTCount: 1,
    masterKOTBillCount: 1,
    androidPrint: localStorage.getItem('androidPrint') === 'true',
    androidBillPrinter: 'No Printer',
    androidKOTPrinter: 'No Printer',
    androidPackagerPrinter: 'No Printer'
  }));
  
  const [categories, setCategories] = useState<CategoryPrinterSetting[]>([]);
  const [products, setProducts] = useState<ProductPrinterSetting[]>([]);
  const [sections, setSections] = useState<SectionPrinterSetting[]>([]);
  const [orderTypes, setOrderTypes] = useState<OrderTypePrinterSetting[]>([]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await printerSettingsApi.getPrinterData();
      if (res.isSuccess && res.data) {
        const storedAndroid = localStorage.getItem('androidPrint') === 'true';
        const gen = res.data.generalPrinter;
        if (gen) {
          const resolvedAndroid = gen.androidPrint !== undefined && gen.androidPrint !== null 
            ? Boolean(gen.androidPrint) 
            : storedAndroid;
          setGeneral({
            ...gen,
            androidPrint: resolvedAndroid,
          });
          localStorage.setItem('androidPrint', String(resolvedAndroid));
        } else {
          setGeneral({
            billPrinter: 'No Printer', kotPrinter: 'No Printer', packagerPrinter: 'No Printer', 
            masterKOT: 'No Printer', masterKOTCount: 1, masterKOTBillCount: 1, 
            androidPrint: storedAndroid,
            androidBillPrinter: 'No Printer', androidKOTPrinter: 'No Printer', androidPackagerPrinter: 'No Printer'
          });
        }
        setCategories(res.data.categoryPrinter || []);
        setProducts(res.data.productPrinter || []);
        setSections(res.data.sectionPrinter || []);
        setOrderTypes(res.data.ordertypePrinter || []);
      }
    } catch (error: any) {
      showToast(error.message || "Failed to load printer settings", "warning");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const saveGeneral = async (data: GeneralPrinterSettings) => {
    setLoading(true);
    try {
      const res = await printerSettingsApi.updateGeneral(data);
      if (res.isSuccess) {
        setGeneral(data);
        localStorage.setItem('androidPrint', String(!!data.androidPrint));
        showToast("General printer settings updated", "success");
        return true;
      }
      showToast(res.message || "Failed to update general settings", "warning");
      return false;
    } catch (error: any) {
      showToast(error.message || "Error saving settings", "warning");
      return false;
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
