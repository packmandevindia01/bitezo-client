import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { useCurrency } from "../../../../hooks/useCurrency";
import { subCategoryApi } from "../../../inventory/subcategory/api";
import {
  loadMasterData,
  loadProducts,
  fetchAltNames,
  fetchUnitPrice,
} from "../../providerSettings/services/providerSettingsService";
import type {
  BranchMasterItem,
  CategoryMasterItem,
  ProductSearchItem,
  AltNameItem,
} from "../../providerSettings/types";
import type { SubCategoryListItem } from "../../../inventory/subcategory/types";
import type { HappyHourData, HappyHourPayload, HappyHourEntry } from "../types";
import { happyHourService } from "../services/happyHourService";

export const useHappyHourForm = (
  _initialData: HappyHourData | null | undefined,
  onSubmit: (payload: HappyHourPayload) => void,
  onDeleteSuccess?: () => void
) => {
  const { showToast } = useToast();
  const { decimalPart } = useCurrency();

  // ─── Master data ──────────────────────────────────────────────────────────
  const [branches, setBranches] = useState<BranchMasterItem[]>([]);
  const [categories, setCategories] = useState<CategoryMasterItem[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryListItem[]>([]);
  const [allProducts, setAllProducts] = useState<ProductSearchItem[]>([]);
  const [altNameOptions, setAltNameOptions] = useState<AltNameItem[]>([]);

  // ─── Loading states ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingAltNames, setLoadingAltNames] = useState(false);

  // ─── Main Fields ──────────────────────────────────────────────────────────
  const [promotionId, setPromotionId] = useState<number | undefined>(undefined);
  const [promotionName, setPromotionName] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:mm"
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });
  const [percentage, setPercentage] = useState("");

  // ─── Filter selections ────────────────────────────────────────────────────
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  // ─── Entry row state ──────────────────────────────────────────────────────
  const [selectedProductKey, setSelectedProductKey] = useState("");
  const [entryProductId, setEntryProductId] = useState<number | null>(null);
  const [entryUnitId, setEntryUnitId] = useState<number | null>(null);
  const [entryCode, setEntryCode] = useState("");
  const [entryPrice, setEntryPrice] = useState("0");
  const [entryDiscPercent, setEntryDiscPercent] = useState("");
  const [entryDiscValue, setEntryDiscValue] = useState("");
  const [entryPromoPrice, setEntryPromoPrice] = useState("0");
  const [entryIsIncl, setEntryIsIncl] = useState(true);

  // ─── Grid entries ─────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<HappyHourEntry[]>([]);
  const [focusedEntryKey, setFocusedEntryKey] = useState<string | null>(null);

  // ─── Errors ───────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Map Initial Data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (_initialData && _initialData.master) {
        setPromotionId(_initialData.master.promotionId);
        setPromotionName(_initialData.master.promotionName);
        setSelectedBranch(String(_initialData.master.branchId));
        setStartDate(_initialData.master.validFrom?.slice(0, 16) || "");
        setEndDate(_initialData.master.validTo?.slice(0, 16) || "");
        
        if (_initialData.details) {
            setEntries(_initialData.details.map(d => {
                const isIncl = (d as any).isIncl ?? (d as any).isincl ?? (d as any).is_incl ?? true;
                const price = d.originalprice ?? (d as any).originalPrice ?? 0;
                return {
                    productId: d.productId,
                    unitId: d.unitId,
                    productName: d.product,
                    barcode: d.barcode,
                    altName: d.altName,
                    price: price,
                    discountPercentage: d.discountPer,
                    discountValue: d.discount,
                    promoPrice: d.promoPrice,
                    isIncl: isIncl === true || isIncl === 1 || isIncl === "true"
                };
            }));
        }
    }
  }, [_initialData?.master?.promotionId]);

  // ─── Load master data ─────────────────────────────────────────────────────
  const loadBaseData = useCallback(async () => {
    try {
      setLoading(true);
      const master = await loadMasterData();
      if (master) {
        // Deduplicate master data
        const uniqueBranches = Array.from(new Map((master.branch || []).map(b => [b.branchId, b])).values());
        const uniqueCategories = Array.from(new Map((master.category || []).map(c => [c.categoryId, c])).values());

        setBranches(uniqueBranches);
        setCategories(uniqueCategories);
      }
      const prodsData = await loadProducts({});
      const uniqueProdsMap = new Map<string, ProductSearchItem>();
      prodsData.forEach((p) => {
        const key = `${p.productId}-${p.unitId}`;
        if (!uniqueProdsMap.has(key)) {
          uniqueProdsMap.set(key, {
            productId: p.productId,
            unitId: p.unitId,
            productName: p.product,
            barcode: p.barcode,
            altName: p.altName,
            price: p.price,
            isIncl: p.isIncl,
          });
        }
      });
      setAllProducts(Array.from(uniqueProdsMap.values()));
    } catch {
      showToast("Failed to load initial data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void loadBaseData(); }, [loadBaseData]);

  // ─── Sub-categories when category changes ─────────────────────────────────
  useEffect(() => {
    if (!selectedCategory) {
      setSubCategories([]);
      setSelectedSubCategory("");
      return;
    }
    void (async () => {
      try {
        setLoadingSubs(true);
        const data = await subCategoryApi.getSubCategories(
          undefined, undefined, Number(selectedCategory)
        );
        setSubCategories(data);
      } catch {
        showToast("Failed to load sub categories", "error");
      } finally {
        setLoadingSubs(false);
      }
    })();
  }, [selectedCategory, showToast]);

  // ─── Discount calculations (Moved to handlers to avoid loops) ──────────────
  const updateFromPercent = (newPercent: string, currentPrice?: string) => {
    const price = parseFloat(currentPrice ?? entryPrice) || 0;
    const percent = parseFloat(newPercent) || 0;
    setEntryDiscPercent(newPercent ?? "");
    
    if (price > 0) {
      const discValue = (price * percent) / 100;
      setEntryDiscValue(isNaN(discValue) ? "0" : discValue.toFixed(decimalPart));
      setEntryPromoPrice(isNaN(price - discValue) ? "0" : (price - discValue).toFixed(decimalPart));
    }
  };

  const updateFromValue = (newValue: string, currentPrice?: string) => {
    const price = parseFloat(currentPrice ?? entryPrice) || 0;
    const discValue = parseFloat(newValue) || 0;
    setEntryDiscValue(newValue ?? "");

    if (price > 0) {
      const percent = discValue > 0 ? (discValue / price) * 100 : 0;
      setEntryDiscPercent(isNaN(percent) ? "0" : parseFloat(percent.toFixed(2)).toString());
      setEntryPromoPrice(isNaN(price - discValue) ? "0" : (price - discValue).toFixed(decimalPart));
    }
  };

  const updateFromPromoPrice = (newPromo: string, currentPrice?: string) => {
    const price = parseFloat(currentPrice ?? entryPrice) || 0;
    const promoPrice = parseFloat(newPromo) || 0;
    setEntryPromoPrice(newPromo ?? "");

    if (price > 0) {
      const discValue = price - promoPrice;
      const percent = price > 0 ? (discValue / price) * 100 : 0;
      setEntryDiscValue(isNaN(discValue) ? "0" : discValue.toFixed(decimalPart));
      setEntryDiscPercent(isNaN(percent) ? "0" : parseFloat(percent.toFixed(2)).toString());
    }
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleLoad = async () => {
    if (!selectedBranch) {
        showToast("Please select Branch", "warning");
        return;
    }
    try {
      setLoading(true);
      const data = await happyHourService.loadHappyHourProducts(
        selectedCategory ? Number(selectedCategory) : undefined,
        selectedSubCategory ? Number(selectedSubCategory) : undefined
      );
      
      const globalPercent = parseFloat(percentage) || 0;

      const uniqueLoadedEntries: HappyHourEntry[] = [];
      const seenLoadedKeys = new Set<string>();

      data.forEach((p) => {
          const key = `${p.productId}-${p.unitId}`;
          if (!seenLoadedKeys.has(key)) {
              seenLoadedKeys.add(key);
              const isIncl = (p as any).isIncl ?? (p as any).isincl ?? (p as any).is_incl ?? true;
              const price = p.originalprice ?? (p as any).originalPrice ?? 0;
              const discValue = (price * globalPercent) / 100;
              uniqueLoadedEntries.push({
                  productId: p.productId,
                  unitId: p.unitId,
                  productName: p.product,
                  barcode: p.barcode,
                  altName: p.altName || p.product,
                  price: price,
                  discountPercentage: globalPercent,
                  discountValue: discValue,
                  promoPrice: price - discValue,
                  isIncl: isIncl === true || isIncl === 1 || isIncl === "true",
              });
          }
      });
      
      setEntries(uniqueLoadedEntries);
    } catch (error) {
      showToast("Failed to load products", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = async (val: string) => {
    setSelectedProductKey(val);
    if (!val) {
      setEntryProductId(null);
      setEntryUnitId(null);
      setEntryCode("");
      setEntryPrice("0");
      setEntryDiscPercent("");
      setEntryDiscValue("");
      setEntryPromoPrice("0");
      setAltNameOptions([]);
      return;
    }
    const [pid, uid] = val.split("-").map(Number);
    const match = allProducts.find((p) => p.productId === pid && p.unitId === uid);
    if (!match) return;

    setEntryProductId(pid);
    setEntryUnitId(uid);
    setEntryCode(match.barcode);
    const newPrice = match.price != null ? match.price.toFixed(decimalPart) : "0";
    setEntryPrice(newPrice);
    setEntryIsIncl(match.isIncl ?? true);
    
    // Recalculate discount value based on current percentage with new price
    updateFromPercent(entryDiscPercent || "0", newPrice);

    try {
      setLoadingAltNames(true);
      const alts = await fetchAltNames(pid);
      setAltNameOptions(alts);
    } catch {
      showToast("Failed to load alt names", "error");
    } finally {
      setLoadingAltNames(false);
    }
  };

  const handleAltNameSelect = async (val: string, productId?: number) => {
    const resolvedProductId = productId ?? entryProductId;
    if (!val || !resolvedProductId) return;

    const uid = Number(val);
    
    // Find matching product entry in allProducts for this productId + new unitId
    const matchingProduct = allProducts.find(
      p => p.productId === resolvedProductId && p.unitId === uid
    );

    // Update unitId state
    setEntryUnitId(uid);

    if (matchingProduct) {
      // Update product select to show the new variant (e.g. Juice (Medium))
      setSelectedProductKey(`${resolvedProductId}-${uid}`);
      // Update barcode from the matched product
      setEntryCode(matchingProduct.barcode);
      // Update price from the matched product
      const newPrice = matchingProduct.price 
        ? matchingProduct.price.toFixed(decimalPart) 
        : "0";
      setEntryPrice(newPrice);
      setEntryIsIncl(matchingProduct.isIncl ?? true);
      updateFromPercent(entryDiscPercent || "0", newPrice);
    } else {
      // Fallback to API if not in the initial allProducts list
      try {
        setLoadingAltNames(true);
        const unitData = await fetchUnitPrice(resolvedProductId, uid);
        if (unitData) {
          setSelectedProductKey(`${resolvedProductId}-${uid}`);
          const newPrice = unitData.price != null
            ? unitData.price.toFixed(decimalPart)
            : "0";
          setEntryPrice(newPrice);
          setEntryIsIncl(unitData.isIncl ?? true);
          updateFromPercent(entryDiscPercent || "0", newPrice);
        }
      } catch {
        showToast("Failed to fetch unit price", "error");
      } finally {
        setLoadingAltNames(false);
      }
    }
  };

  const handleAddEntry = () => {
    if (!entryProductId || !entryUnitId) {
      showToast("Please select a product", "warning");
      return;
    }
    const priceVal = parseFloat(entryPrice);
    const promoVal = parseFloat(entryPromoPrice);
    
    if (entries.some((e) => e.productId === entryProductId && e.unitId === entryUnitId)) {
      showToast("Already in the list", "warning");
      return;
    }
    const newEntry: HappyHourEntry = {
      productId: entryProductId,
      unitId: entryUnitId,
      productName: allProducts.find((p) => p.productId === entryProductId)?.productName ?? "",
      barcode: entryCode,
      // Get altName from allProducts matching current productId + unitId
      altName: allProducts.find(
        p => p.productId === entryProductId && p.unitId === entryUnitId
      )?.altName 
        || altNameOptions.find(a => a.unitId === entryUnitId)?.altName 
        || "",
      price: priceVal,
      discountPercentage: parseFloat(entryDiscPercent) || 0,
      discountValue: parseFloat(entryDiscValue) || 0,
      promoPrice: promoVal,
      isIncl: entryIsIncl,
    };

    setEntries((prev) => [...prev, newEntry]);
    setFocusedEntryKey(`${newEntry.productId}-${newEntry.unitId}`);

    // Reset row
    setSelectedProductKey("");
    setEntryProductId(null);
    setEntryUnitId(null);
    setEntryCode("");
    setEntryPrice("0");
    setEntryDiscPercent("");
    setEntryDiscValue("");
    setEntryPromoPrice("0");
  };

  const handleRemoveEntry = (productId: number, unitId: number) => {
    setEntries((prev) => prev.filter((e) => !(e.productId == productId && e.unitId == unitId)));
  };

  const handleUpdateEntryPrice = (productId: number, unitId: number, newPrice: number) => {
    setEntries(prev => prev.map(e => {
        if (e.productId === productId && e.unitId === unitId) {
            const discValue = (newPrice * e.discountPercentage) / 100;
            return { ...e, price: newPrice, discountValue: discValue, promoPrice: newPrice - discValue };
        }
        return e;
    }));
  };

  const handleUpdateEntryIsIncl = (productId: number, unitId: number, isIncl: boolean) => {
    setEntries(prev => prev.map(e => {
        if (e.productId === productId && e.unitId === unitId) {
            return { ...e, isIncl };
        }
        return e;
    }));
  };

  const handleEditEntry = async (entry: HappyHourEntry) => {
    // 1. Populate top row
    setSelectedProductKey(`${entry.productId}-${entry.unitId}`);
    setEntryProductId(entry.productId);
    setEntryUnitId(entry.unitId);
    setEntryCode(entry.barcode);
    setEntryPrice(entry.price.toFixed(decimalPart));
    setEntryDiscPercent(entry.discountPercentage.toString());
    setEntryDiscValue(entry.discountValue.toString());
    setEntryPromoPrice(entry.promoPrice.toFixed(decimalPart));
    setEntryIsIncl(entry.isIncl);

    // 2. Load alt names for this product
    try {
      setLoadingAltNames(true);
      const alts = await fetchAltNames(entry.productId);
      setAltNameOptions(alts);
    } catch {
      showToast("Failed to load alt names", "error");
    } finally {
      setLoadingAltNames(false);
    }

    // 3. Remove from grid
    handleRemoveEntry(entry.productId, entry.unitId);
  };

  const handleDeleteAll = () => {
    setEntries([]);
  };

  const handleDeletePromotion = async () => {
    if (!promotionId) {
      handleDeleteAll();
      return;
    }
    try {
      setLoading(true);
      await happyHourService.deleteHappyHour(promotionId);
      showToast("Promotion deleted successfully", "success");
      handleReset();
      onDeleteSuccess?.();
    } catch {
      showToast("Failed to delete promotion", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setPromotionId(undefined);
    setPromotionName("");
    setStartDate(new Date().toISOString().slice(0, 16));
    setEndDate(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
    setSelectedBranch("");
    setSelectedCategory("");
    setSelectedSubCategory("");
    setPercentage("");
    setEntries([]);
    setErrors({});
    // Clear current entry row state
    setEntryProductId(null);
    setEntryUnitId(null);
    setEntryCode("");
    setEntryPrice("0");
    setEntryDiscPercent("");
    setEntryDiscValue("");
    setEntryPromoPrice("0");
    setEntryIsIncl(true);
    setSelectedProductKey("");
    setAltNameOptions([]);
  };

  const handlePriceChange = (newPrice: string) => {
    setEntryPrice(newPrice);
    updateFromPercent(entryDiscPercent || "0", newPrice);
  };

  const handleSubmit = () => {
    const newErrors: Record<string, string> = {};
    if (!promotionName.trim()) newErrors.promotionName = "Promotion name is required";
    if (!selectedBranch) newErrors.selectedBranch = "Branch is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstError = Object.values(newErrors)[0];
      showToast(firstError, "warning");
      return;
    }

    if (entries.length === 0) {
      showToast("Please add at least one product", "warning");
      return;
    }

    setErrors({});
    onSubmit({
      promotionId,
      promotionName,
      branchId: Number(selectedBranch),
      validFrom: startDate.length === 16 ? `${startDate}:00.000Z` : startDate,
      validTo: endDate.length === 16 ? `${endDate}:00.000Z` : endDate,
      updatedAt: promotionId ? new Date().toISOString() : undefined,
      createdAt: !promotionId ? new Date().toISOString() : undefined,
      details: entries.map((e) => ({
        productId: e.productId,
        unitId: e.unitId,
        isIncl: e.isIncl,
        originalPrice: e.price,
        discountPer: e.discountPercentage,
        discount: e.discountValue,
        promoPrice: e.promoPrice,
      })),
    });
  };

  return {
    branches, categories, subCategories, allProducts, altNameOptions,
    loading, loadingSubs, loadingAltNames,
    promotionName,
    startDate, setStartDate,
    endDate, setEndDate,
    percentage, setPercentage,
    selectedBranch,
    selectedCategory, setSelectedCategory,
    selectedSubCategory, setSelectedSubCategory,
    selectedProductKey,
    entryProductId,
    entryUnitId,
    entryCode,
    entryPrice, setEntryPrice: handlePriceChange,
    entryDiscPercent, setEntryDiscPercent: updateFromPercent,
    entryDiscValue, setEntryDiscValue: updateFromValue,
    entryPromoPrice, setEntryPromoPrice: updateFromPromoPrice,
    entryIsIncl, setEntryIsIncl,
    entries,
    focusedEntryKey,
    errors,
    handleLoad,
    handleProductSelect,
    handleAltNameSelect,
    handleAddEntry,
    handleRemoveEntry,
    handleUpdateEntryPrice,
    handleUpdateEntryIsIncl,
    handleEditEntry,
    handleDeleteAll,
    handleDeletePromotion,
    handleReset,
    handleSubmit,
    setPromotionName: (val: string) => { setPromotionName(val); if (errors.promotionName) setErrors(prev => ({ ...prev, promotionName: "" })); },
    setSelectedBranch: (val: string) => { setSelectedBranch(val); if (errors.selectedBranch) setErrors(prev => ({ ...prev, selectedBranch: "" })); },
  };
};



