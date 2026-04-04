import { useMemo, useState } from "react";
import { initialGroups } from "../constants";
import type { GroupForm, GroupRecord } from "../types";

export const useGroupManager = () => {
  const [groups, setGroups] = useState(initialGroups);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const resetForm = () => {
    setEditingId(null);
  };

  const closeModal = () => {
    setOpen(false);
    resetForm();
  };

  const openCreateModal = () => {
    resetForm();
    setOpen(true);
  };

  const handleSave = (form: GroupForm) => {
    if (editingId) {
      setGroups((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...form } : item))
      );
    } else {
      setGroups((prev) => [...prev, { id: Date.now(), ...form }]);
    }

    closeModal();
  };

  const handleEdit = (record: GroupRecord) => {
    setEditingId(record.id);
    setOpen(true);
  };

  const handleDelete = (record: GroupRecord) => {
    setGroups((prev) => prev.filter((item) => item.id !== record.id));

    if (editingId === record.id) {
      closeModal();
    }
  };

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups.filter((item) =>
      [item.code, item.name].some((value) => value.toLowerCase().includes(query))
    );
  }, [groups, search]);

  return {
    groups,
    search,
    setSearch,
    open,
    editingId,
    editGroup: groups.find((item) => item.id === editingId) ?? null,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
    filteredGroups,
  };
};
