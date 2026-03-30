import { useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { Button, DragHandle, Loader } from "../../../components/common";
import { useToast } from "../../../context/ToastContext";
import { useBranchLines } from "../hooks/useBranchLines";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import type { FontModalState } from "../types";
import { getLineStyle } from "../utils/lineHelpers";
import BranchBasicInfo from "./BranchBasicInfo";
import FontModal from "./FontModal";
import PrintSection from "./PrintSection";
import ReceiptPreview from "./ReceiptPreview";

const BranchForm = () => {
  const { showToast } = useToast();
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);

  const [branchName, setBranchName] = useState("");
  const [branchNameError, setBranchNameError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { allLines, headerLines, footerLines, updateLine, moveLine, reorderLines, resetLines } =
    useBranchLines();

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
      // await createBranch({ branchName, lines: allLines });
      showToast("Branch created successfully", "success");
      setBranchName("");
      setBranchNameError("");
      resetLines();
    } catch (err: any) {
      showToast(err?.response?.data?.message || "Something went wrong", "error");
    } finally {
      setSubmitting(false);
    }
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

      <h2 className="mb-6 text-center text-lg font-bold">BRANCH CREATION</h2>

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

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => {
                  setBranchName("");
                  setBranchNameError("");
                  resetLines();
                }}
                disabled={submitting}
              >
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
