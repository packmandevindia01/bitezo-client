import { AlertCircle, X, Pencil, Trash2, Plus } from "lucide-react";
import { Button, FormInput, PageShell, SelectInput, RecordTableCard, ConfirmDialog, SearchBar } from "../../../../components/common";
import { useStockAdjustmentList } from "../hooks/useStockAdjustmentList";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { stockAdjustmentApi } from "../services/stockAdjustmentApi";

const StockAdjustmentListPage = () => {
  const navigate = useNavigate();
  const { formatAmount } = useCurrency();
  const {
    records,
    loading,
    error: fetchError,
    filters,
    handleFilterChange,
    fetchList,
    branches
  } = useStockAdjustmentList();

  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const error = localError || fetchError;
  const setError = setLocalError;

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await stockAdjustmentApi.cancelStockAdjustment(deleteId);
      fetchList();
    } catch (err: any) {
      setError(err.message || "Failed to cancel stock adjustment");
    } finally {
      setDeleteId(null);
    }
  };

  const filteredRecords = records.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (row.refNo || "").toLowerCase().includes(term) ||
      (row.branch || "").toLowerCase().includes(term)
    );
  });

  return (
    <PageShell title="Saved Stock Adjustments" description="View and manage previous stock adjustments.">
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
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
        <div className="flex gap-4 items-end flex-1">
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
          <div className="flex-1 max-w-sm flex flex-col gap-1 mb-1 relative">
            <label className="flex items-center text-[10px] font-bold uppercase tracking-widest text-transparent mb-0.5 select-none pointer-events-none">
              -
            </label>
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by Ref No or Branch..."
            />
          </div>
          <div className="w-48">
            <SelectInput 
              label="Branch" 
              placeholder="All Branches"
              options={branches} 
              value={filters.branchId} 
              onChange={(e) => handleFilterChange("branchId", e.target.value)} 
            />
          </div>
        </div>
        <Button onClick={() => navigate("/dashboard/stock-adjustment")} icon={<Plus size={18} />}>
          Add New
        </Button>
      </div>

      <div className="overflow-x-auto">
        <RecordTableCard<any>
          title="Stock Adjustment Records"
          data={filteredRecords}
          rowKey="transId"
          loading={loading}
          columns={[
            { header: "Date", accessor: "transDate", render: (row) => new Date(row.transDate).toLocaleDateString() },
            { header: "Ref No", accessor: "refNo" },
            { header: "Branch", accessor: "branch" },
            { header: "Total Amount", accessor: "netAmount", render: (row) => formatAmount(Number(row.netAmount)), align: "right" },
            {
              header: "Actions",
              accessor: "transId",
              align: "right",
              render: (row) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => navigate(`/dashboard/stock-adjustment?id=${row.transId}`)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(row.transId)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                    title="Cancel Adjustment"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      </div>

      <ConfirmDialog
        isOpen={deleteId !== null}
        onCancel={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Cancel Stock Adjustment"
        message="Are you sure you want to cancel this stock adjustment? This action cannot be undone."
        confirmLabel="Cancel Record"
        confirmVariant="danger"
      />
    </PageShell>
  );
};

export default StockAdjustmentListPage;
