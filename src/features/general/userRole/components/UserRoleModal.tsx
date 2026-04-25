import { Loader2, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useState } from "react";
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
  setActionPermissions: (category: string, action: string, checked: boolean, categories: Record<string, string[]>) => void;
}

const ACTION_ORDER = ["View", "Add", "Edit", "Delete", "Print"];

const groupPermissions = (permissions: UserRolePermission[]) => {
  return permissions.reduce<Record<string, UserRolePermission[]>>((acc, permission) => {
    acc[permission.module] = acc[permission.module] || [];
    acc[permission.module].push(permission);
    return acc;
  }, {});
};

const getCategory = (moduleName: string) => {
  const lower = moduleName.toLowerCase();
  if (lower.includes("master")) return "Master";
  if (lower.includes("report")) return "Report";
  return "Transaction";
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
  setActionPermissions,
}: Props) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    Master: true,
    Report: true,
    Transaction: true,
  });

  const permissionsByModule = groupPermissions(permissions);
  const moduleNames = Object.keys(permissionsByModule);

  const categories = moduleNames.reduce<Record<string, string[]>>((acc, moduleName) => {
    const cat = getCategory(moduleName);
    acc[cat] = acc[cat] || [];
    acc[cat].push(moduleName);
    return acc;
  }, {});

  const toggleCategory = (category: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const handleToggleCategoryCheckbox = (category: string, checked: boolean) => {
    const categoryModules = categories[category] || [];
    categoryModules.forEach((module) => {
      onToggleModule(module, checked);
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit User Role" : "Add User Role"}
      size="2xl"
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
                      {Object.entries(categories).map(([category, modules]) => {
                        const isExpanded = expandedCategories[category];
                        
                        // Check if all permissions in this category are selected
                        const allCategoryPermissionIds = modules.flatMap(mod => permissionsByModule[mod].map(p => p.permissionId));
                        const isCategoryAllSelected = allCategoryPermissionIds.length > 0 && allCategoryPermissionIds.every(id => form.permissionIds.includes(id));

                        return (
                          <Fragment key={category}>
                            {/* Category Header Row */}
                            <tr className="bg-gray-50/80 hover:bg-gray-100/80 transition-colors">
                              <td className="px-4 py-2">
                                <div 
                                  className="flex items-center gap-2 cursor-pointer font-bold text-gray-800 uppercase tracking-wide text-xs"
                                  onClick={() => toggleCategory(category)}
                                >
                                  {isExpanded ? <ChevronDown size={16} className="text-[#49293e]" /> : <ChevronRight size={16} className="text-[#49293e]" />}
                                  {category}
                                </div>
                              </td>
                              {ACTION_ORDER.map((action) => {
                                const actionIds = modules.flatMap(mod => 
                                  permissionsByModule[mod]
                                    .filter(p => p.action === action)
                                    .map(p => p.permissionId)
                                );
                                const isActionAllSelected = actionIds.length > 0 && actionIds.every(id => form.permissionIds.includes(id));

                                return (
                                  <td key={action} className="px-4 py-2 text-center">
                                    {actionIds.length > 0 ? (
                                      <div className="flex justify-center">
                                        <Checkbox
                                          checked={isActionAllSelected}
                                          onChange={(e) => setActionPermissions(category, action, e.target.checked, categories)}
                                          id={`category-${category.toLowerCase()}-action-${action.toLowerCase()}`}
                                        />
                                      </div>
                                    ) : (
                                      <span className="text-gray-300">-</span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-4 py-2 text-center">
                                <div className="flex justify-center">
                                  <Checkbox
                                    checked={isCategoryAllSelected}
                                    onChange={(e) => handleToggleCategoryCheckbox(category, e.target.checked)}
                                    id={`category-${category.toLowerCase()}-all`}
                                  />
                                </div>
                              </td>
                            </tr>

                            {/* Module Rows */}
                            {isExpanded && modules.map((module) => {
                              const modulePermissions = sortActions(permissionsByModule[module]);
                              const moduleIds = modulePermissions.map((permission) => permission.permissionId);
                              const allSelected = moduleIds.length > 0 && moduleIds.every((id) => form.permissionIds.includes(id));

                              return (
                                <tr key={module} className="hover:bg-[#49293e]/5 transition-colors">
                                  <td className="whitespace-nowrap border-l-[3px] border-l-[#49293e] pl-8 pr-4 py-3 font-medium text-gray-700">
                                    {module}
                                  </td>
                                  {ACTION_ORDER.map((action) => {
                                    const permission = modulePermissions.find((item) => item.action === action);

                                    return (
                                      <td key={action} className="px-4 py-3 text-center">
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
                                  <td className="px-4 py-3 text-center bg-gray-50/30">
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
                          </Fragment>
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
