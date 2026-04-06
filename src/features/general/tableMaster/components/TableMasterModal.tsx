import {
  Modal,
  MasterActionButton,
  MasterFieldRow,
  MasterInput,
  MasterSelect,
} from "../../../../components/common";
import { sectionOptions, statusOptions } from "../constants";
import type { TableForm, TableRecord } from "../types";

interface Props {
  isOpen: boolean;
  mode: "create" | "edit";
  selectedId: number | null;
  selectedSection: string;
  visibleTables: TableRecord[];
  form: TableForm;
  onChange: (key: keyof TableForm, value: string) => void;
  onSectionChange: (value: string) => void;
  onPickTable: (record: TableRecord) => void;
  onCreateNew: () => void;
  onClose: () => void;
  onClear: () => void;
  onSave: () => void;
}

const TableMasterModal = ({
  isOpen,
  mode,
  selectedId,
  selectedSection,
  visibleTables,
  form,
  onChange,
  onSectionChange,
  onPickTable,
  onCreateNew,
  onClose,
  onClear,
  onSave,
}: Props) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mode === "edit" ? "Edit Table Master" : "Add Table Master"}
      size="xl"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        <MasterFieldRow label="Section">
          <MasterSelect
            value={selectedSection}
            placeholder="Choose"
            options={sectionOptions}
            onChange={onSectionChange}
          />
        </MasterFieldRow>

        <div className="space-y-3 rounded-[1.75rem] border border-[#eadbe3] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d4259]">
              Existing Tables
            </p>

            <button
              type="button"
              onClick={onCreateNew}
              className={`rounded-2xl border px-5 py-2 text-sm font-semibold transition ${
                mode === "create"
                  ? "border-[#6d4259] bg-[#49293e] text-white"
                  : "border-dashed border-[#d7c1ce] bg-white text-[#6d4259] hover:bg-[#fbf7f9]"
              }`}
            >
              + New Table
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {visibleTables.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#eadbe3] bg-[#fcf9fb] px-5 py-4 text-sm font-medium text-[#7b5a6c]">
                No tables found for this section. You can create a new one.
              </div>
            ) : (
              visibleTables.map((table) => {
                const isActive = mode === "edit" && table.id === selectedId;
                return (
                  <button
                    key={table.id}
                    type="button"
                    onClick={() => onPickTable(table)}
                    className={`min-w-[110px] rounded-2xl border px-6 py-4 text-base font-semibold transition ${
                      isActive
                        ? "border-[#6d4259] bg-gradient-to-b from-[#7d5168] to-[#49293e] text-white shadow-sm"
                        : "border-[#d7c1ce] bg-[#fbf7f9] text-[#5d3b4f] hover:border-[#6d4259] hover:bg-[#f5edf2]"
                    }`}
                  >
                    {table.tableNo}
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-4 rounded-[1.75rem] border border-[#eadbe3] bg-[#fcf9fb] p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#6d4259]">
            {mode === "edit" ? "Edit Selected Table" : "Create New Table"}
          </p>

          <MasterFieldRow label="Table No">
            <MasterInput
              value={form.tableNo}
              placeholder="Enter table number"
              onChange={(value) => onChange("tableNo", value)}
            />
          </MasterFieldRow>

          <MasterFieldRow label="Chairs">
            <MasterInput
              value={form.chairs}
              type="number"
              placeholder="Enter number of chairs"
              onChange={(value) => onChange("chairs", value)}
            />
          </MasterFieldRow>

          <MasterFieldRow label="Status">
            <MasterSelect
              value={form.status}
              options={statusOptions}
              onChange={(value) => onChange("status", value as TableForm["status"])}
            />
          </MasterFieldRow>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <MasterActionButton variant="secondary" onClick={onClear}>
            Clear
          </MasterActionButton>
          <MasterActionButton onClick={onSave}>
            {mode === "edit" ? "Update" : "Save"}
          </MasterActionButton>
        </div>
      </div>
    </Modal>
  );
};

export default TableMasterModal;

