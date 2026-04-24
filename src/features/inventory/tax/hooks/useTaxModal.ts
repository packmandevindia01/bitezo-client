import { useCallback, useState } from "react";
import { taxService } from "../services/taxService";
import type { TaxDetail, TaxListItem } from "../types";

export type ModalState =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; vatId: number; detail: TaxDetail | null };

export const useTaxModal = () => {
  const [modal, setModal] = useState<ModalState>({ mode: "closed" });
  const [detailLoading, setDetailLoading] = useState(false);

  const closeModal = useCallback(() => {
    setModal({ mode: "closed" });
  }, []);

  const openCreateModal = useCallback(() => {
    setModal({ mode: "create" });
  }, []);

  const openEditModal = useCallback(async (record: TaxListItem) => {
    setModal({ mode: "edit", vatId: record.id, detail: null });
    setDetailLoading(true);
    try {
      const detail = await taxService.getById(record.id);
      setModal({ mode: "edit", vatId: record.id, detail });
    } catch {
      setModal({
        mode: "edit",
        vatId: record.id,
        detail: {
          id: record.id,
          name: record.name,
          value: record.value,
          expireAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
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
