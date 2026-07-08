import { Building2, Save, RotateCcw, Trash2 } from "lucide-react";
import { Button, FormInput, Modal, Checkbox } from "../../../../components/common";
import type { CounterOption } from "../types";
import type { UseFormReturn } from "react-hook-form";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: UseFormReturn<any>; // from usePaymodeManager
  saving: boolean;
  counterAllocOpen: boolean;
  selectedCounterIds: number[];
  counterOptions: CounterOption[];
  onClose: () => void;
  onToggleCounterAlloc: () => void;
  onToggleCounter: (counterId: number) => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const PaymodeModal = ({
  isOpen,
  editingId,
  form,
  saving,
  counterAllocOpen,
  selectedCounterIds,
  counterOptions,
  onClose,
  onToggleCounterAlloc,
  onToggleCounter,
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
            className="bg-[#f0e8ed] text-[#49293e] hover:bg-[#e7dbe2]"
            onClick={onToggleCounterAlloc}
            disabled={saving}
            isAction
            icon={<Building2 size={18} />}
          >
            Counters
          </Button>
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
              label="Paymode Code"
              required
              tabIndex={1}
              {...register("code", {
                onChange: (e) => {
                  // Transform input directly on change: uppercase, no spaces
                  e.target.value = e.target.value.toUpperCase().replace(/\s/g, "");
                }
              })}
              placeholder="Enter paymode code"
              autoFocus
              error={errors.code?.message as string}
            />

            {/* Paymode Name */}
            <FormInput
              label="Paymode Name"
              required
              tabIndex={2}
              {...register("paymodeName")}
              placeholder="Enter paymode name"
              error={errors.paymodeName?.message as string}
            />

            {/* Active toggle */}
            <Checkbox
              label="Active"
              tabIndex={3}
              checked={form.watch("isActive")}
              onChange={(e) => form.setValue("isActive", e.target.checked, { shouldDirty: true, shouldValidate: true })}
            />
          </div>

          {/* Counter allocation panel */}
          {counterAllocOpen && (
            <div className="rounded-2xl border border-[#49293e]/15 bg-[#49293e]/3 p-5">
              <p className="text-sm font-semibold text-gray-800">Counter Allocation</p>
              <p className="mt-1 text-xs text-gray-500">
                Choose which counters can use this payment mode.
              </p>

              {counterOptions.length === 0 ? (
                <p className="mt-4 text-xs text-gray-400 italic">No counters available.</p>
              ) : (
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {counterOptions.map((counter) => {
                    const active = selectedCounterIds.includes(counter.counterId);
                    return (
                      <button
                        key={counter.counterId}
                        type="button"
                        onClick={() => onToggleCounter(counter.counterId)}
                        className={`rounded-full border px-5 py-2 text-sm font-medium transition ${
                          active
                            ? "border-[#49293e] bg-[#49293e] text-white shadow-sm"
                            : "border-gray-200 bg-white text-gray-600 hover:border-[#49293e]/30 hover:bg-gray-50"
                        }`}
                      >
                        {counter.counterName}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
};

export default PaymodeModal;
