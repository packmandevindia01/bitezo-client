import axiosInstance from "../../../api/axiosInstance";
import type { CompanyFormData, CompanyMasterloadResponse } from "../types";

export const fetchCompanyMasterload = async () => {
  const { data } = await axiosInstance.get<CompanyMasterloadResponse>("/company/masterload");
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
    country: parseLookupId(data.country, "Country"),
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

  const { data: responseData } = await axiosInstance.post<any>(
    `/company/${encodeURIComponent(clientDb)}`,
    payload,
    {
      headers: { "Temp-Token": tempToken },
    }
  );

  return responseData;
};
