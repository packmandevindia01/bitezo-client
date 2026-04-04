import { useState } from "react";
import { Button, FormInput, SelectInput } from "../../../components/common";
import { initialParentUnitOptions, unitCategoryOptions } from "../constants";
import type { UnitForm as UnitFormState, UnitRecord } from "../types";

interface Props {
  initialData?: UnitRecord | null;
  onSubmit: (data: UnitFormState) => void;
  onCancel: () => void;
}

const createInitialForm = (initialData?: UnitRecord | null): UnitFormState => ({
  category: initialData?.category ?? "",
  name: initialData?.name ?? "",
  parentUnit: initialData?.parentUnit ?? "",
  conversion: initialData?.conversion ?? "",
});

const UnitForm = ({ initialData, onSubmit, onCancel }: Props) => {
  const [form, setForm] = useState<UnitFormState>(() => createInitialForm(initialData));

  const handleChange = <K extends keyof UnitFormState>(key: K, value: UnitFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setForm(createInitialForm(initialData));
  };

  const handleSubmit = () => {
    if (
      !form.category.trim() ||
      !form.name.trim() ||
      !form.parentUnit.trim() ||
      !form.conversion.trim()
    ) {
      return;
    }

    onSubmit({
      category: form.category.trim(),
      name: form.name.trim(),
      parentUnit: form.parentUnit.trim(),
      conversion: form.conversion.trim(),
    });
  };

  return (
    <>
      <h2 className="mb-6 text-center text-lg font-bold">UNIT MASTER</h2>

      <div className="flex max-w-sm flex-col gap-4">
        <SelectInput
          label="Category"
          options={unitCategoryOptions}
          value={form.category}
          onChange={(e) => handleChange("category", e.target.value)}
          placeholder="Select category"
        />

        <FormInput
          label="Name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
        />

        <SelectInput
          label="Parent Unit"
          options={initialParentUnitOptions}
          value={form.parentUnit}
          onChange={(e) => handleChange("parentUnit", e.target.value)}
          placeholder="Select parent unit"
        />

        <FormInput
          label="Conversion"
          type="number"
          value={form.conversion}
          onChange={(e) => handleChange("conversion", e.target.value)}
        />
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={handleClear}>
          Clear
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Save</Button>
      </div>
    </>
  );
};

export default UnitForm;
