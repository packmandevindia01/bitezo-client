import { Building2, Loader2, Trash2 } from "lucide-react";
import { Button, FormInput, Modal } from "../../../../components/common";
import type { CounterOption, PaymodeForm } from "../types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: PaymodeForm;
  saving: boolean;
  counterAllocOpen: boolean;
  selectedCounterIds: number[];
  counterOptions: CounterOption[];
  onClose: () => void;
  onChange: (patch: Partial<PaymodeForm>) => void;
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
  onChange,
  onToggleCounterAlloc,
  onToggleCounter,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Paymode" : "Add Paymode"}
      size="xl"
    >
      <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-col gap-6">
          <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
            {/* Paymode Code */}
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              Paymode Code
            </p>
            <FormInput
              value={form.code}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, ""); // Remove non-numeric characters
                onChange({ code: val });
              }}
              placeholder="Enter paymode code"
            />



            {/* Paymode Name */}
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              Paymode Name
            </p>
            <FormInput
              value={form.paymodeName}
              onChange={(e) => onChange({ paymodeName: e.target.value })}
              placeholder="Enter paymode name"
              autoFocus
            />

            {/* Active toggle */}
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              Active
            </p>
            <label className="flex cursor-pointer items-center gap-2 w-fit">
              <div
                role="switch"
                aria-checked={form.isActive}
                onClick={() => onChange({ isActive: !form.isActive })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.isActive ? "bg-[#49293e]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    form.isActive ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </div>
              <span className="text-sm text-gray-700">
                {form.isActive ? "Active" : "Inactive"}
              </span>
            </label>
          </div>

          {/* Action buttons */}
          <div className="mt-2 flex flex-wrap justify-end gap-3">
            <Button
              variant="secondary"
              className="bg-[#f0e8ed] text-[#49293e] hover:bg-[#e7dbe2]"
              onClick={onToggleCounterAlloc}
              disabled={saving}
            >
              <Building2 size={16} />
              Counter Allocation
            </Button>
            <Button variant="secondary" onClick={onClear} disabled={saving}>
              Clear
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin" />
                  Saving…
                </span>
              ) : (
                editingId ? "Update" : "Save"
              )}
            </Button>
            {editingId && (
              <Button
                variant="danger"
                onClick={onDelete}
                disabled={saving}
              >
                <Trash2 size={16} />
                Delete Paymode
              </Button>
            )}
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
      </section>
    </Modal>
  );
};

export default PaymodeModal;


