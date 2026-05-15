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
      <div className="flex flex-col gap-3">
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
    </>
  );
};

export default ModifierTypeForm;

