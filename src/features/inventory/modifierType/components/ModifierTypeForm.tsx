import { Button, FormInput } from "../../../../components/common";
import type { ModifierTypeForm as ModifierTypeFormType } from "../types";

interface ModifierTypeFormProps {
  form: ModifierTypeFormType;
  isEditing: boolean;
  saving?: boolean;
  onChange: <K extends keyof ModifierTypeFormType>(
    key: K,
    value: ModifierTypeFormType[K]
  ) => void;
  onClear: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const ModifierTypeForm = ({
  form,
  isEditing,
  saving = false,
  onChange,
  onClear,
  onSave,
  onCancel,
}: ModifierTypeFormProps) => {
  return (
    <>
      <h2 className="mb-6 text-center text-lg font-bold">MODIFIER TYPE</h2>

      <div className="flex max-w-sm flex-col gap-4">
        <FormInput
          label="Name"
          required
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
        />

        <FormInput
          label="Arabic"
          value={form.arabicName}
          onChange={(e) => onChange("arabicName", e.target.value)}
        />
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={onClear} disabled={saving}>
          Clear
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : isEditing ? "Update" : "Save"}
        </Button>
      </div>
    </>
  );
};

export default ModifierTypeForm;

