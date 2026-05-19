import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import { useEffect, useState } from "react";
import { Button, Checkbox, FormInput, SelectInput } from "../../../../components/common";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import { isRequired } from "../../../../lib/validators";
import type { User, UserFormData, UserPayload } from "../types";
import { userRoleService } from "../../userRole/services/userRoleService";
import type { UserRoleNameOption } from "../../userRole/types";

interface Branch {
  branchId: number;
  branchName: string;
}

interface Props {
  initialData?: User | null;
  onSubmit: (user: UserPayload) => void | Promise<void>;
  onCancel?: () => void;
  submitting?: boolean;
  onDelete?: () => void | Promise<void>;
  deleting?: boolean;
  onClear?: () => void;
}

const createInitialForm = (initialData?: User | null): UserFormData => ({
  name: initialData?.name ?? "",
  password: "",
  confirmPassword: "",
  branchId: initialData?.branchId ? String(initialData.branchId) : "",
  roleId: initialData?.roleId ? String(initialData.roleId) : "",
  isActive: initialData?.isActive ?? false,
  isMaster: false,
});

const UserForm = ({
  initialData,
  onSubmit,
  submitting = false,
  onDelete,
  deleting = false,
  onClear,
}: Props) => {
  const [form, setForm] = useState<UserFormData>(() => createInitialForm(initialData));
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});
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

  const handleChange = <K extends keyof UserFormData>(key: K, value: UserFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleClear = () => {
    setForm(createInitialForm(null));
    setErrors({});
    if (onClear) onClear();
  };

  const validate = () => {
    const newErrors: typeof errors = {};
    const requiresPassword = !initialData;

    if (!isRequired(form.name)) newErrors.name = "User name is required";
    if (requiresPassword && !isRequired(form.password)) newErrors.password = "Password is required";
    if (requiresPassword && !isRequired(form.confirmPassword)) {
      newErrors.confirmPassword = "Confirm password is required";
    }
    if (
      (requiresPassword || form.password || form.confirmPassword) &&
      form.password !== form.confirmPassword
    ) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!isRequired(form.branchId)) {
      newErrors.branchId = "Branch is required";
    }

    if (!isRequired(form.roleId)) {
      newErrors.roleId = "Role is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload: UserPayload = {
      name: form.name.trim(),
      branchId: Number(form.branchId),
      roleId: Number(form.roleId),
      isActive: form.isActive,
      isMaster: false,
    };

    if (!initialData && form.password) {
      payload.password = form.password;
    }

    await onSubmit(payload);
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1">
        <FormInput
          label="User Name"
          required
          autoFocus
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          error={errors.name}
          autoComplete="new-username"
        />

        <SelectInput
          label="Branch"
          required
          value={form.branchId}
          onChange={(e) => handleChange("branchId", e.target.value)}
          disabled={branchesLoading}
          error={errors.branchId}
          options={branches.map((b) => ({
            label: b.branchName,
            value: String(b.branchId),
          }))}
          placeholder={branchesLoading ? "Loading..." : "Select a branch"}
        />

        <SelectInput
          label="User Role"
          required
          value={form.roleId}
          onChange={(e) => handleChange("roleId", e.target.value)}
          disabled={rolesLoading}
          error={errors.roleId}
          options={roles.map((r) => ({
            label: r.roleName,
            value: String(r.roleId),
          }))}
          placeholder={rolesLoading ? "Loading..." : "Select a role"}
        />

        {!initialData && (
          <>
            <FormInput
              label="Password"
              type="password"
              required
              value={form.password}
              onChange={(e) => handleChange("password", e.target.value)}
              error={errors.password}
              autoComplete="new-password"
            />

            <FormInput
              label="Confirm Pwd"
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              error={errors.confirmPassword}
              autoComplete="new-password"
            />
          </>
        )}

        <div className="md:col-span-2">
          <Checkbox
            label="Active"
            checked={form.isActive}
            onChange={(e) => handleChange("isActive", e.target.checked)}
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
          onClick={handleSubmit} 
          loading={submitting}
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