import axiosInstance from "../../../../api/axiosInstance";
import type { DenominationPayload, DenominationMutationData, DenominationItem } from "../types";
import type { ApiResponse } from "../../../inventory/product/types";

async function unwrap<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<T> {
  const { data: envelope } = await promise;
  if (!envelope.isSuccess) {
    throw new Error(envelope.message || "An unexpected error occurred.");
  }
  return envelope.data;
}

async function unwrapEnvelope<T>(promise: Promise<{ data: ApiResponse<T> }>): Promise<ApiResponse<T>> {
  const { data: envelope } = await promise;
  if (!envelope.isSuccess) {
    throw new Error(envelope.message || "An unexpected error occurred.");
  }
  return envelope;
}

export const fetchDenominations = async (): Promise<DenominationItem[]> => {
  return unwrap(axiosInstance.get<ApiResponse<DenominationItem[]>>("/denomination/denomination-data"));
};

export const createDenominations = async (payload: DenominationPayload): Promise<ApiResponse<DenominationMutationData>> => {
  return unwrapEnvelope(axiosInstance.post<ApiResponse<DenominationMutationData>>("/denomination", payload));
};

export const updateDenominations = async (payload: DenominationPayload): Promise<ApiResponse<DenominationMutationData>> => {
  return unwrapEnvelope(axiosInstance.put<ApiResponse<DenominationMutationData>>("/denomination", payload));
};
