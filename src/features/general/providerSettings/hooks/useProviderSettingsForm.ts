import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { useCurrency } from "../../../../hooks/useCurrency";
import { subCategoryApi } from "../../../inventory/subcategory/api";
import {
  loadMasterData,
  loadProducts,
  fetchAltNames,
  fetchUnitPrice,
  deleteProviderSettings,
  fetchProviderSettingsList,
} from "../services/providerSettingsService";
import { productVatRate, knownVatRate, splitPrice } from "../utils/providerVat";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { fetchBranchNames } from "../../../inventory/branches/services/branchApi";
import type {
  ProviderMasterItem,
  BranchMasterItem,
  CategoryMasterItem,
  ProductSearchItem,
  AltNameItem,
  ProviderSettingEntry,
  ProviderSettingsData,
  ProviderSettingsPayload,
  ProviderSettingsProduct,
} from "../types";
import type { SubCategoryListItem } from "../../../inventory/subcategory/types";

import { toLocalDateString } from "../../../../utils/date";
const createEmptyEntry = (): ProviderSettingEntry => ({
  productId: 0,
  unitId: 0,
  productName: "",
  productCode: "",
  altName: "",
  isIncl: true,
  exclPrice: 0,
  inclPrice: 0,
  price: 0,
  rawPrice: "",
});

