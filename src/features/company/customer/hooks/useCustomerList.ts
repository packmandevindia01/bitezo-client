import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerApi } from "../services/customerApi";
import type { Customer } from "../types";
import { useToast } from "../../../../app/providers/useToast";

export const useCustomerList = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Customer | null>(null);
  const [search, setSearch] = useState("");

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
    setEditCustomer(null);
    setOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setOpen(true);
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
