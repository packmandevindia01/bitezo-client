import { useState } from "react";
import { Button, FormInput } from "../../../components/common";
import type { GroupForm as GroupFormState, GroupRecord } from "../types";

interface Props {
  initialData?: GroupRecord | null;
  onSubmit: (data: GroupFormState) => void;
  onCancel: () => void;
}

const createInitialForm = (initialData?: GroupRecord | null): GroupFormState => ({
  code: initialData?.code ?? "",
  name: initialData?.name ?? "",
});

const GroupForm = ({ initialData, onSubmit, onCancel }: Props) => {
  const [form, setForm] = useState<GroupFormState>(() => createInitialForm(initialData));

  const handleChange = <K extends keyof GroupFormState>(key: K, value: GroupFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setForm(createInitialForm(initialData));
  };

  const handleSubmit = () => {
    if (!form.code.trim() || !form.name.trim()) return;

    onSubmit({
      code: form.code.trim(),
      name: form.name.trim(),
    });
  };

  return (
    <>
      <h2 className="mb-6 text-center text-lg font-bold">GROUP MASTER</h2>

      <div className="flex max-w-sm flex-col gap-4">
        <FormInput
          label="Code"
          autoFocus
          value={form.code}
          onChange={(e) => handleChange("code", e.target.value)}
        />

        <FormInput
          label="Name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
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

export default GroupForm;
