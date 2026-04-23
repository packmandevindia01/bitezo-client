import { Button, FormInput, Modal } from "../../../../components/common";
import type { BranchRecord } from "../../../inventory/branches/types";
import type { CounterForm } from "../types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: CounterForm;
  branches: BranchRecord[];
  loading?: boolean;
  saving?: boolean;
  onChange: (key: keyof CounterForm, value: string) => void;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const CounterModal = ({
  isOpen,
  editingId,
  form,
  branches,
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
      title={editingId ? "Edit Counter Master" : "Add Counter Master"}
      size="lg"
    >
      <div className="mx-auto max-w-3xl">
      <div className="flex flex-col gap-4">
        {/* NAME FIELD */}
        <FormInput
          label="Name"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Enter counter name"
          autoFocus
        />

        {/* BRANCH FIELD */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700">Branch Name</label>
          <select
            value={form.branchId}
            onChange={(e) => onChange("branchId", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-[#49293e]/40 disabled:cursor-not-allowed disabled:bg-slate-50"
          >
            <option value="">Select a branch</option>
            {branches.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.branchName}
              </option>
            ))}
          </select>
        </div>
      </div>

        {/* ACTIONS */}
        <div className="mt-8 flex flex-wrap justify-end gap-3">
          <Button variant="secondary" onClick={onClear} disabled={saving}>
            Clear
          </Button>
          <Button onClick={onSave} loading={saving}>
            {editingId ? "Update" : "Save"}
          </Button>
          {editingId && (
            <Button
              variant="danger"
              onClick={onDelete}
              disabled={saving}
            >
              Delete Counter
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CounterModal;

