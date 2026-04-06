import { useMemo, useState } from "react";
import { emptyEmployeeForm, initialEmployees } from "../constants";
import type { EmployeeRecord } from "../types";

export const useEmployeeManager = () => {
  const [employees, setEmployees] = useState(initialEmployees);
  const [form, setForm] = useState(emptyEmployeeForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const resetForm = () => {
    setForm(emptyEmployeeForm);
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

  const handleSave = () => {
    if (!form.name.trim() || !form.code.trim() || !form.branch) return;

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      branch: form.branch,
      driver: form.driver,
      active: form.active,
      isMaster: form.isMaster,
    };

    if (editingId) {
      setEmployees((prev) =>
        prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item))
      );
    } else {
      setEmployees((prev) => [...prev, { id: Date.now(), ...payload }]);
    }

    closeModal();
  };

  const handleEdit = (record: EmployeeRecord) => {
    setEditingId(record.id);
    setForm({
      name: record.name,
      code: record.code,
      branch: record.branch,
      driver: record.driver,
      active: record.active,
      isMaster: record.isMaster,
    });
    setOpen(true);
  };

  const deleteById = (id: number) => {
    setEmployees((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      closeModal();
    }
  };

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter((item) =>
      [item.name, item.code, item.branch].some((value) => value.toLowerCase().includes(query))
    );
  }, [employees, search]);

  return {
    form,
    setForm,
    editingId,
    search,
    setSearch,
    open,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    deleteById,
    filteredEmployees,
  };
};
