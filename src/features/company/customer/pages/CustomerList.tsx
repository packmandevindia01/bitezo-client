import CustomerForm from "../components/CustomerForm";
import { Loader, Modal, StatusBadge } from "../../../../components/common";
import MasterListPage from "../../../../components/common/MasterListPage";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useCustomerList } from "../hooks/useCustomerList";
import type { Customer } from "../types";

const CustomerList = () => {
  const { formatAmount } = useCurrency();

  const {
    customers,
    loading,
    detailLoading,
    saving,
    deleting,
    open,
    editCustomer,
    deleteCandidate,
    setDeleteCandidate,
    search,
    setSearch,
    closeModal,
    openCreateModal,
    handleEdit,
    handleSave,
    handleDelete,
    setEditCustomer,
  } = useCustomerList();

  return (
    <MasterListPage<Customer>
      moduleName="Customer Master"
      title="Customer Master"
      tableTitle="Saved Customer List"
      searchPlaceholder="Search customers..."
      rowKey="id"
      getName={(row) => row.customerName}
      centered
      loadingText="Loading customers..."
      columns={[
        { header: "Code", accessor: "customerCode", align: "center" },
        { header: "Name", accessor: "customerName", align: "center" },
        { header: "Mobile", accessor: "mobileNo", align: "center" },
        {
          header: "Opening Bal",
          accessor: "openingBalance",
          align: "center",
          render: (row) => <span>{formatAmount(Number(row.openingBalance) || 0)}</span>,
        },
        {
          header: "Status",
          accessor: "isActive",
          align: "center",
          render: (row) => (
            <StatusBadge
              status={row.isActive ? "active" : "inactive"}
              label={row.isActive ? "Active" : "Inactive"}
            />
          ),
        },
      ]}
      records={customers}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={handleEdit}
      editingId={editCustomer?.id ?? null}
      closeForm={closeModal}
      deleteFlow={{
        candidate: deleteCandidate,
        request: setDeleteCandidate,
        confirm: () => void handleDelete(),
        cancel: () => {
          if (!deleting) {
            setDeleteCandidate(null);
          }
        },
      }}
      deleteDialog={{
        title: "Delete Customer",
        message: (row) => `Are you sure you want to delete ${row.customerName ?? "this customer"}?`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
      }}
      renderForm={(_, canDelete) => (
        <Modal isOpen={open} onClose={closeModal} title={editCustomer ? "Edit Customer" : "Customer Creation"} size="xl">
          {detailLoading ? (
            <div className="p-10 flex justify-center">
              <Loader text="Loading customer details..." />
            </div>
          ) : (
            <CustomerForm
              key={editCustomer?.id ?? "new-customer"}
              initialData={editCustomer}
              onSubmit={handleSave}
              onCancel={closeModal}
              submitting={saving}
              onDelete={editCustomer && canDelete ? () => setDeleteCandidate(editCustomer) : undefined}
              deleting={deleting}
              onClear={() => setEditCustomer(null)}
            />
          )}
        </Modal>
      )}
    />
  );
};

export default CustomerList;
