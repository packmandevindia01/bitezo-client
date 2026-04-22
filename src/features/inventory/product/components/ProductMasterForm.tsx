import { useState } from "react";
import { LayoutGrid, ListTree, Trash2 } from "lucide-react";
import {
  Button,
  ImageUploadPanel,
} from "../../../../components/common";
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
  isEditing: boolean;
  saving?: boolean;
  imagePreview?: string;
  alternatives: AltProductDraft[];
  masterData: ProductMasterData | null;
  branches: MasterItem[];
  subCategories: MasterItem[];
  loadingSubs?: boolean;

  onChange: <K extends keyof ProductFormState>(key: K, value: ProductFormState[K]) => void;
  onAlternativesChange: (alternatives: AltProductDraft[]) => void;
  onClear: () => void;
  onSave: () => void;
  onDeactivate: () => void;
  onDelete?: () => void;
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
  onDelete,
  onImageSelect,
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
          onAlternativesChange={onAlternativesChange}
        />
      )}

      {/* ── Footer Action Buttons ────────────────────────────────────────── */}
      <div className="mt-4 flex flex-col gap-4 border-t border-gray-100 pt-6 md:flex-row md:items-end md:justify-between">
        <ImageUploadPanel
          title="Product Image"
          preview={imagePreview}
          onSelect={onImageSelect}
        />

        <div className="flex flex-wrap items-center justify-end gap-3">
          {isEditing && (
            <Button
              variant="danger"
              disabled={saving}
              onClick={onDelete}
              type="button"
            >
              <Trash2 size={16} />
              Delete Product
            </Button>
          )}
          <Button variant="secondary" onClick={onClear} type="button" disabled={saving}>
            Clear
          </Button>
          <Button onClick={onSave} type="button" disabled={saving}>
            {saving ? "Saving…" : isEditing ? "Update Product" : "Save Product"}
          </Button>
          <Button
            variant="secondary"
            className="text-red-600 border-red-100 hover:bg-red-50"
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
