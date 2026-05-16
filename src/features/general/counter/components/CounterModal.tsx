import { Button, FormInput, Modal, SelectInput } from "../../../../components/common";
import { Save, RotateCcw, Trash2 } from "lucide-react";
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
      footer={
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            onClick={onClear} 
            disabled={saving} 
            tabIndex={-1}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Reset
          </Button>
          <Button 
            onClick={onSave} 
            loading={saving}
            isAction
            icon={<Save size={18} />}
          >
            {editingId ? "Update" : "Save"}
          </Button>
          {editingId && (
            <Button
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
      <div className="flex flex-col gap-3">
        {/* NAME FIELD */}
        <FormInput
          label="Name"
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Enter counter name"
          autoFocus
        />

        {/* BRANCH FIELD */}
        <SelectInput
          label="Branch Name"
          value={form.branchId}
          onChange={(e) => onChange("branchId", e.target.value)}
          options={branches.map((b) => ({
            label: b.branchName,
            value: String(b.id),
          }))}
          placeholder="Select a branch"
        />
      </div>
    </Modal>
  );
};

export default CounterModal;

