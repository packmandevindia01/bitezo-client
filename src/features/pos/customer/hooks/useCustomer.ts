import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { customerApi } from "../services/customerApi";
import { useToast } from "../../../../app/providers/useToast";
import { customerSchema, type Customer } from "../types/customer";

export const initialForm: Customer = {
  customerCode: "",
  customerName: "",
  arabicName: "",
  mobileNo: "",
  telNo: "",
  email: "",
  address: "",
  area: "",
  identityNo: "",
  trnNo: "",
  branch: "",
  openingBalance: "0.000",
  isActive: true,
  flatNo: "",
  buildingNo: "",
  blockNo: "",
  roadNo: "",
  callType: ""
};

export const useCustomer = (onSuccess?: () => void) => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const methods = useForm<Customer>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: initialForm,
    mode: "onChange",
  });

  const { reset } = methods;

  const saveMutation = useMutation({
    mutationFn: (data: Customer) => customerApi.saveCustomer(data),
    onSuccess: () => {
      showToast("Customer saved successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      reset(initialForm);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.message || error?.message || "Failed to save customer";
      showToast(errMsg, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => customerApi.deleteCustomer(id),
    onSuccess: () => {
      showToast("Customer deleted successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      reset(initialForm);
      if (onSuccess) onSuccess();
    },
    onError: (error: any) => {
      const errMsg = error?.response?.data?.message || error?.message || "Failed to delete customer";
      showToast(errMsg, "error");
    },
  });

  const customersQuery = useQuery({
    queryKey: ["customers"],
    queryFn: () => customerApi.getCustomers().then(res => res.data),
    staleTime: 5 * 60 * 1000,
  });

  return {
    methods,
    saveCustomer: (data: Customer) => saveMutation.mutate(data),
    deleteCustomer: (id: number) => deleteMutation.mutate(id),
    loading: saveMutation.isPending || deleteMutation.isPending || customersQuery.isLoading,
    customers: customersQuery.data || [],
    resetForm: () => reset(initialForm),
  };
};
