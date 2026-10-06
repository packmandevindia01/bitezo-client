import { useEffect } from "react";
import { Save, RotateCcw, Trash2 } from "lucide-react";
import { Button, Checkbox, FormInput, Loader, Modal } from "../../../../components/common";
import type { EmployeeRoleForm, EmployeeRolePermission } from "../types";

interface Props {
  isOpen: boolean;
  editingId: number | null;
  form: EmployeeRoleForm;
  error?: string;
  permissions: EmployeeRolePermission[];
  detailLoading: boolean;
  saving: boolean;
  deleting: boolean;
  onClose: () => void;
  onChange: (patch: Partial<EmployeeRoleForm>) => void;
  onTogglePermission: (permissionId: number) => void;
  onClear: () => void;
  onSave: () => void;
  onDelete?: () => void;
  onToggleAll: (checked: boolean) => void;
}

const EmployeeRoleModal = ({
  isOpen,
  editingId,
  form,
  error,
  permissions,
  detailLoading,
  saving,
  deleting,
  onClose,
  onChange,
  onTogglePermission,
  onClear,
  onSave,
  onDelete,
  onToggleAll,
}: Props) => {
  const allSelected = permissions.length > 0 && permissions.every(p => form.permissionsIds.includes(p.permissionId));

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        const el = document.getElementById("employee-role-name-input");
        if (el) {
          el.focus();
          if (el instanceof HTMLInputElement) el.select?.();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleCheckboxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      onSave();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Edit Employee Role" : "Add Employee Role"}
      size="xl"
      footer={
        <div className="flex gap-3">
          <Button 
            variant="secondary" 
            onClick={() => {
              onClear();
              setTimeout(() => {
                const el = document.getElementById("employee-role-name-input");
                if (el) {
                  el.focus();
                  if (el instanceof HTMLInputElement) el.select?.();
                }
              }, 50);
            }} 
            disabled={saving || deleting} 
            tabIndex={-1}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Clear
          </Button>
          <Button 
            id="employee-role-save-btn"
            onClick={onSave} 
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSave();
              }
            }}
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
        <form 
          onSubmit={(e) => { e.preventDefault(); onSave(); }} 
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const target = e.target as HTMLElement;
              if (target.id === "employee-role-name-input") return;
              if (target.tagName === "BUTTON") return;
              e.preventDefault();
              onSave();
            }
          }}
          className="flex flex-col overflow-y-auto pr-1" 
          style={{ maxHeight: "calc(90vh - 120px)" }}
        >
          <section className="rounded-3xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
            <div className="flex flex-col gap-6">
              
              <div>
                <FormInput
                  id="employee-role-name-input"
                  label="Role Name"
                  required
                  error={error}
                  maxLength={20}
                  value={form.roleName}
                  onChange={(e) => onChange({ roleName: e.target.value.slice(0, 20) })}
                  placeholder="Enter employee role name (e.g. Cashier)"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (!form.roleName.trim()) {
                        onSave();
                        return;
                      }
                      if (form.permissionsIds.length > 0) {
                        document.getElementById("employee-role-save-btn")?.focus();
                      } else {
                        const firstCheckbox = document.querySelector<HTMLInputElement>(
                          '#employee-permissions-grid input[type="checkbox"]'
                        );
                        if (firstCheckbox) {
                          firstCheckbox.focus();
                        } else {
                          document.getElementById("employee-role-save-btn")?.focus();
                        }
                      }
                    }
                  }}
                />
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between border-b border-gray-100 pb-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    POS Permissions
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 rounded-md bg-gray-50 px-3 py-1.5 hover:bg-gray-100 transition-colors">
                    <span className="text-xs font-semibold text-gray-700">Select All</span>
                    <Checkbox
                      checked={allSelected}
                      onChange={(e) => onToggleAll(e.target.checked)}
                      onKeyDown={handleCheckboxKeyDown}
                      id="toggle-all-permissions"
                    />
                  </label>
                </div>
                
                <div id="employee-permissions-grid" className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                  {permissions.map((permission) => (
                    <label 
                      key={permission.permissionId} 
                      className={`flex cursor-pointer items-center justify-between gap-2 rounded-xl border p-3 transition-all ${
                        form.permissionsIds.includes(permission.permissionId)
                          ? "border-[#49293e] bg-[#49293e]/5 shadow-sm"
                          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-xs font-semibold text-gray-700 leading-tight">
                        {permission.action}
                      </span>
                      <Checkbox
                        checked={form.permissionsIds.includes(permission.permissionId)}
                        onChange={() => onTogglePermission(permission.permissionId)}
                        onKeyDown={handleCheckboxKeyDown}
                        id={`permission-${permission.permissionId}`}
                      />
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </section>
        </form>
      )}
    </Modal>
  );
};

export default EmployeeRoleModal;
