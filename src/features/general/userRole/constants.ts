import type { UserRoleForm } from "./types";

export const createEmptyUserRoleForm = (): UserRoleForm => ({
  roleName: "",
  permissionIds: [],
});
