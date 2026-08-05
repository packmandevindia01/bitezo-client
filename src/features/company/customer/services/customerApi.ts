import axiosInstance from "../../../../api/axiosInstance";
import type { Customer } from "../types";

const unwrap = <T>(promise: Promise<{ data: any }>) => 
  promise.then(res => res.data as T);

export const mapToFrontend = (item: any): Customer => ({
  id: item.customerId ?? item.id,
  customerCode: item.code ?? item.customerCode ?? "",
  customerName: item.customerName ?? "",
  arabicName: item.arabicName ?? "",
  mobileNo: item.mobileNo ?? "",
  telNo: item.telNo ?? "",
  email: item.email ?? "",
  address: item.address ?? "",
  area: item.area ?? "",
  identityNo: item.identityNo ?? "",
  trnNo: item.trnNo ?? "",
  branch: item.branchId ? String(item.branchId) : (item.branch ?? ""),
  openingBalance: item.openingBalance !== undefined && item.openingBalance !== null ? String(item.openingBalance) : "0.000",
  isActive: item.isActive ?? true,
});

export const mapToBackend = (customer: Customer): any => {
  const currentBranchId = localStorage.getItem("activeBranchId") 
    ? parseInt(localStorage.getItem("activeBranchId")!, 10) 
    : 2;

  return {
    customerId: customer.id || 0,
    code: customer.customerCode || "",
    customerName: customer.customerName || "",
    arabicName: customer.arabicName || "",
    openingBalance: customer.openingBalance ? parseFloat(String(customer.openingBalance)) : 0,
    mobileNo: customer.mobileNo || "",
    telNo: customer.telNo || "",
    email: customer.email || "",
    address: customer.address || "",
    area: customer.area || "",
    identityNo: customer.identityNo || "",
    trnNo: customer.trnNo || "",
    branchId: customer.branch ? (parseInt(customer.branch, 10) || currentBranchId) : currentBranchId,
    isActive: customer.isActive ?? true,
  };
};

export const customerApi = {
  getCustomers: (params?: { customerCode?: string; customerName?: string }) => 
    unwrap<{ data: any[] }>(axiosInstance.get("/customer/list", { params }))
      .then(res => {
        const list = Array.isArray(res.data) ? res.data : [];
        return {
          ...res,
          data: list.map(mapToFrontend)
        };
      }),
  
  getCustomerById: (id: number) =>
    unwrap<{ data: any }>(axiosInstance.get(`/customer/${id}/customer-data`))
      .then(res => ({
        ...res,
        data: res.data ? mapToFrontend({ ...res.data, customerId: id }) : null
      })),

  saveCustomer: (customer: Customer) => {
    const basePayload = mapToBackend(customer);
    if (customer.id) {
      const payload = {
        ...basePayload,
        updatedAt: new Date().toISOString(),
      };
      return unwrap<{ data: any }>(axiosInstance.put(`/customer/${customer.id}`, payload))
        .then(res => ({
          ...res,
          data: res.data ? mapToFrontend({ ...res.data, customerId: customer.id }) : customer
        }));
    } else {
      const { customerId, isActive, ...postPayload } = basePayload;
      const payload = {
        ...postPayload,
        createdAt: new Date().toISOString(),
      };
      return unwrap<{ data: any }>(axiosInstance.post("/customer", payload))
        .then(res => ({
          ...res,
          data: res.data ? mapToFrontend(res.data) : customer
        }));
    }
  },
  
  deleteCustomer: (id: number) =>
    unwrap<any>(axiosInstance.delete(`/customer/${id}`)),
};
