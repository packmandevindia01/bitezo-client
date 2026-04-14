import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import { emptyEmployeeForm } from "../constants";
import type { EmployeeRecord } from "../types";
import {
  createEmployee,
  deleteEmployee,
  getBranches,
  getEmployeeById,
  getEmployees,
  updateEmployee,
  type BranchOption,
} from "../services/employeeService";

export const useEmployeeManager = () => {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [form, setForm] = useState(emptyEmployeeForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<EmployeeRecord | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  // ── Fetch list ──────────────────────────────────────────────────────────────
  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEmployees();
      setEmployees(
        data.map((item) => ({
          id: item.empId,
          name: item.empName,
          code: item.empCode,
          branch: item.branch,
          branchId: item.branchId,
          driver: false,        // list endpoint doesn't return isDriver
          active: item.isActive === "Active",
          isMaster: false,      // list endpoint doesn't return isMaster
        }))
      );
    } catch {
      setError("Failed to load employees. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Fetch branches ──────────────────────────────────────────────────────────
  const fetchBranches = async () => {
    try {
      setBranches(await getBranches());
    } catch {
      setBranches([]);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchBranches();
  }, []);

  // ── Form helpers ────────────────────────────────────────────────────────────
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

  // ── Edit — fetch full record so we get isDriver / isMaster ─────────────────
  const handleEdit = async (record: EmployeeRecord) => {
    try {
      setError(null);
      const detail = await getEmployeeById(record.id);
      setEditingId(detail.empId);
      setForm({
        name: detail.empName,
        code: detail.empCode,
        branchId: String(detail.branchId),
        driver: detail.isDriver,
        active: detail.isActive,
        isMaster: detail.isMaster,
      });
      setOpen(true);
    } catch {
      setError("Failed to load employee details. Please try again.");
    }
  };

  // ── Save (create or update) ─────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.branchId) return;

    try {
      setSaving(true);
      setError(null);

      if (editingId !== null) {
        // UPDATE
        await updateEmployee(editingId, {
          empId: editingId,
          empCode: form.code.trim(),
          empName: form.name.trim(),
          branchId: Number(form.branchId),
          isDriver: form.driver,
          isActive: form.active,
          isMaster: form.isMaster,
          updatedAt: new Date().toISOString(),
        });
      } else {
        // CREATE
        await createEmployee({
          code: form.code.trim(),
          name: form.name.trim(),
          branchId: Number(form.branchId),
          isDriver: form.driver,
          isMaster: form.isMaster,
          isActive: form.active,
        });
      }

      await fetchEmployees();
      showToast(editingId !== null ? "Employee updated successfully" : "Employee created successfully", "success");
      closeModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : (editingId ? "Failed to update employee" : "Failed to create employee");
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteCandidate) return;
    try {
      setDeleting(true);
      setError(null);
      await deleteEmployee(deleteCandidate.id);
      await fetchEmployees();
      showToast("Employee deleted successfully", "success");
      setDeleteCandidate(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to delete employee";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  // ── Search filter ───────────────────────────────────────────────────────────
  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((item) =>
      [item.name, item.code, item.branch].some((v) =>
        v.toLowerCase().includes(query)
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
    branches,
    loading,
    saving,
    deleting,
    error,
    deleteCandidate,
    setDeleteCandidate,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
    filteredEmployees,
  };
};