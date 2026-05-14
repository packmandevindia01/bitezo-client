export interface DeliveryAddress {
  addressId?: number;
  mobileNo: string;
  flatNo: string;
  buildingNo: string;
  roadNo: string;
  blockNo: string;
  area: string;
  customerName: string;
  note: string;
}

export interface SaveDeliveryAddressRequest {
  mobileNo: string;
  flatNo: string;
  buildingNo: string;
  roadNo: string;
  blockNo: string;
  area: string;
  customerName: string;
  note: string;
}

export interface DeliveryAddressResponse {
  data: DeliveryAddress[];
  status: number;
  message: string;
  isSuccess: boolean;
}

export interface SaveDeliveryAddressResponse {
  data: {
    id: number;
  };
  status: number;
  message: string;
  isSuccess: boolean;
}
