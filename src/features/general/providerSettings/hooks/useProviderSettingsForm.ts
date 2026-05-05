import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { useCurrency } from "../../../../hooks/useCurrency";
import { subCategoryService } from "../../../inventory/subcategory/services/subCategoryService";
import {
  loadMasterData,
  loadProducts,
  fetchAltNames,
  deleteProviderSettings,
} from "../services/providerSettingsService";
import type {
  ProviderMasterItem,
  BranchMasterItem,
  CategoryMasterItem,
  ProductSearchItem,
  AltNameItem,
  ProviderSettingEntry,
  ProviderSettingsData,
  ProviderSettingsPayload,
} from "../types";
import type { SubCategoryListItem } from "../../../inventory/subcategory/types";

export const useProviderSettingsForm = (
  initialData: ProviderSettingsData | null | undefined,
  onSubmit: (payload: ProviderSettingsPayload) => void,
  onDeleteSuccess?: () => void
) => {
  const { showToast } = useToast();
  const { decimalPart, formatAmount } = useCurrency();

  // ─── Master data ──────────────────────────────────────────────────────────
  const [providers, setProviders] = useState<ProviderMasterItem[]>([]);
  const [branches, setBranches] = useState<BranchMasterItem[]>([]);
  const [categories, setCategories] = useState<CategoryMasterItem[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryListItem[]>([]);
  const [allProducts, setAllProducts] = useState<ProductSearchItem[]>([]);
  const [altNameOptions, setAltNameOptions] = useState<AltNameItem[]>([]);

  // ─── Loading states ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingAltNames, setLoadingAltNames] = useState(false);

  // ─── Filter selections ────────────────────────────────────────────────────
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  // ─── Entry row ────────────────────────────────────────────────────────────
  const [selectedProductKey, setSelectedProductKey] = useState("");
  const [entryProductId, setEntryProductId] = useState<number | null>(null);
  const [entryUnitId, setEntryUnitId] = useState<number | null>(null);
  const [entryCode, setEntryCode] = useState("");
  const [entryAltName, setEntryAltName] = useState("");
  const [entryIsIncl, setEntryIsIncl] = useState(true);
  const [entryPrice, setEntryPrice] = useState(formatAmount(0));

  // ─── Grid entries ─────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<ProviderSettingEntry[]>([]);

  // ─── Load master data + all products on mount ─────────────────────────────
  const loadBaseData = useCallback(async () => {
    try {
      setLoading(true);
      const master = await loadMasterData();
      if (master) {
        // Deduplicate master data
        const uniqueProviders = Array.from(new Map((master.provider || []).map(p => [p.providerId, p])).values());
        const uniqueBranches = Array.from(new Map((master.branch || []).map(b => [b.branchId, b])).values());
        const uniqueCategories = Array.from(new Map((master.category || []).map(c => [c.categoryId, c])).values());

        setProviders(uniqueProviders);
        setBranches(uniqueBranches);
        setCategories(uniqueCategories);
      }
      const prodsData = await loadProducts({});
      const uniqueProds: ProductSearchItem[] = [];
      const seenKeys = new Set<string>();
      
      prodsData.forEach((p) => {
        const key = `${p.productId}-${p.unitId}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uniqueProds.push({
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
      
      setAllProducts(uniqueProds);
    } catch {
      showToast("Failed to load initial data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void loadBaseData(); }, [loadBaseData]);

  // ─── Populate fields when editing ────────────────────────────────────────
  useEffect(() => {
    if (!initialData || !initialData.master) return;
    const { master, details } = initialData;
    setSelectedProvider(master.providerId.toString());
    setSelectedBranch(master.branchId.toString());
    setSelectedDate(master.createdAt?.split("T")[0] || "");
    
      if (details) {
        const uniqueDetails: ProviderSettingEntry[] = [];
        const seenDetailsKeys = new Set<string>();

        details.forEach((d) => {
          const key = `${d.productId}-${d.unitId}`;
          if (!seenDetailsKeys.has(key)) {
            seenDetailsKeys.add(key);
            uniqueDetails.push({
              productId: d.productId,
              unitId: d.unitId,
              productName: d.product,
              productCode: d.barcode,
              altName: d.altName,
              isIncl: d.isIncl,
              exclPrice: d.isIncl ? d.price / 1.05 : d.price,
              inclPrice: d.isIncl ? d.price : d.price * 1.05,
              price: d.price,
            });
          }
        });
        setEntries(uniqueDetails);
      }
  }, [initialData]);

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

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleLoad = async () => {
    if (!selectedProvider || !selectedBranch) {
      showToast("Please select Provider and Branch", "warning");
      return;
    }
    try {
      setLoading(true);
      const data = await loadProducts({
        categoryId: selectedCategory ? Number(selectedCategory) : undefined,
        subCategoryId: selectedSubCategory ? Number(selectedSubCategory) : undefined,
      });
      const uniqueLoadedEntries: ProviderSettingEntry[] = [];
      const seenLoadedKeys = new Set<string>();

      data.forEach((p) => {
        const key = `${p.productId}-${p.unitId}`;
        if (!seenLoadedKeys.has(key)) {
          seenLoadedKeys.add(key);
          uniqueLoadedEntries.push({
            productId: p.productId,
            unitId: p.unitId,
            productName: p.product,
            productCode: p.barcode,
            altName: p.altName || p.product,
            isIncl: p.isIncl,
            exclPrice: p.isIncl ? p.price / 1.05 : p.price,
            inclPrice: p.isIncl ? p.price : p.price * 1.05,
            price: p.price,
          });
        }
      });
      
      setEntries(uniqueLoadedEntries);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load settings", "error");
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
      setEntryAltName("");
      setEntryPrice(formatAmount(0));
      setAltNameOptions([]);
      return;
    }
    const [pid, uid] = val.split("-").map(Number);
    const match = allProducts.find((p) => p.productId === pid && p.unitId === uid);
    if (!match) return;

    setEntryProductId(pid);
    setEntryUnitId(uid);
    setEntryCode(match.barcode);
    setEntryAltName(match.altName);
    setEntryPrice(match.price ? match.price.toFixed(decimalPart) : formatAmount(0));
    if (match.isIncl !== undefined) setEntryIsIncl(match.isIncl);

    try {
      setLoadingAltNames(true);
      const alts = await fetchAltNames(pid);
      setAltNameOptions(alts);
      const currentAlt = alts.find((a) => a.unitId === uid);
      if (currentAlt) setEntryAltName(currentAlt.altName);
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
    setEntryAltName(alt.altName);
    setSelectedProductKey(`${entryProductId}-${uid}`);

    if (fullProduct) {
      setEntryCode(fullProduct.barcode);
      setEntryPrice(fullProduct.price ? fullProduct.price.toFixed(decimalPart) : formatAmount(0));
      if (fullProduct.isIncl !== undefined) setEntryIsIncl(fullProduct.isIncl);
    } else {
      setEntryCode("");
      setEntryPrice(formatAmount(0));
    }
  };

  const handleAddEntry = () => {
    if (!entryProductId || !entryUnitId) {
      showToast("Please select a product", "warning");
      return;
    }
    const priceVal = parseFloat(entryPrice);
    if (isNaN(priceVal) || priceVal <= 0) {
      showToast("Please enter a valid price", "warning");
      return;
    }
    if (entries.some((e) => e.productId === entryProductId && e.unitId === entryUnitId)) {
      showToast("This product/unit combination is already in the list", "warning");
      return;
    }
    setEntries((prev) => [
      ...prev,
      {
        productId: entryProductId,
        unitId: entryUnitId,
        productName: allProducts.find((p) => p.productId === entryProductId)?.productName ?? "",
        productCode: entryCode,
        altName: entryAltName,
        isIncl: entryIsIncl,
        exclPrice: entryIsIncl ? priceVal / 1.05 : priceVal,
        inclPrice: entryIsIncl ? priceVal : priceVal * 1.05,
        price: priceVal,
      },
    ]);
    // Reset row
    setSelectedProductKey("");
    setEntryProductId(null);
    setEntryUnitId(null);
    setEntryCode("");
    setEntryAltName("");
    setEntryPrice(formatAmount(0));
    setEntryIsIncl(true);
    setAltNameOptions([]);
  };

  const handleEditEntry = async (entry: ProviderSettingEntry) => {
    const key = `${entry.productId}-${entry.unitId}`;
    setSelectedProductKey(key);
    setEntryProductId(entry.productId);
    setEntryUnitId(entry.unitId);
    setEntryCode(entry.productCode);
    setEntryAltName(entry.altName);
    setEntryPrice(entry.price.toFixed(decimalPart));
    setEntryIsIncl(entry.isIncl);

    try {
      setLoadingAltNames(true);
      const alts = await fetchAltNames(entry.productId);
      setAltNameOptions(alts);
    } catch {
      showToast("Failed to load alt names for editing", "error");
    } finally {
      setLoadingAltNames(false);
    }
  };

  const handleDeleteSettings = async () => {
    if (!initialData?.master?.transId) {
      setEntries([]);
      return;
    }
    try {
      setLoading(true);
      await deleteProviderSettings(initialData.master.transId);
      showToast("Provider settings deleted successfully", "success");
      handleReset();
      onDeleteSuccess?.();
    } catch {
      showToast("Failed to delete provider settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEntry = (productId: number, unitId: number) => {
    setEntries((prev) =>
      prev.filter((e) => !(e.productId == productId && e.unitId == unitId))
    );
  };

  const handleReset = () => {
    setSelectedProvider("");
    setSelectedBranch("");
    setSelectedCategory("");
    setSelectedSubCategory("");
    setEntries([]);
    setSelectedProductKey("");
    setEntryProductId(null);
    setEntryUnitId(null);
    setEntryCode("");
    setEntryAltName("");
    setEntryPrice(formatAmount(0));
    setEntryIsIncl(true);
    setAltNameOptions([]);
  };

  const handleSubmit = () => {
    if (!selectedProvider || !selectedBranch) {
      showToast("Please select Provider and Branch", "warning");
      return;
    }
    if (entries.length === 0) {
      showToast("No items to save", "warning");
      return;
    }
    const [year, month, day] = selectedDate.split("-").map(Number);
    const now = new Date();
    const timestamp = new Date(
      year, month - 1, day,
      now.getHours(), now.getMinutes(), now.getSeconds()
    ).toISOString();

    onSubmit({
      branchId: Number(selectedBranch),
      providerId: Number(selectedProvider),
      createdAt: timestamp,
      details: entries.map((e) => ({
        productId: e.productId,
        unitId: e.unitId,
        isIncl: e.isIncl,
        price: parseFloat(e.price.toFixed(decimalPart)),
      })),
    });
  };

  return {
    // master data
    providers, branches, categories, subCategories, allProducts, altNameOptions,
    // loading
    loading, loadingSubs, loadingAltNames,
    // filter selections
    selectedProvider, setSelectedProvider,
    selectedDate, setSelectedDate,
    selectedBranch, setSelectedBranch,
    selectedCategory, setSelectedCategory,
    selectedSubCategory, setSelectedSubCategory,
    // entry row
    selectedProductKey,
    entryUnitId,
    entryCode, setEntryCode,
    entryAltName,
    entryIsIncl, setEntryIsIncl,
    entryPrice, setEntryPrice,
    // grid
    entries,
    // handlers
    handleLoad,
    handleProductSelect,
    handleAltNameSelect,
    handleAddEntry,
    handleEditEntry,
    handleRemoveEntry,
    handleDeleteSettings,
    handleReset,
    handleSubmit,
  };
};