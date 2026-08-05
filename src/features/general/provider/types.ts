import { z } from "zod";

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
  imageFile?: File | null;
  fileUrl?: string;
}

export const providerSchema = z.object({
  providerId: z.number().optional(),
  providerName: z.string().min(1, "Provider name is required").max(20, "Provider name cannot exceed 20 characters"),
  paymodeId: z.number().min(1, "Please select a paymode"),
  deliveryStatus: z.boolean(),
  branchIds: z.array(z.number()),
  imageFile: z.any().optional(), // Using any for File object since zod doesn't have a native File type in browser environments easily checkable here
  fileUrl: z.string().optional(),
});

export type ProviderFormType = z.infer<typeof providerSchema>;
