import { AlertCircle, Plus, Pencil, Trash2 } from "lucide-react";
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
        </div>
      )}

      {/* Uniform Header & Filter Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
        <div className="flex flex-wrap gap-4 items-end flex-1">
          <div className="w-48">
            <SelectInput 
              label="Branch" 
              placeholder="All Branches"
              options={branches} 
              value={filters.branchId} 
              onChange={(e) => handleFilterChange("branchId", e.target.value)} 
            />
          </div>
          <div className="w-64">
            <SearchableSelect 
              label="Product" 
              placeholder="Search product..."
              options={products}
              value={filters.productId} 
              onChange={(val) => handleFilterChange("productId", val)} 
            />
          </div>
          <div className="w-48">
            <SelectInput 
              label="Unit" 
              placeholder="Select Unit"
              options={units}
              value={filters.unitId} 
              onChange={(e) => handleFilterChange("unitId", e.target.value)} 
              disabled={!filters.productId}
            />
          </div>
        </div>
        <Button onClick={() => navigate("/dashboard/bom")} icon={<Plus size={18} />}>
          + New BOM
        </Button>
      </div>

      <div className="overflow-x-auto">
        <RecordTableCard<any>
          title="BOM Records"
          data={records}
          rowKey="transId"
          loading={loading}
          columns={[
            { header: "S.No", accessor: "sNo" },
            { header: "Branch", accessor: "branchName" },
            { header: "Product", accessor: "productName" },
            { header: "Unit", accessor: "unitName" },
            { header: "Qty", accessor: "qty" },
            {
              header: "Actions",
              accessor: "transId",
              render: (row) => (
                <div className="flex items-center gap-2">
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
