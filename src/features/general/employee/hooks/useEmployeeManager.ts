/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useToast } from "../../../../app/providers/useToast";
import type { EmployeeRecord, EmployeeForm } from "../types";
import { employeeSchema } from "../types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createEmployee,
  deleteEmployee,
  getBranches,
  getEmployeeRoles,
  getEmployeeById,
  getEmployees,
  updateEmployee,
} from "../services/employeeService";
import { notifyEmployeesUpdated, subscribeToEmployeeUpdates } from "../utils/employeeSync";

export const useEmployeeManager = () => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<EmployeeRecord | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // 1. Form Instance
  const form = useForm({
    resolver: zodResolver(employeeSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      code: "",
      branchId: "",
      roleId: "",
      driver: false,
      active: true,
      isMaster: false,
    },
  });

  const { reset } = form;

  // 2. Data Fetching (React Query)
  const { data: employees = [], isLoading: loading } = useQuery<EmployeeRecord[]>({
    queryKey: ["employees"],
    queryFn: async () => {
      const data = await getEmployees();
      return (data || []).map((item) => ({
        id: item.empId,
        name: item.empName,
        code: item.empCode,
        branch: item.branch,
        branchId: item.branchId,
        driver: false,
        active:
          item.isActive === "Active" ||
          (item.isActive as any) === true ||
          String(item.isActive).toLowerCase() === "true" ||
          String(item.isActive) === "1",
        isMaster: false,
        roleId: 0,
      }));
    },
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      return await getBranches();
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: roles = [] } = useQuery({
    queryKey: ["employeeRoles"],
    queryFn: async () => {
      return await getEmployeeRoles();
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  // Real-time synchronization: sync employee list across tabs and components
  useEffect(() => {
    return subscribeToEmployeeUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void queryClient.refetchQueries({ queryKey: ["employees"] });
    });
  }, [queryClient]);

  // 3. Search Filter
  const filteredEmployees = useMemo(() => {
    if (!search) return employees;
    const lower = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        e.code.toLowerCase().includes(lower) ||
        e.branch.toLowerCase().includes(lower)
    );
  }, [search, employees]);

  // 4. Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: EmployeeForm) => {
      if (editingId) {
        await updateEmployee(editingId, {
          empId: editingId,
          empCode: data.code,
          code: data.code,
          empName: data.name,
          name: data.name,
          branchId: parseInt(data.branchId, 10),
          roleId: parseInt(data.roleId, 10),
          isDriver: data.driver,
          driver: data.driver,
          isActive: data.active,
          active: data.active,
          isMaster: data.isMaster,
          updatedAt: new Date().toISOString(),
        } as any);
      } else {
        await createEmployee({
          code: data.code,
          empCode: data.code,
          name: data.name,
          empName: data.name,
          branchId: parseInt(data.branchId, 10),
          roleId: parseInt(data.roleId, 10),
          isDriver: data.driver,
          driver: data.driver,
          isMaster: data.isMaster,
          isActive: data.active,
          active: data.active,
        } as any);
      }
    },
    onSuccess: async () => {
      showToast(editingId ? "Employee updated successfully!" : "Employee added successfully!", "success");
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      await queryClient.refetchQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employeeNames"] });
      queryClient.invalidateQueries({ queryKey: ["waiters"] });
      queryClient.invalidateQueries({ queryKey: ["paymentAgainstMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["receiptAgainstMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"] });
      queryClient.invalidateQueries({ queryKey: ["receiptMaster"] });
      queryClient.invalidateQueries({ queryKey: ["branchData"] });
      queryClient.invalidateQueries({ queryKey: ["physicalEntryBranchData"] });
      notifyEmployeesUpdated();
      closeModal();
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || "Failed to save employee", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await deleteEmployee(id);
    },
    onSuccess: async () => {
      showToast("Employee deleted successfully!", "success");
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      await queryClient.refetchQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["employeeNames"] });
      queryClient.invalidateQueries({ queryKey: ["waiters"] });
      queryClient.invalidateQueries({ queryKey: ["paymentAgainstMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["receiptAgainstMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"] });
      queryClient.invalidateQueries({ queryKey: ["receiptMaster"] });
      queryClient.invalidateQueries({ queryKey: ["branchData"] });
      queryClient.invalidateQueries({ queryKey: ["physicalEntryBranchData"] });
      notifyEmployeesUpdated();
      setDeleteCandidate(null);
    },
    onError: (err: any) => {
      showToast(err.response?.data?.message || err.message || "Failed to delete employee", "error");
    },
  });

  // 5. Handlers
  const resetForm = () => {
    reset({
      name: "",
      code: "",
      branchId: "",
      roleId: "",
      driver: false,
      active: true,
      isMaster: false,
    });
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

  const handleEdit = async (record: EmployeeRecord) => {
    try {
      const detail = await getEmployeeById(record.id);
      setEditingId(detail.empId);
      reset({
        name: detail.empName,
        code: detail.empCode,
        branchId: String(detail.branchId),
        roleId: detail.roleId ? String(detail.roleId) : "",
        driver: detail.isDriver,
        active: detail.isActive,
        isMaster: detail.isMaster,
      });
      setOpen(true);
    } catch {
      showToast("Failed to fetch employee details", "error");
    }
  };

  const handleDelete = () => {
    if (deleteCandidate) {
      deleteMutation.mutate(deleteCandidate.id);
    }
  };

  const handleSave = form.handleSubmit(
    (data: any) => {
      saveMutation.mutate(data as EmployeeForm);
    },
    (errors) => {
      console.warn("[EmployeeForm] Validation errors:", errors);
      const firstError = Object.values(errors)[0] as any;
      if (firstError?.message) {
        showToast(firstError.message as string, "error");
      }
    }
  );

  return {
    form,
    editingId,
    search,
    setSearch,
    open,
    branches,
    roles,
    loading,
    saving: saveMutation.isPending,
    deleting: deleteMutation.isPending,
    deleteCandidate,
    setDeleteCandidate,
    filteredEmployees,
    resetForm,
    closeModal,
    openCreateModal,
    handleSave,
    handleEdit,
    handleDelete,
  };
};