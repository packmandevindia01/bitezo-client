import { useCallback, useEffect, useMemo, useState } from "react";
import SupplierForm from "../components/SupplierForm";
import { Loader, Modal, StatusBadge } from "../../../../components/common";
import MasterListPage from "../../../../components/common/MasterListPage";
import { useToast } from "../../../../app/providers/useToast";
import {
  createSupplier,
  deleteSupplier,
  fetchSupplierById,
  fetchSuppliers,
  updateSupplier,
} from "../services";
import { useQueryClient } from "@tanstack/react-query";
import { notifySuppliersUpdated, subscribeToSupplierUpdates } from "../utils/supplierSync";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import type { Supplier, SupplierPayload } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Something went wrong while saving the supplier.";
};

const SupplierList = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Supplier | null>(null);
  const [search, setSearch] = useState("");

  // Adjust permission strings based on your actual roles config (assuming "Supplier Master")
  const canAdd = hasPermission("Supplier Master", "Add");
  const canEdit = hasPermission("Supplier Master", "Edit");
  const canDelete = hasPermission("Supplier Master", "Delete");

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const records = await fetchSuppliers();
      setSuppliers(records);
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  // Real-time synchronization: sync supplier list across tabs and components
  useEffect(() => {
    return subscribeToSupplierUpdates(() => {
      void loadSuppliers();
    });
  }, [loadSuppliers]);

  // Real-time synchronization: sync branch updates across tabs and components
  useEffect(() => {
    return subscribeToBranchUpdates(() => {
      queryClient.invalidateQueries({ queryKey: ["branchNames"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["allBranchesList"] });
    });
  }, [queryClient]);

  const closeModal = () => {
    setOpen(false);
    setEditSupplier(null);
    setDetailLoading(false);
  };

  const openCreateModal = () => {
    if (!canAdd) return;
    queryClient.invalidateQueries({ queryKey: ["branchNames"] });
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    queryClient.invalidateQueries({ queryKey: ["allBranchesList"] });
    setEditSupplier(null);
    setOpen(true);
  };

  const handleEdit = async (id: number) => {
    if (!canEdit) return;
    try {
      queryClient.invalidateQueries({ queryKey: ["branchNames"] });
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["allBranchesList"] });
      setOpen(true);
      setDetailLoading(true);
      const details = await fetchSupplierById(id);
      const preview = suppliers.find((item) => item.id === id);
      setEditSupplier({
        ...details,
        branchName: preview?.branchName ?? details.branchName,
        statusLabel: preview?.statusLabel ?? details.statusLabel,
      });
    } catch (error) {
      closeModal();
      showToast(getErrorMessage(error), "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const invalidateAllSupplierQueries = () => {
    void queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    void queryClient.invalidateQueries({ queryKey: ["supplierList"] });
    void queryClient.invalidateQueries({ queryKey: ["purchaseInvoiceSuppliers"] });
    void queryClient.invalidateQueries({ queryKey: ["purchaseReturnSuppliers"] });
    void queryClient.invalidateQueries({ queryKey: ["paymentAgainstAccounts"] });
    void queryClient.invalidateQueries({ queryKey: ["paymentAccounts"] });
    void queryClient.invalidateQueries({ queryKey: ["paymentAccountList"] });
    notifySuppliersUpdated();
  };

  const handleSave = async (payload: SupplierPayload) => {
    try {
      setSaving(true);
      if (editSupplier) {
        await updateSupplier(editSupplier.id, payload);
        showToast("Supplier updated successfully", "success");
      } else {
        await createSupplier(payload);
        showToast("Supplier created successfully", "success");
      }
      invalidateAllSupplierQueries();
      closeModal();
      void loadSuppliers();
    } catch (err: any) {
      const msg = err.message || getErrorMessage(err);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate || !canDelete) return;

    try {
      setDeleting(true);
      await deleteSupplier(deleteCandidate.id);
      showToast("Supplier deleted successfully", "success");
      setDeleteCandidate(null);

      if (editSupplier?.id === deleteCandidate.id) {
        closeModal();
      }

      invalidateAllSupplierQueries();
      void loadSuppliers();
    } catch (err: any) {
      const msg = err.message || getErrorMessage(err);
      showToast(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  const filteredSuppliers = useMemo(
    () =>
      suppliers.filter((supplier) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;

        return [
          supplier.code,
          supplier.name,
          supplier.mobileNo ?? "",
          supplier.area ?? "",
          supplier.statusLabel ?? "",
        ].some((value) => value.toLowerCase().includes(query));
      }),
    [search, suppliers]
  );

  return (
    <MasterListPage<Supplier>
      moduleName="Supplier Master"
      title="Suppliers"
      tableTitle="Saved Supplier List"
      searchPlaceholder="Search suppliers..."
      rowKey="id"
      getName={(row) => row.name}
      loadingText="Loading suppliers..."
      columns={[
        { header: "Code", accessor: "code" },
        { header: "Supplier Name", accessor: "name" },
        { header: "Mobile No", accessor: "mobileNo", render: (row) => <span>{row.mobileNo || "-"}</span> },
        { header: "Area", accessor: "area", render: (row) => <span>{row.area || "-"}</span> },
        {
          header: "Status",
          accessor: "isActive",
          render: (row) => <StatusBadge status={row.isActive ? "active" : "inactive"} />,
        },
      ]}
      records={filteredSuppliers}
      loading={loading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={(row) => handleEdit(row.id)}
      editingId={editSupplier?.id ?? null}
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
        title: "Delete Supplier",
        message: (row) => `Are you sure you want to delete ${row.name ?? "this supplier"}?`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
      }}
      renderForm={(_, canDelete) => (
        <Modal isOpen={open} onClose={closeModal} title={editSupplier ? "Edit Supplier" : "Supplier Creation"} size="2xl">
          {detailLoading ? (
            <div className="py-8">
              <Loader text="Loading supplier details..." />
            </div>
          ) : (
            <SupplierForm
              key={editSupplier?.id ?? "new-supplier"}
              initialData={editSupplier}
              onSubmit={handleSave}
              onCancel={closeModal}
              submitting={saving}
              onDelete={editSupplier && canDelete ? () => setDeleteCandidate(editSupplier) : undefined}
              deleting={deleting}
              onClear={() => setEditSupplier(null)}
            />
          )}
        </Modal>
      )}
    />
  );
};

export default SupplierList;
