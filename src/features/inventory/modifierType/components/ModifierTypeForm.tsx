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
  onDelete?: () => void;
}

const ModifierTypeForm = ({
  form,
  isEditing,
  saving = false,
  onChange,
  onClear,
  onSave,
  onDelete,
}: ModifierTypeFormProps) => {
  return (
    <>
      <div className="flex flex-col gap-4 mb-6">
        <FormInput
          label="Name"
          required
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          autoFocus
        />

        <FormInput
          label="Arabic"
          value={form.arabicName}
          onChange={(e) => onChange("arabicName", e.target.value)}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-3 mt-2">
        <Button variant="secondary" onClick={onClear} disabled={saving}>
          Clear
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : isEditing ? "Update" : "Save"}
        </Button>
        {isEditing && (
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={saving}
          >
            Delete
          </Button>
        )}
      </div>
    </>
  );
};

export default ModifierTypeForm;

