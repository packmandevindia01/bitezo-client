import { FormInput, SelectInput } from "../../../../components/common";
import type { StockAdjustmentTypePayload } from "../types";

interface Props {
  form: StockAdjustmentTypePayload;
  setForm: (form: StockAdjustmentTypePayload) => void;
  isSaving: boolean;
  errors?: { typeName?: string; effect?: string };
}

export const StockAdjustmentTypeForm = ({ form, setForm, isSaving, errors }: Props) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <FormInput
        label="Type Name"
        value={form.typeName}
        maxLength={50}
        onChange={(e) => setForm({ ...form, typeName: e.target.value.slice(0, 50) })}
        disabled={isSaving}
        required
        autoFocus
        error={errors?.typeName}
      />
      <SelectInput
        label="Effect"
        value={form.effect}
        onChange={(e) => setForm({ ...form, effect: e.target.value })}
        disabled={isSaving}
        placeholder="Select"
        options={[
          { label: "All", value: "All" },
          { label: "+", value: "+" },
          { label: "-", value: "-" }
        ]}
        required
        error={errors?.effect}
      />
    </div>
  );
};
