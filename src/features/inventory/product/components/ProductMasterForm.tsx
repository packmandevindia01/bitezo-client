import { useState } from "react";
import { LayoutGrid, ListTree, Palette, Boxes } from "lucide-react";
import { ImageUploadPanel } from "../../../../components/common";
import type { UseFormReturn } from "react-hook-form";
import type { ProductFormData } from "../schema/productSchema";
import type { MasterItem, ProductMasterData } from "../types";
import { useToast } from "../../../../app/providers/useToast";
import { ProductDetailsSection } from "./ProductDetailsSection";
import { AlternativePricingGrid } from "./AlternativePricingGrid";
import { BranchColorsSection } from "./BranchColorsSection";
import { OpeningStockGrid } from "./OpeningStockGrid";
import { useQuery } from "@tanstack/react-query";
import { productService } from "../services/productService";
import { formatAmount } from "../../../../utils/currency";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProductMasterFormProps {
  form: UseFormReturn<ProductFormData>;
  imagePreview?: string;
  masterData: ProductMasterData;
  branches: MasterItem[];
  subCategories: MasterItem[];
  onImageSelect: (file: File | null) => void;
  currentBranchId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

const ProductMasterForm = ({
  form,
  imagePreview,
  masterData,
  branches,
  subCategories,
  onImageSelect,
  currentBranchId
}: ProductMasterFormProps) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"product" | "alternatives" | "openingStocks" | "colors">("product");
  
  const handleTabSwitch = (tab: "product" | "alternatives" | "openingStocks" | "colors") => {
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

  const productId = form.watch("productId");
  const unitId = form.watch("unitId");

  const { data: stockData, isLoading: isLoadingStock } = useQuery({
    queryKey: ["productClosingStock", productId, currentBranchId],
    queryFn: () => productService.getClosingStock(Number(productId), currentBranchId),
    enabled: !!productId && !!currentBranchId
  });

  const { data: costData, isLoading: isLoadingCost } = useQuery({
    queryKey: ["productAverageCost", productId, unitId, currentBranchId],
    queryFn: () => productService.getAverageCost(Number(productId), Number(unitId), currentBranchId),
    enabled: !!productId && !!unitId && !!currentBranchId
  });

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
            onClick={() => handleTabSwitch("openingStocks")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all border ${
              activeTab === "openingStocks"
                ? "bg-white text-[#49293e] border-[#49293e]/20 shadow-sm"
                : "bg-transparent text-slate-500 border-transparent hover:bg-gray-100"
            }`}
          >
            <Boxes size={14} />
            Opening Stocks
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
              branchOptions={branchOptions}
            />
          </div>
          <div className="w-full lg:w-72 shrink-0">
            <ImageUploadPanel
              preview={imagePreview}
              onSelect={onImageSelect}
            />
            {productId && (
              <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Current Branch Details
                </h3>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50/50 border border-gray-100">
                    <span className="text-xs font-medium text-gray-500">Stock</span>
                    <span className="text-sm font-bold text-[#49293e]">
                      {isLoadingStock ? "..." : (stockData?.stock || "0")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-gray-50/50 border border-gray-100">
                    <span className="text-xs font-medium text-gray-500">Avg Cost</span>
                    <span className="text-sm font-bold font-mono text-gray-700">
                      {isLoadingCost ? "..." : (typeof costData?.avgCost === 'number' ? formatAmount(costData.avgCost) : "0.000")}
                    </span>
                  </div>
                </div>
              </div>
            )}
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

      {activeTab === "openingStocks" && (
        <OpeningStockGrid
          openingStocks={form.watch("openingStocks") as any[]}
          onOpeningStocksChange={(stocks) => form.setValue("openingStocks", stocks, { shouldValidate: true, shouldDirty: true })}
          masterData={masterData}
          branches={branches}
          mainUnitId={String(form.watch("unitId") || "")}
          mainBranchId={String(localStorage.getItem("branchId") || "0")}
          defaultCost={String(form.watch("cost") || "0")}
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
