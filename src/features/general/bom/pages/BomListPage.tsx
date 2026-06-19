import { AlertCircle, X, Search, Pencil, Trash2 } from "lucide-react";
import { Button, PageShell, RecordTableCard, ConfirmDialog, SelectInput, SearchableSelect } from "../../../../components/common";
import { useBomList } from "../hooks/useBomList";
import { bomApi } from "../services/bomApi";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useToast } from "../../../../app/providers/useToast";

const BomListPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const {
    records,
    loading,
    error,
    setError,
    filters,
    branches,
    products,
    units,
    handleFilterChange,
    fetchList,
  } = useBomList();

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await bomApi.cancelBom(deleteId);
      showToast("BOM cancelled successfully", "success");
      fetchList();
    } catch (err: any) {
      showToast(err.message || "Failed to cancel BOM", "error");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <PageShell title="Bill of Materials" description="View and manage BOM records.">
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
          <SearchableSelect 
            label="Product" 
            options={products}
            value={filters.productId} 
            onChange={(val) => handleFilterChange("productId", val)} 
          />
          <SelectInput 
            label="Unit" 
            options={units}
            value={filters.unitId} 
            onChange={(e) => handleFilterChange("unitId", e.target.value)} 
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
          title="BOM Records"
          actionLabel="+ New BOM"
          onAction={() => navigate("/dashboard/bom")}
          data={records}
          rowKey="transId"
          loading={loading}
          columns={[
            { header: "S.No", accessor: "sNo" },
            { header: "Branch", accessor: "branchName" },
            { header: "Product", accessor: "productName" },
            { header: "Unit", accessor: "unitName" },
            { header: "Qty", accessor: "qty", align: "right" },
            {
              header: "Actions",
              accessor: "transId",
              align: "right",
              render: (row) => (
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => navigate(`/dashboard/bom?id=${row.transId}`)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(row.transId)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
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
        title="Delete BOM"
        message="Are you sure you want to delete this BOM record? This action cannot be undone."
        confirmLabel="Delete Record"
        confirmVariant="danger"
      />
    </PageShell>
  );
};

export default BomListPage;
