import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchUsers, deleteUser, changeUserPassword } from "../services";
import { useToast } from "../../../../app/providers/useToast";
import type { ChangePasswordPayload } from "../types";

export const useUserList = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, refetch } = useQuery({
    queryKey: ["usersList"],
    queryFn: fetchUsers,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      showToast("User deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["usersList"] });
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to delete user", "error");
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: number; payload: ChangePasswordPayload }) => {
      console.log(`[useUserList] Target URL: /api/user/${userId}/change-password`);
      console.log("[useUserList] Request Body payload:", { userId, ...payload });
      return changeUserPassword(userId, payload);
    },
    onSuccess: () => {
      showToast("Password changed successfully", "success");
    },
    onError: (err: any) => {
      const msg = err.message || "Failed to change password";
      const isDuplicate =
        msg.toLowerCase().includes("already been used") ||
        msg.toLowerCase().includes("duplicate");
      showToast(msg, isDuplicate ? "warning" : "error");
    },
  });

  return {
    users,
    loading: isLoading,
    deleteUser: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,
    changePassword: changePasswordMutation.mutateAsync,
    passwordChanging: changePasswordMutation.isPending,
    refetch,
  };
};
