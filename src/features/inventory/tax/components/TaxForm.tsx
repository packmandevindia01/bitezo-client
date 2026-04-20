import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, FormInput } from "../../../../components/common";
import type { TaxFormState, TaxDetail } from "../types";

interface Props {
  initialData?: TaxDetail | null;
  saving?: boolean;
  error?: string | null;
  onSubmit: (form: TaxFormState) => void;
  onCancel: () => void;
  onDelete?: () => void;
}

const createInitialForm = (initialData?: TaxDetail | null): TaxFormState => ({
  name: initialData?.name ?? "",
  value: initialData?.value?.toString() ?? "",
  expireAt: initialData?.expireAt ? new Date(initialData.expireAt).toISOString().split("T")[0] : "",
});

const TaxForm = ({ initialData, saving = false, error, onSubmit, onDelete }: Props) => {
  const [form, setForm] = useState<TaxFormState>(() => createInitialForm(initialData));

  const handleChange = (key: keyof TaxFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setForm(createInitialForm(initialData));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.value || !form.expireAt) return;

    onSubmit({
      ...form,
      name: form.name.trim(),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      <section className="grid gap-5 md:grid-cols-2">
        <FormInput
          label="Tax Name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="e.g. VAT 10%"
          required
          autoFocus
        />

        <FormInput
          label="Tax Value (%)"
          type="number"
          step="0.01"
          value={form.value}
          onChange={(e) => handleChange("value", e.target.value)}
          placeholder="e.g. 10"
          required
        />

        <FormInput
          label="End Date"
          type="date"
          value={form.expireAt}
          onChange={(e) => handleChange("expireAt", e.target.value)}
          required
        />
      </section>

      <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-100">
        {initialData && (
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={saving}
            className="mr-auto"
          >
            <Trash2 size={16} />
            Delete Tax
          </Button>
        )}
        <Button variant="secondary" onClick={handleClear} type="button" disabled={saving}>
          Reset
        </Button>
        <Button type="submit" loading={saving}>
          {initialData ? "Update Tax" : "Create Tax"}
        </Button>
      </div>
    </form>
  );
};

export default TaxForm;
