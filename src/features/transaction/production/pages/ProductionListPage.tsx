/* eslint-disable @typescript-eslint/no-explicit-any */
import { Trash2, Pencil, Plus } from "lucide-react";
import { Button, PageShell, RecordTableCard, ConfirmDialog, SelectInput, SearchableSelect } from "../../../../components/common";
import { useProductionList } from "../hooks/useProductionList";
import { productionApi } from "../services/productionApi";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const ProductionListPage = () => {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const {
    records,
    loading,
    error,
    filters,
    branches,
    products,
    units,
    handleFilterChange,
  } = useProductionList();

  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    if (error) {
      showToast(error, "error");
    }
  }, [error, showToast]);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await productionApi.cancelProduction(id);
    },
    onSuccess: () => {
      showToast("Production record cancelled successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["productionList"] });
      setDeleteId(null);
    },
    onError: (err: any) => {
      showToast(err.message || "Failed to cancel production record", "error");
      setDeleteId(null);
    }
  });

  const handleDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  return (
    <PageShell title="Production" description="View and manage Production records.">
      {/* Standard Filter Header */}
      <div className="flex flex-col md:flex-row gap-4 mb-4 justify-between items-end">
        <div className="flex gap-4 items-end flex-1 flex-wrap">
          <div className="w-48">
            <SelectInput 
              id="filter-branch"
              label="Branch" 
              placeholder="All Branches"
              options={branches} 
              value={filters.branchId} 
              onChange={(e) => handleFilterChange("branchId", e.target.value)} 
              disabled={filters.isBranchLocked}
            />
          </div>
          <div className="flex-1 max-w-sm">
            <SearchableSelect 
              id="filter-product"
              label="Product" 
              placeholder="All Products"
              options={products}
              value={filters.productId} 
              onChange={(val) => handleFilterChange("productId", val)} 
            />
          </div>
          <div className="w-48">
            <SelectInput 
              id="filter-unit"
              label="Unit" 
              placeholder="All Units"
              options={units}
              value={filters.unitId} 
              onChange={(e) => handleFilterChange("unitId", e.target.value)} 
            />
          </div>
        </div>
        <Button onClick={() => navigate("/dashboard/production")} icon={<Plus size={18} />}>
          Add New
        </Button>
      </div>

      <div className="overflow-x-auto">
        <RecordTableCard<any>
          title="Production Records"
          data={records}
          rowKey="transId"
          loading={loading || deleteMutation.isPending}
          columns={[
            { header: "S.No", accessor: "sNo" },
            { header: "Prod No.", accessor: "productionNo" },
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
                    onClick={() => navigate(`/dashboard/production/${row.transId || row.id || row.productionId}`)}
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                    title="Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteId(row.transId || row.id || row.productionId)}
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
        isOpen={!!deleteId}
        title="Cancel Production Record"
        message="Are you sure you want to cancel this production record? This action cannot be undone."
        confirmLabel={deleteMutation.isPending ? "Cancelling..." : "Yes, Cancel it"}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </PageShell>
  );
};

export default ProductionListPage;
