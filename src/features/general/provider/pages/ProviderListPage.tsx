import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Pencil, Trash2, Globe } from "lucide-react";
import {
  ConfirmDialog,
  Loader,
  PageShell,
  RecordTableCard,
  StatusBadge,
} from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import { fetchProviders, deleteProvider } from "../services/providerService";
import type { ProviderListItem } from "../types";
import { usePermissions } from "../../../../hooks/usePermissions";

const ProviderListPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const [providers, setProviders] = useState<ProviderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<ProviderListItem | null>(null);
  const [search, setSearch] = useState("");

  const canAdd = hasPermission("Provider Master", "Add");
  const canEdit = hasPermission("Provider Master", "Edit");
  const canDelete = hasPermission("Provider Master", "Delete");

  const loadProviders = useCallback(async () => {
    try {
      setLoading(true);
      const records = await fetchProviders();
      const sortedRecords = records.sort((a, b) => b.providerId - a.providerId);
      setProviders(sortedRecords);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load providers", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadProviders();
  }, [loadProviders]);

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setDeleting(true);
      await deleteProvider(deleteCandidate.providerId);
      showToast("Provider deleted successfully", "success");
      await loadProviders();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete provider", "error");
    } finally {
      setDeleting(false);
      setDeleteCandidate(null);
    }
  };

  const filteredProviders = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return providers;
    return providers.filter((p) =>
      p.providerName.toLowerCase().includes(query) ||
      p.paymode?.toLowerCase().includes(query)
    );
  }, [providers, search]);

  return (
    <PageShell title="Provider Management">
      {loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-12 shadow-sm">
          <Loader text="Loading providers..." />
        </div>
      ) : (
        <RecordTableCard
          title="Registered Provider List"
          search={search}
          onSearchChange={setSearch}
          data={filteredProviders}
          rowKey="providerId"
          actionLabel={canAdd ? "+ Add Provider" : undefined}
          onAction={() => navigate("/dashboard/providers/new")}
          columns={[
            { 
              header: "Provider Info", 
              accessor: "providerName",
              render: (row) => (
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 overflow-hidden rounded-xl border border-gray-100 bg-gray-50 flex items-center justify-center shrink-0">
                    {/* Note: In list view we don't always have imageUrl, could use a default icon */}
                    <Globe size={20} className="text-gray-300" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{row.providerName}</span>
                  </div>
                </div>
              )
            },
            { 
              header: "Paymode", 
              accessor: "paymode",
              render: (row) => (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                    {row.paymode || "Standard"}
                  </span>
                </div>
              )
            },
            {
              header: "Delivery Status",
              accessor: "deliveryStatus",
              render: (row) => (
                <StatusBadge 
                  status={row.deliveryStatus === "Enable" ? "active" : "inactive"} 
                  label={row.deliveryStatus}
                />
              ),
            },
            {
              header: "Actions",
              accessor: "providerId",
              render: (row) => (
                <div className="flex gap-1.5">
                  {canEdit && (
                    <button
                      onClick={() => navigate(`/dashboard/providers/edit/${row.providerId}`)}
                      className="p-2 text-[#49293e] hover:bg-[#49293e]/10 rounded-lg transition-colors"
                    >
                      <Pencil size={16} />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => setDeleteCandidate(row)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              )
            }
          ]}
        />
      )}

      <ConfirmDialog
        isOpen={deleteCandidate !== null}
        title="Delete Provider"
        message={`Are you sure you want to delete "${deleteCandidate?.providerName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidate(null)}
        loading={deleting}
      />
    </PageShell>
  );
};

export default ProviderListPage;
