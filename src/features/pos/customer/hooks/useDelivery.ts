import { useState, useCallback } from "react";
import { deliveryApi } from "../services/deliveryApi";
import { customerApi } from "../services/customerApi";
import type { DeliveryAddress, SaveDeliveryAddressRequest } from "../types/delivery";
import { useToast } from "../../../../app/providers/useToast";

export const useDelivery = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<DeliveryAddress | null>(null);
  const [addressList, setAddressList] = useState<DeliveryAddress[]>([]);

  const fetchAddressByMobile = useCallback(async (mobileNo: string) => {
    if (!mobileNo || mobileNo.length < 3) return [];
    
    setLoading(true);
    try {
      const response = await deliveryApi.getDeliveryAddress(mobileNo);
      if (response.isSuccess && response.data) {
        let addresses: DeliveryAddress[] = [];
        if (Array.isArray(response.data)) {
          addresses = response.data;
        } else if (typeof response.data === "object" && response.data !== null) {
          addresses = [response.data as DeliveryAddress];
        }
        
        if (addresses.length > 0) {
          setAddressList(addresses);
          setAddress(addresses[0]);
          return addresses;
        }
      }
      
      // Fallback: Check if the number belongs to a registered customer to auto-fill their name
      try {
        const custRes = await customerApi.getCustomers();
        if (custRes && custRes.data) {
          const matchingCust = custRes.data.find(c => c.mobileNo === mobileNo || c.telNo === mobileNo);
          if (matchingCust && matchingCust.customerName) {
            const fallbackAddr: DeliveryAddress = {
              mobileNo: mobileNo,
              customerName: matchingCust.customerName,
              flatNo: "", buildingNo: "", roadNo: "", blockNo: "", area: "", note: ""
            };
            setAddressList([fallbackAddr]);
            setAddress(fallbackAddr);
            return [fallbackAddr];
          }
        }
      } catch {
        // Ignore fallback errors
      }

      setAddressList([]);
      setAddress(null);
      return [];
    } catch (error) {
      console.error("Error fetching delivery address:", error);
      setAddressList([]);
      setAddress(null);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllAddressesByMobile = useCallback(async (mobileNo: string) => {
    if (!mobileNo || mobileNo.length < 3) return [];
    
    setLoading(true);
    try {
      const response = await deliveryApi.getDeliveryAddressesAll(mobileNo);
      if (response.isSuccess && response.data) {
        let addresses: DeliveryAddress[] = [];
        if (Array.isArray(response.data)) {
          addresses = response.data;
        } else if (typeof response.data === "object" && response.data !== null) {
          addresses = [response.data as DeliveryAddress];
        }
        setAddressList(addresses);
        return addresses;
      }
      setAddressList([]);
      return [];
    } catch (error) {
      console.error("Error fetching all delivery addresses:", error);
      setAddressList([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const saveAddress = useCallback(async (data: SaveDeliveryAddressRequest) => {
    setLoading(true);
    try {
      const response = await deliveryApi.saveDeliveryAddress(data);
      if (response.isSuccess) {
        showToast(response.message || "Delivery address saved successfully.", "success");
        // Refresh list
        if (data.mobileNo) fetchAddressByMobile(data.mobileNo);
        return response.data;
      } else {
        showToast(response.message || "Failed to save delivery address.", "error");
        return null;
      }
    } catch (error: any) {
      showToast(error.response?.data?.message || "An error occurred while saving.", "error");
      return null;
    } finally {
      setLoading(false);
    }
  }, [showToast, fetchAddressByMobile]);

  /** Edit a saved address in place (never creates a new one). true when the server accepted it. */
  const updateAddress = useCallback(async (addressId: number, data: SaveDeliveryAddressRequest): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await deliveryApi.updateDeliveryAddress(addressId, data);
      if (response?.isSuccess === false) {
        showToast(response.message || "Failed to update delivery address.", "error");
        return false;
      }
      showToast(response?.message || "Delivery address updated.", "success");
      return true;
    } catch (error: any) {
      showToast(error.response?.data?.message || "An error occurred while updating the address.", "error");
      return false;
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  return {
    loading,
    address,
    addressList,
    fetchAddressByMobile,
    fetchAllAddressesByMobile,
    saveAddress,
    updateAddress,
    setAddress
  };
};

