import { Modal, MasterActionButton, MasterFieldRow, MasterInput } from "../../../../components/common";
import type { PaymodeForm } from "../types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: PaymodeForm;
  onChange: (key: keyof PaymodeForm, value: string) => void;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const PaymodeModal = ({ isOpen, editingId, form, onChange, onClose, onClear, onSave, onDelete }: Props) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Paymode Master" : "Add Paymode Master"}
      size="lg"
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="space-y-4">
          <MasterFieldRow label="S No">
            <MasterInput value={form.id} readOnly onChange={(value) => onChange("id", value)} />
          </MasterFieldRow>

          <MasterFieldRow label="Paymode">
            <MasterInput
              value={form.paymode}
              placeholder="Enter paymode name"
              onChange={(value) => onChange("paymode", value)}
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

          <MasterFieldRow label="Counter">
            <MasterInput
              value={form.counter}
              placeholder="Enter counter"
              onChange={(value) => onChange("counter", value)}
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
              Delete Paymode
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

export default PaymodeModal;

