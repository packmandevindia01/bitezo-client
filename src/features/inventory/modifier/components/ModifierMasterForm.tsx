import { Button, FormInput, SelectInput } from "../../../../components/common";
import { modifierBranchOptions, modifierCategoryOptions } from "../constants";
import type { ModifierForm } from "../types";

interface ModifierMasterFormProps {
  form: ModifierForm;
  isEditing: boolean;
  onChange: <K extends keyof ModifierForm>(key: K, value: ModifierForm[K]) => void;
  onClear: () => void;
  onSave: () => void;
}

const ModifierMasterForm = ({
  form,
  isEditing,
  onChange,
  onClear,
  onSave,
}: ModifierMasterFormProps) => {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-gray-900">Modifier Details</h3>
        {isEditing && <span className="text-xs font-semibold text-[#49293e]">Editing Mode</span>}
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <SelectInput
          label="Category"
          options={modifierCategoryOptions}
          value={form.category}
          placeholder="Select category"
          onChange={(e) => onChange("category", e.target.value)}
        />

        <div className="flex items-end">
          <Button
            variant={form.isMultiCategory ? "primary" : "secondary"}
            className="w-full"
            onClick={() => onChange("isMultiCategory", !form.isMultiCategory)}
          >
            Multi Cat
          </Button>
        </div>

        <FormInput label="Name" value={form.name} onChange={(e) => onChange("name", e.target.value)} />
        <FormInput
          label="Arabic"
          value={form.arabic}
          onChange={(e) => onChange("arabic", e.target.value)}
        />
        <FormInput
          label="Color"
          value={form.color}
          onChange={(e) => onChange("color", e.target.value)}
        />
        <SelectInput
          label="Branch"
          options={modifierBranchOptions}
          value={form.branch}
          placeholder="Select branch"
          onChange={(e) => onChange("branch", e.target.value)}
        />
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        <Button variant="secondary" onClick={onClear}>
          Clear
        </Button>
        <Button onClick={onSave}>{isEditing ? "Update" : "Save"}</Button>
      </div>
    </>
  );
};

export default ModifierMasterForm;

