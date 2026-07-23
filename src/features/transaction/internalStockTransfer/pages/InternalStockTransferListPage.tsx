import { AlertCircle, Pencil, Trash2, Plus } from "lucide-react";
import { Button, FormInput, PageShell, SelectInput, RecordTableCard, ConfirmDialog, SearchBar } from "../../../../components/common";
import { useInternalStockTransferList } from "../hooks/useInternalStockTransferList";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { internalStockTransferApi } from "../services/internalStockTransferApi";
import { useToast } from "../../../../app/providers/useToast";
import { useQueryClient } from "@tanstack/react-query";

const InternalStockTransferListPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const {
    records,
    loading,
    error,
    filters,
    handleFilterChange,
    branches,
    searchTerm,
    setSearchTerm
  } = useInternalStockTransferList();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await internalStockTransferApi.cancelTransfer(deleteId);
      showToast("Transfer cancelled successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["internalStockTransferList"] });
    } catch (err: any) {
      showToast(err.message || "Failed to cancel transfer", "error");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <PageShell title="Internal Stock Transfers" description="View and manage previous internal stock transfers.">
      {error && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Filter Header Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
        <div className="flex gap-4 items-end flex-1 flex-wrap">
          <div className="w-40">
            <FormInput 
              label="From Date" 
              type="date" 
              value={filters.fromDate} 
              onChange={(e) => handleFilterChange("fromDate", e.target.value)} 
            />
          </div>
          <div className="w-40">
            <FormInput 
              label="To Date" 
              type="date" 
              value={filters.toDate} 
              onChange={(e) => handleFilterChange("toDate", e.target.value)} 
            />
          </div>
          <div className="flex-1 max-w-sm">
            <SearchBar 
              value={searchTerm} 
              onChange={setSearchTerm} 
              placeholder="Search ref no or branch..." 
            />
          </div>
          <div className="w-48">
            <SelectInput 
              label="Branch" 
              placeholder="All Branches"
              options={branches} 
              value={filters.branchId} 
              onChange={(e) => handleFilterChange("branchId", e.target.value)} 
              disabled={filters.isBranchLocked}
            />
          </div>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => navigate("/dashboard/internal-stock-transfer")}>
          Add New
        </Button>
      </div>

      <div className="overflow-x-auto">
        <RecordTableCard<any>
          title="Internal Stock Transfer Records"
          data={records}
          rowKey="transId"
          loading={loading}
          columns={[
            { header: "SL NO", accessor: "transId", render: (_, index) => index + 1 },
            { header: "Date", accessor: "transDate", render: (row) => new Date(row.transDate).toLocaleDateString() },
            { header: "Ref No", accessor: "refNo" },
            { header: "From Branch", accessor: "fromBranch" },
            { header: "To Branch", accessor: "toBranch" },
            { header: "Total Amount", accessor: "netAmount", render: (row) => formatAmount(Number(row.netAmount)), align: "right" },
            {
              header: "Actions",
              accessor: "transId",
              align: "right",
              render: (row) => (
                <div className="flex items-center justify-end gap-2">
                  <button 
                    onClick={() => navigate(`/dashboard/internal-stock-transfer/edit/${row.transId}`)} 
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button 
                    onClick={() => setDeleteId(row.transId)} 
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                    title="Cancel Transfer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            }
          ]}
        />
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        title="Cancel Transfer"
        message="Are you sure you want to cancel this internal stock transfer?"
        confirmLabel="Cancel Transfer"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </PageShell>
  );
};

export default InternalStockTransferListPage;
