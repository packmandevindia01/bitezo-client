import { useState, useCallback } from "react";
import { deliveryApi } from "../services/deliveryApi";
import type { DeliveryAddress, SaveDeliveryAddressRequest } from "../types/delivery";
import { useToast } from "../../../../app/providers/useToast";

export const useDelivery = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<DeliveryAddress | null>(null);

  const fetchAddressByMobile = useCallback(async (mobileNo: string) => {
    if (!mobileNo || mobileNo.length < 3) return;
    
    setLoading(true);
    try {
      const response = await deliveryApi.getDeliveryAddress(mobileNo);
      if (response.isSuccess && response.data && response.data.length > 0) {
        setAddress(response.data[0]);
        return response.data[0];
      } else {
        setAddress(null);
        return null;
      }
    } catch (error) {
      console.error("Error fetching delivery address:", error);
      setAddress(null);
      return null;
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
  }, [showToast]);

  return {
    loading,
    address,
    fetchAddressByMobile,
    saveAddress,
    setAddress
  };
};

