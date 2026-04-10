import { useState } from "react";
import { Button, FormInput } from "../../../../components/common";
import { isRequired } from "../../../../lib/validators";
import type { ChangePasswordPayload, User } from "../types";

interface Props {
  user: User | null;
  onSubmit: (payload: ChangePasswordPayload) => void | Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

const ChangePasswordForm = ({ user, onSubmit, onCancel, submitting = false }: Props) => {
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: "" }));
  };

  const validate = () => {
    const newErrors: typeof errors = {};

    if (!isRequired(form.oldPassword)) newErrors.oldPassword = "Old password is required";
    if (!isRequired(form.newPassword)) newErrors.newPassword = "New password is required";
    if (!isRequired(form.confirmPassword)) newErrors.confirmPassword = "Confirm password is required";
    if (form.newPassword && form.confirmPassword && form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    await onSubmit({
      oldPassword: form.oldPassword,
      newPassword: form.newPassword,
    });

    setForm({
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setErrors({});
  };

  return (
    <>
      <h2 className="mb-6 text-center text-lg font-bold">CHANGE PASSWORD</h2>

      <div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        User: <span className="font-semibold">{user?.name ?? "-"}</span>
      </div>

      <div className="flex max-w-sm flex-col gap-4">
        <FormInput
          label="Old Password"
          type="password"
          autoFocus
          value={form.oldPassword}
          onChange={(e) => handleChange("oldPassword", e.target.value)}
          error={errors.oldPassword}
        />

        <FormInput
          label="New Password"
          type="password"
          value={form.newPassword}
          onChange={(e) => handleChange("newPassword", e.target.value)}
          error={errors.newPassword}
        />

        <FormInput
          label="Confirm New Password"
          type="password"
          value={form.confirmPassword}
          onChange={(e) => handleChange("confirmPassword", e.target.value)}
          error={errors.confirmPassword}
        />
      </div>

      <div className="mt-6 flex gap-3">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} loading={submitting}>
          Update Password
        </Button>
      </div>
    </>
  );
};

export default ChangePasswordForm;
