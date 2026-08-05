import { Button, FormInput, Modal } from "../../../../components/common";
import SearchableSelect from "../../../../components/common/Searchableselect";
import { Save, RotateCcw } from "lucide-react";
import { useQuickAddUnit } from "../hooks/useQuickAddUnit";
import { unitCategoryOptions } from "../../unit/constants";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
}

export const QuickAddUnitModal = ({ isOpen, onClose, onCreated }: Props) => {
  const { form, handleSubmit, handleClear, isSaving, parentOptions, loadingParents } =
    useQuickAddUnit(onCreated, onClose, isOpen);

  const { register, watch, setValue, formState: { errors } } = form;

  const parentSelectOptions = [
    { label: loadingParents ? "Loading..." : "None (Base Unit)", value: "0" },
    ...parentOptions.map(p => ({
      label: `${p.name} (Val: ${p.currentValue})`,
      value: String(p.unitId),
    })),
  ];

  const categorySelectOptions = unitCategoryOptions.map(o => ({
    label: o.label,
    value: o.value,
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
    <Modal isOpen={isOpen} onClose={() => { form.reset(); onClose(); }} title="Quick Add Unit" size="sm">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 pb-2">
        <FormInput
          id="q-unit-name"
          label="Unit Name"
          required
          autoFocus
          {...register("name")}
          onKeyDown={(e) => handleKeyDown(e, "q-unit-category")}
          error={errors.name?.message}
        />
        <SearchableSelect
          id="q-unit-category"
          label="Category"
          required
          options={categorySelectOptions}
          value={watch("category")}
          onChange={(v) => setValue("category", v, { shouldValidate: true })}
          placeholder="Select category"
          onKeyDown={(e) => handleKeyDown(e, "q-unit-conversion")}
          error={errors.category?.message}
          disableAutoOpenOnFocus
        />
        <FormInput
          id="q-unit-conversion"
          label="Conversion Factor"
          type="number"
          step="0.000001"
          inputClassName="text-right"
          {...register("conversion")}
          onKeyDown={(e) => handleKeyDown(e, "q-unit-parent")}
          error={errors.conversion?.message}
        />
        <SearchableSelect
          id="q-unit-parent"
          label="Parent Unit"
          options={parentSelectOptions}
          value={String(watch("parentId") ?? 0)}
          onChange={(v) => setValue("parentId", Number(v), { shouldValidate: false })}
          placeholder="Select parent unit"
          disableAutoOpenOnFocus
        />
        <FormInput
          label="Calculated Value"
          value={(watch("currentValue") ?? 0).toFixed(6)}
          readOnly
          tabIndex={-1}
          inputClassName="cursor-not-allowed bg-gray-50 text-right"
        />
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="secondary" onClick={handleClear} tabIndex={-1} isAction icon={<RotateCcw size={16} />}>
            Clear
          </Button>
          <Button type="submit" loading={isSaving} isAction icon={<Save size={16} />}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
};
