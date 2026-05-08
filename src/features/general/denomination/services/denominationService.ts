import axiosInstance from "../../../../api/axiosInstance";
import type { DenominationPayload, DenominationMutationData, DenominationItem } from "../types";
import type { ApiResponse } from "../../../inventory/product/types";

async function unwrapEnvelope<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<ApiResponse<T>> {
  const { data: envelope } = await promise;
  if (!envelope.isSuccess) {
    throw new Error(envelope.message || "An unexpected error occurred.");
  }
  return envelope;
}

export const DEFAULT_DENOMS: DenominationItem[] = [
  { id: 1, name: "500", value: 500 },
  { id: 2, name: "200", value: 200 },
  { id: 3, name: "100", value: 100 },
  { id: 4, name: "50", value: 50 },
  { id: 5, name: "20", value: 20 },
  { id: 6, name: "10", value: 10 },
  { id: 7, name: "5", value: 5 },
  { id: 8, name: "2", value: 2 },
  { id: 9, name: "1", value: 1 },
];

export const fetchDenominations = async (): Promise<DenominationItem[]> => {
  const result = await unwrapEnvelope(axiosInstance.get<ApiResponse<DenominationItem[]>>("/denomination/denomination-data"));
  return result.data || [];
};

export const createDenominations = async (payload: DenominationPayload): Promise<ApiResponse<DenominationMutationData>> => {
  return unwrapEnvelope(axiosInstance.post<ApiResponse<DenominationMutationData>>("/denomination", payload));
};

export const updateDenominations = async (payload: DenominationPayload): Promise<ApiResponse<DenominationMutationData>> => {
  return unwrapEnvelope(axiosInstance.put<ApiResponse<DenominationMutationData>>("/denomination", payload));
};
