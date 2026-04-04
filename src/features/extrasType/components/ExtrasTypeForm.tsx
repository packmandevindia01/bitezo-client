import { Button, FormInput } from "../../../components/common";
import type { ExtrasTypeForm as ExtrasTypeFormType } from "../types";

interface ExtrasTypeFormProps {
  form: ExtrasTypeFormType;
  isEditing: boolean;
  onChange: <K extends keyof ExtrasTypeFormType>(key: K, value: ExtrasTypeFormType[K]) => void;
  onClear: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const ExtrasTypeForm = ({
  form,
  isEditing,
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
        />

        <FormInput
          label="Arabic"
          value={form.arabic}
          onChange={(e) => onChange("arabic", e.target.value)}
        />
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

export default ExtrasTypeForm;
