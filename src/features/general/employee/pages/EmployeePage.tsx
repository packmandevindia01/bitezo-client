import { PageShell } from "../../../../components/common";
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
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    deleteById,
    filteredEmployees,
  } = useEmployeeManager();

  return (
    <PageShell
      title="Employee Creation"
      description="Employees now live inside their own feature folder and use the same reusable list-card and modal building blocks as the rest of the sidebar features."
    >
      <EmployeeTable
        employees={filteredEmployees}
        search={search}
        onSearchChange={setSearch}
        onAdd={openCreateModal}
        onEdit={handleEdit}
        onDelete={deleteById}
      />

      <EmployeeModal
        isOpen={open}
        editingId={editingId}
        form={form}
        onChange={(patch) => setForm((prev) => ({ ...prev, ...patch }))}
        onClose={closeModal}
        onClear={resetForm}
        onSave={handleSave}
      />
    </PageShell>
  );
};

export default EmployeePage;

