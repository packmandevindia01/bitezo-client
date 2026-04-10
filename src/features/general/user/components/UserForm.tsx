import { useState } from "react";
import { Button, Checkbox, FormInput } from "../../../../components/common";
import { isRequired } from "../../../../lib/validators";
import type { User, UserFormData, UserPayload } from "../types";

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
  isMaster: initialData?.isMaster ?? false,
});

const UserForm = ({
  initialData,
  onSubmit,
  onCancel,
  submitting = false,
  onDelete,
  deleting = false,
}: Props) => {
  const [form, setForm] = useState<UserFormData>(() => createInitialForm(initialData));
  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

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
      newErrors.branchId = "Branch ID is required";
    } else if (!Number.isInteger(Number(form.branchId)) || Number(form.branchId) <= 0) {
      newErrors.branchId = "Branch ID must be a positive number";
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
      isMaster: form.isMaster,
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
            />

            <FormInput
              label="Confirm Pwd"
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              error={errors.confirmPassword}
            />
          </>
        )}

        <FormInput
          label="Branch ID"
          required
          type="number"
          value={form.branchId}
          onChange={(e) => handleChange("branchId", e.target.value)}
          error={errors.branchId}
        />

        <div className="mt-1 flex gap-4">
          <Checkbox
            label="Active/not"
            checked={form.isActive}
            onChange={(e) => handleChange("isActive", e.target.checked)}
          />
          <Checkbox
            label="Is Master"
            checked={form.isMaster}
            onChange={(e) => handleChange("isMaster", e.target.checked)}
          />
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={handleClear}>
          Clear
        </Button>

        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}

        <Button onClick={handleSubmit} loading={submitting}>
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
