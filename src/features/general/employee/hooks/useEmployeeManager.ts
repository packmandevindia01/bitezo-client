import { useEffect, useMemo, useState } from "react";
import { emptyEmployeeForm } from "../constants";
import type { EmployeeRecord } from "../types";
import { createEmployee, getEmployees } from "../services/employeeService";
import { branchMap } from "../utils/mapper";

export const useEmployeeManager = () => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [form, setForm] = useState(emptyEmployeeForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const fetchEmployees = async () => {
    const data = await getEmployees();

    const mapped = data.map((item) => ({
      id: item.empId,
      name: item.empName,
      code: item.empCode,
      branch: item.branch,
      driver: false,
      active: item.isActive === "Active",
      isMaster: false,
    }));

    setEmployees(mapped);
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

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

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.branch) return;

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      branchId: branchMap[form.branch], // 🔥 FIX
      isDriver: form.driver,
      isMaster: form.isMaster,
      isActive: form.active,
    };

    await createEmployee(payload);

    await fetchEmployees(); // refresh
    closeModal();
  };

  const handleEdit = (record: EmployeeRecord) => {
    setEditingId(record.id);
    setForm(record);
    setOpen(true);
  };

  const deleteById = (id: number) => {
    // optional (backend not shown)
  };

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter((item) =>
      [item.name, item.code, item.branch].some((value) =>
        value.toLowerCase().includes(query)
      )
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