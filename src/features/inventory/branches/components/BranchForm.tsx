import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { Button, Checkbox, DragHandle, Loader } from "../../../../components/common";
import { useRef, useState } from "react";
import { Trash2, Save, RotateCcw } from "lucide-react";
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
  onDelete?: () => void;
  onClear?: () => void;
}

const BranchForm = ({
  initialData = null,
  onSubmit,
  onDelete,
  onClear,
}: Props) => {
  const { showToast } = useToast();
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);

  const [branchName, setBranchName] = useState(initialData?.branchName ?? "");
  const [branchNameError, setBranchNameError] = useState("");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);

  const [activeTab, setActiveTab] = useState<"kot" | "end">("kot");

  const { allLines, headerLines, footerLines, dayEndLines, updateLine, moveLine, reorderLines, resetLines } =
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
      setBranchNameError("Branch Master is required");
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
    setBranchName("");
    setBranchNameError("");
    setIsActive(true);
    resetLines();
    if (onClear) onClear();
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => handleDragStart(String(active.id))}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-[1fr_270px]">
          <div className="flex flex-col">
            <div className="flex-1 pr-1">
              <BranchBasicInfo
                value={branchName}
                error={branchNameError}
                disabled={submitting}
                onChange={(value) => {
                  setBranchName(value);
                  setBranchNameError("");
                }}
              />

              <div className="flex gap-4 border-b border-slate-200 mb-6">
                <button
                  type="button"
                  onClick={() => setActiveTab("kot")}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "kot" 
                      ? "border-[#49293e] text-[#49293e]" 
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  KOT / Receipt Headers
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("end")}
                  className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === "end" 
                      ? "border-[#49293e] text-[#49293e]" 
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  End Report Headings
                </button>
              </div>

              {activeTab === "kot" ? (
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
              ) : (
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <PrintSection
                    section="dayEndHeader"
                    lines={dayEndLines}
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
              )}
            </div>

            {/* ── Sticky Action Footer ── */}
            <div className="sticky bottom-0 z-10 mt-8 py-4 border-t border-slate-200 bg-white flex flex-wrap items-center justify-end gap-3 -mx-4 px-4 xl:-mx-6 xl:px-6 -mb-4 xl:-mb-6">
              <Checkbox
                label="Active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                disabled={submitting}
              />

              <Button 
                variant="secondary" 
                onClick={handleClear} 
                disabled={submitting} 
                tabIndex={-1}
                isAction
                icon={<RotateCcw size={18} />}
              >
                Clear
              </Button>

              <Button 
                ref={saveBtnRef} 
                onClick={handleSubmit} 
                disabled={submitting}
                isAction
                loading={submitting}
                icon={<Save size={18} />}
              >
                Save
              </Button>

              {initialData && (
                <Button 
                  variant="danger" 
                  onClick={onDelete} 
                  disabled={submitting}
                  isAction
                  icon={<Trash2 size={18} />}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>

          <div className="hidden xl:block overflow-y-auto pr-1 scrollbar-hide">
            <ReceiptPreview
              branchName={branchName}
              allLines={allLines}
              activeTab={activeTab}
              onOffsetChange={(id, offset) => updateLine(id, { offsetX: offset })}
            />
          </div>
        </div>

        <DragOverlay>
          {activeItem ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#49293e]/20 bg-white px-3 py-2 shadow-xl">
              <DragHandle size={14} />
              <span className="text-[10px] text-slate-600 font-bold w-5 shrink-0 uppercase tracking-widest">
                {activeItem.section === "header" ? "H" : activeItem.section === "footer" ? "F" : "EH"}
              </span>
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