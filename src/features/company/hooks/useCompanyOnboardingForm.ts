import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "../../../app/providers/useToast";
import { companyFormSchema, type CompanyFormValues } from "../schemas";
import { useCompanyMasterData, useCreateCompany } from "./useCompanyQueries";

interface UseCompanyOnboardingFormProps {
  initialValues?: Partial<CompanyFormValues>;
  clientDb?: string;
  tempToken?: string;
  onSuccess?: () => void;
}

export const useCompanyOnboardingForm = ({
  initialValues,
  clientDb = "",
  tempToken = "",
  onSuccess,
}: UseCompanyOnboardingFormProps) => {
  const { showToast } = useToast();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      custName: "",
      custMob: "",
      custMob2: "",
      block: "",
      area: "",
      road: "",
      building: "",
      flatNo: "",
      branchCount: 0,
      regId: "",
      startDate: new Date().toISOString(),
      isDemo: true,
      database: "",
      crNo: "",
      email: "",
      taxRegNo: "",
      country: "",
      currency: "",
      customerId: "",
      ...initialValues,
    },
  });

  const { data: masterDataPayload, isLoading: isLoadingMasterData } = useCompanyMasterData(clientDb, true);
  const createCompanyMutation = useCreateCompany();

  const onSubmit = (data: CompanyFormValues) => {
    createCompanyMutation.mutate(
      { data, clientDb, tempToken },
      {
        onSuccess: () => {
          showToast("Company created successfully", "success");
          onSuccess?.();
        },
        onError: (error) => {
          showToast(error instanceof Error ? error.message : "Failed to create company", "error");
        },
      }
    );
  };

  const countries = masterDataPayload?.masterData?.data?.countryList || [];
  const currencies = masterDataPayload?.currencyData || [];

  return {
    form,
    onSubmit: form.handleSubmit(onSubmit),
    isSubmitting: createCompanyMutation.isPending,
    isLoadingMasterData,
    countries,
    currencies,
    resetForm: () => form.reset(),
  };
};
