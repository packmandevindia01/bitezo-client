import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerApi } from "../services/customerApi";
import type { Customer } from "../types";
import { useToast } from "../../../../app/providers/useToast";
import { useAppDispatch } from "../../../../app/hooks";
import { fetchGlobalBranches, fetchGlobalMasterData } from "../../../inventory/shared/store/masterDataSlice";
import { subscribeToBranchUpdates } from "../../../inventory/branches/utils/branchSync";

export const useCustomerList = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const dispatch = useAppDispatch();

  const [open, setOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);

  // Real-time synchronization for branch updates
  useEffect(() => {
    const unsubscribe = subscribeToBranchUpdates(() => {
      queryClient.removeQueries({ queryKey: ["customerBranches"] });
      queryClient.removeQueries({ queryKey: ["branchNames"] });
      queryClient.removeQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["customerBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branches"], refetchType: "all" });
      void dispatch(fetchGlobalBranches());
      void dispatch(fetchGlobalMasterData());
    });
    return () => unsubscribe();
  }, [queryClient, dispatch]);

  // 1. Fetch Customers List
  const { data: customersResponse, isLoading: loading } = useQuery({
    queryKey: ["customersList"],
    queryFn: () => customerApi.getCustomers(),
  });

  const customers = useMemo(() => {
    return customersResponse?.data || [];
  }, [customersResponse]);

  // 2. Save Customer Mutation
  const saveMutation = useMutation({
    mutationFn: (data: Customer) => customerApi.saveCustomer(data),
    onSuccess: (_, variables) => {
      showToast(
        variables.id ? "Customer updated successfully" : "Customer created successfully",
        "success"
      );
      queryClient.invalidateQueries({ queryKey: ["customersList"] });
      closeModal();
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.message || error?.message || "Failed to save customer";
      showToast(errMsg, "error");
    },
  });

  // 3. Delete Customer Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerApi.deleteCustomer(id),
    onSuccess: () => {
      showToast("Customer deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["customersList"] });
      setDeleteCandidate(null);
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.message || error?.message || "Failed to delete customer";
      showToast(errMsg, "error");
      setDeleteCandidate(null);
    },
  });

  const closeModal = () => {
    setOpen(false);
    setEditCustomer(null);
  };

  const openCreateModal = () => {
    queryClient.removeQueries({ queryKey: ["customerBranches"] });
    queryClient.removeQueries({ queryKey: ["branchNames"] });
    queryClient.removeQueries({ queryKey: ["branches"] });
    queryClient.invalidateQueries({ queryKey: ["customerBranches"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
    queryClient.invalidateQueries({ queryKey: ["branches"], refetchType: "all" });
    void dispatch(fetchGlobalBranches());
    void dispatch(fetchGlobalMasterData());
    setEditCustomer(null);
    setOpen(true);
  };

  const handleEdit = async (customer: Customer) => {
    if (!customer.id) return;
    try {
      queryClient.removeQueries({ queryKey: ["customerBranches"] });
      queryClient.removeQueries({ queryKey: ["branchNames"] });
      queryClient.removeQueries({ queryKey: ["branches"] });
      queryClient.invalidateQueries({ queryKey: ["customerBranches"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branchNames"], refetchType: "all" });
      queryClient.invalidateQueries({ queryKey: ["branches"], refetchType: "all" });
      void dispatch(fetchGlobalBranches());
      void dispatch(fetchGlobalMasterData());
      setOpen(true);
      setDetailLoading(true);
      const res = await customerApi.getCustomerById(customer.id);
      if (res && res.data) {
        setEditCustomer(res.data);
      } else {
        setEditCustomer(customer);
      }
    } catch (error: any) {
      const errMsg = error?.response?.data?.message || error?.message || "Failed to fetch customer details";
      showToast(errMsg, "error");
      closeModal();
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSave = async (data: Customer) => {
    await saveMutation.mutateAsync(data);
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    const targetId = deleteCandidate.id;
    if (targetId) {
      await deleteMutation.mutateAsync(targetId);
      if (editCustomer && editCustomer.id === targetId) {
        closeModal();
      }
    }
  };

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter((c) =>
      [
        c.customerCode,
        c.customerName,
        c.mobileNo,
        c.telNo,
        c.email,
      ].some((value) => value?.toLowerCase().includes(query))
    );
  }, [customers, search]);

  return {
    customers: filteredCustomers,
    totalCount: customers.length,
    loading,
    detailLoading,
    saving: saveMutation.isPending,
    deleting: deleteMutation.isPending,
    open,
    editCustomer,
    deleteCandidate,
    setDeleteCandidate,
    search,
    setSearch,
    closeModal,
    openCreateModal,
    handleEdit,
    handleSave,
    handleDelete,
    setEditCustomer,
  };
};
