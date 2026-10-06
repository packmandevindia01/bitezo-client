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
import { subscribeToRoleUpdates } from "../../employeeRole/utils/roleSync";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";
import { useAppDispatch, useAppSelector } from "../../../../app/hooks";
import { fetchGlobalBranches } from "../../../inventory/shared/store/masterDataSlice";

export const useEmployeeManager = () => {
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();
  const reduxBranches = useAppSelector((state) => state.masterData.branches);
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

  const { data: queryBranches = [], refetch: refetchBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      return await getBranches();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  // Roles query — feeds the Role dropdown in the Employee modal
  const { data: roles = [] } = useQuery({
    queryKey: ["employeeRoles"],
    queryFn: async () => {
      return await getEmployeeRoles();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const branches = useMemo(() => {
    const map = new Map<number, string>();

    // 1. Redux store branches (instantly available on navigation)
    if (Array.isArray(reduxBranches)) {
      reduxBranches.forEach((b: any) => {
        const id = Number(b.id ?? b.branchId);
        const name = String(b.branchName ?? b.name ?? "");
        if (id && id > 0 && name) {
          map.set(id, name);
        }
      });
    }

    // 2. Query fetched branches (authoritative backend list)
    if (Array.isArray(queryBranches)) {
      queryBranches.forEach((b) => {
        const id = Number(b.branchId);
        const name = String(b.branchName ?? "");
        if (id && id > 0 && name) {
          map.set(id, name);
        }
      });
    }

    return Array.from(map.entries()).map(([branchId, branchName]) => ({
      branchId,
      branchName,
    }));
  }, [reduxBranches, queryBranches]);

  // Ensure fresh branch and role data on mount
  useEffect(() => {
    void queryClient.resetQueries({ queryKey: ["branches"] });
    void queryClient.resetQueries({ queryKey: ["employeeRoles"] });
    queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
    void dispatch(fetchGlobalBranches());
  }, [queryClient, dispatch]);

  // Real-time synchronization: sync employee list, roles, and branches across tabs and components
  useEffect(() => {
    const unsubEmployee = subscribeToEmployeeUpdates(() => {
      void queryClient.invalidateQueries({ queryKey: ["employees"] });
      void queryClient.refetchQueries({ queryKey: ["employees"] });
    });

    const unsubRoles = subscribeToRoleUpdates(() => {
      void queryClient.resetQueries({ queryKey: ["employeeRoles"] });
    });

    const unsubBranches = subscribeToBranchUpdates(() => {
      void queryClient.resetQueries({ queryKey: ["branches"] });
      queryClient.removeQueries({ queryKey: ["branchNames"] });
      queryClient.removeQueries({ queryKey: ["branchList"] });
      queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
      void refetchBranches();
      void dispatch(fetchGlobalBranches());
    });

    return () => {
      unsubEmployee();
      unsubRoles();
      unsubBranches();
    };
  }, [queryClient, refetchBranches, dispatch]);

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
      queryClient.invalidateQueries({ queryKey: ["allEmployeesList"] });
      queryClient.invalidateQueries({ queryKey: ["waiters"] });
      queryClient.invalidateQueries({ queryKey: ["paymentAgainstMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["receiptAgainstMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"] });
      queryClient.invalidateQueries({ queryKey: ["receiptMaster"] });
      queryClient.removeQueries({ queryKey: ["branchData"] });
      queryClient.removeQueries({ queryKey: ["physicalEntryBranchData"] });
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
      queryClient.invalidateQueries({ queryKey: ["allEmployeesList"] });
      queryClient.invalidateQueries({ queryKey: ["waiters"] });
      queryClient.invalidateQueries({ queryKey: ["paymentAgainstMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["receiptAgainstMasterData"] });
      queryClient.invalidateQueries({ queryKey: ["paymentMaster"] });
      queryClient.invalidateQueries({ queryKey: ["receiptMaster"] });
      queryClient.removeQueries({ queryKey: ["branchData"] });
      queryClient.removeQueries({ queryKey: ["physicalEntryBranchData"] });
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
    void queryClient.resetQueries({ queryKey: ["employeeRoles"] });
    void queryClient.resetQueries({ queryKey: ["branches"] });
    queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
    void dispatch(fetchGlobalBranches());
    setOpen(true);
  };

  const handleEdit = async (record: EmployeeRecord) => {
    try {
      void queryClient.resetQueries({ queryKey: ["employeeRoles"] });
      void queryClient.resetQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
      void dispatch(fetchGlobalBranches());
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

  const handleSave = async (e?: React.BaseSyntheticEvent) => {
    const isValid = await form.trigger();
    if (!isValid) {
      const errs = form.formState.errors;
      const values = form.getValues();

      const fieldOrder: Array<{
        name: keyof EmployeeForm;
        id: string;
        isInvalid: () => boolean;
      }> = [
        {
          name: "name",
          id: "emp-name",
          isInvalid: () => Boolean(errs.name || !values.name || !values.name.trim()),
        },
        {
          name: "code",
          id: "emp-code",
          isInvalid: () => Boolean(errs.code || !values.code || !values.code.trim()),
        },
        {
          name: "branchId",
          id: "emp-branch",
          isInvalid: () =>
            Boolean(errs.branchId || !values.branchId || values.branchId === "0" || !values.branchId.trim()),
        },
        {
          name: "roleId",
          id: "emp-role",
          isInvalid: () =>
            Boolean(errs.roleId || !values.roleId || values.roleId === "0" || !values.roleId.trim()),
        },
      ];

      for (const field of fieldOrder) {
        if (field.isInvalid()) {
          try {
            form.setFocus(field.name);
          } catch {
            // fallback to DOM
          }
          const el = document.getElementById(field.id);
          if (el) {
            el.focus();
            if ("select" in el && typeof (el as HTMLInputElement).select === "function") {
              (el as HTMLInputElement).select();
            }
          }
          break;
        }
      }
      return;
    }
    await form.handleSubmit((data: any) => {
      saveMutation.mutate(data as EmployeeForm);
    })(e);
  };

  return {
    form,
    errors: form.formState.errors,
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