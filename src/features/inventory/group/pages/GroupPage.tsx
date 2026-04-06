import { Pencil, Trash2 } from "lucide-react";
import { Modal, PageShell, RecordTableCard } from "../../../../components/common";
import GroupForm from "../components/GroupForm";
import { useGroupManager } from "../hooks/useGroupManager";

const GroupPage = () => {
  const {
    search,
    setSearch,
    open,
    editGroup,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
    filteredGroups,
  } = useGroupManager();

  return (
    <PageShell
      title="Group Master"
      description="Groups now follow the same list-first and modal-based workflow used in your Users feature, so the experience stays consistent across the dashboard."
    >
      <RecordTableCard
        title="Saved Group List"
        search={search}
        onSearchChange={setSearch}
        rowKey="id"
        data={filteredGroups}
        actionLabel="+ Add Group"
        onAction={openCreateModal}
        columns={[
          { header: "#", accessor: "id" },
          { header: "Code", accessor: "code" },
          { header: "Name", accessor: "name" },
          {
            header: "Actions",
            accessor: "id",
            render: (row) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEdit(row)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10"
                  aria-label={`Edit ${row.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50"
                  aria-label={`Delete ${row.name}`}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal isOpen={open} onClose={closeModal} title="Group">
        <GroupForm
          key={editGroup?.id ?? "new-group"}
          initialData={editGroup}
          onSubmit={handleSave}
          onCancel={closeModal}
        />
      </Modal>
    </PageShell>
  );
};

export default GroupPage;

