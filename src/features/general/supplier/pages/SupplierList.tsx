import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import SupplierForm from "../components/SupplierForm";
import {
  ConfirmDialog,
  Loader,
  Modal,
  PageShell,
  RecordTableCard, ListHeader,
  StatusBadge,
  } from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import {
  createSupplier,
  deleteSupplier,
  fetchSupplierById,
  fetchSuppliers,
  updateSupplier,
} from "../services";
import type { Supplier, SupplierPayload } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return "Something went wrong while saving the supplier.";
};

const SupplierList = () => {
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

  const closeModal = () => {
    setOpen(false);
    setEditSupplier(null);
    setDetailLoading(false);
  };

  const openCreateModal = () => {
    if (!canAdd) return;
    setEditSupplier(null);
    setOpen(true);
  };

  const handleEdit = async (id: number) => {
    if (!canEdit) return;
    try {
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
    <PageShell title="Suppliers">
      <ListHeader
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search suppliers..."
        autoFocusSearch
        canAdd={canAdd}
        onAdd={openCreateModal}
      />

      {loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm">
          <Loader text="Loading suppliers..." />
        </div>
      ) : (
        <RecordTableCard
          title="Saved Supplier List"
          rowKey="id"
          data={filteredSuppliers}
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
            {
              header: "Actions",
              accessor: "id",
              render: (row) => (
                <div className="flex gap-2">
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void handleEdit(row.id)}
                      className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                      aria-label={`Edit ${row.name}`}
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setDeleteCandidate(row)}
                      className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                      aria-label={`Delete ${row.name}`}
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

      <ConfirmDialog
        isOpen={deleteCandidate !== null}
        title="Delete Supplier"
        message={`Are you sure you want to delete ${deleteCandidate?.name ?? "this supplier"}?`}
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

export default SupplierList;
