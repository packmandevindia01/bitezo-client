import { Button, Checkbox, FormInput, Modal, SelectInput } from "../../../components/common";
import { employeeBranchOptions } from "../constants";

interface EmployeeFormState {
  name: string;
  code: string;
  branch: string;
  driver: boolean;
  active: boolean;
  isMaster: boolean;
}

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: EmployeeFormState;
  onChange: (patch: Partial<EmployeeFormState>) => void;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
}

const EmployeeModal = ({ isOpen, editingId, form, onChange, onClose, onClear, onSave }: Props) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Employee" : "Add Employee"}
      size="lg"
    >
      <div className="mx-auto max-w-3xl">
        <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Name</p>
          <FormInput
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Enter employee name"
          />

          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">Code</p>
          <FormInput
            value={form.code}
            onChange={(e) => onChange({ code: e.target.value })}
            placeholder="Enter employee code"
          />

          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
            Branch Name
          </p>
          <SelectInput
            options={employeeBranchOptions}
            value={form.branch}
            onChange={(e) => onChange({ branch: e.target.value })}
            placeholder="Choose branch"
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-5 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
          <Checkbox
            label="Driver"
            checked={form.driver}
            onChange={(e) => onChange({ driver: e.target.checked })}
          />
          <Checkbox
            label="Active/not"
            checked={form.active}
            onChange={(e) => onChange({ active: e.target.checked })}
          />
          <Checkbox
            label="Is Master"
            checked={form.isMaster}
            onChange={(e) => onChange({ isMaster: e.target.checked })}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={onClear}>
            Clear
          </Button>
          <Button onClick={onSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeModal;
