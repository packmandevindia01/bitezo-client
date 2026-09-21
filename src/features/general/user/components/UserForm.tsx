import axiosInstance from "../../../../api/axiosInstance";
import type { ApiResponse } from "../../../inventory/product/types";
import { useEffect, useState } from "react";
import { Button, Checkbox, FormInput, SelectInput, ConfirmDialog } from "../../../../components/common";
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

  const [confirmAllBranchOpen, setConfirmAllBranchOpen] = useState(false);
  const [prevBranchId, setPrevBranchId] = useState(
    initialData?.branchId !== undefined && initialData?.branchId !== null
      ? String(initialData.branchId)
      : ""
  );

  useEffect(() => {
    if (initialData?.branchId !== undefined && initialData?.branchId !== null) {
      setPrevBranchId(String(initialData.branchId));
    }
  }, [initialData]);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranchesLoading(true);
        const { data } = await axiosInstance.get<ApiResponse<Branch[]>>("/Branch/true/list-name");
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

  const [pendingBranchId, setPendingBranchId] = useState<string | null>(null);

  const isAllBranch = (idOrName?: string) => {
    if (!idOrName) return false;
    const lower = idOrName.toLowerCase().trim();
    return lower === "0" || lower === "all" || lower === "all branches" || lower === "all branch";
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    const selectedBranch = branches.find((b) => String(b.branchId) === newValue);

    if (newValue === "0" || (selectedBranch && isAllBranch(selectedBranch.branchName))) {
      setPendingBranchId(newValue);
      setConfirmAllBranchOpen(true);
    } else {
      form.setValue("branchId", newValue, { shouldValidate: true });
      setPrevBranchId(newValue);
    }
  };

  const handleConfirmAllBranch = () => {
    if (pendingBranchId !== null) {
      form.setValue("branchId", pendingBranchId, { shouldValidate: true });
      setPrevBranchId(pendingBranchId);
    }
    setConfirmAllBranchOpen(false);
    setPendingBranchId(null);
    setTimeout(() => {
      const branchInput = document.getElementById("user-branch") as HTMLSelectElement | null;
      branchInput?.focus();
    }, 50);
  };

  const handleCancelAllBranch = () => {
    form.setValue("branchId", prevBranchId, { shouldValidate: true });
    setConfirmAllBranchOpen(false);
    setPendingBranchId(null);
    setTimeout(() => {
      const branchInput = document.getElementById("user-branch") as HTMLSelectElement | null;
      branchInput?.focus();
    }, 50);
  };

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
    setPrevBranchId("");
    setPendingBranchId(null);
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
          ref={register("branchId").ref}
          value={form.watch("branchId") ?? ""}
          onChange={handleBranchChange}
          disabled={branchesLoading}
          error={errors.branchId?.message}
          options={[
            ...(!branches.some((b) => isAllBranch(b.branchName))
              ? [{ label: "All", value: "0" }]
              : []),
            ...branches
              .filter((b) => !b.branchName.toLowerCase().startsWith("select"))
              .map((b) => ({
                label: b.branchName,
                value: String(b.branchId),
              })),
          ]}
          placeholder={branchesLoading ? "Loading..." : "Select a branch"}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const nextEl = document.getElementById("user-role") as HTMLElement | null;
              if (nextEl) {
                nextEl.focus();
                if (nextEl.tagName === "SELECT" && typeof (nextEl as any).showPicker === "function") {
                  try {
                    (nextEl as any).showPicker();
                  } catch {}
                }
              }
            } else {
              handleKeyDown(e, "user-role");
            }
          }}
        />

        <SelectInput
          id="user-role"
          label="User Role"
          required
          ref={register("roleId").ref}
          value={form.watch("roleId") ?? ""}
          onChange={(e) => form.setValue("roleId", e.target.value, { shouldValidate: true })}
          disabled={rolesLoading}
          error={errors.roleId?.message}
          options={roles
            .filter((r) => r.roleId > 0 && !r.roleName.toLowerCase().startsWith("select"))
            .map((r) => ({
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

      <ConfirmDialog
        isOpen={confirmAllBranchOpen}
        title="Confirm Branch Selection"
        message="Do you want to continue with 'All' branch?"
        confirmLabel="Continue"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={handleConfirmAllBranch}
        onCancel={handleCancelAllBranch}
      />
    </>
  );
};

export default UserForm;