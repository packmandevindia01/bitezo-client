import { useState, useEffect, useCallback } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { happyHourService } from "../services/happyHourService";
import type { HappyHourListItem, HappyHourData, HappyHourPayload } from "../types";

export const useHappyHourList = () => {
  const { showToast } = useToast();
  const [list, setList] = useState<HappyHourListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<HappyHourData | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<HappyHourListItem | null>(null);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().split("T")[0];
  });

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const data = await happyHourService.getHappyHours(
        `${fromDate}T00:00:00.000Z`,
        `${toDate}T23:59:59.000Z`
      );
      setList(data);
    } catch {
      showToast("Failed to load list", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const filteredList = list.filter((item) =>
    item.promotionName.toLowerCase().includes(search.toLowerCase())
  );

  const openCreateModal = () => {
    setEditData(null);
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditData(null);
  };

  const handleEdit = async (id: number) => {
    try {
      setDetailLoading(true);
      setOpen(true);
      const data = await happyHourService.getHappyHourById(id);
      setEditData(data);
    } catch {
      showToast("Failed to load details", "error");
      setOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async (payload: HappyHourPayload) => {
    try {
      setSaving(true);
      if (editData?.master.promotionId) {
        await happyHourService.updateHappyHour(editData.master.promotionId, payload);
      } else {
        await happyHourService.saveHappyHour(payload);
      }
      showToast("Promotion saved successfully", "success");
      closeModal();
      void loadList();
    } catch {
      showToast("Failed to save promotion", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setDeleting(true);
      await happyHourService.deleteHappyHour(deleteCandidate.promotionId);
      showToast("Promotion deleted", "success");
      setDeleteCandidate(null);
      void loadList();
    } catch {
      showToast("Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  };

  return {
    filteredList, loading, detailLoading, saving, deleting,
    open, editData, deleteCandidate, search,
    fromDate, setFromDate, toDate, setToDate,
    setSearch, setDeleteCandidate,
    openCreateModal, closeModal,
    handleEdit, handleSave, handleDelete,
  };
};
