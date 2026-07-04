import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, type ChangePasswordFormData } from "../schema/userSchema";

interface UseChangePasswordFormProps {
  onSubmit: (data: ChangePasswordFormData) => void | Promise<void>;
}

export const useChangePasswordForm = ({ onSubmit }: UseChangePasswordFormProps) => {
  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      oldPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
    form.reset();
  });

  return {
    form,
    handleSubmit,
  };
};
