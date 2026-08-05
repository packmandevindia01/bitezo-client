import { FormInput, SelectInput, Button } from "../../../../components/common";
import type { StockAdjustmentTypePayload } from "../types";
import { Save } from "lucide-react";

interface Props {
  form: StockAdjustmentTypePayload;
  setForm: (form: StockAdjustmentTypePayload) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const StockAdjustmentTypeForm = ({ form, setForm, onSave, isSaving }: Props) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="Type Name"
          value={form.typeName}
          maxLength={50}
          onChange={(e) => setForm({ ...form, typeName: e.target.value.slice(0, 50) })}
          disabled={isSaving}
          required
          autoFocus
        />
        <SelectInput
          label="Effect"
          value={form.effect}
          onChange={(e) => setForm({ ...form, effect: e.target.value })}
          disabled={isSaving}
          options={[
            { label: "All", value: "All" },
            { label: "+", value: "+" },
            { label: "-", value: "-" }
          ]}
          required
        />
      </div>
      <div className="flex justify-end pt-4">
        <Button onClick={onSave} loading={isSaving} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
};
