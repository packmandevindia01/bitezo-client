import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { Button, Checkbox, DragHandle, Loader } from "../../../../components/common";
import { useToast } from "../../../../app/providers/useToast";
import { useBranchLines } from "../hooks/useBranchLines";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import type { BranchPayload, FontModalState } from "../types";
import { getLineStyle } from "../utils/lineHelpers";
import BranchBasicInfo from "./BranchBasicInfo";
import FontModal from "./FontModal";
import PrintSection from "./PrintSection";
import ReceiptPreview from "./ReceiptPreview";

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong";
};

interface Props {
  initialData?: BranchPayload | null;
  onSubmit?: (payload: BranchPayload) => void | Promise<void>;
  onCancel?: () => void;
  showTitle?: boolean;
  onDelete?: () => void;
}

const BranchForm = ({
  initialData = null,
  onSubmit,
  onCancel,
  showTitle = true,
  onDelete,
}: Props) => {
  const { showToast } = useToast();
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);

  const [branchName, setBranchName] = useState(initialData?.branchName ?? "");
  const [branchNameError, setBranchNameError] = useState("");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);

  const { allLines, headerLines, footerLines, updateLine, moveLine, reorderLines, resetLines } =
    useBranchLines(initialData?.lines);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const { activeItem, handleDragStart, handleDragOver, handleDragEnd } =
    useDragAndDrop({ allLines, moveLine, reorderLines });

  const [fontModal, setFontModal] = useState<FontModalState>({
    open: false,
    lineId: "",
    temp: { fontFamily: "Inter", fontStyle: "Regular", fontSize: "12" },
  });

  const openFontModal = (id: string) => {
    const line = allLines.find((item) => item.id === id);
    if (!line) return;

    setFontModal({
      open: true,
      lineId: id,
      temp: {
        fontFamily: line.fontFamily,
        fontStyle: line.fontStyle,
        fontSize: line.fontSize,
      },
    });
  };

  const applyFont = () => {
    updateLine(fontModal.lineId, fontModal.temp);
    setFontModal((prev) => ({ ...prev, open: false }));
  };

  const handleSubmit = async () => {
    if (!branchName.trim()) {
      setBranchNameError("Branch name is required");
      showToast("Please fill all required fields", "error");
      return;
    }

    setSubmitting(true);

    try {
      const payload: BranchPayload = {
        branchName: branchName.trim(),
        lines: allLines.map((line) => ({ ...line })),
        isActive,
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        showToast("Branch created successfully", "success");
      }

      setBranchName("");
      setBranchNameError("");
      setIsActive(true);
      resetLines();
    } catch (error) {
      showToast(getErrorMessage(error), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setBranchName(initialData?.branchName ?? "");
    setBranchNameError("");
    setIsActive(initialData?.isActive ?? true);
    resetLines(initialData?.lines);
  };

  const sampleText = fontModal.lineId
    ? allLines.find((item) => item.id === fontModal.lineId)?.value || "AaBbYyZz"
    : "AaBbYyZz";

  return (
    <>
      {submitting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Loader />
        </div>
      )}

      <FontModal
        state={fontModal}
        sampleText={sampleText}
        onChange={(patch) =>
          setFontModal((prev) => ({ ...prev, temp: { ...prev.temp, ...patch } }))
        }
        onApply={applyFont}
        onClose={() => setFontModal((prev) => ({ ...prev, open: false }))}
      />

      {showTitle && <h2 className="mb-6 text-center text-lg font-bold">BRANCH CREATION</h2>}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => handleDragStart(String(active.id))}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_270px]">
          <div>
            <BranchBasicInfo
              value={branchName}
              error={branchNameError}
              disabled={submitting}
              onChange={(value) => {
                setBranchName(value);
                setBranchNameError("");
              }}
            />

            <p className="mb-1 text-sm font-bold text-gray-700 underline">Print Details</p>
            <p className="mb-4 text-xs text-gray-400">
              Drag rows to reorder and move them between header and footer.
            </p>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PrintSection
                section="header"
                lines={headerLines}
                onUpdate={updateLine}
                onOpenFont={openFontModal}
                disabled={submitting}
              />

              <PrintSection
                section="footer"
                lines={footerLines}
                onUpdate={updateLine}
                onOpenFont={openFontModal}
                disabled={submitting}
                lastRowKeyDown={(e) => {
                  if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
                    e.preventDefault();
                    saveBtnRef.current?.focus();
                  }
                }}
              />
            </div>

            {/* Action row: Active checkbox + buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-end gap-4">
              <Checkbox
                label="Active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={submitting}
              />

              {onCancel && (
                <Button variant="secondary" onClick={onCancel} disabled={submitting}>
                  Cancel
                </Button>
              )}

              {initialData && (
                <Button 
                  variant="secondary" 
                  onClick={onDelete} 
                  disabled={submitting}
                  className="!border-red-200 !bg-red-50 !text-red-600 hover:!bg-red-100 mr-auto"
                >
                  Delete Branch
                </Button>
              )}

              <Button variant="secondary" onClick={handleClear} disabled={submitting}>
                Clear
              </Button>

              <Button ref={saveBtnRef} onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent border-white" />
                    Saving...
                  </span>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>

          <div className="hidden xl:block">
            <ReceiptPreview
              branchName={branchName}
              allLines={allLines}
              onOffsetChange={(id, offset) => updateLine(id, { offsetX: offset })}
            />
          </div>
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#49293e]/20 bg-white px-3 py-2 shadow-xl">
              <DragHandle size={14} />
              <span className="text-sm" style={getLineStyle(activeItem)}>
                {activeItem.value || `${activeItem.section} line`}
              </span>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </>
  );
};

export default BranchForm;