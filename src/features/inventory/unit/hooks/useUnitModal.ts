import { useCallback, useState } from "react";
import { unitService } from "../services/unitService";
import { useToast } from "../../../../app/providers/useToast";
import type { UnitDetail, UnitListItem } from "../types";

export type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; unitId: number; detail: UnitDetail | null };

export const useUnitModal = () => {
  const { showToast } = useToast();
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [detailLoading, setDetailLoading] = useState(false);

  const closeModal = useCallback(() => {
    setModal({ mode: "closed" });
  }, []);

  const openCreateModal = useCallback(() => {
    setModal({ mode: "create" });
  }, []);

  const openEditModal = useCallback(async (record: UnitListItem) => {
    if (record.unitId <= 4) {
      showToast("Core system units cannot be edited.", "warning");
      return;
    }
    setModal({ mode: "edit", unitId: record.unitId, detail: null });
    setDetailLoading(true);
    try {
      const detail = await unitService.getById(record.unitId);
      setModal({ mode: "edit", unitId: record.unitId, detail });
    } catch (err) {
      setModal({
        mode: "edit",
        unitId: record.unitId,
        detail: {
          unitId: record.unitId,
          name: record.name,
          category: record.category,
          conversion: 1,
          currentValue: record.currentValue,
          parentId: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    } finally {
      setDetailLoading(false);
    }
  }, [showToast]);

  return {
    modal,
    setModal,
    detailLoading,
    closeModal,
    openCreateModal,
    openEditModal,
  };
};
