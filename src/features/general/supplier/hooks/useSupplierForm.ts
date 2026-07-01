import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "../../../../api/axiosInstance";
import { supplierSchema, type SupplierFormData } from "../schema/supplierSchema";
import type { ApiResponse } from "../../../inventory/product/types";
import { createSupplier, updateSupplier, deleteSupplier } from "../services/index";
import { useToast } from "../../../../app/providers/useToast";
import { formatAmount } from "../../../../utils/currency";

interface Branch {
  branchId: number;
  branchName: string;
}

interface UseSupplierFormProps {
  initialData?: any;
  onSubmitOverride?: (data: any) => void | Promise<void>;
  onSuccess?: () => void;
  onClear?: () => void;
}

export const useSupplierForm = ({ initialData, onSubmitOverride, onSuccess, onClear }: UseSupplierFormProps) => {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
      arabicName: initialData?.arabicName ?? "",
      mobileNo: initialData?.mobileNo ?? "",
      telNo: initialData?.telNo ?? "",
      email: initialData?.email ?? "",
      address: initialData?.address ?? "",
      area: initialData?.area ?? "",
      identityNo: initialData?.identityNo ?? "",
      trnNo: initialData?.trnNo ?? "",
      branchId: initialData?.branchId ?? 0,
      openingBalance: initialData?.openingBalance !== undefined ? formatAmount(initialData.openingBalance) : formatAmount(0),
      isActive: initialData?.isActive ?? true,
    },
  });

  // Reset form when initialData changes
  useEffect(() => {
    reset({
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
      arabicName: initialData?.arabicName ?? "",
      mobileNo: initialData?.mobileNo ?? "",
      telNo: initialData?.telNo ?? "",
      email: initialData?.email ?? "",
      address: initialData?.address ?? "",
      area: initialData?.area ?? "",
      identityNo: initialData?.identityNo ?? "",
      trnNo: initialData?.trnNo ?? "",
      branchId: initialData?.branchId ?? 0,
      openingBalance: initialData?.openingBalance !== undefined ? formatAmount(initialData.openingBalance) : formatAmount(0),
      isActive: initialData?.isActive ?? true,
    });
  }, [initialData, reset]);

  // Fetch branches
  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const { data } = await axiosInstance.get<ApiResponse<Branch[]>>("/Branch/true/list-name");
      return data.data ?? [];
    },
  });
  const branches = branchesData || [];

  // Mutations
  const createMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      showToast("Supplier created successfully", "success");
      onSuccess?.();
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to create supplier", "error");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      showToast("Supplier updated successfully", "success");
      onSuccess?.();
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to update supplier", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      showToast("Supplier deleted successfully", "success");
      onSuccess?.();
    },
    onError: (error: any) => {
      showToast(error.message || "Failed to delete supplier", "error");
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;

  const submitHandler = async (data: SupplierFormData) => {
    const apiPayload = {
      ...data,
      openingBalance: typeof data.openingBalance === "string" ? parseFloat(data.openingBalance) || 0 : data.openingBalance,
    };

    if (onSubmitOverride) {
      await onSubmitOverride(apiPayload);
      return;
    }

    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, data: apiPayload });
    } else {
      createMutation.mutate(apiPayload);
    }
  };

  const handleClear = () => {
    reset({
      code: "",
      name: "",
      arabicName: "",
      mobileNo: "",
      telNo: "",
      email: "",
      address: "",
      area: "",
      identityNo: "",
      trnNo: "",
      branchId: 0,
      openingBalance: formatAmount(0),
      isActive: true,
    });
    if (onClear) onClear();
  };

  return {
    register,
    handleSubmit: handleSubmit(submitHandler),
    setValue,
    watch,
    errors,
    branches,
    branchesLoading,
    isSubmitting,
    isDeleting,
    handleClear,
    deleteMutation,
  };
};
