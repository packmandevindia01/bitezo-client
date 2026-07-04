import { ConfirmDialog, PageShell, SearchBar, Button } from "../../../../components/common";
import { Plus } from "lucide-react";
import EmployeeModal from "../components/EmployeeModal";
import EmployeeTable from "../components/EmployeeTable";
import { useEmployeeManager } from "../hooks/useEmployeeManager";
import { usePermissions } from "../../../../hooks/usePermissions";

const EmployeePage = () => {
  const { hasPermission } = usePermissions();
  const {
    form,
    editingId,
    search,
    setSearch,
    open,
    branches,
    roles,
    loading,
    saving,
    deleting,
    deleteCandidate,
    setDeleteCandidate,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
    filteredEmployees,
  } = useEmployeeManager();

  const canAdd = hasPermission("Employee Master", "Add");
  const canEdit = hasPermission("Employee Master", "Edit");
  const canDelete = hasPermission("Employee Master", "Delete");

  return (
    <PageShell title="Employee Management">
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
        <div className="flex gap-4 items-end flex-1">
          <div className="flex-1 max-w-sm">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search employees..."
            />
          </div>
        </div>
        {canAdd && (
          <Button icon={<Plus size={18} />} onClick={openCreateModal}>
            + Add Employee
          </Button>
        )}
      </div>

      <EmployeeTable
        employees={filteredEmployees}
        onEdit={canEdit ? handleEdit : undefined}
        onDelete={canDelete ? setDeleteCandidate : undefined}
        loading={loading}
      />

      <EmployeeModal
        isOpen={open}
        editingId={editingId}
        form={form as any}
        branches={branches}
        roles={roles}
        saving={saving}
        onClose={closeModal}
        onClear={resetForm}
        onSave={() => void handleSave()}
        onDelete={() => {
          if (!canDelete) return;
          const record = filteredEmployees.find((e) => e.id === editingId);
          if (record) {
            setDeleteCandidate(record);
            closeModal();
          }
        }}
      />

      <ConfirmDialog
        isOpen={deleteCandidate !== null}
        title="Delete Employee"
        message={`Are you sure you want to delete "${deleteCandidate?.name ?? "this employee"}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) setDeleteCandidate(null);
        }}
      />
    </PageShell>
  );
};

export default EmployeePage;
