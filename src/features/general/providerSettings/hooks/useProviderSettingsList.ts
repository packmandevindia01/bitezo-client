import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import {
  fetchProviderSettingsList,
  fetchProviderSettingsData,
  saveProviderSettings,
  updateProviderSettings,
  deleteProviderSettings,
} from "../services/providerSettingsService";
import type {
  ProviderSettingsListItem,
  ProviderSettingsData,
  ProviderSettingsPayload,
} from "../types";

export const useProviderSettingsList = () => {
  const { showToast } = useToast();

  const [list, setList] = useState<ProviderSettingsListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState<ProviderSettingsData | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ProviderSettingsListItem | null>(null);
  const [search, setSearch] = useState("");

  const loadList = useCallback(async () => {
    try {
      setLoading(true);
      const records = await fetchProviderSettingsList();
      setList(records);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to load list", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { void loadList(); }, [loadList]);

  const closeModal = () => {
    setOpen(false);
    setEditData(null);
    setDetailLoading(false);
  };

  const openCreateModal = () => {
    setEditData(null);
    setOpen(true);
  };

  const handleEdit = async (transId: number) => {
    try {
      setOpen(true);
      setDetailLoading(true);
      const data = await fetchProviderSettingsData(transId);
      setEditData(data ?? null);
    } catch (error) {
      closeModal();
      showToast(error instanceof Error ? error.message : "Failed to load details", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async (payload: ProviderSettingsPayload) => {
    try {
      setSaving(true);
      if (editData) {
        const updatePayload: ProviderSettingsPayload = {
          ...payload,
          transId: editData.master.transId,
          updatedAt: payload.createdAt,
        };
        delete updatePayload.createdAt;
        await updateProviderSettings(editData.master.transId, updatePayload);
        showToast("Provider settings updated successfully", "success");
      } else {
        await saveProviderSettings(payload);
        showToast("Provider settings saved successfully", "success");
      }
      await loadList();
      closeModal();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to save settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setDeleting(true);
      await deleteProviderSettings(deleteCandidate.transId);
      await loadList();
      setDeleteCandidate(null);
      showToast("Settings deleted successfully", "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Failed to delete", "error");
    } finally {
      setDeleting(false);
    }
  };

  const filteredList = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return list;
    return list.filter((item) =>
      [item.provider, item.branch, String(item.transId)].some((v) =>
        v.toLowerCase().includes(query)
      )
    );
  }, [list, search]);

  return {
    filteredList,
    loading,
    detailLoading,
    saving,
    deleting,
    open,
    editData,
    deleteCandidate,
    search,
    setSearch,
    setDeleteCandidate,
    openCreateModal,
    closeModal,
    handleEdit,
    handleSave,
    handleDelete,
  };
};