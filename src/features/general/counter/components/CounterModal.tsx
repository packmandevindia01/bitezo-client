import { Modal, MasterActionButton, MasterFieldRow, MasterInput } from "../../../../components/common";
import type { CounterForm } from "../types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: CounterForm;
  onChange: (key: keyof CounterForm, value: string) => void;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const CounterModal = ({ isOpen, editingId, form, onChange, onClose, onClear, onSave }: Props) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Counter Master" : "Add Counter Master"}
      size="lg"
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="space-y-4">
          <MasterFieldRow label="Name">
            <MasterInput
              value={form.name}
              placeholder="Enter counter name"
              onChange={(value) => onChange("name", value)}
              autoFocus
            />
          </MasterFieldRow>

          <MasterFieldRow label="Branch">
            <MasterInput
              value={form.branch}
              placeholder="Enter branch"
              onChange={(value) => onChange("branch", value)}
            />
          </MasterFieldRow>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {editingId && (
            <MasterActionButton
              variant="secondary"
              className="!border-red-200 !bg-red-50 !text-red-600 hover:!bg-red-100"
              onClick={onDelete || (() => {})}
            >
              Delete Counter
            </MasterActionButton>
          )}
          <MasterActionButton variant="secondary" onClick={onClear}>
            Clear
          </MasterActionButton>
          <MasterActionButton onClick={onSave}>
            {editingId ? "Update" : "Save"}
          </MasterActionButton>
        </div>
      </div>
    </Modal>
  );
};

export default CounterModal;

