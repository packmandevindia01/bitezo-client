import { useState, useEffect, useCallback } from "react";
import { 
  Download, 
  Plus, 
  Save, 
  Trash2, 
  RefreshCcw,

  Package,
  Calendar,
  Building2,
  Tags
} from "lucide-react";
import {
  PageShell,
  Loader,
  Button,
  FormInput,
  SearchableSelect,
} from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import { subCategoryService } from "../../../inventory/subcategory/services/subCategoryService";
import {
  saveProviderSettings,
  loadMasterData,
  loadProducts,
} from "../services/providerSettingsService";
import type { 
  ProviderSettingEntry, 
  ProviderMasterItem, 
  BranchMasterItem, 
  CategoryMasterItem,
  ProviderSettingsProduct
} from "../types";
import type { SubCategoryListItem } from "../../../inventory/subcategory/types";


const ProviderSettingsPage = () => {
  const { showToast } = useToast();

  // Filter States
  const [providers, setProviders] = useState<ProviderMasterItem[]>([]);
  const [branches, setBranches] = useState<BranchMasterItem[]>([]);
  const [categories, setCategories] = useState<CategoryMasterItem[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategoryListItem[]>([]);
  const [loadingSubs, setLoadingSubs] = useState(false);



  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("");

  // Entry States
  const [productList, setProductList] = useState<ProviderSettingsProduct[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [entryCode, setEntryCode] = useState("");
  const [entryAltName, setEntryAltName] = useState("");
  const [entryPrice, setEntryPrice] = useState("0.000");

  // Grid State
  const [entries, setEntries] = useState<ProviderSettingEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);



  const loadBaseData = useCallback(async () => {
    try {
      setLoading(true);
      const master = await loadMasterData();
      if (master) {
        setProviders(master.provider || []);
        setBranches(master.branch || []);
        setCategories(master.category || []);
      }
      
      const prods = await loadProducts({});
      setProductList(prods);
    } catch (error) {
      showToast("Failed to load initial data", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const loadFilteredProducts = useCallback(async () => {
    try {
      setLoading(true);
      const prods = await loadProducts({
        categoryId: selectedCategory ? Number(selectedCategory) : undefined,
        subCategoryId: selectedSubCategory ? Number(selectedSubCategory) : undefined,
      });
      setProductList(prods);
    } catch (error) {
      showToast("Failed to load products for selected filters", "error");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedSubCategory, showToast]);

  useEffect(() => {
    if (selectedCategory || selectedSubCategory) {
      void loadFilteredProducts();
    }
  }, [selectedCategory, selectedSubCategory, loadFilteredProducts]);


  useEffect(() => {
    if (selectedCategory) {
      void fetchSubCategories(Number(selectedCategory));
    } else {
      setSubCategories([]);
      setSelectedSubCategory("");
    }
  }, [selectedCategory]);

  const fetchSubCategories = async (catId: number) => {
    try {
      setLoadingSubs(true);
      const data = await subCategoryService.getSubCategories(undefined, undefined, catId);
      setSubCategories(data);
    } catch (error) {
      showToast("Failed to load sub categories", "error");
    } finally {
      setLoadingSubs(false);
    }
  };






  useEffect(() => {
    void loadBaseData();
  }, [loadBaseData]);



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

      // Map products to setting entries
      const mappedEntries: ProviderSettingEntry[] = data.map(p => ({
        productId: p.productId,
        unitId: p.unitId,
        productName: p.product,
        productCode: p.barcode,
        altName: p.altName || p.product,
        exclPrice: p.isIncl ? p.price / 1.05 : p.price,
        inclPrice: p.isIncl ? p.price : p.price * 1.05,
      }));


      setEntries(mappedEntries);
    } catch (error) {

      showToast(error instanceof Error ? error.message : "Failed to load settings", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntry = () => {
    if (!selectedProduct) return;
    const [pid, uid] = selectedProduct.split('-').map(Number);
    const product = productList.find(p => p.productId === pid && p.unitId === uid);
    if (!product) return;

    const newEntry: ProviderSettingEntry = {
      productId: product.productId,
      unitId: product.unitId,
      productName: product.product,
      productCode: entryCode || product.barcode,
      altName: entryAltName || product.altName || product.product,
      exclPrice: Number(entryPrice),
      inclPrice: product.isIncl ? Number(entryPrice) : Number(entryPrice) * 1.05,
    };



    setEntries(prev => [newEntry, ...prev]);
    // Reset entry fields
    setSelectedProduct("");
    setEntryCode("");
    setEntryAltName("");
    setEntryPrice("0.000");
  };

  const handleRemoveEntry = (productId: number, unitId: number) => {
    setEntries(prev => prev.filter(e => !(e.productId === productId && e.unitId === unitId)));
  };


  const handleSave = async () => {
    if (!selectedProvider || !selectedBranch) return;
    try {
      setSaving(true);
      await saveProviderSettings({
        providerId: Number(selectedProvider),
        date: selectedDate,
        branchId: Number(selectedBranch),
        categoryId: Number(selectedCategory),
        subCategoryId: Number(selectedSubCategory),
        entries,
      });
      showToast("Provider settings saved successfully", "success");
    } catch (error) {
      showToast("Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell title="Provider Settings">
      <div className="flex flex-col gap-6">
        {/* Filters Section */}
        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6 items-end">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <Package size={12} /> Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-[#49293e] focus:bg-white transition-all"
              >
                <option value="">Select Provider</option>
                {providers.map(p => <option key={p.providerId} value={p.providerId}>{p.providerName}</option>)}


              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <Calendar size={12} /> Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-[#49293e] focus:bg-white transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <Building2 size={12} /> Branch
              </label>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-[#49293e] focus:bg-white transition-all"
              >
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b.branchId} value={b.branchId}>{b.branchName}</option>)}

              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <Tags size={12} /> Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-[#49293e] focus:bg-white transition-all"
              >
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.categoryId} value={c.categoryId}>{c.categoryName}</option>)}

              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                Sub Category
              </label>
              <select
                value={selectedSubCategory}
                onChange={(e) => setSelectedSubCategory(e.target.value)}
                className="w-full rounded-xl border border-gray-100 bg-gray-50 px-4 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-[#49293e] focus:bg-white transition-all disabled:opacity-50"
                disabled={loadingSubs || !selectedCategory}
              >
                <option value="">{loadingSubs ? "Loading..." : "Select Sub Category"}</option>
                {subCategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>


            <Button onClick={handleLoad} disabled={loading} className="w-full h-[42px]">
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
              Load
            </Button>
          </div>
        </section>

        {/* Entry Row Section */}
        <section className="rounded-[2rem] border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5 lg:grid-cols-5 items-end">


            <div className="space-y-1.5 flex-1">
              <SearchableSelect
                label="Product"
                options={productList.map(p => ({
                  label: `${p.product} ${p.altName ? `(${p.altName})` : ''}`,
                  value: `${p.productId}-${p.unitId}`
                }))}
                value={selectedProduct}
                onChange={(val) => {
                  setSelectedProduct(val);
                  if (val) {
                    const [pid, uid] = val.split('-').map(Number);
                    const p = productList.find(x => x.productId === pid && x.unitId === uid);
                    if (p) {
                      setEntryCode(p.barcode);
                      setEntryAltName(p.altName || p.product);
                      setEntryPrice(String(p.price));
                    }
                  }
                }}
                placeholder="Search product..."
              />
            </div>

            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Code</label>
              <FormInput value={entryCode} onChange={e => setEntryCode(e.target.value)} placeholder="Product Code" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Alt Name</label>
              <FormInput value={entryAltName} onChange={e => setEntryAltName(e.target.value)} placeholder="Alias Name" />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Price (Incl/Excl)</label>
              <FormInput value={entryPrice} onChange={e => setEntryPrice(e.target.value)} placeholder="0.000" type="number" />
            </div>

            <Button onClick={handleAddEntry} className="w-full h-[42px] bg-slate-800 hover:bg-slate-900">
              <Plus size={18} /> Add Item
            </Button>
          </div>
        </section>

        {/* Grid Section */}
        <div className="flex-1 overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50/50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Product</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Code</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Alt Name</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Excl</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-right">Incl</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                      No products mapped yet. Load or add items to begin.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr key={`${entry.productId}-${entry.unitId}`} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 font-bold text-gray-800 text-sm">
                        {entry.productName}
                        {entry.altName !== entry.productName && (
                          <span className="block text-[10px] text-gray-400 font-normal uppercase tracking-tighter">
                            {entry.altName}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">{entry.productCode}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{entry.altName}</td>
                      <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{entry.exclPrice.toFixed(3)}</td>
                      <td className="px-6 py-4 text-sm font-bold text-[#49293e] text-right">{entry.inclPrice.toFixed(3)}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleRemoveEntry(entry.productId, entry.unitId)}
                          className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))

                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between mt-2">
          <Button variant="secondary" className="bg-gray-100 hover:bg-gray-200 text-gray-600">
            <Download size={18} /> Import
          </Button>
          
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setEntries([])} className="bg-[#f0e8ed] text-[#49293e] hover:bg-[#e7dbe2]">
              New
            </Button>
            <Button onClick={handleSave} disabled={saving || entries.length === 0} className="px-8 shadow-xl shadow-[#49293e]/20">
              {saving ? <Loader size="sm" /> : <Save size={18} />}
              Save Changes
            </Button>
            <Button variant="danger" disabled={entries.length === 0}>
              <Trash2 size={18} /> Delete
            </Button>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default ProviderSettingsPage;
