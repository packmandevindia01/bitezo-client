import { Button, FormInput, Modal } from "../../../../components/common";
import type { CounterRecord } from "../../counter/types";
import type { SectionForm } from "../types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: SectionForm;
  counters: CounterRecord[];
  loading?: boolean;
  saving?: boolean;
  onChange: (key: keyof SectionForm, value: string) => void;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const SectionModal = ({
  isOpen,
  editingId,
  form,
  counters,
  saving,
  onChange,
  onClose,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Section Master" : "Add Section Master"}
      size="lg"
    >
      <div className="mx-auto max-w-3xl">
        <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
          {/* NAME FIELD */}
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
            Section Name
          </p>
          <FormInput
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            placeholder="Enter section name"
            autoFocus
          />

          {/* COUNTER FIELD */}
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
            Counter Name
          </p>
          <select
            value={form.counterId}
            onChange={(e) => onChange("counterId", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-[#49293e]/40 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <option value="">Select a counter</option>
            {counters.map((c) => (
              <option key={c.counterId} value={String(c.counterId)}>
                {c.counterName}
              </option>
            ))}
          </select>
        </div>

        {/* ACTIONS */}
        <div className="mt-8 flex flex-wrap gap-3">
          {editingId && (
            <Button
              variant="danger"
              onClick={onDelete}
              disabled={saving}
              className="mr-auto"
            >
              Delete Section
            </Button>
          )}
          <Button variant="secondary" onClick={onClear} disabled={saving}>
            Clear
          </Button>
          <Button onClick={onSave} loading={saving}>
            {editingId ? "Update" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SectionModal;

