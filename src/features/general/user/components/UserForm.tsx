import { useEffect, useState } from "react";
import { Button, Checkbox, FormInput } from "../../../../components/common";
import { isRequired } from "../../../../lib/validators";
import type { User, UserFormData, UserPayload } from "../types";

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
}

const createInitialForm = (initialData?: User | null): UserFormData => ({
  name: initialData?.name ?? "",
  password: "",
  confirmPassword: "",
  branchId: initialData?.branchId ? String(initialData.branchId) : "",
  isActive: initialData?.isActive ?? false,
  isMaster: false,
});

const UserForm = ({
  initialData,
  onSubmit,
  submitting = false,
  onDelete,
  deleting = false,
}: Props) => {
  const [form, setForm] = useState<UserFormData>(() => createInitialForm(initialData));
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setBranchesLoading(true);
        const token = localStorage.getItem("accessToken") ?? "";
        const tenantId = localStorage.getItem("tenantId") ?? "app_db";

        const res = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/Branch/list-name?clientDb=${encodeURIComponent(tenantId)}`,
          {
            method: "GET",
            headers: {
              Accept: "*/*",
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) throw new Error("Failed to load branches");

        const json = await res.json();
        setBranches(json?.data ?? []);
      } catch {
        setBranches([]);
      } finally {
        setBranchesLoading(false);
      }
    };

    fetchBranches();
  }, []);

  const handleChange = <K extends keyof UserFormData>(key: K, value: UserFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleClear = () => {
    setForm(createInitialForm(initialData));
    setErrors({});
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

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const payload: UserPayload = {
      name: form.name.trim(),
      branchId: Number(form.branchId),
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
      <h2 className="mb-6 text-center text-lg font-bold">
        {initialData ? "EDIT USER" : "USER CREATION"}
      </h2>

      <div className="flex max-w-sm flex-col gap-4">
        <FormInput
          label="User Name"
          required
          autoFocus
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          error={errors.name}
          autoComplete="new-username"
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

        {/* Branch select */}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">
            Branch <span className="text-red-500">*</span>
          </label>
          <select
            value={form.branchId}
            onChange={(e) => handleChange("branchId", e.target.value)}
            disabled={branchesLoading}
            className={`rounded-lg border px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 focus:ring-[#49293e]/40 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 ${errors.branchId ? "border-red-400" : "border-slate-300"
              }`}
          >
            <option value="">
              {branchesLoading ? "Loading branches..." : "Select a branch"}
            </option>
            {branches.map((branch) => (
              <option key={branch.branchId} value={String(branch.branchId)}>
                {branch.branchName}
              </option>
            ))}
          </select>
          {errors.branchId && (
            <p className="text-xs text-red-500">{errors.branchId}</p>
          )}
        </div>

        <div className="mt-1 flex gap-4">
          <Checkbox
            label="Active/not"
            checked={form.isActive}
            onChange={(e) => handleChange("isActive", e.target.checked)}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end  gap-3">
        <Button variant="secondary" className="h-10 w-20" onClick={handleClear}>
          Clear
        </Button>

        <Button className="h-10 w-20" onClick={handleSubmit} loading={submitting}>
          Save
        </Button>

        {initialData && onDelete && (
          <Button variant="danger" onClick={onDelete} loading={deleting}>
            Delete
          </Button>
        )}
      </div>
    </>
  );
};

export default UserForm;