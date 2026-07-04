import { z } from "zod";

export const createUserSchema = z
  .object({
    name: z
      .string()
      .min(1, "User name is required")
      .max(100, "User name must be 100 characters or less"),
    branchId: z.string().min(1, "Branch is required"),
    roleId: z.string().min(1, "Role is required"),
    isActive: z.boolean(),
    isMaster: z.boolean().optional(),
    password: z
      .string()
      .min(1, "Password is required")
      .min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export const updateUserSchema = z.object({
  name: z
    .string()
    .min(1, "User name is required")
    .max(100, "User name must be 100 characters or less"),
  branchId: z.string().min(1, "Branch is required"),
  roleId: z.string().min(1, "Role is required"),
  isActive: z.boolean(),
  isMaster: z.boolean().optional(),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Old password is required"),
    newPassword: z
      .string()
      .min(1, "New password is required")
      .min(6, "New password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match",
        path: ["confirmPassword"],
      });
    }
  });

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type UserFormDataUnion = CreateUserFormData & UpdateUserFormData;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
