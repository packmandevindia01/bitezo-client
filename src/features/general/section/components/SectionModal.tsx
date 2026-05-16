import { Button, FormInput, Modal, SelectInput } from "../../../../components/common";
import { Save, RotateCcw, Trash2 } from "lucide-react";
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
      <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
        {/* NAME FIELD */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
          Section Name
        </p>
        <FormInput
          value={form.name}
          onChange={(e) => onChange("name", e.target.value)}
          placeholder="Enter section name"
          autoFocus
        />

        {/* COUNTER FIELD */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
          Counter Name
        </p>
        <SelectInput
          value={form.counterId}
          onChange={(e) => onChange("counterId", e.target.value)}
          options={counters.map((c) => ({
            label: c.counterName,
            value: String(c.counterId),
          }))}
          placeholder="Select a counter"
        />
      </div>
    </Modal>
  );
};

export default SectionModal;

