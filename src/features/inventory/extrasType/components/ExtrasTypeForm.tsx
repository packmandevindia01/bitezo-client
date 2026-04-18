import { Button, FormInput } from "../../../../components/common";
import type { ExtrasTypeForm as ExtrasTypeFormType } from "../types";

interface ExtrasTypeFormProps {
  form: ExtrasTypeFormType;
  isEditing: boolean;
  saving?: boolean;
  onChange: <K extends keyof ExtrasTypeFormType>(key: K, value: ExtrasTypeFormType[K]) => void;
  onClear: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const ExtrasTypeForm = ({
  form,
  isEditing,
  saving = false,
  onChange,
  onClear,
  onSave,
  onCancel,
}: ExtrasTypeFormProps) => {
  return (
    <>
      <h2 className="mb-6 text-center text-lg font-bold">EXTRAS TYPE</h2>

      <div className="flex max-w-sm flex-col gap-4">
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

export default ExtrasTypeForm;

