import { useState, useRef, useEffect } from "react";
import { Plus, Trash2, LayoutGrid, ListTree } from "lucide-react";
import {
  Button,
  FormInput,
  ImageUploadPanel,
} from "../../../../components/common";
import SearchableSelect from "../../../../components/common/Searchableselect";
import { productTypeOptions } from "../constants";
import type {
  AltProductDraft,
  MasterItem,
  ProductFormState,
  ProductMasterData,
} from "../types";
import { useToast } from "../../../../app/providers/useToast";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductMasterFormProps {
  form: ProductFormState;
  isEditing: boolean;
  saving?: boolean;
  imagePreview?: string;
  alternatives: AltProductDraft[];
  alternativeDraft: Omit<AltProductDraft, "id">;

  masterData: ProductMasterData | null;
  branches: MasterItem[];
  subCategories: MasterItem[];
  loadingSubs?: boolean;

  onChange: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void;
  onAlternativeChange: <K extends keyof Omit<AltProductDraft, "id">>(
    key: K,
    value: Omit<AltProductDraft, "id">[K]
  ) => void;
  onAlternativesChange: (alternatives: AltProductDraft[]) => void;
  onAddAlternative: () => void;
  onDeleteAlternative: (id: number) => void;
  onClear: () => void;
  onSave: () => void;
  onDeactivate: () => void;
  onImageSelect: (file: File | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ProductMasterForm = ({
  form,
  isEditing,
  saving = false,
  imagePreview,
  alternatives,
  masterData,
  branches,
  subCategories,
  loadingSubs = false,
  onChange,
  onAlternativesChange,
  onClear,
  onSave,
  onDeactivate,
  onImageSelect,
}: ProductMasterFormProps) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"product" | "alternatives">("product");
  
  const handleTabSwitch = (tab: "product" | "alternatives") => {
    if (tab === "alternatives") {
      if (!form.name || !form.code || !form.categoryId || !form.unitId || !form.pVatId || !form.sVatId) {
        showToast("Please fill all required General fields (Name, Code, Category, Unit, Purchase & Sales VAT).", "warning");
        return;
      }
    }
    setActiveTab(tab);
  };

  // ── Grid Focus Management ──────────────────────────────────────────────────
  const [focusPos, setFocusPos] = useState({ r: 0, c: 0 });
  const cellRefs = useRef<Map<string, HTMLInputElement | HTMLSelectElement>>(new Map());
  const TOTAL_COLS = 7; // Branch, Barcode, Unit, isIncl, Price, Alt Name, Alt Name (Arabic)

  useEffect(() => {
    if (activeTab === "alternatives") {
      const key = `${focusPos.r}-${focusPos.c}`;
      const el = cellRefs.current.get(key);
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement) el.select();
      }
    }
  }, [focusPos, activeTab]);

  // ── Build option arrays ────────────────────────────────────────────────────
  const categoryOptions  = masterData?.category.map(c => ({ label: c.name, value: String(c.id) })) ?? [];
  const groupOptions     = masterData?.group.map(g => ({ label: g.name, value: String(g.id) })) ?? [];
  const unitOptions      = masterData?.unit.map(u => ({ label: u.name, value: String(u.id) })) ?? [];
  const vatOptions       = masterData?.vat.map(v => ({ label: `${v.name} (${v.value}%)`, value: String(v.id) })) ?? [];
  const subCatOptions    = subCategories.map(s => ({ label: s.name, value: String(s.id) }));
  const branchOptions    = branches.map(b => ({ label: b.name, value: String(b.id) }));

  // Filter alternative units to match the category of the currently selected main unit
  const mainUnitSelected = masterData?.unit.find(u => String(u.id) === String(form.unitId));
  const mainUnitCategory = mainUnitSelected?.category;
  const altUnitOptions = masterData?.unit
    .filter(u => (mainUnitCategory && u.category) ? u.category === mainUnitCategory : true)
    .map(u => ({ label: u.name, value: String(u.id) })) ?? [];

  // ── Grid Handlers ──────────────────────────────────────────────────────────
  const handleGridChange = (idx: number, key: keyof AltProductDraft, value: any) => {
    const next = [...alternatives];
    next[idx] = { ...next[idx], [key]: value };
    onAlternativesChange(next);
  };

  const addGridRow = () => {
    const newRow: AltProductDraft = {
      id: Date.now(),
      branchId: branches[0]?.id || 0,
      barcode: "",
      isIncl: true,
      unitId: masterData?.unit[0]?.id || 0,
      price: "0",
      altName: "",
      altArabic: "",
    };
    onAlternativesChange([...alternatives, newRow]);
  };

  const removeGridRow = (idx: number) => {
    onAlternativesChange(alternatives.filter((_, i) => i !== idx));
    if (focusPos.r >= alternatives.length - 1) {
      setFocusPos(p => ({ ...p, r: Math.max(0, alternatives.length - 2) }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, r: number, c: number) => {
    const isLastRow = r === alternatives.length - 1;
    const isLastCol = c === TOTAL_COLS - 1;

    switch (e.key) {
      case "ArrowUp":
        if (e.currentTarget instanceof HTMLSelectElement) return;
        e.preventDefault();
        setFocusPos(p => ({ ...p, r: Math.max(0, r - 1) }));
        break;
      case "ArrowDown":
        if (e.currentTarget instanceof HTMLSelectElement) return;
        e.preventDefault();
        if (isLastRow) addGridRow();
        setFocusPos(p => ({ ...p, r: Math.min(alternatives.length, r + 1) }));
        break;
      case "ArrowLeft":
        if (e.currentTarget instanceof HTMLInputElement && e.currentTarget.selectionStart !== 0) return;
        setFocusPos(p => ({ ...p, c: Math.max(0, c - 1) }));
        break;
      case "ArrowRight":
        if (e.currentTarget instanceof HTMLInputElement && e.currentTarget.selectionStart !== e.currentTarget.value.length) return;
        setFocusPos(p => ({ ...p, c: Math.min(TOTAL_COLS - 1, c + 1) }));
        break;
      case "Enter":
        if (c === 3) {
          e.preventDefault();
          handleGridChange(r, "isIncl", !alternatives[r].isIncl);
          return;
        }
        e.preventDefault();
        if (isLastRow) addGridRow();
        setFocusPos({ r: r + 1, c: 0 });
        break;
      case " ":
        if (c === 3) {
          e.preventDefault();
          handleGridChange(r, "isIncl", !alternatives[r].isIncl);
        }
        break;
      case "Tab":
        if (isLastCol && isLastRow && !e.shiftKey) {
          e.preventDefault();
          addGridRow();
          setFocusPos({ r: r + 1, c: 0 });
        }
        break;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* ── Custom Tab Navigation ────────────────────────────────────────── */}
      <div className="flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
        <button
          onClick={() => handleTabSwitch("product")}
          className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${
            activeTab === "product"
              ? "bg-white text-[#49293e] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <LayoutGrid size={18} />
          Product Section
        </button>
        <button
          onClick={() => handleTabSwitch("alternatives")}
          className={`flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-bold transition-all ${
            activeTab === "alternatives"
              ? "bg-white text-[#49293e] shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <ListTree size={18} />
          Alternative Products
        </button>
      </div>

      {activeTab === "product" ? (
        <div className="animate-in fade-in slide-in-from-left-2 duration-300">
          <h3 className="mb-4 text-base font-semibold text-gray-900">Product Details</h3>
          <div className="grid gap-x-6 md:grid-cols-2">
            <FormInput
              label="Product Name"
              value={form.name}
              disabled={saving}
              onChange={(e) => onChange("name", e.target.value)}
              required
            />
            <SearchableSelect
              label="Unit"
              options={unitOptions}
              value={form.unitId}
              placeholder="Select unit"
              onChange={(v) => onChange("unitId", v)}
              required
              disabled={saving}
            />
            <FormInput
              label="Arabic Name"
              value={form.arabicName}
              disabled={saving}
              onChange={(e) => onChange("arabicName", e.target.value)}
            />
            <SearchableSelect
              label="Purchase VAT"
              options={vatOptions}
              value={form.pVatId}
              placeholder="Select purchase VAT"
              onChange={(v) => onChange("pVatId", v)}
              required
              disabled={saving}
            />
            <FormInput
              label="Product Code"
              value={form.code}
              disabled={saving}
              onChange={(e) => onChange("code", e.target.value)}
              required
            />
            <SearchableSelect
              label="Sales VAT"
              options={vatOptions}
              value={form.sVatId}
              placeholder="Select sales VAT"
              onChange={(v) => onChange("sVatId", v)}
              required
              disabled={saving}
            />
            <SearchableSelect
              label="Group"
              options={groupOptions}
              value={form.groupId}
              placeholder="Select group"
              onChange={(v) => onChange("groupId", v)}
              required
              disabled={saving}
            />
            <SearchableSelect
              label="Category"
              options={categoryOptions}
              value={form.categoryId}
              placeholder="Select category"
              onChange={(v) => onChange("categoryId", v)}
              required
              disabled={saving}
            />
            <FormInput
              label="Cost"
              type="number"
              step="0.001"
              value={form.cost}
              disabled={saving}
              onChange={(e) => onChange("cost", e.target.value)}
              required
            />
            <SearchableSelect
              label="Sub Category"
              options={subCatOptions}
              value={form.subCatId}
              placeholder={loadingSubs ? "Loading…" : "Select sub category"}
              onChange={(v) => onChange("subCatId", v)}
              disabled={saving || loadingSubs}
            />
            <SearchableSelect
              label="Branch"
              options={branchOptions}
              value={form.branchId}
              placeholder="Select branch"
              onChange={(v) => onChange("branchId", v)}
              required
              disabled={saving}
            />
            <SearchableSelect
              label="Type"
              options={productTypeOptions}
              value={form.typeId}
              placeholder="Select type"
              onChange={(v) => onChange("typeId", v)}
              required
              disabled={saving}
            />
          </div>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-right-2 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900">Alternative Pricing Grid</h3>
            <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest text-[#49293e]/40">
               <span>Kbd Arrows: Nav</span> • <span>Enter: Add Row</span>
            </div>
          </div>
          
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left table-fixed">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="w-[18%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e]">Branch</th>
                    <th className="w-[15%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Barcode</th>
                    <th className="w-[15%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Unit</th>
                    <th className="w-[8%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200 text-center">Incl.</th>
                    <th className="w-[12%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Price</th>
                    <th className="w-[18%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Alt Name</th>
                    <th className="w-[20%] px-4 py-3 text-[10px] font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Alt Name (Arabic)</th>
                    <th className="w-12.5 px-2 py-3 border-l border-gray-200"></th>
                  </tr>
                </thead>
                <tbody>
                  {alternatives.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center">
                        <button
                          onClick={addGridRow}
                          className="text-sm font-bold text-[#49293e] hover:underline"
                        >
                          + Add first alternative row
                        </button>
                      </td>
                    </tr>
                  ) : (
                    alternatives.map((alt, rIdx) => (
                      <tr key={alt.id} className="group border-b border-gray-100 transition-colors hover:bg-gray-50/50">
                        <td className="p-0 border-r border-gray-100">
                          <select
                            ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-0`, el); }}
                            value={alt.branchId}
                            onFocus={() => setFocusPos({ r: rIdx, c: 0 })}
                            onKeyDown={(e) => handleKeyDown(e, rIdx, 0)}
                            onChange={(e) => handleGridChange(rIdx, "branchId", parseInt(e.target.value))}
                            className="h-full w-full appearance-none border-none bg-transparent px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10"
                          >
                            {branchOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </td>
                        <td className="p-0 border-r border-gray-100">
                          <input
                            ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-1`, el); }}
                            type="text"
                            value={alt.barcode}
                            onFocus={() => setFocusPos({ r: rIdx, c: 1 })}
                            onKeyDown={(e) => handleKeyDown(e, rIdx, 1)}
                            onChange={(e) => handleGridChange(rIdx, "barcode", e.target.value)}
                            className="h-full w-full border-none bg-transparent px-4 py-3 font-mono text-xs font-bold text-[#49293e] outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10"
                          />
                        </td>
                        <td className="p-0 border-r border-gray-100">
                          <select
                            ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-2`, el); }}
                            value={alt.unitId}
                            onFocus={() => setFocusPos({ r: rIdx, c: 2 })}
                            onKeyDown={(e) => handleKeyDown(e, rIdx, 2)}
                            onChange={(e) => handleGridChange(rIdx, "unitId", parseInt(e.target.value))}
                            className="h-full w-full appearance-none border-none bg-transparent px-4 py-3 text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10"
                          >
                            {altUnitOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                          </select>
                        </td>
                        <td className="p-0 border-r border-gray-100 text-center">
                           <input
                            ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-3`, el); }}
                            type="checkbox"
                            checked={alt.isIncl}
                            onFocus={() => setFocusPos({ r: rIdx, c: 3 })}
                            onKeyDown={(e) => handleKeyDown(e, rIdx, 3)}
                            onChange={(e) => handleGridChange(rIdx, "isIncl", e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-[#49293e] focus:ring-[#49293e]"
                           />
                        </td>
                        <td className="p-0 border-r border-gray-100">
                          <input
                            ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-4`, el); }}
                            type="number"
                            step="0.001"
                            value={alt.price}
                            onFocus={() => setFocusPos({ r: rIdx, c: 4 })}
                            onKeyDown={(e) => handleKeyDown(e, rIdx, 4)}
                            onChange={(e) => handleGridChange(rIdx, "price", e.target.value)}
                            className="h-full w-full border-none bg-transparent px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10"
                          />
                        </td>
                        <td className="p-0 border-r border-gray-100">
                          <input
                            ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-5`, el); }}
                            type="text"
                            value={alt.altName}
                            onFocus={() => setFocusPos({ r: rIdx, c: 5 })}
                            onKeyDown={(e) => handleKeyDown(e, rIdx, 5)}
                            onChange={(e) => handleGridChange(rIdx, "altName", e.target.value)}
                            className="h-full w-full border-none bg-transparent px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10"
                          />
                        </td>
                        <td className="p-0 border-r border-gray-100">
                          <input
                            ref={(el) => { if (el) cellRefs.current.set(`${rIdx}-6`, el); }}
                            type="text"
                            dir="rtl"
                            value={alt.altArabic || ""}
                            onFocus={() => setFocusPos({ r: rIdx, c: 6 })}
                            onKeyDown={(e) => handleKeyDown(e, rIdx, 6)}
                            onChange={(e) => handleGridChange(rIdx, "altArabic", e.target.value)}
                            className="h-full w-full border-none bg-transparent px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:bg-white focus:ring-2 focus:ring-[#49293e]/10 text-right"
                          />
                        </td>
                        <td className="px-2 py-1 text-center">
                           <button
                            onClick={() => removeGridRow(rIdx)}
                            className="rounded-lg p-1.5 text-gray-300 transition-all hover:bg-red-50 hover:text-red-500"
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
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
               <button
                onClick={addGridRow}
                className="flex items-center gap-2 text-xs font-bold text-[#49293e]/60 hover:text-[#49293e] transition-all"
               >
                 <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#49293e]/10">
                   <Plus size={12} />
                 </div>
                 Add New Row (Alt+N or Enter at end)
                </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Footer Action Buttons ────────────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-4 border-t border-gray-100 pt-6 md:flex-row md:items-end md:justify-between">
        <ImageUploadPanel
          title="Product Image"
          preview={imagePreview}
          onSelect={onImageSelect}
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClear} type="button" disabled={saving}>
            Clear
          </Button>
          <Button onClick={onSave} type="button" disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Update Product" : "Save Product"}
          </Button>
          <Button
            variant="danger"
            disabled={!isEditing || saving}
            onClick={onDeactivate}
            type="button"
          >
            Deactivate
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductMasterForm;