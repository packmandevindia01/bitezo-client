import { unwrapBody as unwrap } from "../../../../shared/api/unwrap";
import axiosInstance from "../../../../api/axiosInstance";
import type { 
  SaveDeliveryAddressRequest, 
  SaveDeliveryAddressResponse, 
  DeliveryAddressResponse 
} from "../types/delivery";


export const deliveryApi = {
  getDeliveryAddress: (mobileNo: string) => 
    unwrap<DeliveryAddressResponse>(axiosInstance.get(`/order/delivery-address/${mobileNo}`)),
  
  getDeliveryAddressesAll: (mobileNo: string) => 
    unwrap<DeliveryAddressResponse>(axiosInstance.get(`/order/delivery-address/all/${mobileNo}`)),
  
  saveDeliveryAddress: (address: SaveDeliveryAddressRequest) =>
    unwrap<SaveDeliveryAddressResponse>(axiosInstance.post("/order/delivery-address", address)),

  /** Edit one saved address (PUT /order/delivery-address/{addressId}) — UPDATE / Save Delivery on a loaded address. */
  updateDeliveryAddress: (addressId: number, address: SaveDeliveryAddressRequest) =>
    unwrap<SaveDeliveryAddressResponse>(axiosInstance.put(`/order/delivery-address/${addressId}`, { addressId, ...address })),
};
