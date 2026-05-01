import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { subCategoryService } from "../../../inventory/subcategory/services/subCategoryService";
import {
  loadMasterData,
  loadProducts,
  fetchAltNames,
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
  onSubmit: (payload: HappyHourPayload) => void
) => {
  const { showToast } = useToast();

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
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
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
  const [entryPrice, setEntryPrice] = useState("0.000");
  const [entryDiscPercent, setEntryDiscPercent] = useState("");
  const [entryDiscValue, setEntryDiscValue] = useState("");
  const [entryPromoPrice, setEntryPromoPrice] = useState("0.000");

  // ─── Grid entries ─────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<HappyHourEntry[]>([]);

  // ─── Map Initial Data ─────────────────────────────────────────────────────
  useEffect(() => {
    if (_initialData) {
        setPromotionId(_initialData.master.promotionId);
        setPromotionName(_initialData.master.promotionName);
        setSelectedBranch(String(_initialData.master.branchId));
        setStartDate(_initialData.master.validFrom.split("T")[0]);
        setEndDate(_initialData.master.validTo.split("T")[0]);
        
        setEntries(_initialData.details.map(d => ({
            productId: d.productId,
            unitId: d.unitId,
            productName: d.product,
            barcode: d.barcode,
            altName: d.altName,
            price: d.originalprice,
            discountPercentage: d.discountPer,
            discountValue: d.discount,
            promoPrice: d.promoPrice,
            isIncl: d.isIncl
        })));
    }
  }, [_initialData]);

  // ─── Load master data ─────────────────────────────────────────────────────
  const loadBaseData = useCallback(async () => {
    try {
      setLoading(true);
      const master = await loadMasterData();
      if (master) {
        setBranches(master.branch || []);
        setCategories(master.category || []);
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
        const data = await subCategoryService.getSubCategories(
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

  // ─── Discount calculations ────────────────────────────────────────────────
  useEffect(() => {
    const price = parseFloat(entryPrice) || 0;
    const percent = parseFloat(entryDiscPercent) || 0;
    if (price > 0 && percent > 0) {
      const discValue = (price * percent) / 100;
      setEntryDiscValue(discValue.toFixed(3));
      setEntryPromoPrice((price - discValue).toFixed(3));
    }
  }, [entryDiscPercent, entryPrice]);

  useEffect(() => {
    const price = parseFloat(entryPrice) || 0;
    const discValue = parseFloat(entryDiscValue) || 0;
    if (price > 0 && discValue > 0) {
      const percent = (discValue / price) * 100;
      setEntryDiscPercent(percent.toFixed(2));
      setEntryPromoPrice((price - discValue).toFixed(3));
    }
  }, [entryDiscValue, entryPrice]);

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

      setEntries(
        data.map((p) => {
            const price = p.originalprice || 0;
            const discValue = (price * globalPercent) / 100;
            return {
                productId: p.productId,
                unitId: p.unitId,
                productName: p.product,
                barcode: p.barcode,
                altName: p.altName || p.product,
                price: price,
                discountPercentage: globalPercent,
                discountValue: discValue,
                promoPrice: price - discValue,
                isIncl: p.isIncl,
            };
        })
      );
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
      setEntryPrice("0.000");
      setEntryDiscPercent("");
      setEntryDiscValue("");
      setEntryPromoPrice("0.000");
      setAltNameOptions([]);
      return;
    }
    const [pid, uid] = val.split("-").map(Number);
    const match = allProducts.find((p) => p.productId === pid && p.unitId === uid);
    if (!match) return;

    setEntryProductId(pid);
    setEntryUnitId(uid);
    setEntryCode(match.barcode);
    setEntryPrice(match.price ? match.price.toFixed(3) : "0.000");

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

  const handleAltNameSelect = (val: string) => {
    if (!val || !entryProductId) return;
    const uid = Number(val);
    const alt = altNameOptions.find((a) => a.unitId === uid);
    if (!alt) return;

    const fullProduct = allProducts.find(
      (p) => p.productId === entryProductId && p.unitId === uid
    );

    setEntryUnitId(uid);
    setSelectedProductKey(`${entryProductId}-${uid}`);

    if (fullProduct) {
      setEntryCode(fullProduct.barcode);
      setEntryPrice(fullProduct.price ? fullProduct.price.toFixed(3) : "0.000");
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
    setEntries((prev) => [
      {
        productId: entryProductId,
        unitId: entryUnitId,
        productName: allProducts.find((p) => p.productId === entryProductId)?.productName ?? "",
        barcode: entryCode,
        altName: altNameOptions.find(a => a.unitId === entryUnitId)?.altName || "",
        price: priceVal,
        discountPercentage: parseFloat(entryDiscPercent) || 0,
        discountValue: parseFloat(entryDiscValue) || 0,
        promoPrice: promoVal,
        isIncl: allProducts.find(p => p.productId === entryProductId && p.unitId === entryUnitId)?.isIncl ?? true,
      },
      ...prev,
    ]);
    // Reset row
    setSelectedProductKey("");
    setEntryProductId(null);
    setEntryUnitId(null);
    setEntryCode("");
    setEntryPrice("0.000");
    setEntryDiscPercent("");
    setEntryDiscValue("");
    setEntryPromoPrice("0.000");
  };

  const handleRemoveEntry = (productId: number, unitId: number) => {
    setEntries((prev) => prev.filter((e) => !(e.productId === productId && e.unitId === unitId)));
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

  const handleDeleteAll = () => {
    setEntries([]);
  };

  const handleReset = () => {
    setPromotionName("");
    setPercentage("");
    setEntries([]);
  };

  const handleSubmit = () => {
    if (!promotionName || !selectedBranch) {
      showToast("Please fill required fields", "warning");
      return;
    }
    onSubmit({
      promotionId,
      promotionName,
      branchId: Number(selectedBranch),
      validFrom: `${startDate}T00:00:00.000Z`,
      validTo: `${endDate}T23:59:59.000Z`,
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
    promotionName, setPromotionName,
    startDate, setStartDate,
    endDate, setEndDate,
    percentage, setPercentage,
    selectedBranch, setSelectedBranch,
    selectedCategory, setSelectedCategory,
    selectedSubCategory, setSelectedSubCategory,
    selectedProductKey,
    entryUnitId,
    entryCode,
    entryPrice,
    entryDiscPercent, setEntryDiscPercent,
    entryDiscValue, setEntryDiscValue,
    entryPromoPrice, setEntryPromoPrice,
    entries,
    handleLoad,
    handleProductSelect,
    handleAltNameSelect,
    handleAddEntry,
    handleRemoveEntry,
    handleUpdateEntryPrice,
    handleDeleteAll,
    handleReset,
    handleSubmit,
  };
};
