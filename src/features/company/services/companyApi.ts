import type { CompanyFormData } from "../types";

export const createCompany = async (data: CompanyFormData) => {
  const res = await fetch("http://84.255.173.131:8088/api/admin/customer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "accept": "*/*",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    throw new Error("Failed to create customer");
  }

  return res.json();
};
