import React, { useState, useEffect } from "react";
import { Modal, Button, SelectInput } from "../../../../components/common";
import { useDineIn } from "../hooks/useDineIn";
import { useToast } from "../../../../app/providers/useToast";

interface TableAssignment {
  bucketId: string;
  sectionId: number;
  tableId: number;
}

interface PosSplitTableModalProps {
  isOpen: boolean;
  buckets: { id: string; isBase: boolean; items: any[] }[]; // only those with items
  originalOrder: any;
  onCancel: () => void;
  onConfirm: (assignments: TableAssignment[]) => void;
}

export const PosSplitTableModal: React.FC<PosSplitTableModalProps> = ({
  isOpen,
  buckets,
  originalOrder,
  onCancel,
  onConfirm
}) => {
  const { sections, tables, selectedSectionId, setSelectedSectionId, loading } = useDineIn();
  const { showToast } = useToast();
  
  // We only need to ask for new splits. Base order keeps original table.
  const newSplits = buckets.filter(b => !b.isBase);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [assignments, setAssignments] = useState<TableAssignment[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number | ''>('');
  
  const [showTableSelect, setShowTableSelect] = useState<boolean>(false);

  useEffect(() => {
    // Initialize base order assignment
    const baseAssignment: TableAssignment = {
      bucketId: 'base',
      sectionId: originalOrder?.sectionId || 0,
      tableId: originalOrder?.tableId || 0
    };
    setAssignments([baseAssignment]);
    
    // Auto-select the original section as default for convenience
    if (originalOrder?.sectionId && !selectedSectionId) {
      setSelectedSectionId(originalOrder.sectionId);
    }
  }, [originalOrder, setSelectedSectionId]);

  useEffect(() => {
    if (isOpen) {
      if (!originalOrder?.tableId) {
        setShowTableSelect(true);
      } else {
        setShowTableSelect(false);
      }
    }
  }, [currentIndex, originalOrder?.tableId, isOpen]);

  const handleKeepTable = () => {
    const currentSplit = newSplits[currentIndex];
    const newAssignment: TableAssignment = {
      bucketId: currentSplit.id,
      sectionId: originalOrder?.sectionId || 0,
      tableId: originalOrder?.tableId || 0
    };
    
    const updatedAssignments = [...assignments, newAssignment];
    setAssignments(updatedAssignments);

    if (currentIndex < newSplits.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedTableId('');
      if (originalOrder?.tableId) setShowTableSelect(false);
    } else {
      onConfirm(updatedAssignments);
    }
  };

  const handleNext = () => {
    if (!selectedSectionId || selectedTableId === '') {
      showToast("Please select a Section and Table", "warning");
      return;
    }

    const currentSplit = newSplits[currentIndex];
    
    const newAssignment: TableAssignment = {
      bucketId: currentSplit.id,
      sectionId: Number(selectedSectionId),
      tableId: Number(selectedTableId)
    };

    const updatedAssignments = [...assignments, newAssignment];
    setAssignments(updatedAssignments);

    if (currentIndex < newSplits.length - 1) {
      // Move to next split
      setCurrentIndex(currentIndex + 1);
      setSelectedTableId(''); // Reset for next selection
      if (originalOrder?.tableId) setShowTableSelect(false);
    } else {
      // All done, confirm
      onConfirm(updatedAssignments);
    }
  };

  if (!isOpen || newSplits.length === 0) return null;

  const currentSplit = newSplits[currentIndex];
  const sectionOptions = sections.map(s => ({ value: s.sectionId.toString(), label: s.sectionName }));
  
  // Show all tables except the original table, indicate if they are busy
  const tableOptions = tables
    .filter(t => t.tableId !== originalOrder?.tableId)
    .map(t => ({ 
      value: t.tableId.toString(), 
      label: `${t.tableName} (Capacity: ${t.capacity})${t.status !== 'available' ? ' 🔴 (Busy)' : ''}` 
    }));

  // Find original table name for display
  const originalTable = tables.find(t => t.tableId === originalOrder?.tableId);
  const tableNameDisplay = originalTable ? originalTable.tableName : `Table ${originalOrder?.tableId}`;

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={`Select Table for Split ${currentIndex + 1} of ${newSplits.length}`} className="max-w-md">
      <div className="p-4 flex flex-col gap-4">
        <div className="bg-blue-50 text-blue-800 p-3 rounded text-sm mb-2 border border-blue-100">
          <strong>Assigning Table for:</strong> Split {currentIndex + 1} 
          <div className="text-xs mt-1 text-blue-600">
            (Contains {currentSplit.items.reduce((acc, i) => acc + i.currentQty, 0)} items)
          </div>
        </div>

        {!showTableSelect ? (
          <div className="flex flex-col items-center justify-center p-6 bg-slate-50 border rounded-lg mb-2 text-center">
            <h3 className="text-sm font-bold text-slate-800 mb-2">Keep on Current Table?</h3>
            <p className="text-slate-600 text-xs mb-6">
              The original order is on <strong>{tableNameDisplay}</strong>. Do you want this split to stay on the same table?
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Button type="button" variant="primary" onClick={handleKeepTable} className="w-full">
                Yes, Keep Current Table
              </Button>
              <Button type="button" variant="secondary" onClick={() => setShowTableSelect(true)} className="w-full">
                No, Choose Another Table
              </Button>
            </div>
          </div>
        ) : (
          <>
            <SelectInput
              label="Dine In Section"
              autoFocus
              value={selectedSectionId ? selectedSectionId.toString() : ''}
              onChange={(e) => {
                setSelectedSectionId(Number(e.target.value));
                setSelectedTableId(''); // Reset table when section changes
              }}
              options={[{ value: '', label: 'Select Section...' }, ...sectionOptions]}
            />

            <SelectInput
              label="Available Table"
              value={selectedTableId ? selectedTableId.toString() : ''}
              onChange={(e) => setSelectedTableId(e.target.value ? Number(e.target.value) : '')}
              options={[{ value: '', label: 'Select Table...' }, ...tableOptions]}
              disabled={!selectedSectionId || loading}
            />

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <Button type="button" variant="secondary" onClick={onCancel}>
                Cancel Split
              </Button>
              <Button type="button" variant="primary" onClick={handleNext} disabled={loading || !selectedTableId}>
                {currentIndex < newSplits.length - 1 ? 'Next Split' : 'Complete Split'}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
