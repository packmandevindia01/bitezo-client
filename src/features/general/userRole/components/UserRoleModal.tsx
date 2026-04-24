import { Loader2, Trash2 } from "lucide-react";
import { Button, Checkbox, FormInput, Loader, Modal } from "../../../../components/common";
import type { UserRoleForm, UserRolePermission } from "../types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: UserRoleForm;
  permissions: UserRolePermission[];
  detailLoading: boolean;
  saving: boolean;
  deleting: boolean;
  onClose: () => void;
  onChange: (patch: Partial<UserRoleForm>) => void;
  onTogglePermission: (permissionId: number) => void;
  onToggleModule: (module: string, checked: boolean) => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
}

const ACTION_ORDER = ["View", "Add", "Edit", "Delete"];

const groupPermissions = (permissions: UserRolePermission[]) => {
  return permissions.reduce<Record<string, UserRolePermission[]>>((acc, permission) => {
    acc[permission.module] = acc[permission.module] || [];
    acc[permission.module].push(permission);
    return acc;
  }, {});
};

const sortActions = (permissions: UserRolePermission[]) => {
  return [...permissions].sort((a, b) => {
    const aIndex = ACTION_ORDER.indexOf(a.action);
    const bIndex = ACTION_ORDER.indexOf(b.action);
    return (aIndex === -1 ? ACTION_ORDER.length : aIndex) - (bIndex === -1 ? ACTION_ORDER.length : bIndex);
  });
};

const UserRoleModal = ({
  isOpen,
  editingId,
  form,
  permissions,
  detailLoading,
  saving,
  deleting,
  onClose,
  onChange,
  onTogglePermission,
  onToggleModule,
  onClear,
  onSave,
  onDelete,
}: Props) => {
  const permissionsByModule = groupPermissions(permissions);
  const moduleNames = Object.keys(permissionsByModule);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit User Role" : "Add User Role"}
      size="xl"
    >
      {detailLoading ? (
        <div className="py-10">
          <Loader text="Loading role details..." />
        </div>
      ) : (
        <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm md:p-6">
          <div className="grid gap-5 md:grid-cols-[180px_minmax(0,1fr)] md:items-start">
            <p className="pt-2 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              Role Name
            </p>
            <FormInput
              value={form.roleName}
              onChange={(e) => onChange({ roleName: e.target.value })}
              placeholder="Enter role name"
              autoFocus
            />

            <p className="pt-2 text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
              Permissions
            </p>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              {moduleNames.length === 0 ? (
                <p className="p-5 text-sm text-gray-500">No permissions available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
                          Module
                        </th>
                        {ACTION_ORDER.map((action) => (
                          <th
                            key={action}
                            className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500"
                          >
                            {action}
                          </th>
                        ))}
                        <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-gray-500">
                          All
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {moduleNames.map((module) => {
                        const modulePermissions = sortActions(permissionsByModule[module]);
                        const moduleIds = modulePermissions.map((permission) => permission.permissionId);
                        const allSelected = moduleIds.every((id) => form.permissionIds.includes(id));

                        return (
                          <tr key={module} className="hover:bg-[#49293e]/5">
                            <td className="whitespace-nowrap border-l-[3px] border-l-[#49293e] px-4 py-3.5 font-medium text-gray-900">
                              {module}
                            </td>
                            {ACTION_ORDER.map((action) => {
                              const permission = modulePermissions.find((item) => item.action === action);

                              return (
                                <td key={action} className="px-4 py-3.5 text-center">
                                  {permission ? (
                                    <div className="flex justify-center">
                                      <Checkbox
                                        checked={form.permissionIds.includes(permission.permissionId)}
                                        onChange={() => onTogglePermission(permission.permissionId)}
                                        id={`permission-${permission.permissionId}`}
                                      />
                                    </div>
                                  ) : (
                                    <span className="text-gray-300">-</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={allSelected}
                                  onChange={(e) => onToggleModule(module, e.target.checked)}
                                  id={`module-${module.replace(/\s+/g, "-").toLowerCase()}`}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={onClear} disabled={saving || deleting}>
              Clear
            </Button>
            <Button onClick={onSave} disabled={saving || deleting}>
              {saving ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={15} className="animate-spin" />
                  Saving...
                </span>
              ) : editingId ? (
                "Update"
              ) : (
                "Save"
              )}
            </Button>
            {editingId && (
              <Button variant="danger" onClick={onDelete} disabled={saving || deleting}>
                <Trash2 size={16} />
                Delete Role
              </Button>
            )}
          </div>
        </section>
      )}
    </Modal>
  );
};

export default UserRoleModal;
