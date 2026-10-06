import { useEffect } from "react";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import { Button, FormInput, Modal, Checkbox } from "../../../../components/common";
import { CounterAllocationSelect } from "./CounterAllocationSelect";
import { useToast } from "../../../../app/providers/useToast";
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
  onOpenCounters?: () => void;
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
  onOpenCounters,
}: Props) => {
  const { register, formState: { errors } } = form;
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const nameInput = document.getElementById("pm-name");
        if (nameInput) {
          nameInput.focus();
          if (nameInput instanceof HTMLInputElement) {
            nameInput.select?.();
          }
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
              tabIndex={-1}
              maxLength={9}
              readOnly={true}
              inputClassName="cursor-not-allowed bg-slate-50 font-mono font-medium text-slate-700"
              {...register("code")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("pm-name")?.focus();
                }
              }}
              placeholder="Auto-generated"
              error={errors.code?.message as string}
            />

            {/* Paymode Name */}
            <FormInput
              id="pm-name"
              label="Paymode Name"
              required
              tabIndex={1}
              maxLength={25}
              autoFocus
              {...register("paymodeName")}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const val = form.getValues("paymodeName");
                  if (!val || !val.trim()) {
                    void form.trigger("paymodeName");
                    showToast("Paymode name is required", "error");
                    setTimeout(() => {
                      const el = document.getElementById("pm-name");
                      el?.focus();
                      if (el instanceof HTMLInputElement) el.select?.();
                    }, 50);
                    return;
                  }
                  setTimeout(() => {
                    document.getElementById("pm-counter-select")?.focus();
                  }, 50);
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
              onOpen={onOpenCounters}
              onChange={(ids) => form.setValue("counterIds", ids, { shouldDirty: true, shouldValidate: true })}
            />

            {/* Active toggle */}
            <Checkbox
              id="pm-active"
              label="Active"
              tabIndex={2}
              checked={form.watch("isActive")}
              onChange={(e) => form.setValue("isActive", e.target.checked, { shouldDirty: true, shouldValidate: true })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  document.getElementById("pm-save-btn")?.focus();
                }
              }}
            />
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default PaymodeModal;
