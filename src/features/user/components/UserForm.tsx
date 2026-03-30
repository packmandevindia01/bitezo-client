import { useState, useEffect } from "react";
import { FormInput, Button, Checkbox } from "../../../components/common";
import { isRequired } from "../../../utils/validators";
import type { User, UserFormData } from "../types";

interface Props {
  initialData?: User | null;
  onSubmit: (user: Omit<User, "id">) => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

const UserForm = ({ initialData, onSubmit, onCancel, onDelete }: Props) => {
  const [form, setForm] = useState<UserFormData>({
    name: "",
    password: "",
    confirmPassword: "",
    email: "",
    branch: "",
    active: false,
    isMaster: false,
  });

  const [errors, setErrors] = useState<Partial<Record<keyof UserFormData, string>>>({});

  useEffect(() => {
    if (initialData) {
      setForm((prev) => ({
        ...prev,
        name: initialData.name,
        email: initialData.email ?? "",
        branch: initialData.branch,
        active: initialData.active,
        isMaster: initialData.isMaster,
      }));
    }
  }, [initialData]);

  const handleChange = (key: keyof UserFormData, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const handleClear = () => {
    setForm({
      name: "",
      password: "",
      confirmPassword: "",
      email: "",
      branch: "",
      active: false,
      isMaster: false,
    });
    setErrors({});
  };

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!isRequired(form.name)) newErrors.name = "User name is required";
    if (!isRequired(form.password)) newErrors.password = "Password is required";
    if (!isRequired(form.confirmPassword)) newErrors.confirmPassword = "Confirm password is required";
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Passwords do not match";
    if (!isRequired(form.branch)) newErrors.branch = "Branch is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    const { confirmPassword, ...rest } = form;
    onSubmit(rest);
  };

  return (
    <>
      {/* TITLE */}
      <h2 className="text-center font-bold text-lg mb-6">USER CREATION</h2>

      {/* FORM */}
      <div className="flex flex-col gap-4 max-w-sm">

        <FormInput
          label="User Name"
          required
          autoFocus
          value={form.name}
          onChange={(e) => handleChange("name", e.target.value)}
          error={errors.name}
        />

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

        <FormInput
          label="Branch Name"
          required
          value={form.branch}
          onChange={(e) => handleChange("branch", e.target.value)}
          error={errors.branch}
        />

        {/* CHECKBOXES */}
        <div className="flex gap-4 mt-1">
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

      {/* BUTTONS */}
      <div className="flex gap-3 mt-6">
        <Button variant="secondary" onClick={handleClear}>
          Clear
        </Button>

        <Button onClick={handleSubmit}>
          Save
        </Button>

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