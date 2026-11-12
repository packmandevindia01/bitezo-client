import { Pencil, Trash2 } from "lucide-react";
import { ConfirmDialog, Modal, PageShell, RecordTableCard, ListHeader, StatusBadge } from "../../../../components/common";
import MenuSettingsForm from "../components/MenuSettingsForm";
import { useMenuSettings } from "../hooks/useMenuSettings";
import type { MenuSettingsListItem } from "../types";
import { SessionTimelineAxis, SessionTimelineRow } from "../components/SessionTimeline";
import { formatSessionHours, crossesMidnight } from "../utils/sessionTime";

const MenuSettingsPage = () => {
  const {
    filteredList,
    sessionHours,
    listLoading,
    listError,
    
    search,
    setSearch,
    
    isOpen,
    isEditMode,
    editDetail,
    detailLoading,
    
    saving,
    deleting,
    deleteCandidate,
    
    openCreateModal,
    openEditModal,
    closeModal,
    handleSave,
    requestDelete,
    cancelDelete,
    confirmDelete,
  } = useMenuSettings();

  return (
    <PageShell title="Menu Settings">
      <ListHeader
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search menu settings..."
        autoFocusSearch
        canAdd={true}
        onAdd={openCreateModal}
      />

      {listError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {listError}
        </div>
      )}

      {/* Day overview: when each session runs */}
      {sessionHours.some((s) => s.startTime) && (
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-700">Day overview</h3>
            <span className="text-[11px] text-slate-400">Sessions show on the POS during their hours. Grey = inactive.</span>
          </div>
          <div className="space-y-1.5">
            {sessionHours.filter((s) => s.startTime).map((s) => (
              <SessionTimelineRow key={s.menuId} session={{ key: s.menuId, name: s.name, start: s.startTime, end: s.endTime, inactive: !s.isActive, highlight: s.isActive }} />
            ))}
            <SessionTimelineAxis />
          </div>
        </div>
      )}

      <RecordTableCard
        title="Menu Settings List"
        rowKey="menuId"
        data={filteredList}
        loading={listLoading}
        columns={[
          { header: "S.No", accessor: "sNo" },
          { header: "Code", accessor: "code" },
          { header: "Name", accessor: "name" },
          {
            header: "Hours",
            accessor: "menuId",
            render: (row: MenuSettingsListItem) => {
              const h = sessionHours.find((s) => s.menuId === row.menuId);
              if (!h?.startTime) return <span className="text-slate-300">…</span>;
              return (
                <span className="whitespace-nowrap">
                  {formatSessionHours(h.startTime, h.endTime)}
                  {crossesMidnight(h.startTime, h.endTime) && (
                    <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">past midnight</span>
                  )}
                </span>
              );
            },
          },
          {
            header: "Status",
            accessor: "isActive",
            render: (row: MenuSettingsListItem) => (
              <StatusBadge
                status={row.isActive === "Active" ? "active" : "inactive"}
                label={row.isActive}
              />
            ),
          },
          {
            header: "Actions",
            accessor: "menuId",
            render: (row: MenuSettingsListItem) => (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(row.menuId)}
                  className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                  aria-label={`Edit ${row.name}`}
                >
                  <Pencil size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => requestDelete({ id: row.menuId, name: row.name })}
                  disabled={deleting && deleteCandidate?.id === row.menuId}
                  className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                  aria-label={`Delete ${row.name}`}
                >
                  {deleting && deleteCandidate?.id === row.menuId ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                </button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={isEditMode ? "Edit Menu Setting" : "Add Menu Setting"}
        size="xl"
      >
        <MenuSettingsForm
          initialData={editDetail || null}
          detailLoading={detailLoading}
          saving={saving}
          onSubmit={handleSave}
          otherSessions={sessionHours.filter((s) => s.startTime).map((s) => ({ key: s.menuId, name: s.name, start: s.startTime, end: s.endTime, inactive: !s.isActive }))}
          onDelete={isEditMode ? () => requestDelete({ id: editDetail!.menuId, name: editDetail!.name }) : undefined}
        />
      </Modal>

      {deleteCandidate && (
        <ConfirmDialog
          isOpen
          title="Delete Menu Setting"
          message={`Are you sure you want to delete "${deleteCandidate.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </PageShell>
  );
};

export default MenuSettingsPage;
