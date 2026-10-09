import axiosInstance from "../../../../api/axiosInstance";
import type { Customer } from "../types/customer";

const unwrap = <T>(promise: Promise<{ data: any }>) => 
  promise.then(res => res.data as T);

const parseIsActive = (val: any): boolean => {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const s = val.trim().toLowerCase();
    return s === "active" || s === "true" || s === "1";
  }
  if (typeof val === "number") return val === 1;
  return true;
};

export const mapToFrontend = (item: any): Customer => ({
  id: item.customerId ?? item.id ?? 0,
  customerCode: item.code ?? item.customerCode ?? "",
  customerName: item.name ?? item.customerName ?? "",
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
  isActive: parseIsActive(item.isActive),
  flatNo: item.flatNo ?? "",
  buildingNo: item.buildingNo ?? "",
  blockNo: item.blockNo ?? "",
  roadNo: item.roadNo ?? "",
  callType: item.callType ?? "",
});

export const mapToBackend = (customer: Customer): any => {
  const currentBranchId = localStorage.getItem("activeBranchId") 
    ? parseInt(localStorage.getItem("activeBranchId")!, 10) 
    : 2;

  return {
    customerId: customer.id || 0,
    code: customer.customerCode || "",
    name: customer.customerName || "",
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
    flatNo: customer.flatNo || "",
    buildingNo: customer.buildingNo || "",
    blockNo: customer.blockNo || "",
    roadNo: customer.roadNo || "",
    callType: customer.callType || "",
  };
};

export const customerApi = {
  getCustomers: (params?: { Code?: string; Name?: string; MobileNo?: string; customerCode?: string; customerName?: string; mobileNo?: string }) => {
    const queryParams: Record<string, string> = {};
    const code = params?.Code || params?.customerCode;
    const name = params?.Name || params?.customerName;
    const mobileNo = params?.MobileNo || params?.mobileNo;
    if (code) queryParams.Code = code;
    if (name) queryParams.Name = name;
    if (mobileNo) queryParams.MobileNo = mobileNo;

    return unwrap<{ data: any[]; status?: number; isSuccess?: boolean }>(
      axiosInstance.get("/menu/customer-list", {
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined,
      })
    )
      .then(res => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        return {
          ...res,
          data: list.map(mapToFrontend)
        };
      })
      .catch((err) => {
        console.warn("[customerApi] /menu/customer-list failed:", err?.message);
        return { data: [] };
      });
  },
  
  getCustomerById: (id: number) =>
    unwrap<{ data: any }>(axiosInstance.get(`/customer/${id}/customer-data`))
      .then(res => ({
        ...res,
        data: res?.data ? mapToFrontend({ ...res.data, customerId: id }) : null
      })),

  saveCustomer: (customer: Customer) => {
    const basePayload = mapToBackend(customer);
    const payloadData = {
      ...basePayload,
      name: customer.customerName || "",
      code: customer.customerCode || "",
    };

    if (customer.id) {
      const payload = {
        ...payloadData,
        updatedAt: new Date().toISOString(),
      };
      return unwrap<{ data: any; status?: number; isSuccess?: boolean }>(
        axiosInstance.put(`/menu/customer/${customer.id}`, payload)
      )
        .catch((err) => {
          if (err?.response?.status === 404 || err?.response?.status === 405) {
            return unwrap<{ data: any; status?: number; isSuccess?: boolean }>(
              axiosInstance.put(`/customer/${customer.id}`, payload)
            );
          }
          throw err;
        })
        .then(res => {
          const resData = res?.data;
          const newId = typeof resData === 'number' ? resData : (resData?.customerId ?? resData?.id ?? customer.id);
          return {
            ...res,
            data: mapToFrontend({ ...customer, ...(typeof resData === 'object' && resData !== null ? resData : {}), customerId: newId })
          };
        });
    } else {
      const { customerId, ...postPayload } = payloadData;
      const payload = {
        ...postPayload,
        createdAt: new Date().toISOString(),
      };
      return unwrap<{ data: any; status?: number; isSuccess?: boolean }>(
        axiosInstance.post("/menu/customer", payload)
      ).then(res => {
        const resData = res?.data;
        const newId = typeof resData === 'number' ? resData : (resData?.customerId ?? resData?.id);
        return {
          ...res,
          data: mapToFrontend({ ...customer, ...(typeof resData === 'object' && resData !== null ? resData : {}), customerId: newId || 0 })
        };
      });
    }
  },
  
  deleteCustomer: (id: number) =>
    unwrap<any>(axiosInstance.delete(`/customer/${id}`)),

  searchCustomer: (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      return customerApi.getCustomers();
    }
    const isNum = /^[0-9+\-\s()]+$/.test(trimmed);
    const params: Record<string, string> = isNum
      ? { MobileNo: trimmed }
      : { Name: trimmed };

    return unwrap<{ data: any[] }>(axiosInstance.get("/menu/customer-list", { params }))
      .then(res => {
        const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        return {
          ...res,
          data: list.map(mapToFrontend)
        };
      })
      .catch((err) => {
        console.warn("[customerApi] /menu/customer-list search failed:", err?.message);
        return { data: [] };
      });
  },
};
