import { Button, Checkbox, FormInput, SelectInput } from "../../../../components/common";
import {
  extrasBranchOptions,
  extrasCategoryOptions,
  extrasTypeOptions,
} from "../constants";
import type { ExtrasMasterForm as ExtrasMasterFormType } from "../types";

interface ExtrasMasterFormProps {
  form: ExtrasMasterFormType;
  isEditing: boolean;
  onChange: <K extends keyof ExtrasMasterFormType>(
    key: K,
    value: ExtrasMasterFormType[K]
  ) => void;
  onClear: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const ExtrasMasterForm = ({
  form,
  isEditing,
  onChange,
  onClear,
  onSave,
  onCancel,
}: ExtrasMasterFormProps) => {
  return (
    <>
      <h2 className="mb-6 text-center text-lg font-bold">EXTRAS MASTER</h2>

      <div className="grid max-w-2xl gap-4 md:grid-cols-2">
        <SelectInput
          label="Category"
          options={extrasCategoryOptions}
          value={form.category}
          placeholder="Select category"
          onChange={(e) => onChange("category", e.target.value)}
        />

        <SelectInput
          label="Type"
          options={extrasTypeOptions}
          value={form.type}
          placeholder="Select type"
          onChange={(e) => onChange("type", e.target.value)}
        />

        <FormInput
          label="Name"
          required
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
        />

        <FormInput
          label="Arabic"
          value={form.arabic}
          onChange={(e) => onChange("arabic", e.target.value)}
        />

        <FormInput
          label="Price (Incl)"
          type="number"
          value={form.price}
          onChange={(e) => onChange("price", e.target.value)}
        />

        <SelectInput
          label="Branch"
          options={extrasBranchOptions}
          value={form.branch}
          placeholder="Select branch"
          onChange={(e) => onChange("branch", e.target.value)}
        />

        <div className="flex flex-col gap-1">
          <label className="text-xs md:text-sm font-medium text-gray-700">Color</label>
          <div className="flex h-[42px] items-center gap-3 rounded-md border border-gray-300 bg-white px-3">
            <input
              type="color"
              value={form.color}
              onChange={(e) => onChange("color", e.target.value)}
              className="h-8 w-10 cursor-pointer rounded border-none bg-transparent p-0"
            />
            <span className="text-sm text-gray-700">{form.color}</span>
          </div>
        </div>

        <div className="flex items-end">
          <Checkbox
            label="Multi Category"
            checked={form.isMultiCategory}
            onChange={(e) => onChange("isMultiCategory", e.target.checked)}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={onClear}>
          Clear
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={onSave}>{isEditing ? "Update" : "Save"}</Button>
      </div>
    </>
  );
};

export default ExtrasMasterForm;

