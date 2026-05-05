import { useState } from "react";
import { LayoutGrid, ListTree, X } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState<"product" | "alternatives">("product");
  
  const handleTabSwitch = (tab: "product" | "alternatives") => {
    if (tab === "alternatives") {
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

        {onBackToList && (
          <button
            type="button"
            onClick={onBackToList}
            aria-label="Back to product list"
            title="Back to product list"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-500 transition hover:bg-gray-50 hover:text-[#49293e] focus:outline-none focus:ring-2 focus:ring-[#49293e]/30"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {activeTab === "product" ? (
        <ProductDetailsSection
          form={form}
          saving={saving}
          masterData={masterData}
          branchOptions={branchOptions}
          subCatOptions={subCatOptions}
          loadingSubs={loadingSubs}
          onChange={onChange}
        />
      ) : (
        <AlternativePricingGrid
          alternatives={alternatives}
          masterData={masterData}
          branches={branches}
          mainUnitId={form.unitId}
          mainBranchId={form.branchId}
          onAlternativesChange={onAlternativesChange}
        />
      )}

      {/* ── Image + Buttons footer ── */}
      <div className="mt-4 border-t border-gray-100 pt-6">
        <ImageUploadPanel
          title="Product Image"
          preview={imagePreview}
          onSelect={onImageSelect}
        />
      </div>
    </div>
  );
};

export default ProductMasterForm;
