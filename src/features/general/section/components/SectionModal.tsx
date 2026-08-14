import { Button, FormInput, Modal, SelectInput } from "../../../../components/common";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import type { CounterRecord } from "../../counter/types";
import type { SectionForm } from "../types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: SectionForm;
  errors?: { name?: string; counterId?: string };
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
  errors,
  counters,
  saving,
  onChange,
  onClose,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  const handleEnter = (e: React.KeyboardEvent, nextId?: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (nextId) {
        document.getElementById(nextId)?.focus();
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Section Master" : "Add Section Master"}
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
            id="section-save"
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
      <div className="flex flex-col gap-4">
        {/* NAME FIELD */}
        <FormInput
          id="section-name"
          label="Section Name"
          required
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Enter section name"
          onKeyDown={(e) => handleEnter(e, "section-counter")}
          autoFocus
          error={errors?.name}
          maxLength={30}
        />

        {/* COUNTER FIELD */}
        <SelectInput
          id="section-counter"
          label="Counter"
          required
          value={form.counterId}
          onChange={(e) => onChange("counterId", e.target.value)}
          options={counters.map((c) => ({
            label: c.counterName,
            value: String(c.counterId),
          }))}
          placeholder="Select a counter"
          onKeyDown={(e) => handleEnter(e, "section-save")}
          error={errors?.counterId}
        />
      </div>
    </Modal>
  );
};

export default SectionModal;

