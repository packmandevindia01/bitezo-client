import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerSchema, type CustomerForm } from "../schema/customerSchema";
import type { Customer } from "../types";
import { useEffect } from "react";

interface UseCustomerFormProps {
  initialData?: Customer | null;
  onSubmit: (data: Customer) => void | Promise<void>;
}

export const useCustomerForm = ({ initialData, onSubmit }: UseCustomerFormProps) => {
  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema) as any,
    defaultValues: {
      customerCode: "",
      customerName: "",
      arabicName: "",
      mobileNo: "",
      telNo: "",
      email: "",
      address: "",
      area: "",
      flatNo: "",
      buildingNo: "",
      blockNo: "",
      roadNo: "",
      identityNo: "",
      trnNo: "",
      branch: "",
      openingBalance: "",
      isActive: true,
    },
    mode: "onChange",
  });

  const { reset } = form;

  // Sync form values with initialData when opened in edit mode
  useEffect(() => {
    if (initialData) {
      reset({
        id: initialData.id,
        customerCode: initialData.customerCode || "",
        customerName: initialData.customerName || "",
        arabicName: initialData.arabicName || "",
        mobileNo: initialData.mobileNo || "",
        telNo: initialData.telNo || "",
        email: initialData.email || "",
        address: initialData.address || "",
        area: initialData.area || "",
        flatNo: initialData.flatNo || "",
        buildingNo: initialData.buildingNo || "",
        blockNo: initialData.blockNo || "",
        roadNo: initialData.roadNo || "",
        identityNo: initialData.identityNo || "",
        trnNo: initialData.trnNo || "",
        branch: initialData.branch || "",
        openingBalance: String(initialData.openingBalance || ""),
        isActive: initialData.isActive ?? true,
      } as any);
    } else {
      reset({
        customerCode: "",
        customerName: "",
        arabicName: "",
        mobileNo: "",
        telNo: "",
        email: "",
        address: "",
        area: "",
        flatNo: "",
        buildingNo: "",
        blockNo: "",
        roadNo: "",
        identityNo: "",
        trnNo: "",
        branch: "",
        openingBalance: "",
        isActive: true,
      });
    }
  }, [initialData, reset]);

  const handleSubmit = form.handleSubmit((data) => {
    onSubmit(data as unknown as Customer);
  });

  return {
    form,
    handleSubmit,
  };
};
