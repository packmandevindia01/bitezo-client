import { useState } from "react";
import { Button, Checkbox, FormInput } from "../../../../components/common";
import { isRequired } from "../../../../lib/validators";
import type { User, UserFormData } from "../types";

interface Props {
  initialData?: User | null;
  onSubmit: (user: Omit<User, "id">) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

const createInitialForm = (initialData?: User | null): UserFormData => ({
  name: initialData?.name ?? "",
  password: "",
  confirmPassword: "",
  email: initialData?.email ?? "",
  branch: initialData?.branch ?? "",
  active: initialData?.active ?? false,
  isMaster: initialData?.isMaster ?? false,
});

const UserForm = ({ initialData, onSubmit, onCancel, onDelete }: Props) => {
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
    if (!isRequired(form.branch)) newErrors.branch = "Branch is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const payload: Omit<User, "id"> = {
      name: form.name,
      email: form.email,
      branch: form.branch,
      active: form.active,
      isMaster: form.isMaster,
    };

    onSubmit(payload);
  };

  return (
    <>
      <h2 className="mb-6 text-center text-lg font-bold">USER CREATION</h2>

      <div className="flex max-w-sm flex-col gap-4">
        <FormInput
          label="User Name"
          required
          autoFocus
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          error={errors.name}
        />

        <FormInput
          label="Email"
          value={form.email}
          onChange={(e) => handleChange("email", e.target.value)}
        />

        <FormInput
          label="Password"
          type="password"
          required={!initialData}
          value={form.password}
          onChange={(e) => handleChange("password", e.target.value)}
          error={errors.password}
        />

        <FormInput
          label="Confirm Pwd"
          type="password"
          required={!initialData}
          value={form.confirmPassword}
          onChange={(e) => handleChange("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
        />

        <FormInput
          label="Branch Name"
          required
          value={form.branch}
          onChange={(e) => handleChange("branch", e.target.value)}
          error={errors.branch}
        />

        <div className="mt-1 flex gap-4">
          <Checkbox
            label="Active/not"
            checked={form.active}
            onChange={(e) => handleChange("active", e.target.checked)}
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

        <Button onClick={handleSubmit}>Save</Button>

        {onDelete && (
          <Button variant="danger" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    </>
  );
};

export default UserForm;
