import { useState } from "react";
import { Trash2, Save, RotateCcw } from "lucide-react";
import { Button, FormInput } from "../../../../components/common";
import type { TaxFormState, TaxDetail } from "../types";

interface Props {
  initialData?: TaxDetail | null;
  saving?: boolean;
  error?: string | null;
  onSubmit: (form: TaxFormState) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onClear?: () => void;
}

const createInitialForm = (initialData?: TaxDetail | null): TaxFormState => ({
  name: initialData?.name ?? "",
  value: initialData?.value?.toString() ?? "",
  expireAt: initialData?.expireAt ? new Date(initialData.expireAt).toISOString().split("T")[0] : "",
});

const TaxForm = ({ initialData, saving = false, error, onSubmit, onDelete, onClear }: Props) => {
  const [form, setForm] = useState<TaxFormState>(() => createInitialForm(initialData));

  const handleChange = (key: keyof TaxFormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setForm(createInitialForm(null));
    if (onClear) onClear();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.value || !form.expireAt) return;

    onSubmit({
      ...form,
      name: form.name.trim(),
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextFieldId) {
        document.getElementById(nextFieldId)?.focus();
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-600 border border-amber-100">
          {error}
        </div>
      )}

      <section className="grid gap-x-4 gap-y-3 md:grid-cols-2">
        <FormInput
          id="tax-name"
          label="Tax Name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "tax-value")}
          placeholder="e.g. VAT 10%"
          required
          autoFocus
        />

        <FormInput
          id="tax-value"
          label="Tax Value (%)"
          type="number"
          step="0.01"
          inputClassName="text-right"
          value={form.value}
          onChange={(e) => handleChange("value", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "tax-date")}
          placeholder="e.g. 10"
          required
        />

        <FormInput
          id="tax-date"
          label="End Date"
          type="date"
          value={form.expireAt}
          onChange={(e) => handleChange("expireAt", e.target.value)}
          required
        />
      </section>

      <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-100">
        <Button 
          variant="secondary" 
          onClick={handleClear} 
          type="button" 
          disabled={saving} 
          tabIndex={-1}
          isAction
          icon={<RotateCcw size={18} />}
        >
          Clear
        </Button>
        <Button 
          type="submit" 
          loading={saving}
          isAction
          icon={<Save size={18} />}
        >
          Save
        </Button>
        {initialData && (
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={saving}
            isAction
            icon={<Trash2 size={18} />}
          >
            Delete
          </Button>
        )}
      </div>
    </form>
  );
};

export default TaxForm;
