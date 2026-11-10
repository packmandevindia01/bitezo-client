import MasterListPage, { type MasterColumn } from "../../../../components/common/MasterListPage";
import PaymodeModal from "../components/PaymodeModal";
import { usePaymodeManager } from "../hooks/usePaymodeManager";
import type { PaymodeRecord } from "../types";

const isActive = (row: PaymodeRecord) => row.isActive === "Active" || row.isActive === true;

const COLUMNS: MasterColumn<PaymodeRecord>[] = [
  { header: "S.No", accessor: "sNo", render: (_, index) => index + 1 },
  { header: "Code", accessor: "code" },
  { header: "Paymode", accessor: "paymodeName" },
  {
    header: "Status",
    accessor: "isActive",
    render: (row) => (
      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${isActive(row) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
        {isActive(row) ? "Active" : "Inactive"}
      </span>
    ),
  },
];

const PaymodePage = () => {
  const {
    form,
    open,
    search,
    editingId,
    filteredRecords,
    loading,
    saving,
    counterOptions,
    refetchCounters,
    setSearch,
    handleClear,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  } = usePaymodeManager();

  return (
    <MasterListPage<PaymodeRecord>
      moduleName="Paymode Master"
      title="Paymode Master"
      tableTitle="Saved Paymode List"
      searchPlaceholder="Search paymodes..."
      rowKey="paymodeId"
      getName={(row) => row.paymodeName}
      columns={COLUMNS}
      records={filteredRecords}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={handleEdit}
      onDelete={(row) => handleDelete(row.paymodeId)}
      editingId={editingId}
      closeForm={closeModal}
      deleteDialog={{ message: (row) => `Are you sure you want to delete paymode "${row.paymodeName}"?` }}
      renderForm={(deleteEditing) => (
        <PaymodeModal
          isOpen={open}
          editingId={editingId}
          form={form}
          saving={saving}
          selectedCounterIds={form.watch("counterIds")}
          counterOptions={counterOptions}
          onOpenCounters={refetchCounters}
          onClose={closeModal}
          onClear={handleClear}
          onSave={handleSave}
          onDelete={deleteEditing}
        />
      )}
    />
  );
};

export default PaymodePage;
