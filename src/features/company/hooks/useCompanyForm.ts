import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchCompany, updateCompany, fetchCurrencyList, fetchCompanyMasterload } from "../services/companyApi";
import { useToast } from "../../../app/providers/useToast";
import type { CompanyFormData } from "../types";

import { parsePhoneNumberFromString } from "libphonenumber-js/min";

const companySchema = z.object({
  custName: z.string().trim().min(1, "Company name is required").max(100, "max 100 chars"),
  crNo: z.string().trim().min(1, "CR No is required").max(20, "max 20 chars"),
  custMob: z.string().trim()
    .min(1, "Mobile number is required")
    .max(20, "max 20 chars"),
  custMob2: z.string().trim().max(20, "max 20 chars").optional().or(z.literal("")),
  email: z.string().trim().email("Invalid email").max(100, "max 100 chars").or(z.literal("")),
  taxRegNo: z.string().trim().max(20, "max 20 chars").optional().or(z.literal("")),
  currency: z.string().min(1, "Currency is required").max(50, "max 50 chars"),
  country: z.string().min(1, "Country is required").max(50, "max 50 chars"),
  block: z.string().max(15, "max 15 chars").optional().or(z.literal("")),
  area: z.string().max(50, "max 50 chars").optional().or(z.literal("")),
  building: z.string().max(20, "max 20 chars").optional().or(z.literal("")),
  road: z.string().max(20, "max 20 chars").optional().or(z.literal("")),
  flatNo: z.string().max(20, "max 20 chars").optional().or(z.literal("")),
  regId: z.string().max(50, "max 50 chars").optional().or(z.literal("")),
  startDate: z.string().optional().or(z.literal("")),
  isDemo: z.boolean().optional(),
  database: z.string().max(100, "max 100 chars").optional().or(z.literal("")),
  branchCount: z.number().optional(),
  customerId: z.string().max(50, "max 50 chars").optional().or(z.literal("")),
}).superRefine((data, ctx) => {
  if (!data.custMob || !data.custMob.trim()) return;
  const digits = data.custMob.replace(/\D/g, "").length;
  if (digits === 0) return;

  if (data.country === "7" || data.country === "India" || data.country === "IN") {
    if (digits < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["custMob"],
        message: "must be 10 digits",
      });
    }
  } else if (data.country === "3" || data.country === "4") {
    if (digits < 9) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["custMob"],
        message: "min 9 digits",
      });
    }
  } else {
    if (digits < 8) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["custMob"],
        message: "min 8 digits",
      });
    }
  }
});

const cleanPhoneNumber = (mob: string, countryId: string, countriesList: any[]): string => {
  if (!mob) return "";
  let clean = mob.trim();
  const countryObj = countriesList.find((c: any) => c.id.toString() === String(countryId));
  const mobCode = countryObj?.mobCode || "";
  if (mobCode && clean.startsWith(mobCode)) {
    clean = clean.slice(mobCode.length).trim();
  } else if (clean.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(clean);
    if (parsed && parsed.nationalNumber) {
      clean = parsed.nationalNumber;
    } else {
      clean = clean.replace(/^\+\d{1,3}\s*/, "").trim();
    }
  }
  return clean;
};

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
      country: "",
      block: "",
      area: "",
      building: "",
      road: "",
      flatNo: "",
      regId: "",
      startDate: new Date().toISOString().split("T")[0],
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

  // Fetch Master Data (Countries, etc)
  const { data: masterDataPayload, isLoading: masterLoading } = useQuery({
    queryKey: ["company-masterload"],
    queryFn: () => fetchCompanyMasterload(),
    staleTime: 10 * 60 * 1000,
  });

  const countries = masterDataPayload?.data?.country ||
    masterDataPayload?.data?.countries ||
    masterDataPayload?.data?.countryList || [];

  // Fetch Company Data
  const { data: raw, isLoading: companyLoading } = useQuery({
    queryKey: ["company-details"],
    queryFn: () => fetchCompany(),
    staleTime: 5 * 60 * 1000, // 5 mins cache
  });

  useEffect(() => {
    if (raw) {
      setComId(Number(raw.comId ?? 0));
      const rawCountry = raw.country ? String(raw.country) : "";
      const cleanedMob = cleanPhoneNumber(String(raw.mobNo ?? ""), rawCountry, countries);
      const filled = {
        custName: String(raw.name ?? ""),
        crNo: String(raw.crNo ?? ""),
        custMob: cleanedMob,
        custMob2: String(raw.telNo ?? ""),
        email: String(raw.email ?? ""),
        taxRegNo: String(raw.taxRegNo ?? ""),
        currency: raw.currencyId ? String(raw.currencyId) : "",
        country: rawCountry,
        block: String(raw.block ?? ""),
        area: String(raw.area ?? ""),
        building: String(raw.building ?? ""),
        road: String(raw.road ?? ""),
        flatNo: String(raw.flatNo ?? ""),
        regId: String(raw.regId ?? ""),
        startDate: String(raw.startDate ?? raw.createdAt ?? new Date().toISOString()).split("T")[0],
        isDemo: raw.isDemo ?? false,
        database: raw.database ?? "",
        branchCount: raw.branchCount ?? 0,
        customerId: raw.customerId ?? "",
      };
      form.reset(filled);
    }
  }, [raw, countries, form]);

  const mutation = useMutation({
    mutationFn: (data: CompanySchemaType) => {
      // Cast data back to CompanyFormData for the API structure
      return updateCompany(
        {
          ...data,
          custMob: data.custMob.trim(),
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
    const current = form.getValues();
    form.reset({
      ...current,
      crNo: "",
      custMob: "",
      custMob2: "",
      taxRegNo: "",
      currency: "",
      country: "",
      block: "",
      area: "",
      building: "",
      road: "",
      flatNo: "",
    });
    setTimeout(() => {
      document.getElementById("co-cr-no")?.focus();
    }, 0);
  };

  return {
    form,
    currencies,
    countries,
    isLoading: companyLoading || currenciesLoading || masterLoading,
    isSaving: mutation.isPending,
    onSubmit,
    handleReset,
  };
};
