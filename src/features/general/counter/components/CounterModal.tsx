import { Button, FormInput, Modal } from "../../../../components/common";
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
          />
          <Button 
            onClick={onSave} 
            loading={saving}
            isAction
            icon={<Save size={18} />}
          />
          {editingId && (
            <Button
              variant="danger"
              onClick={onDelete}
              disabled={saving}
              isAction
              icon={<Trash2 size={18} />}
            />
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
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Branch Name</label>
          <select
            value={form.branchId}
            onChange={(e) => onChange("branchId", e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-[#49293e]/40 disabled:cursor-not-allowed disabled:bg-slate-50"
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
    </Modal>
  );
};

export default CounterModal;

