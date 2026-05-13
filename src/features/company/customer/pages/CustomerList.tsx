import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import CustomerForm from "../components/CustomerForm";
import {
  ConfirmDialog,
  Loader,
  Modal,
  PageShell,
  RecordTableCard,
  StatusBadge,
} from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import { customerApi } from "../../../pos/customer/services/customerApi";
import type { Customer } from "../../../pos/customer/types/customer";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useCurrency } from "../../../../hooks/useCurrency";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Something went wrong while saving the customer.";
};

const CustomerList = () => {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const { formatAmount } = useCurrency();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");

  // Adjust permissions based on your backend logic (using "Customer Master" as placeholder)
  const canAdd = hasPermission("Customer Master", "Add");
  const canEdit = hasPermission("Customer Master", "Edit");
  const canDelete = hasPermission("Customer Master", "Delete");

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      // Using the POS customer list endpoint (which gets all customers)
      const records = await customerApi.getCustomers();
      // Wait, customerApi.getCustomers() returns `data` in unwrap
      // Let's ensure it's an array
      setCustomers(Array.isArray(records) ? records : (records as any).data || []);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const closeModal = () => {
    setOpen(false);
    setEditCustomer(null);
  };

  const openCreateModal = () => {
    if (!canAdd) return;
    setEditCustomer(null);
    setOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    if (!canEdit) return;
    setEditCustomer(customer);
    setOpen(true);
  };

  const handleSave = async (data: Customer) => {
    try {
      setSaving(true);
      
      // Permission check
      if (editCustomer && !canEdit) throw new Error("Permission denied");
      if (!editCustomer && !canAdd) throw new Error("Permission denied");

      await customerApi.saveCustomer(data);
      await loadCustomers();
      showToast(editCustomer ? "Customer updated successfully" : "Customer created successfully", "success");
      
      closeModal();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate || !canDelete) return;

    try {
      setDeleting(true);
      const targetId = deleteCandidate.id || (deleteCandidate as any).customerId;
      if (targetId) {
        await customerApi.deleteCustomer(targetId);
      }
      await loadCustomers();
      
      if (editCustomer && (editCustomer.id === targetId || (editCustomer as any).customerId === targetId)) {
        closeModal();
      }

      showToast("Customer deleted successfully", "success");
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setDeleting(false);
      setDeleteCandidate(null);
    }
  };

  const filteredCustomers = useMemo(
    () =>
      customers.filter((c) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;

        return [
          c.customerCode,
          c.customerName,
          c.mobileNo,
          c.telNo,
          c.email,
        ].some((value) => value?.toLowerCase().includes(query));
      }),
    [customers, search]
  );

  return (
    <PageShell title="Customer Master">
      {loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm">
          <Loader text="Loading customers..." />
        </div>
      ) : (
        <RecordTableCard
          title="Saved Customer List"
          search={search}
          onSearchChange={setSearch}
          rowKey="id"
          data={filteredCustomers}
          actionLabel={canAdd ? "+ Add Customer" : undefined}
          onAction={canAdd ? openCreateModal : undefined}
          columns={[
            { header: "Code", accessor: "customerCode" },
            { header: "Name", accessor: "customerName" },
            { header: "Mobile", accessor: "mobileNo" },
            {
              header: "Opening Bal",
              accessor: "openingBalance",
              render: (row) => <span className="text-right block w-full pr-4">{formatAmount(Number(row.openingBalance) || 0)}</span>,
            },
            {
              header: "Status",
              accessor: "isActive",
              render: (row) => <StatusBadge status={row.isActive ? "active" : "inactive"} />,
            },
            {
              header: "Actions",
              accessor: "id",
              render: (row) => (
                <div className="flex gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => handleEdit(row)}
                      className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                      aria-label={`Edit ${row.customerName}`}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteCandidate(row)}
                      className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
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
