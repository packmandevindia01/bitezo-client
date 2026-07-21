import { useState, useEffect, useMemo } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog, PageShell, RecordTableCard, ListHeader } from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import type { EmployeeRoleRecord, EmployeeRoleForm, EmployeeRolePermission } from "../types";
import { employeeRoleService } from "../services/employeeRoleService";
import EmployeeRoleModal from "../components/EmployeeRoleModal";
import { usePermissions } from "../../../../hooks/usePermissions";

const initialFormState: EmployeeRoleForm = {
  roleName: "",
  permissionsIds: [],
};

const EmployeeRolePage = () => {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  
  const [roles, setRoles] = useState<EmployeeRoleRecord[]>([]);
  const [permissions, setPermissions] = useState<EmployeeRolePermission[]>([]);
  const [search, setSearch] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EmployeeRoleForm>(initialFormState);
  
  const [deleteRecord, setDeleteRecord] = useState<EmployeeRoleRecord | null>(null);

  const canAdd = hasPermission("Employee Master", "Add");
  const canEdit = hasPermission("Employee Master", "Edit");
  const canDelete = hasPermission("Employee Master", "Delete");

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rolesRes, permsRes] = await Promise.all([
        employeeRoleService.getRoles(),
        employeeRoleService.getPermissions(),
      ]);
      setRoles(rolesRes || []);
      setPermissions(permsRes || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load roles", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAddModal = () => {
    setEditingId(null);
    setForm(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = async (id: number) => {
    try {
      setEditingId(id);
      setIsModalOpen(true);
      setDetailLoading(true);
      
      const roleData = await employeeRoleService.getRoleDetails(id);
      
      const activePermissions = (roleData.permissions || [])
        .filter((p: EmployeeRolePermission) => p.status)
        .map((p: EmployeeRolePermission) => p.permissionId);

      const roleName = roleData.role && roleData.role.length > 0 ? roleData.role[0].roleName : "";

      setForm({
        roleId: id,
        roleName: roleName,
        permissionsIds: activePermissions,
      });
    } catch (err: any) {
      showToast(err.message || "Failed to load role details", "error");
      setIsModalOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleTogglePermission = (permissionId: number) => {
    setForm(prev => {
      const isSelected = prev.permissionsIds.includes(permissionId);
      if (isSelected) {
        return { ...prev, permissionsIds: prev.permissionsIds.filter(id => id !== permissionId) };
      } else {
        return { ...prev, permissionsIds: [...prev.permissionsIds, permissionId] };
      }
    });
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setForm(prev => ({ ...prev, permissionsIds: permissions.map(p => p.permissionId) }));
    } else {
      setForm(prev => ({ ...prev, permissionsIds: [] }));
    }
  };

  const handleSave = async () => {
    if (!form.roleName) {
      showToast("Role name is required", "error");
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        await employeeRoleService.updateRole(editingId, form);
        showToast("Employee role updated successfully", "success");
      } else {
        await employeeRoleService.createRole(form);
        showToast("Employee role created successfully", "success");
      }
      setIsModalOpen(false);
      void fetchData();
    } catch (err: any) {
      showToast(err.message || "Failed to save role", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setDeleting(true);
      await employeeRoleService.deleteRole(id);
      showToast("Employee role deleted successfully", "success");
      void fetchData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete role", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleClear = () => {
    setForm(prev => ({ ...prev, roleName: "", permissionsIds: [] }));
  };
  
  const filteredRecords = useMemo(() => {
    if (!search.trim()) return roles;
    const lower = search.toLowerCase();
    return roles.filter((r) => r.roleName.toLowerCase().includes(lower));
  }, [roles, search]);

  return (
    <PageShell title="Employee Role Master">
      <ListHeader
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search roles..."
        autoFocusSearch
        canAdd={canAdd}
        onAdd={openAddModal}
      />

      <RecordTableCard
        title="Saved Employee Role List"
        rowKey="roleId"
        data={filteredRecords}
        loading={loading}
        columns={[
          { header: "S No", accessor: "roleId" as keyof EmployeeRoleRecord, render: (_, index: number) => index + 1 },
          { header: "Role Name", accessor: "roleName" },
          {
            header: "Actions",
            accessor: "roleId",
            render: (row: EmployeeRoleRecord) => (
              <div className="flex gap-2">
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => void openEditModal(row.roleId)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                    aria-label={`Edit ${row.roleName}`}
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {canDelete && (
                  <button
                    type="button"
                    onClick={() => setDeleteRecord(row)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                    aria-label={`Delete ${row.roleName}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />

      <EmployeeRoleModal
        isOpen={isModalOpen}
        editingId={editingId}
        form={form}
        permissions={permissions}
        detailLoading={detailLoading}
        saving={saving}
        deleting={deleting}
        onClose={() => setIsModalOpen(false)}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onTogglePermission={handleTogglePermission}
        onToggleAll={handleToggleAll}
        onClear={handleClear}
        onSave={() => void handleSave()}
        onDelete={editingId ? () => {
          if (!canDelete) return;
          const record = roles.find((item) => item.roleId === editingId);
          if (record) {
            setDeleteRecord(record);
            setIsModalOpen(false);
          }
        } : undefined}
      />
      
      <ConfirmDialog
        isOpen={deleteRecord !== null}
        title="Delete Employee Role"
        message={`Are you sure you want to delete role "${deleteRecord?.roleName ?? ""}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onCancel={() => {
          if (!deleting) {
            setDeleteRecord(null);
          }
        }}
        onConfirm={() => {
          if (deleteRecord) {
            void handleDelete(deleteRecord.roleId);
            setDeleteRecord(null);
          }
        }}
      />
    </PageShell>
  );
};

export default EmployeeRolePage;
