import { Modal, MasterActionButton, MasterFieldRow, MasterInput } from "../../../../components/common";
import type { SectionForm } from "../types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: SectionForm;
  onChange: (key: keyof SectionForm, value: string) => void;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
}

const SectionModal = ({ isOpen, editingId, form, onChange, onClose, onClear, onSave }: Props) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Section Master" : "Add Section Master"}
      size="lg"
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <div className="space-y-4">
          <MasterFieldRow label="Name">
            <MasterInput
              value={form.name}
              placeholder="Enter section name"
              onChange={(value) => onChange("name", value)}
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

export default SectionModal;

