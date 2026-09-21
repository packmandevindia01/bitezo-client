import { Save, RotateCcw, Trash2 } from "lucide-react";
import { Button, FormInput, Modal, Checkbox } from "../../../../components/common";
import { CounterAllocationSelect } from "./CounterAllocationSelect";
import type { CounterOption } from "../types";
import type { UseFormReturn } from "react-hook-form";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: UseFormReturn<any>; // from usePaymodeManager
  saving: boolean;
  selectedCounterIds: number[];
  counterOptions: CounterOption[];
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const PaymodeModal = ({
  isOpen,
  editingId,
  form,
  saving,
  selectedCounterIds,
  counterOptions,
  onClose,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  const { register, formState: { errors } } = form;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Paymode" : "Add Paymode"}
      size="xl"
      footer={
        <div className="flex gap-3">
          <Button 
            type="button"
            variant="secondary" 
            onClick={onClear} 
            disabled={saving} 
            tabIndex={-1}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Clear
          </Button>
          <Button 
            id="pm-save-btn"
            type="button"
            onClick={onSave} 
            disabled={saving}
            isAction
            loading={saving}
            icon={<Save size={18} />}
          >
            {editingId ? "Update" : "Save"}
          </Button>
          {editingId && onDelete && (
            <Button
              type="button"
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
      }
    >
      {/* We use a form so users can submit via enter if desired, though onSave handles submit */}
      <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4">
            {/* Paymode Code */}
            <FormInput
              id="pm-code"
              label="Paymode Code"
              required
              tabIndex={1}
              maxLength={9}
              {...register("code", {
                onChange: (e) => {
                  e.target.value = e.target.value.replace(/[^0-9]/g, "").slice(0, 9);
                }
              })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("pm-name")?.focus();
                }
              }}
              placeholder="Enter paymode code"
              autoFocus
              error={errors.code?.message as string}
            />

            {/* Paymode Name */}
            <FormInput
              id="pm-name"
              label="Paymode Name"
              required
              tabIndex={2}
              maxLength={25}
              {...register("paymodeName")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("pm-counter-select")?.focus();
                }
              }}
              placeholder="Enter paymode name"
              error={errors.paymodeName?.message as string}
            />

            {/* Counter Allocation Dropdown */}
            <CounterAllocationSelect
              id="pm-counter-select"
              counterOptions={counterOptions}
              selectedIds={selectedCounterIds}
              disabled={saving}
              onChange={(ids) => form.setValue("counterIds", ids, { shouldDirty: true, shouldValidate: true })}
            />

            {/* Active toggle */}
            <Checkbox
              label="Active"
              tabIndex={4}
              checked={form.watch("isActive")}
              onChange={(e) => form.setValue("isActive", e.target.checked, { shouldDirty: true, shouldValidate: true })}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default PaymodeModal;
