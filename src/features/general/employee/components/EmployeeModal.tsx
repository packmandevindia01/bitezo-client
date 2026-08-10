import { Button, Checkbox, FormInput, Modal, SelectInput } from "../../../../components/common";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import type { BranchOption, EmployeeRoleOption, EmployeeForm } from "../types";
import type { UseFormReturn } from "react-hook-form";
import { useEnterKeyNavigation } from "../../../../hooks/useEnterKeyNavigation";

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
  const { register, watch, setValue, formState: { errors } } = form;
  const handleKeyDown = useEnterKeyNavigation();

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
            id="emp-save-btn"
            onClick={onSave} 
            loading={saving}
            isAction
            tabIndex={8}
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
              tabIndex={9}
              icon={<Trash2 size={18} />}
            >
              Delete
            </Button>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        <FormInput
          id="emp-name"
          label="Name"
          required
          autoFocus
          placeholder="Enter employee name"
          tabIndex={1}
          {...register("name")}
          error={errors.name?.message}
          onKeyDown={(e) => handleKeyDown(e, "emp-code")}
        />

        <FormInput
          id="emp-code"
          label="Code"
          required
          placeholder="Enter employee code"
          tabIndex={2}
          {...register("code", {
            onChange: (e) => {
              e.target.value = e.target.value.toUpperCase().replace(/\s/g, '');
            }
          })}
          error={errors.code?.message}
          onKeyDown={(e) => handleKeyDown(e, "emp-branch")}
        />

        <SelectInput
          id="emp-branch"
          label="Branch Name"
          required
          placeholder="Select a branch"
          options={branchOptions}
          tabIndex={3}
          {...register("branchId")}
          error={errors.branchId?.message}
          onKeyDown={(e) => handleKeyDown(e, "emp-role")}
        />

        <SelectInput
          id="emp-role"
          label="Role"
          required
          placeholder="Select a role"
          options={roleOptions}
          tabIndex={4}
          {...register("roleId")}
          error={errors.roleId?.message}
          onKeyDown={(e) => handleKeyDown(e, "emp-save-btn")}
        />

        <div className="flex items-center h-10.5 mt-4">
          <Checkbox
            label="Is Driver"
            checked={watch("driver")}
            tabIndex={5}
            onChange={(e) => setValue("driver", e.target.checked)}
          />
        </div>

        <div className="flex items-center h-10.5 mt-4">
          <Checkbox
            label="Is Active"
            checked={watch("active")}
            tabIndex={6}
            onChange={(e) => setValue("active", e.target.checked)}
          />
        </div>

        <div className="flex items-center h-10.5 md:col-span-2 mt-2">
          <Checkbox
            label="Is Master"
            checked={watch("isMaster")}
            tabIndex={7}
            onChange={(e) => setValue("isMaster", e.target.checked)}
          />
        </div>
      </div>
    </Modal>
  );
};

export default EmployeeModal;
