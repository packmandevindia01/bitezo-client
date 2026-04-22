import { useState } from "react";
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { 
  ConfirmDialog, 
  PageShell, 
  MasterScreen, 
  MasterFieldRow, 
  Button, 
  FormInput 
} from "../../../../components/common";
import { useTableManager } from "../hooks/useTableManager";
import { statusOptions } from "../constants";
import type { TableRecord } from "../types";

const TableMasterPage = () => {
  const {
    form,
    sections,
    loading,
    error,
    open,
    search,
    mode,
    selectedId,
    selectedSectionId,
    visibleTables,
    setSearch,
    setField,
    resetForm,
    handleSave,
    handleEdit,
    handleDelete,
    handleSectionChange,
    setCreateMode,
  } = useTableManager();

  const [deleteRecord, setDeleteRecord] = useState<TableRecord | null>(null);

  const handleOpenAdd = () => {
    setCreateMode();
  };

  return (
    <PageShell title="Table Master">
      <MasterScreen
        title="Table Master"
        search={search}
        onSearchChange={setSearch}
        listEmptyLabel="No tables found"
        columns={[]} // Not used in this card view
        data={[]} // Not used in this card view
        rowKey="tableId"
        showListSection={false}
      >
        <div className="space-y-8">
          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-100">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Section Selection & Add Button */}
          <div className="flex flex-wrap items-center gap-6 md:gap-12">
            <label className="text-sm font-semibold uppercase tracking-wide text-[#5d3b4f]">
              Section
            </label>
            <select
              value={selectedSectionId ?? ""}
              onChange={(e) => handleSectionChange(e.target.value)}
              className="h-10 w-64 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20"
              disabled={loading}
            >
              {sections.map(section => (
                <option key={section.sectionId} value={section.sectionId}>
                  {section.name || section.sectionName}
                </option>
              ))}
            </select>
            
            <Button 
                onClick={handleOpenAdd}
                className="h-10 min-w-[140px] shadow-sm active:translate-y-0"
                disabled={loading || sections.length === 0}
            >
                {loading ? <Loader2 size={18} className="mr-2 animate-spin" /> : <Plus size={18} className="mr-2" />}
                Add Table
            </Button>
          </div>

          {/* Table Cards Grid */}
          {!open && (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {loading && visibleTables.length === 0 ? (
                <div className="col-span-full py-12 flex justify-center">
                  <Loader2 className="animate-spin text-[#49293e]" size={32} />
                </div>
              ) : visibleTables.length === 0 ? (
                <div className="col-span-full rounded-2xl border border-dashed border-gray-200 bg-white py-12 text-center text-gray-400">
                  No tables found for this section.
                </div>
              ) : (
                visibleTables.map((table) => (
                  <div
                    key={table.tableId}
                    className="group relative"
                  >
                    <button
                      type="button"
                      onClick={() => handleEdit(table)}
                      className={`h-32 w-full rounded-2xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 shadow-sm hover:translate-y-[-2px] hover:shadow-md ${
                        selectedId === table.tableId
                          ? "border-[#49293e] bg-[#49293e] text-white"
                          : "border-gray-100 bg-white text-[#49293e] hover:border-[#49293e]/30"
                      }`}
                      disabled={loading}
                    >
                      <span className="text-2xl font-bold">{table.tableName}</span>
                      <span className={`text-[10px] font-bold uppercase tracking-[0.1em] ${
                        selectedId === table.tableId ? "text-white/70" : "text-gray-400"
                      }`}>
                        {table.chairs} Chairs
                      </span>
                      <div className={`mt-2 h-1.5 w-1.5 rounded-full ${
                        table.isActive ? "bg-green-500" : "bg-red-400"
                      }`} />
                    </button>
                    
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteRecord(table);
                      }}
                      className="absolute -right-2 -top-2 flex h-8 w-8 scale-0 items-center justify-center rounded-full bg-red-100 text-red-600 shadow-sm transition-transform duration-200 group-hover:scale-100 hover:bg-red-200"
                      disabled={loading}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* After Click - Edit/Create Inline Form */}
          {open && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300 rounded-3xl border border-gray-100 bg-white p-6 shadow-md md:p-10">
              <div className="mb-10 flex items-center justify-between border-b border-gray-50 pb-4">
                <h2 className="text-xl font-bold uppercase tracking-wide text-[#49293e]">
                  {mode === "edit" ? "Table Details" : "New Table"}
                </h2>
                <button 
                  onClick={() => resetForm(String(selectedSectionId))}
                  className="text-sm font-semibold text-gray-400 hover:text-[#49293e] transition-colors"
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>

              <div className="mx-auto max-w-xl space-y-2">
                <MasterFieldRow label="Table Name">
                  <FormInput
                    value={form.tableName}
                    placeholder="e.g. T1"
                    onChange={(e) => setField("tableName", e.target.value)}
                    autoFocus
                    disabled={loading}
                  />
                </MasterFieldRow>

                <MasterFieldRow label="Chairs">
                  <FormInput
                    value={form.chairs}
                    type="number"
                    placeholder="Enter number of chairs"
                    onChange={(e) => setField("chairs", e.target.value)}
                    disabled={loading}
                  />
                </MasterFieldRow>

                <MasterFieldRow label="Status">
                  <div className="flex flex-col gap-1 mb-4 w-full">
                    <select
                      value={String(form.isActive)}
                      onChange={(e) => setField("isActive", e.target.value === "true")}
                      className="w-full px-3 md:px-4 py-2 text-sm md:text-base rounded-md border border-gray-300 bg-white outline-none transition focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20"
                      disabled={loading}
                    >
                      {statusOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </MasterFieldRow>

                <div className="flex flex-wrap items-center justify-center gap-4 pt-8">
                  {mode === "edit" && (
                    <Button
                      variant="danger"
                      onClick={() => {
                          const record = visibleTables.find(t => t.tableId === selectedId);
                          if (record) setDeleteRecord(record);
                      }}
                      disabled={loading}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Delete
                    </Button>
                  )}
                  <Button 
                    variant="secondary" 
                    onClick={() => resetForm(String(selectedSectionId))} 
                    className="min-w-[120px]"
                    disabled={loading}
                  >
                    Reset
                  </Button>
                  <Button onClick={handleSave} className="min-w-[150px]" disabled={loading}>
                    {loading ? <Loader2 size={18} className="mr-2 animate-spin" /> : null}
                    {mode === "edit" ? "Update" : "Save"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </MasterScreen>

      <ConfirmDialog
        isOpen={deleteRecord !== null}
        onCancel={() => setDeleteRecord(null)}
        onConfirm={() => {
          if (deleteRecord) {
            handleDelete(deleteRecord);
            setDeleteRecord(null);
          }
        }}
        message={`Are you sure you want to delete table "${deleteRecord?.tableName}"?`}
      />
    </PageShell>
  );
};

export default TableMasterPage;
