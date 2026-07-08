import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCompany, updateCompany, fetchCurrencyList } from "../services/companyApi";
import { useToast } from "../../../app/providers/useToast";
import { formatPhone } from "../utils/formatters";
import type { CompanyFormData } from "../types";

import { isValidPhoneNumber } from "libphonenumber-js/min";

const companySchema = z.object({
  custName: z.string().min(1, "Company name is required"),
  crNo: z.string().min(1, "CR No is required"),
  custMob: z.string()
    .min(1, "Mobile number is required")
    .refine((val) => isValidPhoneNumber(val, "BH"), "Invalid mobile number. Please include the country code (e.g. +966) if outside Bahrain."),
  custMob2: z.union([
    z.literal(""),
    z.string().refine((val) => isValidPhoneNumber(val, "BH"), "Invalid telephone/landline number. Please include the country code if outside Bahrain.")
  ]).optional(),
  email: z.string().email("Invalid email").or(z.literal("")),
  taxRegNo: z.string().optional().or(z.literal("")),
  currency: z.string().min(1, "Currency is required"),
  block: z.string().optional().or(z.literal("")),
  area: z.string().optional().or(z.literal("")),
  building: z.string().optional().or(z.literal("")),
  road: z.string().optional().or(z.literal("")),
  flatNo: z.string().optional().or(z.literal("")),
  regId: z.string().optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  isDemo: z.boolean().optional(),
  database: z.string().optional().or(z.literal("")),
  branchCount: z.number().optional(),
  customerId: z.string().optional().or(z.literal("")),
});

type CompanySchemaType = z.infer<typeof companySchema>;

export const useCompanyForm = () => {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [comId, setComId] = useState<number>(0);

  const form = useForm<CompanySchemaType>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      custName: "",
      crNo: "",
      custMob: "",
      custMob2: "",
      email: "",
      taxRegNo: "",
      currency: "",
      block: "",
      area: "",
      building: "",
      road: "",
      flatNo: "",
      regId: "",
      startDate: new Date().toISOString(),
      isDemo: false,
      database: "",
      branchCount: 0,
      customerId: "",
    },
  });

  // Fetch Currencies
  const { data: currencies = [], isLoading: currenciesLoading } = useQuery({
    queryKey: ["company-currency-list"],
    queryFn: () => fetchCurrencyList(),
  });

  // Fetch Company Data
  const { isLoading: companyLoading } = useQuery({
    queryKey: ["company-details"],
    queryFn: async () => {
      const raw = await fetchCompany();
      setComId(Number(raw.comId ?? 0));
      const filled = {
        custName: String(raw.name ?? ""),
        crNo: String(raw.crNo ?? ""),
        custMob: String(raw.mobNo ?? ""),
        custMob2: String(raw.telNo ?? ""),
        email: String(raw.email ?? ""),
        taxRegNo: String(raw.taxRegNo ?? ""),
        currency: raw.currencyId ? String(raw.currencyId) : "",
        block: String(raw.block ?? ""),
        area: String(raw.area ?? ""),
        building: String(raw.building ?? ""),
        road: String(raw.road ?? ""),
        flatNo: String(raw.flatNo ?? ""),
        regId: String(raw.regId ?? ""),
        startDate: String(raw.createdAt ?? new Date().toISOString()),
        isDemo: raw.isDemo ?? false,
        database: raw.database ?? "",
        branchCount: raw.branchCount ?? 0,
        customerId: raw.customerId ?? "",
      };
      form.reset(filled);
      return raw;
    },
    staleTime: 5 * 60 * 1000, // 5 mins cache
  });

  const mutation = useMutation({
    mutationFn: (data: CompanySchemaType) => {
      // Cast data back to CompanyFormData for the API structure
      return updateCompany(
        {
          ...data,
          custMob: formatPhone(data.custMob.trim(), "BH"),
        } as CompanyFormData,
        comId
      );
    },
    onSuccess: (_, variables) => {
      showToast("Company updated successfully", "success");
      queryClient.invalidateQueries({ queryKey: ["company-details"] });
      // Update form pristine state manually by resetting with current form values
      form.reset(variables);
    },
    onError: (error: any) => {
      showToast(error?.message || "Failed to update company", "error");
    },
  });

  const onSubmit = form.handleSubmit((data) => {
    mutation.mutate(data);
  });

  const handleReset = () => {
    form.reset(); // Resets to the last supplied defaultValues (which are updated on load and save)
  };

  return {
    form,
    currencies,
    isLoading: companyLoading || currenciesLoading,
    isSaving: mutation.isPending,
    onSubmit,
    handleReset,
  };
};
