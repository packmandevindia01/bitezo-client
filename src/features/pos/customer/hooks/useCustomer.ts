import { useState, useCallback } from "react";
import type { Customer } from "../types/customer";
import { customerApi } from "../services/customerApi";
import { useToast } from "../../../../app/providers/useToast";

export const useCustomer = () => {
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const { showToast } = useToast();
  
  const initialForm: Customer = {
    customerCode: "",
    customerName: "",
    arabicName: "",
    mobileNo: "",
    telNo: "",
    email: "",
    address: "",
    area: "",
    identityNo: "",
    trnNo: "",
    branch: "",
    openingBalance: "0.000",
    isActive: true
  };

  const [form, setForm] = useState<Customer>(initialForm);

  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await customerApi.getCustomers();
      setCustomers(res.data);
    } catch (error) {
      showToast("Failed to fetch customers", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const saveCustomer = async () => {
    if (!form.customerName || !form.mobileNo) {
      showToast("Name and Mobile are required", "warning");
      return;
    }
    try {
      setLoading(true);
      await customerApi.saveCustomer(form);
      showToast("Customer saved successfully", "success");
      setForm(initialForm);
      fetchCustomers();
    } catch (error) {
      showToast("Failed to save customer", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteCustomer = async (id: number) => {
    try {
      setLoading(true);
      await customerApi.deleteCustomer(id);
      showToast("Customer deleted", "success");
      fetchCustomers();
    } catch (error) {
      showToast("Failed to delete customer", "error");

    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    customers,
    form,
    setForm,
    saveCustomer,
    deleteCustomer,
    fetchCustomers,
    resetForm: () => setForm(initialForm)
  };
};
