// trigger rebuild
import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useCurrency } from "../../../../hooks/useCurrency";
import { createEmptyPurchaseReturnForm } from "../constants";
import type { PurchaseReturnForm, PurchaseReturnLineItem, PurchasePaymentLine } from "../types";
import { purchaseReturnApi } from "../services/purchaseReturnApi";
import type { PurchaseReturnMasterData } from "../services/purchaseReturnApi";
import { useToast } from "../../../../app/providers/useToast";

const toNumber = (value: string) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const calculateLine = (item: PurchaseReturnLineItem) => {
  const amount = item.qty * item.price;
  const discountAmount = amount * (item.discPercent / 100);
  const vatAmount = (amount - discountAmount) * (item.vatPercent / 100);
  const netAmount = amount - discountAmount + vatAmount;

  return {
    amount,
    discountAmount,
    vatAmount,
    netAmount,
  };
};

export const usePurchaseReturn = (invoiceId?: string) => {
  const { showToast } = useToast();
  const { formatAmount } = useCurrency();
  const [masterData, setMasterData] = useState<PurchaseReturnMasterData | null>(null);
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterError, setMasterError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        setMasterError(null);
        const data = await purchaseReturnApi.loadMasterData();
        if (data) {
          setMasterData(data);
          // Pre-select first series and branch if available
          if (data.series.length > 0) {
            setForm((prev) => ({
              ...prev,
              series: data.series[0].seriesId.toString(),
              purchaseNo: `${data.series[0].prefix}${data.series[0].startNo}`
            }));
          }
          if (data.branches.length > 0) {
            setForm((prev) => ({ ...prev, branch: data.branches[0].branchId.toString() }));
          }
        }
      } catch (error: any) {
        console.error("Failed to load master data", error);
        setMasterError(error?.message || "Failed to load master data");
      } finally {
        setLoadingMaster(false);
      }
    };
    fetchMasterData();
  }, []);

  const loadInvoiceData = async (id: string) => {
    try {
      setLoadingMaster(true);
      const res = await purchaseReturnApi.getPurchaseReturnById(id);
      const master = res.masterData;
      const rootPaymodeId = res.masterData.paymodeId || 1;
      const rootAmount = (res.masterData.netAmount || 0) - (res.paymodesData || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      
      setForm({
        ...initialForm,
        series: master.seriesId?.toString() || "",
        branch: master.branchId?.toString() || "",
        salesman: master.employeeId?.toString() || "",
        supplier: master.supplierId?.toString() || "",
        purchaseNo: master.purchaseReturnNo || "",
        invoiceNo: master.purchaseInvoiceNo || "",
        purchaseDate: master.purchaseReturnDate ? master.purchaseReturnDate.split("T")[0] : "",
        invoiceDate: "",
        refNo: master.refNo || "",
        narration: master.narration || "",
        discAmount: master.discAmount?.toString() || "0",
        roundOff: "0",
        otherCharge: "0",
      } as PurchaseReturnForm);

      const mappedItems = (res.detailsData || []).map((d: any) => ({
        id: Math.random(),
        product: d.productId?.toString() || "",
        code: d.productId?.toString() || "",
        unit: d.unitId?.toString() || "",
        qty: d.qty?.toString() || "1",
        foc: d.foc?.toString() || "0",
        price: d.price?.toString() || "0",
        discPercent: d.discPer?.toString() || "0",
        amount: (d.qty * d.price).toString(),
        discAmount: d.discAmount?.toString() || "0",
        vatAmount: d.vatAmount?.toString() || "0",
        netAmount: d.netAmount?.toString() || "0",
        vatId: d.vatId || 0,
        vatPercent: d.vatValue || 0,
      }));
      setItems(mappedItems);

      if (res.paymodesData && res.paymodesData.length > 0) {
        const mappedPayments = [
          {
            id: Math.random(),
            mode: rootPaymodeId === 1 ? 'cash' : rootPaymodeId === 2 ? 'card' : 'credit',
            amount: rootAmount,
          },
          ...res.paymodesData.map((p: any) => ({
            id: Math.random(),
            mode: p.paymodeId === 1 ? 'cash' : p.paymodeId === 2 ? 'card' : 'credit',
            amount: p.amount || 0,
          }))
        ];
        setPayments(mappedPayments);
      } else {
        setPayments([]);
      }
    } catch (error: any) {
      setMasterError(error.message);
      showToast(error.message || "Failed to load invoice details", "error");
    } finally {
      setLoadingMaster(false);
    }
  };

  useEffect(() => {
    if (invoiceId) {
      loadInvoiceData(invoiceId);
    }
  }, [invoiceId]);

  const initialForm = useMemo(() => {
    const empty = createEmptyPurchaseReturnForm();
    empty.price = formatAmount(0);
    empty.discAmount = formatAmount(0);
    empty.otherCharge = formatAmount(0);
    empty.roundOff = formatAmount(0);
    return empty;
  }, [formatAmount]);

  const [form, setForm] = useState<PurchaseReturnForm>(initialForm);
  const [items, setItems] = useState<PurchaseReturnLineItem[]>([]);
  const [payments, setPayments] = useState<PurchasePaymentLine[]>([]);
  
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isMultiPayOpen, setIsMultiPayOpen] = useState(false);

  // Product Search State
  const [productOptions, setProductOptions] = useState<{label: string, value: string, code: string, barcode: string}[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  const [supplierOptions, setSupplierOptions] = useState<{label: string, value: string}[]>([]);
  const [searchingSuppliers, setSearchingSuppliers] = useState(false);

  const handleProductSearch = useCallback(async (query: string) => {
    setSearchingProducts(true);
    try {
      const results = await purchaseReturnApi.searchProductsByName(query || "");
      setProductOptions(
        results.map((r) => ({
          label: r.productName,
          value: r.productId.toString(),
          code: r.code || "",
          barcode: r.barcode || "",
        }))
      );
    } catch (error) {
      console.error("Failed to search products", error);
    } finally {
      setSearchingProducts(false);
    }
  }, []);

  const handleSupplierSearch = useCallback(async (query: string) => {
    setSearchingSuppliers(true);
    try {
      const results = await purchaseReturnApi.searchSuppliers(query || "");
      setSupplierOptions(
        results.map((r) => ({
          label: r.supplierName,
          value: r.supplierId.toString(),
        }))
      );
    } catch (error) {
      console.error("Failed to search suppliers", error);
    } finally {
      setSearchingSuppliers(false);
    }
  }, []);

  const handleProductSelect = async (_productId: string, barcode: string) => {
    if (!barcode) return;
    try {
      const details = await purchaseReturnApi.getProductCostData(barcode);
      setForm(prev => ({
        ...prev,
        unit: details.baseUnitId.toString(),
        price: formatAmount(details.cost),
        vatId: details.vatId?.toString() || "0",
        vatPercent: details.vatValue.toString(),
        qty: prev.qty === "0" || prev.qty === "" ? "1" : prev.qty
      }));
    } catch (error) {
      console.error("Failed to load product details", error);
    }
  };

  const nextItemId = useRef(1);

  const setField = (key: keyof PurchaseReturnForm, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      
      // Auto-generate P NO if series changes
      if (key === "series" && masterData) {
        const seriesObj = masterData.series.find((s) => s.seriesId.toString() === value);
        if (seriesObj) {
          next.purchaseNo = `${seriesObj.prefix}${seriesObj.startNo}`;
        }
      }

      // Auto-calculate global discounts when editing the global discount fields
      if (key === "globalDiscPercent") {
        const discPct = toNumber(next.globalDiscPercent);
        // Calculate subtotal manually because totals is not available inside setForm
        const subTotal = items.reduce((acc, item) => acc + calculateLine(item).netAmount, 0);
        next.discAmount = formatAmount(subTotal * (discPct / 100));
      }

      if (key === "discAmount") {
        const discAmt = toNumber(value);
        const subTotal = items.reduce((acc, item) => acc + calculateLine(item).netAmount, 0);
        if (subTotal > 0) {
          next.globalDiscPercent = ((discAmt / subTotal) * 100).toFixed(2);
        }
      }
      
      return next;
    });
  };

  const currentLine = useMemo<PurchaseReturnLineItem>(
    () => ({
      id: 0,
      product: form.product.trim(),
      code: form.code.trim(),
      unit: form.unit.trim(),
      qty: toNumber(form.qty),
      foc: toNumber(form.foc),
      price: toNumber(form.price),
      vatId: toNumber(form.vatId),
      vatPercent: toNumber(form.vatPercent),
      discPercent: toNumber(form.discPercent),
    }),
    [form]
  );

  const currentLineTotals = calculateLine(currentLine);

  // Recalculate global discount amount when items change, if a percentage was set
  useEffect(() => {
    if (toNumber(form.globalDiscPercent) > 0 && items.length > 0) {
      const subTotal = items.reduce((acc, item) => acc + calculateLine(item).netAmount, 0);
      const newDiscAmt = formatAmount(subTotal * (toNumber(form.globalDiscPercent) / 100));
      if (newDiscAmt !== form.discAmount) {
        setForm(prev => ({ ...prev, discAmount: newDiscAmt }));
      }
    }
  }, [items, form.globalDiscPercent]);

  const totals = useMemo(() => {
    const itemTotals = items.reduce(
      (acc, item) => {
        const line = calculateLine(item);
        acc.discountAmount += line.discountAmount;
        acc.vatAmount += line.vatAmount;
        acc.netAmount += line.netAmount;
        return acc;
      },
      { discountAmount: 0, vatAmount: 0, netAmount: 0 }
    );

    const manualDiscount = toNumber(form.discAmount);
    const otherCharge = toNumber(form.otherCharge);
    const roundOff = toNumber(form.roundOff);
    const grandTotal = itemTotals.netAmount - manualDiscount + otherCharge + roundOff;

    return {
      ...itemTotals,
      grandTotal,
    };
  }, [form.discAmount, form.otherCharge, form.roundOff, items]);

  const addItem = () => {
    if (!currentLine.product) return;

    const itemId = nextItemId.current;
    nextItemId.current += 1;
    setItems((prev) => [...prev, { ...currentLine, id: itemId }]);
    setForm((prev) => ({
      ...prev,
      product: "",
      code: "",
      unit: "",
      qty: "0",
      foc: "0",
      price: formatAmount(0),
      vatId: "0",
      vatPercent: "0",
      discPercent: "0",
    }));
    setTimeout(() => document.getElementById("pi-product")?.focus(), 0);
  };

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleReset = () => {
    setForm(initialForm);
    setItems([]);
    setPayments([]);
    setShowClearConfirm(false);
  };

  const handleClearClick = () => {
    const isDirty = items.length > 0 || JSON.stringify(form) !== JSON.stringify(initialForm);
    if (isDirty) {
      setShowClearConfirm(true);
    } else {
      handleReset();
    }
  };

  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (items.length === 0) return;
    setSaving(true);
    try {
      const payload: any = {
        seriesId: parseInt(form.series) || 0,
        prefix: "",
        supplierId: parseInt(form.supplier) || 0,
        paymodeId: payments.length > 0 ? (payments[0].mode === 'cash' ? 1 : payments[0].mode === 'card' ? 2 : 3) : 1, // First payment is root
        branchId: parseInt(form.branch) || 0,
        employeeId: parseInt(form.salesman) || 0,
        dayId: 0,
        shiftId: 0,
        purchaseReturnDate: new Date(form.purchaseDate).toISOString(),
        purchaseInvoiceNo: form.invoiceNo,
        refNo: form.refNo,
        narration: form.narration,
        discAmount: toNumber(form.discAmount),
        discPer: 0,
        vatExclAmount: totals.netAmount - totals.vatAmount,
        vatAmount: totals.vatAmount,
        netAmount: totals.grandTotal,
        details: items.map((item) => {
          const l = calculateLine(item);
          return {
            productId: parseInt(item.product) || 0,
            unitId: parseInt(item.unit) || 0,
            vatId: item.vatId || 1,
            qty: item.qty,
            foc: item.foc,
            price: item.price,
            discPer: item.discPercent,
            discAmount: l.discountAmount,
            vatAmount: l.vatAmount,
            netAmount: l.netAmount,
            baseQty: item.qty + item.foc,
          };
        }),
        paymodes: payments.length <= 1 ? [] : payments.slice(1).map((p) => ({
          paymodeId: p.mode === 'cash' ? 1 : p.mode === 'card' ? 2 : 3,
          amount: p.amount,
        })),
      };

      if (invoiceId) {
        payload.purchaseReturnId = Number(invoiceId);
        payload.updateAt = new Date().toISOString();
        await purchaseReturnApi.updatePurchaseReturn(invoiceId, payload);
        showToast("Purchase Return updated successfully", "success");
      } else {
        payload.createdAt = new Date().toISOString();
        await purchaseReturnApi.savePurchaseReturn(payload);
        showToast("Purchase Return saved successfully", "success");
        handleReset();
      }
    } catch (error: any) {
      console.error("Failed to save invoice", error);
      const errMsg = error.response?.data?.message || error.message || "Failed to save invoice";
      showToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSettlementSubmit = (newPayments: { mode: string; amount: number }[]) => {
    setPayments(newPayments as PurchasePaymentLine[]);
    setIsMultiPayOpen(false);
  };

  return {
    form,
    items,
    payments,
    setField,
    currentLineTotals,
    totals,
    addItem,
    removeItem,
    showClearConfirm,
    setShowClearConfirm,
    handleReset,
    handleClearClick,
    handleSave,
    isMultiPayOpen,
    setIsMultiPayOpen,
    handleSettlementSubmit,
    masterData,
    loadingMaster,
    masterError,
    productOptions,
    searchingProducts,
    handleProductSearch,
    supplierOptions,
    searchingSuppliers,
    handleSupplierSearch,
    handleProductSelect,
    saving,
  };
};
