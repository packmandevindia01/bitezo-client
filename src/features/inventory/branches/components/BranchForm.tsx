import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { Button, Checkbox, DragHandle, Loader } from "../../../../components/common";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Trash2, Save, RotateCcw } from "lucide-react";
import { useToast } from "../../../../app/providers/useToast";
import { useBranchLines } from "../hooks/useBranchLines";
import { useDragAndDrop } from "../hooks/useDragAndDrop";
import { fetchRegisteredBranches } from "../services/branchApi";
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
  isCreateMode?: boolean;
}

const BranchForm = ({
  initialData = null,
  onSubmit,
  onDelete,
  onClear,
  isCreateMode = false,
}: Props) => {
  const { showToast } = useToast();
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);

  const [selectedRegisteredId, setSelectedRegisteredId] = useState<number | null>(
    initialData ? (!initialData.isActive ? 0 : (initialData.registeredBranchId ?? 0)) : null
  );
  const [branchName, setBranchName] = useState(initialData?.branchName ?? "");
  const [branchNameError, setBranchNameError] = useState("");
  const [registeredBranchError, setRegisteredBranchError] = useState("");
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setBranchName(initialData.branchName ?? "");
      setIsActive(initialData.isActive ?? true);
      setSelectedRegisteredId(
        initialData.isActive === false ? 0 : (initialData.registeredBranchId ?? 0)
      );
      setBranchNameError("");
      setRegisteredBranchError("");
    }
  }, [initialData]);

  const effectiveBranchId = (initialData as any)?.id || (initialData as any)?.branchId || 0;
  const isMainBranch = (initialData as any)?.id === 2 || (initialData as any)?.branchId === 2 || String(initialData?.branchName || "").trim().toLowerCase() === "main";

  const { data: registeredBranches = [], isLoading: loadingRegistered } = useQuery({
    queryKey: ["registeredBranches", effectiveBranchId],
    queryFn: () => fetchRegisteredBranches(effectiveBranchId),
  });

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
    temp: { fontFamily: "Courier", fontStyle: "Regular", fontSize: "Medium" },
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      const el = document.getElementById(isCreateMode ? "registered-branch-select" : "branch-name");
      el?.focus();
      if (el instanceof HTMLInputElement) el.select?.();
    }, 50);
    return () => clearTimeout(timer);
  }, [isCreateMode]);

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
    if (isActive && (!selectedRegisteredId || Number(selectedRegisteredId) === 0)) {
      setRegisteredBranchError("Registered Branch is required when status is active");
      showToast("Please assign a Registered Branch when status is active", "error");
      setTimeout(() => {
        const el = document.getElementById("registered-branch-select");
        el?.focus();
      }, 50);
      return;
    }

    if (!branchName.trim()) {
      setBranchNameError("Branch Master is required");
      showToast("Branch Master is required", "error");
      setTimeout(() => {
        const el = document.getElementById("branch-name");
        el?.focus();
        if (el instanceof HTMLInputElement) el.select?.();
      }, 50);
      return;
    }

    setSubmitting(true);

    try {
      const finalRegisteredId = !isActive ? 0 : Number(selectedRegisteredId || 0);
      const payload: BranchPayload = {
        branchId: (initialData as any)?.id ?? (initialData as any)?.branchId,
        branchName: branchName.trim(),
        registeredBranchId: finalRegisteredId,
        lines: allLines.map((line) => ({ ...line })),
        isActive,
      };

      if (onSubmit) {
        await onSubmit(payload);
      } else {
        showToast("Branch created successfully", "success");
      }

      setSelectedRegisteredId(null);
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
    setSelectedRegisteredId(null);
    setBranchName("");
    setBranchNameError("");
    setRegisteredBranchError("");
    setIsActive(true);
    resetLines();
    if (onClear) onClear();
    setTimeout(() => {
      const el = document.getElementById(isCreateMode ? "registered-branch-select" : "branch-name");
      el?.focus();
    }, 50);
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
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_270px] xl:grid-cols-[1fr_300px]">
          <div className="flex flex-col">
            <div className="flex-1 pr-1">
              <BranchBasicInfo
                value={branchName}
                error={branchNameError}
                registeredError={registeredBranchError}
                disabled={submitting}
                isCreateMode={isCreateMode}
                isActive={isActive}
                registeredBranches={registeredBranches}
                selectedRegisteredId={selectedRegisteredId}
                loadingRegistered={loadingRegistered}
                onSelectRegisteredBranch={(rb) => {
                  setSelectedRegisteredId(rb.branchId);
                  setRegisteredBranchError("");
                  if (rb.name && (!branchName.trim() || isCreateMode)) {
                    setBranchName(rb.name);
                    setBranchNameError("");
                  }
                  setTimeout(() => {
                    const el = document.getElementById("branch-name");
                    el?.focus();
                    if (el instanceof HTMLInputElement) el.select?.();
                  }, 50);
                }}
                onChange={(value) => {
                  setBranchName(value);
                  setBranchNameError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!branchName.trim()) {
                      setBranchNameError("Branch Master is required");
                      showToast("Branch Master is required", "error");
                      setTimeout(() => {
                        const el = document.getElementById("branch-name");
                        el?.focus();
                        if (el instanceof HTMLInputElement) el.select?.();
                      }, 20);
                      return;
                    }
                    if (activeTab === "kot") {
                      if (headerLines.length > 0) {
                        const nextEl = document.getElementById(`input-line-${headerLines[0].id}`);
                        if (nextEl) {
                          nextEl.focus();
                          if (nextEl instanceof HTMLInputElement) nextEl.select?.();
                          return;
                        }
                      }
                      if (footerLines.length > 0) {
                        const nextEl = document.getElementById(`input-line-${footerLines[0].id}`);
                        if (nextEl) {
                          nextEl.focus();
                          if (nextEl instanceof HTMLInputElement) nextEl.select?.();
                          return;
                        }
                      }
                    } else {
                      if (dayEndLines.length > 0) {
                        const nextEl = document.getElementById(`input-line-${dayEndLines[0].id}`);
                        if (nextEl) {
                          nextEl.focus();
                          if (nextEl instanceof HTMLInputElement) nextEl.select?.();
                          return;
                        }
                      }
                    }
                    saveBtnRef.current?.focus();
                  }
                }}
              />

              <div className="flex gap-4 border-b border-slate-200 mb-6">
                <button
                  type="button"
                  tabIndex={-1}
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
                  tabIndex={-1}
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
                    lastRowKeyDown={(e) => {
                      if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
                        e.preventDefault();
                        if (footerLines.length > 0) {
                          const nextEl = document.getElementById(`input-line-${footerLines[0].id}`);
                          if (nextEl) {
                            nextEl.focus();
                            if (nextEl instanceof HTMLInputElement) nextEl.select?.();
                            return;
                          }
                        }
                        saveBtnRef.current?.focus();
                      }
                    }}
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
                id="branch-active"
                label="Active"
                checked={isActive}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsActive(checked);
                  if (!checked) {
                    setSelectedRegisteredId(0);
                    setRegisteredBranchError("");
                  }
                }}
                disabled={submitting}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    saveBtnRef.current?.focus();
                  }
                }}
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
                id="branch-save-btn"
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
                  disabled={submitting || isMainBranch}
                  title={isMainBranch ? "Main branch cannot be deleted" : "Delete Branch"}
                  isAction
                  icon={<Trash2 size={18} />}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>

          <div className="hidden lg:block overflow-y-auto pl-2 pr-1 scrollbar-hide">
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