import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { createEmptyUserRoleForm } from "../constants";
import { userRoleService } from "../services/userRoleService";
import type { UserRoleForm, UserRolePermission, UserRoleRecord } from "../types";

const getErrorMessage = (error: unknown, fallback: string) => {
  const anyErr = error as any;
  const status = anyErr?.response?.status ?? anyErr?.status;
  const dataMessage = anyErr?.response?.data?.message;
  const errorMessage = error instanceof Error ? error.message : "";

  if (
    status === 409 ||
    String(errorMessage).includes("409") ||
    String(dataMessage).toLowerCase().includes("already exists") ||
    String(dataMessage).toLowerCase().includes("conflict")
  ) {
    return "Role name already exists. Please enter a unique role name.";
  }

  if (dataMessage && typeof dataMessage === "string" && dataMessage.trim()) {
    return dataMessage;
  }
  if (errorMessage && errorMessage.trim() && !errorMessage.includes("status code 409")) {
    return errorMessage;
  }
  return fallback;
};

export const useUserRoleManager = () => {
  const { showToast } = useToast();
  const [records, setRecords] = useState<UserRoleRecord[]>([]);
  const [permissions, setPermissions] = useState<UserRolePermission[]>([]);
  const [form, setForm] = useState<UserRoleForm>(createEmptyUserRoleForm());
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      const [roleRecords, permissionRecords] = await Promise.all([
        userRoleService.list(),
        userRoleService.permissions(),
      ]);
      setRecords(roleRecords);
      setPermissions(permissionRecords);
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to load user roles"), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return records;

    return records.filter((item) =>
      [String(item.sNo), String(item.roleId), item.roleName].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [records, search]);

  const setField = (patch: Partial<UserRoleForm>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const resetForm = () => {
    setForm(createEmptyUserRoleForm());
    setEditingId(null);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setOpen(true);
  };

  const togglePermission = (permissionId: number) => {
    setForm((prev) => {
      const selected = prev.permissionIds.includes(permissionId);
      return {
        ...prev,
        permissionIds: selected
          ? prev.permissionIds.filter((id) => id !== permissionId)
          : [...prev.permissionIds, permissionId],
      };
    });
  };

  const setModulePermissions = (module: string, checked: boolean) => {
    setForm((prev) => {
      const moduleIds = permissions
        .filter((permission) => permission.module === module)
        .map((permission) => permission.permissionId);
      const ids = checked
        ? Array.from(new Set([...prev.permissionIds, ...moduleIds]))
        : prev.permissionIds.filter((id) => !moduleIds.includes(id));

      return { ...prev, permissionIds: ids };
    });
  };

  const setActionPermissions = (category: string, action: string, checked: boolean, categories: Record<string, string[]>) => {
    const modules = categories[category] || [];
    const actionIds = permissions
      .filter((p) => modules.includes(p.module) && p.action === action)
      .map((p) => p.permissionId);

    setForm((prev) => {
      const ids = checked
        ? Array.from(new Set([...prev.permissionIds, ...actionIds]))
        : prev.permissionIds.filter((id) => !actionIds.includes(id));
      return { ...prev, permissionIds: ids };
    });
  };

  const handleEdit = async (record: UserRoleRecord) => {
    try {
      setOpen(true);
      setDetailLoading(true);
      const detail = await userRoleService.getById(record.roleId);
      const role = detail.role[0];
      const selectedPermissionIds = detail.permissions
        .filter((permission) => permission.status)
        .map((permission) => permission.permissionId);

      setEditingId(record.roleId);
      setForm({
        roleName: role?.roleName ?? record.roleName,
        permissionIds: selectedPermissionIds,
      });

      if (detail.permissions.length > 0) {
        setPermissions(detail.permissions);
      }
    } catch (error) {
      closeModal();
      showToast(getErrorMessage(error, "Failed to load role details"), "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form.roleName.trim()) {
      showToast("Role name is required", "error");
      return;
    }

    const duplicateRole = records.some(
      (r) =>
        r.roleName.trim().toLowerCase() === form.roleName.trim().toLowerCase() &&
        r.roleId !== editingId
    );
    if (duplicateRole) {
      showToast("Role name already exists. Please enter a unique role name.", "error");
      return;
    }

    if (form.permissionIds.length === 0) {
      showToast("Select at least one permission", "error");
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await userRoleService.update(editingId, form);
        showToast("User role updated successfully", "success");
      } else {
        await userRoleService.create(form);
        showToast("User role created successfully", "success");
      }

      await loadInitialData();
      closeModal();
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to save user role"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roleId: number) => {
    try {
      setDeleting(true);
      await userRoleService.remove(roleId);
      showToast("User role deleted successfully", "success");
      await loadInitialData();
      if (editingId === roleId) {
        closeModal();
      }
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to delete user role"), "error");
    } finally {
      setDeleting(false);
    }
  };

  return {
    form,
    open,
    search,
    editingId,
    filteredRecords,
    permissions,
    loading,
    detailLoading,
    saving,
    deleting,
    setSearch,
    setField,
    togglePermission,
    setModulePermissions,
    resetForm,
    closeModal,
    openCreateModal,
    handleEdit,
    handleSave,
    handleDelete,
    setActionPermissions,
  };
};
