import { useState, useEffect, useRef } from "react";
import { bomApi } from "../services/bomApi";
import { useToast } from "../../../../app/providers/useToast";
import type { BomForm, BomLineItem, BomPayload } from "../types";
import type { SearchableOption } from "../../../../components/common/Searchableselect";

export const initialBomForm: BomForm = {
  bomName: "",
  branchId: "",
  transDate: new Date().toISOString().split("T")[0],
  refNo: "",
  finishedProduct: "",
  finishedProductCode: "",
  finishedProductUnit: "",
  finishedProductUnitName: "",
  finishedProductQty: "",
  product: "",
  code: "",
  unit: "",
  unitName: "",
  qty: "",
};

export const useBom = (id?: string | null) => {
  const { showToast } = useToast();
  const [form, setForm] = useState<BomForm>(initialBomForm);
  const [items, setItems] = useState<BomLineItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Master Data
  const [branches, setBranches] = useState<SearchableOption[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productOptions, setProductOptions] = useState<SearchableOption[]>([]);
  
  // Specific Data Lookups
  const [finUnitOptions, setFinUnitOptions] = useState<SearchableOption[]>([]);
  const [rawUnitOptions, setRawUnitOptions] = useState<SearchableOption[]>([]);

  const nextItemId = useRef(1);

  // 1. Initial Load Branches & Products
  useEffect(() => {
    const loadMasterData = async () => {
      setLoading(true);
      try {
        const [branchRes, prodRes] = await Promise.all([
          bomApi.getBranchList(),
          bomApi.getProductListByName(""),
        ]);
        setBranches(branchRes.map((b: any) => ({ label: b.branchName, value: String(b.branchId) })));
        setProducts(prodRes);
        setProductOptions(prodRes.map((p: any) => ({ label: p.productName, value: String(p.productId) })));
      } catch (err: any) {
        setError(err.message || "Failed to load master data.");
      } finally {
        setLoading(false);
      }
    };
    loadMasterData();
  }, []);

  // 1b. Load existing record if ID is provided
  useEffect(() => {
    if (!id) return;

    const loadRecord = async () => {
      setLoading(true);
      try {
        const transId = parseInt(id, 10);
        const responseData = await bomApi.getBomById(transId);
        
        const master = responseData.masterData || responseData;
        const details = responseData.detailsData || responseData.details || [];
        
        setForm(prev => ({
          ...prev,
          bomName: master.bomName || "",
          branchId: String(master.branchId || ""),
          transDate: master.transDate ? master.transDate.split("T")[0] : prev.transDate,
          refNo: String(master.refNo || transId || ""),
          finishedProduct: String(master.productId || ""),
          finishedProductCode: master.productCode || master.barcode || "",
          finishedProductUnit: String(master.unitId || ""),
          finishedProductUnitName: master.unitName || "",
          finishedProductQty: String(master.qty || "1"),
        }));

        if (details.length > 0) {
          const mappedItems: BomLineItem[] = details.map((d: any, index: number) => ({
            id: index + 1,
            productId: d.productId,
            productName: d.productName || "",
            code: d.productCode || d.barcode || "",
            unitId: d.unitId,
            unitName: d.unitName || "",
            qty: String(d.qty),
          }));
          setItems(mappedItems);
          nextItemId.current = mappedItems.length + 1;
        }

      } catch (err: any) {
        setError(err.message || "Failed to load BOM details.");
        showToast("Failed to load existing BOM", "error");
      } finally {
        setLoading(false);
      }
    };

    loadRecord();
  }, [id]);

  // Set Finished Product fields when selected
  useEffect(() => {
    if (!form.finishedProduct) {
      setForm(prev => ({ ...prev, finishedProductCode: "", finishedProductUnit: "" }));
      setFinUnitOptions([]);
      return;
    }
    
    const product = products.find(p => String(p.productId) === form.finishedProduct);
    if (product) {
      setForm(prev => ({ ...prev, finishedProductCode: product.barcode || product.code || "" }));
      
      // If branch is selected, try to get product unit data
      if (form.branchId) {
        bomApi.getProductUnitData(parseInt(form.branchId, 10), product.barcode || product.code)
          .then(unitData => {
            if (unitData) {
              setForm(prev => ({ ...prev, finishedProductUnit: String(unitData.unitId), finishedProductUnitName: unitData.unitCategory || "Unit" }));
            }
          })
          .catch(err => console.error("Failed to fetch fin product unit:", err));
      } else {
        showToast("Please select a Branch first to load unit.", "warning");
      }
    }
  }, [form.finishedProduct, form.branchId, products]);

  // Set Raw Material fields when selected
  useEffect(() => {
    if (!form.product) {
      setForm(prev => ({ ...prev, code: "", unit: "" }));
      setRawUnitOptions([]);
      return;
    }
    
    const product = products.find(p => String(p.productId) === form.product);
    if (product) {
      setForm(prev => ({ ...prev, code: product.barcode || product.code || "" }));
      
      // If branch is selected, try to get product unit data
      if (form.branchId) {
        bomApi.getProductUnitData(parseInt(form.branchId, 10), product.barcode || product.code)
          .then(unitData => {
            if (unitData) {
              setForm(prev => ({ ...prev, unit: String(unitData.unitId), unitName: unitData.unitCategory || "Unit" }));
            }
          })
          .catch(err => console.error("Failed to fetch raw product unit:", err));
      } else {
        showToast("Please select a Branch first to load unit.", "warning");
      }
    }
  }, [form.product, form.branchId, products]);

  const toNumber = (val: string) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  };

  const addItem = () => {
    if (!form.product || toNumber(form.qty) <= 0) return;

    const prodObj = products.find(p => String(p.productId) === form.product);
    const newLine: BomLineItem = {
      id: nextItemId.current++,
      productId: parseInt(form.product, 10),
      productName: prodObj ? prodObj.productName : "Unknown",
      code: form.code,
      unitId: parseInt(form.unit, 10),
      unitName: form.unitName || "Unit",
      qty: toNumber(form.qty),
    };

    setItems(prev => [...prev, newLine]);
    setForm(prev => ({ ...prev, product: "", code: "", unit: "", unitName: "", qty: "" }));
    
    setTimeout(() => document.getElementById("bom-product")?.focus(), 0);
  };

  const removeItem = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!form.branchId || !form.finishedProduct || !form.finishedProductUnit || items.length === 0) {
      showToast("Please fill all required fields and add items", "warning");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload: BomPayload = {
        bomName: form.bomName || "BOM",
        transDate: form.transDate || new Date().toISOString().split("T")[0],
        productId: parseInt(form.finishedProduct, 10) || 0,
        unitId: parseInt(form.finishedProductUnit, 10) || 0,
        qty: toNumber(form.finishedProductQty),
        branchId: parseInt(form.branchId, 10) || 0,
        createdAt: new Date().toISOString(),
        details: items.map(item => ({
          productId: item.productId,
          unitId: item.unitId,
          qty: item.qty,
          baseQty: item.qty
        }))
      };

      await bomApi.createBom(payload);
      showToast("BOM created successfully", "success");
      
      // Reset form
      setForm(initialBomForm);
      setItems([]);
      nextItemId.current = 1;
    } catch (err: any) {
      const backendMsg = err.response?.data?.message || err.message || "Failed to save BOM";
      setError(backendMsg);
      showToast(backendMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  return {
    form,
    setForm,
    items,
    setItems,
    loading,
    saving,
    error,
    setError,
    branches,
    products,
    productOptions,
    finUnitOptions,
    rawUnitOptions,
    addItem,
    removeItem,
    handleSave,
  };
};
