import { Pencil, Trash2 } from "lucide-react";
import {
  Loader,
  Modal,
  PageShell,
  RecordTableCard,
} from "../../../../components/common";
import { useHappyHourList } from "../hooks/useHappyHourList";
import HappyHourForm from "../components/HappyHourForm";

const HappyHourList = () => {
  const {
    filteredList, loading, detailLoading, saving, deleting,
    open, editData, deleteCandidate, search,
    fromDate, setFromDate, toDate, setToDate,
    setSearch, setDeleteCandidate,
    openCreateModal, closeModal,
    handleEdit, handleSave, handleDelete,
  } = useHappyHourList();

  return (
    <PageShell title="Happy Hours Management">
      {loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm">
          <Loader text="Loading Happy Hours..." />
        </div>
      ) : (
        <RecordTableCard
          title="Active Promotions"
          search={search}
          onSearchChange={setSearch}
          rowKey="promotionId"
          data={filteredList}
          actionLabel="+ Add New"
          onAction={openCreateModal}
          extraActions={
            <div className="flex items-center gap-2">
                <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-pos-primary transition-all"
                />
                <span className="text-gray-400">to</span>
                <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 outline-none focus:border-pos-primary transition-all"
                />
            </div>
          }
          columns={[
            { header: "Promotion", accessor: "promotionName" },
            { 
                header: "Start Date", 
                accessor: "validFrom",
                render: (row) => new Date(row.validFrom).toLocaleDateString()
            },
            { 
                header: "End Date", 
                accessor: "validTo",
                render: (row) => new Date(row.validTo).toLocaleDateString()
            },
            { header: "Branch", accessor: "branch" },
            {
              header: "Actions",
              accessor: "promotionId",
              render: (row) => (
                <div className="flex gap-2">
                  <button
                    onClick={() => void handleEdit(row.promotionId)}
                    className="p-2 text-pos-primary hover:bg-pos-primary/10 rounded-lg transition-all"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setDeleteCandidate(row)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ),
            },
          ]}
        />
      )}

      <Modal
        isOpen={open}
        onClose={closeModal}
        title={editData ? "Edit Happy Hour" : "Create Happy Hour"}
        size="2xl"
      >
        {detailLoading ? (
          <div className="py-8">
            <Loader text="Loading details..." />
          </div>
        ) : (
          <HappyHourForm
            initialData={editData}
            onSubmit={handleSave}
            onCancel={closeModal}
            submitting={saving}
          />
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Modal
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        title="Confirm Deletion"
        size="sm"
      >
        <div className="p-4 text-center">
          <p className="mb-6 text-gray-600">
            Are you sure you want to delete the promotion{" "}
            <span className="font-bold text-gray-900">
              "{deleteCandidate?.promotionName}"
            </span>?
            This action cannot be undone.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setDeleteCandidate(null)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </PageShell>
  );
};

export default HappyHourList;
