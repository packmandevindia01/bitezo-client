import { Button, Checkbox, FormInput, Modal } from "../../../../components/common";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import type { BranchOption } from "../types";

interface EmployeeFormState {
  name: string;
  code: string;
  branchId: string;
  driver: boolean;
  active: boolean;
  isMaster: boolean;
}

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: EmployeeFormState;
  branches: BranchOption[];
  saving?: boolean;
  onChange: (patch: Partial<EmployeeFormState>) => void;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const EmployeeModal = ({
  isOpen,
  editingId,
  form,
  branches,
  saving = false,
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
      title={editingId ? "Edit Employee" : "Add Employee"}
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
      <div className="grid gap-3 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Name</p>
        <FormInput
          value={form.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Enter employee name"
          autoFocus
        />

        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Code</p>
        <FormInput
          value={form.code}
          onChange={(e) => onChange({ code: e.target.value })}
          placeholder="Enter employee code"
        />

        <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Branch Name
        </p>
        <select
          value={form.branchId}
          onChange={(e) => onChange({ branchId: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-[#49293e]/40 disabled:cursor-not-allowed disabled:bg-slate-50"
        >
          <option value="">
            {branches.length === 0 ? "Loading branches…" : "Select a branch"}
          </option>
          {branches.map((b) => (
            <option key={b.branchId} value={String(b.branchId)}>
              {b.branchName}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 rounded-xl border border-gray-100 bg-gray-50/50 px-3 py-2">
        <Checkbox
          label="Driver"
          checked={form.driver}
          onChange={(e) => onChange({ driver: e.target.checked })}
        />
        <Checkbox
          label="Active"
          checked={form.active}
          onChange={(e) => onChange({ active: e.target.checked })}
        />
        <Checkbox
          label="Master"
          checked={form.isMaster}
          onChange={(e) => onChange({ isMaster: e.target.checked })}
        />
      </div>
    </Modal>
  );
};

export default EmployeeModal;
