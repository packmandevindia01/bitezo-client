import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import { useEffect, useState } from "react";
import { Button, Checkbox, FormInput, SelectInput } from "../../../../components/common";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import type { User } from "../types";
import { userRoleService } from "../../userRole/services/userRoleService";
import type { UserRoleNameOption } from "../../userRole/types";
import { useUserForm } from "../hooks/useUserForm";
import { useEnterKeyNavigation } from "../../../../hooks/useEnterKeyNavigation";

interface Branch {
  branchId: number;
  branchName: string;
}

interface Props {
  initialData?: User | null;
  onSuccess: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  onClear?: () => void;
}

export const UserForm = ({
  initialData,
  onSuccess,
  onDelete,
  deleting = false,
  onClear,
}: Props) => {
  const { form, handleSubmit, saving } = useUserForm({
    initialData,
    onSuccess,
  });

  const { register, formState: { errors } } = form;
  const handleKeyDown = useEnterKeyNavigation();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [roles, setRoles] = useState<UserRoleNameOption[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranchesLoading(true);
        const { data } = await axiosInstance.get<ApiResponse<Branch[]>>("/Branch/false/list-name");
        setBranches(data.data ?? []);
      } catch {
        setBranches([]);
      } finally {
        setBranchesLoading(false);
      }
    };

    const fetchRoles = async () => {
      try {
        setRolesLoading(true);
        const data = await userRoleService.listNames();
        setRoles(data ?? []);
      } catch {
        setRoles([]);
      } finally {
        setRolesLoading(false);
      }
    };

    fetchBranches();
    fetchRoles();
  }, []);

  const handleClear = () => {
    form.reset({
      name: "",
      password: "",
      confirmPassword: "",
      branchId: "",
      roleId: "",
      isActive: true,
      isMaster: false,
    });
    if (onClear) onClear();
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        <FormInput
          id="user-name"
          label="User Name"
          required
          autoFocus
          {...register("name")}
          error={errors.name?.message}
          autoComplete="off"
          onKeyDown={(e) => handleKeyDown(e, "user-branch")}
        />

        <SelectInput
          id="user-branch"
          label="Branch"
          required
          {...register("branchId")}
          disabled={branchesLoading}
          error={errors.branchId?.message}
          options={branches.map((b) => ({
            label: b.branchName,
            value: String(b.branchId),
          }))}
          placeholder={branchesLoading ? "Loading..." : "Select a branch"}
          onKeyDown={(e) => handleKeyDown(e, "user-role")}
        />

        <SelectInput
          id="user-role"
          label="User Role"
          required
          {...register("roleId")}
          disabled={rolesLoading}
          error={errors.roleId?.message}
          options={roles.map((r) => ({
            label: r.roleName,
            value: String(r.roleId),
          }))}
          placeholder={rolesLoading ? "Loading..." : "Select a role"}
          onKeyDown={(e) => handleKeyDown(e, initialData ? "user-save-btn" : "user-password")}
        />

        {!initialData && (
          <>
            <FormInput
              id="user-password"
              label="Password"
              type="password"
              required
              {...register("password")}
              error={errors.password?.message}
              autoComplete="new-password"
              onKeyDown={(e) => handleKeyDown(e, "user-confirm-pwd")}
            />

            <FormInput
              id="user-confirm-pwd"
              label="Confirm Pwd"
              type="password"
              required
              {...register("confirmPassword")}
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
              onKeyDown={(e) => handleKeyDown(e, "user-save-btn")}
            />
          </>
        )}

        <div className="md:col-span-2 flex items-center gap-6">
          <Checkbox
            label="Active"
            checked={form.watch("isActive")}
            onChange={(e) => form.setValue("isActive", e.target.checked)}
          />
          <Checkbox
            label="Is Master"
            checked={form.watch("isMaster")}
            onChange={(e) => form.setValue("isMaster", e.target.checked)}
          />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-3">
        <Button 
          variant="secondary" 
          onClick={handleClear} 
          tabIndex={-1}
          isAction
          icon={<RotateCcw size={18} />}
        >
          Clear
        </Button>

        <Button 
          id="user-save-btn"
          onClick={handleSubmit} 
          loading={saving}
          isAction
          icon={<Save size={18} />}
        >
          {initialData ? "Update" : "Save"}
        </Button>

        {initialData && onDelete && (
          <Button 
            variant="danger" 
            onClick={onDelete} 
            loading={deleting} 
            tabIndex={-1}
            isAction
            icon={<Trash2 size={18} />}
          >
            Delete
          </Button>
        )}
      </div>
    </>
  );
};

export default UserForm;