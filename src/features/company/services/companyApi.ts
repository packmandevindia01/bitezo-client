import type { CompanyFormData, CompanyMasterloadResponse } from "../types";

export const fetchCompanyMasterload = async () => {
  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/company/masterload`, {
    method: "GET",
    headers: {
      accept: "*/*",
    },
  });

  if (!res.ok) {
    const message = (await res.text().catch(() => "")) || "Failed to load company master data";
    throw new Error(message);
  }

  return (await res.json()) as CompanyMasterloadResponse;
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

  const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || "http://84.255.173.131:8068/api"}/company/${encodeURIComponent(clientDb)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept": "*/*",
      "Temp-Token": tempToken,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const message =
      (await res.text().catch(() => "")) || "Failed to create company";
    throw new Error(message);
  }

  return res.json();
};
