import { Save, RotateCcw, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useState, useMemo } from "react";
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
  roleNameError?: string;
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
  roleNameError,
  onClose,
  onChange,
  onTogglePermission,
  onToggleModule,
  onClear,
  onSave,
  onDelete,
  setActionPermissions,
}: Props) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const { permissionsByModule, categories } = useMemo(() => {
    const permByMod: Record<string, UserRolePermission[]> = {};
    const cats: Record<string, string[]> = {};

    permissions.forEach((perm) => {
      // Group permissions by module name
      permByMod[perm.module] = permByMod[perm.module] || [];
      permByMod[perm.module].push(perm);

      // Group modules by moduleType header directly from API
      const catName = perm.moduleType || "General";
      cats[catName] = cats[catName] || [];
      if (!cats[catName].includes(perm.module)) {
        cats[catName].push(perm.module);
      }
    });

    return { permissionsByModule: permByMod, categories: cats };
  }, [permissions]);

  const moduleNames = Object.keys(permissionsByModule);

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
      footer={
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            onClick={onClear} 
            disabled={saving || deleting} 
            tabIndex={-1}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Clear
          </Button>
          <Button 
            id="role-save-btn"
            onClick={onSave} 
            disabled={saving || deleting}
            isAction
            loading={saving}
            icon={<Save size={18} />}
          >
            {editingId ? "Update" : "Save"}
          </Button>
          {editingId && (
            <Button 
              variant="danger" 
              onClick={onDelete} 
              disabled={saving || deleting} 
              tabIndex={-1}
              isAction
              icon={<Trash2 size={18} />}
            >
              Delete
            </Button>
          )}
        </div>
      }
    >
      {detailLoading ? (
        <div className="py-10">
          <Loader text="Loading role details..." />
        </div>
      ) : (
        <div className="flex flex-col overflow-y-auto pr-1" style={{ maxHeight: "calc(90vh - 120px)" }}>
          <section className="rounded-3xl border border-gray-200 bg-white p-2 md:p-3">
            <div className="flex flex-col gap-3">
              <FormInput
                id="role-name-input"
                label="Role Name"
                value={form.roleName}
                maxLength={50}
                required
                error={roleNameError}
                onChange={(e) => onChange({ roleName: e.target.value })}
                placeholder="Enter role name"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    document.getElementById("role-save-btn")?.focus();
                  }
                }}
              />

              <p className="pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600 flex items-center">
                Permissions <span className="text-red-500 ml-1 font-bold">*</span>
              </p>
              <div className="overflow-hidden rounded-xl border border-gray-200">
                {moduleNames.length === 0 ? (
                  <p className="p-5 text-sm text-gray-500">No permissions available.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50/50">
                          <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Module
                          </th>
                          {ACTION_ORDER.map((action) => (
                            <th
                              key={action}
                              className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400"
                            >
                              {action}
                            </th>
                          ))}
                          <th className="px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            All
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {Object.entries(categories).map(([category, modules]) => {
                          const isExpanded = expandedCategories[category] ?? true;
                          
                          // Check if all permissions in this category are selected
                          const allCategoryPermissionIds = modules.flatMap(mod => permissionsByModule[mod].map(p => p.permissionId));
                          const isCategoryAllSelected = allCategoryPermissionIds.length > 0 && allCategoryPermissionIds.every(id => form.permissionIds.includes(id));

                          return (
                            <Fragment key={category}>
                              {/* Category Header Row */}
                              <tr className="bg-gray-50/30 hover:bg-gray-100/50 transition-colors">
                                <td className="px-3 py-1">
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
                                    <td key={action} className="px-2 py-1 text-center">
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
                                <td className="px-2 py-1 text-center">
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
                                const viewPerm = modulePermissions.find((p) => p.action.toLowerCase() === "view");
                                const isViewSelected = viewPerm ? form.permissionIds.includes(viewPerm.permissionId) : true;

                                return (
                                  <Fragment key={module}>
                                    <tr className="hover:bg-[#49293e]/5 transition-colors">
                                      <td className="whitespace-nowrap border-l-[3px] border-l-[#49293e] pl-6 pr-3 py-1 font-medium text-gray-700 text-xs">
                                        {module}
                                      </td>
                                      {ACTION_ORDER.map((action) => {
                                        const permission = modulePermissions.find((item) => item.action === action);
                                        const isViewAction = action.toLowerCase() === "view";

                                        return (
                                          <td key={action} className="px-2 py-1 text-center">
                                            {permission ? (
                                              <div className="flex justify-center">
                                                <Checkbox
                                                  checked={form.permissionIds.includes(permission.permissionId)}
                                                  onChange={() => onTogglePermission(permission.permissionId)}
                                                  disabled={!isViewAction && !isViewSelected}
                                                  id={`permission-${permission.permissionId}`}
                                                />
                                              </div>
                                            ) : (
                                              <span className="text-gray-300">-</span>
                                            )}
                                          </td>
                                        );
                                      })}
                                      <td className="px-2 py-1 text-center bg-gray-50/30">
                                        <div className="flex justify-center">
                                          <Checkbox
                                            checked={allSelected}
                                            onChange={(e) => onToggleModule(module, e.target.checked)}
                                            id={`module-${module.replace(/\s+/g, "-").toLowerCase()}`}
                                          />
                                        </div>
                                      </td>
                                    </tr>
                                  </Fragment>
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
          </section>
        </div>
      )}
    </Modal>
  );
};

export default UserRoleModal;