export const useProviderSettingsForm = (
  initialData: ProviderSettingsData | null | undefined,
  onSubmit: (payload: ProviderSettingsPayload) => void,
  onDeleteSuccess?: () => void
) => {
  const { showToast } = useToast();
  const { decimalPart } = useCurrency();

  // ─── Master data ──────────────────────────────────────────────────────────
  const [providers, setProviders] = useState<ProviderMasterItem[]>([]);
  const [branches, setBranches] = useState<BranchMasterItem[]>([]);
  const [categories, setCategories] = useState<CategoryMasterItem[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryListItem[]>([]);
  const [allProducts, setAllProducts] = useState<ProductSearchItem[]>([]);
  const [altNamesMap, setAltNamesMap] = useState<Record<number, AltNameItem[]>>({});

  // ─── Loading states ───────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [loadingAltNames, setLoadingAltNames] = useState(false);

  // ─── Filter selections ────────────────────────────────────────────────────
  const [selectedProvider, setSelectedProvider] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    toLocalDateString()
  );
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedSubCategory, setSelectedSubCategory] = useState("");

  const handleAddCategory = (categoryId: number) => {
    if (!selectedCategoryIds.includes(categoryId)) {
      setSelectedCategoryIds((prev) => [...prev, categoryId]);
    }
  };

  const handleRemoveCategory = (categoryId: number) => {
    setSelectedCategoryIds((prev) => prev.filter((id) => id !== categoryId));
  };

  const handleClearCategories = () => {
    setSelectedCategoryIds([]);
    setSelectedSubCategory("");
  };

  // ─── Grid entries ─────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<ProviderSettingEntry[]>([createEmptyEntry()]);

  /** Looks up each product's own VAT % and recalculates its Excl / Incl columns (they used a fixed 5 %). */
  const applyVatRates = useCallback((productIds: number[]) => {
    Array.from(new Set(productIds.filter((id) => id > 0))).forEach((pid) => {
      void productVatRate(pid).then((rate) => {
        setEntries((prev) => prev.map((e) => (e.productId === pid
          ? { ...e, vatRate: rate, ...splitPrice(e.price, e.isIncl, rate) }
          : e)));
      });
    });
  }, []);

  // ─── Load master data + all products on mount ─────────────────────────────
  const loadBaseData = useCallback(async () => {
    try {
      setLoading(true);
      const master = await loadMasterData();
      if (master) {
        // Deduplicate master data
        const uniqueProviders = Array.from(new Map((master.provider || []).map((p) => [p.providerId, p])).values());
        const uniqueBranches = Array.from(new Map((master.branch || []).map((b) => [b.branchId, b])).values());
        const uniqueCategories = Array.from(new Map((master.category || []).map((c) => [c.categoryId, c])).values());

        // Resiliently merge branches from branchApi to guarantee latest branches are present
        try {
          const directBranches = await fetchBranchNames(true);
          directBranches.forEach((db: any) => {
            const bId = Number(db.id ?? db.branchId ?? 0);
            const bName = String(db.branchName ?? "");
            if (bId > 0 && !uniqueBranches.some((ub) => ub.branchId === bId)) {
              uniqueBranches.push({ branchId: bId, branchName: bName });
            }
          });
        } catch {
          // ignore
        }

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

  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);

  // Real-time synchronization for branch updates
  useEffect(() => {
    return subscribeToBranchUpdates(() => {
      void loadBaseData();
    });
  }, [loadBaseData]);

  // ─── Populate fields when editing ────────────────────────────────────────
  useEffect(() => {
    if (!initialData || !initialData.master) return;
    const { master, details } = initialData;
    setSelectedProvider(master.providerId.toString());
    setSelectedBranch(master.branchId.toString());
    setSelectedDate(master.createdAt?.split("T")[0] || toLocalDateString());

    if (details && details.length > 0) {
      const uniqueDetails: ProviderSettingEntry[] = [];
      const seenDetailsKeys = new Set<string>();
      const newAltMap: Record<number, AltNameItem[]> = {};

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
            vatRate: knownVatRate(d.productId),
            ...splitPrice(d.price, d.isIncl, knownVatRate(d.productId)),
            price: d.price,
            rawPrice: d.price ? String(d.price) : "",
          });

          if (!newAltMap[d.productId]) {
            newAltMap[d.productId] = [];
          }
          if (!newAltMap[d.productId].some((a) => a.unitId === d.unitId)) {
            newAltMap[d.productId].push({
              unitId: d.unitId,
              altName: d.altName,
              price: d.price,
              isIncl: d.isIncl,
            });
          }
        }
      });

      setEntries(uniqueDetails.length > 0 ? uniqueDetails : [createEmptyEntry()]);
      // The saved rows only give a fallback list (the server's reply can carry another product's alt names). Load each
      // product's REAL alternatives so they can be changed on Edit, and show the real name of the saved unit.
      setAltNamesMap((prev) => ({ ...prev, ...newAltMap }));
      const productIds = Array.from(new Set(uniqueDetails.map((e) => e.productId)));
      applyVatRates(productIds);
      productIds.forEach((pid) => {
        void fetchAltNames(pid)
          .then((alts) => {
            if (!Array.isArray(alts)) return;
            if (alts.length === 0) {
              // No alternatives: the alt name the server sent belongs to another product. Show the product itself.
              setAltNamesMap((prev) => ({ ...prev, [pid]: [] }));
              setEntries((prev) => prev.map((e) => (e.productId === pid ? { ...e, altName: "" } : e)));
              return;
            }
            setAltNamesMap((prev) => ({ ...prev, [pid]: alts }));
            setEntries((prev) => prev.map((e) => {
              if (e.productId !== pid) return e;
              const alt = alts.find((a) => a.unitId === e.unitId);
              return alt ? { ...e, altName: alt.altName } : e;
            }));
          })
          .catch(() => { /* keep the fallback list */ });
      });
    } else {
      setEntries([createEmptyEntry()]);
    }
  }, [initialData, applyVatRates]);

  // The product code shown on a saved row: the product's own (the server's reply can carry another product's code).
  useEffect(() => {
    if (allProducts.length === 0) return;
    setEntries((prev) => {
      let changed = false;
      const next = prev.map((e) => {
        if (!(e.productId > 0)) return e;
        const own = allProducts.find((p) => p.productId === e.productId && p.unitId === e.unitId);
        if (own?.barcode && own.barcode !== e.productCode) {
          changed = true;
          return { ...e, productCode: own.barcode };
        }
        return e;
      });
      return changed ? next : prev;
    });
  }, [allProducts]);

  // ─── Sub-categories when category changes ─────────────────────────────────
  useEffect(() => {
    if (selectedCategoryIds.length === 0) {
      setSubCategories([]);
      setSelectedSubCategory("");
      return;
    }
    void (async () => {
      try {
        setLoadingSubs(true);
        const subArrays = await Promise.all(
          selectedCategoryIds.map((catId) =>
            subCategoryApi.getSubCategories(undefined, undefined, catId)
          )
        );
        const uniqueSubs: SubCategoryListItem[] = [];
        const seenSubIds = new Set<number>();
        subArrays.flat().forEach((s) => {
          if (!seenSubIds.has(s.id)) {
            seenSubIds.add(s.id);
            uniqueSubs.push(s);
          }
        });
        setSubCategories(uniqueSubs);
      } catch {
        showToast("Failed to load sub categories", "error");
      } finally {
        setLoadingSubs(false);
      }
    })();
  }, [selectedCategoryIds, showToast]);

  // ─── Products when Category or Sub-Category changes ───────────────────────
  useEffect(() => {
    let active = true;
    const fetchCategoryProducts = async () => {
      try {
        let prodsData: ProviderSettingsProduct[] = [];
        if (selectedCategoryIds.length > 0) {
          const prodsArrays = await Promise.all(
            selectedCategoryIds.map((catId) =>
              loadProducts({
                categoryId: catId,
                subCategoryId: selectedSubCategory ? Number(selectedSubCategory) : undefined,
              })
            )
          );
          prodsData = prodsArrays.flat();
        } else {
          prodsData = await loadProducts({
            subCategoryId: selectedSubCategory ? Number(selectedSubCategory) : undefined,
          });
        }

        if (!active) return;
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
      } catch (e) {
        console.error("Failed to load category products", e);
      }
    };

    void fetchCategoryProducts();
    return () => {
      active = false;
    };
  }, [selectedCategoryIds, selectedSubCategory]);

  // ─── Load Data Button Handler ─────────────────────────────────────────────
  const handleLoad = async () => {
    if (!selectedProvider || !selectedBranch) {
      showToast("Please select Provider and Branch", "warning");
      return;
    }
    try {
      setLoading(true);
      let data: ProviderSettingsProduct[] = [];
      if (selectedCategoryIds.length > 0) {
        const prodsArrays = await Promise.all(
          selectedCategoryIds.map((catId) =>
            loadProducts({
              categoryId: catId,
              subCategoryId: selectedSubCategory ? Number(selectedSubCategory) : undefined,
            })
          )
        );
        data = prodsArrays.flat();
      } else {
        data = await loadProducts({
          subCategoryId: selectedSubCategory ? Number(selectedSubCategory) : undefined,
        });
      }

      const uniqueLoadedEntries: ProviderSettingEntry[] = [];
      const seenLoadedKeys = new Set<string>();

      data.forEach((p: any) => {
        const prodId = Number(p.productId ?? p.ProductId ?? 0);
        const rawUnitId = Number(p.unitId ?? p.UnitId ?? p.uomId ?? p.UomId ?? 0);
        const rawAltName = String(p.altName ?? p.AltName ?? "").trim();
        const rawProdName = String(p.product ?? p.Product ?? p.productName ?? p.ProductName ?? "").trim();
        const barcode = String(p.barcode ?? p.Barcode ?? "").trim();
        const price = Number(p.price ?? p.Price ?? 0);
        const isIncl = Boolean(p.isIncl ?? p.IsIncl ?? true);

        // Match with allProducts to resolve unitId or altName if missing from API
        const matched = allProducts.find((ap) => ap.productId === prodId);
        const unitId = rawUnitId > 0 ? rawUnitId : (matched?.unitId ?? 0);
        const altName = rawAltName || (matched?.altName && matched.altName.trim()) || rawProdName || "Default";

        const key = `${prodId}-${unitId}`;
        if (!seenLoadedKeys.has(key)) {
          seenLoadedKeys.add(key);
          uniqueLoadedEntries.push({
            productId: prodId,
            unitId,
            productName: rawProdName,
            productCode: barcode,
            altName,
            isIncl,
            vatRate: knownVatRate(prodId),
            ...splitPrice(price, isIncl, knownVatRate(prodId)),
            price,
            rawPrice: price ? String(price) : "",
          });
        }
      });

      setEntries((prev) => {
        const nonBlank = prev.filter((e) => e.productId > 0);
        const existingKeys = new Set(nonBlank.map((e) => `${e.productId}-${e.unitId}`));
        const newItems = uniqueLoadedEntries.filter(
          (e) => !existingKeys.has(`${e.productId}-${e.unitId}`)
        );
        const combined = [...nonBlank, ...newItems];
        return combined.length > 0 ? combined : [createEmptyEntry()];
      });

      // Pre-fetch alt names for loaded products in background to auto-fill unitId & alt options
      const missingAltProdIds = Array.from(
        new Set(uniqueLoadedEntries.map((e) => e.productId).filter((id) => id > 0 && !altNamesMap[id]))
      );

      if (missingAltProdIds.length > 0) {
        void Promise.allSettled(
          missingAltProdIds.map(async (pid) => {
            try {
              const alts = await fetchAltNames(pid);
              if (Array.isArray(alts) && alts.length > 0) {
                setAltNamesMap((prev) => ({ ...prev, [pid]: alts }));
                setEntries((prev) =>
                  prev.map((e) => {
                    if (e.productId === pid && (!e.unitId || e.unitId === 0)) {
                      return {
                        ...e,
                        unitId: alts[0].unitId,
                        altName: alts[0].altName || e.altName,
                      };
                    }
                    return e;
                  })
                );
              }
            } catch {
              // ignore
            }
          })
        );
      }

      applyVatRates(uniqueLoadedEntries.map((e) => e.productId));
      showToast(`Loaded ${uniqueLoadedEntries.length} products`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  // ─── Inline Grid Actions ──────────────────────────────────────────────────
  const handleAddRow = () => {
    setEntries((prev) => [...prev, createEmptyEntry()]);
  };

  const handleRemoveEntry = (index: number) => {
    setEntries((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length > 0 ? updated : [createEmptyEntry()];
    });
  };

  const loadAltNames = async (productId: number) => {
    if (!productId || altNamesMap[productId]) return;
    try {
      setLoadingAltNames(true);
      const alts = await fetchAltNames(productId);
      setAltNamesMap((prev) => ({ ...prev, [productId]: alts }));
    } catch {
      // ignore
    } finally {
      setLoadingAltNames(false);
    }
  };

  const handleGridProductSelect = async (index: number, val: string) => {
    if (!val) {
      setEntries((prev) => {
        const updated = [...prev];
        updated[index] = createEmptyEntry();
        return updated;
      });
      return;
    }

    const [pid, uid] = val.split("-").map(Number);
    const product =
      allProducts.find((p) => p.productId === pid && p.unitId === uid) ||
      allProducts.find((p) => p.productId === pid);
    if (!product) return;

    const isDuplicate = entries.some(
      (e, i) => i !== index && e.productId === pid && e.unitId === (product.unitId || uid)
    );
    if (isDuplicate) {
      showToast("This product is already in the list", "warning");
      return;
    }

    const isIncl = product.isIncl ?? true;
    const price = product.price ?? 0;
    const vatRate = knownVatRate(pid);
    const { exclPrice, inclPrice } = splitPrice(price, isIncl, vatRate);

    const rowEntry: ProviderSettingEntry = {
      productId: pid,
      unitId: product.unitId || uid,
      productName: product.productName,
      productCode: product.barcode,
      altName: product.altName,
      isIncl,
      price,
      rawPrice: price ? String(price) : "",
      exclPrice,
      inclPrice,
      vatRate,
    };

    setEntries((prev) => {
      const updated = [...prev];
      updated[index] = rowEntry;
      return updated;
    });

    if (!altNamesMap[pid]) {
      void loadAltNames(pid);
    }
    if (vatRate === undefined) applyVatRates([pid]);
  };

  const handleGridAltNameSelect = async (index: number, unitId: number) => {
    const entry = entries[index];
    if (!entry || !entry.productId) return;

    const alts = altNamesMap[entry.productId] || [];
    const alt = alts.find((a) => a.unitId === unitId);
    if (!alt) return;

    const isDuplicate = entries.some(
      (e, i) => i !== index && e.productId === entry.productId && e.unitId === unitId
    );
    if (isDuplicate) {
      showToast("This product and unit combination is already in the list", "warning");
      return;
    }

    let newPrice = alt.price ?? entry.price;
    let isIncl = alt.isIncl ?? entry.isIncl;

    if (alt.price === undefined) {
      try {
        const unitData = await fetchUnitPrice(entry.productId, unitId);
        if (unitData && typeof unitData.price === "number") {
          newPrice = unitData.price;
          if (unitData.isIncl !== undefined) isIncl = unitData.isIncl;
        }
      } catch {
        // use existing price
      }
    }

    const { exclPrice, inclPrice } = splitPrice(newPrice, isIncl, entry.vatRate);

    setEntries((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        unitId,
        altName: alt.altName,
        isIncl,
        price: newPrice,
        rawPrice: newPrice ? String(newPrice) : "",
        exclPrice,
        inclPrice,
      };
      return updated;
    });
  };

  const handleGridToggleTax = (index: number) => {
    setEntries((prev) => {
      const updated = [...prev];
      const row = updated[index];
      if (!row || !row.productId) return prev;
      const nextIsIncl = !row.isIncl;
      const { exclPrice, inclPrice } = splitPrice(row.price, nextIsIncl, row.vatRate);
      updated[index] = {
        ...row,
        isIncl: nextIsIncl,
        exclPrice,
        inclPrice,
      };
      return updated;
    });
  };

  const handleGridPriceChange = (index: number, val: string) => {
    setEntries((prev) => {
      const updated = [...prev];
      const row = updated[index];
      if (!row) return prev;
      const num = parseFloat(val) || 0;
      const { exclPrice, inclPrice } = splitPrice(num, row.isIncl, row.vatRate);
      updated[index] = {
        ...row,
        price: num,
        rawPrice: val,
        exclPrice,
        inclPrice,
      };
      return updated;
    });
  };

  const handleDeleteSettings = async () => {
    if (!initialData?.master?.transId) {
      setEntries([createEmptyEntry()]);
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

  const handleReset = () => {
    setSelectedProvider("");
    setSelectedBranch("");
    setSelectedCategoryIds([]);
    setSelectedSubCategory("");
    setEntries([createEmptyEntry()]);
  };

  const handleSubmit = async () => {
    if (!selectedProvider || !selectedBranch) {
      showToast("Please select Provider and Branch", "warning");
      return;
    }
    // A product row without a unit used to be dropped from the save without a word.
    const noUnit = entries.find((e) => e.productId > 0 && !(e.unitId > 0));
    if (noUnit) {
      showToast(`Please select the Alt Name (unit) for ${noUnit.productName || "every product"}`, "warning");
      return;
    }
    // One price list per provider and branch: a second one would give the POS each product twice.
    if (!initialData?.master) {
      const providerName = providers.find((p) => String(p.providerId) === selectedProvider)?.providerName ?? "";
      const branchName = branches.find((b) => String(b.branchId) === selectedBranch)?.branchName ?? "";
      try {
        const existing = await fetchProviderSettingsList();
        const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
        if (providerName && branchName && existing.some((x) => same(x.provider, providerName) && same(x.branch, branchName))) {
          showToast(`${providerName} already has settings for ${branchName}. Open them from the list and edit instead.`, "error");
          return;
        }
      } catch {
        // list not available: let the save go ahead
      }
    }
    const validEntries = entries.filter((e) => e.productId > 0 && e.unitId > 0);
    if (validEntries.length === 0) {
      showToast("Please add at least one product", "warning");
      return;
    }
    const invalidPrice = validEntries.find((e) => !e.price || e.price <= 0);
    if (invalidPrice) {
      showToast(`Please enter a valid price for ${invalidPrice.productName || "all items"}`, "warning");
      return;
    }
    const [year, month, day] = selectedDate.split("-").map(Number);
    const now = new Date();
    const timestamp = new Date(
      year,
      month - 1,
      day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    ).toISOString();

    onSubmit({
      branchId: Number(selectedBranch),
      providerId: Number(selectedProvider),
      createdAt: timestamp,
      details: validEntries.map((e) => ({
        productId: e.productId,
        unitId: e.unitId,
        isIncl: e.isIncl,
        price: parseFloat(e.price.toFixed(decimalPart)),
      })),
    });
  };

  return {
    // master data
    providers,
    branches,
    categories,
    subCategories,
    allProducts,
    altNamesMap,
    // loading
    loading,
    loadingSubs,
    loadingAltNames,
    // filter selections
    selectedProvider,
    setSelectedProvider,
    selectedDate,
    setSelectedDate,
    selectedBranch,
    setSelectedBranch,
    selectedCategoryIds,
    handleAddCategory,
    handleRemoveCategory,
    handleClearCategories,
    selectedSubCategory,
    setSelectedSubCategory,
    // grid
    entries,
    setEntries,
    handleAddRow,
    handleRemoveEntry,
    handleGridProductSelect,
    handleGridAltNameSelect,
    handleGridToggleTax,
    handleGridPriceChange,
    loadAltNames,
    // handlers
    handleLoad,
    handleDeleteSettings,
    handleReset,
    handleSubmit,
  };
};
