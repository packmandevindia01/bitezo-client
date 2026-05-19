import axiosInstance from "../../../../api/axiosInstance";
import type { 
  SaveDeliveryAddressRequest, 
  SaveDeliveryAddressResponse, 
  DeliveryAddressResponse 
} from "../types/delivery";

const unwrap = <T>(promise: Promise<{ data: any }>) => 
  promise.then(res => res.data as T);

export const deliveryApi = {
  getDeliveryAddress: (mobileNo: string) => 
    unwrap<DeliveryAddressResponse>(axiosInstance.get(`/order/delivery-address/${mobileNo}`)),
  
  getDeliveryAddressesAll: (mobileNo: string) => 
    unwrap<DeliveryAddressResponse>(axiosInstance.get(`/order/delivery-address/all/${mobileNo}`)),
  
  saveDeliveryAddress: (address: SaveDeliveryAddressRequest) =>
    unwrap<SaveDeliveryAddressResponse>(axiosInstance.post("/order/delivery-address", address)),
};
