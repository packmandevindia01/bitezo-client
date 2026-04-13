import { ConfirmDialog, PageShell } from "../../../../components/common";
import EmployeeModal from "../components/EmployeeModal";
import EmployeeTable from "../components/EmployeeTable";
import { useEmployeeManager } from "../hooks/useEmployeeManager";

const EmployeePage = () => {
  const {
    form,
    setForm,
    editingId,
    search,
    setSearch,
    open,
    branches,
    loading,
    saving,
    deleting,
    error,
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

  return (
    <PageShell title="Employee Creation">
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <EmployeeTable
        employees={filteredEmployees}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateModal}
        onEdit={handleEdit}
        onDelete={setDeleteCandidate}
        loading={loading}
      />

      <EmployeeModal
        isOpen={open}
        editingId={editingId}
        form={form}
        branches={branches}
        saving={saving}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onClose={closeModal}
        onClear={resetForm}
        onSave={handleSave}
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
