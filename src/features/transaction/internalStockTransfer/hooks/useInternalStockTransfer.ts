import { useState, useEffect, useMemo, useRef } from "react";
import { internalStockTransferApi } from "../services/internalStockTransferApi";
import { bomApi } from "../../../general/bom/services/bomApi";
import { useToast } from "../../../../app/providers/useToast";
import type { InternalStockTransferForm, InternalStockTransferLineItem } from "../types";
import type { SearchableOption } from "../../../../components/common/Searchableselect";

export const initialTransferForm: InternalStockTransferForm = {
  refNo: "",
  transDate: new Date().toISOString().split("T")[0],
  fromBranch: "",
  toBranch: "",
  salesman: "",
  product: "",
  code: "",
  unit: "",
  unitName: "",
  qty: "",
  cost: "",
  amount: "",
};

export const useInternalStockTransfer = (id?: string) => {
  const { showToast } = useToast();
  const [form, setForm] = useState<InternalStockTransferForm>(initialTransferForm);
  const [items, setItems] = useState<InternalStockTransferLineItem[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Master Data Lookups
  const [branches, setBranches] = useState<SearchableOption[]>([]);
  const [toBranches, setToBranches] = useState<SearchableOption[]>([]);
  const [salesmen, setSalesmen] = useState<SearchableOption[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [productOptions, setProductOptions] = useState<SearchableOption[]>([]);
  const [unitOptions, setUnitOptions] = useState<SearchableOption[]>([]);

  const nextItemId = useRef(1);

  // 1. Initial Load: Branches and Products
  useEffect(() => {
    const loadMasterData = async () => {
      setLoading(true);
      try {
        const branchRes = await internalStockTransferApi.getFromBranches();
        setBranches(branchRes.map((b: any) => ({ label: b.branchName, value: String(b.branchId) })));
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
        const responseData = await internalStockTransferApi.getTransferById(transId);
        
        // API returns data inside masterData and detailsData
        const master = responseData.masterData || responseData;
        const details = responseData.detailsData || responseData.details || [];
        
        // Populate form
        setForm({
          refNo: master.refNo || "",
          transDate: master.transDate ? master.transDate.split("T")[0] : new Date().toISOString().split("T")[0],
          fromBranch: String(master.fromBranchId || ""),
          toBranch: String(master.toBranchId || ""),
          salesman: String(master.employeeId || ""),
          product: "",
          code: "",
          unit: "",
          unitName: "",
          qty: "",
          cost: "",
          amount: "",
        });

        // Populate items
        if (details.length > 0) {
          const mappedItems: InternalStockTransferLineItem[] = details.map((d: any, index: number) => ({
            id: index + 1,
            productId: d.productId,
            productName: d.productName || "",
            code: d.barcode || d.productCode || "",
            unitId: d.unitId,
            unitName: d.unitName || "",
            qty: d.qty,
            cost: d.price || d.cost || 0,
            amount: d.amount || (d.qty * (d.price || d.cost || 0))
          }));
          setItems(mappedItems);
          nextItemId.current = mappedItems.length + 1;
        }

      } catch (err: any) {
        setError(err.message || "Failed to load transfer details.");
        showToast("Failed to load existing record", "error");
      } finally {
        setLoading(false);
      }
    };

    loadRecord();
  }, [id]);

  // 2. When 'fromBranch' changes, load Ref Number, Salesmen, and ToBranches
  useEffect(() => {
    if (!form.fromBranch) {
      setForm(prev => ({ ...prev, salesman: "", refNo: "", toBranch: "" }));
      setToBranches([]);
      setSalesmen([]);
      return;
    }
    
    const loadBranchData = async () => {
      try {
        const branchId = parseInt(form.fromBranch, 10);
        const [empRes, refRes, toBranchesRes, prodRes] = await Promise.all([
          internalStockTransferApi.getEmployees(branchId).catch(() => []),
          internalStockTransferApi.getRefNumber(branchId).catch(() => ""),
          internalStockTransferApi.getToBranches(branchId).catch(() => []),
          internalStockTransferApi.getProductsByName("").catch(() => []),
        ]);
        setSalesmen(empRes.map((e: any) => ({ label: e.empName, value: String(e.empId) })));
        setToBranches(toBranchesRes.map((b: any) => ({ label: b.branchName, value: String(b.branchId) })));
        
        // Only auto-generate Ref No if we are not editing an existing record
        if (!id) {
          setForm(prev => ({ ...prev, refNo: String(refRes || "") }));
        }
        
        // I will just fetch products here.
        setProducts(prodRes);
        setProductOptions(prodRes.map((p: any) => ({ label: p.productName, value: String(p.productId) })));
      } catch (err: any) {
        console.error("Failed to load branch specifics:", err);
      }
    };
    loadBranchData();
  }, [form.fromBranch]);

  // 3. When Product changes, Auto-fill Code, Unit, and Cost
  useEffect(() => {
    if (!form.product) {
      setForm(prev => ({ ...prev, code: "", unit: "", unitName: "", cost: "", amount: "" }));
      setUnitOptions([]);
      return;
    }

    const product = products.find(p => String(p.productId) === form.product);
    if (product) {
      const productCode = product.barcode || product.code || "";
      setForm(prev => ({ ...prev, code: productCode }));

      // Fetch Cost and Unit Data
      const fetchProductDetails = async () => {
        try {
          const costData = await internalStockTransferApi.getProductCostData(productCode);
          const unitId = costData.baseUnitId;
          const costValue = costData.cost;
          
          setForm(prev => ({ 
            ...prev, 
            unit: String(unitId), 
            cost: String(costValue),
          }));

          // Use BOM API for unit resolution exactly as per BOM notes
          if (form.fromBranch) {
            const branchId = parseInt(form.fromBranch, 10);
            const prodUnitData = await bomApi.getProductUnitData(branchId, productCode).catch(() => null);
            
            if (prodUnitData) {
              const unitListData = await bomApi.getUnitListByName(prodUnitData.unitId, prodUnitData.unitCategory).catch(() => []);
              if (unitListData && unitListData.length > 0) {
                setUnitOptions(unitListData.map(u => ({ label: u.unitName, value: String(u.unitId) })));
                
                // Try to find the matching unit based on costData.baseUnitId or prodUnitData.unitId
                const defaultUnit = unitListData.find(u => u.unitId === prodUnitData.unitId) || unitListData[0];
                setForm(prev => ({ 
                  ...prev, 
                  unit: String(defaultUnit.unitId),
                  unitName: defaultUnit.unitName 
                }));
              } else {
                setUnitOptions([{ label: prodUnitData.unitCategory || "Unit", value: String(prodUnitData.unitId) }]);
                setForm(prev => ({ ...prev, unit: String(prodUnitData.unitId), unitName: prodUnitData.unitCategory || "Unit" }));
              }
            } else {
              setForm(prev => ({ ...prev, unitName: "Unit" }));
            }
          } else {
             setForm(prev => ({ ...prev, unitName: "Unit" }));
          }
        } catch (err) {
          console.error("Failed to load product details", err);
        }
      };

      fetchProductDetails();
    }
  }, [form.product, form.fromBranch, products]);

  // 4. Auto-calculate Amount when Qty or Cost changes
  useEffect(() => {
    const qty = Number(form.qty) || 0;
    const cost = Number(form.cost) || 0;
    if (qty >= 0 && cost >= 0) {
      setForm(prev => ({ ...prev, amount: String(qty * cost) }));
    }
  }, [form.qty, form.cost]);

  const toNumber = (val: string) => {
    const num = Number(val);
    return Number.isFinite(num) ? num : 0;
  };

  const addItem = () => {
    if (!form.product || toNumber(form.qty) <= 0) return;

    const prodObj = products.find(p => String(p.productId) === form.product);
    
    const newLine: InternalStockTransferLineItem = {
      id: nextItemId.current++,
      productId: parseInt(form.product, 10),
      productName: prodObj ? prodObj.productName : "Unknown",
      code: form.code,
      unitId: parseInt(form.unit, 10) || 0,
      unitName: form.unitName || "Unit",
      qty: toNumber(form.qty),
      cost: toNumber(form.cost),
      amount: toNumber(form.amount) || (toNumber(form.qty) * toNumber(form.cost)),
    };

    setItems(prev => [...prev, newLine]);
    setForm(prev => ({ ...prev, product: "", code: "", unit: "", unitName: "", qty: "", cost: "", amount: "" }));
    
    setTimeout(() => document.getElementById("ist-product")?.focus(), 0);
  };

  const removeItem = (id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (!form.fromBranch || !form.toBranch || items.length === 0) {
      showToast("Please fill all required fields and add items", "warning");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        transDate: form.transDate,
        fromBranchId: parseInt(form.fromBranch, 10),
        toBranchId: parseInt(form.toBranch, 10),
        employeeId: parseInt(form.salesman, 10) || 0,
        netAmount: grandTotal,
        narration: "",
        details: items.map(item => ({
          productId: item.productId,
          unitId: item.unitId,
          qty: item.qty,
          price: item.cost,
          amount: item.amount,
          baseQty: item.qty // usually unit conversion ratio * qty
        }))
      };

      await internalStockTransferApi.createTransfer(payload);
      showToast("Internal Stock Transfer saved successfully", "success");
      
      // Reset form
      setForm(initialTransferForm);
      setItems([]);
      nextItemId.current = 1;
    } catch (err: any) {
      setError(err.message || "Failed to save Internal Stock Transfer");
      showToast(err.message || "Failed to save transfer", "error");
    } finally {
      setSaving(false);
    }
  };

  const grandTotal = useMemo(() => items.reduce((sum, item) => sum + item.amount, 0), [items]);

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
    toBranches,
    salesmen,
    products,
    productOptions,
    unitOptions,
    addItem,
    removeItem,
    handleSave,
    grandTotal,
  };
};
