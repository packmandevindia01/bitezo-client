import { useState } from "react";
import { LayoutGrid, ListTree, Palette, X } from "lucide-react";
import { ImageUploadPanel } from "../../../../components/common";
import type {
  AltProductDraft,
  MasterItem,
  ProductFormState,
  ProductMasterData,
} from "../types";
import { useToast } from "../../../../app/providers/useToast";
import { ProductDetailsSection } from "./ProductDetailsSection";
import { AlternativePricingGrid } from "./AlternativePricingGrid";
import { BranchColorsSection } from "./BranchColorsSection";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductMasterFormProps {
  form: ProductFormState;
  saving?: boolean;
  imagePreview?: string;
  alternatives: AltProductDraft[];
  masterData: ProductMasterData | null;
  branches: MasterItem[];
  subCategories: MasterItem[];
  loadingSubs?: boolean;

  onChange: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void;
  onAlternativesChange: (alternatives: AltProductDraft[]) => void;
  onClear?: () => void;
  onSave?: () => void;
  onDeactivate?: () => void;
  onDelete?: () => void;
  onBackToList?: () => void;
  onImageSelect: (file: File | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ProductMasterForm = ({
  form,
  saving = false,
  imagePreview,
  alternatives,
  masterData,
  branches,
  subCategories,
  loadingSubs = false,
  onChange,
  onAlternativesChange,
  onImageSelect,
  onBackToList,
}: ProductMasterFormProps) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"product" | "alternatives" | "colors">("product");
  
  const handleTabSwitch = (tab: "product" | "alternatives" | "colors") => {
    if (tab !== "product") {
      const required = [
        { key: "name", label: "Name" },
        { key: "code", label: "Code" },
        { key: "categoryId", label: "Category" },
        { key: "groupId", label: "Group" },
        { key: "unitId", label: "Unit" },
        { key: "branchId", label: "Branch" },
        { key: "pVatId", label: "Purchase VAT" },
        { key: "sVatId", label: "Sales VAT" },
      ];

      const missing = required.filter(f => !form[f.key as keyof ProductFormState]);
      
      if (missing.length > 0) {
        showToast(`Please fill all required fields: ${missing.map(m => m.label).join(", ")}.`, "warning");
        return;
      }
    }
    setActiveTab(tab);
  };

  const branchOptions = branches.map(b => ({ label: b.name, value: String(b.id) }));
  const subCatOptions = subCategories.map(s => ({ label: s.name, value: String(s.id) }));

  return (
    <div className="flex flex-col gap-6">
      {/* ── Custom Tab Navigation ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex w-fit gap-2 rounded-xl bg-gray-50 p-1.5 border border-gray-100">
          <button
            onClick={() => handleTabSwitch("product")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeTab === "product"
                ? "bg-white text-[#49293e] border-[#49293e]/20 shadow-sm"
                : "bg-transparent text-slate-500 border-transparent hover:bg-gray-100"
            }`}
          >
            <LayoutGrid size={14} />
            Product Details
          </button>
          <button
            onClick={() => handleTabSwitch("alternatives")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeTab === "alternatives"
                ? "bg-white text-[#49293e] border-[#49293e]/20 shadow-sm"
                : "bg-transparent text-slate-500 border-transparent hover:bg-gray-100"
            }`}
          >
            <ListTree size={14} />
            Alternatives
          </button>
          <button
            onClick={() => handleTabSwitch("colors")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeTab === "colors"
                ? "bg-white text-[#49293e] border-[#49293e]/20 shadow-sm"
                : "bg-transparent text-slate-500 border-transparent hover:bg-gray-100"
            }`}
          >
            <Palette size={14} />
            Branch Colors
          </button>
        </div>

        {onBackToList && (
          <button
            type="button"
            onClick={onBackToList}
            aria-label="Back to product list"
            title="Back to product list"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-[#49293e] focus:outline-none focus:ring-2 focus:ring-[#49293e]/30 shadow-sm"
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 min-h-[400px]">
        {activeTab === "product" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_240px]">
            <ProductDetailsSection
              form={form}
              saving={saving}
              masterData={masterData}
              branchOptions={branchOptions}
              subCatOptions={subCatOptions}
              loadingSubs={loadingSubs}
              onChange={onChange}
            />
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Product Image</label>
              <ImageUploadPanel
                title=""
                preview={imagePreview}
                onSelect={onImageSelect}
              />
            </div>
          </div>
        )}

        {activeTab === "alternatives" && (
          <AlternativePricingGrid
            alternatives={alternatives}
            masterData={masterData}
            branches={branches}
            mainUnitId={form.unitId}
            mainBranchId={form.branchId}
            onAlternativesChange={onAlternativesChange}
          />
        )}

        {activeTab === "colors" && (
          <BranchColorsSection
            productColors={form.productColors}
            branches={branches}
            onChange={(colors) => onChange("productColors", colors)}
            disabled={saving}
          />
        )}
      </div>
    </div>
  );
};

export default ProductMasterForm;
