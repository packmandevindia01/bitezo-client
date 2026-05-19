import React from "react";
import { Plus, Trash2, Save, RotateCcw } from "lucide-react";
import { Button, FormInput, Modal, Loader } from "../../../../components/common";
import { useDenominationManager } from "../hooks/useDenominationManager";

interface DenominationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DenominationModal = ({ isOpen, onClose }: DenominationModalProps) => {
  const {
    denominations,
    loading,
    initialLoading,
    addRow,
    removeRow,
    updateRow,
    handleSave,
  } = useDenominationManager();

  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  // Auto-focus the first empty input when a row is added
  React.useEffect(() => {
    if (denominations.length > 0) {
      const lastIndex = denominations.length - 1;
      const lastRow = denominations[lastIndex];
      // Focus name if empty, else value
      if (!lastRow.name) {
        inputRefs.current[lastIndex * 2]?.focus();
      }
    }
  }, [denominations.length]);

  // Auto-add one empty row when the modal opens with no data
  React.useEffect(() => {
    if (!initialLoading && denominations.length === 0) {
      addRow();
    }
  }, [initialLoading, denominations.length, addRow]);

  const onSave = async () => {
    const success = await handleSave();
    if (success) onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number, field: "name" | "value") => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (field === "name") {
        // Move to value of same row
        inputRefs.current[index * 2 + 1]?.focus();
      } else {
        // Move to name of next row or add new row
        if (index < denominations.length - 1) {
          inputRefs.current[(index + 1) * 2]?.focus();
        } else {
          addRow();
        }
      }
    }
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Denomination Master"
      size="md"
    >
      <div className="flex flex-col" style={{ maxHeight: "calc(80vh - 80px)" }}>
        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-1 py-2">
          {initialLoading ? (
            <div className="flex h-40 items-center justify-center">
              <Loader />
            </div>
          ) : (
            <div className="space-y-3">
              {/* Column headers */}
              <div className="grid grid-cols-[1fr_1fr_auto] gap-2 px-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Name</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Value</p>
                <span className="w-8" />
              </div>

              {/* Rows */}
              {denominations.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 rounded-2xl border border-gray-100 bg-gray-50/60 px-3 py-2"
                >
                  <FormInput
                    ref={(el) => { inputRefs.current[index * 2] = el; }}
                    placeholder="e.g. 500 Fils"
                    value={item.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateRow(index, "name", e.target.value)
                    }
                    onKeyDown={(e) => handleKeyDown(e, index, "name")}
                    className="bg-white"
                  />
                  <FormInput
                    ref={(el) => { inputRefs.current[index * 2 + 1] = el; }}
                    type="number"
                    step="any"
                    placeholder="0"
                    value={item.value || ""}
                    onFocus={(e) => e.target.select()}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      updateRow(index, "value", e.target.value === "" ? 0 : parseFloat(e.target.value))
                    }
                    onKeyDown={(e) => handleKeyDown(e, index, "value")}
                    className="bg-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={denominations.length === 1}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:pointer-events-none disabled:opacity-30"
                    title="Remove row"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}

              {/* Add row */}
              <button
                type="button"
                onClick={addRow}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 transition hover:border-[#49293e] hover:text-[#49293e]"
              >
                <Plus size={15} />
                Add Denomination
              </button>
            </div>
          )}
        </div>

        {/* ── Sticky footer ── */}
        <div className="mt-4 flex justify-end gap-3 border-t border-gray-100 pt-4">
          <Button 
            variant="secondary" 
            onClick={onClose} 
            disabled={loading} 
            tabIndex={-1}
            isAction
            icon={<RotateCcw size={18} />}
          >
            Clear
          </Button>
          <Button 
            onClick={onSave} 
            loading={loading} 
            disabled={loading}
            isAction
            icon={<Save size={18} />}
          >
            Save
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DenominationModal;
