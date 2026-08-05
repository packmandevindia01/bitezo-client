import { useEffect, useState } from "react";
import { Trash2, Save, RotateCcw, X } from "lucide-react";
import { Button, FormInput } from "../../../../components/common";
import SearchableSelect from "../../../../components/common/Searchableselect";
import { unitCategoryOptions } from "../constants";
import { unitService } from "../services/unitService";
import type { UnitFormState, UnitDetail, UnitNameListItem } from "../types";

interface Props {
  initialData?: UnitDetail | null;
  saving?: boolean;
  error?: string | null;
  onSubmit: (form: UnitFormState) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onClear?: () => void;
}

const createInitialForm = (initialData?: UnitDetail | null): UnitFormState => ({
  name: initialData?.name ?? "",
  category: initialData?.category ?? "Quantity",
  conversion: initialData?.conversion ?? 1,
  currentValue: initialData?.currentValue ?? 0,
  parentId: initialData?.parentId ?? 0,
});

const UnitForm = ({ initialData, saving = false, error, onSubmit, onCancel, onDelete, onClear }: Props) => {
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
    setForm(createInitialForm(null));
    if (onClear) onClear();
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
        <SearchableSelect
          id="unit-category"
          label="Category"
          options={unitCategoryOptions}
          value={form.category}
          onChange={(v) => {
            handleChange("category", v);
            handleChange("parentId", 0);
          }}
          placeholder="Select category"
          required
          autoFocus
          disableAutoOpenOnFocus
        />

        <FormInput
          id="unit-name"
          label="Unit Name"
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          onKeyDown={(e) => handleKeyDown(e, "unit-conversion")}
          placeholder="e.g. Box, Dozen"
          required
        />

        <FormInput
          id="unit-conversion"
          label="Conversion Factor"
          type="number"
          min="1"
          inputClassName="text-right"
          value={form.conversion <= 0 ? "" : String(form.conversion)}
          onChange={(e) => {
            const val = e.target.value === "" ? 0 : Number(e.target.value);
            handleChange("conversion", Math.max(0, val));
          }}
          onKeyDown={(e) => handleKeyDown(e, "unit-parent")}
          placeholder="e.g. 12"
          required
        />

        <SearchableSelect
          id="unit-parent"
          label="Parent Unit"
          options={[
            { label: loadingParents ? "Loading..." : "Select parent unit", value: "" },
            ...selectOptions,
          ]}
          value={form.parentId ? String(form.parentId) : ""}
          onChange={(v) => handleChange("parentId", Number(v))}
          disabled={loadingParents}
          placeholder="Select parent unit"
          required
          disableAutoOpenOnFocus
        />

        <div className="md:col-span-2">
           <div className="rounded-xl border border-[#49293e]/10 bg-[#49293e]/5 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#49293e]/60">Calculated Current Value</p>
              <p className="mt-1 text-2xl font-black text-[#49293e]">{form.currentValue}</p>
              <p className="mt-1 text-[10px] text-slate-500">
                Formula: {form.conversion} (Conversion) × {parentOptions.find(p => p.unitId === form.parentId)?.currentValue ?? 1} (Parent Value)
              </p>
           </div>
        </div>
      </section>

      <div className="flex flex-wrap justify-end gap-3 pt-4 border-t border-gray-100">
        <Button 
          variant="secondary" 
          onClick={onCancel} 
          type="button" 
          disabled={saving} 
          tabIndex={-1}
          isAction
          icon={<X size={18} />}
        >
          Cancel
        </Button>
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
        {initialData && (initialData.unitId > 4) && (
          <Button
            variant="danger"
            onClick={onDelete}
            disabled={saving}
            tabIndex={-1}
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

export default UnitForm;
