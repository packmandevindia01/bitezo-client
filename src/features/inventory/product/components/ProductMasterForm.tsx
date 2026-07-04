import { useState } from "react";
import { LayoutGrid, ListTree, Palette } from "lucide-react";
import { ImageUploadPanel } from "../../../../components/common";
import type { UseFormReturn } from "react-hook-form";
import type { ProductFormData } from "../schema/productSchema";
import type { MasterItem, ProductMasterData } from "../types";
import { useToast } from "../../../../app/providers/useToast";
import { ProductDetailsSection } from "./ProductDetailsSection";
import { AlternativePricingGrid } from "./AlternativePricingGrid";
import { BranchColorsSection } from "./BranchColorsSection";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductMasterFormProps {
  form: UseFormReturn<ProductFormData>;
  imagePreview?: string;
  masterData: ProductMasterData;
  branches: MasterItem[];
  subCategories: MasterItem[];
  onImageSelect: (file: File | null) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ProductMasterForm = ({
  form,
  imagePreview,
  masterData,
  branches,
  subCategories,
  onImageSelect
}: ProductMasterFormProps) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"product" | "alternatives" | "colors">("product");
  
  const handleTabSwitch = (tab: "product" | "alternatives" | "colors") => {
    if (tab !== "product") {
      const { code, name, categoryId, groupId, unitId, pVatId, sVatId, typeId } = form.getValues();
      const required = [
        { val: name, label: "Name" },
        { val: code, label: "Code" },
        { val: categoryId, label: "Category" },
        { val: groupId, label: "Group" },
        { val: unitId, label: "Unit" },
        { val: pVatId, label: "Purchase VAT" },
        { val: sVatId, label: "Sales VAT" },
        { val: typeId, label: "Type" },
      ];

      const missing = required.filter(f => !f.val);
      
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
            type="button"
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
            type="button"
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
            type="button"
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
      </div>

      <div className="flex-1 min-h-[400px]">
        {activeTab === "product" && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0">
            <ProductDetailsSection
              form={form}
              masterData={masterData}
              subCatOptions={subCatOptions}
            />
          </div>
          <div className="w-full lg:w-72 shrink-0">
            <ImageUploadPanel
              preview={imagePreview}
              onSelect={onImageSelect}
            />
          </div>
        </div>
      )}

      {activeTab === "alternatives" && (
        <AlternativePricingGrid
          alternatives={form.watch("altProducts") as any[]}
          onAlternativesChange={(alts) => form.setValue("altProducts", alts, { shouldValidate: true, shouldDirty: true })}
          masterData={masterData}
          branches={branches}
          mainUnitId={String(form.watch("unitId") || "")}
          mainBranchId={String(localStorage.getItem("branchId") || "0")}
          baseBarcode={form.watch("barcode") || ""}
          baseCode={form.watch("code") || ""}
          baseName={form.watch("name") || ""}
        />
      )}

      {activeTab === "colors" && (
        <BranchColorsSection
          form={form}
          branchOptions={branchOptions}
        />
      )}
      </div>
    </div>
  );
};

export default ProductMasterForm;
