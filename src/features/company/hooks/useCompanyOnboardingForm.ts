import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "../../../app/providers/useToast";
import { companyFormSchema, type CompanyFormValues } from "../schemas";
import { useCompanyMasterData, useCreateCompany } from "./useCompanyQueries";

interface UseCompanyOnboardingFormProps {
  initialValues?: Partial<CompanyFormValues>;
  clientDb?: string;
  tempToken?: string;
  comId?: number;
  onSuccess?: () => void;
}

export const useCompanyOnboardingForm = ({
  initialValues,
  clientDb = "",
  tempToken = "",
  comId,
  onSuccess,
}: UseCompanyOnboardingFormProps) => {
  const { showToast } = useToast();

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      comId: comId ?? initialValues?.comId ?? 0,
      companyId: comId ?? initialValues?.companyId ?? 0,
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
      startDate: new Date().toISOString().split("T")[0],
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

  useEffect(() => {
    if (initialValues) {
      form.reset({
        comId: comId ?? initialValues?.comId ?? 0,
        companyId: comId ?? initialValues?.companyId ?? 0,
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
        startDate: new Date().toISOString().split("T")[0],
        isDemo: true,
        database: "",
        crNo: "",
        email: "",
        taxRegNo: "",
        country: "",
        currency: "",
        customerId: "",
        ...initialValues,
      });
    }
  }, [initialValues, comId, form]);

  const countries = masterDataPayload?.masterData?.data?.country ||
    masterDataPayload?.masterData?.data?.countries ||
    masterDataPayload?.masterData?.data?.countryList || [];
    
  const rawMasterCurrencies = masterDataPayload?.masterData?.data?.currency ||
    masterDataPayload?.masterData?.data?.currencies ||
    masterDataPayload?.masterData?.data?.currencyList || [];
  const currencies = rawMasterCurrencies.length > 0
    ? rawMasterCurrencies.map((c) => ({ currencyId: c.id, currencyName: c.name }))
    : masterDataPayload?.currencyData || [];

  const onSubmit = (data: CompanyFormValues) => {
    const targetComId = comId ?? data.comId ?? (data as any).companyId ?? 0;
    const finalData: CompanyFormValues = {
      ...data,
      comId: targetComId,
      companyId: targetComId,
    };
    createCompanyMutation.mutate(
      { data: finalData, clientDb, tempToken },
      {
        onSuccess: (res: any) => {
          const resData = res?.data ?? res;
          const returnedCompId = resData?.comId ?? resData?.companyId ?? resData?.id ?? targetComId;
          if (returnedCompId) {
            localStorage.setItem("companyId", String(returnedCompId));
          }
          showToast("Company created successfully", "success");
          onSuccess?.();
        },
        onError: (error) => {
          showToast(error instanceof Error ? error.message : "Failed to create company", "error");
        },
      }
    );
  };

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
