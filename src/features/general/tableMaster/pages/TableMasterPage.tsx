import { useState, useEffect, useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { 
  ConfirmDialog, 
  PageShell,
  Modal
} from "../../../../components/common";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { tableMasterFormSchema, type TableMasterForm as TableMasterFormType, type TableRecord } from "../schemas";
import {
  useTableMaster,
  useCreateTableMaster,
  useUpdateTableMaster,
  useDeleteTableMaster,
  useReorderTables
} from "../hooks/useTableMasterQueries";
import TableSectionSelector from "../components/TableSectionSelector";
import TableCardGrid from "../components/TableCardGrid";
import TableMasterForm from "../components/TableMasterForm";
import { useQuery } from "@tanstack/react-query";
import { sectionService } from "../../section/services/sectionService";
import { usePermissions } from "../../../../hooks/usePermissions";
import { useToast } from "../../../../app/providers/useToast";
import SectionModal from "../../section/components/SectionModal";
import { useSectionManager } from "../../section/hooks/useSectionManager";

const TableMasterPage = () => {
  const { hasPermission } = usePermissions();
  const { showToast } = useToast();
  const sectionManager = useSectionManager();

  const { data: tableSections = [], isLoading: isSectionsLoading, refetch: refetchSections } = useQuery({
    queryKey: ["tableSections"],
    queryFn: () => sectionService.list(),
  });

  const canAdd = hasPermission("Table Master", "Add");
  const canEdit = hasPermission("Table Master", "Edit");
  const canDelete = hasPermission("Table Master", "Delete");

  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [deleteRecord, setDeleteRecord] = useState<TableRecord | null>(null);

  useEffect(() => {
    if (!sectionManager.open) {
      refetchSections();
    }
  }, [sectionManager.open, refetchSections]);

  // Set default section
  useEffect(() => {
    if (tableSections.length > 0 && selectedSectionId === null) {
      setSelectedSectionId(tableSections[0].sectionId);
    }
  }, [tableSections, selectedSectionId]);

  const { data: tables = [], isLoading: isTablesLoading, error: fetchError } = useTableMaster(selectedSectionId || undefined);

  const createMutation = useCreateTableMaster();
  const updateMutation = useUpdateTableMaster();
  const deleteMutation = useDeleteTableMaster();
  const reorderMutation = useReorderTables();
  
  const form = useForm<TableMasterFormType>({
    resolver: zodResolver(tableMasterFormSchema) as any,
    defaultValues: {
      sectionId: selectedSectionId || 1,
      tableName: "",
      chairs: 1,
      isActive: true,
      position: 1,
    }
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const sortedTables = useMemo(() => {
    return [...tables].sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [tables]);

  const handleOpenAdd = (position?: number) => {
    if (!canAdd) return;
    if (tableSections.length === 0 || !selectedSectionId) {
      showToast("Please create or select a Section before creating a Table.", "warning");
      return;
    }
    setMode("create");
    setSelectedId(null);
    form.reset({
      sectionId: selectedSectionId || 1,
      tableName: "",
      chairs: 1,
      isActive: true,
      position: position || (tables.length > 0 ? Math.max(...tables.map(t => t.position || 0)) + 1 : 1),
    });
    setOpen(true);
  };

  const handleEdit = (record: TableRecord) => {
    if (!canEdit) return;
    setMode("edit");
    setSelectedId(record.tableId);
    form.reset({
      sectionId: selectedSectionId || 1,
      tableName: record.tableName,
      chairs: record.chairs || 1,
      isActive: record.isActive,
      position: record.position || 0,
    });
    setOpen(true);
  };

  const handleSave = form.handleSubmit((data) => {
    if (mode === "create") {
      createMutation.mutate(data, {
        onSuccess: () => {
          setOpen(false);
          setSelectedId(null);
        }
      });
    } else if (selectedId) {
      updateMutation.mutate({ id: selectedId, data }, {
        onSuccess: () => {
          setOpen(false);
          setSelectedId(null);
        }
      });
    }
  });

  const handleClear = () => {
    // Only clear the form values, do not close the modal
    form.reset({
      sectionId: selectedSectionId || 1,
      tableName: "",
      chairs: 1,
      isActive: true,
      position: form.getValues("position") || 1
    });
  };

  const handleConfirmDelete = () => {
    if (deleteRecord && canDelete && selectedSectionId) {
      deleteMutation.mutate({ id: deleteRecord.tableId, sectionId: selectedSectionId }, {
        onSuccess: () => {
          setDeleteRecord(null);
          setOpen(false);
        }
      });
    }
  };

  const handleReorder = (newTables: TableRecord[]) => {
    if (!canEdit || !selectedSectionId) return;
    
    // Find only tables whose positions have actually changed
    const changedTables = newTables.filter((table, index) => {
      return table.position !== index + 1;
    }).map((table, index) => ({ ...table, position: index + 1 }));

    if (changedTables.length > 0) {
      reorderMutation.mutate({ sectionId: selectedSectionId, changedTables });
    }
  };

  const handleCloseModal = () => {
    setOpen(false);
    setSelectedId(null);
  };

  return (
    <PageShell title="Table Master">
      <div className="flex flex-col gap-6 w-full max-w-7xl mx-auto pb-10">
        
        {fetchError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 animate-in fade-in">
            <AlertCircle size={20} />
            <p className="font-bold text-sm">Failed to load tables. Please try again.</p>
          </div>
        )}

        <div className="flex flex-col gap-6">
          <TableSectionSelector 
            sections={tableSections}
            selectedSectionId={selectedSectionId}
            loading={isTablesLoading || isSectionsLoading}
            onSectionChange={(val) => setSelectedSectionId(Number(val))}
            onAdd={canAdd ? () => handleOpenAdd() : undefined}
            onAddSection={hasPermission("Section Master", "Add") ? sectionManager.openCreateModal : undefined}
          />

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1">
            <TableCardGrid 
              tables={sortedTables}
              selectedId={selectedId}
              loading={isTablesLoading}
              onEdit={canEdit ? handleEdit : undefined}
              onDeleteRequest={canDelete ? setDeleteRecord : undefined}
              onReorder={canEdit ? handleReorder : undefined}
              onEmptySlotClick={canAdd ? (pos) => handleOpenAdd(pos) : undefined}
            />
          </div>
        </div>

        <Modal isOpen={open} onClose={handleCloseModal} noPadding size="lg">
          <TableMasterForm 
            form={form}
            mode={mode}
            loading={isSaving}
            onClear={handleClear}
            onSave={handleSave}
            onDeleteRequest={(mode === "edit" && canDelete) ? () => {
              const record = tables.find(t => t.tableId === selectedId);
              if (record) setDeleteRecord(record);
            } : undefined}
          />
        </Modal>

        <ConfirmDialog
          isOpen={!!deleteRecord}
          onCancel={() => setDeleteRecord(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Table"
          message={`Are you sure you want to delete table "${deleteRecord?.tableName}"? This action cannot be undone.`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
        />

        <SectionModal
          isOpen={sectionManager.open}
          editingId={sectionManager.editingId}
          form={sectionManager.form}
          counters={sectionManager.counters}
          loading={sectionManager.loading}
          saving={sectionManager.saving}
          onChange={sectionManager.setField}
          onClose={sectionManager.closeModal}
          onClear={sectionManager.resetForm}
          onSave={async () => {
            const newId = await sectionManager.handleSave();
            if (newId) {
              setSelectedSectionId(newId);
            }
          }}
        />
      </div>
    </PageShell>
  );
};

export default TableMasterPage;
