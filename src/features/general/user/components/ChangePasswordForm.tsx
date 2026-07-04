import { Button, FormInput } from "../../../../components/common";
import { X, KeyRound } from "lucide-react";
import type { ChangePasswordFormData } from "../schema/userSchema";
import type { User } from "../types";
import { useChangePasswordForm } from "../hooks/useChangePasswordForm";
import { useEnterKeyNavigation } from "../../../../hooks/useEnterKeyNavigation";

interface Props {
  user: User | null;
  onSubmit: (payload: ChangePasswordFormData) => void | Promise<void>;
  onCancel: () => void;
  submitting?: boolean;
}

export const ChangePasswordForm = ({ user, onSubmit, onCancel, submitting = false }: Props) => {
  const { form, handleSubmit } = useChangePasswordForm({ onSubmit });
  const { register, formState: { errors } } = form;
  const handleKeyDown = useEnterKeyNavigation();

  return (
    <>
      <div className="mb-5 rounded-xl bg-slate-50 px-4 py-3.5 text-sm text-slate-700 border border-slate-100">
        Changing password for user: <span className="font-semibold text-slate-900">{user?.name ?? "-"}</span>
      </div>

      <div className="flex w-full flex-col gap-4">
        <FormInput
          id="pwd-old"
          label="Old Password"
          type="password"
          autoFocus
          {...register("oldPassword")}
          error={errors.oldPassword?.message}
          onKeyDown={(e) => handleKeyDown(e, "pwd-new")}
        />

        <FormInput
          id="pwd-new"
          label="New Password"
          type="password"
          {...register("newPassword")}
          error={errors.newPassword?.message}
          onKeyDown={(e) => handleKeyDown(e, "pwd-confirm")}
        />

        <FormInput
          id="pwd-confirm"
          label="Confirm New Password"
          type="password"
          {...register("confirmPassword")}
          error={errors.confirmPassword?.message}
          onKeyDown={(e) => handleKeyDown(e, "pwd-save-btn")}
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button 
          variant="secondary" 
          onClick={onCancel} 
          isAction
          icon={<X size={18} />}
        >
          Cancel
        </Button>
        <Button 
          id="pwd-save-btn"
          onClick={handleSubmit} 
          loading={submitting}
          isAction
          icon={<KeyRound size={18} />}
        >
          Update Password
        </Button>
      </div>
    </>
  );
};

export default ChangePasswordForm;
