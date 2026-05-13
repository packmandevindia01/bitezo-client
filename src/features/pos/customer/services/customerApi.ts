import axiosInstance from "../../../../api/axiosInstance";
import type { Customer } from "../types/customer";

const unwrap = <T>(promise: Promise<{ data: any }>) => 
  promise.then(res => res.data as T);

export const customerApi = {
  getCustomers: () => 
    unwrap<{ data: Customer[] }>(axiosInstance.get("/pos/customer/list")),
  
  saveCustomer: (customer: Customer) =>
    unwrap<{ data: Customer }>(axiosInstance.post("/pos/customer/save", customer)),
  
  deleteCustomer: (id: number) =>
    unwrap<any>(axiosInstance.delete(`/pos/customer/delete/${id}`)),

  searchCustomer: (query: string) =>
    unwrap<{ data: Customer[] }>(axiosInstance.get(`/pos/customer/search?query=${query}`)),
};
