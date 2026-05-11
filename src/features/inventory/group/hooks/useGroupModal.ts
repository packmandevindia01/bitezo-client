import { useCallback, useState } from "react";
import { groupService } from "../services/groupService";
import type { GroupDetail, GroupRecord } from "../types";

export type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; grpId: number; detail: GroupDetail | null };

export const useGroupModal = () => {
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [detailLoading, setDetailLoading] = useState(false);

  const closeModal = useCallback(() => {
    setModal({ mode: "closed" });
  }, []);

  const openCreateModal = useCallback(() => {
    setModal({ mode: "create" });
  }, []);

  const openEditModal = useCallback(async (record: GroupRecord) => {
    setModal({ mode: "edit", grpId: record.grpId, detail: null });
    setDetailLoading(true);
    try {
      const detail = await groupService.getById(record.grpId);
      setModal({ mode: "edit", grpId: record.grpId, detail });
    } catch {
      // Fallback
      setModal({
        mode: "edit",
        grpId: record.grpId,
        detail: {
          grpId: record.grpId,
          code: record.code,
          name: record.name,
          arabicName: "",
          isActive: record.isActive === "Active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          posStatus: false,
          startTime: "00:00",
          endTime: "00:00",
        },
      });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  return {
    modal,
    setModal,
    detailLoading,
    closeModal,
    openCreateModal,
    openEditModal,
  };
};
