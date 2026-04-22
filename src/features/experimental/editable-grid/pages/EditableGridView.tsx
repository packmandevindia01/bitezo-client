import { Plus } from "lucide-react";
import { PageShell } from "../../../../components/common";
import { useGridLogic } from "../hooks/useGridLogic";
import GridRowItem from "../components/GridRowItem";

const EditableGridView = () => {
  const {
    rows,
    cellRefs,
    setFocusPos,
    addRow,
    removeRow,
    handleRowChange,
    handleKeyDown,
  } = useGridLogic();

  return (
    <PageShell
      title="Excel-Style Pricing Grid"
      description="Keyboard-centric spreadsheet navigation. Use Arrow keys to move, Enter to add rows."
    >
      <div className="flex flex-col gap-4">
        {/* Table Container */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left table-fixed">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-[40%] px-6 py-4 text-xs font-black uppercase tracking-widest text-[#49293e]">Barcode</th>
                  <th className="w-[30%] px-6 py-4 text-xs font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Unit</th>
                  <th className="w-[30%] px-6 py-4 text-xs font-black uppercase tracking-widest text-[#49293e] border-l border-gray-200">Cost</th>
                  <th className="w-[60px] px-4 py-4 border-l border-gray-200"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => (
                  <GridRowItem
                    key={row.id}
                    row={row}
                    rIdx={rIdx}
                    cellRefs={cellRefs}
                    setFocusPos={setFocusPos}
                    handleKeyDown={handleKeyDown}
                    handleRowChange={handleRowChange}
                    removeRow={removeRow}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Add Row Footer Action */}
          <div className="bg-gray-50/80 px-6 py-4">
            <button
              onClick={addRow}
              tabIndex={-1}
              className="group flex items-center gap-2 text-sm font-bold text-[#49293e]/60 transition-all hover:text-[#49293e]"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#49293e]/10 group-hover:bg-[#49293e]/20 transition-all">
                <Plus size={14} />
              </div>
              Add New Pricing Row (or press Enter)
            </button>
          </div>
        </div>

        {/* Keyboard Help Footer */}
        <div className="flex justify-between items-center px-2">
          <div className="flex flex-col gap-1">
            <p className="text-xs text-slate-400 font-medium">
              <kbd className="rounded border bg-white px-1 shadow-sm text-slate-600 font-bold">↑ ↓ ← →</kbd> Navigate between cells
            </p>
            <p className="text-xs text-slate-400 font-medium">
              <kbd className="rounded border bg-white px-1 shadow-sm text-slate-600 font-bold">Enter</kbd> Save and move to next row
            </p>
          </div>
          <div className="text-[10px] text-[#49293e]/40 font-black uppercase tracking-[0.2em] text-right">
            Keyboard Mode: Active<br />
            {rows.length} rows recorded
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default EditableGridView;
