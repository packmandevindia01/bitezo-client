import React from "react";
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
    updateRow, 
    handleSave 
  } = useDenominationManager();

  // If initial load finishes and list is empty, add one row automatically
  React.useEffect(() => {
    if (!initialLoading && denominations.length === 0) {
      addRow();
    }
  }, [initialLoading, denominations.length, addRow]);

  const onUpdate = async () => {
    const success = await handleSave();
    if (success) {
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Denomination Master"
      size="md"
      footer={
        <div className="flex justify-center w-full mt-4">
          <Button 
            onClick={onUpdate} 
            loading={loading}
            className="px-10 h-11 rounded-xl bg-[#49293e] hover:bg-[#5c3450] shadow-lg shadow-[#49293e]/20"
          >
            {denominations.length > 0 && (denominations[0] as any).id ? "Update" : "Create"}
          </Button>
        </div>
      }
    >
      <div className="min-h-[220px] py-4 px-1">
        {initialLoading ? (
          <div className="h-40 flex flex-col items-center justify-center gap-4">
            <Loader />
          </div>
        ) : (
          <div className="space-y-6">
            {denominations.length === 0 ? (
                <div className="flex flex-col items-center gap-4 py-6">
                    <Loader />
                </div>
            ) : (
                <div className="space-y-6 p-6 border border-slate-100 rounded-3xl bg-slate-50/30">
                    <FormInput
                        label="Name"
                        placeholder="e.g. 500 Fils"
                        value={denominations[0].name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateRow(0, "name", e.target.value)}
                        className="bg-white"
                    />
                    <FormInput
                        label="Value"
                        type="number"
                        step="1"
                        placeholder="0"
                        value={denominations[0].value || ""}
                        onFocus={(e) => e.target.select()}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const val = e.target.value === "" ? 0 : parseFloat(e.target.value);
                            updateRow(0, "value", val);
                        }}
                        className="bg-white font-mono"
                    />
                </div>
            )}
            

          </div>
        )}
      </div>
    </Modal>
  );
};

export default DenominationModal;
