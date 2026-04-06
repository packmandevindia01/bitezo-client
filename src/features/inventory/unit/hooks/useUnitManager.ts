import { useMemo, useState } from "react";
import { initialUnits } from "../constants";
import type { UnitForm, UnitRecord } from "../types";

export const useUnitManager = () => {
  const [units, setUnits] = useState(initialUnits);
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

  const handleSave = (form: UnitForm) => {
    if (editingId) {
      setUnits((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...form } : item))
      );
    } else {
      setUnits((prev) => [...prev, { id: Date.now(), ...form }]);
    }

    closeModal();
  };

  const handleEdit = (record: UnitRecord) => {
    setEditingId(record.id);
    setOpen(true);
  };

  const handleDelete = (record: UnitRecord) => {
    setUnits((prev) => prev.filter((item) => item.id !== record.id));

    if (editingId === record.id) {
      closeModal();
    }
  };

  const filteredUnits = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return units;

    return units.filter((item) =>
      [item.category, item.name, item.parentUnit, item.conversion].some((value) =>
        value.toLowerCase().includes(query)
      )
    );
  }, [search, units]);

  return {
    units,
    search,
    setSearch,
    open,
    editingId,
    editUnit: units.find((item) => item.id === editingId) ?? null,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
    filteredUnits,
  };
};
