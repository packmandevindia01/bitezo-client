import { Trash2 } from "lucide-react";
import { Button, FormInput } from "../../../../components/common";
import type { ExtrasTypeForm as ExtrasTypeFormType } from "../types";

interface ExtrasTypeFormProps {
  form: ExtrasTypeFormType;
  isEditing: boolean;
  saving?: boolean;
  onChange: <K extends keyof ExtrasTypeFormType>(key: K, value: ExtrasTypeFormType[K]) => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const ExtrasTypeForm = ({
  form,
  isEditing,
  saving = false,
  onChange,
  onClear,
  onSave,
  onDelete,
}: ExtrasTypeFormProps) => {
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

export default ExtrasTypeForm;

