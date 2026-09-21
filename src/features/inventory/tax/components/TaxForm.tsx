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

interface FieldErrors {
  name?: string;
  value?: string;
  expireAt?: string;
}

const TaxForm = ({ initialData, saving = false, error, onSubmit, onDelete, onClear }: Props) => {
  const [form, setForm] = useState<TaxFormState>(() => createInitialForm(initialData));
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleChange = (key: keyof TaxFormState, value: string) => {
    if (key === "name" && value.length > 15) {
      value = value.slice(0, 15);
    }
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    }
  };

  const handleClear = () => {
    setForm(createInitialForm(null));
    setErrors({});
    if (onClear) onClear();
    setTimeout(() => document.getElementById("tax-name")?.focus(), 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: FieldErrors = {};
    if (!form.name.trim()) {
      newErrors.name = "required";
    }
    if (!form.value || isNaN(Number(form.value)) || Number(form.value) < 0) {
      newErrors.value = "required";
    }
    if (!form.expireAt) {
      newErrors.expireAt = "required";
    } else {
      const today = new Date().toISOString().split("T")[0];
      if (form.expireAt < today) {
        newErrors.expireAt = "Cannot be a past date";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstKey = newErrors.name ? "tax-name" : newErrors.value ? "tax-value" : "tax-date";
      setTimeout(() => {
        const el = document.getElementById(firstKey);
        el?.focus();
        if (el instanceof HTMLInputElement) {
          el.select?.();
        }
      }, 50);
      return;
    }

    onSubmit({
      ...form,
      name: form.name.trim().slice(0, 15),
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
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {error && (
        <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-600 border border-amber-100 font-medium">
          {error}
        </div>
      )}

      <section className="grid gap-x-4 gap-y-3 md:grid-cols-2">
        <FormInput
          id="tax-name"
          label="Tax Name"
          value={form.name}
          error={errors.name}
          onChange={(e) => handleChange("name", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "tax-value")}
          placeholder="e.g. VAT 10%"
          required
          autoFocus
          maxLength={15}
        />

        <FormInput
          id="tax-value"
          label="Tax Value (%)"
          type="number"
          step="0.01"
          inputClassName="text-right"
          value={form.value}
          error={errors.value}
          onChange={(e) => handleChange("value", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "tax-date")}
          placeholder="e.g. 10"
          required
        />

        <FormInput
          id="tax-date"
          label="End Date"
          type="date"
          min={new Date().toISOString().split("T")[0]}
          value={form.expireAt}
          error={errors.expireAt}
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
