import { AlertCircle, X, Search, Pencil, Trash2 } from "lucide-react";
import { Button, FormInput, PageShell, SelectInput, RecordTableCard, ConfirmDialog } from "../../../../components/common";
import { useInternalStockTransferList } from "../hooks/useInternalStockTransferList";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { internalStockTransferApi } from "../services/internalStockTransferApi";
import { useToast } from "../../../../app/providers/useToast";

const InternalStockTransferListPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const {
    records,
    loading,
    error,
    setError,
    filters,
    handleFilterChange,
    fetchList,
    branches
  } = useInternalStockTransferList();

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await internalStockTransferApi.cancelTransfer(deleteId);
      showToast("Transfer cancelled successfully", "success");
      fetchList();
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
          <button type="button" onClick={() => setError(null)} className="shrink-0 rounded p-0.5 hover:bg-red-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Filter Section */}
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <SelectInput 
            label="Branch" 
            placeholder="All Branches"
            options={branches} 
            value={filters.branchId} 
            onChange={(e) => handleFilterChange("branchId", e.target.value)} 
          />
          <FormInput 
            label="From Date" 
            type="date" 
            value={filters.fromDate} 
            onChange={(e) => handleFilterChange("fromDate", e.target.value)} 
          />
          <FormInput 
            label="To Date" 
            type="date" 
            value={filters.toDate} 
            onChange={(e) => handleFilterChange("toDate", e.target.value)} 
          />
          <FormInput 
            label="Ref No" 
            value={filters.refNo} 
            onChange={(e) => handleFilterChange("refNo", e.target.value)} 
          />
          <div className="flex items-end">
            <Button onClick={fetchList} className="w-full">
              <Search size={16} className="mr-2" /> Search
            </Button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <RecordTableCard<any>
          title="Internal Stock Transfer Records"
          actionLabel="+ New Transfer"
          onAction={() => navigate("/dashboard/internal-stock-transfer")}
          data={records}
          rowKey="transId"
          loading={loading}
          columns={[
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
