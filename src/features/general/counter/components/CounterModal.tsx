import { Button, FormInput, Modal, SelectInput } from "../../../../components/common";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import type { BranchRecord } from "../../../inventory/branches/types";
import type { CounterForm } from "../types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: CounterForm;
  errors?: { name?: string; branchId?: string };
  branches: BranchRecord[];
  loading?: boolean;
  saving?: boolean;
  onChange: (key: keyof CounterForm, value: string) => void;
  onClose: () => void;
  onClear: () => void;
  onSave: () => Promise<any>;
  onDelete?: () => void;
}

const CounterModal = ({
  isOpen,
  editingId,
  form,
  errors = {},
  branches,
  saving,
  onChange,
  onClose,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  const handleSaveClick = async () => {
    const res = await onSave();
    if (res && !res.success && res.firstInvalidField) {
      const targetId = res.firstInvalidField === "name" ? "counter-name" : "counter-branch";
      document.getElementById(targetId)?.focus();
    }
  };

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
            Clear
          </Button>
          <Button 
            id="counter-save-btn"
            onClick={handleSaveClick} 
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
          id="counter-name"
          label="Name"
          required
          value={form.name}
          error={errors.name}
          onChange={(e) => onChange("name", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              document.getElementById("counter-branch")?.focus();
            }
          }}
          placeholder="Enter counter name"
          autoFocus
        />

        {/* BRANCH FIELD */}
        <SelectInput
          id="counter-branch"
          label="Branch Name"
          required
          value={form.branchId}
          error={errors.branchId}
          onChange={(e) => onChange("branchId", e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              document.getElementById("counter-save-btn")?.focus();
            }
          }}
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

