import axiosInstance from "../../../api/axiosInstance";
import type { CompanyFormData, CompanyMasterloadResponse, CurrencyOption } from "../types";

export const fetchCompanyMasterload = async (clientDb?: string) => {
  const headers = clientDb ? { clientDb } : undefined;
  const { data } = await axiosInstance.get<CompanyMasterloadResponse>("/company/masterload", { headers });
  return data;
};

const parseLookupId = (value: string, label: string) => {
  const numeric = Number(value);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error(`${label} must be loaded from backend master data before company creation.`);
  }
  return numeric;
};

export const createCompany = async (data: CompanyFormData, clientDb: string, tempToken: string) => {
  if (!clientDb.trim()) {
    throw new Error("Client database is missing for company creation.");
  }

  if (!tempToken.trim()) {
    throw new Error("Temporary token is missing for company creation.");
  }

  const payload = {
    comId: 0,
    name: data.custName,
    mobNo: data.custMob,
    telNo: data.custMob2 || "",
    country: 1,
    block: data.block || "",
    area: data.area || "",
    road: data.road || "",
    building: data.building || "",
    flatNo: data.flatNo || "",
    crNo: data.crNo || "",
    email: data.email || "",
    taxRegNo: data.taxRegNo || "",
    currencyId: parseLookupId(data.currency, "Currency"),
    regId: data.regId,
    createdAt: new Date().toISOString(),
  };

  const { data: responseData } = await axiosInstance.post<unknown>(
    "/company",
    payload,
    {
      headers: {
        "clientDb": clientDb,
        "clientdb": clientDb,
        "Temp-Token": tempToken,
      },
    }
  );

  return responseData;
};

/** Fetch current company info for the dashboard Company page */
export const fetchCompany = async () => {
  const { data } = await axiosInstance.get<{ data: any }>("/company");
  return data.data ?? data;
};

/** Update the current company's info */
export const updateCompany = async (formData: CompanyFormData, comId = 0) => {
  const payload = {
    comId,
    name: formData.custName,
    mobNo: formData.custMob,
    telNo: formData.custMob2 || "",
    country: 1,
    block: formData.block || "",
    area: formData.area || "",
    road: formData.road || "",
    building: formData.building || "",
    flatNo: formData.flatNo || "",
    crNo: formData.crNo || "",
    email: formData.email || "",
    taxRegNo: formData.taxRegNo || "",
    currencyId: formData.currency ? Number(formData.currency) : 0,
    regId: formData.regId,
    updatedAt: new Date().toISOString(),
  };

  const { data } = await axiosInstance.put<unknown>("/company", payload);
  return data;
};

/** Fetch currencies for company dropdown */
export const fetchCurrencyList = async (clientDb?: string) => {
  const headers = clientDb ? { clientDb } : undefined;
  const { data } = await axiosInstance.get<{ data: CurrencyOption[] }>("/currency/company-list-name", { headers });
  return data.data;
};

