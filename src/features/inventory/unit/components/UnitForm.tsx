import { useEffect, useState } from "react";
import { Button, FormInput, SelectInput } from "../../../../components/common";
import { unitCategoryOptions } from "../constants";
import { unitService } from "../services/unitService";
import type { UnitFormState, UnitDetail, UnitNameListItem } from "../types";

interface Props {
  initialData?: UnitDetail | null;
  saving?: boolean;
  error?: string | null;
  onSubmit: (data: UnitFormState) => void;
  onCancel: () => void;
}

const createInitialForm = (initialData?: UnitDetail | null): UnitFormState => ({
  name: initialData?.name ?? "",
  category: initialData?.category ?? "Quantity",
  conversion: initialData?.conversion ?? 1,
  currentValue: initialData?.currentValue ?? 0,
  parentId: initialData?.parentId ?? 0,
});

const UnitForm = ({ initialData, saving = false, error, onSubmit, onCancel }: Props) => {
  const [form, setForm] = useState<UnitFormState>(() => createInitialForm(initialData));
  const [parentOptions, setParentOptions] = useState<UnitNameListItem[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);

  // ─── Fetch Parent Options ───────────────────────────────────────────────────

  useEffect(() => {
    let active = true;
    const loadParents = async () => {
      if (!form.category) return;
      setLoadingParents(true);
      try {
        const data = await unitService.listFilteredNames(form.category, initialData?.unitId);
        if (active) setParentOptions(data);
      } catch (err) {
        console.error("Failed to load parent units:", err);
      } finally {
        if (active) setLoadingParents(false);
      }
    };

    loadParents();
    return () => { active = false; };
  }, [form.category, initialData?.unitId]);

  // ─── Calculation Logic ──────────────────────────────────────────────────────

  useEffect(() => {
    const selectedParent = parentOptions.find(p => p.unitId === form.parentId);
    const parentVal = selectedParent?.currentValue ?? 1; // Default to 1 if no parent (base unit)
    
    // If we have no parent selected but there are options, we might be a base unit.
    // If the user selection is explicit, we use that.
    
    setForm(prev => ({
      ...prev,
      currentValue: prev.conversion * parentVal
    }));
  }, [form.conversion, form.parentId, parentOptions]);

  const handleChange = <K extends keyof UnitFormState>(key: K, value: UnitFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleClear = () => {
    setForm(createInitialForm(initialData));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category) return;
    if (form.conversion <= 0) {
      // Logic would normally use a validation state, but here we can just return or rely on 'required'
      // Since 'error' is passed as a prop, the hook handles most errors, but we can prevent submission here.
      alert("Conversion factor must be greater than zero.");
      return;
    }

    onSubmit({
      ...form,
      name: form.name.trim(),
    });
  };

  const selectOptions = parentOptions.map(p => ({
    label: `${p.name} (Val: ${p.currentValue})`,
    value: String(p.unitId)
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
          {error}
        </div>
      )}

      <section className="grid gap-5 md:grid-cols-2">
        <SelectInput
          label="Category"
          options={unitCategoryOptions}
          value={form.category}
          onChange={(e) => {
            handleChange("category", e.target.value);
            handleChange("parentId", 0); // Reset parent on category change
          }}
          placeholder="Select category"
          required
        />

        <FormInput
          label="Unit Name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          placeholder="e.g. Box, Dozen"
          required
        />

        <FormInput
          label="Conversion Factor"
          type="number"
          min="1"
          value={form.conversion <= 0 ? "" : String(form.conversion)}
          onChange={(e) => {
            const val = e.target.value === "" ? 0 : Number(e.target.value);
            // Allow typing 0 temporarily if empty, but we'll validate on submit
            handleChange("conversion", Math.max(0, val));
          }}
          placeholder="e.g. 12"
          required
        />

        <SelectInput
          label="Parent Unit"
          options={selectOptions}
          value={form.parentId ? String(form.parentId) : ""}
          onChange={(e) => handleChange("parentId", Number(e.target.value))}
          disabled={loadingParents}
          placeholder="Select parent unit"
          required
        />

        <div className="md:col-span-2">
           <div className="rounded-xl border border-[#49293e]/10 bg-[#49293e]/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-[#49293e]/60">Calculated Current Value</p>
              <p className="mt-1 text-2xl font-black text-[#49293e]">{form.currentValue}</p>
              <p className="mt-1 text-[10px] text-slate-500">
                Formula: {form.conversion} (Conversion) × {parentOptions.find(p => p.unitId === form.parentId)?.currentValue ?? 1} (Parent Value)
              </p>
           </div>
        </div>
      </section>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
        >
          Cancel
        </button>
        <Button variant="secondary" onClick={handleClear} type="button" disabled={saving}>
          Reset
        </Button>
        <Button type="submit" loading={saving}>
          {initialData ? "Update Unit" : "Create Unit"}
        </Button>
      </div>
    </form>
  );
};

export default UnitForm;
