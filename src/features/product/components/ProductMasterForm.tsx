import { Trash2 } from "lucide-react";
import {
  Button,
  FormInput,
  ImageUploadPanel,
  SelectInput,
  Table,
} from "../../../components/common";
import {
  productBranchOptions,
  productCategoryOptions,
  productSubCategoryOptions,
  productTypeOptions,
  productUnitOptions,
} from "../constants";
import type { ProductAlternative, ProductForm } from "../types";

interface ProductMasterFormProps {
  form: ProductForm;
  isEditing: boolean;
  imagePreview?: string;
  alternatives: ProductAlternative[];
  alternativeDraft: Omit<ProductAlternative, "id">;
  onChange: <K extends keyof ProductForm>(key: K, value: ProductForm[K]) => void;
  onAlternativeChange: <K extends keyof Omit<ProductAlternative, "id">>(
    key: K,
    value: Omit<ProductAlternative, "id">[K]
  ) => void;
  onAddAlternative: () => void;
  onDeleteAlternative: (id: number) => void;
  onClear: () => void;
  onSave: () => void;
  onDeactivate: () => void;
  onImageSelect: (file: File | null) => void;
}

const ProductMasterForm = ({
  form,
  isEditing,
  imagePreview,
  alternatives,
  alternativeDraft,
  onChange,
  onAlternativeChange,
  onAddAlternative,
  onDeleteAlternative,
  onClear,
  onSave,
  onDeactivate,
  onImageSelect,
}: ProductMasterFormProps) => {
  return (
    <>
      <h3 className="mb-4 text-base font-semibold text-gray-900">Product Details</h3>

      <div className="grid gap-x-6 md:grid-cols-2">
        <FormInput
          label="Product Name"
          value={form.productName}
          onChange={(e) => onChange("productName", e.target.value)}
        />
        <SelectInput
          label="Unit"
          options={productUnitOptions}
          value={form.unit}
          placeholder="Select unit"
          onChange={(e) => onChange("unit", e.target.value)}
        />

        <FormInput
          label="Arabic Name"
          value={form.arabicName}
          onChange={(e) => onChange("arabicName", e.target.value)}
        />
        <FormInput label="P VAT" value={form.pVat} onChange={(e) => onChange("pVat", e.target.value)} />

        <FormInput
          label="Product Code"
          value={form.productCode}
          onChange={(e) => onChange("productCode", e.target.value)}
        />
        <FormInput label="S VAT" value={form.sVat} onChange={(e) => onChange("sVat", e.target.value)} />

        <SelectInput
          label="Category"
          options={productCategoryOptions}
          value={form.category}
          placeholder="Select category"
          onChange={(e) => onChange("category", e.target.value)}
        />
        <FormInput label="Cost" value={form.cost} onChange={(e) => onChange("cost", e.target.value)} />

        <SelectInput
          label="Sub Category"
          options={productSubCategoryOptions}
          value={form.subCategory}
          placeholder="Select sub category"
          onChange={(e) => onChange("subCategory", e.target.value)}
        />
        <SelectInput
          label="Branch"
          options={productBranchOptions}
          value={form.branch}
          placeholder="Select branch"
          onChange={(e) => onChange("branch", e.target.value)}
        />

        <SelectInput
          label="Type"
          options={productTypeOptions}
          value={form.type}
          placeholder="Select type"
          onChange={(e) => onChange("type", e.target.value)}
        />
        <FormInput
          label="Note (is active / stock / avg cost)"
          value={form.note}
          onChange={(e) => onChange("note", e.target.value)}
        />
      </div>

      <div className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-4">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-gray-600">
          Alternative
        </h3>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <SelectInput
            label="Branch"
            options={productBranchOptions}
            value={alternativeDraft.branch}
            placeholder="Branch"
            onChange={(e) => onAlternativeChange("branch", e.target.value)}
          />
          <FormInput
            label="Barcode"
            value={alternativeDraft.barcode}
            onChange={(e) => onAlternativeChange("barcode", e.target.value)}
          />
          <SelectInput
            label="Unit"
            options={productUnitOptions}
            value={alternativeDraft.unit}
            placeholder="Unit"
            onChange={(e) => onAlternativeChange("unit", e.target.value)}
          />
          <FormInput
            label="Price"
            value={alternativeDraft.price}
            onChange={(e) => onAlternativeChange("price", e.target.value)}
          />
          <FormInput
            label="Alt Name"
            value={alternativeDraft.altName}
            onChange={(e) => onAlternativeChange("altName", e.target.value)}
          />
          <FormInput
            label="Arabic Name"
            value={alternativeDraft.arabicName}
            onChange={(e) => onAlternativeChange("arabicName", e.target.value)}
          />
        </div>

        <div className="mt-1 flex justify-end">
          <Button onClick={onAddAlternative}>Add</Button>
        </div>

        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <Table
            rowKey="id"
            data={alternatives}
            columns={[
              { header: "Branch", accessor: "branch" },
              { header: "Barcode", accessor: "barcode" },
              { header: "Unit", accessor: "unit" },
              { header: "Price", accessor: "price" },
              { header: "Alt Name", accessor: "altName" },
              { header: "Arabic Name", accessor: "arabicName" },
              {
                header: "Action",
                accessor: "id",
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => onDeleteAlternative(row.id)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                    aria-label={`Delete ${row.altName}`}
                  >
                    <Trash2 size={16} />
                  </button>
                ),
              },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <ImageUploadPanel title="Product Image" preview={imagePreview} onSelect={onImageSelect} />

        <div className="flex flex-wrap items-center justify-end gap-3">
          <Button variant="secondary" onClick={onClear}>
            Clear
          </Button>
          <Button onClick={onSave}>{isEditing ? "Update" : "Save"}</Button>
          <Button variant="danger" disabled={!isEditing} onClick={onDeactivate}>
            Deactivate
          </Button>
        </div>
      </div>
    </>
  );
};

export default ProductMasterForm;
