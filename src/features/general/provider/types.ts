export interface ProviderListItem {
  providerId: number;
  sNo: number;
  providerName: string;
  paymode: string;
  deliveryStatus: string;
}

export interface ProviderDetail {
  provider: {
    providerId: number;
    providerName: string;
    paymodeId: number;
    deliveryStatus: string;
    filePath: string;
    fileUrl: string;
    createdAt: string;
    updatedAt: string;
  };
  branch: { branchId: number; branchName: string }[] | null;
}

export interface ProviderPayload {
  providerId?: number;
  providerName: string;
  paymodeId: number;
  deliveryStatus: boolean;
  createdAt?: string;
  updatedAt?: string;
  branchIds: number[];
  imageFile?: File;
}

