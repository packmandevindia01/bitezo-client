import { Pencil, Trash2, Plus } from "lucide-react";
import CustomerForm from "../components/CustomerForm";
import {
  ConfirmDialog,
  Loader,
  Modal,
  PageShell,
  RecordTableCard,
  StatusBadge,
  SearchBar,
  Button,
} from "../../../../components/common";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useCustomerList } from "../hooks/useCustomerList";

const CustomerList = () => {
  const { hasPermission } = usePermissions();
  const { formatAmount } = useCurrency();

  const {
    customers,
    totalCount,
    loading,
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

  const canAdd = hasPermission("Customer Master", "Add");
  const canEdit = hasPermission("Customer Master", "Edit");
  const canDelete = hasPermission("Customer Master", "Delete");

  return (
    <PageShell title="Customer Master">
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
        <div className="flex gap-4 items-end flex-1">
          <div className="flex-1 max-w-sm">
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search customers..."
            />
          </div>
          <div className="text-xs font-bold text-slate-500 mb-1.5 shrink-0">
            Total Records: {totalCount}
          </div>
        </div>
        {canAdd && (
          <Button icon={<Plus size={18} />} onClick={openCreateModal}>
            + Add Customer
          </Button>
        )}
      </div>

      {loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm">
          <Loader text="Loading customers..." />
        </div>
      ) : (
        <RecordTableCard
          title="Saved Customer List"
          rowKey="id"
          data={customers}
          columns={[
            { header: "Code", accessor: "customerCode", align: "center" },
            { header: "Name", accessor: "customerName", align: "center" },
            { header: "Mobile", accessor: "mobileNo", align: "center" },
            {
              header: "Opening Bal",
              accessor: "openingBalance",
              align: "right",
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
            {
              header: "Actions",
              accessor: "id",
              align: "center",
              render: (row) => (
                <div className="flex justify-center gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                      aria-label={`Edit ${row.customerName}`}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteCandidate(row)}
                      className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                      aria-label={`Delete ${row.customerName}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal isOpen={open} onClose={closeModal} title={editCustomer ? "Edit Customer" : "Customer Creation"} size="xl">
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
      </Modal>

      <ConfirmDialog
        isOpen={deleteCandidate !== null}
        title="Delete Customer"
        message={`Are you sure you want to delete ${deleteCandidate?.customerName ?? "this customer"}?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!deleting) {
            setDeleteCandidate(null);
          }
        }}
      />
    </PageShell>
  );
};

export default CustomerList;
