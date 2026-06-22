import { Button, Checkbox, FormInput, Modal, SelectInput } from "../../../../components/common";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import type { BranchOption, EmployeeRoleOption, EmployeeForm } from "../types";
import type { UseFormReturn } from "react-hook-form";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: UseFormReturn<EmployeeForm>;
  branches: BranchOption[];
  roles: EmployeeRoleOption[];
  saving?: boolean;
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
  roles,
  saving = false,
  onClose,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  const { watch, setValue, formState: { errors } } = form;

  const branchOptions = branches.map((b) => ({
    label: b.branchName,
    value: String(b.branchId),
  }));

  const roleOptions = roles.map((r) => ({
    label: r.roleName,
    value: String(r.roleId),
  }));

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
          >
            Clear
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
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
          Name {errors.name && <span className="lowercase text-red-500 font-normal ml-1">({errors.name.message})</span>}
        </p>
        <FormInput
          value={watch("name")}
          onChange={(e) => setValue("name", e.target.value)}
          placeholder="Enter employee name"
          autoFocus
        />

        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
          Code {errors.code && <span className="lowercase text-red-500 font-normal ml-1">({errors.code.message})</span>}
        </p>
        <FormInput
          value={watch("code")}
          onChange={(e) => setValue("code", e.target.value.toUpperCase().replace(/\s/g, ''))}
          placeholder="Enter employee code"
        />

        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
          Branch Name {errors.branchId && <span className="lowercase text-red-500 font-normal ml-1">({errors.branchId.message})</span>}
        </p>
        <SelectInput
          value={watch("branchId")}
          onChange={(e) => setValue("branchId", e.target.value)}
          options={branchOptions}
          placeholder="Select a branch"
        />

        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
          Role {errors.roleId && <span className="lowercase text-red-500 font-normal ml-1">({errors.roleId.message})</span>}
        </p>
        <SelectInput
          value={watch("roleId")}
          onChange={(e) => setValue("roleId", e.target.value)}
          options={roleOptions}
          placeholder="Select a role"
        />

        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Driver</p>
        <div className="flex items-center h-10.5">
          <Checkbox
            label="Is Driver"
            checked={watch("driver")}
            onChange={(e) => setValue("driver", e.target.checked)}
          />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Active</p>
        <div className="flex items-center h-10.5">
          <Checkbox
            label="Is Active"
            checked={watch("active")}
            onChange={(e) => setValue("active", e.target.checked)}
          />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">System Admin</p>
        <div className="flex items-center h-10.5">
          <Checkbox
            label="Is Master"
            checked={watch("isMaster")}
            onChange={(e) => setValue("isMaster", e.target.checked)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeModal;
