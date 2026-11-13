import { Modal, StatusBadge } from "../../../../components/common";
import MasterListPage from "../../../../components/common/MasterListPage";
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
    <MasterListPage<MenuSettingsListItem>
      title="Menu Settings"
      tableTitle="Menu Settings List"
      searchPlaceholder="Search menu settings..."
      rowKey="menuId"
      getName={(row) => row.name}
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
      ]}
      records={filteredList}
      loading={listLoading}
      search={search}
      onSearchChange={setSearch}
      onAdd={openCreateModal}
      onEdit={(row) => openEditModal(row.menuId)}
      editingId={editDetail?.menuId ?? null}
      closeForm={closeModal}
      notices={
        <>
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
        </>
      }
      deletingKey={deleting ? deleteCandidate?.id : undefined}
      deleteFlow={{
        candidate: deleteCandidate ? ({ menuId: deleteCandidate.id, name: deleteCandidate.name } as MenuSettingsListItem) : null,
        request: (row) => requestDelete({ id: row.menuId, name: row.name }),
        confirm: confirmDelete,
        cancel: cancelDelete,
      }}
      deleteDialog={{
        title: "Delete Menu Setting",
        message: (row) => `Are you sure you want to delete "${row.name}"? This action cannot be undone.`,
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
      }}
      renderForm={() => (
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
      )}
    />
  );
};

export default MenuSettingsPage;
